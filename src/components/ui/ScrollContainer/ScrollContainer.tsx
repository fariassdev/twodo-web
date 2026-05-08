import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../../utils';

export interface ScrollContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hideArrows?: boolean;
  fadeEdges?: boolean;
  scrollClassName?: string;
}

export const ScrollContainer = ({ 
  children, 
  className, 
  scrollClassName, 
  hideArrows = false, 
  fadeEdges = true, 
  ...props 
}: ScrollContainerProps) => {
  const [scrollState, setScrollState] = useState<'none' | 'start' | 'middle' | 'end'>('none');
  const containerRef = useRef<HTMLDivElement>(null);

  const checkScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const { scrollLeft, offsetWidth, scrollWidth } = el;
    
    if (scrollWidth <= offsetWidth) return setScrollState('none');
    if (scrollLeft <= 20) return setScrollState('start');
    if (scrollLeft + offsetWidth >= scrollWidth - 20) return setScrollState('end');
    setScrollState('middle');
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    const observer = new ResizeObserver(checkScroll);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => {
      window.removeEventListener('resize', checkScroll);
      observer.disconnect();
    };
  }, [children]);

  const masks = {
    start: 'linear-gradient(to right, black 85%, transparent 100%)',
    middle: 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)',
    end: 'linear-gradient(to left, black 85%, transparent 100%)',
    none: '',
  };

  const showRightArrow = !hideArrows && scrollState !== 'end' && scrollState !== 'none';
  const showLeftArrow = !hideArrows && scrollState !== 'start' && scrollState !== 'none';

  return (
    <div className={cn("relative group/scroll-container", className)} {...props}>
      <div
        ref={containerRef}
        onScroll={checkScroll}
        style={fadeEdges ? { maskImage: masks[scrollState], WebkitMaskImage: masks[scrollState] } : {}}
        className={cn("flex gap-2 overflow-x-auto no-scrollbar scroll-smooth", scrollClassName)}
      >
        {children}
      </div>

      <AnimatePresence>
        {showRightArrow && (
          <motion.div 
            animate={{ 
              x: [0, 3, 0],  
            }}
            transition={{ 
              x: { repeat: Infinity, duration: 1.5, ease: "easeInOut" },
            }}
            className="absolute right-0 top-0 bottom-0 flex items-center pr-1 pointer-events-none"
          >
            <div className="bg-background-dark/40 backdrop-blur-sm rounded-full p-1.5 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary/40 text-sm font-black leading-none">chevron_right</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLeftArrow && (
          <motion.div 
            animate={{ 
              x: [0, -3, 0], 
            }}
            transition={{ 
              x: { repeat: Infinity, duration: 1.5, ease: "easeInOut" },
            }}
            className="absolute left-0 top-0 bottom-0 flex items-center pl-1 pointer-events-none"
          >
            <div className="bg-background-dark/40 backdrop-blur-sm rounded-full p-1.5 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary/40 text-sm font-black leading-none">chevron_left</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ScrollContainer;
