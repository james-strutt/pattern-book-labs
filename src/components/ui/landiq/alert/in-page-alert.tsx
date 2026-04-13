import { Icon, type IconColor, type IconName } from '@/components/ui/landiq/icons/icon';
import { LANDIQ_THEME } from '@/components/ui/landiq/theme';
import type { InPageAlertProps } from '@/components/ui/landiq/types';
import React from 'react';

type AlertTypeConfig = {
  bgColor: string;
  borderColor?: string;
  iconColor?: IconColor;
  iconName?: IconName;
};

const INFO_CONFIG: AlertTypeConfig = {
  bgColor: LANDIQ_THEME.colors.info.blueBg,
  borderColor: LANDIQ_THEME.colors.info.blue,
  iconColor: 'infoBlue',
  iconName: 'status-info',
};

const getTypeConfig = (type: InPageAlertProps['type']): AlertTypeConfig => {
  switch (type) {
    case 'info':
      return INFO_CONFIG;
    case 'error':
      return {
        bgColor: LANDIQ_THEME.colors.status.errorRedBg,
        borderColor: LANDIQ_THEME.colors.status.errorRed,
        iconColor: 'errorRed',
        iconName: 'status-error',
      };
    case 'warning':
      return {
        bgColor: LANDIQ_THEME.colors.status.warningOrangeBg,
        borderColor: LANDIQ_THEME.colors.status.warningOrange,
        iconColor: 'warningOrange',
        iconName: 'status-warning',
      };
    case 'success':
      return {
        bgColor: LANDIQ_THEME.colors.status.successGreenBg,
        borderColor: LANDIQ_THEME.colors.status.successGreen,
        iconColor: 'successGreen',
        iconName: 'status-success',
      };
    case 'document':
      return {
        bgColor: LANDIQ_THEME.colors.greys.offWhite,
        borderColor: undefined,
        iconColor: undefined,
        iconName: undefined,
      };
    default:
      return INFO_CONFIG;
  }
};

const getContainerPadding = (
  type: InPageAlertProps['type'],
  compact: boolean
): string => {
  if (type === 'document') {
    return '12px 8px 12px 24px';
  }
  if (compact) {
    return '8px';
  }
  return '0px';
};

const getContainerGap = (
  type: InPageAlertProps['type'],
  compact: boolean
): string => {
  if (type === 'document') {
    return '10px';
  }
  if (compact) {
    return '8px';
  }
  return '0px';
};

const getContentContainerPadding = (
  compact: boolean,
  viewport: InPageAlertProps['viewport']
): string => {
  if (compact) {
    return '0px';
  }
  if (viewport === 'large') {
    return '24px 24px 24px 16px';
  }
  return '16px';
};

const getContentContainerWidth = (
  type: InPageAlertProps['type'],
  viewport: InPageAlertProps['viewport']
): string => {
  if (type === 'document') {
    if (viewport === 'large') {
      return 'min(700px, 100%)';
    }
    return 'min(311px, 100%)';
  }
  return 'auto';
};

const getFontSize = (
  viewport: InPageAlertProps['viewport'],
  type: InPageAlertProps['type'],
  compact: boolean
): string => {
  if (type === 'document') {
    return '14px';
  }
  if (viewport === 'large' && compact) {
    return '14px';
  }
  return '16px';
};

const getLineHeight = (
  viewport: InPageAlertProps['viewport'],
  type: InPageAlertProps['type'],
  compact: boolean
): string => {
  if (type === 'document') {
    return '19px';
  }
  if (viewport === 'large' && compact) {
    return '19px';
  }
  return '24px';
};

export const InPageAlert: React.FC<InPageAlertProps> = ({
  type = 'info',
  children,
  compact = false,
  viewport = 'large',
  showClose = false,
  onClose = (): void => {},
  className = '',
  ...props
}) => {
  const config = getTypeConfig(type);

  const containerStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: compact ? 'center' : 'flex-start',
    padding: getContainerPadding(type, compact),
    gap: getContainerGap(type, compact),
    width: '100%',
    background: config.bgColor,
    borderRadius: type === 'document' ? LANDIQ_THEME.border.radius.sm : '0px',
    boxSizing: 'border-box',
    justifyContent: type === 'document' ? 'center' : 'flex-start',
  };

  const borderStyles: React.CSSProperties = {
    width: '4px',
    alignSelf: 'stretch',
    background: config.borderColor,
  };

  const contentContainerStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: getContentContainerPadding(compact, viewport),
    gap: compact ? '0px' : '16px',
    flex: type === 'document' ? 'none' : '1',
    width: getContentContainerWidth(type, viewport),
  };

  const contentStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: type === 'document' ? 'row' : 'column',
    alignItems: 'flex-start',
    padding: compact ? '0px' : '2px 0px 0px',
    gap: type === 'document' ? '8px' : '12px',
    flex: '1',
  };

  const contentTextStyles: React.CSSProperties = {
    fontFamily: LANDIQ_THEME.typography.fontFamily,
    fontStyle: 'normal',
    fontWeight: '700',
    fontSize: getFontSize(viewport, type, compact),
    lineHeight: getLineHeight(viewport, type, compact),
    color: LANDIQ_THEME.colors.text.dark,
    width: '100%',
    margin: 0,
  };

  const iconSize = compact ? 20 : 30;

  return (
    <div style={containerStyles} className={className} {...props}>
      {type !== 'document' && !compact && config.borderColor && (
        <div style={borderStyles} />
      )}
      
      {type === 'document' ? (
        <div style={contentStyles}>
          <div style={contentTextStyles}>{children}</div>
          {showClose && (
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Icon name="close" color="brandDark" size={24} />
            </button>
          )}
        </div>
      ) : (
        <>
          {compact && config.iconName && (
            <Icon 
              name={config.iconName} 
              color={config.iconColor ?? undefined} 
              size={iconSize} 
            />
          )}
          
          <div style={contentContainerStyles}>
            {!compact && config.iconName && (
              <Icon 
                name={config.iconName} 
                color={config.iconColor ?? undefined} 
                size={iconSize} 
              />
            )}
            
            <div style={contentStyles}>
              <div style={contentTextStyles}>{children}</div>
            </div>
          </div>

          {compact && showClose && (
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Icon name="close" color="brandDark" size={24} />
            </button>
          )}
        </>
      )}
    </div>
  );
};







