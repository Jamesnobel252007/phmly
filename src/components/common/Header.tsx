import React, { useState, useRef, useEffect } from 'react';
import { User } from '../../types';
import { Avatar } from './Avatar';
import { Logo } from './Logo';
import { Sun, Moon, LogIn, User as UserIcon, LogOut } from 'lucide-react';
import { useTheme } from '../../services/theme';

interface HeaderProps {
  currentUser: User | null;
  onOpenProfile: () => void;
  onGoHome: () => void;
  isAuthenticated?: boolean;
  userEmail?: string;
  onOpenAuth?: () => void;
  onSignOut?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onOpenProfile,
  onGoHome,
  isAuthenticated = false,
  userEmail,
  onOpenAuth,
  onSignOut,
}) => {
  const { effectiveTheme, setThemeMode } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleTheme = () => {
    setThemeMode(effectiveTheme === 'dark' ? 'light' : 'dark');
  };

  // Close dropdown menu on outside click or Escape key
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  const isLoggedIn = Boolean(isAuthenticated && currentUser);

  return (
    <header className="sticky top-0 z-30 bg-phmly-surface/90 backdrop-blur-md border-b border-phmly-border px-3 sm:px-4 py-2 sm:py-2.5 transition-colors duration-150">
      <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
        {/* Brand Logo & Wordmark (compact on small screens to never overlap actions) */}
        <button
          onClick={onGoHome}
          className="group text-left transition-transform active:scale-95 flex items-center shrink-0 min-w-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-goldenRush rounded-xl"
          title="PHMLY Home"
          aria-label="PHMLY Home"
        >
          <Logo size="lg" showWordmark={true} />
        </button>

        {/* Right Actions: Theme Switcher & Auth / Profile Avatar */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Theme Switcher Button */}
          <button
            onClick={toggleTheme}
            className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-phmly-muted hover:text-goldenRush hover:bg-phmly-subtle transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-goldenRush"
            title={`Switch to ${effectiveTheme === 'dark' ? 'Light' : 'Dark'} theme`}
            aria-label={`Switch to ${effectiveTheme === 'dark' ? 'Light' : 'Dark'} theme`}
          >
            {effectiveTheme === 'dark' ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>

          {/* Conditional Auth Element: Login Button vs User Profile Avatar */}
          {!currentUser || !isAuthenticated ? (
            /* WHEN NOT LOGGED IN: Visible Login action (WhatsApp/messaging-app convention) */
            <button
              onClick={onOpenAuth}
              type="button"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl bg-goldenRush text-forestBlack font-medium text-secondary hover:bg-amberGlow transition-transform active:scale-95 shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-goldenRush"
              title="Log In to PHMLY"
              aria-label="Log In"
            >
              <LogIn className="w-4 h-4 stroke-[2.2]" />
              <span>Login</span>
            </button>
          ) : (
            /* WHEN LOGGED IN: Authenticated User Avatar with Compact Dropdown Menu */
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen((prev) => !prev)}
                type="button"
                className="flex items-center gap-2 p-0.5 min-h-[40px] rounded-full hover:bg-phmly-subtle transition-colors border border-transparent hover:border-phmly-border focus:outline-none focus-visible:ring-2 focus-visible:ring-goldenRush"
                title="Account menu"
                aria-label="Open account menu"
                aria-expanded={isMenuOpen}
                aria-haspopup="true"
              >
                <div className="text-right hidden sm:block pr-1">
                  <p className="text-secondary font-medium text-phmly-text leading-none truncate max-w-[120px]">
                    {currentUser.name}
                  </p>
                  <p className="text-caption text-goldenRush font-medium">Online</p>
                </div>
                <Avatar
                  src={currentUser.avatar}
                  name={currentUser.name || 'User'}
                  size="sm"
                />
              </button>

              {/* Compact Profile Dropdown Menu */}
              {isMenuOpen && (
                <div
                  role="menu"
                  aria-label="Account options"
                  className="absolute right-0 top-full mt-2 w-56 sm:w-64 bg-phmly-surface border border-phmly-border rounded-2xl shadow-xl p-2 z-50 animate-scaleIn origin-top-right focus:outline-none"
                >
                  <div className="px-3 py-2 border-b border-phmly-border/70">
                    <p className="text-secondary font-medium text-phmly-text truncate">
                      {currentUser.name}
                    </p>
                    <p className="text-metadata text-phmly-muted truncate mt-0.5">
                      {userEmail || currentUser.email || 'Supabase Account'}
                    </p>
                  </div>

                  <div className="py-1 space-y-0.5">
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenProfile();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-secondary font-medium text-phmly-text hover:bg-phmly-subtle hover:text-goldenRush transition-colors text-left"
                      role="menuitem"
                    >
                      <UserIcon className="w-4 h-4 text-goldenRush" />
                      <span>Profile & Settings</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        onSignOut?.();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-secondary font-medium text-rose-500 hover:bg-rose-500/10 transition-colors text-left"
                      role="menuitem"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
