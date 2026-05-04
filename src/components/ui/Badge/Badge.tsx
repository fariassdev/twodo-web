import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../../utils';

const badgeVariants = cva('inline-flex items-center justify-center rounded-full font-bold uppercase', {
  variants: {
    tone: {
      primary: 'bg-primary/15 text-primary',
      success: 'bg-success/15 text-success',
      warning: 'bg-warning/15 text-warning',
      danger: 'bg-danger/15 text-danger',
      neutral: 'bg-surface-3 text-slate-300',
    },
    size: {
      xs: 'px-1.5 py-0.5 text-[10px] tracking-[0.05em]',
      sm: 'px-2 py-1 text-xs tracking-[0.04em]',
      md: 'px-2.5 py-1 text-xs tracking-[0.05em]',
    },
  },
  defaultVariants: {
    tone: 'neutral',
    size: 'sm',
  },
});

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

export default function Badge({
  className,
  tone,
  size,
  ...props
}: Readonly<BadgeProps>): React.ReactElement {
  return <span className={cn(badgeVariants({ tone, size }), className)} {...props} />;
}
