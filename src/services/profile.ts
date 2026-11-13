import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Database } from '../types/database';
import { uploadPrivateFile, getSignedFileUrl } from './storageBucket';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

/**
 * Fetch profile for a user, resolving private avatar storage path to signed URL.
 */
export async function getProfile(userId: string): Promise<ProfileRow | null> {
  if (!isSupabaseConfigured || !userId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.warn('Error fetching profile:', error.message);
    return null;
  }

  if (data?.avatar_url) {
    const signedAvatar = await getSignedFileUrl('avatars', data.avatar_url);
    return {
      ...data,
      avatar_url: signedAvatar,
    };
  }

  return data;
}

/**
 * Update user profile details.
 */
export async function updateProfile(
  userId: string,
  updates: ProfileUpdate
): Promise<ProfileRow | null> {
  if (!isSupabaseConfigured || !userId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Upload an avatar to the private 'avatars' Storage bucket.
 * Path format: user_id/file-name as specified in requirements.
 * Stores storage path in database profiles.avatar_url and returns a signed URL.
 */
export async function uploadAvatar(
  userId: string,
  file: File
): Promise<string> {
  if (!isSupabaseConfigured || !userId) {
    throw new Error('Supabase is not configured');
  }

  const fileExt = file.name.split('.').pop() || 'jpg';
  const filePath = `${userId}/avatar-${Date.now()}.${fileExt}`;

  await uploadPrivateFile('avatars', filePath, file);

  // Store relative storage path in database
  await updateProfile(userId, { avatar_url: filePath });

  // Return signed URL for immediate frontend display
  return await getSignedFileUrl('avatars', filePath);
}
