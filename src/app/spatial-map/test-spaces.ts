import { Space } from '../../lib/core/types';

/**
 * Temporary fixture for Step 1.3. Stands in for data that will eventually
 * come from a developer's own API/database via engine.loadSpaces().
 */
export const TEST_SPACES: Space[] = [
  {
    id: 'A101',
    type: 'booth',
    geometry: { type: 'rectangle', x: 0, y: 0, width: 80, height: 60 },
    properties: { name: 'Booth A101', status: 'available' },
  },
  {
    id: 'A102',
    type: 'booth',
    geometry: { type: 'rectangle', x: 100, y: 0, width: 80, height: 60 },
    properties: { name: 'Booth A102', status: 'reserved' },
  },
  {
    id: 'A103',
    type: 'booth',
    geometry: { type: 'rectangle', x: 200, y: 0, width: 80, height: 60 },
    properties: { name: 'Booth A103', status: 'booked' },
  },
  {
    id: 'A104',
    type: 'booth',
    geometry: { type: 'rectangle', x: 0, y: 80, width: 80, height: 60 },
    properties: { name: 'Booth A104', status: 'unavailable' },
  },
  {
    id: 'A105',
    type: 'booth',
    geometry: { type: 'rectangle', x: 100, y: 80, width: 80, height: 60 },
    properties: { name: 'Booth A105', status: 'maintenance' },
  },
  {
    id: 'A106',
    type: 'booth',
    geometry: {
      type: 'rectangle',
      x: 200,
      y: 80,
      width: 80,
      height: 60,
      rotation: 15,
    },
    properties: { name: 'Booth A106', status: 'selected' },
  },
];
