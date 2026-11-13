import { supabase, isSupabaseConfigured } from '../lib/supabase';

export type StorageBucket =
  | 'avatars'
  | 'room-media'
  | 'chat-attachments'
  | 'buddies-voice'
  | 'vault-files';

/**
 * Uploads a file or blob to a private Supabase Storage bucket.
 * Returns the relative object storage path (e.g. roomId/userId/filename.ext),
 * NOT a public URL, ensuring database rows reference private storage paths.
 */
export async function uploadPrivateFile(
  bucket: StorageBucket,
  path: string,
  file: File | Blob,
  contentType?: string
): Promise<string> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Please verify .env.local.');
  }

  const options: { upsert: boolean; contentType?: string } = {
    upsert: true,
  };
  if (contentType) {
    options.contentType = contentType;
  } else if (file instanceof File && file.type) {
    options.contentType = file.type;
  }

  const { error } = await supabase.storage.from(bucket).upload(path, file, options);

  if (error) {
    console.error(`[Storage] Upload error in bucket "${bucket}" for path "${path}":`, error);
    throw error;
  }

  return path;
}

// In-memory TTL cache for signed URLs to eliminate redundant Storage API requests
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

/**
 * Clear the signed URL cache (e.g. on logout).
 */
export function clearSignedUrlCache(): void {
  signedUrlCache.clear();
}

/**
 * Creates a signed URL for private file access (previews, audio playback, downloads).
 * If the input is already a fully qualified URL (e.g. Unsplash, external link, or data/blob URI),
 * it returns the URL directly.
 * Uses an in-memory TTL cache to prevent repeated signed URL requests for the same path.
 */
export async function getSignedFileUrl(
  bucket: StorageBucket,
  pathOrUrl?: string | null,
  expiresIn: number = 3600
): Promise<string> {
  if (!pathOrUrl) return '';

  // Return direct URLs without attempting to sign
  if (
    pathOrUrl.startsWith('http://') ||
    pathOrUrl.startsWith('https://') ||
    pathOrUrl.startsWith('data:') ||
    pathOrUrl.startsWith('blob:')
  ) {
    return pathOrUrl;
  }

  // Check in-memory cache first (leave 60s buffer before expiration)
  const cacheKey = `${bucket}:${pathOrUrl}`;
  const cached = signedUrlCache.get(cacheKey);
  const now = Date.now();
  if (cached && now < cached.expiresAt - 60000) {
    return cached.url;
  }

  if (!isSupabaseConfigured) return pathOrUrl;

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(pathOrUrl, expiresIn);

    if (error || !data?.signedUrl) {
      console.warn(`[Storage] Failed to create signed URL for ${bucket}/${pathOrUrl}:`, error?.message);
      return pathOrUrl;
    }

    // Cache the resolved signed URL
    signedUrlCache.set(cacheKey, {
      url: data.signedUrl,
      expiresAt: now + expiresIn * 1000,
    });

    return data.signedUrl;
  } catch (err) {
    console.warn(`[Storage] Error generating signed URL for ${pathOrUrl}:`, err);
    return pathOrUrl;
  }
}

/**
 * Downloads a private file from Storage as a Blob.
 */
export async function downloadPrivateFile(
  bucket: StorageBucket,
  path: string
): Promise<Blob> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured');
  }

  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) {
    console.error(`[Storage] Failed to download file ${bucket}/${path}:`, error);
    throw error || new Error('Failed to download file');
  }

  return data;
}

/**
 * Deletes a file from a private Supabase Storage bucket.
 */
export async function deletePrivateFile(
  bucket: StorageBucket,
  path: string
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) {
    console.warn(`[Storage] Failed to delete ${bucket}/${path}:`, error);
    return false;
  }
  return true;
}

