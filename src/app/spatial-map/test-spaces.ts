import { Space, SpaceStatus } from '../../lib/core/types';

const svgDataUrl = (svg: string): string =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/**
 * Source reference: supplied 702 x 568 outdoor-market/site map.
 *
 * This fixture uses a 1404 x 1136 map-space artboard (2x source pixels) so
 * the renderer can keep booth labels readable while preserving the original
 * composition. The scene is authored in layers rather than as one background:
 *
 * 1. site ground
 * 2. streets / paths / creek / parking
 * 3. buildings and landscape
 * 4. 48 real booth spaces
 * 5. only the necessary service / directional icons
 * 6. map labels
 */

const poiIcon = (
  kind:
    | 'parking'
    | 'bus'
    | 'restroom'
    | 'kids'
    | 'music'
    | 'bike'
    | 'atm'
    | 'market'
    | 'food'
    | 'exit'
    | 'north',
): string => {
  const body = {
    parking: `
      <circle cx="36" cy="36" r="23" fill="#119bc0"/>
      <text x="36" y="49" text-anchor="middle" font-family="Arial" font-size="34" font-weight="900" fill="#fff">P</text>`,
    bus: `
      <rect x="14" y="14" width="44" height="43" rx="8" fill="#07557b"/>
      <rect x="20" y="21" width="32" height="15" rx="3" fill="#e7f6ff"/>
      <circle cx="26" cy="50" r="4" fill="#20282d"/>
      <circle cx="46" cy="50" r="4" fill="#20282d"/>`,
    restroom: `
      <rect x="11" y="10" width="50" height="52" rx="8" fill="#1398dc"/>
      <circle cx="27" cy="25" r="5" fill="#fff"/>
      <circle cx="45" cy="25" r="5" fill="#fff"/>
      <path d="M27 33 V50 M45 33 V50 M27 41 H45"
        stroke="#fff" stroke-width="4" stroke-linecap="round"/>`,
    kids: `
      <circle cx="36" cy="36" r="23" fill="#0b855f"/>
      <circle cx="28" cy="27" r="4" fill="#fff"/>
      <circle cx="44" cy="27" r="4" fill="#fff"/>
      <path d="M28 34 L24 50 M44 34 L48 50 M28 40 H44"
        stroke="#fff" stroke-width="4" stroke-linecap="round"/>`,
    music: `
      <rect x="11" y="10" width="50" height="52" rx="8" fill="#16a05f"/>
      <path d="M39 20 V43 M39 20 L51 17 V41"
        fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
      <circle cx="30" cy="45" r="6" fill="#fff"/>
      <circle cx="42" cy="43" r="6" fill="#fff"/>`,
    bike: `
      <circle cx="36" cy="36" r="23" fill="#40b9c8"/>
      <circle cx="23" cy="43" r="7" fill="none" stroke="#fff" stroke-width="3"/>
      <circle cx="49" cy="43" r="7" fill="none" stroke="#fff" stroke-width="3"/>
      <path d="M23 43 L32 28 L40 43 L49 43 M32 28 H40"
        fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`,
    atm: `
      <rect x="10" y="11" width="52" height="50" rx="8" fill="#148b61"/>
      <rect x="20" y="19" width="32" height="15" rx="3" fill="#e7f6ee"/>
      <text x="36" y="51" text-anchor="middle" font-family="Arial"
        font-size="12" font-weight="900" fill="#fff">ATM</text>`,
    market: `
      <circle cx="36" cy="36" r="24" fill="#1b7f47"/>
      <path d="M20 41 L36 17 L52 41 L44 37 L36 48 L28 37 Z" fill="#fff"/>`,
    food: `
      <circle cx="36" cy="36" r="23" fill="#ef8b4d"/>
      <path d="M25 21 V51 M25 21 Q35 25 25 31 M47 22 V48"
        stroke="#fff" stroke-width="4" stroke-linecap="round"/>`,
    exit: `
      <path d="M36 8 L63 36 L36 64 L9 36 Z" fill="#f09c44"/>
      <path d="M22 36 H49 M40 27 L49 36 L40 45" stroke="#fff"
        stroke-width="4" stroke-linecap="round"/>`,
    north: `
      <circle cx="36" cy="36" r="30" fill="#fff" stroke="#c5c0b8" stroke-width="2"/>
      <path d="M36 10 L47 54 L36 46 L25 54 Z" fill="#22292d"/>
      <text x="36" y="67" text-anchor="middle" font-family="Arial"
        font-size="11" font-weight="900" fill="#22292d">N</text>`,
  }[kind];

  return svgDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">
  <circle cx="36" cy="36" r="33" fill="#ffffff" stroke="#c6c3bd" stroke-width="2"/>
  ${body}
</svg>`);
};

const treeIcon = (): string => svgDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">
  <rect width="72" height="72" fill="transparent"/>
  <rect x="33" y="43" width="8" height="18" rx="3" fill="#80512d"/>
  <circle cx="36" cy="31" r="20" fill="#4d9a46"/>
  <circle cx="24" cy="37" r="12" fill="#66aa54"/>
  <circle cx="48" cy="37" r="12" fill="#62a84e"/>
  <circle cx="36" cy="20" r="11" fill="#75b961"/>
</svg>`);

