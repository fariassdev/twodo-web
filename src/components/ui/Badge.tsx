import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/cn';

const badgeVariants = cva('inline-flex items-center justify-center rounded-full font-bold uppercase', {
  variants: {
    tone: {
      primary: 'bg-primary/15 text-primary/80',
      success: 'bg-[#1c362a] text-emerald-400',
      warning: 'bg-[#3f2a1d] text-amber-500',
      danger: 'bg-rose-500/15 text-rose-300',
      neutral: 'bg-white/10 text-slate-300',
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
