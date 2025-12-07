/**
 * ABOUTME: SegmentedControl component for mutually exclusive mode selection
 * ABOUTME: Built on Radix UI ToggleGroup primitive with shadcn/ui styling
 */

'use client'

import * as React from 'react'
import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const segmentedControlVariants = cva(
  'inline-flex items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground',
  {
    variants: {
      size: {
        default: 'h-10',
        sm: 'h-9 text-sm',
        lg: 'h-11',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
)

const segmentedControlItemVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm',
  {
    variants: {
      size: {
        default: 'h-8',
        sm: 'h-7 text-xs',
        lg: 'h-9',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
)

type SegmentedControlProps = React.ComponentPropsWithoutRef<
  typeof ToggleGroupPrimitive.Root
> &
  VariantProps<typeof segmentedControlVariants>

const SegmentedControl = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Root>,
  SegmentedControlProps
>(({ className, size, ...props }, ref) => (
  <ToggleGroupPrimitive.Root
    ref={ref}
    className={cn(segmentedControlVariants({ size }), className)}
    {...props}
  />
))
SegmentedControl.displayName = ToggleGroupPrimitive.Root.displayName

type SegmentedControlItemProps = React.ComponentPropsWithoutRef<
  typeof ToggleGroupPrimitive.Item
> &
  VariantProps<typeof segmentedControlItemVariants>

const SegmentedControlItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  SegmentedControlItemProps
>(({ className, size, ...props }, ref) => (
  <ToggleGroupPrimitive.Item
    ref={ref}
    className={cn(segmentedControlItemVariants({ size }), className)}
    {...props}
  />
))
SegmentedControlItem.displayName = ToggleGroupPrimitive.Item.displayName

export { SegmentedControl, SegmentedControlItem }
