import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from '@tanstack/react-router';
import Button from '../Button';
import TwodoLogo from '../TwodoLogo';
import { useProfilesQuery } from '../../../lib/queryHooks';
import { cn } from '../../../utils';

export type PageHeaderMenuItem = {
  id: string;
  label: string;
  icon?: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  separatorBefore?: boolean;
};

export type PageHeaderMenu = {
  ariaLabel: string;
  closeAriaLabel?: string;
  items: PageHeaderMenuItem[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerIcon?: string;
  menuClassName?: string;
  overlayClassName?: string;
};

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showLogo?: boolean;
  showAvatars?: boolean;
  rightSlot?: React.ReactNode;
  rightMenu?: PageHeaderMenu;
  backAction?: {
    onClick: () => void;
    ariaLabel?: string;
  };
  className?: string;
}

export default function PageHeader({
  title,
  subtitle,
  showLogo = true,
  showAvatars = true,
  rightSlot,
  rightMenu,
  backAction,
  className,
}: PageHeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: profiles = [] } = useProfilesQuery();

  const [internalMenuOpen, setInternalMenuOpen] = useState(false);
  const menuOpen = rightMenu?.open ?? internalMenuOpen;

  const setMenuOpen = (open: boolean) => {
    rightMenu?.onOpenChange?.(open);
    if (rightMenu?.open === undefined) {
      setInternalMenuOpen(open);
    }
  };

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  const avatarsVisible = showAvatars && !rightSlot && !rightMenu;

  return (
    <div className={cn("sticky top-0 z-50 w-full flex items-center justify-between px-4 py-6 border-b border-border-subtle bg-background-dark/90 backdrop-blur-xl", className)}>
      <div className="flex items-center gap-3 min-w-0 flex-1 mr-4">
        {backAction && (
          <Button
            variant="icon"
            size="icon"
            onClick={backAction.onClick}
            aria-label={backAction.ariaLabel || t('topBar.back')}
            className="text-surface-2/60 hover:text-surface-2 -ml-2 flex-shrink-0"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </Button>
        )}
        {showLogo && (
          <Link to="/" className="cursor-pointer active:scale-95 transition-all duration-200 hover:opacity-80 flex-shrink-0">
            <TwodoLogo width={88} />
          </Link>
        )}
        <div className={cn("flex flex-col py-0.5 min-w-0", showLogo && "border-l border-border-subtle pl-4")}>
          {subtitle && (
            <span className="text-[10px] font-black text-primary tracking-[0.2em] uppercase leading-none mb-1.5 truncate">
              {subtitle}
            </span>
          )}
          <h1 className="text-sm font-bold text-surface-2/80 leading-none tracking-tight first-letter:uppercase truncate">
            {title}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {avatarsVisible && (
           <div
            className="flex -space-x-2 cursor-pointer active:scale-95 transition-transform flex-shrink-0"
            onClick={() => navigate({ to: '/profile' })}
          >
            {profiles.slice(0, 2).map((p, i) => (
              <div
                key={p.id}
                className={cn(
                  "w-8 h-8 rounded-full border-2 border-background-dark flex items-center justify-center overflow-hidden",
                  i === 0 ? "bg-surface-1" : "bg-primary/20",
                  i === 0 ? "z-10" : "z-0"
                )}
              >
                {p.avatar_url ? (
                  <img src={p.avatar_url} alt={p.name || ''} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] font-semibold text-primary">
                    {p.name?.[0]?.toUpperCase() || '?'}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
        
        {rightSlot}

        {rightMenu && (
          <div className="relative flex-shrink-0">
            <Button
              variant="icon"
              size="icon"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={rightMenu.ariaLabel}
              className="text-surface-2/60 hover:text-surface-2"
            >
              <span className="material-symbols-outlined">{rightMenu.triggerIcon || 'more_vert'}</span>
            </Button>

            {menuOpen && (
              <>
                <button
                  aria-label={rightMenu.closeAriaLabel || 'Close menu'}
                  className={cn('fixed inset-0 z-40 cursor-default bg-transparent', rightMenu.overlayClassName)}
                  onClick={() => setMenuOpen(false)}
                  type="button"
                />
                <div
                  className={cn(
                    'absolute right-0 top-12 z-50 w-52 overflow-hidden rounded-2xl border border-border-subtle bg-surface-1 py-1 shadow-xl',
                    rightMenu.menuClassName,
                  )}
                >
                  {rightMenu.items.map((item) => (
                    <React.Fragment key={item.id}>
                      {item.separatorBefore ? <div className="mx-3 h-px bg-border-subtle" /> : null}
                      <button
                        className={cn(
                          'flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50',
                          item.danger ? 'text-danger' : 'text-surface-2',
                        )}
                        disabled={item.disabled}
                        onClick={() => {
                          setMenuOpen(false);
                          item.onClick();
                        }}
                        type="button"
                      >
                        {item.icon ? (
                          <span className={cn('material-symbols-outlined text-[20px]', item.danger ? 'text-danger' : 'text-surface-2/60')}>
                            {item.icon}
                          </span>
                        ) : null}
                        <span>{item.label}</span>
                      </button>
                    </React.Fragment>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

