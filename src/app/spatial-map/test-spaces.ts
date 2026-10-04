import { Space, SpaceStatus } from '../../lib/core/types';

const svgDataUrl = (svg: string): string =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/**
 * Clean, browse-first outdoor market fixture.
 *
 * Artboard: 1400 x 900 map-space pixels.
 * Exactly 30 bookable booths, two parking areas, four restrooms, six trees,
 * three infrastructure buildings, four entry/exit points, roads, landscape,
 * paths, a food court, a stage, information/first aid and a compact legend.
 *
 * The scene is intentionally composed from the application's own primitives
 * instead of using a single full-map background image.
 */

const logoImage = (): string => svgDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="460" height="150" viewBox="0 0 460 150">
  <rect width="460" height="150" rx="28" fill="#fffdf8" stroke="#c5bdab" stroke-width="3"/>
  <path d="M54 52 C96 15 141 15 174 50 C214 12 271 12 308 50" fill="none" stroke="#2d7d42" stroke-width="7" stroke-linecap="round"/>
  <circle cx="175" cy="37" r="17" fill="#df654a"/>
  <text x="229" y="78" text-anchor="middle" font-family="Georgia,serif" font-size="30" font-weight="700" fill="#9c5c36">Riverside</text>
  <text x="230" y="112" text-anchor="middle" font-family="Georgia,serif" font-size="34" font-weight="800" fill="#2d7d42">Outdoor Market</text>
  <text x="230" y="135" text-anchor="middle" font-family="Arial" font-size="11" font-weight="700" letter-spacing="3" fill="#6f756c">SHOP • EAT • EXPLORE</text>
</svg>`);

const iconImage = (
  kind: 'parking' | 'restroom' | 'info' | 'firstaid' | 'stage' | 'tree' | 'entrance' | 'food' | 'atm',
): string => {
  const body = {
    parking: `
      <text x="36" y="51" text-anchor="middle" font-family="Arial" font-size="43" font-weight="900" fill="#176fae">P</text>`,
    restroom: `
      <circle cx="36" cy="36" r="23" fill="#399574"/>
      <circle cx="28" cy="27" r="4" fill="#fff"/><circle cx="44" cy="27" r="4" fill="#fff"/>
      <path d="M28 33 V50 M44 33 V50 M28 40 H44" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`,
    info: `
      <circle cx="36" cy="36" r="22" fill="#2b79ad"/>
      <text x="36" y="49" text-anchor="middle" font-family="Georgia" font-size="40" font-weight="700" fill="#fff">i</text>`,
    firstaid: `
      <circle cx="36" cy="36" r="22" fill="#d95357"/>
      <rect x="30" y="21" width="12" height="30" rx="3" fill="#fff"/>
      <rect x="21" y="30" width="30" height="12" rx="3" fill="#fff"/>`,
    stage: `
      <rect x="13" y="17" width="46" height="38" rx="8" fill="#303f49"/>
      <path d="M19 48 L29 36 L37 43 L46 29 L57 48 Z" fill="#e6b75d"/>
      <path d="M23 55 H49" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`,
    tree: `
      <rect x="32" y="40" width="8" height="17" rx="3" fill="#80512d"/>
      <circle cx="36" cy="32" r="21" fill="#2e7f3f"/>
      <circle cx="24" cy="37" r="13" fill="#4c9945"/>
      <circle cx="48" cy="38" r="13" fill="#57a64f"/>
      <circle cx="35" cy="21" r="12" fill="#63ae56"/>`,
    entrance: `
      <path d="M9 49 L36 12 L63 49 Z" fill="#2f8a58"/>
      <path d="M22 43 H50 M36 28 V43 M29 35 H43" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`,
    food: `
      <circle cx="36" cy="36" r="22" fill="#ef8b4d"/>
      <path d="M25 22 V50 M25 22 Q35 26 25 31 M47 23 V48" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`,
    atm: `
      <rect x="11" y="12" width="50" height="48" rx="8" fill="#55a54e"/>
      <rect x="20" y="20" width="32" height="16" rx="3" fill="#edf7e9"/>
      <text x="36" y="51" text-anchor="middle" font-family="Arial" font-size="12" font-weight="900" fill="#fff">ATM</text>`,
  }[kind];

  return svgDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">
  <circle cx="36" cy="36" r="31" fill="#ffffff" stroke="#c8c2b8" stroke-width="2"/>
  ${body}
</svg>`);
};

