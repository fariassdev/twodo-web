import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/cn';

const listRowVariants = cva('relative flex items-center gap-4 border p-4 transition-all', {
  variants: {
    variant: {
      default: 'rounded-2xl border-white/5 bg-[#1c221e]',
      subtle: 'rounded-[2.5rem] border-white/5 bg-[#141d1b]',
      transparent: 'rounded-2xl border-transparent bg-transparent',
      alert: 'rounded-2xl border-red-500/10 bg-[#2a1a19] text-white/90',
      success: 'rounded-2xl border-emerald-500/20 bg-emerald-950/20 text-emerald-100',
    },
    interactive: {
      true: 'cursor-pointer active:scale-[0.98]',
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
