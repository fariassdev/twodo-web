import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../../utils';

const listRowVariants = cva('relative flex items-center gap-4 border p-4 transition-all', {
  variants: {
    variant: {
      default: 'rounded-xl border-border-subtle bg-surface-1 text-surface-2',
      subtle: 'rounded-xl border-border-subtle bg-surface-1 text-surface-2',
      transparent: 'rounded-xl border-transparent bg-transparent text-surface-2',
      alert: 'rounded-xl border-danger/20 bg-danger/10 text-danger',
      success: 'rounded-xl border-primary/20 bg-primary/10 text-primary',
    },
    interactive: {
      true: 'cursor-pointer active:scale-[0.98] hover:bg-hover',
      false: '',
    },
    completed: {
      true: 'border-transparent bg-transparent opacity-60',
      false: '',
    },
  },
  defaultVariants: {
    variant: 'default',
    interactive: false,
    completed: false,
  },
});

export type ListRowProps = React.HTMLAttributes<HTMLElement> &
  VariantProps<typeof listRowVariants> & {
    as?: 'article' | 'div';
  };

export default function ListRow({
  as = 'article',
  className,
  variant,
  interactive,
  completed,
  ...props
}: Readonly<ListRowProps>): React.ReactElement {
  const Component = as;

  return <Component className={cn(listRowVariants({ variant, interactive, completed }), className)} {...props} />;
}
