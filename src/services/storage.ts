import { User, Room, Message, MediaItem, ResourceItem, GoalItem, BuddiesUpdate, BuddiesReply } from '../types';
import { LIMITS } from '../constants/design';

const STORAGE_KEYS = {
  CURRENT_USER: 'phmly_current_user',
  USERS: 'phmly_users',
  ROOMS: 'phmly_rooms',
  MESSAGES: 'phmly_messages',
  MEDIA: 'phmly_media',
  RESOURCES: 'phmly_resources',
  GOALS: 'phmly_goals',
  BUDDIES_UPDATES: 'phmly_buddies_updates',
  INITIALIZED: 'phmly_initialized_v2',
};

export const getTodayDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Initial Seed Users
const SEED_USERS: User[] = [
  {
    id: 'user-priya',
    name: 'Priya S',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    bio: 'UI enthusiast & frontend learner.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user-karthik',
    name: 'Karthik R',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    bio: 'Algorithms, system design, and badminton.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user-deepa',
    name: 'Deepa N',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    bio: 'Product designer & creative writer.',
    createdAt: new Date().toISOString(),
  },
];

// Initial Seed Rooms
const SEED_ROOMS: Room[] = [
  {
    id: 'room-conv-1',
    name: 'Midnight Coders',
    description: 'Late night builds, memes, and random weekend thoughts.',
    type: 'conversation',
    photo: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80',
    ownerId: 'user-priya',
    memberIds: ['user-priya', 'user-karthik', 'user-deepa'],
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    unreadCount: 2,
    latestActivity: 'Priya: Check out this new layout!',
  },
  {
    id: 'room-buddies-1',
    name: 'Frontend Masters',
    description: 'Share what you\'re learning and keep each other motivated.',
    type: 'buddies',
    photo: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&auto=format&fit=crop&q=80',
    ownerId: 'user-priya',
    memberIds: ['user-priya', 'user-deepa'],
    createdAt: new Date(Date.now() - 3600000 * 36).toISOString(),
    unreadCount: 1,
    latestActivity: 'Priya: Learning React and TypeScript.',
  },
  {
    id: 'room-goals-1',
    name: 'Daily Grind & Build',
    description: 'Set today\'s goals and see what your friends achieve.',
    type: 'goal_tracker',
    photo: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&auto=format&fit=crop&q=80',
    ownerId: 'user-karthik',
    memberIds: ['user-karthik', 'user-priya', 'user-deepa'],
    createdAt: new Date(Date.now() - 3600000 * 72).toISOString(),
    unreadCount: 0,
    latestActivity: 'Priya completed 1 goal today',
  },
];

