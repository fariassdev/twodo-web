import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../../utils';

const iconBoxVariants = cva('flex shrink-0 items-center justify-center rounded-2xl', {
  variants: {
    tone: {
      primary: 'bg-primary/15 text-primary',
      neutral: 'bg-slate-600/20 text-slate-300',
      success: 'bg-emerald-500/15 text-emerald-400',
      warning: 'bg-amber-500/15 text-amber-400',
      danger: 'bg-rose-500/15 text-rose-300',
      custom: '',
    },
    size: {
      sm: 'size-10',
      md: 'size-12',
      lg: 'size-14',
    },
  },
  defaultVariants: {
    tone: 'neutral',
    size: 'lg',
  },
});

export type IconBoxProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof iconBoxVariants>;

export default function IconBox({
  className,
  tone,
  size,
  ...props
}: Readonly<IconBoxProps>): React.ReactElement {
  return <div className={cn(iconBoxVariants({ tone, size }), className)} {...props} />;
}
