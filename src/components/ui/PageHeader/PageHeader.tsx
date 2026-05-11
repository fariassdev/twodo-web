import React, { useEffect, useState, useRef, Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from '@tanstack/react-router';
import Button from '../Button';
import TwodoLogo from '../TwodoLogo';
import { useProfilesQuery } from '../../../lib/queryHooks';
import { cn } from '../../../utils';
import { ContextMenuItem } from '../ContextMenu/ContextMenuItem';

export type PageHeaderMenuItem = {
  id: string;
  label: string;
  icon?: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  separatorBefore?: boolean;
  closeOnClick?: boolean;
  description?: string;
  isActive?: boolean;
  activeColor?: string;
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
  children?: React.ReactNode;
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
  const menuContainerRef = useRef<HTMLDivElement>(null);
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
            <span className="text-[10px] font-black text-primary tracking-[0.2em] uppercase truncate">
              {subtitle}
            </span>
          )}
          <h1 className="text-sm font-bold text-surface-2/80 tracking-tight first-letter:uppercase truncate">
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
          <div className="relative flex-shrink-0" ref={menuContainerRef}>
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
                <div
                  className={cn(
                    'absolute right-0 top-12 z-50 w-52 overflow-hidden rounded-2xl border border-border-subtle bg-surface-1 py-1 shadow-xl',
                    rightMenu.menuClassName,
                  )}
                >
                  {rightMenu.items.map((item) => (
                    <Fragment key={item.id}>
                      {item.separatorBefore ? <div className="mx-3 h-px bg-border-subtle" /> : null}
                      <ContextMenuItem
                        label={item.label}
                        description={item.description}
                        icon={item.icon}
                        danger={item.danger}
                        isActive={item.isActive}
                        activeColor={item.activeColor}
                        disabled={item.disabled}
                        onClick={() => {
                          if (item.closeOnClick !== false) {
                            setMenuOpen(false);
                          }
                          item.onClick();
                        }}
                      />
                    </Fragment>
                  ))}
                  {rightMenu.children && (
                    <div>
                      {rightMenu.children}
                    </div>
                  )}
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

