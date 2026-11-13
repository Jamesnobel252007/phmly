import React from 'react';

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  shape?: 'rounded' | 'square';
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  className = '',
  shape = 'rounded',
}) => {
  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg font-bold',
  };

  const shapeClasses = shape === 'square' ? 'rounded-2xl' : 'rounded-full';
  const initial = name ? name.charAt(0).toUpperCase() : '?';

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 overflow-hidden bg-phmly-subtle border border-phmly-border text-phmly-text select-none ${sizeClasses[size]} ${shapeClasses} ${className}`}
      title={name}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      ) : null}
      <span className="font-semibold text-goldenRush">{initial}</span>
    </div>
  );
};
