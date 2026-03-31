import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/cn';

const bannerVariants = cva('rounded-xl border px-3 py-2 text-xs font-medium', {
  variants: {
    tone: {
      error: 'border-rose-400/30 bg-rose-500/10 text-rose-100',
      warning: 'border-amber-400/40 bg-amber-500/10 text-amber-100',
      neutral: 'border-slate-400/40 bg-slate-500/10 text-slate-200',
      success: 'border-primary/30 bg-primary/10 text-primary',
    },
  },
  defaultVariants: {
    tone: 'error',
  },
});

type ErrorBannerProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof bannerVariants> & {
    message: React.ReactNode;
  };

export default function ErrorBanner({
  className,
  tone,
  message,
  ...props
}: Readonly<ErrorBannerProps>): React.ReactElement {
  return (
    <div className={cn(bannerVariants({ tone }), className)} role="alert" {...props}>
      {message}
    </div>
  );
}
