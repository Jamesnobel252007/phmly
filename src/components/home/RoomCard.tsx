import React from 'react';
import { MessageSquare, Users, FolderArchive, Target } from 'lucide-react';
import { Room } from '../../types';
import { ROOM_TYPE_META } from '../../constants/design';

interface RoomCardProps {
  room: Room;
  onClick: () => void;
  isLast?: boolean;
}

export const RoomCard: React.FC<RoomCardProps> = ({ room, onClick, isLast = false }) => {
  const meta = ROOM_TYPE_META[room.type];

  const getTypeIcon = () => {
    switch (room.type) {
      case 'conversation':
        return <MessageSquare className="w-3 h-3" />;
      case 'buddies':
        return <Users className="w-3 h-3" />;
      case 'project_vault':
        return <FolderArchive className="w-3 h-3" />;
      case 'goal_tracker':
        return <Target className="w-3 h-3" />;
    }
  };

  // Format activity timestamp
  const getDisplayTime = () => {
    if (!room.createdAt) return 'Today';
    const date = new Date(room.createdAt);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffHours < 24 && date.getDate() === now.getDate()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (diffHours < 48) {
      return 'Yesterday';
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={`group relative flex items-center gap-3.5 p-3 sm:p-3.5 bg-phmly-surface hover:bg-phmly-subtle transition-colors cursor-pointer select-none active:bg-phmly-subtle/80 ${
        !isLast ? 'border-b border-phmly-border' : ''
      }`}
    >
      {/* LEFT: Small Square Room Thumbnail (64-72px, rounded-2xl, not a circle) */}
      <div className="relative shrink-0 w-16 h-16 sm:w-[68px] sm:h-[68px] rounded-2xl overflow-hidden bg-phmly-subtle border border-phmly-border/70 shadow-xs">
        <img
          src={room.photo}
          alt={room.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          loading="lazy"
        />

        {/* Subtle Room Type Indicator Dot */}
        <div className="absolute bottom-1 right-1 p-0.5 rounded-md bg-phmly-bg/90 backdrop-blur-xs text-goldenRush border border-phmly-border">
          {getTypeIcon()}
        </div>
      </div>

      {/* MIDDLE: Name, Type, and Truncated Latest Activity */}
      <div className="flex-1 min-w-0 pr-1">
        {/* Top: Room Name (16px, medium weight) */}
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-section font-medium text-phmly-text truncate tracking-tight group-hover:text-goldenRush transition-colors">
            {room.name}
          </h3>
        </div>

        {/* Middle: Type & Member Metadata (11-12px) */}
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-caption font-medium text-goldenRush">
            {meta.title}
          </span>
          <span className="text-phmly-muted text-caption">·</span>
          <span className="text-caption text-phmly-muted font-normal">
            {room.memberIds.length} members
          </span>
        </div>

        {/* Bottom: Latest Message / Activity Preview (13-14px, regular weight) */}
        <p className="text-secondary text-phmly-muted truncate mt-0.5 leading-[1.4] font-normal">
          {room.latestActivity ? (
            <span>{room.latestActivity}</span>
          ) : (
            <span className="italic opacity-80">{meta.description}</span>
          )}
        </p>
      </div>

      {/* RIGHT: Timestamp & Unread Badge (11-12px) */}
      <div className="shrink-0 flex flex-col items-end justify-between self-stretch py-0.5">
        <span className="text-caption font-normal text-phmly-muted">
          {getDisplayTime()}
        </span>

        {room.unreadCount && room.unreadCount > 0 ? (
          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-goldenRush text-forestBlack font-medium text-caption shadow-xs">
            {room.unreadCount}
          </span>
        ) : (
          <span className="w-2 h-2 rounded-full bg-transparent" />
        )}
      </div>
    </div>
  );
};
