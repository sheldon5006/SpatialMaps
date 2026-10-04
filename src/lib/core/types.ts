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

export interface RectangleGeometry {
  type: 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
  /** Degrees, clockwise, around the rectangle's center. */
  rotation?: number;
}

// Future geometry kinds (polygon, circle) join this union without
// touching code that only cares about "a space has geometry".
export type SpaceGeometry = RectangleGeometry;

export interface SpaceProperties {
  name?: string;
  status?: SpaceStatus;
  [key: string]: unknown;
}

export interface Space {
  id: string;
  type?: string;
  geometry: SpaceGeometry;
  properties: SpaceProperties;
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
