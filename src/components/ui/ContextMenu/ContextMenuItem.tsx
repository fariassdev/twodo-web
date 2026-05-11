import React from 'react';
import { cn } from '../../../utils';

export interface ContextMenuItemProps {
  label: string;
  description?: string;
  icon?: string;
  danger?: boolean;
  isActive?: boolean;
  activeColor?: string;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
}

export function ContextMenuItem({
  label,
  description,
  icon,
  danger,
  isActive,
  activeColor,
  disabled,
  onClick,
  className,
}: ContextMenuItemProps) {
  return (
    <button
      className={cn(
        'group flex w-full items-center gap-3 px-4 py-3 text-left transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40',
        isActive ? 'bg-primary/5' : 'hover:bg-hover',
        className
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {icon && (
        <div className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all',
          isActive 
            ? cn('bg-surface-1 shadow-sm', activeColor || 'text-primary') 
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
      {(isActive !== undefined) && (
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
}
