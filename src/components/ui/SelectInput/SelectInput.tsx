import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../../utils';

const wrapperVariants = cva('relative flex items-center transition-all', {
  variants: {
    variant: {
      surface: 'rounded-lg border border-border-strong bg-background-dark has-[:focus]:ring-1 has-[:focus]:ring-primary',
      elevated: 'rounded-xl border border-border-subtle bg-surface-2/60 has-[:focus]:ring-1 has-[:focus]:ring-primary',
      soft: 'rounded-lg border border-primary/20 bg-primary/5 has-[:focus]:ring-1 has-[:focus]:ring-primary',
      chip: 'rounded-full border border-primary/25 bg-surface-1/75 has-[:focus]:ring-1 has-[:focus]:ring-primary',
      slate: 'rounded-lg border border-border-subtle bg-surface-1 has-[:focus]:ring-1 has-[:focus]:ring-primary',
    },
    size: {
      sm: 'h-9',
      md: 'h-11',
      lg: 'h-12',
    },
  },
  defaultVariants: {
    variant: 'surface',
    size: 'lg',
  },
});

const selectVariants = cva('w-full appearance-none bg-transparent text-surface-2 focus:outline-none', {
  variants: {
    typography: {
      base: 'text-sm font-normal',
      strong: 'text-sm font-semibold',
    },
  },
  defaultVariants: {
    typography: 'strong',
  },
});

export type SelectInputProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> &
  VariantProps<typeof wrapperVariants> &
  VariantProps<typeof selectVariants> & {
    leading?: React.ReactNode;
    trailing?: React.ReactNode;
    hideIndicator?: boolean;
    selectClassName?: string;
  };

const SelectInput = React.forwardRef<HTMLSelectElement, SelectInputProps>(function SelectInput(
  {
    children,
    className,
    selectClassName,
    leading,
    trailing,
    hideIndicator = false,
    variant,
    size,
    typography,
    id,
    ...props
  },
  ref,
) {
  const indicator = hideIndicator
    ? null
    : (trailing ?? <span className="material-symbols-outlined text-base text-surface-2/60">expand_more</span>);

  return (
    <div className={cn(wrapperVariants({ variant, size }), className)}>
      {leading ? (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 shrink-0 text-surface-2/60">
          {leading}
        </span>
      ) : null}
      
      <select 
        className={cn(
          selectVariants({ typography }), 
          'h-full w-full cursor-pointer bg-transparent',
          leading ? 'pl-10' : 'pl-4',
          indicator ? 'pr-10' : 'pr-4',
          selectClassName
        )} 
        id={id} 
        ref={ref} 
        {...props}
      >
        {children}
      </select>

      {indicator ? (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 shrink-0 text-surface-2/60">
          {indicator}
        </span>
      ) : null}
    </div>
  );
});

export default SelectInput;
