/**
 * Core spatial data model. Framework-agnostic, serializable, no PixiJS
 * or Angular types leak in here — this is the contract developers build
 * their integrations against.
 */

export type SpaceStatus =
  | 'available'
  | 'reserved'
  | 'booked'
  | 'unavailable'
  | 'maintenance'
  | 'selected';

/** High-level role of a map element. */
export type SpaceElementType = 'booth' | 'prop';

/** Basic infrastructure/prop vocabulary for venue and market maps. */
interface BaseGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Degrees, clockwise, around the geometry's center. */
  rotation?: number;
}

export interface RectangleGeometry extends BaseGeometry {
  type: 'rectangle';
}

export interface RoundedRectangleGeometry extends BaseGeometry {
  type: 'rounded-rectangle';
}

export interface CircleGeometry extends BaseGeometry {
  type: 'circle';
}

export interface EllipseGeometry extends BaseGeometry {
  type: 'ellipse';
}

export interface TriangleGeometry extends BaseGeometry {
  type: 'triangle';
}

export interface DiamondGeometry extends BaseGeometry {
  type: 'diamond';
}

/**
 * A thin rotated segment. Its width represents the path/line length and
 * height represents its thickness.
 */
export interface LineGeometry extends BaseGeometry {
  type: 'line';
}

/** Basic vector shapes for building simple venue/market maps. */
export type SpaceGeometry =
  | RectangleGeometry
  | RoundedRectangleGeometry
  | CircleGeometry
  | EllipseGeometry
  | TriangleGeometry
  | DiamondGeometry
  | LineGeometry;

export interface SpaceProperties {
  name?: string;
  status?: SpaceStatus;
  /** Custom hex color for prop/infrastructure vector elements (for example "#4ade80"). */
  propColor?: string;
  /** Rendered as an image fill on top of the status color when set. */
  imageUrl?: string;
  [key: string]: unknown;
}

export interface Space {
  id: string;
  /** Map element role. Kept as a string-compatible field for future custom roles. */
  type?: SpaceElementType | string;
  geometry: SpaceGeometry;
  properties: SpaceProperties;
}

export const SPATIAL_MAP_EXPORT_VERSION = 1 as const;

/**
 * The serialization envelope used by engine.exportData()/importData().
 * Versioned so the format can evolve without breaking old exports.
 */
export interface SpatialMapExport {
  version: typeof SPATIAL_MAP_EXPORT_VERSION;
  spaces: Space[];
}

export interface StatusStyle {
  fill: number;
  fillAlpha?: number;
  stroke?: number;
  strokeWidth?: number;
}

export type StatusStyleMap = Partial<Record<SpaceStatus, StatusStyle>>;

/** Placeholder palette — developers are expected to override this. */
export const DEFAULT_STATUS_STYLES: Required<StatusStyleMap> = {
  available: { fill: 0x2ecc71, stroke: 0x1b8a4e, strokeWidth: 1 },
  reserved: { fill: 0xf1c40f, stroke: 0xa98307, strokeWidth: 1 },
  booked: { fill: 0xe67e22, stroke: 0xa85a14, strokeWidth: 1 },
  unavailable: { fill: 0x7f8c8d, stroke: 0x56605f, strokeWidth: 1 },
  maintenance: { fill: 0x9b59b6, stroke: 0x6c3d80, strokeWidth: 1 },
  selected: { fill: 0x3498db, stroke: 0x1f618d, strokeWidth: 2 },
};

export const FALLBACK_STATUS_STYLE: StatusStyle = {
  fill: 0x3a3f4b,
  stroke: 0x53596a,
  strokeWidth: 1,
};
