import { Space } from './types';

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Axis-aligned bounding box of a (possibly rotated) rectangle space. */
export function getSpaceBounds(space: Space): Bounds {
  const { x, y, width, height, rotation } = space.geometry;

  if (!rotation) {
    return { minX: x, minY: y, maxX: x + width, maxY: y + height };
  }

  const cx = x + width / 2;
  const cy = y + height / 2;
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const hw = width / 2;
  const hh = height / 2;

  const corners = [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh],
  ].map(([lx, ly]) => ({
    x: cx + lx * cos - ly * sin,
    y: cy + lx * sin + ly * cos,
  }));

  return {
    minX: Math.min(...corners.map((c) => c.x)),
    minY: Math.min(...corners.map((c) => c.y)),
    maxX: Math.max(...corners.map((c) => c.x)),
    maxY: Math.max(...corners.map((c) => c.y)),
  };
}

/** Combined bounding box of several spaces. Returns null for an empty list. */
export function unionBounds(spaces: Space[]): Bounds | null {
  if (spaces.length === 0) return null;

  return spaces
    .map(getSpaceBounds)
    .reduce((acc, b) => ({
      minX: Math.min(acc.minX, b.minX),
      minY: Math.min(acc.minY, b.minY),
      maxX: Math.max(acc.maxX, b.maxX),
      maxY: Math.max(acc.maxY, b.maxY),
    }));
}
