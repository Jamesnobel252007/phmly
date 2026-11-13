import React from 'react';
import { MediaItem } from '../../types';
import { Camera, Play, Image as ImageIcon } from 'lucide-react';

interface RoomMediaStripProps {
  media: MediaItem[];
  onSelectMedia: (media: MediaItem) => void;
  onOpenRoomCamera: () => void;
}

export const RoomMediaStrip: React.FC<RoomMediaStripProps> = ({
  media,
  onSelectMedia,
  onOpenRoomCamera,
}) => {
  return (
    <div className="py-2 px-3 sm:px-4 bg-phmly-surface/50 border-b border-phmly-border transition-colors">
      <div className="max-w-3xl mx-auto flex items-center gap-2.5 overflow-x-auto custom-scrollbar pb-1">
        {/* Add photo shortcut tile */}
        <button
          onClick={onOpenRoomCamera}
          className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl border border-dashed border-goldenRush/50 bg-phmly-subtle/60 hover:bg-phmly-subtle hover:border-goldenRush transition-all flex flex-col items-center justify-center gap-0.5 text-goldenRush active:scale-95 group"
          title="Share to this room"
        >
          <Camera className="w-4 h-4 group-hover:scale-110 transition-transform" />
          <span className="text-[10px] font-semibold">Add</span>
        </button>

        {media.length === 0 ? (
          <div className="flex items-center gap-2 text-xs text-phmly-muted px-2 py-2 italic">
            <ImageIcon className="w-4 h-4 text-phmly-muted/60" />
            <span>No media shared yet. Tap Add to post photos!</span>
          </div>
        ) : (
          media.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectMedia(item)}
              className="relative shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border border-phmly-border hover:border-goldenRush/60 transition-all active:scale-95 group bg-phmly-subtle shadow-xs"
              title={item.caption || 'View photo'}
            >
              <img
                src={item.localUri}
                alt={item.caption || 'Media thumbnail'}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                loading="lazy"
              />
              {item.mediaType === 'video' && (
                <div className="absolute inset-0 bg-forestBlack/40 flex items-center justify-center">
                  <Play className="w-4 h-4 text-goldenRush fill-goldenRush" />
                </div>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
};
