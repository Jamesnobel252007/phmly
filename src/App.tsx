import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Camera, Sparkles } from 'lucide-react';
import { Room, User, MediaItem } from './types';
import { StorageService } from './services/storage';
import { LIMITS } from './constants/design';
import { useAuth } from './hooks/useAuth';
import { isSupabaseConfigured } from './lib/supabase';
import { getUserRooms } from './services/room';
import { getRoomMedia, subscribeToRoomMedia } from './services/media';

import { Header } from './components/common/Header';
import { BottomNav } from './components/common/BottomNav';
import { RoomCard } from './components/home/RoomCard';
import { CreateRoomModal } from './components/home/CreateRoomModal';
import { RoomShell } from './components/rooms/RoomShell';
import { ConversationRoom } from './components/room-types/ConversationRoom';
import { BuddiesRoom } from './components/room-types/BuddiesRoom';
import { ProjectVaultRoom } from './components/room-types/ProjectVaultRoom';
import { GoalTrackerRoom } from './components/room-types/GoalTrackerRoom';
import { CameraModal } from './components/camera/CameraModal';
import { ProfileView } from './components/profile/ProfileView';
import { AuthModal } from './components/auth/AuthModal';

export function App() {
  const { user: authUser, phmlyUser, signOut, reloadProfile } = useAuth();
  const currentUser = phmlyUser;

  const [currentTab, setCurrentTab] = useState<'home' | 'profile'>('home');
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  const [rooms, setRooms] = useState<Room[]>(() => {
    const cur = StorageService.getCurrentUser();
    if (!cur) return [];
    return StorageService.getRooms().filter((r) => r.memberIds.includes(cur.id));
  });
  const [roomMedia, setRoomMedia] = useState<MediaItem[]>([]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [cameraModalConfig, setCameraModalConfig] = useState<{
    isOpen: boolean;
    roomId?: string;
  }>({ isOpen: false });

  // Load rooms for current user
  const refreshRooms = useCallback(async () => {
    if (!currentUser) {
      setRooms([]);
      return;
    }
    if (isSupabaseConfigured && currentUser.id) {
      try {
        const sbRooms = await getUserRooms(currentUser.id);
        setRooms(sbRooms);
        return;
      } catch (err) {
        console.warn('Failed to fetch rooms from Supabase, falling back:', err);
      }
    }
    const all = StorageService.getRooms();
    const userRooms = all.filter((r) => r.memberIds.includes(currentUser.id));
    setRooms(userRooms);
  }, [currentUser]);

  useEffect(() => {
    refreshRooms();
  }, [refreshRooms]);

  // Protect private rooms from unauthenticated access
  useEffect(() => {
    if (!currentUser && activeRoomId) {
      setActiveRoomId(null);
    }
  }, [currentUser, activeRoomId]);

  // Load media and subscribe whenever active room changes
  useEffect(() => {
    if (!activeRoomId) return;

    const loadMedia = async () => {
      if (isSupabaseConfigured) {
        try {
          const sbMedia = await getRoomMedia(activeRoomId);
          setRoomMedia(sbMedia);
          return;
        } catch (err) {
          console.warn('Failed to load room media from Supabase:', err);
        }
      }
      const mediaList = StorageService.getMedia(activeRoomId);
      setRoomMedia(mediaList);
    };

    loadMedia();

    if (isSupabaseConfigured) {
      const sub = subscribeToRoomMedia(activeRoomId, () => {
        loadMedia();
      });
      return () => {
        sub.unsubscribe();
      };
    }
  }, [activeRoomId]);

  const activeRoom = activeRoomId
    ? rooms.find((r) => r.id === activeRoomId) || StorageService.getRoomById(activeRoomId)
    : null;

  const userCreatedCount = currentUser
    ? Math.max(
        rooms.filter((r) => r.ownerId === currentUser.id).length,
        StorageService.getUserCreatedRoomCount(currentUser.id)
      )
    : 0;

  const handleOpenRoom = (roomId: string) => {
    setActiveRoomId(roomId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToHome = () => {
    setActiveRoomId(null);
    setCurrentTab('home');
    refreshRooms();
  };

  const handleOpenCreateRoom = () => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    setShowCreateModal(true);
  };

  const handleOpenCentralCamera = (roomId?: string) => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    setCameraModalConfig({ isOpen: true, roomId });
  };

  const handleRoomCreated = (newRoom: Room) => {
    setShowCreateModal(false);
    refreshRooms();
    handleOpenRoom(newRoom.id);
  };

  const handleMediaShared = (sharedRoomIds: string[]) => {
    if (activeRoomId && sharedRoomIds.includes(activeRoomId)) {
      setRoomMedia(StorageService.getMedia(activeRoomId));
    }
    refreshRooms();
  };

  return (
    <div className="min-h-screen bg-phmly-bg text-phmly-text flex flex-col font-sans transition-colors duration-150">
      {/* Compact Top Header */}
      <Header
        currentUser={currentUser}
        isAuthenticated={Boolean(authUser)}
        userEmail={authUser?.email}
        onOpenAuth={() => setShowAuthModal(true)}
        onSignOut={signOut}
        onOpenProfile={() => {
          setActiveRoomId(null);
          setCurrentTab('profile');
        }}
        onGoHome={handleBackToHome}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {/* ROOM DETAIL VIEW */}
        {activeRoom && currentUser ? (
          <RoomShell
            room={activeRoom}
            media={roomMedia}
            currentUser={currentUser}
            onBack={handleBackToHome}
            onOpenRoomCamera={() => handleOpenCentralCamera(activeRoom.id)}
            onRoomUpdated={() => {
              refreshRooms();
              if (activeRoomId) {
                setRoomMedia(StorageService.getMedia(activeRoomId));
              }
            }}
          >
            {activeRoom.type === 'conversation' && (
              <ConversationRoom
                key={activeRoom.id}
                room={activeRoom}
                currentUser={currentUser}
                onOpenRoomCamera={() =>
                  setCameraModalConfig({ isOpen: true, roomId: activeRoom.id })
                }
              />
            )}

            {activeRoom.type === 'buddies' && (
              <BuddiesRoom
                key={activeRoom.id}
                room={activeRoom}
                currentUser={currentUser}
                onOpenRoomCamera={() =>
                  setCameraModalConfig({ isOpen: true, roomId: activeRoom.id })
                }
              />
            )}

            {activeRoom.type === 'project_vault' && (
              <ProjectVaultRoom key={activeRoom.id} room={activeRoom} currentUser={currentUser} />
            )}

            {activeRoom.type === 'goal_tracker' && (
              <GoalTrackerRoom key={activeRoom.id} room={activeRoom} currentUser={currentUser} />
            )}
          </RoomShell>
        ) : currentTab === 'profile' ? (
          /* PROFILE VIEW */
          <ProfileView
            currentUser={currentUser}
            isAuthenticated={Boolean(authUser)}
            userEmail={authUser?.email}
            onOpenAuth={() => setShowAuthModal(true)}
            onSignOut={signOut}
            onProfileUpdated={() => {
              reloadProfile();
              refreshRooms();
            }}
            onSelectRoom={handleOpenRoom}
            onClose={() => setCurrentTab('home')}
          />
        ) : (
          /* HOME DASHBOARD VIEW */
          <div className="max-w-2xl mx-auto w-full px-4 sm:px-5 py-4 space-y-4 pb-24">
            {rooms.length === 0 ? (
              /* FIRST-TIME / ZERO-ROOMS EMPTY STATE: REUSING COMPLETE WELCOME SECTION */
              <div className="bg-phmly-surface border border-phmly-border rounded-3xl p-6 sm:p-8 shadow-xs transition-colors space-y-5">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-goldenRush/15 border border-goldenRush/30 text-goldenRush text-caption font-semibold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Welcome to PHMLY</span>
                  </div>
                  <h1 className="text-display font-semibold text-phmly-text tracking-tight">
                    Your people. Your purpose. Your space.
                  </h1>
                  <p className="text-secondary text-phmly-muted leading-relaxed max-w-md">
                    Private spaces for conversations, learning, shared resources, and daily goals.
                  </p>
                </div>

                {/* Prominent Create Room Button */}
                <div className="pt-1">
                  <button
                    onClick={handleOpenCreateRoom}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-goldenRush text-forestBlack font-semibold text-secondary hover:bg-amberGlow transition-transform active:scale-95 shadow-xs"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>Create Your First Room</span>
                  </button>
                </div>

                {/* Room Creation Limit Info & Central Camera Action */}
                <div className="pt-4 border-t border-phmly-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-metadata">
                  <div className="flex items-center gap-1.5 text-phmly-muted">
                    <span className="font-medium text-phmly-text">
                      {userCreatedCount} of {LIMITS.MAX_ROOMS_CREATED} rooms created
                    </span>
                    <span>·</span>
                    <span className="text-caption">Up to 30 members each</span>
                  </div>

                  {/* Secondary Central Camera Action */}
                  <button
                    onClick={() => handleOpenCentralCamera()}
                    className="inline-flex items-center gap-1.5 text-metadata text-goldenRush font-medium hover:underline transition-colors self-start sm:self-auto"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Central Camera & Multi-Room Share</span>
                  </button>
                </div>
              </div>
            ) : (
              /* NORMAL HOME STATE (WELCOME SECTION COMPLETELY HIDDEN) */
              <div className="space-y-2">
                {/* Header on the same horizontal line: 16px semibold */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-section font-semibold text-phmly-text">
                      Your Rooms
                    </h2>
                    <span className="text-metadata font-medium text-goldenRush bg-goldenRush/10 px-2 py-0.5 rounded-full">
                      {rooms.length}
                    </span>
                  </div>

                  <button
                    onClick={handleOpenCreateRoom}
                    className="text-secondary font-medium text-goldenRush hover:underline inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>New Room</span>
                  </button>
                </div>

                {/* Compact WhatsApp/Messenger style conversation rows */}
                <div className="bg-phmly-surface border border-phmly-border rounded-2xl overflow-hidden shadow-xs divide-y divide-phmly-border transition-colors">
                  {rooms.map((room, idx) => (
                    <RoomCard
                      key={room.id}
                      room={room}
                      isLast={idx === rooms.length - 1}
                      onClick={() => handleOpenRoom(room.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setActiveRoomId(null);
          setCurrentTab(tab);
        }}
        onOpenCentralCamera={() => handleOpenCentralCamera()}
      />

      {/* Modals */}
      {showCreateModal && (
        <CreateRoomModal
          currentUser={currentUser}
          onClose={() => setShowCreateModal(false)}
          onRoomCreated={handleRoomCreated}
        />
      )}

      {cameraModalConfig.isOpen && (
        <CameraModal
          initialRoomId={cameraModalConfig.roomId}
          currentUser={currentUser}
          onClose={() => setCameraModalConfig({ isOpen: false })}
          onMediaShared={handleMediaShared}
        />
      )}

      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => {
            setShowAuthModal(false);
            refreshRooms();
          }}
        />
      )}
    </div>
  );
}
export default App;
