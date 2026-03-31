import React, { useEffect, useMemo, useState } from 'react';
import { cn } from '../../lib/cn';

export type TopBarAction = {
  ariaLabel: string;
  icon: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
};

export type TopBarMenuItem = {
  id: string;
  label: string;
  icon?: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  separatorBefore?: boolean;
};

export type TopBarMenu = {
  ariaLabel: string;
  closeAriaLabel?: string;
  items: TopBarMenuItem[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerIcon?: string;
  menuClassName?: string;
  overlayClassName?: string;
};

type TopBarProps = {
  title: string;
  titleIcon?: string;
  leftAction?: TopBarAction;
  rightSlot?: React.ReactNode;
  rightMenu?: TopBarMenu;
  containerClassName?: string;
  sticky?: boolean;
};

export default function TopBar({
  title,
  titleIcon,
  leftAction,
  rightSlot,
  rightMenu,
  containerClassName,
  sticky = true,
}: TopBarProps) {
  const [internalMenuOpen, setInternalMenuOpen] = useState(false);

  const menuOpen = rightMenu?.open ?? internalMenuOpen;

  const setMenuOpen = (open: boolean) => {
    rightMenu?.onOpenChange?.(open);
    if (rightMenu?.open === undefined) {
      setInternalMenuOpen(open);
    }
  };

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  const headerClassName = useMemo(
    () =>
      cn(
        sticky && 'sticky top-0',
        'z-30 border-b border-primary/10 bg-background-dark/80 backdrop-blur-md',
        containerClassName,
      ),
    [sticky, containerClassName],
  );

  return (
    <header className={headerClassName}>
      <div className="mx-auto flex max-w-md items-center px-4 py-4">
        <div className="relative flex min-h-10 w-full items-center justify-between gap-3">
          <div className="flex w-10 shrink-0 items-center justify-start">
            {leftAction ? (
              <button
                aria-label={leftAction.ariaLabel}
                className={cn(
                  'flex size-10 items-center justify-center rounded-full text-slate-100 transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70',
                  leftAction.className,
                )}
                disabled={leftAction.disabled}
                onClick={leftAction.onClick}
                type="button"
              >
                <span className="material-symbols-outlined">{leftAction.icon}</span>
              </button>
            ) : (
              <div aria-hidden="true" className="size-10" />
            )}
          </div>

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-16">
            <div className="flex min-w-0 items-center gap-2">
              {titleIcon ? (
                <span className="material-symbols-outlined text-2xl text-primary">{titleIcon}</span>
              ) : null}
              <h1 className="truncate text-center text-xl font-bold tracking-tight">{title}</h1>
            </div>
          </div>

          <div className="relative flex min-w-10 shrink-0 items-center justify-end">
            {rightSlot ? (
              rightSlot
            ) : rightMenu ? (
              <>
                <button
                  aria-label={rightMenu.ariaLabel}
                  className="flex size-10 items-center justify-center rounded-full text-slate-100 transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
                  onClick={() => setMenuOpen(!menuOpen)}
                  type="button"
                >
                  <span className="material-symbols-outlined">{rightMenu.triggerIcon ?? 'more_vert'}</span>
                </button>

                {menuOpen ? (
                  <>
                    <button
                      aria-label={rightMenu.closeAriaLabel ?? 'Close menu'}
                      className={cn('fixed inset-0 z-40 cursor-default bg-transparent', rightMenu.overlayClassName)}
                      onClick={() => setMenuOpen(false)}
                      type="button"
                    />
                    <div
                      className={cn(
                        'absolute right-0 top-12 z-50 w-52 overflow-hidden rounded-2xl border border-slate-700 bg-slate-800 py-1 shadow-xl',
                        rightMenu.menuClassName,
                      )}
                    >
                      {rightMenu.items.map((item) => (
                        <React.Fragment key={item.id}>
                          {item.separatorBefore ? <div className="mx-3 h-px bg-slate-700/60" /> : null}
                          <button
                            className={cn(
                              'flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50',
                              item.danger ? 'text-rose-500' : 'text-slate-100',
                            )}
                            disabled={item.disabled}
                            onClick={() => {
                              setMenuOpen(false);
                              item.onClick();
                            }}
                            type="button"
                          >
                            {item.icon ? (
                              <span className={cn('material-symbols-outlined text-[20px]', item.danger ? 'text-rose-500' : 'text-slate-400')}>
                                {item.icon}
                              </span>
                            ) : null}
                            <span>{item.label}</span>
                          </button>
                        </React.Fragment>
                      ))}
                    </div>
                  </>
                ) : null}
              </>
            ) : (
              <div aria-hidden="true" className="size-10" />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
