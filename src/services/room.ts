import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Room, RoomType, User } from '../types/phmly';
import { LIMITS } from '../constants/design';
import { StorageService } from './storage';

/**
 * Fetch all rooms that the authenticated user belongs to.
 */
export async function getUserRooms(userId: string): Promise<Room[]> {
  if (!isSupabaseConfigured || !userId) return [];

  // 1. Get room IDs where user is member
  const { data: memberRows, error: memberErr } = await supabase
    .from('room_members')
    .select('room_id')
    .eq('user_id', userId);

  if (memberErr) {
    console.error('Failed to fetch user memberships:', memberErr);
    throw memberErr;
  }

  const roomIds = (memberRows || []).map((m: { room_id: string }) => m.room_id);
  if (roomIds.length === 0) return [];

  // 2. Fetch room details and member relations concurrently in parallel
  const [roomsResult, membersResult] = await Promise.all([
    supabase
      .from('rooms')
      .select(`
        id,
        name,
        description,
        room_type,
        room_photo_url,
        owner_id,
        invite_code,
        created_at
      `)
      .in('id', roomIds)
      .order('created_at', { ascending: false }),
    supabase
      .from('room_members')
      .select('room_id, user_id')
      .in('room_id', roomIds),
  ]);

  if (roomsResult.error) {
    console.error('Failed to fetch rooms:', roomsResult.error);
    throw roomsResult.error;
  }

  const roomRows = roomsResult.data || [];
  const allMembers = membersResult.data || [];

  const membersByRoom: Record<string, string[]> = {};
  (allMembers || []).forEach((m: { room_id: string; user_id: string }) => {
    if (!membersByRoom[m.room_id]) membersByRoom[m.room_id] = [];
    membersByRoom[m.room_id].push(m.user_id);
  });

  return (roomRows || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    description: row.description || '',
    type: row.room_type as RoomType,
    photo:
      row.room_photo_url ||
      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80',
    ownerId: row.owner_id,
    memberIds: membersByRoom[row.id] || [row.owner_id],
    inviteCode: row.invite_code,
    createdAt: row.created_at,
    latestActivity: `${row.room_type.replace('_', ' ')} room`,
    unreadCount: 0,
  }));
}

/**
 * Fetch a single room by ID, including its members.
 */
export async function getRoomById(roomId: string): Promise<Room | null> {
  if (!isSupabaseConfigured || !roomId) return null;

  const { data: row, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .single();

  if (error || !row) return null;

  const { data: memberRows } = await supabase
    .from('room_members')
    .select('user_id')
    .eq('room_id', roomId);

  const memberIds = (memberRows || []).map((m: { user_id: string }) => m.user_id);

  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    type: row.room_type as RoomType,
    photo:
      row.room_photo_url ||
      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80',
    ownerId: row.owner_id,
    memberIds: memberIds.length > 0 ? memberIds : [row.owner_id],
    inviteCode: row.invite_code,
    createdAt: row.created_at,
    latestActivity: `${row.room_type.replace('_', ' ')} room`,
  };
}

/**
 * Get count of rooms created by the user.
 */
export async function getUserCreatedCount(userId: string): Promise<number> {
  if (!isSupabaseConfigured || !userId) return 0;

  const { count, error } = await supabase
    .from('rooms')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', userId);

  if (error) {
    console.warn('Failed to get created count:', error);
    return 0;
  }
  return count || 0;
}

export async function canUserCreateRoom(userId: string): Promise<boolean> {
  const count = await getUserCreatedCount(userId);
  return count < LIMITS.MAX_ROOMS_CREATED;
}

/**
 * Create a new room using the database RPC function 'create_room'.
 * Does not bypass the database RPC function.
 */
