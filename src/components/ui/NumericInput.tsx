import React, { ChangeEvent } from 'react';

export interface NumericInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string;
  onChange: (value: string) => void;
  allowDecimals?: boolean;
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
}

export function NumericInput({
  value,
  onChange,
  allowDecimals = true,
  className,
  placeholder,
  ...rest
}: NumericInputProps) {
  const sanitize = (raw: string) => {
    const normalized = raw.replace(',', '.');
    const filtered = allowDecimals ? normalized.replace(/[^0-9.]/g, '') : normalized.replace(/[^0-9]/g, '');

    if (!allowDecimals) return filtered;

    // Keep only the first decimal separator and at most two digits after it.
    const parts = filtered.split('.');
    const integer = parts[0];
    const decimal = parts.length > 1 ? parts[1] : '';

    if (parts.length === 1) return integer;
    if (decimal === '') return `${integer}.`;

    return `${integer}.${decimal.slice(0, 2)}`;
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(sanitize(event.target.value));
  };

  return (
    <input
      type="text"
      inputMode={allowDecimals ? 'decimal' : 'numeric'}
      pattern={allowDecimals ? '[0-9]*[.,]?[0-9]{0,2}' : '[0-9]*'}
      autoComplete="off"
      className={className}
      placeholder={placeholder}
      value={value}
      onChange={handleChange}
      {...rest}
    />
  );
}
