import React from 'react'
import { LANDIQ_THEME } from '@/components/ui/landiq/theme'
import type { StatusLabelProps } from '@/components/ui/landiq/types'

const DEFAULT_CONFIG = {
  background: LANDIQ_THEME.colors.info.blue,
  border: LANDIQ_THEME.colors.info.blue,
  color: LANDIQ_THEME.colors.text.light,
}

const VARIANT_CONFIG: Record<string, { background: string; border: string; color: string }> = {
  information: DEFAULT_CONFIG,
  success: {
    background: LANDIQ_THEME.colors.status.successGreen,
    border: LANDIQ_THEME.colors.status.successGreen,
    color: LANDIQ_THEME.colors.text.light,
  },
  warning: {
    background: LANDIQ_THEME.colors.status.warningOrange,
    border: LANDIQ_THEME.colors.status.warningOrange,
    color: LANDIQ_THEME.colors.text.light,
  },
  error: {
    background: LANDIQ_THEME.colors.status.errorRed,
    border: LANDIQ_THEME.colors.status.errorRed,
    color: LANDIQ_THEME.colors.text.light,
  },
  neutral: {
    background: LANDIQ_THEME.colors.greys.grey04,
    border: LANDIQ_THEME.colors.greys.grey04,
    color: LANDIQ_THEME.colors.text.dark,
  },
}

export const StatusLabel: React.FC<StatusLabelProps> = ({
  variant = 'information',
  children,
  className = '',
  ...props
}) => {
  const config = VARIANT_CONFIG[variant] ?? DEFAULT_CONFIG

  const containerStyles: React.CSSProperties = {
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '3px 16px',
    background: config.background,
    border: `1px solid ${config.border}`,
    borderRadius: LANDIQ_THEME.border.radius.full,
  }

  const labelStyles: React.CSSProperties = {
    fontFamily: LANDIQ_THEME.typography.fontFamily,
    fontStyle: 'normal',
    fontWeight: '700',
    fontSize: '14px',
    lineHeight: '19px',
    textAlign: 'center',
    color: config.color,
    whiteSpace: 'nowrap',
  }

  return (
    <div style={containerStyles} className={className} {...props}>
      <span style={labelStyles}>{children}</span>
    </div>
  )
}
