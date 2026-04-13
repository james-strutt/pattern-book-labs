import * as React from "react"
import { cn } from "@/lib/utils"
import { LANDIQ_THEME } from '@/components/ui/landiq/theme'
import type { StatusBadgeProps } from '@/components/ui/landiq/types'

const StatusBadge = React.forwardRef<HTMLDivElement, StatusBadgeProps>(({
  className,
  variant = "draft",
  active = true,
  children,
  ...props
}, ref) => {
  const getVariantConfig = (variant: string, active: boolean): { background: string; border: string; color: string } => {
    const inactiveConfig = {
      background: LANDIQ_THEME.colors.greys.grey04,
      border: LANDIQ_THEME.colors.greys.grey04,
      color: LANDIQ_THEME.colors.text.dark,
    }

    const variantConfigs: Record<string, { background: string; border: string; color: string }> = {
      draft: active
        ? {
          background: LANDIQ_THEME.colors.status.info,
          border: LANDIQ_THEME.colors.status.info,
          color: LANDIQ_THEME.colors.text.light,
        }
        : inactiveConfig,
      building: active
        ? {
          background: LANDIQ_THEME.colors.status.info,
          border: LANDIQ_THEME.colors.status.info,
          color: LANDIQ_THEME.colors.text.light,
        }
        : inactiveConfig,
      preview: active
        ? {
          background: LANDIQ_THEME.colors.status.info,
          border: LANDIQ_THEME.colors.status.info,
          color: LANDIQ_THEME.colors.text.light,
        }
        : inactiveConfig,
      built: active
        ? {
          background: LANDIQ_THEME.colors.status.success,
          border: LANDIQ_THEME.colors.status.success,
          color: LANDIQ_THEME.colors.text.light,
        }
        : inactiveConfig,
      published: active
        ? {
          background: LANDIQ_THEME.colors.status.success,
          border: LANDIQ_THEME.colors.status.success,
          color: LANDIQ_THEME.colors.text.light,
        }
        : inactiveConfig,
      error: active
        ? {
          background: LANDIQ_THEME.colors.status.error,
          border: LANDIQ_THEME.colors.status.error,
          color: LANDIQ_THEME.colors.text.light,
        }
        : inactiveConfig,
      cancelled: active
        ? {
          background: LANDIQ_THEME.colors.status.error,
          border: LANDIQ_THEME.colors.status.error,
          color: LANDIQ_THEME.colors.text.light,
        }
        : inactiveConfig,
      retired: inactiveConfig,
    }

    return variantConfigs[variant] ?? inactiveConfig
  }

  const config = getVariantConfig(variant, active)

  const containerStyles: React.CSSProperties = {
    background: config.background,
    border: `1px solid ${config.border}`,
    color: config.color,
  }

  return (
    <div
      ref={ref}
      style={containerStyles}
      className={cn(
        "inline-flex flex-col items-center px-4 py-[3px] rounded-[61px] border",
        "font-['Public_Sans'] font-bold text-sm leading-[19px] text-center",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})

StatusBadge.displayName = "StatusBadge"

export { StatusBadge }
