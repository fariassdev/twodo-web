import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 disabled:cursor-not-allowed disabled:opacity-60',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-background-dark hover:brightness-110 active:scale-[0.98]',
        ghost: 'bg-transparent text-primary/60 hover:text-primary/80',
        icon: 'rounded-full text-slate-100 hover:bg-primary/10',
        selector: 'border text-left',
        modalAction: 'text-slate-100 hover:bg-slate-700',
        danger: 'bg-rose-500/20 text-rose-50 hover:bg-rose-500/30',
        subtle: 'border border-primary/20 bg-primary/5 text-slate-200 hover:border-primary/40 hover:bg-primary/10',
      },
      size: {
        sm: 'h-9 rounded-md px-3 text-sm',
        md: 'h-12 rounded-lg px-4 text-sm',
        lg: 'h-14 rounded-xl px-5 text-base',
        icon: 'size-10 rounded-full',
        menu: 'w-full px-4 py-3 text-sm',
      },
      active: {
        true: '',
        false: '',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    compoundVariants: [
      {
        variant: 'selector',
        active: true,
        className: 'border-primary bg-primary/10 text-slate-100',
      },
      {
        variant: 'selector',
        active: false,
        className: 'border-slate-700 text-slate-100 hover:bg-slate-700/50',
      },
      {
        variant: 'modalAction',
        size: 'menu',
        className: 'text-center font-medium transition-colors',
      },
      {
        variant: 'ghost',
        size: 'sm',
        className: 'h-auto rounded-none px-0 py-0 text-sm',
      },
      {
        variant: 'icon',
        size: 'icon',
        className: 'p-0',
      },
    ],
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      active: false,
      fullWidth: false,
    },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean;
    startIcon?: React.ReactNode;
    endIcon?: React.ReactNode;
  };

export default function Button({
  children,
  className,
  variant,
  size,
  active,
  fullWidth,
  loading = false,
  disabled,
  startIcon,
  endIcon,
  type = 'button',
  ...props
}: Readonly<ButtonProps>): React.ReactElement {
  const isDisabled = disabled || loading;

  return (
    <button
      className={cn(buttonVariants({ variant, size, active, fullWidth }), className)}
      disabled={isDisabled}
      type={type}
      {...props}
    >
      {loading ? (
        <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {!loading && startIcon ? startIcon : null}
      {children}
      {!loading && endIcon ? endIcon : null}
    </button>
  );
}