// Seed Messages
const SEED_MESSAGES: Message[] = [
  {
    id: 'msg-1',
    roomId: 'room-conv-1',
    senderId: 'user-priya',
    text: 'Hey everyone! Working on the new mobile navigation tonight 🚀',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    reactions: [{ emoji: '🔥', userIds: ['user-karthik', 'user-deepa'] }],
  },
  {
    id: 'msg-2',
    roomId: 'room-conv-1',
    senderId: 'user-karthik',
    text: 'Nice! Make sure the touch targets are at least 44px.',
    replyToId: 'msg-1',
    replyToText: 'Hey everyone! Working on the new mobile navigation tonight 🚀',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    reactions: [{ emoji: '👍', userIds: ['user-priya'] }],
  },
  {
    id: 'msg-3',
    roomId: 'room-conv-1',
    senderId: 'user-karthik',
    text: 'Here is a quick snapshot of the theme contrast test.',
    attachmentUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    attachmentType: 'image',
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    reactions: [{ emoji: '✨', userIds: ['user-priya', 'user-deepa'] }],
  },
  {
    id: 'msg-4',
    roomId: 'room-conv-1',
    senderId: 'user-priya',
    text: 'Check out this new layout!',
    createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
];

// Seed Buddies Updates
const SEED_BUDDIES_UPDATES: BuddiesUpdate[] = [
  {
    id: 'buddy-1',
    roomId: 'room-buddies-1',
    authorId: 'user-arjun',
    content: 'Finished two array problems today and refactored the room card component.',
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    reactions: [{ emoji: '💪', userIds: ['user-priya', 'user-deepa'] }],
    replies: [
      {
        id: 'reply-1',
        authorId: 'user-priya',
        content: 'Solid work! Keep going!',
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      },
    ],
  },
  {
    id: 'buddy-2',
    roomId: 'room-buddies-1',
    authorId: 'user-priya',
    content: 'Finally understood React hooks closures! Spent 40 minutes learning TypeScript generics too.',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    reactions: [{ emoji: '🎉', userIds: ['user-arjun'] }],
    replies: [],
  },
  {
    id: 'buddy-3',
    roomId: 'room-buddies-1',
    authorId: 'user-deepa',
    content: 'Still struggling with recursion, but I\'ll try again tomorrow.',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    reactions: [{ emoji: '❤️', userIds: ['user-arjun', 'user-priya'] }],
    replies: [
      {
        id: 'reply-2',
        authorId: 'user-arjun',
        content: 'Draw it out as a tree! That helped me a lot.',
        createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
      },
    ],
  },
];

// Seed Media
const SEED_MEDIA: MediaItem[] = [
  {
    id: 'media-1',
    roomId: 'room-conv-1',
    senderId: 'user-arjun',
    mediaType: 'image',
    localUri: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    caption: 'Dark mode color palette test',
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
  },
  {
    id: 'media-2',
    roomId: 'room-conv-1',
    senderId: 'user-priya',
    mediaType: 'image',
    localUri: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=600&auto=format&fit=crop&q=80',
    caption: 'Desk setup for late coding',
    createdAt: new Date(Date.now() - 3600000 * 14).toISOString(),
  },
  {
    id: 'media-3',
    roomId: 'room-buddies-1',
    senderId: 'user-priya',
    mediaType: 'image',
    localUri: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&auto=format&fit=crop&q=80',
    caption: 'TypeScript notes from today',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'media-4',
    roomId: 'room-goals-1',
    senderId: 'user-deepa',
    mediaType: 'image',
    localUri: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=600&auto=format&fit=crop&q=80',
    caption: 'Today’s checklist in progress',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
];

// Seed Goals
const todayStr = getTodayDateString();
const SEED_GOALS: GoalItem[] = [
  {
    id: 'goal-1',
    roomId: 'room-goals-1',
    ownerId: 'user-deepa',
    text: 'Finish a React component',
    date: todayStr,
    completed: true,
    completedAt: '14:20',
  },
  {
    id: 'goal-2',
    roomId: 'room-goals-1',
    ownerId: 'user-deepa',
    text: 'Revise JavaScript promises',
    date: todayStr,
    completed: false,
  },
  {
    id: 'goal-3',
    roomId: 'room-goals-1',
    ownerId: 'user-priya',
    text: 'Study for 30 minutes',
    date: todayStr,
    completed: true,
    completedAt: '11:45',
  },
  {
    id: 'goal-4',
    roomId: 'room-goals-1',
    ownerId: 'user-priya',
    text: 'Read one chapter',
    date: todayStr,
    completed: false,
  },
  {
    id: 'goal-5',
    roomId: 'room-goals-1',
    ownerId: 'user-karthik',
    text: 'Solve two DSA problems',
    date: todayStr,
    completed: false,
  },
];

// Seed Resources (for Project Vault when created or sampled)
const SEED_RESOURCES: ResourceItem[] = [
  {
    id: 'res-1',
    roomId: 'room-vault-demo',
    name: 'PHMLY_Design_System_Spec.pdf',
    resourceType: 'document',
    localUri: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    uploaderId: 'user-deepa',
    fileSize: '1.2 MB',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: 'res-2',
    roomId: 'room-vault-demo',
    name: 'Brand_Color_Palette_2026.png',
    resourceType: 'image',
    localUri: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    uploaderId: 'user-priya',
    fileSize: '840 KB',
    createdAt: new Date(Date.now() - 3600000 * 20).toISOString(),
  },
  {
    id: 'res-3',
    roomId: 'room-vault-demo',
    name: 'Architecture_Walkthrough.mp4',
    resourceType: 'video',
    localUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    uploaderId: 'user-karthik',
    fileSize: '4.8 MB',
    createdAt: new Date(Date.now() - 3600000 * 28).toISOString(),
  },
  {
    id: 'res-4',
    roomId: 'room-vault-demo',
    name: 'React 19 & Tailwind Documentation',
    resourceType: 'link',
    localUri: 'https://react.dev',
    uploaderId: 'user-deepa',
    fileSize: 'Link',
    createdAt: new Date(Date.now() - 3600000 * 34).toISOString(),
  },
];

// Helper to safely read and write localStorage
function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to read ${key} from localStorage`, err);
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Failed to write ${key} to localStorage`, err);
  }
}

