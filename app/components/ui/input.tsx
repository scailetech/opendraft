import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "autoComplete"> {
  /**
   * Autocomplete attribute for accessibility and browser autofill support.
   * Should be set based on input purpose (e.g., "email", "current-password", "name").
   * Maps to the HTML `autoComplete` attribute.
   */
  autocomplete?: React.InputHTMLAttributes<HTMLInputElement>["autoComplete"]
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, autocomplete, ...props }, ref) => {
    // Determine autocomplete value based on type if not explicitly provided
    const autoCompleteValue = React.useMemo(() => {
      if (autocomplete !== undefined) {
        return autocomplete
      }
      // Infer autocomplete from type for common cases
      if (type === "email") {
        return "email"
      }
      if (type === "password") {
        return "current-password"
      }
      return undefined
    }, [autocomplete, type])

    return (
      <input
        type={type}
        autoComplete={autoCompleteValue}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
          "hover:border-input/80 focus:border-ring focus:shadow-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }

