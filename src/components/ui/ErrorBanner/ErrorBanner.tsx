import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../../utils';

const bannerVariants = cva('rounded-xl border px-3 py-2 text-xs font-medium', {
  variants: {
    tone: {
      error: 'border-danger/30 bg-danger/10 text-danger',
      warning: 'border-warning/40 bg-warning/10 text-warning',
      neutral: 'border-surface-2/40 bg-surface-2/10 text-surface-2',
      success: 'border-success/30 bg-success/10 text-success',
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
