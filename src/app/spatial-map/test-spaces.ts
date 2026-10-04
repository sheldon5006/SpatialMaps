import { Space, SpaceStatus } from '../../lib/core/types';

const svgDataUrl = (svg: string): string =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/**
 * Simplified 2D outdoor market test map.
 *
 * Built in the same order a real map is authored:
 * 1. ground
 * 2. roads and paths
 * 3. landscaped districts
 * 4. bookable booths
 * 5. essential amenities / infrastructure
 * 6. entries / exits
 * 7. lightweight labels
 *
 * The map intentionally has no full-map illustration, no logo card and no
 * legend card. The visual system itself carries the information.
 *
 * Artboard: 1400 x 900 map-space pixels.
 */

const iconImage = (
  kind:
    | 'parking'
    | 'restroom'
    | 'info'
    | 'firstaid'
    | 'stage'
    | 'entrance'
    | 'food'
    | 'atm',
): string => {
  const body = {
    parking: `
      <text x="36" y="51" text-anchor="middle"
        font-family="Arial" font-size="42" font-weight="900" fill="#176fae">P</text>`,
    restroom: `
      <circle cx="36" cy="36" r="23" fill="#2f8f70"/>
      <circle cx="28" cy="27" r="4" fill="#fff"/>
      <circle cx="44" cy="27" r="4" fill="#fff"/>
      <path d="M28 33 V50 M44 33 V50 M28 40 H44"
        stroke="#fff" stroke-width="4" stroke-linecap="round"/>`,
    info: `
      <circle cx="36" cy="36" r="22" fill="#2877aa"/>
      <text x="36" y="49" text-anchor="middle"
        font-family="Georgia" font-size="40" font-weight="700" fill="#fff">i</text>`,
    firstaid: `
      <circle cx="36" cy="36" r="22" fill="#d64f55"/>
      <rect x="30" y="21" width="12" height="30" rx="3" fill="#fff"/>
      <rect x="21" y="30" width="30" height="12" rx="3" fill="#fff"/>`,
    stage: `
      <rect x="13" y="17" width="46" height="38" rx="8" fill="#34434b"/>
      <path d="M19 48 L29 36 L37 43 L46 29 L57 48 Z" fill="#e4b45f"/>
      <path d="M23 55 H49" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`,
    entrance: `
      <path d="M9 49 L36 12 L63 49 Z" fill="#2e8b5c"/>
      <path d="M22 43 H50 M36 28 V43 M29 35 H43"
        stroke="#fff" stroke-width="4" stroke-linecap="round"/>`,
    food: `
      <circle cx="36" cy="36" r="22" fill="#ed8b4d"/>
      <path d="M25 22 V50 M25 22 Q35 26 25 31 M47 23 V48"
        stroke="#fff" stroke-width="4" stroke-linecap="round"/>`,
    atm: `
      <rect x="11" y="12" width="50" height="48" rx="8" fill="#56a64f"/>
      <rect x="20" y="20" width="32" height="16" rx="3" fill="#edf7e9"/>
      <text x="36" y="51" text-anchor="middle"
        font-family="Arial" font-size="12" font-weight="900" fill="#fff">ATM</text>`,
  }[kind];

  return svgDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">
  <circle cx="36" cy="36" r="31" fill="#ffffff" stroke="#c8c2b8" stroke-width="2"/>
  ${body}
</svg>`);
};

const booth = (
  id: string,
  name: string,
  x: number,
  y: number,
  width = 94,
  height = 50,
  status: SpaceStatus = 'available',
  rotation?: number,
): Space => ({
  id,
  type: 'booth',
  geometry: {
    type: 'rounded-rectangle',
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
  textVisible = false,
): Space => ({
  id,
  type: 'prop',
  geometry: { type: shape, x, y, width, height },
  properties: { name, propColor: color, textVisible },
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

const textbox = (
  id: string,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  rotation?: number,
): Space => ({
  id,
  type: 'textbox',
  geometry: {
    type: 'rectangle',
    x,
    y,
    width,
    height,
    ...(rotation === undefined ? {} : { rotation }),
  },
  properties: { name: text },
});

const boothRow = (
  prefix: string,
  names: string[],
  startX: number,
  y: number,
  width = 94,
  height = 50,
  gap = 10,
  statusOffset = 0,
): Space[] => {
  const statuses: SpaceStatus[] = [
    'available',
    'reserved',
    'available',
    'booked',
    'available',
    'reserved',
  ];

  return names.map((name, index) =>
    booth(
      `${prefix}-${String(index + 1).padStart(2, '0')}`,
      name,
      startX + index * (width + gap),
      y,
      width,
      height,
      statuses[(index + statusOffset) % statuses.length],
    ),
  );
};

export const TEST_SPACES: Space[] = [
  // ------------------------------------------------------------------------
  // 1. Ground
  // ------------------------------------------------------------------------
  prop('ground', 'Market Ground', 0, 0, 1400, 900, '#f1eee5', 'rectangle'),

  // ------------------------------------------------------------------------
  // 2. Roads and pedestrian routes
  // ------------------------------------------------------------------------
  prop('road-top', 'North Road', 0, 20, 1400, 70, '#bfc1bf', 'rounded-rectangle'),
  prop('road-bottom', 'South Road', 0, 810, 1400, 70, '#bfc1bf', 'rounded-rectangle'),
  prop('road-left', 'West Road', 20, 70, 72, 740, '#bfc1bf', 'rounded-rectangle'),
  prop('road-right', 'East Road', 1308, 70, 72, 740, '#bfc1bf', 'rounded-rectangle'),
  prop('road-main', 'Main Market Road', 92, 438, 1216, 70, '#c6c8c5', 'rounded-rectangle'),
  prop('path-center', 'Central Walk', 648, 92, 104, 718, '#d8d5ce', 'rounded-rectangle'),

  // Small pedestrian plazas.
  prop('plaza-north', 'North Plaza', 350, 270, 700, 84, '#ddd9d0', 'rounded-rectangle'),
  prop('plaza-south', 'South Plaza', 350, 560, 700, 84, '#ddd9d0', 'rounded-rectangle'),

  // ------------------------------------------------------------------------
  // 3. Landscape and district surfaces
  // ------------------------------------------------------------------------
  prop('north-west-district', 'North Bazaar', 210, 120, 470, 130, '#f2c89f', 'rounded-rectangle'),
  prop('north-east-district', 'Garden Market', 720, 120, 470, 130, '#cfe2b5', 'rounded-rectangle'),

  prop('west-food-district', 'Food Court', 150, 545, 390, 126, '#f0ddb0', 'rounded-rectangle'),
  prop('east-market-district', 'Riverside Row', 860, 545, 390, 126, '#bcd9ed', 'rounded-rectangle'),

  prop('south-left-district', 'Craft Walk', 320, 684, 380, 96, '#c3dec9', 'rounded-rectangle'),
  prop('south-right-district', 'Family Market', 760, 684, 330, 96, '#efc6a5', 'rounded-rectangle'),

  // Central green + small fountain.
  prop('central-green', 'Market Green', 370, 350, 660, 170, '#d8ebd0', 'ellipse'),
  prop('fountain', 'Fountain', 644, 395, 112, 80, '#71b9ca', 'ellipse', true),

  // Essential landscape accents.
  prop('flower-bed-1', 'Flower Bed', 388, 370, 86, 18, '#82ac72', 'rounded-rectangle'),
  prop('flower-bed-2', 'Flower Bed', 926, 370, 86, 18, '#82ac72', 'rounded-rectangle'),
  prop('flower-bed-3', 'Flower Bed', 420, 512, 88, 18, '#82ac72', 'rounded-rectangle'),
  prop('flower-bed-4', 'Flower Bed', 876, 512, 88, 18, '#82ac72', 'rounded-rectangle'),

  // ------------------------------------------------------------------------
  // 4. Exactly 30 bookable booths — deliberately separated, no overlap.
  // ------------------------------------------------------------------------

  // North Bazaar — 10
  ...boothRow(
    'north',
    ['Art Corner', 'Honey', 'Handmade', 'Vintage', 'Pottery'],
    232,
    155,
    78,
    50,
    10,
    0,
  ),
  ...boothRow(
    'north-b',
    ['Jewelry', 'Candles', 'Bakery', 'Textiles', 'Gifts'],
    232,
    215,
    78,
    50,
    10,
    2,
  ),

  // Food Court — 5
  ...boothRow(
    'food',
    ['Coffee', 'Tacos', 'Ice Cream', 'BBQ', 'Fresh Juice'],
    166,
    585,
    68,
    44,
    9,
    1,
  ),

  // Riverside Row — 5
  ...boothRow(
    'river',
    ['Plants', 'Herbs', 'Flowers', 'Garden Tools', 'Succulents'],
    876,
    585,
    68,
    44,
    9,
    2,
  ),

  // South craft/family strip — 10
  ...boothRow(
    'south',
    ['Toys', 'Books', 'Pets', 'Clothing', 'Accessories'],
    338,
    706,
    64,
    44,
    9,
    0,
  ),
  ...boothRow(
    'south-b',
    ['Ceramics', 'Prints', 'Crafts', 'Home Decor', 'Local Goods'],
    788,
    706,
    64,
    44,
    9,
    1,
  ),

  // ------------------------------------------------------------------------
  // 5. Essential amenity / infrastructure icons
  // ------------------------------------------------------------------------

  // Exactly 4 toilets.
  imageProp('restroom-1', 'Restroom North West', 360, 275, 56, 56, iconImage('restroom')),
  imageProp('restroom-2', 'Restroom North East', 984, 275, 56, 56, iconImage('restroom')),
  imageProp('restroom-3', 'Restroom South West', 560, 585, 56, 56, iconImage('restroom')),
  imageProp('restroom-4', 'Restroom South East', 760, 585, 56, 56, iconImage('restroom')),

  // Exactly 2 parking areas.
  prop('parking-north', 'North Parking', 410, 34, 580, 74, '#55585b', 'rounded-rectangle'),
  prop('parking-south', 'South Parking', 108, 714, 184, 88, '#55585b', 'rounded-rectangle'),
  imageProp('parking-icon-1', 'North Parking', 682, 42, 52, 52, iconImage('parking')),
  imageProp('parking-icon-2', 'South Parking', 174, 730, 52, 52, iconImage('parking')),

  // 3 infrastructure elements.
  prop('stage', 'Live Stage', 1084, 330, 168, 108, '#37454d', 'rounded-rectangle'),
  imageProp('stage-icon', 'Live Stage', 1138, 344, 56, 56, iconImage('stage')),
  prop('info-booth', 'Information Booth', 1086, 452, 154, 70, '#d9d0b8', 'rounded-rectangle'),
  imageProp('info-icon', 'Information', 1136, 458, 52, 52, iconImage('info')),
  prop('first-aid', 'First Aid', 1200, 675, 108, 70, '#ead2d1', 'rounded-rectangle'),
  imageProp('first-aid-icon', 'First Aid', 1230, 682, 52, 52, iconImage('firstaid')),

  // Food sign/icon only where useful.
  imageProp('food-icon', 'Food & Drinks', 168, 520, 52, 52, iconImage('food')),
  imageProp('atm-icon', 'ATM', 1160, 525, 52, 52, iconImage('atm')),

  // ------------------------------------------------------------------------
  // 6. Exactly 6 trees
  // ------------------------------------------------------------------------
  imageProp('tree-1', 'Tree', 306, 318, 54, 54, iconImage('stage')),
  imageProp('tree-2', 'Tree', 1020, 318, 54, 54, iconImage('stage')),
  imageProp('tree-3', 'Tree', 300, 500, 54, 54, iconImage('stage')),
  imageProp('tree-4', 'Tree', 1060, 500, 54, 54, iconImage('stage')),
  imageProp('tree-5', 'Tree', 470, 650, 54, 54, iconImage('stage')),
  imageProp('tree-6', 'Tree', 900, 650, 54, 54, iconImage('stage')),

  // ------------------------------------------------------------------------
  // 7. Four entry / exit points
  // ------------------------------------------------------------------------
  imageProp('north-entry', 'North Entry', 674, 92, 58, 58, iconImage('entrance')),
  imageProp('west-entry', 'West Entry', 74, 448, 58, 58, iconImage('entrance')),
  imageProp('east-entry', 'East Exit', 1268, 448, 58, 58, iconImage('entrance')),
  imageProp('south-exit', 'South Exit', 674, 782, 58, 58, iconImage('entrance')),

  // ------------------------------------------------------------------------
  // 8. Lightweight labels — enough to navigate, not a poster.
  // ------------------------------------------------------------------------
  textbox('north-title', 'NORTH BAZAAR', 372, 120, 170, 28),
  textbox('garden-title', 'GARDEN MARKET', 864, 120, 190, 28),
  textbox('food-title', 'FOOD COURT', 270, 548, 160, 28),
  textbox('river-title', 'RIVERSIDE ROW', 952, 548, 190, 28),
  textbox('craft-title', 'CRAFT WALK', 430, 688, 150, 26),
  textbox('family-title', 'FAMILY MARKET', 844, 688, 190, 26),
  textbox('north-entry-label', 'NORTH ENTRY', 624, 100, 160, 24),
  textbox('west-entry-label', 'WEST ENTRY', 40, 410, 130, 24, -90),
  textbox('east-entry-label', 'EAST EXIT', 1232, 412, 130, 24, 90),
  textbox('south-exit-label', 'SOUTH EXIT', 624, 828, 160, 24),
];