const legendImage = (): string => svgDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="420" height="250" viewBox="0 0 420 250">
  <rect width="420" height="250" rx="22" fill="#fffdf8" stroke="#bdb5a8" stroke-width="3"/>
  <text x="22" y="35" font-family="Georgia" font-size="24" font-weight="700" fill="#2d7d56">Market Guide</text>
  <text x="22" y="58" font-family="Arial" font-size="10" font-weight="700" fill="#7b7e78">DISTRICTS</text>
  <circle cx="30" cy="84" r="9" fill="#e8b17b"/><text x="48" y="89" font-family="Arial" font-size="13" fill="#4f5559">North Bazaar</text>
  <circle cx="30" cy="110" r="9" fill="#9ccc85"/><text x="48" y="115" font-family="Arial" font-size="13" fill="#4f5559">Garden Market</text>
  <circle cx="30" cy="136" r="9" fill="#9dc9e8"/><text x="48" y="141" font-family="Arial" font-size="13" fill="#4f5559">Riverside Row</text>
  <circle cx="30" cy="162" r="9" fill="#f2d59f"/><text x="48" y="167" font-family="Arial" font-size="13" fill="#4f5559">Food Court</text>
  <line x1="220" y1="70" x2="220" y2="220" stroke="#ddd6cb" stroke-width="2"/>
  <text x="240" y="90" font-family="Arial" font-size="10" font-weight="700" fill="#7b7e78">AMENITIES</text>
  <circle cx="254" cy="116" r="10" fill="#176fae"/><text x="248" y="121" font-family="Arial" font-size="12" font-weight="900" fill="#fff">P</text><text x="274" y="121" font-family="Arial" font-size="13" fill="#4f5559">Parking</text>
  <circle cx="254" cy="145" r="10" fill="#399574"/><text x="246" y="150" font-family="Arial" font-size="9" font-weight="900" fill="#fff">WC</text><text x="274" y="150" font-family="Arial" font-size="13" fill="#4f5559">Restrooms</text>
  <circle cx="254" cy="174" r="10" fill="#2b79ad"/><text x="250" y="180" font-family="Arial" font-size="14" font-weight="900" fill="#fff">i</text><text x="274" y="179" font-family="Arial" font-size="13" fill="#4f5559">Information</text>
  <circle cx="254" cy="203" r="10" fill="#d95357"/><text x="250" y="209" font-family="Arial" font-size="13" font-weight="900" fill="#fff">+</text><text x="274" y="208" font-family="Arial" font-size="13" fill="#4f5559">First aid</text>