export const StorageService = {
  initializeIfNeeded: () => {
    // Purge any legacy hardcoded Arjun user data from browser storage
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (stored && stored.includes('user-arjun')) {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      }
    } catch {
      // ignore
    }

    const initialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
    if (!initialized) {
      StorageService.resetToDemo();
    }
  },

  resetToDemo: () => {
    // User starts in a clean logged-out state - never seeded as Arjun!
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(SEED_USERS));
    localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(SEED_ROOMS));
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(SEED_MESSAGES));
    localStorage.setItem(STORAGE_KEYS.BUDDIES_UPDATES, JSON.stringify(SEED_BUDDIES_UPDATES));
    localStorage.setItem(STORAGE_KEYS.MEDIA, JSON.stringify(SEED_MEDIA));
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(SEED_GOALS));
    localStorage.setItem(STORAGE_KEYS.RESOURCES, JSON.stringify(SEED_RESOURCES));
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
  },

  getCurrentUser: (): User | null => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (!raw) return null;
      if (raw.includes('user-arjun')) {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        return null;
      }
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  clearCurrentUser: (): void => {
    try {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    } catch (err) {
      console.warn('Failed to clear current user from storage:', err);
    }
  },

  updateCurrentUser: (updates: Partial<User>): User => {
    const current = StorageService.getCurrentUser() || {
      id: updates.id || `user-${Date.now()}`,
      name: updates.name || 'Member',
      avatar: updates.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=Member`,
      bio: updates.bio || 'Member of PHMLY',
      createdAt: new Date().toISOString(),
    };
    const updated = { ...current, ...updates };
    writeStorage(STORAGE_KEYS.CURRENT_USER, updated);
    // Also update in users list if exists
    const users = StorageService.getUsers().map(u => u.id === updated.id ? updated : u);
    writeStorage(STORAGE_KEYS.USERS, users);
    return updated;
  },

  getUsers: (): User[] => {
    return readStorage<User[]>(STORAGE_KEYS.USERS, SEED_USERS);
  },

  getUserById: (id: string): User | undefined => {
    return StorageService.getUsers().find(u => u.id === id);
  },

  getRooms: (): Room[] => {
    return readStorage<Room[]>(STORAGE_KEYS.ROOMS, SEED_ROOMS);
  },

  getUserCreatedRoomCount: (userId: string): number => {
    const rooms = StorageService.getRooms();
    return rooms.filter(r => r.ownerId === userId).length;
  },

  canUserCreateRoom: (userId: string): boolean => {
    return StorageService.getUserCreatedRoomCount(userId) < LIMITS.MAX_ROOMS_CREATED;
  },

  getRoomById: (id: string): Room | undefined => {
    return StorageService.getRooms().find(r => r.id === id);
  },

  createRoom: (roomData: Omit<Room, 'id' | 'createdAt'>): { success: boolean; room?: Room; error?: string } => {
    const currentUserId = StorageService.getCurrentUser()?.id || 'guest';
    if (!StorageService.canUserCreateRoom(currentUserId)) {
      return {
        success: false,
        error: `Room limit reached! You can create a maximum of ${LIMITS.MAX_ROOMS_CREATED} rooms.`,
      };
    }

    if (roomData.memberIds.length > LIMITS.MAX_ROOM_MEMBERS) {
      return {
        success: false,
        error: `A room cannot exceed ${LIMITS.MAX_ROOM_MEMBERS} members.`,
      };
    }

    const newRoom: Room = {
      ...roomData,
      id: `room-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    };

    const rooms = StorageService.getRooms();
    rooms.unshift(newRoom);
    writeStorage(STORAGE_KEYS.ROOMS, rooms);
    return { success: true, room: newRoom };
  },

  addMemberToRoom: (roomId: string, userId: string): { success: boolean; error?: string } => {
    const rooms = StorageService.getRooms();
    const roomIndex = rooms.findIndex(r => r.id === roomId);
    if (roomIndex === -1) return { success: false, error: 'Room not found' };

    const room = rooms[roomIndex];
    if (room.memberIds.includes(userId)) {
      return { success: false, error: 'Member is already in this room' };
    }

    if (room.memberIds.length >= LIMITS.MAX_ROOM_MEMBERS) {
      return { success: false, error: `This room has reached the maximum of ${LIMITS.MAX_ROOM_MEMBERS} members.` };
    }

    room.memberIds.push(userId);
    rooms[roomIndex] = room;
    writeStorage(STORAGE_KEYS.ROOMS, rooms);
    return { success: true };
  },

  deleteRoom: (roomId: string): boolean => {
    const rooms = StorageService.getRooms();
    const filtered = rooms.filter(r => r.id !== roomId);
    writeStorage(STORAGE_KEYS.ROOMS, filtered);
    return true;
  },

  leaveRoom: (roomId: string, userId: string): boolean => {
    const rooms = StorageService.getRooms();
    const roomIndex = rooms.findIndex(r => r.id === roomId);
    if (roomIndex === -1) return false;

    const room = rooms[roomIndex];
    // Room creators cannot leave their own room (must delete room instead)
    if (room.ownerId === userId) {
      return false;
    }

    room.memberIds = room.memberIds.filter(id => id !== userId);
    rooms[roomIndex] = room;
    writeStorage(STORAGE_KEYS.ROOMS, rooms);
    return true;
  },

  clearUserRooms: (userId: string): void => {
    const rooms = StorageService.getRooms();
    // Remove user from all rooms, and remove room entirely if user was sole member
    const updated = rooms
      .map(r => {
        if (!r.memberIds.includes(userId)) return r;
        const newMembers = r.memberIds.filter(id => id !== userId);
        if (newMembers.length === 0) return null;
        return {
          ...r,
          memberIds: newMembers,
          ownerId: r.ownerId === userId ? newMembers[0] : r.ownerId,
        };
      })
      .filter((r): r is Room => r !== null);
    writeStorage(STORAGE_KEYS.ROOMS, updated);
  },

  // Messages
  getMessages: (roomId: string): Message[] => {
    const all = readStorage<Message[]>(STORAGE_KEYS.MESSAGES, SEED_MESSAGES);
    return all.filter(m => m.roomId === roomId);
  },

  addMessage: (messageData: Omit<Message, 'id' | 'createdAt'>): Message => {
    const newMessage: Message = {
      ...messageData,
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    const all = readStorage<Message[]>(STORAGE_KEYS.MESSAGES, SEED_MESSAGES);
    all.push(newMessage);
    writeStorage(STORAGE_KEYS.MESSAGES, all);

    // Update room latest activity
    const rooms = StorageService.getRooms();
    const rIdx = rooms.findIndex(r => r.id === messageData.roomId);
    if (rIdx !== -1) {
      const sender = StorageService.getUserById(messageData.senderId);
      rooms[rIdx].latestActivity = `${sender ? sender.name.split(' ')[0] : 'Someone'}: ${messageData.text.slice(0, 35)}`;
      writeStorage(STORAGE_KEYS.ROOMS, rooms);
    }

    return newMessage;
  },

  toggleMessageReaction: (messageId: string, emoji: string, userId: string): void => {
    const all = readStorage<Message[]>(STORAGE_KEYS.MESSAGES, SEED_MESSAGES);
    const msg = all.find(m => m.id === messageId);
    if (!msg) return;

    if (!msg.reactions) msg.reactions = [];
    const rIdx = msg.reactions.findIndex(r => r.emoji === emoji);
    if (rIdx === -1) {
      msg.reactions.push({ emoji, userIds: [userId] });
    } else {
      const uIdx = msg.reactions[rIdx].userIds.indexOf(userId);
      if (uIdx === -1) {
        msg.reactions[rIdx].userIds.push(userId);
      } else {
        msg.reactions[rIdx].userIds.splice(uIdx, 1);
        if (msg.reactions[rIdx].userIds.length === 0) {
          msg.reactions.splice(rIdx, 1);
        }
      }
    }
    writeStorage(STORAGE_KEYS.MESSAGES, all);
  },

  // Media
  getMedia: (roomId: string): MediaItem[] => {
    const all = readStorage<MediaItem[]>(STORAGE_KEYS.MEDIA, SEED_MEDIA);
    return all.filter(m => m.roomId === roomId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  addMedia: (mediaData: Omit<MediaItem, 'id' | 'createdAt'>): MediaItem => {
    const newMedia: MediaItem = {
      ...mediaData,
      id: `media-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    const all = readStorage<MediaItem[]>(STORAGE_KEYS.MEDIA, SEED_MEDIA);
    all.unshift(newMedia);
    writeStorage(STORAGE_KEYS.MEDIA, all);
    return newMedia;
  },

  shareMediaToRooms: (roomIds: string[], senderId: string, localUri: string, mediaType: 'image' | 'video', caption?: string): MediaItem[] => {
    const added: MediaItem[] = [];
    roomIds.forEach(roomId => {
      const item = StorageService.addMedia({
        roomId,
        senderId,
        localUri,
        mediaType,
        caption,
      });
      added.push(item);
    });
    return added;
  },

  // Buddies Updates
  getBuddiesUpdates: (roomId: string): BuddiesUpdate[] => {
    const all = readStorage<BuddiesUpdate[]>(STORAGE_KEYS.BUDDIES_UPDATES, SEED_BUDDIES_UPDATES);
    return all.filter(u => u.roomId === roomId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  addBuddiesUpdate: (updateData: Omit<BuddiesUpdate, 'id' | 'createdAt'>): BuddiesUpdate => {
    const newUpdate: BuddiesUpdate = {
      ...updateData,
      id: `buddy-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    const all = readStorage<BuddiesUpdate[]>(STORAGE_KEYS.BUDDIES_UPDATES, SEED_BUDDIES_UPDATES);
    all.unshift(newUpdate);
    writeStorage(STORAGE_KEYS.BUDDIES_UPDATES, all);

    // Update room latest activity
    const rooms = StorageService.getRooms();
    const rIdx = rooms.findIndex(r => r.id === updateData.roomId);
    if (rIdx !== -1) {
      const author = StorageService.getUserById(updateData.authorId);
      rooms[rIdx].latestActivity = `${author ? author.name.split(' ')[0] : 'Someone'}: ${updateData.content.slice(0, 35)}`;
      writeStorage(STORAGE_KEYS.ROOMS, rooms);
    }

    return newUpdate;
  },

  toggleBuddiesReaction: (updateId: string, emoji: string, userId: string): void => {
    const all = readStorage<BuddiesUpdate[]>(STORAGE_KEYS.BUDDIES_UPDATES, SEED_BUDDIES_UPDATES);
    const update = all.find(u => u.id === updateId);
    if (!update) return;

    if (!update.reactions) update.reactions = [];
    const rIdx = update.reactions.findIndex(r => r.emoji === emoji);
    if (rIdx === -1) {
      update.reactions.push({ emoji, userIds: [userId] });
    } else {
      const uIdx = update.reactions[rIdx].userIds.indexOf(userId);
      if (uIdx === -1) {
        update.reactions[rIdx].userIds.push(userId);
      } else {
        update.reactions[rIdx].userIds.splice(uIdx, 1);
        if (update.reactions[rIdx].userIds.length === 0) {
          update.reactions.splice(rIdx, 1);
        }
      }
    }
    writeStorage(STORAGE_KEYS.BUDDIES_UPDATES, all);
  },

  addBuddiesReply: (updateId: string, authorId: string, content: string): BuddiesReply | undefined => {
    const all = readStorage<BuddiesUpdate[]>(STORAGE_KEYS.BUDDIES_UPDATES, SEED_BUDDIES_UPDATES);
    const update = all.find(u => u.id === updateId);
    if (!update) return;

    if (!update.replies) update.replies = [];
    const reply: BuddiesReply = {
      id: `reply-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      authorId,
      content,
      createdAt: new Date().toISOString(),
    };
    update.replies.push(reply);
    writeStorage(STORAGE_KEYS.BUDDIES_UPDATES, all);
    return reply;
  },

  // Project Vault Resources
  getResources: (roomId: string): ResourceItem[] => {
    const all = readStorage<ResourceItem[]>(STORAGE_KEYS.RESOURCES, SEED_RESOURCES);
    return all.filter(r => r.roomId === roomId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  addResource: (resourceData: Omit<ResourceItem, 'id' | 'createdAt'>): ResourceItem => {
    const newRes: ResourceItem = {
      ...resourceData,
      id: `res-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    const all = readStorage<ResourceItem[]>(STORAGE_KEYS.RESOURCES, SEED_RESOURCES);
    all.unshift(newRes);
    writeStorage(STORAGE_KEYS.RESOURCES, all);
    return newRes;
  },

  deleteResource: (resourceId: string): void => {
    const all = readStorage<ResourceItem[]>(STORAGE_KEYS.RESOURCES, SEED_RESOURCES);
    const filtered = all.filter(r => r.id !== resourceId);
    writeStorage(STORAGE_KEYS.RESOURCES, filtered);
  },

  // Goals
  getGoals: (roomId: string, date: string): GoalItem[] => {
    const all = readStorage<GoalItem[]>(STORAGE_KEYS.GOALS, SEED_GOALS);
    return all.filter(g => g.roomId === roomId && g.date === date);
  },

  addGoal: (goalData: Omit<GoalItem, 'id'>): GoalItem => {
    const newGoal: GoalItem = {
      ...goalData,
      id: `goal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    const all = readStorage<GoalItem[]>(STORAGE_KEYS.GOALS, SEED_GOALS);
    all.push(newGoal);
    writeStorage(STORAGE_KEYS.GOALS, all);
    return newGoal;
  },

  toggleGoal: (goalId: string): GoalItem | undefined => {
    const all = readStorage<GoalItem[]>(STORAGE_KEYS.GOALS, SEED_GOALS);
    const goal = all.find(g => g.id === goalId);
    if (!goal) return;

    goal.completed = !goal.completed;
    if (goal.completed) {
      const now = new Date();
      goal.completedAt = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    } else {
      goal.completedAt = undefined;
    }
    writeStorage(STORAGE_KEYS.GOALS, all);
    return goal;
  },

  deleteGoal: (goalId: string): void => {
    const all = readStorage<GoalItem[]>(STORAGE_KEYS.GOALS, SEED_GOALS);
    const filtered = all.filter((g) => g.id !== goalId);
    writeStorage(STORAGE_KEYS.GOALS, filtered);
  },
};
