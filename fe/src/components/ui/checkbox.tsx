import * as React from "react"
import { cn } from "@/lib/utils"

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, onChange, ...props }, ref) => {
    return (
      <span className="relative inline-flex items-center justify-center">
        <input
          type="checkbox"
          ref={ref}
          checked={checked}
          onChange={(e) => {
            onCheckedChange?.(e.target.checked)
            onChange?.(e)
          }}
          className={cn(
            "peer h-4 w-4 shrink-0 appearance-none rounded-sm border border-brand-ink bg-brand-canvas ring-offset-brand-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 checked:bg-brand-primary checked:border-brand-primary",
            className
          )}
          {...props}
        />
        <svg
          className="absolute pointer-events-none size-3 text-brand-on-primary opacity-0 peer-checked:opacity-100 transition-opacity"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
    )
  }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
