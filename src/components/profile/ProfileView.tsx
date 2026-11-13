import React, { useState, useRef, useEffect } from 'react';
import { User, Room } from '../../types';
import { StorageService } from '../../services/storage';
import { Avatar } from '../common/Avatar';
import { LIMITS } from '../../constants/design';
import { User as UserIcon, Shield, RefreshCw, Layers, Check, Info, Sun, Moon, Monitor, Camera, LogIn, LogOut, Sparkles } from 'lucide-react';
import { useTheme, ThemeMode } from '../../services/theme';
import { updateProfile, uploadAvatar } from '../../services/profile';
import { isSupabaseConfigured } from '../../lib/supabase';

interface ProfileViewProps {
  currentUser: User | null;
  onProfileUpdated: () => void;
  onSelectRoom: (roomId: string) => void;
  onClose: () => void;
  isAuthenticated?: boolean;
  userEmail?: string;
  onOpenAuth?: () => void;
  onSignOut?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  onProfileUpdated,
  onSelectRoom,
  onClose,
  isAuthenticated = false,
  userEmail,
  onOpenAuth,
  onSignOut,
}) => {
  const [name, setName] = useState(currentUser?.name || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatar || '');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { themeMode, effectiveTheme, setThemeMode } = useTheme();

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name);
      setBio(currentUser.bio || '');
      setAvatarUrl(currentUser.avatar || '');
    }
  }, [currentUser]);

  const rooms = StorageService.getRooms();
  const myRooms = currentUser ? rooms.filter((r) => r.memberIds.includes(currentUser.id)) : [];
  const createdCount = currentUser ? StorageService.getUserCreatedRoomCount(currentUser.id) : 0;

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    setIsUploadingAvatar(true);
    try {
      if (isSupabaseConfigured) {
        try {
          const publicUrl = await uploadAvatar(currentUser.id, file);
          setAvatarUrl(publicUrl);
          StorageService.updateCurrentUser({ avatar: publicUrl });
          await updateProfile(currentUser.id, { avatar_url: publicUrl });
          onProfileUpdated();
          setIsUploadingAvatar(false);
          return;
        } catch (uploadErr) {
          console.warn('Supabase avatar upload failed, fallback to data URL:', uploadErr);
        }
      }

      const reader = new FileReader();
      reader.onload = () => {
        const localUrl = reader.result as string;
        setAvatarUrl(localUrl);
        StorageService.updateCurrentUser({ avatar: localUrl });
        onProfileUpdated();
        setIsUploadingAvatar(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.warn('Avatar picker error:', err);
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !currentUser) return;

    try {
      if (isSupabaseConfigured) {
        await updateProfile(currentUser.id, {
          full_name: name.trim(),
          bio: bio.trim(),
        });
      }
    } catch (err) {
      console.warn('Supabase updateProfile error:', err);
    }

    StorageService.updateCurrentUser({
      name: name.trim(),
      bio: bio.trim(),
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
    onProfileUpdated();
  };

  const handleResetData = () => {
    if (window.confirm('Reset demo data back to clean prototype defaults?')) {
      StorageService.resetToDemo();
      setResetSuccess(true);
      setTimeout(() => {
        setResetSuccess(false);
        window.location.reload();
      }, 800);
    }
  };

  const handleClearRooms = () => {
    if (window.confirm('Clear all rooms to test the zero-rooms welcome screen?')) {
      if (currentUser) {
        StorageService.clearUserRooms(currentUser.id);
      }
      onProfileUpdated();
      onClose();
    }
  };

  const isLoggedIn = Boolean(isAuthenticated && currentUser);

  return (
    <div className="max-w-2xl mx-auto w-full px-3.5 sm:px-5 py-4 space-y-4 pb-32 sm:pb-24 overflow-x-hidden transition-colors">
      {/* 1. Header Profile Card: Logged In vs Logged Out State */}
      {!isLoggedIn ? (
        /* LOGGED-OUT WELCOME PROFILE CARD */
        <div className="bg-phmly-surface border border-phmly-border rounded-3xl p-5 sm:p-6 shadow-xs text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-goldenRush/15 border border-goldenRush/30 flex items-center justify-center text-goldenRush shadow-xs">
            <UserIcon className="w-8 h-8 stroke-[2]" />
          </div>
          <div>
            <h2 className="text-page-title font-semibold text-phmly-text">Welcome to PHMLY</h2>
            <p className="text-metadata text-phmly-muted max-w-sm mx-auto mt-1 leading-relaxed">
              Your people. Your purpose. Your space. Log in or create an account to access private rooms and chat with friends.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={onOpenAuth}
              type="button"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 min-h-[44px] rounded-xl bg-goldenRush text-forestBlack font-medium text-secondary hover:bg-amberGlow transition-transform active:scale-95 shadow-md shadow-goldenRush/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-goldenRush"
            >
              <LogIn className="w-4 h-4 stroke-[2.5]" />
              <span>Log In or Sign Up</span>
            </button>
          </div>
        </div>
      ) : (
        /* LOGGED-IN PROFILE HEADER CARD */
        <div className="bg-phmly-surface border border-phmly-border rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3.5 sm:gap-4 text-center sm:text-left">
            {/* Avatar with live photo upload trigger */}
            <div
              className="relative group cursor-pointer shrink-0"
              onClick={() => fileInputRef.current?.click()}
              title="Change avatar image"
              role="button"
              tabIndex={0}
              aria-label="Change avatar photo"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
              }}
            >
              <Avatar
                src={avatarUrl}
                name={currentUser?.name || 'User'}
                size="lg"
                shape="square"
                className="ring-2 ring-goldenRush/30 transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-forestBlack/50 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Camera className="w-5 h-5 text-goldenRush" />
              </div>
              {isUploadingAvatar && (
                <div className="absolute inset-0 bg-forestBlack/70 rounded-2xl flex items-center justify-center text-caption text-goldenRush font-medium">
                  Uploading...
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarFileChange}
                aria-hidden="true"
              />
            </div>

            {/* User details (Screen title: 20px semibold, description: 12-13px) */}
            <div className="flex-1 min-w-0 w-full">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="text-page-title font-semibold text-phmly-text break-words">
                  {currentUser?.name || 'User'}
                </h2>
                <span className="text-caption font-medium bg-goldenRush/15 text-goldenRush px-2 py-0.5 rounded-full shrink-0">
                  Supabase
                </span>
              </div>
              <p className="text-metadata text-phmly-muted mt-0.5 break-words line-clamp-2">
                {currentUser?.bio || 'Your people. Your purpose. Your space.'}
              </p>

              {/* Room Creation Allowance Bar */}
              <div className="mt-3 max-w-sm mx-auto sm:mx-0">
                <div className="flex items-center justify-between text-metadata mb-1">
                  <span className="text-phmly-muted text-caption">Rooms Created</span>
                  <span className="font-mono text-goldenRush font-medium text-metadata">
                    {createdCount} / {LIMITS.MAX_ROOMS_CREATED}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-phmly-subtle rounded-full overflow-hidden">
                  <div
                    className="h-full bg-goldenRush rounded-full transition-all duration-300"
                    style={{ width: `${(createdCount / LIMITS.MAX_ROOMS_CREATED) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Supabase Account & Auth Section (Section title: 16px semibold) */}
      <div className="bg-phmly-surface border border-phmly-border rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-section font-semibold text-phmly-text flex items-center gap-2">
              <Shield className="w-4 h-4 text-goldenRush shrink-0" />
              <span>Supabase Account</span>
            </h3>
            <p className="text-metadata text-phmly-muted mt-1 break-all">
              {isLoggedIn
                ? `Signed in as ${userEmail || currentUser?.email || currentUser?.name}`
                : 'You are currently not logged in.'}
            </p>
          </div>

          <div className="shrink-0 self-start sm:self-auto">
            {isLoggedIn ? (
              <button
                type="button"
                onClick={onSignOut}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 text-secondary font-medium border border-rose-500/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl bg-goldenRush text-forestBlack hover:bg-amberGlow text-secondary font-medium transition-colors shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-goldenRush"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Log In / Sign Up</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Theme Selection Section */}
      <div className="bg-phmly-surface border border-phmly-border rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div>
          <h3 className="text-section font-semibold text-phmly-text">
            Appearance & Theme
          </h3>
          <p className="text-metadata text-phmly-muted mt-0.5">
            Currently using {effectiveTheme === 'dark' ? 'Dark' : 'Light'} appearance
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1">
          {/* Dark Mode */}
          <button
            type="button"
            onClick={() => setThemeMode('dark')}
            className={`flex flex-col items-center justify-center gap-1.5 p-2 sm:p-3 min-h-[44px] rounded-xl border text-secondary font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-goldenRush ${
              themeMode === 'dark'
                ? 'bg-goldenRush/15 border-goldenRush text-goldenRush shadow-xs'
                : 'bg-phmly-subtle/50 border-phmly-border text-phmly-muted hover:text-phmly-text'
            }`}
          >
            <Moon className="w-4 h-4 shrink-0" />
            <span>Dark</span>
          </button>

          {/* Light Mode */}
          <button
            type="button"
            onClick={() => setThemeMode('light')}
            className={`flex flex-col items-center justify-center gap-1.5 p-2 sm:p-3 min-h-[44px] rounded-xl border text-secondary font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-goldenRush ${
              themeMode === 'light'
                ? 'bg-goldenRush/15 border-goldenRush text-goldenRush shadow-xs'
                : 'bg-phmly-subtle/50 border-phmly-border text-phmly-muted hover:text-phmly-text'
            }`}
          >
            <Sun className="w-4 h-4 shrink-0" />
            <span>Light</span>
          </button>

          {/* System Default */}
          <button
            type="button"
            onClick={() => setThemeMode('system')}
            className={`flex flex-col items-center justify-center gap-1.5 p-2 sm:p-3 min-h-[44px] rounded-xl border text-secondary font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-goldenRush ${
              themeMode === 'system'
                ? 'bg-goldenRush/15 border-goldenRush text-goldenRush shadow-xs'
                : 'bg-phmly-subtle/50 border-phmly-border text-phmly-muted hover:text-phmly-text'
            }`}
          >
            <Monitor className="w-4 h-4 shrink-0" />
            <span>System</span>
          </button>
        </div>
      </div>

      {/* 4. Profile Edit Form (available when authenticated) */}
      {isLoggedIn && (
        <div className="bg-phmly-surface border border-phmly-border rounded-2xl p-4 sm:p-5 shadow-xs">
          <h3 className="text-section font-semibold text-phmly-text mb-3 flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-goldenRush" />
            <span>Edit Profile</span>
          </h3>

          <form onSubmit={handleSaveProfile} className="space-y-3">
            <div>
              <label htmlFor="profile-name" className="block text-metadata font-medium text-phmly-muted mb-1">
                Display Name
              </label>
              <input
                id="profile-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-phmly-subtle text-phmly-text text-secondary px-3.5 py-2.5 rounded-xl border border-phmly-border focus:outline-none focus:border-goldenRush focus:ring-1 focus:ring-goldenRush transition-colors"
              />
            </div>

            <div>
              <label htmlFor="profile-bio" className="block text-metadata font-medium text-phmly-muted mb-1">
                Short Status / Bio
              </label>
              <input
                id="profile-bio"
                type="text"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="What are you building or focused on?"
                className="w-full bg-phmly-subtle text-phmly-text text-secondary px-3.5 py-2.5 rounded-xl border border-phmly-border focus:outline-none focus:border-goldenRush focus:ring-1 focus:ring-goldenRush transition-colors"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              {savedSuccess ? (
                <span className="text-metadata text-emerald-500 font-medium flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Saved!
                </span>
              ) : (
                <span />
              )}

              <button
                type="submit"
                className="px-5 py-2.5 min-h-[44px] rounded-xl bg-goldenRush text-forestBlack font-medium text-secondary hover:bg-amberGlow transition-transform active:scale-95 shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-goldenRush"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 5. My Spaces / Rooms Belonged to */}
      {isLoggedIn && myRooms.length > 0 && (
        <div className="bg-phmly-surface border border-phmly-border rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <h3 className="text-section font-semibold text-phmly-text flex items-center gap-2">
            <Layers className="w-4 h-4 text-goldenRush" />
            <span>My Spaces ({myRooms.length})</span>
          </h3>

          <div className="space-y-1.5">
            {myRooms.map((room) => (
              <button
                key={room.id}
                onClick={() => {
                  onSelectRoom(room.id);
                  onClose();
                }}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-phmly-subtle/50 hover:bg-phmly-subtle border border-phmly-border/50 text-left transition-all group focus:outline-none focus-visible:ring-2 focus-visible:ring-goldenRush"
              >
                <img
                  src={room.photo}
                  alt={room.name}
                  className="w-10 h-10 rounded-xl object-cover shrink-0 border border-phmly-border"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-phmly-text text-secondary truncate group-hover:text-goldenRush">
                    {room.name}
                  </p>
                  <p className="text-metadata text-phmly-muted capitalize">
                    {room.type.replace('_', ' ')} · {room.memberIds.length} members
                  </p>
                </div>
                {currentUser && room.ownerId === currentUser.id && (
                  <span className="text-caption text-goldenRush font-medium bg-goldenRush/10 px-2 py-0.5 rounded-full shrink-0">
                    Owner
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 6. Architecture & State Notice */}
      <div className="bg-phmly-subtle/40 border border-phmly-border rounded-2xl p-4 space-y-2.5">
        <div className="flex items-center gap-2 text-phmly-muted text-metadata font-medium">
          <Info className="w-4 h-4 text-goldenRush shrink-0" />
          <span>Application State</span>
        </div>
        <p className="text-metadata text-phmly-muted leading-relaxed">
          PHMLY uses Supabase authentication and cloud database sync. Switching themes applies globally across all 4 room types.
        </p>

        <div className="pt-2 border-t border-phmly-border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <span className="text-metadata text-phmly-muted">State Controls</span>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            {isLoggedIn && (
              <button
                onClick={handleClearRooms}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl bg-phmly-surface hover:bg-phmly-subtle text-phmly-text border border-phmly-border text-secondary font-medium transition-colors"
                title="Remove all rooms to test 0-rooms Welcome screen"
              >
                <span>Test 0-Rooms State</span>
              </button>
            )}
            <button
              onClick={handleResetData}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/20 text-secondary font-medium transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{resetSuccess ? 'Resetting...' : 'Reset Demo Data'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