const logo = (): string => svgDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="440" height="128" viewBox="0 0 440 128">
  <rect width="440" height="128" rx="18" fill="#f9f8f3" stroke="#d2cec6" stroke-width="2"/>
  <text x="220" y="53" text-anchor="middle" font-family="Georgia, serif"
    font-size="28" font-weight="700" fill="#4c8350">Farmers Market</text>
  <path d="M145 67 C180 41 207 41 235 67 C263 41 291 41 326 67"
    fill="none" stroke="#347544" stroke-width="6" stroke-linecap="round"/>
  <circle cx="235" cy="50" r="13" fill="#d85e47"/>
  <text x="220" y="98" text-anchor="middle" font-family="Arial"
    font-size="12" font-weight="700" letter-spacing="3" fill="#7e867d">SHOP • EAT • DISCOVER</text>
</svg>`);

const booth = (
  id: string,
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  status: SpaceStatus,
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
  width: number,
  height: number,
  gap: number,
  statusOffset = 0,
): Space[] => {
  const statuses: SpaceStatus[] = [
    'available',
    'reserved',
    'available',
    'booked',
    'available',
    'reserved',
    'maintenance',
  ];

  return names.map((name, index) =>
    booth(
      `${prefix}-${index + 1}`,
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
  prop('ground', 'Site Ground', 0, 0, 1404, 1136, '#f4f4ef', 'rectangle'),

  // ------------------------------------------------------------------------
  // 2. Streets / roads — clean, simple 2D geometry.
  // ------------------------------------------------------------------------
  prop('mill-street', 'MILL STREET', 0, 320, 174, 760, '#d1d2ce', 'rectangle'),
  prop('jersey-street', 'JERSEY STREET', 236, 246, 1008, 92, '#d3d3cf', 'rounded-rectangle'),
  prop('north-access', 'North Access Road', 250, 0, 160, 246, '#c8c9c6', 'rounded-rectangle'),
  prop('south-access', 'South Access Road', 924, 784, 150, 352, '#c8c9c6', 'rounded-rectangle'),
  prop('market-loop', 'Market Loop', 258, 292, 930, 88, '#d0d1cd', 'rounded-rectangle'),
  prop('west-walk', 'West Market Walk', 178, 370, 70, 420, '#e0ddd5', 'rounded-rectangle'),
  prop('east-walk', 'East Market Walk', 1176, 350, 70, 430, '#e0ddd5', 'rounded-rectangle'),

  // Creek on the east edge.
  prop('creek', 'Gossy Branch Creek', 1290, 260, 114, 660, '#8bcbd6', 'rectangle'),
  prop('creek-bank', 'Creek Bank', 1262, 260, 28, 660, '#a8c87c', 'rectangle'),

  // ------------------------------------------------------------------------
  // 3. Buildings / landscape blocks.
  // ------------------------------------------------------------------------
  prop('union-building', 'THE UNION', 192, 34, 660, 184, '#b8b8ba', 'rounded-rectangle'),
  prop('union-row', 'UNION SHOPS', 216, 126, 612, 62, '#aeb0b3', 'rounded-rectangle'),
  prop('sun-king', 'SUN KING', 1054, 42, 260, 170, '#b8b8ba', 'rounded-rectangle'),

  // Parking garages at both top corners.
  prop('garage-west', 'Parking Garage', 54, 34, 220, 204, '#aeb1b4', 'rounded-rectangle'),
  prop('garage-east', 'Parking Garage', 836, 34, 210, 204, '#aeb1b4', 'rounded-rectangle'),

  // Main lawn / park edge.
  prop('park', 'North Park', 404, 790, 850, 346, '#79b943', 'rectangle'),
  prop('park-path', 'Park Path', 418, 778, 820, 48, '#d7d9d3', 'line'),

  // ------------------------------------------------------------------------
  // 4. Farmers Market circular area.
  // ------------------------------------------------------------------------
  prop('farmers-market-plaza', 'Farmers Market Booth Area', 264, 342, 490, 250, '#e8e7e1', 'ellipse'),
  prop('farmers-inner-green', 'Farmers Market Green', 336, 394, 300, 154, '#77aa4a', 'ellipse'),

  // Central market star marker.
  prop('market-star', 'Farmers Market Marker', 438, 410, 54, 54, '#1e8a50', 'diamond'),
  textbox('farmers-market-label', 'Farmers Market Booth', 344, 350, 310, 30),

  // ------------------------------------------------------------------------
  // 5. Booths 1–16: primary straight row(s) around Jersey Street.
  // ------------------------------------------------------------------------
  ...boothRow('top-a', ['01','02','03','04','05','06','07','08'], 260, 258, 62, 38, 6, 0),
  ...boothRow('top-b', ['09','10','11','12','13','14','15','16'], 690, 258, 62, 38, 6, 2),

  // Booth 17–24: curved/angled perimeter around the Farmers Market.
  booth('17', '17', 594, 346, 58, 38, 'available', 55),
  booth('18', '18', 564, 388, 58, 38, 'reserved', 70),
  booth('19', '19', 548, 446, 58, 38, 'available', 78),
  booth('20', '20', 548, 494, 58, 38, 'booked', 100),
  booth('21', '21', 516, 536, 58, 38, 'available', 122),
  booth('22', '22', 458, 560, 58, 38, 'reserved', 145),
  booth('23', '23', 394, 548, 58, 38, 'available', -35),
  booth('24', '24', 346, 516, 58, 38, 'maintenance', -48),

  // Booth 25–26 in the small center row.
  booth('25', '25', 394, 456, 62, 38, 'available'),
  booth('26', '26', 462, 456, 62, 38, 'reserved'),

  // Booth 27–34 down the west side.
  booth('27', '27', 210, 360, 54, 38, 'available', -12),
  booth('28', '28', 210, 406, 54, 38, 'reserved', -12),
  booth('29', '29', 210, 452, 54, 38, 'available', -12),
  booth('30', '30', 54, 352, 54, 38, 'booked'),
  booth('31', '31', 54, 398, 54, 38, 'available'),
  booth('32', '32', 54, 444, 54, 38, 'reserved'),
  booth('33', '33', 54, 490, 54, 38, 'available'),
  booth('34', '34', 54, 536, 54, 38, 'maintenance'),

  // Booth 35–48: east-hand clustered rows.
  ...boothRow('east-a', ['35','36','37','38','39','40','41'], 712, 346, 58, 38, 8, 1),
  ...boothRow('east-b', ['42','43','44','45','46','47','48'], 712, 398, 58, 38, 8, 3),

  // ------------------------------------------------------------------------
  // 6. Street-side markers 49–53 + bus/parking symbols 54–57.
  // These are map symbols, not bookable booths.
  // ------------------------------------------------------------------------
  prop('street-space-49', 'Street Marker 49', 370, 310, 64, 32, '#1b99b8', 'rectangle', true),
  prop('street-space-50', 'Street Marker 50', 548, 310, 64, 32, '#1b99b8', 'rectangle', true),
  prop('street-space-51', 'Street Marker 51', 726, 310, 64, 32, '#1b99b8', 'rectangle', true),
  prop('street-space-52', 'Street Marker 52', 904, 310, 64, 32, '#1b99b8', 'rectangle', true),
  prop('street-space-53', 'Street Marker 53', 1028, 310, 64, 32, '#1b99b8', 'rectangle', true),

  imageProp('bus-54', 'Bus 54', 384, 228, 58, 58, poiIcon('bus')),
  imageProp('bus-55', 'Bus 55', 450, 228, 58, 58, poiIcon('bus')),
  imageProp('bus-56', 'Bus 56', 516, 228, 58, 58, poiIcon('bus')),
  imageProp('bus-57', 'Bus 57', 582, 228, 58, 58, poiIcon('bus')),

  // ------------------------------------------------------------------------
  // 7. Only necessary amenities / infrastructure.
  // ------------------------------------------------------------------------
  imageProp('parking-garage-west', 'Parking Garage Entrance', 172, 48, 58, 58, poiIcon('parking')),
  imageProp('parking-garage-east', 'Parking Garage Entrance', 962, 48, 58, 58, poiIcon('parking')),

  // Four restroom markers matching the strong left/center-right placement.
  imageProp('restroom-west', 'Public Restrooms', 178, 610, 56, 56, poiIcon('restroom')),
  imageProp('restroom-cafe', 'Restroom', 1118, 414, 56, 56, poiIcon('restroom')),
  imageProp('restroom-center', 'Restroom', 1004, 550, 56, 56, poiIcon('restroom')),
  imageProp('restroom-south', 'Restroom', 424, 688, 56, 56, poiIcon('restroom')),

  imageProp('kids-activity', 'Kids Activity Booth', 1010, 440, 56, 56, poiIcon('kids')),
  imageProp('music-market', 'Music at the Market', 794, 694, 56, 56, poiIcon('music')),
  imageProp('bike-rack', 'Bike Rack', 1162, 556, 56, 56, poiIcon('bike')),
  imageProp('atm', 'ATM', 154, 74, 56, 56, poiIcon('atm')),
  imageProp('food-pavilion', 'Food Pavilion', 1090, 346, 56, 56, poiIcon('food')),
  imageProp('market-icon', 'Farmers Market', 270, 394, 56, 56, poiIcon('market')),

  // ------------------------------------------------------------------------
  // 8. Six trees, kept sparse like the source.
  // ------------------------------------------------------------------------
  imageProp('tree-1', 'Tree', 750, 354, 52, 52, treeIcon()),
  imageProp('tree-2', 'Tree', 810, 354, 52, 52, treeIcon()),
  imageProp('tree-3', 'Tree', 870, 354, 52, 52, treeIcon()),
  imageProp('tree-4', 'Tree', 916, 610, 52, 52, treeIcon()),
  imageProp('tree-5', 'Tree', 1072, 640, 52, 52, treeIcon()),
  imageProp('tree-6', 'Tree', 1192, 628, 52, 52, treeIcon()),

  // ------------------------------------------------------------------------
  // 9. Minimal landscape pieces.
  // ------------------------------------------------------------------------
  prop('landscape-west', 'West Planting', 252, 598, 130, 32, '#88b967', 'rounded-rectangle'),
  prop('landscape-center', 'Center Planting', 684, 566, 170, 30, '#88b967', 'rounded-rectangle'),
  prop('landscape-east', 'East Planting', 1090, 600, 120, 28, '#88b967', 'rounded-rectangle'),

  // ------------------------------------------------------------------------
  // 10. Labels / street names / directions.
  // ------------------------------------------------------------------------
  imageProp('market-logo', 'Farmers Market', 86, 44, 230, 76, logo()),

  textbox('union-label', 'THE UNION', 460, 58, 210, 32),
  textbox('sunking-label', 'SUN KING', 1100, 92, 180, 42),
  textbox('mill-label', 'MILL STREET', 42, 594, 120, 28, -90),
  textbox('jersey-label', 'JERSEY STREET', 944, 230, 250, 30),
  textbox('farmers-label', 'Farmers Market Booth', 342, 352, 300, 30),
  textbox('cafe-label', 'Cafe Pavilion', 1100, 390, 170, 26),
  textbox('kids-label', 'Kids Activity Booth', 1004, 500, 210, 26),
  textbox('music-label', 'Music at the Market', 812, 734, 210, 26),
  textbox('bike-label', 'Bike Rack', 1150, 626, 130, 26),
  textbox('creek-label', 'Gossy Branch Creek', 1334, 616, 160, 26, 90),
  textbox('north-label', 'North', 552, 840, 100, 24),
  textbox('restroom-label', 'Public Restrooms', 168, 680, 170, 24),
  textbox('west-corridor-label', 'West Walk', 176, 760, 130, 24, -90),
  textbox('east-corridor-label', 'East Walk', 1178, 760, 130, 24, 90),

  // Four entrance / exit markers around the circulation edge.
  imageProp('west-entry', 'West Entry', 24, 276, 56, 56, poiIcon('exit')),
  imageProp('north-entry', 'North Entry', 594, 0, 56, 56, poiIcon('exit')),
  imageProp('east-entry', 'East Entry', 1318, 300, 56, 56, poiIcon('exit')),
  imageProp('south-entry', 'South Entry', 944, 810, 56, 56, poiIcon('exit')),
  imageProp('north-arrow', 'North', 1244, 34, 64, 64, poiIcon('north')),
];