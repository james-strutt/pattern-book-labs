import React from 'react'
import { LANDIQ_THEME } from '@/components/ui/landiq/theme'

export interface AlertBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  count: number
  className?: string
}

export const AlertBadge: React.FC<AlertBadgeProps> = ({
  count,
  className = '',
  ...props
}) => {
  const outerContainerStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '2.14286px',
    borderRadius: '16.3805px',
  }

  const badgeStyles: React.CSSProperties = {
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '12.48px 6.72px',
    gap: '7.68px',
    minWidth: '24px',
    height: '24px',
    background: LANDIQ_THEME.colors.secondary.waratahRed,
    border: `1.44px solid ${LANDIQ_THEME.colors.greys.white}`,
    borderRadius: '12px',
  }

  const textStyles: React.CSSProperties = {
    fontFamily: LANDIQ_THEME.typography.fontFamily,
    fontStyle: 'normal',
    fontWeight: '700',
    fontSize: '14.6667px',
    lineHeight: '0px',
    textAlign: 'right',
    color: LANDIQ_THEME.colors.text.light,
  }

  return (
    <div style={outerContainerStyles} className={className} {...props}>
      <div style={badgeStyles}>
        <span style={textStyles}>{count}</span>
      </div>
    </div>
  )
}
