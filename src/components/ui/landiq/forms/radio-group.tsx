import React from 'react'
import { LANDIQ_THEME } from '@/components/ui/landiq/theme'
import { RadioButton } from './radio-button'
import type { RadioGroupProps } from '@/components/ui/landiq/types'

export const RadioGroup = <T extends string | number = string>({ 
  legend,
  options = [],
  value,
  onChange,
  error = false,
  errorMessage,
  showInfo = false,
  name,
  className = ''
}: RadioGroupProps<T>): React.JSX.Element => {
  const containerStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: '0px',
  }

  const legendStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: '0px 0px 8px',
    gap: '10px',
    width: '100%',
  }

  const legendLabelStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    padding: '0px',
    gap: '8px',
  }

  const legendTextStyles: React.CSSProperties = {
    fontFamily: LANDIQ_THEME.typography.fontFamily,
    fontStyle: 'normal',
    fontWeight: '700',
    fontSize: '16px',
    lineHeight: '24px',
    color: LANDIQ_THEME.colors.text.dark,
  }

  const radioButtonsStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: '0px',
    gap: '16px',
    width: '100%',
  }

  const validationStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: '8px 0px 0px',
    gap: '10px',
    width: '100%',
  }

  const alertStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: '8px',
    gap: '8px',
    width: '100%',
    height: '36px',
    background: LANDIQ_THEME.colors.status.errorRedBg,
  }

  const alertTextStyles: React.CSSProperties = {
    fontFamily: LANDIQ_THEME.typography.fontFamily,
    fontStyle: 'normal',
    fontWeight: '700',
    fontSize: '14px',
    lineHeight: '19px',
    color: LANDIQ_THEME.colors.text.dark,
    flex: '1',
  }

  return (
    <div style={containerStyles} className={className}>
      {legend && (
        <div style={legendStyles}>
          <div style={legendLabelStyles}>
            <span style={legendTextStyles}>{legend}</span>
            {showInfo && (
              <div style={{ width: '16px', height: '16px', display: 'none' }}>
              </div>
            )}
          </div>
        </div>
      )}

      {error && errorMessage && (
        <div style={validationStyles}>
          <div style={alertStyles}>
            <div style={{ width: '20px', height: '20px' }}>
            </div>
            <span style={alertTextStyles}>{errorMessage}</span>
          </div>
        </div>
      )}

      <div style={radioButtonsStyles}>
        {options.map((option, index) => (
          <RadioButton
            key={option.value?.toString() || index}
            label={option.label}
            checked={value === option.value}
            onChange={() => {
              if (onChange) {
                onChange(option.value)
              }
            }}
            name={name}
            value={option.value}
          />
        ))}
      </div>
    </div>
  )
}

