import React from 'react';
import { cn } from '../../lib/cn';

type FormFieldProps = {
  label?: React.ReactNode;
  htmlFor?: string;
  error?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  labelClassName?: string;
  errorClassName?: string;
};

export default function FormField({
  label,
  htmlFor,
  error,
  children,
  className,
  labelClassName,
  errorClassName,
}: Readonly<FormFieldProps>): React.ReactElement {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label ? (
        <label className={cn('text-sm font-semibold text-slate-200', labelClassName)} htmlFor={htmlFor}>
          {label}
        </label>
      ) : null}
      {children}
      {error ? <p className={cn('text-xs font-medium text-rose-300', errorClassName)}>{error}</p> : null}
    </div>
  );
}
