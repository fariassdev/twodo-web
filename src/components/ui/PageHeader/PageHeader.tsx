import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from '@tanstack/react-router';
import Button from '../Button';
import TwodoLogo from '../TwodoLogo';
import { useProfilesQuery } from '../../../lib/queryHooks';
import { cn } from '../../../utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showLogo?: boolean;
  showAvatars?: boolean;
  rightSlot?: React.ReactNode;
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
  backAction,
  className,
}: PageHeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: profiles = [] } = useProfilesQuery();

  const avatarsVisible = showAvatars && !rightSlot;

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

      </div>
    </div>
  );
}

