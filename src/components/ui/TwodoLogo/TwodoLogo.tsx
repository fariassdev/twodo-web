import React, { memo } from 'react';

interface TwodoLogoProps {
  /** Width of the logo. Height is calculated automatically to maintain aspect ratio (approx 2.79:1). */
  width?: number;
  /** Background color for the logo container path. Defaults to 'transparent'. */
  backgroundColor?: string;
  /** Additional CSS classes for styling or layout. */
  className?: string;
}

const TwodoLogo: React.FC<TwodoLogoProps> = ({ 
  width = 106, 
  backgroundColor = 'transparent', 
  className = '' 
}) => {
  // Original SVG viewBox: 22 57 106 38
  const originalWidth = 106;
  const originalHeight = 38;
  const aspectRatio = originalHeight / originalWidth;

  const height = Math.round(width * aspectRatio);

  return (
    <svg
      width={width}
      height={height}
      viewBox="22 57 106 38"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Twodo Logo"
    >
      {/* Background/Container Shape */}
      <path 
        fill={backgroundColor} 
        d="m126.2 0h-102.4c-13.1 0-23.8 10.7-23.8 24.6v100.8c0 13.2 10.7 24.6 25 24.6h101.2c13.1 0 23.8-10.7 23.8-24.6v-100.8c0-13.9-10.7-24.6-23.8-24.6z"
      />
      
      {/* Logo Icon */}
      <path 
        fill="var(--color-primary)" 
        d="m121.6 68.7c-2.1-4.3-6.1-8.2-12.6-8.7-9.6-0.8-16.7 4.6-19 12-1.8 6 1.3 19.6 14.9 20 12.1 0.3 20.5-10.9 16.7-23.3z"
      />
      
      {/* "tw" text elements */}
      <path 
        fill="var(--color-surface-3)" 
        d="m43.1 85.2c-0.7 0.4-1.7 0.8-3 0.8-1.9 0-2.9-0.9-2.9-3.1v-11.8h6.2v-5.1h-6.2v-6.8l-6.8 0.1v6.7h-4v5.1h4v12.6c0 5 2.7 7.5 7.6 7.5 2.3 0 4.4-0.3 6-1.1l-0.9-4.9z"
      />
      <path 
        fill="var(--color-surface-3)" 
        d="m79.3 66-4.7 17.6-5.3-17.6h-5.8l-5.4 17.6-4.8-17.6h-7.3l8.3 24.8h6.8l5.2-17.2 5.2 17.2h6.7l7.8-24.7h-6.8v-0.1z"
      />
      
      {/* "o" and checkmark elements */}
      <path 
        fill="var(--color-surface-2)" 
        d="m119 71.5c0.5 1.4 0.9 2.9 0.9 4.8 0 7-5.5 13.6-14.5 13.6-7.9 0-14.4-6-14.4-13.6 0-7.4 5.9-14.3 14.4-14.3 3.6 0 6.7 1.1 9.4 3.3l2.4-2.2c-2.9-2.6-6.6-4.4-11.6-4.4-9.8 0-17.8 7.7-17.8 17.4s7.2 17.4 17.6 17.4c9.4 0.1 18-7.2 18-17.2 0-2.6-0.5-5.3-1.6-7.3l-2.8 2.5z"
      />
      <path 
        fill="var(--color-surface-2)" 
        d="m122.2 60.3-18.7 18.4-6.1-6.1-2.7 2.8 8.8 8.5 21.5-20.9-2.8-2.7z"
      />
    </svg>
  );
};

export default memo(TwodoLogo);
