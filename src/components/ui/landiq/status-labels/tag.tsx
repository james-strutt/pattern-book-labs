import React from 'react'
import { cn } from '@/lib/utils'

export interface TagProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'style'> {
  state?: 'default' | 'hover' | 'selected'
  children: React.ReactNode
  onClick?: () => void
  className?: string
}

export const Tag: React.FC<TagProps> = ({
  state = 'default',
  children,
  onClick,
  className,
  ...props
}) => {
  const baseStyles = [
    'box-border flex flex-col items-center px-4 py-[3px] rounded-[61px]',
    'border border-brand-dark cursor-pointer',
    'transition-all duration-200 ease-in-out',
    'font-["Public_Sans"] font-normal text-sm leading-[19px] text-center',
    'whitespace-nowrap'
  ].join(' ')

  const stateStyles: Record<NonNullable<TagProps['state']>, string> = {
    default: 'bg-transparent text-brand-dark',
    hover: 'bg-brand-dark/10 text-brand-dark',
    selected: 'bg-brand-dark text-white',
  }

  return (
    <button
      className={cn(baseStyles, stateStyles[state], className)}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  )
}
