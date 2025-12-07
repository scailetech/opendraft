import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 ease-out disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive active:scale-[0.98] disabled:active:scale-100",
  {
      variants: {
        variant: {
          default:
            "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/95 shadow-sm",
          destructive:
            "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/95 shadow-sm",
          outline:
            "border border-input bg-background hover:bg-accent hover:text-accent-foreground active:bg-accent/80 hover:border-accent-foreground/20",
          secondary:
            "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/70",
          ghost:
            "hover:bg-accent hover:text-accent-foreground active:bg-accent/80",
          link: "text-primary underline-offset-4 hover:underline transition-all duration-200",
          brand:
            "bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/50 text-foreground active:bg-blue-600/40 shadow-sm",
        },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-6",
        icon: "h-8 w-8", // 32px standard icon button
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)

Button.displayName = "Button"

export { Button, buttonVariants }

