import * as React from "react"
import { createPortal } from "react-dom"
import { useState, useEffect, useRef } from 'react'
import { cn } from "@/lib/utils"
import { LANDIQ_THEME } from '@/components/ui/landiq/theme'
import type { TooltipProps } from '@/components/ui/landiq/types'
import { Icon } from '@/components/ui/landiq/icons/icon'

const TOOLTIP_WIDTH = 280
const TOOLTIP_SPACING = 12
const TOOLTIP_Z_INDEX = 9999

interface FixedPosition {
  top: number
  left: number
  vertical: 'top' | 'bottom'
}

function getBestVerticalPosition(
  spaceAbove: number,
  spaceBelow: number,
  minRequiredSpace: number
): 'top' | 'bottom' {
  const enoughAbove = spaceAbove >= minRequiredSpace
  const enoughBelow = spaceBelow >= minRequiredSpace
  
  if (enoughAbove) {
    if (enoughBelow) {
      if (spaceAbove >= spaceBelow) {
        return 'top'
      }
      return 'bottom'
    }
    return 'top'
  }
  
  if (enoughBelow) {
    return 'bottom'
  }
  
  if (spaceAbove > spaceBelow) {
    return 'top'
  }
  return 'bottom'
}

function determineVerticalPosition(
  preferredPosition: 'top' | 'bottom',
  spaceAbove: number,
  spaceBelow: number,
  tooltipHeight: number
): 'top' | 'bottom' {
  const minRequiredSpace = tooltipHeight + TOOLTIP_SPACING
  const bestPosition = getBestVerticalPosition(spaceAbove, spaceBelow, minRequiredSpace)
  
  if (preferredPosition === bestPosition) {
    return preferredPosition
  }
  
  const enoughSpaceForPreferred = preferredPosition === 'top'
    ? spaceAbove >= minRequiredSpace
    : spaceBelow >= minRequiredSpace
  
  if (enoughSpaceForPreferred) {
    return preferredPosition
  }
  
  return bestPosition
}

function calculateHorizontalLeft(
  wrapperLeft: number,
  wrapperWidth: number,
  viewportWidth: number
): number {
  const centerX = wrapperLeft + wrapperWidth / 2
  const tooltipLeft = centerX - TOOLTIP_WIDTH / 2
  const margin = 8
  return Math.max(margin, Math.min(viewportWidth - TOOLTIP_WIDTH - margin, tooltipLeft))
}

function calculateTopValue(
  verticalPos: 'top' | 'bottom',
  wrapperTop: number,
  wrapperBottom: number,
  tooltipHeight: number
): number {
  if (verticalPos === 'top') {
    return wrapperTop - tooltipHeight - TOOLTIP_SPACING
  }
  return wrapperBottom + TOOLTIP_SPACING
}

function calculateTooltipPosition(
  wrapperRect: DOMRect,
  tooltipRect: DOMRect | null,
  preferredPosition: 'top' | 'bottom',
  viewportWidth: number,
  viewportHeight: number
): FixedPosition {
  const spaceAbove = wrapperRect.top
  const spaceBelow = viewportHeight - wrapperRect.bottom
  const estimatedHeight = 100
  const actualHeight = tooltipRect?.height ?? estimatedHeight

  const verticalPos = determineVerticalPosition(
    preferredPosition,
    spaceAbove,
    spaceBelow,
    actualHeight
  )

  const left = calculateHorizontalLeft(
    wrapperRect.left,
    wrapperRect.width,
    viewportWidth
  )

  const top = calculateTopValue(
    verticalPos,
    wrapperRect.top,
    wrapperRect.bottom,
    actualHeight
  )

  return { top, left, vertical: verticalPos }
}

