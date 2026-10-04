import { Space, SpaceStatus } from '../../lib/core/types';

const STATUSES: SpaceStatus[] = [
  'available',
  'reserved',
  'booked',
  'unavailable',
  'maintenance',
];

const CELL_WIDTH = 40;
const CELL_HEIGHT = 30;
const GAP = 8;

/**
 * Lays out `count` spaces in a square-ish grid, cycling through statuses.
 * Dev/benchmark fixture only — not part of the engine's public surface.
 */
export function generateBenchSpaces(count: number): Space[] {
  const columns = Math.ceil(Math.sqrt(count));
  const spaces: Space[] = [];

  for (let i = 0; i < count; i++) {
    const col = i % columns;
    const row = Math.floor(i / columns);
    spaces.push({
      id: `bench-${i}`,
      type: 'booth',
      geometry: {
        type: 'rectangle',
        x: col * (CELL_WIDTH + GAP),
        y: row * (CELL_HEIGHT + GAP),
        width: CELL_WIDTH,
        height: CELL_HEIGHT,
      },
      properties: {
        name: `Space ${i}`,
        status: STATUSES[i % STATUSES.length],
      },
    });
  }

  return spaces;
}
