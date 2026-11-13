import React, { useState } from 'react';
import { ArrowLeft, MoreVertical, Camera } from 'lucide-react';
import { Room, MediaItem, User } from '../../types';
import { ROOM_TYPE_META } from '../../constants/design';
import { RoomMediaStrip } from './RoomMediaStrip';
import { RoomOptionsModal } from './RoomOptionsModal';
import { MediaViewerModal } from '../common/MediaViewerModal';

interface RoomShellProps {
  room: Room;
  media: MediaItem[];
  currentUser?: User | null;
  onBack: () => void;
  onOpenRoomCamera: () => void;
  onRoomUpdated: () => void;
  children: React.ReactNode;
}

export const RoomShell: React.FC<RoomShellProps> = ({
  room,
  media,
  currentUser,
  onBack,
  onOpenRoomCamera,
  onRoomUpdated,
  children,
}) => {
  const [showOptions, setShowOptions] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);

  const meta = ROOM_TYPE_META[room.type];

  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-60px)] bg-phmly-bg transition-colors duration-150">
      {/* Shared Room Header */}
      <div className="sticky top-0 z-20 bg-phmly-surface/95 backdrop-blur-md border-b border-phmly-border px-3 py-2 sm:px-5">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          {/* Back & Room Info */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button
              onClick={onBack}
              className="p-1.5 -ml-1 rounded-xl text-phmly-muted hover:text-phmly-text hover:bg-phmly-subtle transition-colors"
              title="Back to rooms"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* Room Photo (Rounded-square, never circular) */}
            <div className="relative shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-2xl overflow-hidden border border-phmly-border bg-phmly-subtle shadow-xs">
              <img
                src={room.photo}
                alt={room.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Name, Type & Member Count (WhatsApp Header: 16-17px semibold, 12px metadata) */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-room-title font-semibold text-phmly-text truncate tracking-tight">
                  {room.name}
                </h1>
                <span className="text-caption font-medium text-goldenRush bg-goldenRush/10 px-2 py-0.5 rounded-full shrink-0">
                  {meta.title}
                </span>
              </div>
              <p className="text-metadata text-phmly-muted flex items-center gap-1.5 truncate">
                <span>{room.memberIds.length} members</span>
                <span>·</span>
                <span className="text-goldenRush">Active space</span>
              </p>
            </div>
          </div>

          {/* Action shortcuts */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onOpenRoomCamera}
              className="p-2 rounded-xl text-phmly-text hover:text-goldenRush hover:bg-phmly-subtle transition-colors"
              title="Add photo or video to this room"
            >
              <Camera className="w-5 h-5" />
            </button>

            <button
              onClick={() => setShowOptions(true)}
              className="p-2 rounded-xl text-phmly-muted hover:text-phmly-text hover:bg-phmly-subtle transition-colors"
              title="Room options"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Shared Horizontal Room Media Strip */}
      <RoomMediaStrip
        media={media}
        onSelectMedia={(m) => setSelectedMedia(m)}
        onOpenRoomCamera={onOpenRoomCamera}
      />

      {/* Purpose-Specific Primary Room Content */}
      <div className="flex-1 flex flex-col min-h-0 max-w-3xl w-full mx-auto pb-16 sm:pb-6">
        {children}
      </div>

      {/* Room Options Modal */}
      {showOptions && (
        <RoomOptionsModal
          room={room}
          currentUser={currentUser}
          onClose={() => setShowOptions(false)}
          onRoomUpdated={onRoomUpdated}
          onLeaveOrDelete={() => {
            onRoomUpdated();
            onBack();
          }}
        />
      )}

      {/* Media Lightbox */}
      {selectedMedia && (
        <MediaViewerModal
          media={selectedMedia}
          onClose={() => setSelectedMedia(null)}
        />
      )}
    </div>
  );
};
