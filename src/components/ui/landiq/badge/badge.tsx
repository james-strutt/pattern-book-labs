import * as React from "react"
import { cn } from "@/lib/utils"
import type { BadgeProps } from '@/components/ui/landiq/types'

const badgeVariants: Record<string, string> = {
  default: "bg-blue-100 text-blue-800 border-blue-200",
  success: "bg-green-100 text-green-800 border-green-200",
  warning: "bg-amber-100 text-amber-800 border-amber-200",
  error: "bg-red-100 text-red-800 border-red-200",
  info: "bg-sky-100 text-sky-800 border-sky-200",
  secondary: "bg-gray-100 text-gray-800 border-gray-200",
  outline: "bg-transparent text-gray-700 border-gray-300"
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(({ 
  className,
  variant = "default",
  children,
  ...props 
}, ref) => {
  return (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
        badgeVariants[variant] ?? badgeVariants.default,
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
})

Badge.displayName = "Badge"

export { Badge }
