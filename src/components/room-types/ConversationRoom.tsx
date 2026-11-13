import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Camera,
  Mic,
  Smile,
  X,
  CornerUpLeft,
  Play,
  Pause,
  Paperclip,
  Image as ImageIcon,
  Sparkles,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Room, Message, User, MediaItem } from '../../types';
import { StorageService } from '../../services/storage';
import { Avatar } from '../common/Avatar';
import { MediaViewerModal } from '../common/MediaViewerModal';
import {
  getRoomMessages,
  sendMessage,
  uploadChatAttachment,
  toggleMessageReaction,
  subscribeToRoomMessages,
} from '../../services/message';
import { getRoomMembers } from '../../services/room';
import { isSupabaseConfigured } from '../../lib/supabase';

interface ConversationRoomProps {
  room: Room;
  currentUser: User;
  onOpenRoomCamera: () => void;
}

const QUICK_REACTIONS = ['🔥', '👍', '❤️', '😂', '🚀', '💯'];

const STICKER_CATEGORIES = [
  {
    name: 'Hype & Wins',
    icon: '🔥',
    stickers: ['🔥', '🚀', '💯', '⚡', '🏆', '🎉', '💪', '⭐', '👑', '💥', '🎯', '✨'],
  },
  {
    name: 'Love & Vibes',
    icon: '❤️',
    stickers: ['❤️', '🥰', '💖', '🙌', '😍', '🫶', '🤝', '🌸', '🤗', '🌟', '🫂', '🕊️'],
  },
  {
    name: 'Fun & Mood',
    icon: '😂',
    stickers: ['😂', '😎', '🫡', '👀', '🤙', '🥳', '🍿', '☕', '😜', '🍻', '🫠', '🕺'],
  },
  {
    name: 'Grind & Focus',
    icon: '💻',
    stickers: ['💻', '📚', '🧠', '📈', '✅', '⏳', '📌', '🛠️', '📝', '💡', '🎓', '🔋'],
  },
  {
    name: 'PHMLY Badges',
    icon: '⭐',
    stickers: [
      '✨ PHMLY VIBES',
      '🔥 LETS COOK',
      '🚀 TO THE MOON',
      '💯 LOCKED IN',
      '💪 WE GOT THIS',
      '🏆 WINNER',
    ],
  },
];

function isStickerMessage(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (
    trimmed.startsWith('✨ PHMLY') ||
    trimmed.startsWith('🔥 LETS') ||
    trimmed.startsWith('🚀 TO') ||
    trimmed.startsWith('💯 LOCKED') ||
    trimmed.startsWith('💪 WE') ||
    trimmed.startsWith('🏆 WINNER') ||
    trimmed.startsWith('PHMLY:')
  ) {
    return true;
  }
  const emojiRegex = /^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\s)+$/u;
  return trimmed.length <= 8 && emojiRegex.test(trimmed);
}

