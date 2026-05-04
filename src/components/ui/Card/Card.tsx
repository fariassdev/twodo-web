import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../../utils';

const cardVariants = cva('border', {
  variants: {
    variant: {
      surface: 'border-primary/20 bg-primary/5',
      elevated: 'border-white/5 bg-surface-2 shadow-sm',
      modal: 'border-border-subtle bg-surface-2 shadow-xl',
      info: 'border-primary/30 bg-primary/10',
      error: 'border-rose-400/30 bg-rose-500/10',
      subtle: 'border-primary/10 bg-background-dark/80 backdrop-blur-md',
    },
    radius: {
      xl: 'rounded-xl',
      '2xl': 'rounded-2xl',
      '3xl': 'rounded-3xl',
    },
    padding: {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-5',
      xl: 'p-6',
    },
    interactive: {
      true: 'cursor-pointer transition-all active:scale-[0.98]',
      false: '',
    },
  },
  defaultVariants: {
    variant: 'surface',
    radius: '2xl',
    padding: 'md',
    interactive: false,
  },
});

export type CardProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardVariants>;

export default function Card({
  className,
  variant,
  radius,
  padding,
  interactive,
  ...props
}: Readonly<CardProps>): React.ReactElement {
  return <div className={cn(cardVariants({ variant, radius, padding, interactive }), className)} {...props} />;
}
