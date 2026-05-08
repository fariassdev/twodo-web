import React, { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../../utils';

const wrapperVariants = cva('flex items-center gap-3 transition-all', {
  variants: {
    variant: {
      plain: '',
      surface: 'rounded-lg border border-primary/20 bg-background-dark px-4 has-[:focus]:ring-1 has-[:focus]:ring-primary',
      elevated: 'rounded-xl border border-primary/10 bg-surface-1 px-4 has-[:focus]:ring-1 has-[:focus]:ring-primary',
      soft: 'rounded-lg border border-primary/20 bg-primary/5 px-4 has-[:focus]:ring-1 has-[:focus]:ring-primary',
      chip: 'rounded-full border border-primary/25 bg-surface-1/75 px-3 has-[:focus]:ring-1 has-[:focus]:ring-primary',
    },
    size: {
      sm: 'h-11',
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

const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ className, inputClassName, leading, trailing, variant, size, typography, id, ...props }, ref) => {
    const internalRef = React.useRef<HTMLInputElement>(null);
    
    React.useImperativeHandle(ref, () => internalRef.current as HTMLInputElement);

    const handleInputClick = () => {
      if (props.type === 'date' && internalRef.current) {
        try {
          // Modern way to trigger date picker
          internalRef.current.showPicker();
        } catch (e) {
          // Fallback for older browsers
          internalRef.current.focus();
        }
      }
    };

    return (
      <label 
        className={cn(
          wrapperVariants({ variant, size }), 
          props.type === 'date' && "cursor-pointer",
          className
        )}
        htmlFor={id}
      >
        {leading ? <span className="shrink-0 text-surface-2/60">{leading}</span> : null}
        <input
          ref={internalRef}
          className={cn(inputVariants({ typography }), inputClassName)}
          id={id}
          {...props}
          onClick={(e) => {
            handleInputClick();
            props.onClick?.(e);
          }}
        />
        {trailing ? <span className="shrink-0 text-surface-2/60">{trailing}</span> : null}
      </label>
    );
  }
);

TextInput.displayName = 'TextInput';

export default TextInput;
