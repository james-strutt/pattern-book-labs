import React from 'react'
import { LANDIQ_THEME } from '@/components/ui/landiq/theme'
import logger from '@/lib/logger'

export type IconName = 
  | 'chevron-left' | 'chevron-right' | 'chevron-up' | 'chevron-down'
  | 'arrow-right' | 'arrow-left' | 'arrow-up' | 'arrow-down'
  | 'close' | 'search' | 'tick' | 'filter' | 'mobile-menu'
  | 'trash-can-outline' | 'format-list-bulleted' | 'arrow-expand-up' | 'arrow-expand-down'
  | 'table-column-plus-after' | 'file-document-edit' | 'table-merge-cells' | 'counter'
  | 'eye-off-outline' | 'email-open-outline' | 'select-compare' | 'drag'
  | 'seal-variant' | 'file-code-outline' | 'palette-outline' | 'reload'
  | 'shape-plus-outline' | 'database-edit-outline' | 'pencil-ruler-outline' | 'compass-outline'
  | 'location' | 'plus' | 'external-link' | 'pin-outline' | 'select-group'
  | 'upload' | 'download' | 'email' | 'pencil' | 'play-arrow' | 'export-variant'
  | 'table-large' | 'clipboard-edit-outline' | 'eye' | 'email-outline'
  | 'arrow-expand' | 'arrow-u-left-top' | 'update' | 'share-variant-outline'
  | 'file-document-outline' | 'file-document-multiple-outline' | 'file-document-plus-outline'
  | 'file-document-check-outline' | 'clipboard-list-outline' | 'chart-bar'
  | 'cloud-upload-outline' | 'square-root' | 'drag-variant' | 'chart-timeline-variant'
  | 'selection' | 'map-marker-outline' | 'playlist-star' | 'dots-vertical'
  | 'list-box-outline' | 'alert' | 'database-outline' | 'content-save-outline'
  | 'lasso' | 'filter-variant' | 'wrench-outline' | 'import'
  | 'lock-open-outline' | 'link' | 'table' | 'content-save-edit-outline'
  | 'cog-outline' | 'shape-polygon-plus' | 'rename-outline' | 'filter-outline'
  | 'fullscreen' | 'image-filter-center-focus' | 'status-info' | 'status-success'
  | 'status-warning' | 'status-error'

export type IconColor = 
  | 'brandDark' | 'brandLight' | 'white' | 'textDark' | 'textLight'
  | 'successGreen' | 'errorRed' | 'warningOrange' | 'infoBlue'

export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, 'style'> {
  name: IconName
  color?: IconColor
  size?: number
  className?: string
  decorative?: boolean
}

const COLOR_MAP: Record<IconColor, string> = {
  brandDark: LANDIQ_THEME.colors.brand.dark,
  brandLight: LANDIQ_THEME.colors.brand.light,
  white: LANDIQ_THEME.colors.greys.white,
  textDark: LANDIQ_THEME.colors.text.dark,
  textLight: LANDIQ_THEME.colors.text.light,
  successGreen: LANDIQ_THEME.colors.status.successGreen,
  errorRed: LANDIQ_THEME.colors.status.errorRed,
  warningOrange: '#C95000',
  infoBlue: LANDIQ_THEME.colors.info.blue,
}

