import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../../utils';

const segmentedControlVariants = cva('', {
  variants: {
    variant: {
      pill: 'flex h-11 items-center justify-center rounded-xl bg-primary/10 p-1',
      grid: 'grid gap-2',
    },
  },
  defaultVariants: {
    variant: 'pill',
  },
});

const segmentedItemVariants = cva('flex cursor-pointer items-center justify-center transition-all', {
  variants: {
    variant: {
      pill: 'h-full grow overflow-hidden rounded-lg px-2 text-sm font-bold',
      chip: 'rounded-xl border px-2 py-3 text-xs font-bold',
    },
    active: {
      true: '',
      false: '',
    },
  },
  compoundVariants: [
    {
      variant: 'pill',
      active: true,
      className: 'bg-background-dark shadow-sm text-primary',
    },
    {
      variant: 'pill',
      active: false,
      className: 'text-primary/60',
    },
    {
      variant: 'chip',
      active: true,
      className: 'border-primary bg-primary/15 text-primary',
    },
    {
      variant: 'chip',
      active: false,
      className: 'border-primary/20 bg-primary/5 text-primary/60',
    },
  ],
  defaultVariants: {
    variant: 'pill',
    active: false,
  },
});

type SegmentedControlProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof segmentedControlVariants>;

export function SegmentedControl({
  className,
  variant,
  ...props
}: Readonly<SegmentedControlProps>): React.ReactElement {
  return <div className={cn(segmentedControlVariants({ variant }), className)} {...props} />;
}

type SegmentedControlItemProps = React.LabelHTMLAttributes<HTMLLabelElement> &
  VariantProps<typeof segmentedItemVariants> & {
    active: boolean;
  };

export function SegmentedControlItem({
  className,
  variant,
  active,
  children,
  ...props
}: Readonly<SegmentedControlItemProps>): React.ReactElement {
  return (
    <label className={cn(segmentedItemVariants({ variant, active }), className)} {...props}>
      {children}
    </label>
  );
}
