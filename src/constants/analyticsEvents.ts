export const PATTERNBOOK_EVENTS = {
  ANALYSIS_STARTED: "patternbook.analysis.started",
  PROPERTY_SELECTED: "patternbook.property.selected",
  SELECTION_MODE_CHANGED: "patternbook.selection_mode.changed",
  FILTER_TOGGLED: "patternbook.filter.toggled",
  FILTER_CHANGED: "patternbook.filter.changed",
  SORT_FIELD_CHANGED: "patternbook.sort.field_changed",
  PATTERN_EXPANDED: "patternbook.pattern.expanded",
  EXPORT_MATRIX_CSV: "patternbook.export.matrix_csv",
  EXPORT_FULL_ANALYSIS_CSV: "patternbook.export.full_analysis_csv",
  DATA_SOURCES_VIEWED: "patternbook.data_sources.viewed",
  VIEW_MODE_CHANGED: "patternbook.view_mode.changed",
  PATTERN_PLACED: "patternbook.pattern.placed",
  PATTERN_PLACEMENT_FAILED: "patternbook.pattern.placement_failed",
  PATTERN_PLACEMENT_CLEARED: "patternbook.pattern.placement_cleared",
  SHORTLIST_PLACEMENT_BATCH_STARTED:
    "patternbook.shortlist.placement_batch_started",
  SHORTLIST_PLACEMENT_BATCH_PROGRESS:
    "patternbook.shortlist.placement_batch_progress",
  SHORTLIST_PLACEMENT_BATCH_COMPLETED:
    "patternbook.shortlist.placement_batch_completed",
  SHORTLIST_PLACEMENT_BATCH_FAILED:
    "patternbook.shortlist.placement_batch_failed",
  SHORTLIST_PLACEMENT_BATCH_CLEARED:
    "patternbook.shortlist.placement_batch_cleared",
  PROJECT_BUNDLE_BOOTSTRAP_STARTED:
    "patternbook.project_bundle.bootstrap_started",
  PROJECT_BUNDLE_BOOTSTRAP_READY:
    "patternbook.project_bundle.bootstrap_ready",
  PROJECT_BUNDLE_BOOTSTRAP_FAILED:
    "patternbook.project_bundle.bootstrap_failed",
} as const;
