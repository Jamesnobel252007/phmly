import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { BuddiesUpdate, BuddiesReply, MessageReaction } from '../types/phmly';
import { uploadPrivateFile, getSignedFileUrl } from './storageBucket';

/**
 * Fetch learning updates for a buddies room.
 * Resolves private voice and media paths to signed URLs.
 */
export async function getBuddiesUpdates(roomId: string): Promise<BuddiesUpdate[]> {
  if (!isSupabaseConfigured || !roomId) return [];

  // 1. Fetch updates
  const { data: updates, error } = await supabase
    .from('buddies_updates')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false });

  if (error || !updates) {
    console.error('Failed to fetch buddies updates:', error);
    return [];
  }

  const updateIds = updates.map((u: { id: string }) => u.id);
  if (updateIds.length === 0) return [];

  // 2. Fetch replies
  const { data: replies } = await supabase
    .from('buddies_replies')
    .select('*')
    .in('update_id', updateIds)
    .order('created_at', { ascending: true });

  const repliesByUpdate: Record<string, BuddiesReply[]> = {};
  (replies || []).forEach((r: any) => {
    if (!repliesByUpdate[r.update_id]) repliesByUpdate[r.update_id] = [];
    repliesByUpdate[r.update_id].push({
      id: r.id,
      authorId: r.user_id,
      content: r.content,
      createdAt: r.created_at,
    });
  });

  // 3. Fetch reactions
  const reactionsMap: Record<string, MessageReaction[]> = {};
  const { data: reactionRows } = await supabase
    .from('reactions')
    .select('*')
    .eq('target_type', 'buddies_update')
    .in('target_id', updateIds);

  (reactionRows || []).forEach((r: any) => {
    if (!reactionsMap[r.target_id]) reactionsMap[r.target_id] = [];
    const existing = reactionsMap[r.target_id].find((x) => x.emoji === r.reaction);
    if (existing) {
      if (!existing.userIds.includes(r.user_id)) existing.userIds.push(r.user_id);
    } else {
      reactionsMap[r.target_id].push({ emoji: r.reaction, userIds: [r.user_id] });
    }
  });

  // 4. Resolve signed URLs for voice notes and media
  const resolvedUpdates: BuddiesUpdate[] = await Promise.all(
    updates.map(async (u: any) => {
      let attachmentUrl = u.media_url || u.voice_url || undefined;
      if (attachmentUrl) {
        const bucket = u.voice_url ? 'buddies-voice' : 'room-media';
        attachmentUrl = await getSignedFileUrl(bucket, attachmentUrl);
      }

      return {
        id: u.id,
        roomId: u.room_id,
        authorId: u.user_id,
        content: u.content,
        attachmentUrl,
        attachmentType: (u.media_type as any) || (u.voice_url ? 'audio' : undefined),
        voiceDuration: u.voice_duration || undefined,
        reactions: reactionsMap[u.id] || [],
        replies: repliesByUpdate[u.id] || [],
        createdAt: u.created_at,
      };
    })
  );

  return resolvedUpdates;
}

/**
 * Upload a voice note to the private 'buddies-voice' Storage bucket.
 * Uses path: room_id/user_id/file-name
 * Returns the private storage path to store in database.
 */
export async function uploadBuddiesVoice(
  roomId: string,
  userIdOrBlob: string | Blob,
  audioBlobMaybe?: Blob
): Promise<string> {
  let userId = 'user';
  let blob: Blob;

  if (typeof userIdOrBlob === 'string') {
    userId = userIdOrBlob;
    blob = audioBlobMaybe!;
  } else {
    blob = userIdOrBlob;
  }

  const filePath = `${roomId}/${userId}/voice-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.webm`;
  return await uploadPrivateFile('buddies-voice', filePath, blob, 'audio/webm');
}

/**
 * Publish a learning update in a buddies room.
 */
export async function postBuddiesUpdate(data: {
  roomId: string;
  authorId: string;
  content: string;
  attachmentUrl?: string; // storage path or external URL
  attachmentType?: 'image' | 'video' | 'audio';
  voiceDuration?: string;
}): Promise<BuddiesUpdate | null> {
  if (!isSupabaseConfigured) return null;

  const isVoice = data.attachmentType === 'audio' || Boolean(data.voiceDuration);

  const { data: row, error } = await supabase
    .from('buddies_updates')
    .insert({
      room_id: data.roomId,
      user_id: data.authorId,
      content: data.content,
      voice_url: isVoice ? data.attachmentUrl || null : null,
      voice_duration: data.voiceDuration || null,
      media_url: !isVoice ? data.attachmentUrl || null : null,
      media_type: data.attachmentType || null,
    })
    .select()
    .single();

  if (error || !row) {
    console.error('Failed to post buddies update:', error);
    throw error;
  }

  // Resolve signed URL for the immediate returned object
  let resolvedUrl = row.media_url || row.voice_url || undefined;
  if (resolvedUrl) {
    const bucket = row.voice_url ? 'buddies-voice' : 'room-media';
    resolvedUrl = await getSignedFileUrl(bucket, resolvedUrl);
  }

  return {
    id: row.id,
    roomId: row.room_id,
    authorId: row.user_id,
    content: row.content,
    attachmentUrl: resolvedUrl,
    attachmentType: (row.media_type as any) || (row.voice_url ? 'audio' : undefined),
    voiceDuration: row.voice_duration || undefined,
    reactions: [],
    replies: [],
    createdAt: row.created_at,
  };
}

/**
 * Add a reply to a buddies update.
 */
export async function addBuddiesReply(
  updateId: string,
  userId: string,
  content: string
): Promise<BuddiesReply | null> {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from('buddies_replies')
    .insert({
      update_id: updateId,
      user_id: userId,
      content,
    })
    .select()
    .single();

  if (error || !data) throw error;

  return {
    id: data.id,
    authorId: data.user_id,
    content: data.content,
    createdAt: data.created_at,
  };
}

/**
 * Toggle a reaction on a buddies update.
 */
export async function toggleBuddiesReaction(
  updateId: string,
  emoji: string,
  userId: string
): Promise<void> {
  if (!isSupabaseConfigured || !userId) return;

  const { data: existing } = await supabase
    .from('reactions')
    .select('id')
    .eq('target_type', 'buddies_update')
    .eq('target_id', updateId)
    .eq('user_id', userId)
    .eq('reaction', emoji)
    .maybeSingle();

  if (existing) {
    await supabase.from('reactions').delete().eq('id', existing.id);
  } else {
    await supabase.from('reactions').insert({
      target_type: 'buddies_update',
      target_id: updateId,
      user_id: userId,
      reaction: emoji,
    });
  }
}

/**
 * Realtime subscription to buddies updates, replies, and reactions.
 */
export function subscribeToBuddiesUpdates(
  roomId: string,
  onChange: () => void
) {
  if (!isSupabaseConfigured || !roomId) return { unsubscribe: () => {} };

  const channel = supabase
    .channel(`buddies:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'buddies_updates',
        filter: `room_id=eq.${roomId}`,
      },
      () => onChange()
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'buddies_replies',
      },
      () => onChange()
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'reactions',
        filter: `target_type=eq.buddies_update`,
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
