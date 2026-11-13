import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Message, MessageReaction } from '../types/phmly';
import { uploadPrivateFile, getSignedFileUrl } from './storageBucket';

/**
 * Fetch message history for a room, resolving private storage media to signed URLs.
 */
export async function getRoomMessages(
  roomId: string,
  limit: number = 60
): Promise<Message[]> {
  if (!isSupabaseConfigured || !roomId) return [];

  // 1. Fetch latest messages (paginated for fast initial room display)
  const { data: messages, error } = await supabase
    .from('messages')
    .select('id, room_id, sender_id, content, media_url, message_type, reply_to_id, is_voice_note, voice_duration, created_at')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch messages:', error);
    return [];
  }

  // Restore chronological order (oldest to newest)
  const chronological = (messages || []).reverse();

  // 2. Fetch reactions for these messages
  const messageIds = chronological.map((m: { id: string }) => m.id);
  const reactionsMap: Record<string, MessageReaction[]> = {};

  if (messageIds.length > 0) {
    const { data: reactionRows } = await supabase
      .from('reactions')
      .select('target_id, reaction, user_id')
      .eq('target_type', 'message')
      .in('target_id', messageIds);

    (reactionRows || []).forEach((r: any) => {
      if (!reactionsMap[r.target_id]) reactionsMap[r.target_id] = [];
      const existing = reactionsMap[r.target_id].find((x) => x.emoji === r.reaction);
      if (existing) {
        if (!existing.userIds.includes(r.user_id)) existing.userIds.push(r.user_id);
      } else {
        reactionsMap[r.target_id].push({ emoji: r.reaction, userIds: [r.user_id] });
      }
    });
  }

  // 3. Resolve media_url paths to private signed URLs (leveraging in-memory cache)
  const resolvedMessages: Message[] = await Promise.all(
    chronological.map(async (m: any) => {
      let attachmentUrl = m.media_url || undefined;
      if (attachmentUrl) {
        attachmentUrl = await getSignedFileUrl('chat-attachments', attachmentUrl);
      }

      return {
        id: m.id,
        roomId: m.room_id,
        senderId: m.sender_id,
        text: m.content,
        attachmentUrl,
        attachmentType: m.message_type as any,
        replyToId: m.reply_to_id || undefined,
        isVoiceNote: Boolean(m.is_voice_note),
        voiceDuration: m.voice_duration || undefined,
        reactions: reactionsMap[m.id] || [],
        createdAt: m.created_at,
      };
    })
  );

  return resolvedMessages;
}

/**
 * Upload an attachment to private Storage bucket 'chat-attachments'.
 * Path format: room_id/user_id/file-name as specified in requirements.
 * Returns the Storage object path (stored in database), NOT a public URL.
 */
export async function uploadChatAttachment(
  roomId: string,
  userIdOrFile: string | File | Blob,
  fileMaybe?: File | Blob,
  fileName?: string
): Promise<string> {
  let userId = 'user';
  let file: File | Blob;

  if (typeof userIdOrFile === 'string') {
    userId = userIdOrFile;
    file = fileMaybe!;
  } else {
    file = userIdOrFile;
  }

  const ext = (file as File).name?.split('.').pop() || 'bin';
  const cleanName = fileName || `attach-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const storagePath = `${roomId}/${userId}/${cleanName}`;

  return await uploadPrivateFile('chat-attachments', storagePath, file);
}

/**
 * Send a message to the room.
 * Stores storage path in database column media_url.
 */
export async function sendMessage(data: {
  roomId: string;
  senderId: string;
  text: string;
  attachmentUrl?: string; // Can be storage path or external URL
  attachmentType?: 'image' | 'video' | 'audio' | 'file';
  replyToId?: string;
  isVoiceNote?: boolean;
  voiceDuration?: string;
}): Promise<Message | null> {
  if (!isSupabaseConfigured) return null;

  const { data: newMsg, error } = await supabase
    .from('messages')
    .insert({
      room_id: data.roomId,
      sender_id: data.senderId,
      content: data.text,
      media_url: data.attachmentUrl || null,
      message_type: data.attachmentType || 'text',
      reply_to_id: data.replyToId || null,
      is_voice_note: Boolean(data.isVoiceNote),
      voice_duration: data.voiceDuration || null,
    })
    .select()
    .single();

  if (error || !newMsg) {
    console.error('Failed to send message:', error);
    throw error;
  }

  // Resolve signed URL for the newly created message representation
  let signedAttachmentUrl = newMsg.media_url || undefined;
  if (signedAttachmentUrl) {
    signedAttachmentUrl = await getSignedFileUrl('chat-attachments', signedAttachmentUrl);
  }

  return {
    id: newMsg.id,
    roomId: newMsg.room_id,
    senderId: newMsg.sender_id,
    text: newMsg.content,
    attachmentUrl: signedAttachmentUrl,
    attachmentType: newMsg.message_type as any,
    replyToId: newMsg.reply_to_id || undefined,
    isVoiceNote: Boolean(newMsg.is_voice_note),
    voiceDuration: newMsg.voice_duration || undefined,
    reactions: [],
    createdAt: newMsg.created_at,
  };
}

/**
 * Toggle an emoji reaction on a message.
 */
export async function toggleMessageReaction(
  messageId: string,
  emoji: string,
  userId: string
): Promise<void> {
  if (!isSupabaseConfigured || !userId) return;

  const { data: existing } = await supabase
    .from('reactions')
    .select('id')
    .eq('target_type', 'message')
    .eq('target_id', messageId)
    .eq('user_id', userId)
    .eq('reaction', emoji)
    .maybeSingle();

  if (existing) {
    await supabase.from('reactions').delete().eq('id', existing.id);
  } else {
    await supabase.from('reactions').insert({
      target_type: 'message',
      target_id: messageId,
      user_id: userId,
      reaction: emoji,
    });
  }
}

/**
 * Subscribe to new messages and reactions through Supabase Realtime.
 * Automatically unsubscribes and cleans up channel when leaving room.
 */
export function subscribeToRoomMessages(
  roomId: string,
  onNewMessage: (msg: Message) => void,
  onReactionChange?: () => void
) {
  if (!isSupabaseConfigured || !roomId) {
    return { unsubscribe: () => {} };
  }

  const channel = supabase
    .channel(`messages:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `room_id=eq.${roomId}`,
      },
      async (payload) => {
        const raw = payload.new as any;
        let attachmentUrl = raw.media_url || undefined;
        if (attachmentUrl) {
          attachmentUrl = await getSignedFileUrl('chat-attachments', attachmentUrl);
        }

        const msg: Message = {
          id: raw.id,
          roomId: raw.room_id,
          senderId: raw.sender_id,
          text: raw.content,
          attachmentUrl,
          attachmentType: raw.message_type,
          replyToId: raw.reply_to_id || undefined,
          isVoiceNote: Boolean(raw.is_voice_note),
          voiceDuration: raw.voice_duration || undefined,
          reactions: [],
          createdAt: raw.created_at,
        };
        onNewMessage(msg);
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'reactions',
        filter: `target_type=eq.message`,
      },
      () => {
        onReactionChange?.();
      }
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}