const ICON_PATHS: Record<IconName, string> = {
    'chevron-left': 'M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z',
    'chevron-right': 'M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z',
    'chevron-up': 'M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z',
    'chevron-down': 'M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z',
    'arrow-right': 'M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z',
    'arrow-left': 'M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z',
    'arrow-up': 'M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z',
    'arrow-down': 'M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z',
    'close': 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
    'search': 'M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
    'tick': 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
    'filter': 'M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z',
    'mobile-menu': 'M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z',
    'trash-can-outline': 'M9 3v1H4v2h1v13c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V6h1V4h-5V3H9zm0 15c0 .55-.45 1-1 1s-1-.45-1-1V9c0-.55.45-1 1-1s1 .45 1 1v9zm5 0c0 .55-.45 1-1 1s-1-.45-1-1V9c0-.55.45-1 1-1s1 .45 1 1v9z',
    'format-list-bulleted': 'M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z',
    'arrow-expand-up': 'M18 9h-3V5H9v4H6l6 6 6-6zM6 19h12v2H6v-2z',
    'arrow-expand-down': 'M18 15h-3v4H9v-4H6l6-6 6 6zM6 5h12V3H6v2z',
    'table-column-plus-after': 'M11 2H2v16h9V2zm-2 14H4V4h5v12zm10-6v6h-7V4h5v6zm2-8h-9v16h9V2zm-2 14h-5v-6h5v6z',
    'file-document-edit': 'M6 2c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6H6zm7 7V3.5L18.5 9H13z',
    'table-merge-cells': 'M3 11h8V9H3v2zm0 4h8v-2H3v2zm0-8h8V5H3v2zm10 0h8V5h-8v2zm8 8h-8v-2h8v2zm-8 4h8v-2h-8v2z',
    'counter': 'M4 4h16v2H4V4zm0 4h10v2H4V8zm0 4h16v2H4v-2zm0 4h10v2H4v-2z',
    'eye-off-outline': 'M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46A11.804 11.804 0 001 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z',
    'email-open-outline': 'M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z',
    'select-compare': 'M9 3L5 6.99h3V14h2V6.99h3L9 3zm7 14.01V10h-2v7.01h-3L15 21l4-3.99h-3z',
    'drag': 'M9 3h6v2H9V3zm0 4h6v2H9V7zm0 4h6v2H9v-2zm0 4h6v2H9v-2zm0 4h6v2H9v-2z',
    'seal-variant': 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
    'file-code-outline': 'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z',
    'palette-outline': 'M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
    'reload': 'M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z',
    'shape-plus-outline': 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
    'database-edit-outline': 'M12 3C7.58 3 4 4.79 4 7s3.58 4 8 4 8-1.79 8-4-3.58-4-8-4zM4 9v3c0 2.21 3.58 4 8 4s8-1.79 8-4V9c0 2.21-3.58 4-8 4s-8-1.79-8-4zm0 5v3c0 2.21 3.58 4 8 4s8-1.79 8-4v-3c0 2.21-3.58 4-8 4s-8-1.79-8-4z',
    'pencil-ruler-outline': 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
    'compass-outline': 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
    'location': 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
    'plus': 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
    'external-link': 'M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z',
    'pin-outline': 'M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z',
    'select-group': 'M5 3h4v2H5V3zm10 0h4v2h-4V3zM5 19h4v2H5v-2zm10 0h4v2h-4v-2zM3 5v4h2V5H3zm0 10v4h2v-4H3zm18-10v4h2V5h-2zm0 10v4h2v-4h-2z',
    'upload': 'M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z',
    'download': 'M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z',
    'email': 'M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z',
    'pencil': 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
    'play-arrow': 'M8 5v14l11-7z',
    'export-variant': 'M23 12l-4-4v3h-9v2h9v3M1 18V6c0-1.11.89-2 2-2h9.17L10 6H3v12h12v-5h2v5c0 1.11-.89 2-2 2H3c-1.11 0-2-.89-2-2z',
    'table-large': 'M4 3h16c1.1 0 2 .9 2 2v14c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2zm0 4v4h6V7H4zm8 0v4h8V7h-8zM4 13v4h6v-4H4zm8 0v4h8v-4h-8z',
    'clipboard-edit-outline': 'M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm7 16H5V5h2v3h10V5h2v14z',
    'eye': 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z',
    'email-outline': 'M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8l8 5 8-5v10zm-8-7L4 6h16l-8 5z',
    'arrow-expand': 'M10 21v-2h4v2h-4zm-2-7h8v-4h-8v4zm-4 0h2v-4H4v4zm16 0v-4h-2v4h2zM6 5h12v2H6V5zm-2 6h2V9H4v2zm16-2v2h2V9h-2z',
    'arrow-u-left-top': 'M20 10v4h-8v6h-2v-6H2v-2h8V6h8V2h2v4h-8v4h8z',
    'update': 'M21 10.12h-6.78l2.74-2.82c-2.73-2.7-7.15-2.8-9.88-.1-2.73 2.71-2.73 7.08 0 9.79 2.73 2.71 7.15 2.71 9.88 0C18.32 15.65 19 14.08 19 12.1h2c0 1.98-.88 4.55-2.64 6.29-3.51 3.48-9.21 3.48-12.72 0-3.5-3.47-3.53-9.11-.02-12.58 3.51-3.47 9.14-3.47 12.65 0L21 3v7.12zM12.5 8v4.25l3.5 2.08-.72 1.21L11 13V8h1.5z',
    'share-variant-outline': 'M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z',
    'file-document-outline': 'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z',
    'file-document-multiple-outline': 'M15 7H9v2h6V7zm0 4H9v2h6v-2zm2-8c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2h10zm0 14V5H7v12h10zm-3 15h2V5h12V3H14v12z',
    'file-document-plus-outline': 'M13 9h5.5L13 3.5V9M6 2h8l6 6v12c0 1.11-.89 2-2 2H6c-1.11 0-2-.89-2-2V4c0-1.11.89-2 2-2m0 18h12V9h-6V3H6v17m7-7v2h2v2h-2v2h-2v-2H9v-2h2v-2h2z',
    'file-document-check-outline': 'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11zm-9.18-6.95L7.4 14.46 10.94 18l5.66-5.66-1.41-1.41-4.24 4.24-2.13-2.12z',
    'clipboard-list-outline': 'M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm-2 14l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z',
    'chart-bar': 'M22 21h-2V3h2v18zM15 21h-2V9h2v12zm-7 0H6v-6h2v6z',
    'cloud-upload-outline': 'M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z',
    'square-root': 'M7 2h10v2H7V2zm0 18h10v2H7v-2zm-5-9h4v2H2v-2zm18 0h-4v2h4v-2z',
    'drag-variant': 'M7 19v-2h2v2H7zm4 0v-2h2v2h-2zm4 0v-2h2v2h-2zM7 15v-2h2v2H7zm4 0v-2h2v2h-2zm4 0v-2h2v2h-2zM7 11V9h2v2H7zm4 0V9h2v2h-2zm4 0V9h2v2h-2zM7 7V5h2v2H7zm4 0V5h2v2h-2zm4 0V5h2v2h-2z',
    'chart-timeline-variant': 'M2 2h20v20H2V2zm2 18h16V4H4v16zm2-2h12v-2H6v2zm0-4h12v-2H6v2zm0-4h12V8H6v2z',
    'selection': 'M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z',
    'map-marker-outline': 'M12 6.5c1.38 0 2.5 1.12 2.5 2.5s-1.12 2.5-2.5 2.5S9.5 10.38 9.5 9s1.12-2.5 2.5-2.5M12 2c3.87 0 7 3.13 7 7 0 5.25-7 13-7 13S5 14.25 5 9c0-3.87 3.13-7 7-7zm0 2C8.69 4 6 6.69 6 10c0 2.54 2.95 7.5 6 11.22C15.05 17.5 18 12.54 18 10c0-3.31-2.69-6-6-6z',
    'playlist-star': 'M2 6h12v2H2V6zm0 4h12v2H2v-2zm0 4h8v2H2v-2zm14 0l2.5 1.5L18 14l-2.5-1.5L18 11l-2.5-1.5L18 8l-2.5-1.5L18 5l2.5 1.5L23 5l-2.5 1.5L23 8l-2.5 1.5L23 11l-2.5 1.5L23 14z',
    'dots-vertical': 'M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z',
    'list-box-outline': 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z',
    'alert': 'M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 16h2v2h-2zm0-6h2v4h-2z',
    'database-outline': 'M12 3C7.58 3 4 4.79 4 7s3.58 4 8 4 8-1.79 8-4-3.58-4-8-4zM4 9v3c0 2.21 3.58 4 8 4s8-1.79 8-4V9c0 2.21-3.58 4-8 4s-8-1.79-8-4zm0 5v3c0 2.21 3.58 4 8 4s8-1.79 8-4v-3c0 2.21-3.58 4-8 4s-8-1.79-8-4z',
    'content-save-outline': 'M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z',
    'lasso': 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
    'filter-variant': 'M6 13h12v-2H6M3 6v2h18V6M10 18h4v-2h-4v2z',
    'wrench-outline': 'M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z',
    'import': 'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11zm-9-6v-4h2v4h3l-4 4-4-4h3z',
    'lock-open-outline': 'M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10z',
    'link': 'M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z',
    'table': 'M5 4h14c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm0 4v4h6V8H5zm8 0v4h6V8h-6zM5 14v4h6v-4H5zm8 0v4h6v-4h-6z',
    'content-save-edit-outline': 'M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm2 16H5V5h11.17L19 7.83V19zm-7-7c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zM6 6h9v4H6V6z',
    'cog-outline': 'M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z',
    'shape-polygon-plus': 'M17 15.7V13H7v2.7l5 2.3 5-2.3zM12 2L2 7v10l10 5 10-5V7l-10-5zm0 2.18l7.6 3.82L12 11.82 4.4 8l7.6-3.82zM4 15.5V9.31l7 3.5v6.88l-7-3.5zm16 0l-7 3.5v-6.88l7-3.5v6.88z',
    'rename-outline': 'M15 16h4v2h-4zm0-8h7v2h-7zm0 4h6v2h-6zM3 18c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V8H3v10zM14 5h-3l-1-1H6L5 5H2v2h12z',
    'filter-outline': 'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
    'fullscreen': 'M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z',
    'image-filter-center-focus': 'M5 15H3v4c0 1.1.9 2 2 2h4v-2H5v-4zM5 5h4V3H5c-1.1 0-2 .9-2 2v4h2V5zm14-2h-4v2h4v4h2V5c0-1.1-.9-2-2-2zm0 16h-4v2h4c1.1 0 2-.9 2-2v-4h-2v4zM12 9c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z',
    'status-info': 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z',
    'status-success': 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
    'status-warning': 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z',
    'status-error': 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z',
}

export const Icon: React.FC<IconProps> = ({
  name,
  color = 'brandDark',
  size = 24,
  className = '',
  decorative = false,
  ...props
}) => {
  const fillColor = COLOR_MAP[color] || COLOR_MAP.brandDark

  const containerStyles: React.CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
    display: 'inline-block',
    position: 'relative',
  }

  const path = ICON_PATHS[name]

  if (!path) {
    logger.warn(`Icon "${name}" not found`, {}, 'Icon')
    return null
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={containerStyles}
      className={className}
      aria-label={decorative ? undefined : name}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? true : undefined}
      {...props}
    >
      <path d={path} fill={fillColor} />
    </svg>
  )
}
