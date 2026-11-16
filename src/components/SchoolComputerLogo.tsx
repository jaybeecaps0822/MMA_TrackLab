import React, { useState } from 'react';
import schoolComputerLogoImg from '../assets/images/mma_ict_logo.png';

interface SchoolComputerLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  className?: string;
  showText?: boolean;
  textVariant?: 'sidebar' | 'header' | 'hero' | 'badge';
  subtitle?: string;
  onClick?: () => void;
}

export const SchoolComputerLogo: React.FC<SchoolComputerLogoProps> = ({
  size = 'md',
  className = '',
  showText = false,
  textVariant = 'sidebar',
  subtitle,
  onClick,
}) => {
  const [imgError, setImgError] = useState(false);

  // Pixel sizing mapping - Enlarged for clear emblem visibility
  const sizeMap = {
    xs: { dim: 'w-8 h-8', px: 32, text: 'text-xs' },
    sm: { dim: 'w-10 h-10', px: 40, text: 'text-sm' },
    md: { dim: 'w-12 h-12', px: 48, text: 'text-base' },
    lg: { dim: 'w-16 h-16', px: 64, text: 'text-lg' },
    xl: { dim: 'w-24 h-24', px: 96, text: 'text-xl' },
    hero: { dim: 'w-32 h-32 sm:w-40 sm:h-40', px: 160, text: 'text-2xl sm:text-3xl' },
  };

  const currentSize = sizeMap[size];

  // Visual emblem rendering (image with vector SVG fallback)
  const logoGraphic = (
    <div
      className={`relative rounded-full overflow-hidden shadow-md shadow-blue-900/15 ring-2 ring-blue-500/35 shrink-0 bg-white flex items-center justify-center p-1 transition-transform group-hover:scale-105 ${currentSize.dim} ${className}`}
    >
      {!imgError ? (
        <img
          src={schoolComputerLogoImg}
          alt="MMA Information and Communication Technology Logo"
          className="w-full h-full object-contain select-none"
          onError={() => setImgError(true)}
        />
      ) : (
        // Precision SVG combining School Crest & Laurel & Graduation Cap & Computer Monitor
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full p-1"
        >
          {/* Outer Academic Shield Frame */}
          <path
            d="M50 14L82 24V48C82 68 67 84 50 90C33 84 18 68 18 48V24L50 14Z"
            fill="#090d16"
            stroke="#f59e0b"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* Inner Shield Accent */}
          <path
            d="M50 20L76 28V47C76 63 64 76 50 82C36 76 24 63 24 47V28L50 20Z"
            fill="#0f172a"
            stroke="#d97706"
            strokeWidth="1.2"
          />

          {/* Graduation Cap on top of crest */}
          <path
            d="M50 6L72 13L50 20L28 13L50 6Z"
            fill="#f59e0b"
            stroke="#fbbf24"
            strokeWidth="1"
          />
          <path
            d="M38 16V22C38 25 43 27 50 27C57 27 62 25 62 22V16"
            fill="#d97706"
          />
          {/* Tassel */}
          <path
            d="M68 14L74 21V25"
            stroke="#fbbf24"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* Computer Monitor in the Center */}
          <rect
            x="32"
            y="34"
            width="36"
            height="26"
            rx="3"
            fill="#020617"
            stroke="#06b6d4"
            strokeWidth="2"
          />
          {/* Screen Content - Glowing Code brackets */}
          <path
            d="M44 43L40 47L44 51"
            stroke="#38bdf8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M56 43L60 47L56 51"
            stroke="#38bdf8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M52 42L48 52"
            stroke="#fbbf24"
            strokeWidth="1.8"
            strokeLinecap="round"
          />

          {/* Monitor Stand & Base */}
          <path
            d="M46 60L44 65H56L54 60"
            fill="#06b6d4"
          />
          <rect
            x="41"
            y="65"
            width="18"
            height="3"
            rx="1.5"
            fill="#f59e0b"
          />

          {/* Laurel Leaves (Left and Right) */}
          <path
            d="M12 38C12 56 22 72 34 80"
            stroke="#fbbf24"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M88 38C88 56 78 72 66 80"
            stroke="#fbbf24"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Ribbon at bottom */}
          <path
            d="M26 84H74L70 94H30L26 84Z"
            fill="#f59e0b"
          />
          <text
            x="50"
            y="91.5"
            fill="#090d16"
            fontSize="6.5"
            fontWeight="bold"
            textAnchor="middle"
            fontFamily="monospace"
          >
            MMA ICT
          </text>
        </svg>
      )}
    </div>
  );

  if (!showText) {
    return onClick ? (
      <button type="button" onClick={onClick} className="focus:outline-none">
        {logoGraphic}
      </button>
    ) : (
      logoGraphic
    );
  }

  // With accompanying typography
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 ${onClick ? 'cursor-pointer group' : ''}`}
    >
      {logoGraphic}
      <div className="flex flex-col min-w-0">
        {textVariant === 'sidebar' && (
          <>
            <span className="text-base font-black tracking-tight text-white font-sans truncate group-hover:text-blue-400 transition-colors">
              MMA TrackLab
            </span>
            <span className="text-[11px] font-mono uppercase tracking-wider text-blue-400 font-bold truncate">
              {subtitle || 'Facilities Console'}
            </span>
          </>
        )}

        {textVariant === 'header' && (
          <>
            <span className="text-sm font-bold tracking-tight text-zinc-900 truncate">
              MMA ICT TrackLab
            </span>
            <span className="text-[10px] text-zinc-500 font-medium truncate">
              {subtitle || 'School Laboratory Management'}
            </span>
          </>
        )}

        {textVariant === 'hero' && (
          <>
            <span className="text-lg font-extrabold tracking-tight text-zinc-900 truncate">
              MMA ICT TrackLab
            </span>
            <span className="text-xs text-amber-600 font-mono font-bold tracking-wide uppercase">
              {subtitle || 'School Laboratory Management System'}
            </span>
          </>
        )}

        {textVariant === 'badge' && (
          <>
            <span className="text-xs font-black tracking-wider uppercase text-zinc-900">
              MMA INSTITUTE OF TECHNOLOGY
            </span>
            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
              {subtitle || 'ICT & Multimedia Arts Faculty'}
            </span>
          </>
        )}
      </div>
    </div>
  );
};
