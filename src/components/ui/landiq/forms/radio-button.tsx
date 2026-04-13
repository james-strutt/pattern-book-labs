import React from 'react'
import { LANDIQ_THEME } from '@/components/ui/landiq/theme'
import type { RadioButtonProps } from '@/components/ui/landiq/types'

export const RadioButton: React.FC<RadioButtonProps> = ({ 
  label,
  checked = false,
  onChange,
  disabled = false,
  name,
  value,
  showInfo = false,
  size = '32px',
  className = '',
  ...props 
}) => {
  const getSizeValue = (): string => {
    switch (size) {
      case 'small':
      case '16px':
        return '16px'
      case 'medium':
      case '24px':
        return '24px'
      case 'large':
      case '32px':
      default:
        return '32px'
    }
  }

  const sizeValue = getSizeValue()

  const containerStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    padding: '0px',
    gap: '16px',
    opacity: disabled ? 0.6 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
  }

  const radioStyles: React.CSSProperties = {
    position: 'relative',
    width: sizeValue,
    height: sizeValue,
    flexShrink: 0,
  }

  const inputStyles: React.CSSProperties = {
    position: 'absolute',
    left: '0',
    right: '0',
    top: '0',
    bottom: '0',
    width: '100%',
    height: '100%',
    background: disabled ? '#F2F2F2' : '#ffffff',
    border: disabled ? '1px solid #CDD3D6' : `1px solid ${LANDIQ_THEME.colors.text.dark}`,
    borderRadius: '50%',
    cursor: disabled ? 'not-allowed' : 'pointer',
  }

  const checkStyles: React.CSSProperties = {
    position: 'absolute',
    left: '15.62%',
    right: '15.62%',
    top: '15.62%',
    bottom: '15.62%',
    background: LANDIQ_THEME.colors.brand.dark,
    borderRadius: '50%',
    display: checked ? 'block' : 'none',
  }

  const labelStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    padding: '0px',
    gap: '10px',
  }

  const labelTextStyles: React.CSSProperties = {
    fontFamily: LANDIQ_THEME.typography.fontFamily,
    fontStyle: 'normal',
    fontWeight: '400',
    fontSize: '16px',
    lineHeight: '24px',
    color: LANDIQ_THEME.colors.text.dark,
  }

  return (
    <label style={containerStyles} className={className}>
      <div style={radioStyles}>
        <input
          type="radio"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          name={name}
          value={value}
          style={{ ...inputStyles, opacity: 0, margin: 0, position: 'absolute' }}
          {...props}
        />
        <div style={inputStyles} />
        <div style={checkStyles} />
      </div>
      
      {label && (
        <div style={labelStyles}>
          <span style={labelTextStyles}>{label}</span>
          {showInfo && (
            <div style={{ width: '16px', height: '16px', display: 'none' }}>
            </div>
          )}
        </div>
      )}
    </label>
  )
}

