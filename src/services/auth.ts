import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import type { User as PhmlyUser } from '../types/phmly';

export interface AuthResponse {
  user: SupabaseUser | null;
  session: Session | null;
  needsEmailConfirmation?: boolean;
}

export async function signUp(
  email: string,
  password: string,
  fullName: string,
  username?: string
): Promise<AuthResponse> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Please check your .env.local file.');
  }

  const cleanEmail = email.trim();
  const cleanName = fullName.trim();
  const cleanUsername = (username || cleanEmail.split('@')[0]).trim();

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      data: {
        full_name: cleanName,
        username: cleanUsername,
      },
    },
  });

  if (error) throw error;

  // If user is created but session is null, email confirmation is enabled
  const needsEmailConfirmation = Boolean(data.user && !data.session);

  // If session exists immediately, guarantee profile exists in database
  if (data.user && data.session) {
    try {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: cleanName,
        username: cleanUsername,
        avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}`,
        bio: 'Member of PHMLY',
      });
    } catch (profileErr) {
      console.warn('Profile upsert fallback warning:', profileErr);
    }
  }

  return {
    user: data.user,
    session: data.session,
    needsEmailConfirmation,
  };
}

export async function signIn(email: string, password: string): Promise<AuthResponse> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Please check your .env.local file.');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) throw error;

  return {
    user: data.user,
    session: data.session,
  };
}

export async function signOut(): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function resetPassword(email: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Please check your .env.local file.');
  }
  const cleanEmail = email.trim();
  const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
    redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
  });
  if (error) throw error;
}

export async function getSession(): Promise<Session | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function getCurrentUser(): Promise<SupabaseUser | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void
) {
  if (!isSupabaseConfigured) {
    return { data: { subscription: { unsubscribe: () => {} } } };
  }
  return supabase.auth.onAuthStateChange(callback);
}

export function mapSupabaseUserToPhmlyUser(
  user: SupabaseUser,
  profile?: { full_name?: string | null; avatar_url?: string | null; bio?: string | null }
): PhmlyUser {
  const name =
    profile?.full_name ||
    user.user_metadata?.full_name ||
    user.email?.split('@')[0] ||
    'Friend';
  const avatar =
    profile?.avatar_url ||
    user.user_metadata?.avatar_url ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;

  return {
    id: user.id,
    name,
    avatar,
    bio: profile?.bio || user.user_metadata?.bio || 'Member of PHMLY',
    email: user.email,
    createdAt: user.created_at || new Date().toISOString(),
  };
}
