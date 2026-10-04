import { MapStatusDefinition, MapTheme } from './types';

export interface SpatialMapZoomSettings {
  minZoom: number;
  baseZoom: number;
  maxZoom: number;
}

export interface SpatialMapGridSettings {
  enabled: boolean;
  size: number;
}

export interface SpatialMapSearchSettings {
  enabled: boolean;
}

export interface SpatialMapFocusSettings {
  enabled: boolean;
  durationMs: number;
  color: string;
}

export interface SpatialMapSettings {
  theme: MapTheme;
  zoom: SpatialMapZoomSettings;
  grid: SpatialMapGridSettings;
  search: SpatialMapSearchSettings;
  focus: SpatialMapFocusSettings;
}

export type SpatialMapSettingsPatch = {
  theme?: MapTheme;
  zoom?: Partial<SpatialMapZoomSettings>;
  grid?: Partial<SpatialMapGridSettings>;
  search?: Partial<SpatialMapSearchSettings>;
  focus?: Partial<SpatialMapFocusSettings>;
};

export const DEFAULT_SPATIAL_MAP_SETTINGS: SpatialMapSettings = {
  theme: 'light',
  zoom: {
    minZoom: 0.65,
    baseZoom: 0.88,
    maxZoom: 2.8,
  },
  grid: {
    enabled: true,
    size: 50,
  },
  search: {
    enabled: true,
  },
  focus: {
    enabled: true,
    durationMs: 2000,
    color: '#a855f7',
  },
};

export const DEFAULT_MAP_STATUS_DEFINITIONS: MapStatusDefinition[] = [
  { key: 'available', label: 'Available', color: '#2ecc71' },
  { key: 'reserved', label: 'Reserved', color: '#f1c40f' },
  { key: 'booked', label: 'Booked', color: '#e67e22' },
  { key: 'unavailable', label: 'Unavailable', color: '#7f8c8d' },
  { key: 'maintenance', label: 'Maintenance', color: '#9b59b6' },
];
