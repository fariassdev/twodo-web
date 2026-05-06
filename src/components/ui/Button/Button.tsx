import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../../utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 disabled:cursor-not-allowed disabled:opacity-60',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-background-dark hover:brightness-110 active:scale-[0.98]',
        ghost: 'bg-transparent text-primary/60 hover:text-primary/80',
        icon: 'rounded-full text-surface-2 hover:bg-hover',
        selector: 'border text-left',
        modalAction: 'text-surface-2 hover:bg-hover',
        danger: 'bg-danger/20 text-danger hover:bg-danger/30',
        subtle: 'border border-primary/20 bg-primary/5 text-surface-2/80 hover:border-primary/40 hover:bg-primary/10',
        action: 'size-16 bg-primary text-background-dark shadow-button hover:scale-110 active:scale-95 transition-all p-0',
      },
      size: {
        sm: 'h-9 rounded-md px-3 text-sm',
        md: 'h-12 rounded-lg px-4 text-sm',
        lg: 'h-14 rounded-lg px-5 text-base',
        icon: 'size-10 rounded-lg',
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
        className: 'border-primary bg-primary/10 text-surface-2',
      },
      {
        variant: 'selector',
        active: false,
        className: 'border-border-subtle text-surface-2 hover:bg-hover',
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
