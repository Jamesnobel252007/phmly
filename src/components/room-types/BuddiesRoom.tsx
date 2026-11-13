import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, MessageCircle, Mic, Send, Image as ImageIcon, Heart, Play, Pause, X } from 'lucide-react';
import { Room, BuddiesUpdate, User } from '../../types';
import { StorageService } from '../../services/storage';
import { Avatar } from '../common/Avatar';
import {
  getBuddiesUpdates,
  postBuddiesUpdate,
  addBuddiesReply,
  toggleBuddiesReaction,
  subscribeToBuddiesUpdates,
} from '../../services/buddies';
import { isSupabaseConfigured } from '../../lib/supabase';

interface BuddiesRoomProps {
  room: Room;
  currentUser: User;
  onOpenRoomCamera: () => void;
}

const QUICK_PROMPTS = [
  'Finished 2 array problems today 💻',
  'Finally understood React hooks! 🎉',
  'Spent 40 mins learning TypeScript 📘',
  'Built my first working component 🚀',
  'Still struggling with recursion, but trying again tomorrow 💪',
];

const BUDDIES_EMOJIS = ['🔥', '💪', '🎉', '❤️', '👏', '🧠'];

export const BuddiesRoom: React.FC<BuddiesRoomProps> = ({
  room,
  currentUser,
}) => {
  const [updates, setUpdates] = useState<BuddiesUpdate[]>(() =>
    StorageService.getBuddiesUpdates(room.id)
  );
  const [postText, setPostText] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceSeconds, setVoiceSeconds] = useState(0);
  const [activeVoicePlaying, setActiveVoicePlaying] = useState<string | null>(null);
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<any>(null);

  const loadUpdates = useCallback(async () => {
    if (isSupabaseConfigured) {
      try {
        const sbUpdates = await getBuddiesUpdates(room.id);
        setUpdates(sbUpdates);
        return;
      } catch (err) {
        console.warn('Failed to load Supabase buddies updates:', err);
      }
    }
    const list = StorageService.getBuddiesUpdates(room.id);
    setUpdates(list);
  }, [room.id]);

  useEffect(() => {
    loadUpdates();

    if (isSupabaseConfigured) {
      const sub = subscribeToBuddiesUpdates(room.id, () => {
        loadUpdates();
      });
      return () => {
        sub.unsubscribe();
      };
    }
  }, [room.id, loadUpdates]);

  useEffect(() => {
    if (isRecordingVoice) {
      setVoiceSeconds(0);
      timerRef.current = setInterval(() => {
        setVoiceSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecordingVoice]);

  const handlePostUpdate = async (withVoice = false) => {
    if (!postText.trim() && !attachedImage && !withVoice) return;

    const voiceDuration = withVoice
      ? `${Math.floor(voiceSeconds / 60)}:${String(voiceSeconds % 60).padStart(2, '0')}`
      : undefined;

    const content = postText.trim() || (withVoice ? 'Shared a voice learning reflection' : 'Shared learning progress');
    const actualVoiceDuration = withVoice ? (voiceDuration === '0:00' ? '0:05' : voiceDuration) : undefined;

    try {
      if (isSupabaseConfigured) {
        await postBuddiesUpdate({
          roomId: room.id,
          authorId: currentUser.id,
          content,
          attachmentUrl: attachedImage || undefined,
          attachmentType: attachedImage ? 'image' : withVoice ? 'audio' : undefined,
          voiceDuration: actualVoiceDuration,
        });
      }
    } catch (err) {
      console.warn('Supabase postBuddiesUpdate failed:', err);
    }

    StorageService.addBuddiesUpdate({
      roomId: room.id,
      authorId: currentUser.id,
      content,
      attachmentUrl: attachedImage || undefined,
      attachmentType: attachedImage ? 'image' : withVoice ? 'audio' : undefined,
      voiceDuration: actualVoiceDuration,
      reactions: [],
      replies: [],
    });

    setPostText('');
    setAttachedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsRecordingVoice(false);
    setVoiceSeconds(0);
    await loadUpdates();
  };

  const handleReaction = async (updateId: string, emoji: string) => {
    try {
      if (isSupabaseConfigured) {
        await toggleBuddiesReaction(updateId, emoji, currentUser.id);
      }
    } catch (err) {
      console.warn('Supabase toggleBuddiesReaction failed:', err);
    }
    StorageService.toggleBuddiesReaction(updateId, emoji, currentUser.id);
    await loadUpdates();
  };

  const handleAddReply = async (updateId: string) => {
    const text = replyTextMap[updateId];
    if (!text || !text.trim()) return;

    try {
      if (isSupabaseConfigured) {
        await addBuddiesReply(updateId, currentUser.id, text.trim());
      }
    } catch (err) {
      console.warn('Supabase addBuddiesReply failed:', err);
    }

    StorageService.addBuddiesReply(updateId, currentUser.id, text.trim());
    setReplyTextMap({ ...replyTextMap, [updateId]: '' });
    setExpandedReplies({ ...expandedReplies, [updateId]: true });
    await loadUpdates();
  };

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setAttachedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-3 sm:p-5 overflow-y-auto custom-scrollbar space-y-4 bg-phmly-bg transition-colors">
      {/* "Share your progress" Composer */}
      <div className="bg-phmly-surface border border-phmly-border rounded-2xl p-4 shadow-xs">
        <div className="flex items-center gap-2 mb-2.5">
          <Sparkles className="w-4 h-4 text-goldenRush" />
          <h2 className="text-xs font-bold text-phmly-muted uppercase tracking-wider">
            Share Your Learning Progress
          </h2>
        </div>

        {/* Quick prompt chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1.5 mb-2.5">
          {QUICK_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => setPostText(prompt)}
              className="shrink-0 text-[11px] px-2.5 py-1 rounded-full bg-phmly-subtle hover:bg-goldenRush/15 hover:text-goldenRush border border-phmly-border text-phmly-muted transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Text area (Input placeholder: 14px) */}
        <textarea
          value={postText}
          onChange={(e) => setPostText(e.target.value)}
          placeholder="What did you learn, build, or figure out today?"
          rows={2}
          className="w-full bg-phmly-subtle text-phmly-text text-secondary p-3 rounded-xl border border-phmly-border focus:outline-none focus:border-goldenRush placeholder:text-phmly-muted/60 resize-none transition-colors"
        />

        {/* Attached preview */}
        {attachedImage && (
          <div className="relative mt-2 inline-block w-16 h-16 rounded-xl overflow-hidden border border-goldenRush">
            <img src={attachedImage} alt="Attachment" className="w-full h-full object-cover" />
            <button
              onClick={() => {
                setAttachedImage(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="absolute top-0 right-0 bg-forestBlack/80 p-0.5 text-forestCream"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Voice recording state */}
        {isRecordingVoice && (
          <div className="mt-2.5 flex items-center justify-between bg-phmly-subtle p-3 rounded-xl border border-rose-500/40">
            <div className="flex items-center gap-2 text-rose-500 text-xs font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              Recording: {Math.floor(voiceSeconds / 60)}:
              {String(voiceSeconds % 60).padStart(2, '0')}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsRecordingVoice(false)}
                className="text-xs text-phmly-muted hover:text-phmly-text px-2 py-1"
              >
                Cancel
              </button>
              <button
                onClick={() => handlePostUpdate(true)}
                className="text-xs bg-goldenRush text-forestBlack font-semibold px-3 py-1 rounded-lg"
              >
                Post Voice
              </button>
            </div>
          </div>
        )}

        {/* Actions bar */}
        {!isRecordingVoice && (
          <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-phmly-border/70">
            <div className="flex items-center gap-1">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs text-phmly-muted hover:text-goldenRush hover:bg-phmly-subtle transition-colors"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Attach Photo</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImagePick}
              />

              <button
                onClick={() => setIsRecordingVoice(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs text-phmly-muted hover:text-goldenRush hover:bg-phmly-subtle transition-colors"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Record Voice</span>
              </button>
            </div>

            <button
              onClick={() => handlePostUpdate(false)}
              disabled={!postText.trim() && !attachedImage}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-goldenRush text-forestBlack font-semibold text-xs hover:bg-amberGlow disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs active:scale-95"
            >
              <Send className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Share</span>
            </button>
          </div>
        )}
      </div>

      {/* Activity Feed (Section title: 16px semibold) */}
      <div className="space-y-3">
        <h3 className="text-section font-semibold text-phmly-text px-1">
          Recent Learning Updates ({updates.length})
        </h3>

        {updates.length === 0 ? (
          <div className="bg-phmly-surface border border-phmly-border rounded-2xl p-6 text-center text-phmly-muted">
            <p className="text-secondary font-semibold text-phmly-text mb-0.5">No updates posted yet</p>
            <p className="text-metadata">Post what you studied, built or solved today!</p>
          </div>
        ) : (
          updates.map((update) => {
            const author = StorageService.getUserById(update.authorId);
            const timeStr = new Date(update.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });
            const isRepliesOpen = expandedReplies[update.id];

            return (
              <div
                key={update.id}
                className="bg-phmly-surface border border-phmly-border rounded-2xl p-4 shadow-xs space-y-2.5 transition-all"
              >
                {/* Header (Username: 14px semibold, timestamp: 11-12px) */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Avatar src={author?.avatar} name={author?.name || 'Buddy'} size="md" />
                    <div>
                      <p className="text-secondary font-semibold text-phmly-text">{author?.name}</p>
                      <p className="text-metadata text-phmly-muted font-normal">{timeStr}</p>
                    </div>
                  </div>
                  <span className="text-caption font-medium text-goldenRush bg-goldenRush/10 px-2 py-0.5 rounded-full">
                    Buddy Update
                  </span>
                </div>

                {/* Content (15px regular, 1.45 line-height) */}
                <p className="text-body leading-[1.45] font-normal text-phmly-text whitespace-pre-wrap">
                  {update.content}
                </p>

                {/* Image attachment */}
                {update.attachmentUrl && (
                  <div className="rounded-xl overflow-hidden max-h-64 border border-phmly-border bg-phmly-subtle">
                    <img
                      src={update.attachmentUrl}
                      alt="Progress visual"
                      className="w-full h-auto object-cover"
                    />
                  </div>
                )}

                {/* Voice note playback */}
                {update.voiceDuration && (
                  <div className="bg-phmly-subtle border border-phmly-border rounded-xl p-2.5 flex items-center gap-2.5">
                    <button
                      onClick={() =>
                        setActiveVoicePlaying(activeVoicePlaying === update.id ? null : update.id)
                      }
                      className="w-8 h-8 rounded-full bg-goldenRush text-forestBlack flex items-center justify-center hover:bg-amberGlow transition-colors"
                    >
                      {activeVoicePlaying === update.id ? (
                        <Pause className="w-3.5 h-3.5 fill-current" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      )}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center gap-1 h-3 mb-0.5">
                        {[30, 60, 40, 80, 50, 70, 90, 40, 60, 75, 45, 85].map((h, i) => (
                          <div
                            key={i}
                            className={`w-1 rounded-full transition-all ${
                              activeVoicePlaying === update.id && i % 2 === 0
                                ? 'bg-amberGlow animate-pulse'
                                : 'bg-phmly-muted/40'
                            }`}
                            style={{ height: `${h}%` }}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-phmly-muted">
                        Voice update · {update.voiceDuration}
                      </span>
                    </div>
                  </div>
                )}

                {/* Reactions & Reply toggle (Reaction labels: 12px) */}
                <div className="flex items-center justify-between pt-2 border-t border-phmly-border/60 text-metadata">
                  <div className="flex items-center gap-1 flex-wrap">
                    {BUDDIES_EMOJIS.map((emoji) => {
                      const count =
                        update.reactions?.find((r) => r.emoji === emoji)?.userIds.length || 0;
                      const hasReacted =
                        update.reactions
                          ?.find((r) => r.emoji === emoji)
                          ?.userIds.includes(currentUser.id) || false;

                      return (
                        <button
                          key={emoji}
                          onClick={() => handleReaction(update.id, emoji)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-metadata font-medium transition-all ${
                            hasReacted
                              ? 'bg-goldenRush/15 border-goldenRush text-goldenRush'
                              : 'bg-phmly-subtle/50 border-phmly-border text-phmly-muted hover:text-phmly-text'
                          }`}
                        >
                          <span>{emoji}</span>
                          {count > 0 && <span className="font-medium text-caption">{count}</span>}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() =>
                      setExpandedReplies({
                        ...expandedReplies,
                        [update.id]: !isRepliesOpen,
                      })
                    }
                    className="flex items-center gap-1 text-phmly-muted hover:text-goldenRush transition-colors py-1 px-1.5 text-metadata font-normal"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>{update.replies?.length || 0} discussion</span>
                  </button>
                </div>

                {/* Discussion Thread */}
                {isRepliesOpen && (
                  <div className="pt-2 border-t border-phmly-border/60 space-y-2">
                    {update.replies && update.replies.length > 0 && (
                      <div className="space-y-1.5 bg-phmly-subtle/40 p-2.5 rounded-xl border border-phmly-border">
                        {update.replies.map((reply) => {
                          const replyAuthor = StorageService.getUserById(reply.authorId);
                          return (
                            <div key={reply.id} className="flex gap-2 text-xs">
                              <Avatar
                                src={replyAuthor?.avatar}
                                name={replyAuthor?.name || 'Buddy'}
                                size="xs"
                              />
                              <div className="flex-1">
                                <span className="font-semibold text-goldenRush mr-1.5">
                                  {replyAuthor?.name}
                                </span>
                                <span className="text-phmly-text">{reply.content}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={replyTextMap[update.id] || ''}
                        onChange={(e) =>
                          setReplyTextMap({
                            ...replyTextMap,
                            [update.id]: e.target.value,
                          })
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddReply(update.id);
                        }}
                        placeholder="Encourage your buddy..."
                        className="flex-1 bg-phmly-subtle text-phmly-text text-xs px-3 py-1.5 rounded-xl border border-phmly-border focus:outline-none focus:border-goldenRush"
                      />
                      <button
                        onClick={() => handleAddReply(update.id)}
                        className="px-3 py-1.5 rounded-xl bg-goldenRush text-forestBlack hover:bg-amberGlow text-xs font-semibold shadow-xs"
                      >
                        Reply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
