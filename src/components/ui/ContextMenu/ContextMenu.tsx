import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../../utils';
import Button from '../Button';

export type ContextMenuItemDef =
  | { type: 'header'; id: string; label: string }
  | { type: 'divider'; id: string }
  | {
      type: 'action';
      id: string;
      label: string;
      description?: string;
      icon?: string;
      danger?: boolean;
      disabled?: boolean;
      closeOnClick?: boolean;
      onClick: () => void;
    }
  | {
      type: 'checkbox';
      id: string;
      label: string;
      description?: string;
      icon?: string;
      checked: boolean;
      disabled?: boolean;
      closeOnClick?: boolean;
      onCheckedChange: (checked: boolean) => void;
    };

export interface ContextMenuProps {
  items: ContextMenuItemDef[];
  trigger?: React.ReactNode;
  ariaLabel?: string;
  menuClassName?: string;
}

export function ContextMenu({ items, trigger, ariaLabel = 'Open menu', menuClassName }: ContextMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    const onPointerDown = (event: PointerEvent | MouseEvent | TouchEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [menuOpen]);

  return (
    <div className="relative flex-shrink-0" ref={menuContainerRef}>
      {trigger ? (
        <div onClick={() => setMenuOpen(!menuOpen)} className="cursor-pointer">
          {trigger}
        </div>
      ) : (
        <Button
          variant="icon"
          size="icon"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={ariaLabel}
          className="text-surface-2/60 hover:text-surface-2"
        >
          <span className="material-symbols-outlined">more_vert</span>
        </Button>
      )}

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }} // easeOutExpo-ish
            style={{ transformOrigin: 'top right' }}
            className={cn(
              'absolute right-0 top-12 z-50 w-52 overflow-hidden rounded-2xl border border-border-subtle bg-surface-1 py-1 shadow-xl',
              menuClassName
            )}
          >
            {items.map((item) => {
              if (item.type === 'header') {
                return (
                  <div key={item.id} className="px-4 py-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-surface-2/30">
                      {item.label}
                    </span>
                  </div>
                );
              }

              if (item.type === 'divider') {
                return <div key={item.id} className="mx-1.5 h-px bg-border-subtle/50" />;
              }

              const isCheckbox = item.type === 'checkbox';
              const isActive = isCheckbox ? item.checked : undefined;
              const icon = item.icon;
              const label = item.label;
              const description = item.description;
              const danger = item.type === 'action' ? item.danger : false;
              const disabled = item.disabled;

              const handleClick = () => {
                if (item.disabled) return;
                
                if (item.type === 'action') {
                  item.onClick();
                } else if (item.type === 'checkbox') {
                  item.onCheckedChange(!item.checked);
                }

                if (item.closeOnClick !== false) {
                  setMenuOpen(false);
                }
              };

              return (
                <button
                  key={item.id}
                  className={cn(
                    'group flex w-full items-center gap-3 px-4 py-3 text-left transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40',
                    isActive ? 'bg-primary/5' : 'hover:bg-hover'
                  )}
                  disabled={disabled}
                  onClick={handleClick}
                  type="button"
                >
                  {icon && (
                    <div className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all',
                      isActive 
                        ? 'bg-surface-1 shadow-sm text-primary'
                        : danger 
                          ? 'bg-danger/10 text-danger' 
                          : 'bg-surface-2/5 text-surface-2/60'
                    )}>
                      <span className={cn('material-symbols-outlined text-[20px]', isActive && 'filled-icon')}>{icon}</span>
                    </div>
                  )}
                  <div className={cn("flex flex-col gap-0.5", !icon && "pl-2")}>
                    <span className={cn(
                      'text-sm font-bold transition-colors', 
                      isActive ? 'text-surface-2' : danger ? 'text-danger' : 'text-surface-2/80'
                    )}>
                      {label}
                    </span>
                    {description && (
                      <span className="text-[11px] leading-tight text-surface-2/40">
                        {description}
                      </span>
                    )}
                  </div>
                  {isCheckbox && (
                    <div className="ml-auto flex items-center self-center pl-2">
                      <div className={cn(
                        'h-5 w-5 rounded-full border-2 transition-all flex items-center justify-center',
                        isActive ? 'border-primary bg-primary' : 'border-surface-2/20'
                      )}>
                        {isActive && <span className="material-symbols-outlined text-[14px] font-bold text-background-dark">check</span>}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
