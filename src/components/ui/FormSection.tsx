import React from 'react';
import { cn } from '../../lib/cn';
import Card from './Card';

type FormSectionProps = React.HTMLAttributes<HTMLDivElement> & {
  asCard?: boolean;
};

export default function FormSection({
  className,
  asCard = true,
  children,
  ...props
}: Readonly<FormSectionProps>): React.ReactElement {
  if (!asCard) {
    return (
      <div className={cn('flex flex-col gap-4 rounded-xl border border-primary/20 bg-primary/5 p-5', className)} {...props}>
        {children}
      </div>
    );
  }

  return (
    <Card className={cn('flex flex-col gap-4', className)} padding="lg" radius="xl" variant="surface" {...props}>
      {children}
    </Card>
  );
}
