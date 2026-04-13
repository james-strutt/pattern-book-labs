import { cn } from '@/lib/utils';
import * as React from 'react';
import { LANDIQ_THEME } from '@/components/ui/landiq/theme';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  className?: string;
  variant?: 'primary' | 'success' | 'warning' | 'error';
  indicatorColor?: string;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, variant = 'primary', indicatorColor, ...props }, ref) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));

    const variantColors: Record<string, string> = {
      primary: LANDIQ_THEME.colors.brand.supplementary,
      success: LANDIQ_THEME.colors.status.success,
      warning: LANDIQ_THEME.colors.status.warning,
      error: LANDIQ_THEME.colors.status.error,
    };

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        className={cn(
          'relative h-2 w-full overflow-hidden rounded-full',
          className
        )}
        style={{ backgroundColor: LANDIQ_THEME.colors.greys.grey04 }}
        {...props}
      >
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${percentage}%`,
            backgroundColor: indicatorColor ?? variantColors[variant],
          }}
        />
      </div>
    );
  }
);

Progress.displayName = 'Progress';

export { Progress };
export default Progress;

