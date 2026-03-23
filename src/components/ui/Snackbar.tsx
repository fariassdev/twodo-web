import React, { useEffect } from 'react';

interface SnackbarProps {
  open: boolean;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onClose: () => void;
  durationMs?: number;
}

export default function Snackbar({
  open,
  message,
  actionLabel,
  onAction,
  onClose,
  durationMs = 5000,
}: Readonly<SnackbarProps>) {
  useEffect(() => {
    if (!open) return;
    const timeoutId = window.setTimeout(() => onClose(), durationMs);
    return () => window.clearTimeout(timeoutId);
  }, [durationMs, onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed left-1/2 bottom-24 z-[70] w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
      <div className="rounded-xl border border-slate-700 bg-slate-800/95 backdrop-blur-sm px-4 py-3 shadow-xl">
        <div className="flex items-start gap-3">
          <p className="flex-1 text-sm text-slate-100">{message}</p>
          {actionLabel && onAction && (
            <button
              type="button"
              onClick={onAction}
              className="text-sm font-bold text-primary hover:text-primary/80 transition-colors"
            >
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