</svg>`);

const booth = (
  id: string,
  name: string,
  x: number,
  y: number,
  width = 90,
  height = 48,
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

const boothStrip = (
  prefix: string,
  names: string[],
  x: number,
  y: number,
  width = 90,
  height = 48,
  gap = 9,
  offset = 0,
): Space[] => {
  const statuses: SpaceStatus[] = [
    'available',
    'reserved',
    'available',
    'booked',
    'available',
    'reserved',
    'maintenance',
    'available',
  ];

  return names.map((name, index) =>
    booth(
      `${prefix}-${String(index + 1).padStart(2, '0')}`,
      name,
      x + index * (width + gap),
      y,
      width,
      height,
      statuses[(index + offset) % statuses.length],
    ),
  );
};

export const TEST_SPACES: Space[] = [
  // ------------------------------------------------------------------------
  // Ground / roads / parking / districts
  // ------------------------------------------------------------------------
  prop('ground', 'Market Ground', 0, 0, 1400, 900, '#f4f1e8', 'rectangle'),

  // Perimeter road
  prop('road-north', 'North Road', 0, 18, 1400, 66, '#bdbfc0', 'rounded-rectangle'),
  prop('road-south', 'South Road', 0, 816, 1400, 66, '#bdbfc0', 'rounded-rectangle'),
  prop('road-west', 'West Road', 18, 70, 68, 764, '#bdbfc0', 'rounded-rectangle'),
  prop('road-east', 'East Road', 1314, 70, 68, 764, '#bdbfc0', 'rounded-rectangle'),
  prop('road-cross', 'Market Crossroad', 70, 430, 1244, 74, '#c5c6c4', 'rounded-rectangle'),
  prop('road-center', 'Central Path', 654, 84, 92, 732, '#d0cfca', 'rounded-rectangle'),

  // Parking areas
  prop('parking-north', 'North Parking', 420, 96, 560, 112, '#55585b', 'rounded-rectangle'),
  prop('parking-southwest', 'South West Parking', 92, 694, 250, 116, '#55585b', 'rounded-rectangle'),

  // District cards
  prop('district-north-west', 'North Bazaar', 250, 108, 322, 120, '#f0bf8d', 'rounded-rectangle'),
  prop('district-north-east', 'Garden Market', 790, 108, 322, 120, '#c7dfaa', 'rounded-rectangle'),
  prop('district-west', 'Food Court', 164, 520, 420, 128, '#f0dda7', 'rounded-rectangle'),
  prop('district-east', 'Riverside Row', 796, 520, 420, 128, '#b9d8ec', 'rounded-rectangle'),
  prop('district-south-left', 'Craft Walk', 386, 690, 350, 112, '#bddbc5', 'rounded-rectangle'),
  prop('district-south-right', 'Family Market', 784, 690, 348, 112, '#efc4a4', 'rounded-rectangle'),

  // Central landscaped plaza
  prop('plaza-lawn', 'Market Green', 390, 250, 620, 260, '#d6e8cf', 'ellipse'),
  prop('fountain', 'Fountain', 650, 330, 100, 70, '#6fb9cb', 'ellipse', true),

  // Food court tent + live stage
  prop('food-tent', 'Food Court Tent', 214, 538, 150, 90, '#e9dcc6', 'triangle'),
  prop('stage', 'Live Stage', 1012, 548, 160, 94, '#34434a', 'rounded-rectangle'),

  // ------------------------------------------------------------------------
  // 30 bookable booths
  // ------------------------------------------------------------------------
  booth('A101', 'Art Corner', 214, 245, 92, 48, 'available'),
  booth('A102', 'Honey', 314, 245, 92, 48, 'reserved'),
  booth('A103', 'Handmade', 414, 245, 92, 48, 'available'),
  booth('A104', 'Vintage', 514, 245, 92, 48, 'booked'),
  booth('A105', 'Pottery', 614, 245, 92, 48, 'available'),
  booth('A106', 'Jewelry', 714, 245, 92, 48, 'reserved', 5),
  booth('top-07', 'Candles', 814, 245, 92, 48, 'available'),
  booth('top-08', 'Bakery', 914, 245, 92, 48, 'reserved'),
  booth('top-09', 'Textiles', 1014, 245, 92, 48, 'maintenance'),
  booth('top-10', 'Gifts', 1114, 245, 92, 48, 'available'),

  ...boothStrip(
    'west',
    ['Coffee','Tacos','Ice Cream','BBQ','Lemonade'],
    214, 548, 72, 44, 8, 1,
  ),

  ...boothStrip(
    'east',
    ['Plants','Herbs','Flowers','Garden','Succulents'],
    820, 548, 72, 44, 8, 2,
  ),

  ...boothStrip(
    'bottom',
    ['Toys','Books','Pets','Clothing','Accessories','Ceramics','Prints','Crafts','Home Decor','Local Goods'],
    390, 736, 90, 44, 8, 0,
  ),

  // ------------------------------------------------------------------------
  // Amenities / infrastructure
  // ------------------------------------------------------------------------
  imageProp('restroom-1', 'Restroom North', 590, 266, 58, 58, iconImage('restroom')),
  imageProp('restroom-2', 'Restroom West', 392, 426, 58, 58, iconImage('restroom')),
  imageProp('restroom-3', 'Restroom East', 950, 426, 58, 58, iconImage('restroom')),
  imageProp('restroom-4', 'Restroom South', 692, 668, 58, 58, iconImage('restroom')),

  imageProp('parking-icon-1', 'Parking', 454, 118, 58, 58, iconImage('parking')),
  imageProp('parking-icon-2', 'Parking', 132, 722, 58, 58, iconImage('parking')),

  imageProp('infrastructure-stage', 'Live Stage', 1056, 566, 56, 56, iconImage('stage')),
  imageProp('infrastructure-info', 'Information', 1056, 680, 56, 56, iconImage('info')),
  imageProp('infrastructure-firstaid', 'First Aid', 1132, 680, 56, 56, iconImage('firstaid')),

  // ------------------------------------------------------------------------
  // Six trees / landscape features
  // ------------------------------------------------------------------------
  imageProp('tree-1', 'Tree', 402, 284, 58, 58, iconImage('tree')),
  imageProp('tree-2', 'Tree', 500, 272, 58, 58, iconImage('tree')),
  imageProp('tree-3', 'Tree', 844, 286, 58, 58, iconImage('tree')),
  imageProp('tree-4', 'Tree', 944, 276, 58, 58, iconImage('tree')),
  imageProp('tree-5', 'Tree', 464, 612, 58, 58, iconImage('tree')),
  imageProp('tree-6', 'Tree', 866, 612, 58, 58, iconImage('tree')),

  // Small landscape shapes
  prop('garden-bed-1', 'Flower Bed', 372, 308, 88, 18, '#7fb071', 'rounded-rectangle'),
  prop('garden-bed-2', 'Flower Bed', 940, 308, 88, 18, '#7fb071', 'rounded-rectangle'),
  prop('garden-bed-3', 'Flower Bed', 548, 642, 90, 18, '#7fb071', 'rounded-rectangle'),
  prop('garden-bed-4', 'Flower Bed', 790, 642, 90, 18, '#7fb071', 'rounded-rectangle'),

  // ------------------------------------------------------------------------
  // Four entry/exit points
  // ------------------------------------------------------------------------
  imageProp('north-entry', 'North Entry', 622, 88, 60, 60, iconImage('entrance')),
  imageProp('west-exit', 'West Exit', 86, 400, 60, 60, iconImage('entrance')),
  imageProp('east-exit', 'East Exit', 1250, 400, 60, 60, iconImage('entrance')),
  imageProp('south-entry', 'South Entry', 622, 772, 60, 60, iconImage('entrance')),

  // ------------------------------------------------------------------------
  // Branding / labels
  // ------------------------------------------------------------------------
  imageProp('market-logo', 'Riverside Outdoor Market', 28, 18, 250, 76, logoImage()),
  textbox('north-title', 'NORTH BAZAAR', 308, 112, 198, 28),
  textbox('garden-title', 'GARDEN MARKET', 834, 112, 238, 28),
  textbox('food-title', 'FOOD COURT', 280, 528, 190, 28),
  textbox('river-title', 'RIVERSIDE ROW', 876, 528, 210, 28),
  textbox('craft-title', 'CRAFT WALK', 478, 694, 180, 28),
  textbox('family-title', 'FAMILY MARKET', 864, 694, 210, 28),
  textbox('north-entry-label', 'NORTH ENTRY', 586, 54, 186, 26),
  textbox('west-exit-label', 'WEST EXIT', 70, 374, 150, 26),
  textbox('east-exit-label', 'EAST EXIT', 1190, 374, 150, 26),
  textbox('south-entry-label', 'SOUTH ENTRY', 580, 846, 206, 26),
  textbox('parking-north-label', 'NORTH PARKING', 594, 150, 220, 28),
  textbox('parking-south-label', 'SOUTH-WEST PARKING', 92, 790, 260, 28),
  textbox('market-green-label', 'MARKET GREEN', 520, 470, 210, 28),
  textbox('street-label-west', 'WEST MARKET ROAD', 120, 458, 210, 24, -90),
  textbox('street-label-east', 'EAST MARKET ROAD', 1260, 458, 210, 24, 90),

  // A simple legend as an image prop.
  imageProp('legend', 'Market Guide', 1120, 88, 246, 160, legendImage()),
];