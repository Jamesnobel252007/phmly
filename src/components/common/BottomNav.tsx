import React from 'react';
import { MessageSquare, Camera, UserCircle } from 'lucide-react';

interface BottomNavProps {
  currentTab: 'home' | 'profile';
  onSelectTab: (tab: 'home' | 'profile') => void;
  onOpenCentralCamera: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenCentralCamera,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-phmly-surface/95 backdrop-blur-lg border-t border-phmly-border px-6 py-1.5 pb-safe sm:hidden transition-colors duration-150">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {/* Rooms / Home */}
        <button
          onClick={() => onSelectTab('home')}
          className={`flex flex-col items-center gap-0.5 py-1 px-4 rounded-xl transition-colors ${
            currentTab === 'home'
              ? 'text-goldenRush font-medium'
              : 'text-phmly-muted hover:text-phmly-text font-normal'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-caption">Rooms</span>
        </button>

        {/* Central Camera Shortcut */}
        <button
          onClick={onOpenCentralCamera}
          className="relative -top-2.5 p-3 rounded-2xl bg-goldenRush text-forestBlack shadow-md shadow-goldenRush/20 hover:bg-amberGlow active:scale-95 transition-all flex items-center justify-center"
          title="Share Photo or Video"
        >
          <Camera className="w-5 h-5 stroke-[2.5]" />
          <span className="sr-only">Central Camera</span>
        </button>

        {/* Profile */}
        <button
          onClick={() => onSelectTab('profile')}
          className={`flex flex-col items-center gap-0.5 py-1 px-4 rounded-xl transition-colors ${
            currentTab === 'profile'
              ? 'text-goldenRush font-medium'
              : 'text-phmly-muted hover:text-phmly-text font-normal'
          }`}
        >
          <UserCircle className="w-5 h-5" />
          <span className="text-caption">Profile</span>
        </button>
      </div>
    </nav>
  );
};
