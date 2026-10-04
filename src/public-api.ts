/**
 * Public integration surface for the SpatialMaps prototype.
 *
 * Angular applications can import the standalone component plus the
 * framework-agnostic engine/types from this single entry point.
 */
export { SpatialMap } from './app/spatial-map/spatial-map';
export { SpatialMapEngine } from './lib/core/spatial-map-engine';
export {
  DEFAULT_MAP_STATUS_DEFINITIONS,
  DEFAULT_SPATIAL_MAP_SETTINGS,
} from './lib/core/spatial-map-settings';
export type {
  SpatialMapGridSettings,
  SpatialMapSearchSettings,
  SpatialMapFocusSettings,
  SpatialMapSettings,
  SpatialMapSettingsPatch,
  SpatialMapZoomSettings,
} from './lib/core/spatial-map-settings';
export type {
  MapStatusDefinition,
  MapTheme,
  Space,
  SpaceElementType,
  SpaceGeometry,
  SpaceProperties,
  SpaceStatus,
  StatusStyle,
  StatusStyleMap,
} from './lib/core/types';
export type {
  MapMode,
  SelectionRule,
  VisualFilter,
} from './lib/core/space-renderer';
