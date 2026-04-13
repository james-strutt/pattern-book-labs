import { createBoundaryLayerService } from "@/services/map/selectedBoundaryLayerService";

const service = createBoundaryLayerService({
  layerId: "pattern-book-selected-boundary",
});

export const {
  showSelectedBoundaryLayer,
  removeSelectedBoundaryLayer,
  cleanupSelectedBoundaryLayer,
} = service;
