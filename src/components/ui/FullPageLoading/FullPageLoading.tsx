import React from 'react';
import TwodoLogo from '../TwodoLogo';

interface FullPageLoadingProps {
  /** Optional message to display below the spinner */
  message?: string;
  /** Whether to show the background overlay. Defaults to true. */
  withBackground?: boolean;
}

const FullPageLoading: React.FC<FullPageLoadingProps> = ({ 
  message,
  withBackground = true 
}) => {
  return (
    <div className={`
      flex flex-col items-center justify-center min-h-screen w-full
      ${withBackground ? 'bg-background-dark' : 'bg-transparent'}
      transition-colors duration-500
    `}>
      <div className="relative flex items-center justify-center w-48 h-48">
        {/* Spinner Background Circle */}
        <div className="absolute inset-0 rounded-full border-[3px] border-primary/5"></div>
        
        {/* Animated Spinner Track */}
        <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-primary/40 animate-twodo-spin"></div>
        
        <div className="flex flex-col items-center justify-center relative z-10">
          {/* Logo with Pulse Animation */}
          <div className="animate-twodo-pulse">
            <TwodoLogo width={120} />
          </div>

          {/* Message */}
          {message && (
            <p className="mt-2 text-surface-2/40 font-medium tracking-wide animate-pulse">
              {message}
            </p>
          )}
        </div>
      </div>

    </div>
  );
};

export default FullPageLoading;
