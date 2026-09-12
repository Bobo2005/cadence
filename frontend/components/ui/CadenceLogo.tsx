import React from "react";

interface CadenceLogoProps {
  size?: number;
  className?: string;
  showWordmark?: boolean;
  wordmarkClassName?: string;
}

/**
 * CadenceLogo component matching the confirmed visual identity in docs/DESIGN-SYSTEM.md.
 * Heart outline with an integrated ECG pulse wave passing through it in electric teal (#2EE6A8).
 */
export default function CadenceLogo({
  size = 32,
  className = "",
  showWordmark = false,
  wordmarkClassName = "",
}: CadenceLogoProps) {
  return (
    <div className={`inline-flex items-center gap-2 sm:gap-2.5 shrink-0 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-300 hover:scale-105"
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        {/* Ambient glow filter */}
        <defs>
          <filter id="cadence-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#2EE6A8" floodOpacity="0.6" />
          </filter>
        </defs>

        {/* Heart Silhouette Outline */}
        <path
          d="M32 55.5C32 55.5 10 42 10 24C10 15 16.5 9 24.5 9C28.5 9 31.5 11.5 32 12.5C32.5 11.5 35.5 9 39.5 9C47.5 9 54 15 54 24C54 42 32 55.5 32 55.5Z"
          stroke="#2EE6A8"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="drop-shadow-[0_0_8px_rgba(46,230,168,0.4)]"
        />

        {/* Integrated ECG Pulse Wave traversing heart center */}
        <path
          d="M12 32 H 23 L 26 27 L 29 41 L 34 19 L 38 39 L 41 32 H 52"
          stroke="#2EE6A8"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#cadence-glow)"
        />
      </svg>

      {showWordmark && (
        <span
          className={`font-sans font-extrabold tracking-[0.18em] text-[#E8ECF1] uppercase whitespace-nowrap select-none ${
            wordmarkClassName || "text-sm sm:text-base tracking-widest"
          }`}
        >
          CADENCE
        </span>
      )}
    </div>
  );
}
