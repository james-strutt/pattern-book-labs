import React from 'react';
import { LANDIQ_THEME } from '@/components/ui/landiq/theme';
import { Button } from '@/components/ui/landiq';
import { SelectionModeToggle } from '@/apps/patternBook/components/selection/SelectionModeToggle';
import { BookOpen, Database } from 'lucide-react';
import { capture } from '@/lib/posthog';
import { PATTERNBOOK_EVENTS } from '@/constants/analyticsEvents';
import type { SelectionMode } from '@/apps/patternBook/types/shortlistAnalysis';

interface PatternBookHeaderProps {
  selectionMode: SelectionMode;
  onModeChange: (mode: SelectionMode) => void;
  propertyCount: number;
  disableModeToggle: boolean;
  onDataSourcesClick: () => void;
  additionalRightContent?: React.ReactNode;
}

export const PatternBookHeader: React.FC<PatternBookHeaderProps> = ({
  selectionMode,
  onModeChange,
  propertyCount,
  disableModeToggle,
  onDataSourcesClick,
  additionalRightContent,
}) => (
  <div style={{
    position: 'relative',
    borderRadius: LANDIQ_THEME.borders.buttonRadius,
    overflow: 'hidden',
    marginBottom: LANDIQ_THEME.spacing.md,
    background: LANDIQ_THEME.colors.brand.dark,
  }}>
    <div style={{
      position: 'absolute',
      inset: 0,
      backgroundImage: 'url(/pattern-book/pattern-book-banner.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      opacity: 0.5,
    }} />
    <div style={{
      position: 'relative',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: `${LANDIQ_THEME.spacing.md} ${LANDIQ_THEME.spacing.lg}`,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: LANDIQ_THEME.spacing.sm,
        background: 'rgba(0, 38, 100, 0.6)',
        borderRadius: '999px',
        padding: `${LANDIQ_THEME.spacing.xs} ${LANDIQ_THEME.spacing.md}`,
      }}>
        <BookOpen size={20} color="#FFFFFF" />
        <h1 style={{
          fontSize: LANDIQ_THEME.typography.fontSize.lg,
          fontWeight: LANDIQ_THEME.typography.fontWeight.semibold,
          color: '#FFFFFF',
          margin: 0,
        }}>
          NSW Pattern Book
        </h1>
      </div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: LANDIQ_THEME.spacing.sm,
        background: 'rgba(0, 38, 100, 0.6)',
        borderRadius: '999px',
        padding: `${LANDIQ_THEME.spacing.xs} ${LANDIQ_THEME.spacing.md}`,
      }}>
        <SelectionModeToggle
          mode={selectionMode}
          onChange={onModeChange}
          propertyCount={propertyCount}
          disabled={disableModeToggle}
        />
        <Button
          variant="outline"
          size="small"
          onClick={() => {
            capture(PATTERNBOOK_EVENTS.DATA_SOURCES_VIEWED, {});
            onDataSourcesClick();
          }}
          title="View data sources and methodology"
        >
          <Database size={14} style={{ marginRight: LANDIQ_THEME.spacing.xs }} />
          Data Sources
        </Button>
        {additionalRightContent}
      </div>
    </div>
  </div>
);