export async function createRoom(data: {
  name: string;
  description?: string;
  type: RoomType;
  photo?: string;
  ownerId?: string;
}): Promise<{ success: boolean; room?: Room; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase is not configured' };
  }

  try {
    // Call database RPC function (support both create_room_with_owner from schema and create_room alias)
    let rpcResult: any = null;
    let rpcErr: any = null;

    const res1 = await (supabase.rpc as any)('create_room_with_owner', {
      p_name: data.name.trim(),
      p_description: data.description?.trim() || null,
      p_room_type: data.type,
      p_photo_url: data.photo || null,
    });

    if (res1.error && (res1.error.message?.includes('function') || res1.error.code === '42883' || res1.error.code === 'PGRST202')) {
      const res2 = await (supabase.rpc as any)('create_room', {
        p_name: data.name.trim(),
        p_room_type: data.type,
        p_description: data.description?.trim() || null,
        p_room_photo_url: data.photo || null,
      });
      rpcResult = res2.data;
      rpcErr = res2.error;
    } else {
      rpcResult = res1.data;
      rpcErr = res1.error;
    }

    if (rpcErr) {
      console.error('create room RPC error:', rpcErr);
      return { success: false, error: rpcErr.message || 'Failed to create room' };
    }

    // Determine created room ID from RPC result (either room row or room id)
    let newRoomId: string | null = null;
    if (typeof rpcResult === 'string') {
      newRoomId = rpcResult;
    } else if (rpcResult && typeof rpcResult === 'object') {
      newRoomId = (rpcResult as any).id || (rpcResult as any).room_id;
    }

    if (newRoomId) {
      const fullRoom = await getRoomById(newRoomId);
      if (fullRoom) {
        return { success: true, room: fullRoom };
      }
    }

    // Fallback if rpc returned the row directly
    if (rpcResult && typeof rpcResult === 'object') {
      const r = rpcResult as any;
      return {
        success: true,
        room: {
          id: r.id,
          name: r.name,
          description: r.description || '',
          type: (r.room_type || data.type) as RoomType,
          photo: r.room_photo_url || data.photo || '',
          ownerId: r.owner_id || data.ownerId || '',
          memberIds: [r.owner_id || data.ownerId || ''],
          inviteCode: r.invite_code,
          createdAt: r.created_at || new Date().toISOString(),
          latestActivity: 'Room created',
        },
      };
    }

    return { success: false, error: 'Room created, but details could not be retrieved.' };
  } catch (err: any) {
    console.error('Exception in createRoom RPC:', err);
    return { success: false, error: err?.message || 'Failed to create room' };
  }
}

/**
 * Join a room using an invite code via the database RPC function 'join_room_by_invite'.
 * Does not bypass the database RPC function.
 */
export async function joinRoomByInviteCode(
  inviteCode: string,
  _userId?: string
): Promise<{ success: boolean; room?: Room; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase is not configured' };
  }

  const cleanCode = inviteCode.trim();
  if (!cleanCode) {
    return { success: false, error: 'Please enter a valid invitation code.' };
  }

  try {
    // Support both join_room_by_invite_code (schema standard) and join_room_by_invite
    let rpcResult: any = null;
    let rpcErr: any = null;

    const res1 = await (supabase.rpc as any)('join_room_by_invite_code', {
      p_invite_code: cleanCode,
    });

    if (res1.error && (res1.error.message?.includes('function') || res1.error.code === '42883' || res1.error.code === 'PGRST202')) {
      const res2 = await (supabase.rpc as any)('join_room_by_invite', {
        p_invite_code: cleanCode,
      });
      rpcResult = res2.data;
      rpcErr = res2.error;
    } else {
      rpcResult = res1.data;
      rpcErr = res1.error;
    }

    if (rpcErr) {
      console.warn('join room RPC error:', rpcErr);
      return { success: false, error: rpcErr.message || 'Invalid invite code or unable to join' };
    }

    // Find the joined room ID
    let joinedRoomId: string | null = null;
    if (typeof rpcResult === 'string') {
      joinedRoomId = rpcResult;
    } else if (rpcResult && typeof rpcResult === 'object') {
      joinedRoomId = (rpcResult as any).room_id || (rpcResult as any).id;
    }

    if (!joinedRoomId) {
      // Lookup room by invite code to return the joined room
      const { data: matchedRoom } = await supabase
        .from('rooms')
        .select('id')
        .eq('invite_code', cleanCode)
        .maybeSingle();
      if (matchedRoom) joinedRoomId = matchedRoom.id;
    }

    if (joinedRoomId) {
      const fullRoom = await getRoomById(joinedRoomId);
      if (fullRoom) {
        return { success: true, room: fullRoom };
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('Exception in joinRoomByInviteCode:', err);
    return { success: false, error: err?.message || 'Failed to join room' };
  }
}

/**
 * Regenerate room invitation code via database RPC function 'rotate_room_invite'.
 */
export async function rotateRoomInvite(
  roomId: string
): Promise<{ success: boolean; inviteCode?: string; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase is not configured' };
  }

  try {
    const { data: newCode, error } = await (supabase.rpc as any)('rotate_room_invite', {
      p_room_id: roomId,
    });

    if (error) {
      if (error.message?.includes('function') || error.code === '42883' || error.code === 'PGRST202') {
        // Fallback: direct update if user is the room owner
        const newInvite = Array.from({ length: 6 }, () =>
          Math.floor(Math.random() * 36).toString(36)
        ).join('');
        const { error: updateErr } = await supabase
          .from('rooms')
          .update({ invite_code: newInvite })
          .eq('id', roomId);
        if (!updateErr) {
          return { success: true, inviteCode: newInvite };
        }
      }
      console.error('rotate_room_invite RPC error:', error);
      return { success: false, error: error.message };
    }

    const code =
      typeof newCode === 'string'
        ? newCode
        : (newCode as any)?.invite_code || (newCode as any)?.p_invite_code || '';

    return { success: true, inviteCode: code };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to rotate invite code' };
  }
}

