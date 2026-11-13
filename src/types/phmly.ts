export type RoomType = 'conversation' | 'buddies' | 'project_vault' | 'goal_tracker';

export interface User {
  id: string;
  name: string;
  avatar: string;
  bio?: string;
  createdAt: string;
  email?: string;
}

export interface Room {
  id: string;
  name: string;
  description: string;
  type: RoomType;
  photo: string;
  ownerId: string;
  memberIds: string[];
  createdAt: string;
  inviteCode?: string;
  unreadCount?: number;
  latestActivity?: string;
}

export interface MessageReaction {
  emoji: string;
  userIds: string[];
}

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  text: string;
  attachmentUrl?: string;
  attachmentType?: 'image' | 'video' | 'audio' | 'file';
  createdAt: string;
  replyToId?: string;
  replyToText?: string;
  reactions?: MessageReaction[];
  isVoiceNote?: boolean;
  voiceDuration?: string;
}

export interface MediaItem {
  id: string;
  roomId: string;
  senderId: string;
  mediaType: 'image' | 'video';
  localUri: string;
  caption?: string;
  createdAt: string;
}

export interface ResourceItem {
  id: string;
  roomId: string;
  name: string;
  resourceType: 'document' | 'image' | 'video' | 'link';
  localUri: string;
  uploaderId: string;
  fileSize?: string;
  createdAt: string;
}

export interface GoalItem {
  id: string;
  roomId: string;
  ownerId: string;
  text: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
  completedAt?: string;
}

export interface BuddiesUpdate {
  id: string;
  roomId: string;
  authorId: string;
  content: string;
  attachmentUrl?: string;
  attachmentType?: 'image' | 'video' | 'audio';
  voiceDuration?: string;
  createdAt: string;
  reactions?: MessageReaction[];
  replies?: BuddiesReply[];
}

export interface BuddiesReply {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
}

