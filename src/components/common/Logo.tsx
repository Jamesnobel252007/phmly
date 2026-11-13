import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'lg',
  showWordmark = true,
  className = '',
}) => {
  const sizeMap = {
    sm: { container: 'h-7 w-7 max-w-[28px] max-h-[28px]', text: 'text-base sm:text-lg' },
    md: { container: 'h-8 w-8 sm:h-9 sm:w-9 max-w-[36px] max-h-[36px]', text: 'text-lg sm:text-xl' },
    lg: { container: 'h-10 w-10 sm:h-12 sm:w-12 max-w-[48px] max-h-[48px]', text: 'text-xl sm:text-2xl' },
    xl: { container: 'h-14 w-14 sm:h-16 sm:w-16 max-w-[64px] max-h-[64px]', text: 'text-2xl sm:text-3xl' },
  };

  const { container, text } = sizeMap[size];

  return (
    <div className={`flex items-center gap-2 select-none shrink min-w-0 max-w-full ${className}`}>
      {/* Official PHMLY Logo Asset — object-fit: contain, maintains aspect ratio, strictly bounded */}
      <div className={`relative ${container} shrink-0 overflow-hidden rounded-xl bg-forestBlack flex items-center justify-center transition-transform duration-200 group-hover:scale-105`}>
        <img
          src="/brand-logo.jpg"
          alt="PHMLY"
          className="w-full h-full object-contain"
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
        />
      </div>

      {showWordmark && (
        <span className={`font-black tracking-wider text-phmly-text group-hover:text-goldenRush transition-colors truncate ${text}`}>
          PHMLY
        </span>
      )}
    </div>
  );
};
