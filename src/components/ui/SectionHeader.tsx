import React from 'react';
import { cn } from '../../lib/cn';

type SectionHeaderProps = React.HTMLAttributes<HTMLHeadingElement> & {
  as?: 'h2' | 'h3' | 'h4';
};

export default function SectionHeader({
  as = 'h3',
  className,
  children,
  ...props
}: Readonly<SectionHeaderProps>): React.ReactElement {
  const Component = as;

  return (
    <Component
      className={cn('px-1 text-sm font-bold uppercase tracking-widest text-slate-500', className)}
      {...props}
    >
      {children}
    </Component>
  );
}
