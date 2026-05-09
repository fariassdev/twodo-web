import React, { memo } from 'react';
import { motion } from 'motion/react';

interface CheckmarkProps {
  size?: number;
  className?: string;
  animate?: boolean;
}

const Checkmark: React.FC<CheckmarkProps> = ({ 
  size = 120, 
  className = '',
  animate = true
}) => {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="86 58 42 34"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      initial={animate ? { scale: 0.8, opacity: 0 } : undefined}
      animate={animate ? { scale: 1, opacity: 1 } : undefined}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Primary Background Circle */}
      <motion.path 
        fill="var(--color-primary)" 
        d="m121.6 68.7c-2.1-4.3-6.1-8.2-12.6-8.7-9.6-0.8-16.7 4.6-19 12-1.8 6 1.3 19.6 14.9 20 12.1 0.3 20.5-10.9 16.7-23.3z"
        initial={animate ? { pathLength: 0 } : undefined}
        animate={animate ? { pathLength: 1 } : undefined}
        transition={{ duration: 1, ease: "easeInOut" }}
      />
      
      {/* Dark "o" Inner Element (Surface 2) */}
      <motion.path 
        fill="var(--color-surface-2)" 
        d="m119 71.5c0.5 1.4 0.9 2.9 0.9 4.8 0 7-5.5 13.6-14.5 13.6-7.9 0-14.4-6-14.4-13.6 0-7.4 5.9-14.3 14.4-14.3 3.6 0 6.7 1.1 9.4 3.3l2.4-2.2c-2.9-2.6-6.6-4.4-11.6-4.4-9.8 0-17.8 7.7-17.8 17.4s7.2 17.4 17.6 17.4c9.4 0.1 18-7.2 18-17.2 0-2.6-0.5-5.3-1.6-7.3l-2.8 2.5z"
        initial={animate ? { opacity: 0 } : undefined}
        animate={animate ? { opacity: 1 } : undefined}
        transition={{ delay: 0.3, duration: 0.5 }}
      />
      
      {/* Dark Checkmark Element (Surface 2) */}
      <motion.path 
        fill="var(--color-surface-2)" 
        d="m122.2 60.3-18.7 18.4-6.1-6.1-2.7 2.8 8.8 8.5 21.5-20.9-2.8-2.7z"
        initial={animate ? { pathLength: 0, opacity: 0 } : undefined}
        animate={animate ? { pathLength: 1, opacity: 1 } : undefined}
        transition={{ delay: 0.6, duration: 0.5, ease: "easeOut" }}
      />
    </motion.svg>
  );
};

export default memo(Checkmark);
