import logger from '@/lib/logger';

export type AreaValue = number | string | null | undefined;

export interface FormatAreaOptions {
  includeUnit?: boolean;
  locale?: string;
  hectareThreshold?: number;
  decimals?: number;
  fallback?: string;
  forceUnit?: 'ha' | 'm2' | null;
}

export const formatArea = (
  value: AreaValue,
  options: FormatAreaOptions = {}
): string => {
  const {
    includeUnit = true,
    locale = 'en-AU',
    hectareThreshold = 10000,
    decimals = 2,
    fallback = 'N/A',
    forceUnit = null
  } = options;
  
  if (value === undefined || value === null) return fallback;
  
  const numericValue = typeof value === 'string' ? Number.parseFloat(value) : value;
  
  if (Number.isNaN(numericValue) || numericValue === 0) return fallback;
  
  try {
    let formattedValue: string;
    let unit: string;
    
    const shouldUseHectares = forceUnit === 'ha' || (forceUnit === null && numericValue >= hectareThreshold);
    
    if (shouldUseHectares) {
      formattedValue = (numericValue / 10000).toLocaleString(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });
      unit = 'ha';
    } else {
      formattedValue = Math.round(numericValue).toLocaleString(locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });
      unit = 'm²';
    }
    
    return includeUnit ? `${formattedValue} ${unit}` : formattedValue;
    
  } catch (error) {
    logger.error('Failed to format area value', { error }, 'formatArea');

    const fallbackValue = Math.round(numericValue);
    return includeUnit ? `${fallbackValue.toLocaleString()} m²` : fallbackValue.toString();
  }
};

export const formatSqm = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '0m²';
  }
  return `${Math.round(value).toLocaleString()}m²`;
};

export const formatAreaM2 = (value: AreaValue, includeUnit: boolean = true): string => {
  return formatArea(value, { forceUnit: 'm2', includeUnit });
};

export const formatAreaHa = (
  value: AreaValue,
  decimals: number = 2,
  includeUnit: boolean = true
): string => {
  return formatArea(value, { forceUnit: 'ha', decimals, includeUnit });
};

export const sqmToHectares = (sqm: number): number => {
  return sqm / 10000;
};

export const hectaresToSqm = (hectares: number): number => {
  return hectares * 10000;
};

export const getAreaUnit = (sqm: number, threshold: number = 10000): 'ha' | 'm²' => {
  return sqm >= threshold ? 'ha' : 'm²';
};

