import { Icon } from '@/components/ui/landiq/icons/icon';
import { Tag } from '@/components/ui/landiq/status-labels/tag';
import { LANDIQ_THEME } from '@/components/ui/landiq/theme';
import type { CardProps } from '@/components/ui/landiq/types';
import React from 'react';

export const Card: React.FC<CardProps> = ({
  heading,
  copy,
  img,
  tag,
  dateDisplay,
  dateMachine,
  href,
  theme = 'white',
  horizontal = false,
  border = false,
  className = '',
  style = {},
  children = null,
  showIcon = true,
  contentStyle = {},
  ...props
}) => {
  let backgroundColor: string;
  if (theme === 'dark') {
    backgroundColor = LANDIQ_THEME.colors.brand.dark;
  } else if (theme === 'light') {
    backgroundColor = LANDIQ_THEME.colors.brand.light;
  } else {
    backgroundColor = LANDIQ_THEME.colors.greys.white;
  }

  const containerStyles: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    flexDirection: horizontal ? 'row' : 'column',
    overflow: 'hidden',
    height: '100%',
    color: LANDIQ_THEME.colors.text.dark,
    borderRadius: LANDIQ_THEME.borders.buttonRadius,
    backgroundColor,
    border: border ? `1px solid ${LANDIQ_THEME.colors.greys.grey03}` : 'none',
    transition: 'background-color 0.2s, color 0.2s',
    ...style,
  };

  const imageStyles: React.CSSProperties = {
    width: '100%',
    height: horizontal ? '100%' : '200px',
    objectFit: 'cover',
    display: 'block',
  };

  const contentStyles: React.CSSProperties = {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flex: 1,
    position: 'relative',
    ...contentStyle,
  };

  const titleStyles: React.CSSProperties = {
    fontFamily: LANDIQ_THEME.typography.fontFamily,
    fontSize: '20px',
    fontWeight: '700',
    lineHeight: '28px',
    color: theme === 'dark' ? LANDIQ_THEME.colors.text.light : LANDIQ_THEME.colors.text.dark,
    margin: 0,
  };

  const copyStyles: React.CSSProperties = {
    fontFamily: LANDIQ_THEME.typography.fontFamily,
    fontSize: '16px',
    fontWeight: '400',
    lineHeight: '24px',
    color: theme === 'dark' ? LANDIQ_THEME.colors.text.light : LANDIQ_THEME.colors.text.dark,
    margin: 0,
  };

  const dateStyles: React.CSSProperties = {
    fontFamily: LANDIQ_THEME.typography.fontFamily,
    fontSize: '14px',
    fontWeight: '400',
    lineHeight: '20px',
    color: theme === 'dark' ? LANDIQ_THEME.colors.text.light : LANDIQ_THEME.colors.text.dark,
  };

  const iconStyles: React.CSSProperties = {
    position: 'absolute',
    right: contentStyles.padding ?? '24px',
    bottom: contentStyles.padding ?? '24px',
    color: theme === 'dark' ? LANDIQ_THEME.colors.text.light : LANDIQ_THEME.colors.brand.dark,
  };

  const shouldShowIcon = showIcon && ((heading ?? null) ?? (copy ?? null) ?? (img ?? null));

  return (
    <div
      className={className}
      style={containerStyles}
      {...props}
    >
      {img && (
        <div style={{ width: horizontal ? '250px' : '100%', flexShrink: 0 }}>
          <img src={img} alt={heading} style={imageStyles} />
        </div>
      )}
      <div style={contentStyles}>
        {tag && (
          <div style={{ marginBottom: '8px' }}>
            <Tag>{tag}</Tag>
          </div>
        )}
        {dateDisplay && (
          <time dateTime={dateMachine} style={dateStyles}>
            {dateDisplay}
          </time>
        )}
        <div style={titleStyles}>
          {heading && (href ? (
            <a
              href={href}
              style={{
                color: 'inherit',
                textDecoration: 'none',
              }}
            >
              {heading}
            </a>
          ) : (
            heading
          ))}
        </div>
        {copy && <div style={copyStyles}>{copy}</div>}
        {children}
        {shouldShowIcon && (
          <div style={iconStyles}>
            <Icon name="chevron-right" color={theme === 'dark' ? 'textLight' : 'brandDark'} size={24} />
          </div>
        )}
      </div>
    </div>
  );
};

