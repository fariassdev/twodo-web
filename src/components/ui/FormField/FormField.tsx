import React from 'react';
import { cn } from '../../../utils';

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
        <label className={cn('text-sm font-semibold text-surface-2/80', labelClassName)} htmlFor={htmlFor}>
          {label}
        </label>
      ) : null}
      {children}
      {error ? <p className={cn('text-xs font-medium text-danger', errorClassName)}>{error}</p> : null}
    </div>
  );
}
