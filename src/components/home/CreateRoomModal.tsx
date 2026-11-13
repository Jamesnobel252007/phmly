import React, { useState } from 'react';
import { X, MessageSquare, Users, FolderArchive, Target, AlertTriangle, Plus, KeyRound } from 'lucide-react';
import { RoomType, Room, User } from '../../types';
import { ROOM_TYPE_META, LIMITS } from '../../constants/design';
import { StorageService } from '../../services/storage';
import { createRoom as createSupabaseRoom, joinRoomByInviteCode, getUserCreatedCount } from '../../services/room';
import { isSupabaseConfigured } from '../../lib/supabase';

interface CreateRoomModalProps {
  currentUser: User | null;
  onClose: () => void;
  onRoomCreated: (newRoom: Room) => void;
}

const PRESET_PHOTOS: Record<RoomType, string[]> = {
  conversation: [
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&auto=format&fit=crop&q=80',
  ],
  buddies: [
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&auto=format&fit=crop&q=80',
  ],
  project_vault: [
    'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&auto=format&fit=crop&q=80',
  ],
  goal_tracker: [
    'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&auto=format&fit=crop&q=80',
  ],
};

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  currentUser,
  onClose,
  onRoomCreated,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedType, setSelectedType] = useState<RoomType>('conversation');
  const [selectedPhoto, setSelectedPhoto] = useState(PRESET_PHOTOS.conversation[0]);
  const [customPhotoUrl, setCustomPhotoUrl] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentUserId = currentUser?.id || 'guest';
  const createdCount = currentUser ? StorageService.getUserCreatedRoomCount(currentUser.id) : 0;
  const isLimitReached = createdCount >= LIMITS.MAX_ROOMS_CREATED;

  const handleTypeSelect = (type: RoomType) => {
    setSelectedType(type);
    setSelectedPhoto(PRESET_PHOTOS[type][0]);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!currentUser) {
      setError('Please log in first to create a room.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const photoToUse = customPhotoUrl.trim() || selectedPhoto;

      if (isSupabaseConfigured) {
        const res = await createSupabaseRoom({
          name: name.trim(),
          description: description.trim(),
          type: selectedType,
          photo: photoToUse,
          ownerId: currentUserId,
        });

        if (!res.success || !res.room) {
          setError(res.error || 'Failed to create room in Supabase');
          return;
        }

        // Also cache locally
        StorageService.createRoom(res.room);
        onRoomCreated(res.room);
        return;
      }

      // Local storage fallback
      if (isLimitReached) {
        setError(`You have reached the limit of ${LIMITS.MAX_ROOMS_CREATED} rooms created.`);
        return;
      }

      const result = StorageService.createRoom({
        name: name.trim(),
        description: description.trim(),
        type: selectedType,
        photo: photoToUse,
        ownerId: currentUserId,
        memberIds: [currentUserId],
        latestActivity: 'Room created',
      });

      if (!result.success || !result.room) {
        setError(result.error || 'Failed to create room');
        return;
      }

      onRoomCreated(result.room);
    } catch (err: any) {
      setError(err?.message || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = inviteCodeInput.trim();
    if (!cleanCode) return;
    if (!currentUser) {
      setError('Please log in first to join a room.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      if (isSupabaseConfigured) {
        const res = await joinRoomByInviteCode(cleanCode, currentUserId);
        if (!res.success || !res.room) {
          setError(res.error || 'Could not join room with this invite code');
          return;
        }
        StorageService.createRoom(res.room);
        onRoomCreated(res.room);
        return;
      }

      // Check local rooms for matching invite code or id
      const allRooms = StorageService.getRooms();
      const match = allRooms.find(
        (r) => r.inviteCode?.trim().toLowerCase() === cleanCode.toLowerCase() || r.id === cleanCode
      );

      if (match) {
        StorageService.addMemberToRoom(match.id, currentUserId);
        onRoomCreated(match);
      } else {
        setError('Invalid room invitation code. Room not found.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to join room');
    } finally {
      setLoading(false);
    }
  };

  const roomTypesList: RoomType[] = ['conversation', 'buddies', 'project_vault', 'goal_tracker'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-forestBlack/75 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-phmly-surface border border-phmly-border rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[92vh] transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-phmly-border bg-phmly-subtle/50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-goldenRush/15 flex items-center justify-center text-goldenRush">
              {activeTab === 'create' ? <Plus className="w-4 h-4 stroke-[3]" /> : <KeyRound className="w-4 h-4" />}
            </div>
            <h2 className="text-section font-semibold text-phmly-text">
              {activeTab === 'create' ? 'Create a Room' : 'Join with Invite Code'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-phmly-muted hover:text-phmly-text hover:bg-phmly-subtle transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher: Create vs Join */}
        <div className="px-5 pt-3">
          <div className="flex items-center bg-phmly-subtle p-1 rounded-xl border border-phmly-border">
            <button
              type="button"
              onClick={() => {
                setActiveTab('create');
                setError(null);
              }}
              className={`flex-1 py-1.5 rounded-lg text-secondary font-medium transition-all ${
                activeTab === 'create'
                  ? 'bg-phmly-surface text-phmly-text shadow-xs'
                  : 'text-phmly-muted hover:text-phmly-text'
              }`}
            >
              Create Space
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('join');
                setError(null);
              }}
              className={`flex-1 py-1.5 rounded-lg text-secondary font-medium transition-all ${
                activeTab === 'join'
                  ? 'bg-goldenRush text-forestBlack shadow-xs'
                  : 'text-phmly-muted hover:text-phmly-text'
              }`}
            >
              Join via Code
            </button>
          </div>
        </div>

        {/* Tab 1: Create Room */}
        {activeTab === 'create' ? (
          <form onSubmit={handleCreate} className="p-5 overflow-y-auto custom-scrollbar space-y-4">
            {/* Room Limit Notice */}
            <div className="flex items-center justify-between bg-phmly-subtle/60 px-3.5 py-2.5 rounded-2xl border border-phmly-border text-metadata">
              <span className="text-phmly-muted font-normal">
                Allowance: <strong className="text-phmly-text font-medium">{createdCount} of {LIMITS.MAX_ROOMS_CREATED} created</strong>
              </span>
              <span className="text-caption text-goldenRush font-medium bg-goldenRush/10 px-2 py-0.5 rounded-full">
                Private · Invite only
              </span>
            </div>

            {isLimitReached && (
              <div className="flex items-start gap-2.5 bg-rose-500/10 border border-rose-500/20 p-3.5 rounded-2xl text-secondary text-rose-500">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Room creation limit reached</p>
                  <p className="mt-0.5 opacity-90 text-metadata">
                    You have created {LIMITS.MAX_ROOMS_CREATED} of {LIMITS.MAX_ROOMS_CREATED} rooms. You can still join rooms created by friends!
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-2xl text-metadata text-rose-500">
                {error}
              </div>
            )}

            {/* Room Name */}
            <div>
              <label className="block text-metadata font-medium text-phmly-muted mb-1.5">
                Room Name <span className="text-goldenRush">*</span>
              </label>
              <input
                type="text"
                required
                disabled={isLimitReached || loading}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Design Sync, Saturday Hackers, Daily Grind"
                className="w-full bg-phmly-subtle text-phmly-text text-secondary px-3.5 py-2.5 rounded-xl border border-phmly-border focus:outline-none focus:border-goldenRush transition-colors disabled:opacity-50"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-metadata font-medium text-phmly-muted mb-1.5">
                Description (Optional)
              </label>
              <input
                type="text"
                disabled={isLimitReached || loading}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this space for?"
                className="w-full bg-phmly-subtle text-phmly-text text-secondary px-3.5 py-2.5 rounded-xl border border-phmly-border focus:outline-none focus:border-goldenRush transition-colors disabled:opacity-50"
              />
            </div>

            {/* Room Type Selection */}
            <div>
              <label className="block text-metadata font-medium text-phmly-muted mb-2">
                Select Room Type <span className="text-goldenRush">*</span>
              </label>
              <div className="space-y-2">
                {roomTypesList.map((type) => {
                  const meta = ROOM_TYPE_META[type];
                  const isSelected = selectedType === type;

                  return (
                    <button
                      type="button"
                      key={type}
                      disabled={isLimitReached || loading}
                      onClick={() => handleTypeSelect(type)}
                      className={`w-full text-left p-3 rounded-2xl border transition-all flex items-start gap-3 ${
                        isSelected
                          ? 'bg-goldenRush/10 border-goldenRush text-phmly-text shadow-xs'
                          : 'bg-phmly-subtle/50 border-phmly-border text-phmly-muted hover:text-phmly-text hover:bg-phmly-subtle'
                      }`}
                    >
                      <div
                        className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                          isSelected ? 'bg-goldenRush text-forestBlack' : 'bg-phmly-surface text-goldenRush border border-phmly-border'
                        }`}
                      >
                        {type === 'conversation' && <MessageSquare className="w-4 h-4" />}
                        {type === 'buddies' && <Users className="w-4 h-4" />}
                        {type === 'project_vault' && <FolderArchive className="w-4 h-4" />}
                        {type === 'goal_tracker' && <Target className="w-4 h-4" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm text-phmly-text">{meta.title}</span>
                          {isSelected && (
                            <span className="text-[10px] font-bold text-goldenRush bg-goldenRush/15 px-2 py-0.5 rounded-full">
                              Selected
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-phmly-muted mt-0.5 leading-snug">
                          {meta.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Room Photo Picker */}
            <div>
              <label className="block text-xs font-semibold text-phmly-muted mb-1.5">
                Room Photo
              </label>
              <div className="flex items-center gap-2 mb-2">
                {PRESET_PHOTOS[selectedType].map((photoUrl, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => {
                      setSelectedPhoto(photoUrl);
                      setCustomPhotoUrl('');
                    }}
                    className={`w-14 h-14 rounded-2xl overflow-hidden border-2 transition-all shrink-0 ${
                      selectedPhoto === photoUrl && !customPhotoUrl
                        ? 'border-goldenRush scale-105 shadow-xs'
                        : 'border-phmly-border opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={photoUrl} alt="Preset" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>

              <input
                type="url"
                value={customPhotoUrl}
                onChange={(e) => setCustomPhotoUrl(e.target.value)}
                placeholder="Or paste an image URL (optional)"
                className="w-full bg-phmly-subtle text-phmly-text text-xs px-3 py-2 rounded-xl border border-phmly-border focus:outline-none focus:border-goldenRush"
              />
            </div>

            {/* Submit */}
            <div className="pt-2 border-t border-phmly-border flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs text-phmly-muted hover:text-phmly-text font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLimitReached || !name.trim() || loading}
                className="px-5 py-2.5 rounded-xl bg-goldenRush text-forestBlack font-semibold text-xs hover:bg-amberGlow transition-transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
              >
                {loading ? 'Creating...' : 'Create Room'}
              </button>
            </div>
          </form>
        ) : (
          /* Tab 2: Join with Code */
          <form onSubmit={handleJoinByCode} className="p-5 space-y-4">
            <div className="bg-phmly-subtle/60 p-4 rounded-2xl border border-phmly-border space-y-1">
              <p className="text-xs font-semibold text-phmly-text">Have an invite code?</p>
              <p className="text-[11px] text-phmly-muted leading-relaxed">
                Enter the private 6-character room invite code shared by the room owner to join immediately.
              </p>
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-2xl text-xs text-rose-500">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-phmly-muted mb-1.5">
                Invite Code
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-phmly-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={inviteCodeInput}
                  onChange={(e) => setInviteCodeInput(e.target.value)}
                  placeholder="e.g. a1b2c3"
                  className="w-full bg-phmly-subtle text-phmly-text text-sm pl-10 pr-3.5 py-2.5 rounded-xl border border-phmly-border focus:outline-none focus:border-goldenRush font-mono uppercase tracking-wider"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-phmly-border flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs text-phmly-muted hover:text-phmly-text font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!inviteCodeInput.trim() || loading}
                className="px-5 py-2.5 rounded-xl bg-goldenRush text-forestBlack font-semibold text-xs hover:bg-amberGlow transition-transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
              >
                {loading ? 'Joining...' : 'Join Room'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
