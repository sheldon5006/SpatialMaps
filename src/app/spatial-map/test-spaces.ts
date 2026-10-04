import { Space, SpaceStatus } from '../../lib/core/types';

/**
 * Reference fixture based on the supplied event-site map image.
 *
 * It deliberately exercises the current renderer features in one realistic
 * map: named/selectable booths, vector props, image props, mixed statuses,
 * rotated geometry, parking/road/context shapes, gates, signs and tree
 * clusters.
 *
 * Props keep their stored names but do not render booth-style labels — their
 * identity is represented by their vector shape or image.
 */

const signImage = (
  text: string,
  background: string,
  foreground = '#ffffff',
): string => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="420" height="96" viewBox="0 0 420 96">
      <rect width="420" height="96" rx="14" fill="${background}"/>
      <text x="210" y="57" text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif"
        font-size="28" font-weight="700" fill="${foreground}">${text}</text>
    </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const booth = (
  id: string,
  name: string,
  x: number,
  y: number,
  width = 46,
  height = 28,
  status: SpaceStatus = 'available',
  rotation?: number,
): Space => ({
  id,
  type: 'booth',
  geometry: {
    type: 'rectangle',
    x,
    y,
    width,
    height,
    ...(rotation === undefined ? {} : { rotation }),
  },
  properties: { name, status },
});

const prop = (
  id: string,
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  shape: Space['geometry']['type'] = 'rectangle',
): Space => ({
  id,
  type: 'prop',
  geometry: { type: shape, x, y, width, height },
  properties: { name, propColor: color },
});

const imageProp = (
  id: string,
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  imageUrl: string,
): Space => ({
  id,
  type: 'prop',
  geometry: { type: 'rectangle', x, y, width, height },
  properties: { name, imageUrl },
});

const boothRow = (
  prefix: string,
  labelPrefix: string,
  startX: number,
  startY: number,
  columns: number,
  rows: number,
  statusOffset = 0,
): Space[] => {
  const statuses: SpaceStatus[] = [
    'available',
    'reserved',
    'booked',
    'unavailable',
    'maintenance',
  ];

  return Array.from({ length: columns * rows }, (_, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    return booth(
      `${prefix}-${String(index + 1).padStart(2, '0')}`,
      `${labelPrefix} ${index + 1}`,
      startX + col * 56,
      startY + row * 36,
      48,
      28,
      statuses[(index + statusOffset) % statuses.length],
    );
  });
};

/** Compact tree cluster used to reproduce the green wooded areas. */
const treeCluster = (
  prefix: string,
  centerX: number,
  centerY: number,
  rows: number,
  cols: number,
): Space[] =>
  Array.from({ length: rows * cols }, (_, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const jitterX = ((index * 17) % 11) - 5;
    const jitterY = ((index * 13) % 9) - 4;
    const size = 12 + ((index * 7) % 7);
    return prop(
      `${prefix}-tree-${index + 1}`,
      'Tree',
      centerX + col * 22 + jitterX,
      centerY + row * 22 + jitterY,
      size,
      size,
      index % 3 === 0 ? '#166534' : index % 3 === 1 ? '#15803d' : '#22c55e',
      'circle',
    );
  });

