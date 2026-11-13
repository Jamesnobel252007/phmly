import React from 'react';
import { X, Download, User as UserIcon, Calendar } from 'lucide-react';
import { MediaItem } from '../../types';
import { StorageService } from '../../services/storage';

interface MediaViewerModalProps {
  media: MediaItem | null;
  onClose: () => void;
}

export const MediaViewerModal: React.FC<MediaViewerModalProps> = ({
  media,
  onClose,
}) => {
  if (!media) return null;

  const sender = StorageService.getUserById(media.senderId);
  const formattedDate = new Date(media.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-forestBlack/90 backdrop-blur-md p-4 sm:p-6 animate-fadeIn">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-forestBlack/70 text-forestCream hover:text-goldenRush border border-white/10 transition-colors"
        title="Close"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="max-w-2xl w-full max-h-[90vh] flex flex-col bg-phmly-surface rounded-3xl border border-phmly-border overflow-hidden shadow-2xl transition-colors">
        {/* Media Canvas */}
        <div className="relative flex-1 bg-forestBlack flex items-center justify-center overflow-hidden min-h-[280px] max-h-[60vh]">
          {media.mediaType === 'video' ? (
            <video
              src={media.localUri}
              controls
              autoPlay
              className="max-h-[60vh] w-full object-contain"
            />
          ) : (
            <img
              src={media.localUri}
              alt={media.caption || 'Shared media'}
              className="max-h-[60vh] w-full object-contain"
            />
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 sm:p-5 flex flex-col gap-2 bg-phmly-surface border-t border-phmly-border">
          {media.caption && (
            <p className="text-sm text-phmly-text font-medium">
              {media.caption}
            </p>
          )}

          <div className="flex items-center justify-between text-xs text-phmly-muted pt-1">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 font-medium text-phmly-text">
                <UserIcon className="w-3.5 h-3.5 text-goldenRush" />
                {sender ? sender.name : 'Member'}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {formattedDate}
              </span>
            </div>

            <a
              href={media.localUri}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-goldenRush text-forestBlack font-semibold transition-colors hover:bg-amberGlow text-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
