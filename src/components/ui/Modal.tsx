import React from 'react';
import { cn } from '../../lib/cn';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  panelClassName?: string;
  closeOnOverlayClick?: boolean;
  overlayAriaLabel?: string;
};

export default function Modal({
  open,
  onClose,
  children,
  className,
  panelClassName,
  closeOnOverlayClick = true,
  overlayAriaLabel = 'Close dialog',
}: Readonly<ModalProps>): React.ReactElement | null {
  if (!open) {
    return null;
  }

  return (
    <div className={cn('fixed inset-0 z-50 flex items-center justify-center px-4', className)}>
      <button
        aria-label={overlayAriaLabel}
        className="absolute inset-0 bg-background-dark/80 backdrop-blur-sm"
        onClick={closeOnOverlayClick ? onClose : undefined}
        type="button"
      />
      <div className={cn('relative z-10 w-full max-w-sm pointer-events-auto', panelClassName)} role="dialog" aria-modal="true">
        {children}
      </div>
    </div>
  );
}