const Tooltip = React.forwardRef<HTMLDivElement, TooltipProps>(({ 
  className,
  children,
  content,
  variant = 'dark',
  viewport = 'desktop',
  position = 'top',
  style = {},
  persistent = false,
  ...props 
}, ref) => {
  const [isVisible, setIsVisible] = useState(false)
  const [fixedPosition, setFixedPosition] = useState<FixedPosition>({ top: 0, left: 0, vertical: position })
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const isDark = variant === 'dark'
  const isMobile = viewport === 'mobile'

  const handleClose = (): void => {
    setIsVisible(false)
  }

  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return

    const handleMouseEnter = (): void => setIsVisible(true)
    const handleMouseLeave = (): void => {
      if (!persistent) {
        setIsVisible(false)
      }
    }
    const handleFocusIn = (): void => setIsVisible(true)
    const handleFocusOut = (e: FocusEvent): void => {
      if (!persistent && !wrapper.contains(e.relatedTarget as Node)) {
        setIsVisible(false)
      }
    }

    wrapper.addEventListener('mouseenter', handleMouseEnter)
    wrapper.addEventListener('mouseleave', handleMouseLeave)
    wrapper.addEventListener('focusin', handleFocusIn)
    wrapper.addEventListener('focusout', handleFocusOut)

    return (): void => {
      wrapper.removeEventListener('mouseenter', handleMouseEnter)
      wrapper.removeEventListener('mouseleave', handleMouseLeave)
      wrapper.removeEventListener('focusin', handleFocusIn)
      wrapper.removeEventListener('focusout', handleFocusOut)
    }
  }, [persistent])

  useEffect(() => {
    if (!isVisible || !wrapperRef.current) return

    const calculatePosition = (): void => {
      const wrapper = wrapperRef.current
      const tooltip = tooltipRef.current
      if (!wrapper) return

      const wrapperRect = wrapper.getBoundingClientRect()
      const tooltipRect = tooltip?.getBoundingClientRect() ?? null
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      const newPosition = calculateTooltipPosition(
        wrapperRect,
        tooltipRect,
        position,
        viewportWidth,
        viewportHeight
      )

      setFixedPosition(newPosition)
    }

    let rafId1: number
    let rafId2: number

    rafId1 = requestAnimationFrame(() => {
      calculatePosition()
      rafId2 = requestAnimationFrame(() => {
        calculatePosition()
      })
    })

    window.addEventListener('resize', calculatePosition)
    window.addEventListener('scroll', calculatePosition, true)

    return (): void => {
      if (rafId1) cancelAnimationFrame(rafId1)
      if (rafId2) cancelAnimationFrame(rafId2)
      window.removeEventListener('resize', calculatePosition)
      window.removeEventListener('scroll', calculatePosition, true)
    }
  }, [isVisible, position])

  useEffect(() => {
    if (!isVisible || !persistent) return

    const handleClickOutside = (e: MouseEvent): void => {
      if (
        tooltipRef.current &&
        wrapperRef.current &&
        !tooltipRef.current.contains(e.target as Node) &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setIsVisible(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' || e.key === 'Delete') {
        setIsVisible(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)

    return (): void => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isVisible, persistent])

  const tooltipId = React.useId()

  const tooltipContent = isVisible ? (
    <div
      ref={tooltipRef}
      id={tooltipId}
      role="tooltip"
      className="flex flex-col items-center p-0"
      style={{
        position: 'fixed',
        zIndex: TOOLTIP_Z_INDEX,
        width: TOOLTIP_WIDTH,
        top: fixedPosition.top,
        left: fixedPosition.left,
        pointerEvents: persistent ? 'auto' : 'none',
      }}
    >
      {fixedPosition.vertical === 'bottom' && (
            <div
              className="flex flex-col items-center p-0"
              style={{
                width: '24px',
                height: '12px',
                filter: isDark ? 'drop-shadow(0px 4px 12px rgba(0, 0, 0, 0.15))' : 'none',
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '12px',
                  background: isDark ? '#495054' : LANDIQ_THEME.colors.greys.white,
                  clipPath: 'polygon(50% 0, 0 100%, 100% 100%)',
                }}
              />
            </div>
          )}

          <div
            className="flex flex-col items-end p-0 self-stretch rounded"
            style={{
              background: isDark ? '#495054' : LANDIQ_THEME.colors.greys.white,
              boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
            }}
          >
            <div
              className="flex flex-col items-end self-stretch rounded"
              style={{
                padding: isMobile ? '8px' : '16px',
              }}
            >
              <div className="flex flex-col items-start p-0 self-stretch">
                <div className="flex flex-col items-start p-0 gap-[5px] self-stretch">
                  {persistent && (
                    <div style={{ alignSelf: 'flex-end', marginBottom: '8px' }}>
                      <button
                        type="button"
                        onClick={handleClose}
                        aria-label="Close tooltip"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '16px',
                          height: '16px',
                          padding: 0,
                          border: 'none',
                          background: 'none',
                          cursor: 'pointer',
                          transition: 'opacity 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = '0.7'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = '1'
                        }}
                      >
                        <Icon
                          name="close"
                          color={isDark ? 'textLight' : 'textDark'}
                          size={16}
                        />
                      </button>
                    </div>
                  )}
                  <div
                    className="font-['Public_Sans'] font-normal text-sm leading-[19px] self-stretch"
                    style={{
                      color: isDark ? LANDIQ_THEME.colors.text.light : LANDIQ_THEME.colors.text.dark,
                    }}
                  >
                    {content}
                  </div>
                </div>
              </div>
            </div>
          </div>

      {fixedPosition.vertical === 'top' && (
        <div
          className="flex flex-col items-center p-0"
          style={{
            width: '24px',
            height: '12px',
            filter: isDark ? 'drop-shadow(0px 4px 12px rgba(0, 0, 0, 0.15))' : 'none',
          }}
        >
          <div
            style={{
              width: '24px',
              height: '12px',
              background: isDark ? '#495054' : LANDIQ_THEME.colors.greys.white,
              clipPath: 'polygon(50% 100%, 0 0, 100% 0)',
            }}
          />
        </div>
      )}
    </div>
  ) : null

  return (
    <>
      <div
        ref={(node) => {
          wrapperRef.current = node
          if (typeof ref === 'function') {
            ref(node)
          } else if (ref) {
            ref.current = node
          }
        }}
        className={cn("relative inline-block", className)}
        style={style}
        aria-describedby={isVisible ? tooltipId : undefined}
        {...props}
      >
        {children}
      </div>
      {createPortal(tooltipContent, document.body)}
    </>
  )
})

Tooltip.displayName = "Tooltip"

export { Tooltip }