/**
 * Fetch member profiles of a room.
 */
export async function getRoomMemberProfiles(roomId: string): Promise<User[]> {
  if (!isSupabaseConfigured || !roomId) return [];

  const { data: memberRows, error } = await supabase
    .from('room_members')
    .select(`
      user_id,
      profiles:user_id (
        id,
        username,
        full_name,
        avatar_url,
        bio,
        created_at
      )
    `)
    .eq('room_id', roomId);

  if (error || !memberRows) {
    console.warn('Failed to load room members:', error);
    return [];
  }

  return (memberRows as any[])
    .map((row) => {
      const p = row.profiles;
      if (!p) {
        return {
          id: row.user_id,
          name: 'Member',
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${row.user_id}`,
          bio: 'Member of PHMLY',
          createdAt: new Date().toISOString(),
        };
      }
      return {
        id: p.id,
        name: p.full_name || p.username || 'Member',
        avatar: p.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${p.id}`,
        bio: p.bio || 'Member of PHMLY',
        createdAt: p.created_at,
      };
    })
    .filter(Boolean) as User[];
}

export const getRoomMembers = getRoomMemberProfiles;

/**
 * Leave a room.
 * Removes only the authenticated user's membership row from room_members.
 * Creators cannot leave their own room (they must use deleteRoom instead).
 */
export async function leaveRoom(
  roomId: string,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured || !roomId) {
    return { success: false, error: 'Database service is not configured.' };
  }

  try {
    const { data: authData } = await supabase.auth.getUser();
    const currentUserId = authData?.user?.id || userId;
    if (!currentUserId) {
      return { success: false, error: 'Authentication required to leave room.' };
    }

    // Verify user is not attempting to remove another member's membership
    if (authData?.user?.id && userId && userId !== authData.user.id) {
      return { success: false, error: 'You can only remove your own room membership.' };
    }

    // Check if the current user is the room owner
    const { data: roomRow, error: roomErr } = await supabase
      .from('rooms')
      .select('owner_id')
      .eq('id', roomId)
      .maybeSingle();

    if (!roomErr && roomRow && roomRow.owner_id === currentUserId) {
      return {
        success: false,
        error: 'Room creators cannot leave their own room. Use Delete Room instead.',
      };
    }

    const { data, error } = await supabase
      .from('room_members')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', currentUserId)
      .select();

    if (error) {
      console.error('Failed to leave room:', error);
      return { success: false, error: error.message || 'Failed to leave room.' };
    }

    if (!data || data.length === 0) {
      return {
        success: false,
        error: 'Membership record not found or you are not a member of this room.',
      };
    }

    // Sync local storage cache
    StorageService.leaveRoom(roomId, currentUserId);
    return { success: true };
  } catch (err: any) {
    console.error('Exception in leaveRoom:', err);
    return { success: false, error: err?.message || 'Failed to leave room.' };
  }
}

/**
 * Delete a room where the user is its owner.
 * Invited members cannot delete rooms (enforced both client-side and via Supabase RLS).
 */
export async function deleteRoom(
  roomId: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured || !roomId) {
    return { success: false, error: 'Database service is not configured.' };
  }

  try {
    const { data: authData } = await supabase.auth.getUser();
    const currentUserId = authData?.user?.id;
    if (!currentUserId) {
      return { success: false, error: 'Authentication required to delete room.' };
    }

    // Query room to verify ownership
    const { data: roomRow, error: roomErr } = await supabase
      .from('rooms')
      .select('owner_id')
      .eq('id', roomId)
      .maybeSingle();

    if (roomErr) {
      return { success: false, error: roomErr.message || 'Failed to locate room.' };
    }

    if (roomRow && roomRow.owner_id !== currentUserId) {
      return {
        success: false,
        error: 'Permission denied: Only the room creator can delete this room.',
      };
    }

    const { data, error } = await supabase
      .from('rooms')
      .delete()
      .eq('id', roomId)
      .select();

    if (error) {
      console.error('Failed to delete room:', error);
      return { success: false, error: error.message || 'Failed to delete room.' };
    }

    if (!data || data.length === 0) {
      return {
        success: false,
        error: 'Room could not be deleted. You may not have ownership permissions or the room does not exist.',
      };
    }

    // Sync local storage cache
    StorageService.deleteRoom(roomId);
    return { success: true };
  } catch (err: any) {
    console.error('Exception in deleteRoom:', err);
    return { success: false, error: err?.message || 'Failed to delete room.' };
  }
}

/**
 * Realtime subscription to room member changes.
 */
export function subscribeToRoomMembers(
  roomId: string,
  onChange: () => void
) {
  if (!isSupabaseConfigured) return { unsubscribe: () => {} };

  const channel = supabase
    .channel(`room_members:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'room_members',
        filter: `room_id=eq.${roomId}`,
      },
      () => onChange()
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}
