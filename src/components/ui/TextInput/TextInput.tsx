import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../../utils';

const wrapperVariants = cva('flex items-center gap-3 transition-all', {
  variants: {
    variant: {
      plain: '',
      surface: 'rounded-lg border border-primary/20 bg-background-dark px-4 has-[:focus]:ring-1 has-[:focus]:ring-primary',
      elevated: 'rounded-xl border border-primary/20 bg-surface-1 px-4 has-[:focus]:ring-1 has-[:focus]:ring-primary',
      soft: 'rounded-lg border border-primary/20 bg-primary/5 px-4 has-[:focus]:ring-1 has-[:focus]:ring-primary',
    },
    size: {
      md: 'h-12',
      lg: 'h-14',
      xl: 'h-16',
    },
  },
  defaultVariants: {
    variant: 'surface',
    size: 'md',
  },
});

const inputVariants = cva('w-full bg-transparent text-surface-2 placeholder:text-primary/40 focus:outline-none', {
  variants: {
    typography: {
      base: 'text-base font-normal',
      strong: 'text-base font-semibold',
      display: 'text-6xl font-black tracking-tight',
    },
  },
  defaultVariants: {
    typography: 'base',
  },
});

export type TextInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> &
  VariantProps<typeof wrapperVariants> &
  VariantProps<typeof inputVariants> & {
    leading?: React.ReactNode;
    trailing?: React.ReactNode;
    inputClassName?: string;
  };

export default function TextInput({
  className,
  inputClassName,
  leading,
  trailing,
  variant,
  size,
  typography,
  id,
  ...props
}: Readonly<TextInputProps>): React.ReactElement {
  return (
    <div className={cn(wrapperVariants({ variant, size }), className)}>
      {leading ? <span className="shrink-0 text-surface-2/60">{leading}</span> : null}
      <input className={cn(inputVariants({ typography }), inputClassName)} id={id} {...props} />
      {trailing ? <span className="shrink-0 text-surface-2/60">{trailing}</span> : null}
    </div>
  );
}