export const TEST_SPACES: Space[] = [
  // ---- Main map signs / labeled areas (image props) ---------------------

  imageProp(
    'sign-general-store',
    'General Store',
    300,
    28,
    170,
    44,
    signImage('GENERAL STORE', '#1f2937'),
  ),
  imageProp(
    'sign-camp-3',
    'Camp 3',
    470,
    182,
    170,
    42,
    signImage('CAMP 3', '#7f1d1d'),
  ),
  imageProp(
    'sign-camp-2',
    'Camp 2',
    470,
    408,
    170,
    42,
    signImage('CAMP 2', '#334155'),
  ),
  imageProp(
    'sign-car-sales',
    'Car Sales & Car Show',
    28,
    470,
    214,
    42,
    signImage('CAR SALES & CAR SHOW', '#374151'),
  ),
  imageProp(
    'sign-arts-park',
    'Arts Park',
    42,
    600,
    145,
    40,
    signImage('ARTS PARK', '#92400e'),
  ),
  imageProp(
    'sign-overflow-parking',
    'Overflow Parking',
    260,
    520,
    210,
    44,
    signImage('OVERFLOW PARKING', '#166534'),
  ),
  imageProp(
    'sign-bafm-office',
    'Bafm Office',
    270,
    760,
    128,
    38,
    signImage('BAFM OFFICE', '#b91c1c'),
  ),
  imageProp(
    'sign-gate-75',
    'Gate 75',
    286,
    834,
    96,
    36,
    signImage('GATE 75', '#14532d'),
  ),
  imageProp(
    'sign-public-exit',
    'General Public Exit',
    8,
    780,
    190,
    42,
    signImage('GENERAL PUBLIC EXIT', '#991b1b'),
  ),
  imageProp(
    'sign-vendor-entrance',
    'Vendor / Camper Entrance',
    454,
    842,
    218,
    42,
    signImage('VENDOR / CAMPER ENTRANCE', '#7f1d1d'),
  ),

  // ---- Context / roads / areas ------------------------------------------

  prop('road-main', 'Main Road', 205, 20, 68, 830, '#d1d5db', 'line'),
  prop('road-cross', 'Cross Road', 18, 390, 650, 52, '#d1d5db', 'rounded-rectangle'),
  prop('road-lower', 'Lower Road', 16, 720, 650, 48, '#cbd5e1', 'rounded-rectangle'),

  prop('food-zone', 'Food Vendors Zone', 18, 74, 215, 255, '#f5f5f4', 'rounded-rectangle'),
  prop('general-store-zone', 'General Store Zone', 292, 76, 178, 92, '#e7e5e4', 'rounded-rectangle'),
  prop('camp-3-zone', 'Camp 3', 454, 224, 202, 138, '#ecfccb', 'rounded-rectangle'),
  prop('camp-2-zone', 'Camp 2', 454, 450, 202, 214, '#e2e8f0', 'rounded-rectangle'),
  prop('car-show-zone', 'Car Sales Area', 18, 520, 218, 176, '#fef3c7', 'rounded-rectangle'),
  prop('arts-zone', 'Arts Park', 24, 650, 180, 58, '#fde68a', 'rounded-rectangle'),
  prop('parking-zone', 'Overflow Parking', 242, 566, 414, 140, '#dcfce7', 'rounded-rectangle'),

  // Simple triangular gates / directional markers.
  prop('gate-west', 'Public Exit Marker', 186, 790, 28, 34, '#b91c1c', 'triangle'),
  prop('gate-center', 'Gate 75 Marker', 322, 826, 32, 38, '#15803d', 'triangle'),
  prop('gate-east', 'Vendor Entrance Marker', 640, 846, 30, 38, '#b91c1c', 'triangle'),

  // ---- Food vendors / Hall Blue -----------------------------------------

  booth('A101', 'Hall Blue 1', 36, 92, 50, 30, 'available'),
  booth('A102', 'Hall Blue 2', 94, 92, 50, 30, 'reserved'),
  booth('A103', 'Hall Blue 3', 152, 92, 50, 30, 'booked'),
  booth('A104', 'Hall Blue 4', 36, 132, 50, 30, 'unavailable'),
  booth('A105', 'Hall Blue 5', 94, 132, 50, 30, 'maintenance'),
  booth('A106', 'Hall Blue 6', 152, 132, 50, 30, 'reserved', 12),

  ...boothRow('food', 'Food Vendor', 36, 182, 3, 4, 0),

  imageProp(
    'sign-beverage-tent',
    'Beverage Tent',
    24,
    58,
    138,
    34,
    signImage('BEVERAGE TENT', '#0f766e'),
  ),

  // ---- General store -----------------------------------------------------

  boothRow('store', 'Store', 310, 92, 2, 2, 1).map((space) => ({
    ...space,
    geometry: {
      ...space.geometry,
      width: 64,
      height: 32,
    },
  })),

  // ---- Camp 3 -----------------------------------------------------------

  ...treeCluster('camp3', 498, 232, 5, 6),
  ...boothRow('camp3', 'Camp 3 Site', 478, 286, 3, 3, 1),

  // ---- Camp 2 -----------------------------------------------------------

  ...boothRow('camp2', 'Camp 2 Site', 478, 472, 3, 5, 2),
  ...treeCluster('camp2', 596, 516, 4, 2),

  // ---- Car sales / car show ---------------------------------------------

  booth('car-01', 'Car 01', 38, 532, 52, 34, 'available'),
  booth('car-02', 'Car 02', 98, 532, 52, 34, 'reserved'),
  booth('car-03', 'Car 03', 158, 532, 52, 34, 'booked'),
  booth('car-04', 'Car 04', 38, 578, 52, 34, 'available'),
  booth('car-05', 'Car 05', 98, 578, 52, 34, 'maintenance'),
  booth('car-06', 'Car 06', 158, 578, 52, 34, 'reserved'),
  booth('car-07', 'Car 07', 38, 624, 52, 34, 'unavailable'),
  booth('car-08', 'Car 08', 98, 624, 52, 34, 'available'),
  booth('car-09', 'Car 09', 158, 624, 52, 34, 'booked'),

  // ---- Arts / exhibits ---------------------------------------------------

  booth('arts-01', 'Arts 01', 38, 662, 54, 30, 'reserved'),
  booth('arts-02', 'Arts 02', 98, 662, 54, 30, 'available'),
  booth('arts-03', 'Arts 03', 158, 662, 54, 30, 'booked'),

  // ---- Overflow parking / lower corridor -------------------------------

  prop('parking-row-a', 'Parking Row A', 270, 594, 350, 8, '#94a3b8', 'line'),
  prop('parking-row-b', 'Parking Row B', 270, 638, 350, 8, '#94a3b8', 'line'),
  prop('parking-row-c', 'Parking Row C', 270, 682, 350, 8, '#94a3b8', 'line'),

  // A few mixed shapes to exercise the full vector renderer.
  prop('parking-marker-1', 'Parking Marker 1', 274, 602, 18, 18, '#0f766e', 'diamond'),
  prop('parking-marker-2', 'Parking Marker 2', 304, 602, 18, 18, '#0f766e', 'circle'),
  prop('parking-marker-3', 'Parking Marker 3', 334, 602, 24, 16, '#0369a1', 'ellipse'),
  prop('parking-marker-4', 'Parking Marker 4', 366, 602, 28, 18, '#7c3aed', 'rounded-rectangle'),

  // ---- Trees / landscaping around the whole venue ----------------------

  ...treeCluster('north', 244, 34, 3, 5),
  ...treeCluster('south-west', 220, 744, 3, 5),
  ...treeCluster('south-east', 620, 720, 3, 3),

  // ---- Bottom facilities -------------------------------------------------

  booth('office-01', 'Bafm Office', 286, 772, 92, 42, 'available'),
  booth('gate-75', 'Gate 75', 292, 842, 84, 34, 'reserved'),
  booth('vendor-entry-01', 'Vendor Entry', 496, 842, 86, 34, 'available'),
];
