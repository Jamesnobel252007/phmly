import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { MediaItem } from '../types/phmly';
import { uploadPrivateFile, getSignedFileUrl } from './storageBucket';

/**
 * Fetch room media, resolving private storage paths to signed URLs.
 */
export async function getRoomMedia(roomId: string, limit: number = 30): Promise<MediaItem[]> {
  if (!isSupabaseConfigured || !roomId) return [];

  const { data: rows, error } = await supabase
    .from('media')
    .select('id, room_id, uploaded_by, media_type, media_url, caption, created_at')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !rows) {
    console.error('Failed to fetch media:', error);
    return [];
  }

  const resolvedMedia: MediaItem[] = await Promise.all(
    rows.map(async (r: any) => {
      let resolvedUri = r.media_url;
      if (resolvedUri) {
        resolvedUri = await getSignedFileUrl('room-media', resolvedUri);
      }

      return {
        id: r.id,
        roomId: r.room_id,
        senderId: r.uploaded_by,
        mediaType: r.media_type as 'image' | 'video',
        localUri: resolvedUri,
        caption: r.caption || undefined,
        createdAt: r.created_at,
      };
    })
  );

  return resolvedMedia;
}

/**
 * Helper to convert data: URIs to Blob for Storage upload.
 */
async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return await res.blob();
}

/**
 * Upload a media file to the private 'room-media' Storage bucket.
 * Path format: room_id/user_id/file-name
 * Returns the private storage path to store in database.
 */
export async function uploadMediaFile(
  roomId: string,
  userIdOrFile: string | File | Blob,
  fileOrBlobMaybe?: File | Blob,
  mediaType: 'image' | 'video' = 'image'
): Promise<string> {
  let userId = 'user';
  let fileOrBlob: File | Blob;

  if (typeof userIdOrFile === 'string') {
    userId = userIdOrFile;
    fileOrBlob = fileOrBlobMaybe!;
  } else {
    fileOrBlob = userIdOrFile;
  }

  const ext = mediaType === 'video' ? 'mp4' : 'jpg';
  const filePath = `${roomId}/${userId}/media-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
  const contentType = mediaType === 'video' ? 'video/mp4' : 'image/jpeg';

  return await uploadPrivateFile('room-media', filePath, fileOrBlob, contentType);
}

/**
 * Share captured or uploaded media across multiple rooms simultaneously.
 * Automatically uploads data URLs to the private 'room-media' bucket.
 * Stores private storage path in media.media_url column.
 */
export async function shareMediaToRooms(
  roomIds: string[],
  userId: string,
  mediaStoragePathOrUrl: string,
  mediaType: 'image' | 'video',
  caption?: string
): Promise<MediaItem[]> {
  if (!isSupabaseConfigured || roomIds.length === 0) return [];

  let finalStoragePath = mediaStoragePathOrUrl;

  // If a data URL was passed (from webcam capture/canvas), upload to private storage first
  if (finalStoragePath.startsWith('data:')) {
    try {
      const blob = await dataUrlToBlob(finalStoragePath);
      const firstRoomId = roomIds[0] || 'shared';
      finalStoragePath = await uploadMediaFile(firstRoomId, userId, blob, mediaType);
    } catch (e) {
      console.warn('Failed to convert dataUrl to storage file:', e);
    }
  }

  const rowsToInsert = roomIds.map((roomId) => ({
    room_id: roomId,
    uploaded_by: userId,
    media_url: finalStoragePath,
    media_type: mediaType,
    caption: caption || null,
  }));

  const { data: inserted, error } = await supabase
    .from('media')
    .insert(rowsToInsert)
    .select();

  if (error || !inserted) {
    console.error('Failed to share media to rooms:', error);
    throw error;
  }

  const resolved = await Promise.all(
    inserted.map(async (r: any) => {
      let signedUrl = r.media_url;
      if (signedUrl) {
        signedUrl = await getSignedFileUrl('room-media', signedUrl);
      }

      return {
        id: r.id,
        roomId: r.room_id,
        senderId: r.uploaded_by,
        mediaType: r.media_type as 'image' | 'video',
        localUri: signedUrl,
        caption: r.caption || undefined,
        createdAt: r.created_at,
      };
    })
  );

  return resolved;
}

/**
 * Realtime subscription to media table for a room.
 */
export function subscribeToRoomMedia(
  roomId: string,
  onMediaChange: () => void
) {
  if (!isSupabaseConfigured || !roomId) return { unsubscribe: () => {} };

  const channel = supabase
    .channel(`media:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'media',
        filter: `room_id=eq.${roomId}`,
      },
      () => onMediaChange()
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}
