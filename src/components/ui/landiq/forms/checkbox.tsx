import { LANDIQ_THEME } from '@/components/ui/landiq/theme';
import type { CheckboxProps } from '@/components/ui/landiq/types';
import React from 'react';

export const Checkbox: React.FC<CheckboxProps> = ({ 
  label,
  checked = false,
  onChange,
  onCheckedChange,
  disabled = false,
  error = false,
  size = '32px',
  showInfo = false,
  className = '',
  ...props 
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (onCheckedChange) {
      onCheckedChange(e.target.checked);
    }
    if (onChange) {
      onChange(e);
    }
  };
  
  const getSizeValue = (): { box: string; check: string; offset: string; radius: string } => {
    switch (size) {
      case 'small':
      case '16px':
        return { box: '16px', check: '11px', offset: '2.5px', radius: '2px' }
      case 'medium':
      case '24px':
        return { box: '24px', check: '16.5px', offset: '3.75px', radius: '3px' }
      case 'large':
      case '32px':
      default:
        return { box: '32px', check: '22px', offset: '5px', radius: '4px' }
    }
  }

  const sizes = getSizeValue()

  const containerStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    padding: '8px 0px',
    gap: '16px',
    opacity: disabled ? 0.6 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
  }

  const checkboxStyles: React.CSSProperties = {
    position: 'relative',
    width: sizes.box,
    height: sizes.box,
    flexShrink: 0,
  }

  const getBorderStyle = (): string => {
    if (error) {
      return `2px solid ${LANDIQ_THEME.colors.status.errorRed}`;
    }
    if (disabled) {
      return '1px solid #CDD3D6';
    }
    return `1px solid ${LANDIQ_THEME.colors.text.dark}`;
  };

  const inputStyles: React.CSSProperties = {
    position: 'absolute',
    left: '0',
    right: '0',
    top: '0',
    bottom: '0',
    width: '100%',
    height: '100%',
    background: disabled ? '#F2F2F2' : '#ffffff',
    border: getBorderStyle(),
    borderRadius: sizes.radius,
  }

  const checkStyles: React.CSSProperties = {
    position: 'absolute',
    width: sizes.check,
    height: sizes.check,
    left: sizes.offset,
    top: sizes.offset,
    display: checked ? 'block' : 'none',
  }

  const getBorderRadius = (): string => {
    if (size === '16px') {
      return '0.5px';
    }
    if (size === '24px') {
      return '0.75px';
    }
    return '1px';
  };

  const checkBackgroundStyles: React.CSSProperties = {
    position: 'absolute',
    left: '0',
    right: '0',
    top: '0',
    bottom: '0',
    background: error ? LANDIQ_THEME.colors.status.errorRed : LANDIQ_THEME.colors.brand.dark,
    borderRadius: getBorderRadius(),
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
      <div style={checkboxStyles}>
        <input
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          style={{ ...inputStyles, opacity: 0, margin: 0, position: 'absolute', cursor: disabled ? 'not-allowed' : 'pointer' }}
          {...props}
        />
        <div style={inputStyles} />
        {checked && (
          <div style={checkStyles}>
            <div style={checkBackgroundStyles}>
            </div>
          </div>
        )}
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

