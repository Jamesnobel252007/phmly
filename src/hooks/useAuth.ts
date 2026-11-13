import { useState, useEffect, useCallback } from 'react';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import type { User as PhmlyUser } from '../types/phmly';
import {
  getCurrentUser,
  getSession,
  onAuthStateChange,
  mapSupabaseUserToPhmlyUser,
  signIn as authSignIn,
  signUp as authSignUp,
  signOut as authSignOut,
} from '../services/auth';
import { getProfile } from '../services/profile';
import { isSupabaseConfigured } from '../lib/supabase';
import { StorageService } from '../services/storage';

export function useAuth() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [phmlyUser, setPhmlyUser] = useState<PhmlyUser | null>(() => {
    return StorageService.getCurrentUser();
  });
  const [loading, setLoading] = useState(true);

  const loadUserProfile = useCallback(async (sbUser: SupabaseUser) => {
    try {
      const profileData = await getProfile(sbUser.id);
      const mapped = mapSupabaseUserToPhmlyUser(sbUser, profileData || undefined);
      setPhmlyUser(mapped);
      // Synchronize into StorageService for offline/local cache
      StorageService.updateCurrentUser({
        id: mapped.id,
        name: mapped.name,
        avatar: mapped.avatar,
        bio: mapped.bio,
      });
    } catch (err) {
      console.warn('Error loading profile in useAuth:', err);
      const fallback = mapSupabaseUserToPhmlyUser(sbUser);
      setPhmlyUser(fallback);
    }
  }, []);

  useEffect(() => {
    // Purge any legacy demo user state
    StorageService.initializeIfNeeded();

    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    let initialized = false;

    // Fast session resolution without redundant network requests
    const handleUserSession = async (currentSession: Session | null) => {
      if (!isMounted) return;
      setSession(currentSession);
      const sbUser = currentSession?.user || null;
      setUser(sbUser);

      if (sbUser) {
        await loadUserProfile(sbUser);
      } else {
        setPhmlyUser(null);
        StorageService.clearCurrentUser();
      }
      initialized = true;
      setLoading(false);
    };

    // 1. Primary listener: onAuthStateChange emits INITIAL_SESSION immediately in Supabase v2
    const { data: authListener } = onAuthStateChange(async (_event, newSession) => {
      if (!isMounted) return;
      await handleUserSession(newSession);
    });

    // 2. Fast-path fallback from local session storage if event hasn't fired
    const timer = setTimeout(() => {
      if (!initialized && isMounted) {
        getSession()
          .then((s) => {
            if (!initialized && isMounted) {
              handleUserSession(s);
            }
          })
          .catch(() => {
            if (isMounted) setLoading(false);
          });
      }
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      authListener?.subscription?.unsubscribe?.();
    };
  }, [loadUserProfile]);

  const signIn = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const res = await authSignIn(email, pass);
      if (res.user) {
        setUser(res.user);
        setSession(res.session);
        await loadUserProfile(res.user);
      }
      return res;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, pass: string, fullName: string, username?: string) => {
    setLoading(true);
    try {
      const res = await authSignUp(email, pass, fullName, username);
      if (res.user && res.session) {
        setUser(res.user);
        setSession(res.session);
        await loadUserProfile(res.user);
      }
      return res;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await authSignOut();
      setUser(null);
      setSession(null);
      setPhmlyUser(null);
      StorageService.clearCurrentUser();
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await loadUserProfile(user);
    }
  };

  return {
    user,
    session,
    phmlyUser,
    isAuthenticated: Boolean(user),
    loading,
    isSupabaseConfigured,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    reloadProfile: refreshProfile,
  };
}

