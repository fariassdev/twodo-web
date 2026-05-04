import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../../utils';

const wrapperVariants = cva('flex items-center gap-3 transition-all', {
  variants: {
    variant: {
      surface: 'rounded-lg border border-primary/20 bg-background-dark px-4 has-[:focus]:ring-1 has-[:focus]:ring-primary',
      elevated: 'rounded-xl border border-primary/20 bg-slate-800/60 px-4 has-[:focus]:ring-1 has-[:focus]:ring-primary',
      soft: 'rounded-lg border border-primary/20 bg-primary/5 px-4 has-[:focus]:ring-1 has-[:focus]:ring-primary',
      chip: 'rounded-full border border-primary/25 bg-[#10223d]/75 px-3 has-[:focus]:ring-1 has-[:focus]:ring-primary',
      slate: 'rounded-lg border border-slate-700 bg-slate-800 px-2 has-[:focus]:ring-1 has-[:focus]:ring-primary',
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

const selectVariants = cva('w-full appearance-none bg-transparent text-slate-100 focus:outline-none', {
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
    : (trailing ?? <span className="material-symbols-outlined text-base text-slate-300">expand_more</span>);

  return (
    <div className={cn(wrapperVariants({ variant, size }), className)}>
      {leading ? <span className="shrink-0 text-slate-400">{leading}</span> : null}
      <select className={cn(selectVariants({ typography }), selectClassName)} id={id} ref={ref} {...props}>
        {children}
      </select>
      {indicator ? <span className="pointer-events-none shrink-0 text-slate-400">{indicator}</span> : null}
    </div>
  );
});

export default SelectInput;