export const ConversationRoom: React.FC<ConversationRoomProps> = ({
  room,
  currentUser,
  onOpenRoomCamera,
}) => {
  const [messages, setMessages] = useState<Message[]>(() =>
    StorageService.getMessages(room.id)
  );
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  // Image Attachment & Camera states
  const [attachedImageFile, setAttachedImageFile] = useState<File | null>(null);
  const [attachedImagePreview, setAttachedImagePreview] = useState<string | null>(null);
  const [imageCaption, setImageCaption] = useState('');
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [viewerMedia, setViewerMedia] = useState<MediaItem | null>(null);

  // Sticker Picker
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [activeStickerTab, setActiveStickerTab] = useState(0);

  // Voice Note states
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceSeconds, setVoiceSeconds] = useState(0);
  const [activeAudioPlaying, setActiveAudioPlaying] = useState<string | null>(null);

  // Emoji Reactions
  const [showEmojiPickerFor, setShowEmojiPickerFor] = useState<string | null>(null);

  // Status & Members
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [roomMembersMap, setRoomMembersMap] = useState<Record<string, User>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<any>(null);

  // Fetch real room members to resolve names/avatars
  useEffect(() => {
    let isMounted = true;
    if (isSupabaseConfigured) {
      getRoomMembers(room.id)
        .then((members) => {
          if (isMounted && members && members.length > 0) {
            const map: Record<string, User> = {};
            members.forEach((m) => {
              map[m.id] = m;
            });
            setRoomMembersMap(map);
          }
        })
        .catch(console.warn);
    }
    return () => {
      isMounted = false;
    };
  }, [room.id]);

  const loadMessages = useCallback(async () => {
    if (isSupabaseConfigured) {
      try {
        const sbMessages = await getRoomMessages(room.id);
        setMessages(sbMessages);
        return;
      } catch (err) {
        console.warn('Failed to load Supabase messages, falling back to local storage:', err);
      }
    }
    const list = StorageService.getMessages(room.id);
    setMessages(list);
  }, [room.id]);

  useEffect(() => {
    loadMessages();

    if (isSupabaseConfigured) {
      const sub = subscribeToRoomMessages(
        room.id,
        (newMsg) => {
          setMessages((prev) => {
            // Prevent duplicate message rendering if message already exists
            if (prev.some((m) => m.id === newMsg.id)) return prev;

            // Reconcile if this matches an optimistic pending message from current user
            const optIdx = prev.findIndex(
              (m) =>
                m.id.startsWith('temp-') &&
                m.senderId === newMsg.senderId &&
                m.text === newMsg.text
            );
            if (optIdx !== -1) {
              const updated = [...prev];
              updated[optIdx] = newMsg;
              return updated;
            }

            return [...prev, newMsg];
          });
        },
        () => {
          // Re-fetch reactions on reaction change
          loadMessages();
        }
      );
      return () => {
        sub.unsubscribe();
      };
    }
  }, [room.id, loadMessages]);

  const messagesCount = messages.length;
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesCount]);

  // Voice recording timer
  useEffect(() => {
    if (isRecordingVoice) {
      setVoiceSeconds(0);
      timerRef.current = setInterval(() => {
        setVoiceSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecordingVoice]);

  // Validate and stage an image for sending
  const handleSelectImageFile = (file?: File) => {
    setShowImageOptions(false);
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (JPEG, PNG, WEBP, GIF).');
      return;
    }

    // Max 15MB size check
    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage('Image size exceeds 15MB limit. Please choose a smaller photo.');
      return;
    }

    setErrorMessage(null);
    setAttachedImageFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      setAttachedImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCancelAttachedImage = () => {
    setAttachedImageFile(null);
    setAttachedImagePreview(null);
    setImageCaption('');
    setErrorMessage(null);
    if (galleryInputRef.current) galleryInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  // Send regular text or staged image message with optimistic dispatch
  const handleSendMessage = async () => {
    if (!inputText.trim() && !attachedImagePreview) return;
    if (isSending) return;

    setErrorMessage(null);

    const captionText = imageCaption.trim() || inputText.trim();
    const content = attachedImagePreview
      ? captionText || 'Shared an image'
      : inputText.trim();

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const previewAttachment = attachedImagePreview || undefined;
    const stagedFile = attachedImageFile;

    // 1. Optimistic message created and displayed in UI immediately (< 1ms)
    const optimisticMsg: Message = {
      id: tempId,
      roomId: room.id,
      senderId: currentUser.id,
      text: content,
      attachmentUrl: previewAttachment,
      attachmentType: previewAttachment ? 'image' : undefined,
      replyToId: replyingTo?.id,
      replyToText: replyingTo ? `${replyingTo.text.slice(0, 40)}...` : undefined,
      reactions: [],
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    // 2. Clear inputs immediately for instant responsive feedback
    setInputText('');
    setImageCaption('');
    setReplyingTo(null);
    setAttachedImageFile(null);
    setAttachedImagePreview(null);
    if (galleryInputRef.current) galleryInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    setShowStickerPicker(false);

    // Save to local storage cache immediately
    StorageService.addMessage(optimisticMsg);

    setIsSending(true);

    try {
      if (isSupabaseConfigured) {
        let uploadedPathOrUrl = previewAttachment;
        if (stagedFile) {
          try {
            uploadedPathOrUrl = await uploadChatAttachment(
              room.id,
              currentUser.id,
              stagedFile
            );
          } catch (uploadErr: any) {
            console.error('Image upload failed:', uploadErr);
            setErrorMessage('Failed to upload image. Please check your connection.');
            setMessages((prev) => prev.filter((m) => m.id !== tempId));
            setIsSending(false);
            return;
          }
        }

        const realMsg = await sendMessage({
          roomId: room.id,
          senderId: currentUser.id,
          text: content,
          attachmentUrl: uploadedPathOrUrl,
          attachmentType: uploadedPathOrUrl ? 'image' : undefined,
          replyToId: optimisticMsg.replyToId,
        });

        if (realMsg) {
          // Reconcile optimistic message with real message from database
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempId
                ? {
                    ...realMsg,
                    attachmentUrl: previewAttachment || realMsg.attachmentUrl,
                  }
                : m
            )
          );
        }
      }
    } catch (err: any) {
      console.warn('Supabase message send failed, keeping local mirror:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Send sticker directly into chat with optimistic dispatch
  const handleSendSticker = async (sticker: string) => {
    setShowStickerPicker(false);

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const optimisticSticker: Message = {
      id: tempId,
      roomId: room.id,
      senderId: currentUser.id,
      text: sticker,
      attachmentType: undefined,
      reactions: [],
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticSticker]);
    StorageService.addMessage(optimisticSticker);

    try {
      if (isSupabaseConfigured) {
        const realMsg = await sendMessage({
          roomId: room.id,
          senderId: currentUser.id,
          text: sticker,
          attachmentType: undefined,
        });
        if (realMsg) {
          setMessages((prev) =>
            prev.map((m) => (m.id === tempId ? realMsg : m))
          );
        }
      }
    } catch (err) {
      console.warn('Supabase sticker send failed:', err);
    }
  };

  const handleFinishVoiceNote = async () => {
    setIsRecordingVoice(false);
    const duration = `${Math.floor(voiceSeconds / 60)}:${String(voiceSeconds % 60).padStart(2, '0')}`;
    const voiceDuration = duration === '0:00' ? '0:03' : duration;

    try {
      if (isSupabaseConfigured) {
        await sendMessage({
          roomId: room.id,
          senderId: currentUser.id,
          text: 'Voice note',
          isVoiceNote: true,
          voiceDuration,
        });
      }
    } catch (err) {
      console.warn('Supabase voice note send failed:', err);
    }

    StorageService.addMessage({
      roomId: room.id,
      senderId: currentUser.id,
      text: 'Voice note',
      isVoiceNote: true,
      voiceDuration,
    });

    setVoiceSeconds(0);
    await loadMessages();
  };

  const handleCancelVoiceNote = () => {
    setIsRecordingVoice(false);
    setVoiceSeconds(0);
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    setShowEmojiPickerFor(null);
    try {
      if (isSupabaseConfigured) {
        await toggleMessageReaction(messageId, emoji, currentUser.id);
      }
    } catch (err) {
      console.warn('Supabase reaction error:', err);
    }
    StorageService.toggleMessageReaction(messageId, emoji, currentUser.id);
    await loadMessages();
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-phmly-bg transition-colors relative">
      {/* Hidden file inputs for Camera Capture vs Device Gallery */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleSelectImageFile(e.target.files?.[0])}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleSelectImageFile(e.target.files?.[0])}
      />

      {/* Messages stream */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-phmly-muted">
            <div className="w-12 h-12 rounded-2xl bg-phmly-subtle flex items-center justify-center text-goldenRush mb-3 border border-phmly-border">
              <Smile className="w-6 h-6" />
            </div>
            <p className="text-base font-semibold text-phmly-text">No messages yet</p>
            <p className="text-xs max-w-xs mt-1 text-phmly-muted">
              Say hello to your people, share a photo, or drop a sticker!
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMine = msg.senderId === currentUser.id;
            const sender =
              roomMembersMap[msg.senderId] || StorageService.getUserById(msg.senderId);
            const msgDate = new Date(msg.createdAt);
            const timeStr = msgDate.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });
            const isSticker = isStickerMessage(msg.text);

            // Compute Date Separator (WhatsApp-inspired: 12px medium)
            const prevMsg = idx > 0 ? messages[idx - 1] : null;
            const isNewDay =
              !prevMsg ||
              new Date(prevMsg.createdAt).toDateString() !== msgDate.toDateString();

            const getDateLabel = () => {
              const today = new Date();
              const yesterday = new Date();
              yesterday.setDate(today.getDate() - 1);

              if (msgDate.toDateString() === today.toDateString()) return 'Today';
              if (msgDate.toDateString() === yesterday.toDateString()) return 'Yesterday';
              return msgDate.toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
                year: msgDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
              });
            };

            return (
              <React.Fragment key={msg.id}>
                {/* Date Separator (12px, medium weight) */}
                {isNewDay && (
                  <div className="flex justify-center my-2 select-none">
                    <span className="text-metadata font-medium text-phmly-muted bg-phmly-subtle/90 px-3 py-1 rounded-full border border-phmly-border/70 shadow-2xs backdrop-blur-xs">
                      {getDateLabel()}
                    </span>
                  </div>
                )}

                <div
                  className={`flex gap-2 items-end ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  {!isMine && (
                    <Avatar
                      src={sender?.avatar}
                      name={sender?.name || 'Member'}
                      size="sm"
                      className="mb-1 shrink-0"
                    />
                  )}

                  <div
                    className={`max-w-[85%] sm:max-w-[70%] flex flex-col ${
                      isMine ? 'items-end' : 'items-start'
                    }`}
                  >
                    {/* Sender name for friends (12px, medium) */}
                    {!isMine && (
                      <span className="text-metadata font-medium text-goldenRush ml-1 mb-0.5 truncate max-w-[160px]">
                        {sender?.name.split(' ')[0] || 'Member'}
                      </span>
                    )}

                    {/* Quoted Message Preview */}
                    {msg.replyToText && (
                      <div className="mb-1 text-caption px-2.5 py-1 rounded-lg bg-phmly-subtle border-l-2 border-goldenRush text-phmly-muted line-clamp-1">
                        <span className="font-medium text-phmly-text">Replied to: </span>
                        {msg.replyToText}
                      </div>
                    )}

                  {/* STICKER RENDERING: Prominent, fun display without normal plain text bubble */}
                  {isSticker && !msg.attachmentUrl && !msg.isVoiceNote ? (
                    <div className="relative group my-1">
                      {msg.text.startsWith('✨ PHMLY') ||
                      msg.text.startsWith('🔥 LETS') ||
                      msg.text.startsWith('🚀 TO') ||
                      msg.text.startsWith('💯 LOCKED') ||
                      msg.text.startsWith('💪 WE') ||
                      msg.text.startsWith('🏆 WINNER') ||
                      msg.text.startsWith('PHMLY:') ? (
                        <div className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-goldenRush/25 to-amberGlow/35 border-2 border-goldenRush text-goldenRush font-bold text-secondary tracking-wide shadow-md transform active:scale-95 transition-transform">
                          <Sparkles className="w-4 h-4 shrink-0 text-goldenRush" />
                          <span>{msg.text}</span>
                        </div>
                      ) : (
                        <div className="text-5xl sm:text-6xl drop-shadow-md select-none transform hover:scale-110 active:scale-95 transition-transform p-1">
                          {msg.text}
                        </div>
                      )}

                      <span
                        className={`text-caption mt-0.5 block ${
                          isMine ? 'text-right text-phmly-muted' : 'text-left text-phmly-muted'
                        }`}
                      >
                        {timeStr}
                      </span>

                      {/* Quick Hover Actions for Stickers */}
                      <div
                        className={`absolute -top-3 ${
                          isMine ? 'left-2' : 'right-2'
                        } hidden group-hover:flex items-center gap-1 bg-phmly-surface border border-phmly-border rounded-full px-1.5 py-0.5 shadow-md z-10`}
                      >
                        <button
                          onClick={() => setReplyingTo(msg)}
                          className="text-phmly-muted hover:text-goldenRush p-0.5"
                          title="Reply"
                        >
                          <CornerUpLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            setShowEmojiPickerFor(
                              showEmojiPickerFor === msg.id ? null : msg.id
                            )
                          }
                          className="text-phmly-muted hover:text-goldenRush p-0.5"
                          title="React"
                        >
                          <Smile className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* REGULAR MESSAGE BUBBLE */
                    <div
                      className={`relative group rounded-2xl px-3.5 py-2 shadow-xs transition-colors ${
                        isMine
                          ? 'bg-goldenRush text-forestBlack rounded-br-xs font-normal'
                          : 'bg-phmly-surface text-phmly-text rounded-bl-xs border border-phmly-border'
                      }`}
                    >
                      {/* Attachment Preview with Full Screen Modal viewer on click */}
                      {msg.attachmentUrl && (
                        <div
                          onClick={() => {
                            setViewerMedia({
                              id: msg.id,
                              roomId: room.id,
                              senderId: msg.senderId,
                              mediaType: 'image',
                              localUri: msg.attachmentUrl!,
                              caption:
                                msg.text !== 'Shared an image' ? msg.text : undefined,
                              createdAt: msg.createdAt,
                            });
                          }}
                          className="mb-2 rounded-xl overflow-hidden max-h-64 border border-black/10 cursor-pointer group/img relative"
                          title="Click to view full image"
                        >
                          <img
                            src={msg.attachmentUrl}
                            alt="Attachment"
                            className="w-full h-auto object-cover transition-transform duration-200 group-hover/img:scale-102"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/15 transition-colors flex items-center justify-center">
                            <span className="opacity-0 group-hover/img:opacity-100 bg-forestBlack/70 text-white text-[10px] font-semibold px-2 py-1 rounded-lg backdrop-blur-xs transition-opacity">
                              View Full Image
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Voice Note Pill */}
                      {msg.isVoiceNote ? (
                        <div className="flex items-center gap-3 py-1">
                          <button
                            onClick={() => {
                              setActiveAudioPlaying(
                                activeAudioPlaying === msg.id ? null : msg.id
                              );
                            }}
                            className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                              isMine
                                ? 'bg-forestBlack text-goldenRush'
                                : 'bg-goldenRush text-forestBlack'
                            }`}
                          >
                            {activeAudioPlaying === msg.id ? (
                              <Pause className="w-3.5 h-3.5 fill-current" />
                            ) : (
                              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                            )}
                          </button>
                          <div className="flex-1 min-w-[120px]">
                            <div className="flex items-center gap-1 h-3">
                              {[40, 75, 30, 90, 60, 45, 80, 50, 65, 35].map((h, i) => (
                                <div
                                  key={i}
                                  className={`w-1 rounded-full transition-all ${
                                    activeAudioPlaying === msg.id && i % 2 === 0
                                      ? 'bg-amberGlow animate-pulse'
                                      : isMine
                                      ? 'bg-forestBlack/60'
                                      : 'bg-phmly-muted/60'
                                  }`}
                                  style={{ height: `${h}%` }}
                                />
                              ))}
                            </div>
                            <span
                              className={`text-caption ${
                                isMine ? 'text-forestBlack/75' : 'text-phmly-muted'
                              }`}
                            >
                              Voice note · {msg.voiceDuration || '0:05'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        msg.text !== 'Shared an image' && (
                          <p className="text-body leading-[1.45] font-normal whitespace-pre-wrap break-words">
                            {msg.text}
                          </p>
                        )
                      )}

                      {/* Timestamp (11px) */}
                      <div
                        className={`text-caption mt-0.5 flex items-center justify-end gap-1 ${
                          isMine ? 'text-forestBlack/70' : 'text-phmly-muted'
                        }`}
                      >
                        <span>{timeStr}</span>
                      </div>

                      {/* Hover Quick Action Buttons */}
                      <div
                        className={`absolute -top-3 ${
                          isMine ? 'left-2' : 'right-2'
                        } hidden group-hover:flex items-center gap-1 bg-phmly-surface border border-phmly-border rounded-full px-1.5 py-0.5 shadow-md z-10`}
                      >
                        <button
                          onClick={() => setReplyingTo(msg)}
                          className="text-phmly-muted hover:text-goldenRush p-0.5"
                          title="Reply"
                        >
                          <CornerUpLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            setShowEmojiPickerFor(
                              showEmojiPickerFor === msg.id ? null : msg.id
                            )
                          }
                          className="text-phmly-muted hover:text-goldenRush p-0.5"
                          title="React"
                        >
                          <Smile className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Emoji Quick Picker popup */}
                      {showEmojiPickerFor === msg.id && (
                        <div className="absolute -top-10 left-0 bg-phmly-surface border border-goldenRush/40 rounded-full px-2 py-1 shadow-lg flex items-center gap-1.5 z-20 animate-scaleIn">
                          {QUICK_REACTIONS.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => handleReaction(msg.id, emoji)}
                              className="hover:scale-125 transition-transform text-xs p-1"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Reaction Badges */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {msg.reactions.map((r, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleReaction(msg.id, r.emoji)}
                          className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border ${
                            r.userIds.includes(currentUser.id)
                              ? 'bg-goldenRush/15 border-goldenRush text-goldenRush'
                              : 'bg-phmly-surface border-phmly-border text-phmly-text'
                          }`}
                        >
                          <span>{r.emoji}</span>
                          <span className="font-semibold">{r.userIds.length}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply banner */}
      {replyingTo && (
        <div className="px-3.5 py-2 bg-phmly-subtle border-t border-phmly-border flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2 text-xs text-phmly-text truncate min-w-0 flex-1">
            <CornerUpLeft className="w-3.5 h-3.5 text-goldenRush shrink-0" />
            <span className="truncate">
              Replying to: <span className="text-phmly-muted">{replyingTo.text}</span>
            </span>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 text-phmly-muted hover:text-phmly-text shrink-0"
            aria-label="Cancel reply"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error message banner */}
      {errorMessage && (
        <div className="px-4 py-2 bg-rose-500/10 border-t border-rose-500/20 text-rose-500 text-xs flex items-center justify-between">
          <div className="flex items-center gap-1.5 truncate">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="p-1 text-rose-500 hover:text-rose-700"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Staged Image Preview Drawer */}
      {attachedImagePreview && (
        <div className="px-4 py-3 bg-phmly-surface border-t border-phmly-border animate-fadeIn space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-phmly-text flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-goldenRush" />
              <span>Image Preview</span>
              {attachedImageFile && (
                <span className="text-[10px] text-phmly-muted">
                  ({(attachedImageFile.size / (1024 * 1024)).toFixed(1)} MB)
                </span>
              )}
            </span>
            <button
              onClick={handleCancelAttachedImage}
              className="text-xs text-phmly-muted hover:text-phmly-text flex items-center gap-1 p-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
          </div>

          <div className="flex gap-3 items-center">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-goldenRush/60 shrink-0 bg-forestBlack">
              <img
                src={attachedImagePreview}
                alt="Selected preview"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={imageCaption}
                onChange={(e) => setImageCaption(e.target.value)}
                placeholder="Add a caption to your photo..."
                className="w-full bg-phmly-subtle text-phmly-text text-xs sm:text-sm px-3 py-2 rounded-xl border border-phmly-border focus:outline-none focus:border-goldenRush"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Built-in Sticker Picker Panel */}
      {showStickerPicker && (
        <div className="bg-phmly-surface border-t border-phmly-border p-3 sm:p-4 shadow-xl animate-fadeIn space-y-2.5 z-20">
          <div className="flex items-center justify-between pb-1 border-b border-phmly-border/70">
            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar py-0.5">
              {STICKER_CATEGORIES.map((cat, idx) => (
                <button
                  key={cat.name}
                  onClick={() => setActiveStickerTab(idx)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1 ${
                    activeStickerTab === idx
                      ? 'bg-goldenRush text-forestBlack shadow-xs font-bold'
                      : 'bg-phmly-subtle text-phmly-muted hover:text-phmly-text'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowStickerPicker(false)}
              className="p-1 text-phmly-muted hover:text-phmly-text shrink-0 ml-2"
              aria-label="Close stickers"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Stickers Grid */}
          <div className="max-h-44 overflow-y-auto custom-scrollbar p-1">
            {activeStickerTab === 4 ? (
              /* PHMLY Badges Tab */
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {STICKER_CATEGORIES[4].stickers.map((badge) => (
                  <button
                    key={badge}
                    onClick={() => handleSendSticker(badge)}
                    className="p-2.5 rounded-xl bg-phmly-subtle border border-goldenRush/30 hover:border-goldenRush text-goldenRush font-black text-xs text-center transition-all hover:scale-102 active:scale-95 shadow-xs"
                  >
                    {badge}
                  </button>
                ))}
              </div>
            ) : (
              /* Emoji Stickers Tab */
              <div className="grid grid-cols-6 sm:grid-cols-8 gap-2.5">
                {STICKER_CATEGORIES[activeStickerTab].stickers.map((stk, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendSticker(stk)}
                    className="text-3xl sm:text-4xl p-2 rounded-2xl hover:bg-phmly-subtle transition-transform hover:scale-125 active:scale-95 flex items-center justify-center select-none"
                  >
                    {stk}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Composer Action Bar */}
      <div className="p-2 sm:p-3 bg-phmly-surface border-t border-phmly-border transition-colors shrink-0">
        {isRecordingVoice ? (
          <div className="flex items-center justify-between bg-phmly-subtle px-4 py-2.5 rounded-2xl border border-rose-500/40 animate-pulse">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span className="text-xs font-semibold text-rose-500">
                Recording voice... {Math.floor(voiceSeconds / 60)}:
                {String(voiceSeconds % 60).padStart(2, '0')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancelVoiceNote}
                className="px-2.5 py-1 text-xs text-phmly-muted hover:text-phmly-text min-h-[36px]"
              >
                Cancel
              </button>
              <button
                onClick={handleFinishVoiceNote}
                className="px-3.5 py-1.5 rounded-xl bg-goldenRush text-forestBlack text-xs font-semibold hover:bg-amberGlow min-h-[36px]"
              >
                Send Voice
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Camera Popover / Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowImageOptions((prev) => !prev)}
                className="p-2 min-w-[38px] min-h-[38px] rounded-xl text-phmly-muted hover:text-goldenRush hover:bg-phmly-subtle transition-colors flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-goldenRush"
                title="Camera and Photos"
                aria-label="Camera and Photos"
              >
                <Camera className="w-5 h-5" />
              </button>

              {/* Photo Options Dropup */}
              {showImageOptions && (
                <div className="absolute bottom-full left-0 mb-2 w-48 bg-phmly-surface border border-phmly-border rounded-2xl shadow-xl p-1.5 z-30 animate-scaleIn origin-bottom-left">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-phmly-text hover:bg-phmly-subtle hover:text-goldenRush transition-colors text-left"
                  >
                    <Camera className="w-4 h-4 text-goldenRush" />
                    <span>Take Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-phmly-text hover:bg-phmly-subtle hover:text-goldenRush transition-colors text-left"
                  >
                    <ImageIcon className="w-4 h-4 text-emerald-500" />
                    <span>Choose from Gallery</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowImageOptions(false);
                      onOpenRoomCamera();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-phmly-text hover:bg-phmly-subtle hover:text-goldenRush transition-colors text-left border-t border-phmly-border/70 mt-1 pt-1.5"
                  >
                    <Sparkles className="w-4 h-4 text-amberGlow" />
                    <span>Central Camera Room</span>
                  </button>
                </div>
              )}
            </div>

            {/* Sticker Button */}
            <button
              type="button"
              onClick={() => {
                setShowStickerPicker((prev) => !prev);
                setShowImageOptions(false);
              }}
              className={`p-2 min-w-[38px] min-h-[38px] rounded-xl transition-colors flex items-center justify-center ${
                showStickerPicker
                  ? 'text-goldenRush bg-goldenRush/15'
                  : 'text-phmly-muted hover:text-goldenRush hover:bg-phmly-subtle'
              }`}
              title="Stickers"
              aria-label="Open Stickers"
            >
              <Smile className="w-5 h-5" />
            </button>

            {/* Message Input */}
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Message your people..."
              className="flex-1 min-w-0 bg-phmly-subtle text-phmly-text text-secondary px-3.5 py-2.5 rounded-xl border border-phmly-border focus:outline-none focus:border-goldenRush placeholder:text-phmly-muted/60 transition-colors"
            />

            {/* Send or Voice Note Action */}
            {inputText.trim() || attachedImagePreview ? (
              <button
                onClick={handleSendMessage}
                disabled={isSending}
                className="p-2.5 min-w-[40px] min-h-[40px] rounded-xl bg-goldenRush text-forestBlack hover:bg-amberGlow transition-transform active:scale-95 shadow-xs flex items-center justify-center disabled:opacity-50"
                title="Send"
                aria-label="Send Message"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 stroke-[2.5]" />
                )}
              </button>
            ) : (
              <button
                onClick={() => setIsRecordingVoice(true)}
                className="p-2 min-w-[38px] min-h-[38px] rounded-xl text-phmly-muted hover:text-goldenRush hover:bg-phmly-subtle transition-colors flex items-center justify-center"
                title="Record voice note"
                aria-label="Record voice note"
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Media Viewer Modal for tap-to-expand image preview */}
      {viewerMedia && (
        <MediaViewerModal
          media={viewerMedia}
          onClose={() => setViewerMedia(null)}
        />
      )}
    </div>
  );
};
