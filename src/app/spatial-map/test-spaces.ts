import { Space, SpaceStatus } from '../../lib/core/types';

const svgDataUrl = (svg: string): string =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

const facilitiesImage = (): string => svgDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="1224" height="108" viewBox="0 0 1224 108">
  <rect width="1224" height="108" fill="transparent"/>

  <!-- Restrooms block -->
  <rect x="10" y="0" width="214" height="84" fill="#f9fbfc" stroke="#0d6ea8" stroke-width="4"/>
  <line x1="82" y1="0" x2="82" y2="84" stroke="#0d6ea8" stroke-width="3"/>
  <line x1="166" y1="0" x2="166" y2="84" stroke="#0d6ea8" stroke-width="3"/>
  <text x="124" y="48" text-anchor="middle" font-family="Arial" font-size="18" font-weight="800" fill="#101820">RESTROOMS</text>
  <circle cx="38" cy="31" r="9" fill="#0d6ea8"/>
  <rect x="34" y="42" width="8" height="24" rx="4" fill="#0d6ea8"/>
  <circle cx="126" cy="30" r="9" fill="#0d6ea8"/>
  <path d="M126 40 L116 64 M126 40 L136 64 M118 51 H134" stroke="#0d6ea8" stroke-width="5" stroke-linecap="round"/>

  <!-- Food court block -->
  <rect x="964" y="0" width="260" height="106" fill="#f9fbfc" stroke="#0d6ea8" stroke-width="4"/>
  <text x="1094" y="34" text-anchor="middle" font-family="Arial" font-size="18" font-weight="800" fill="#101820">FOOD COURT</text>
  <g fill="none" stroke="#0d6ea8" stroke-width="3">
    <circle cx="1015" cy="68" r="10"/><circle cx="1015" cy="68" r="18"/>
    <circle cx="1070" cy="68" r="10"/><circle cx="1070" cy="68" r="18"/>
    <circle cx="1125" cy="68" r="10"/><circle cx="1125" cy="68" r="18"/>
  </g>
  <rect x="1172" y="54" width="36" height="28" fill="none" stroke="#0d6ea8" stroke-width="3"/>
  <path d="M1182 50 V84 M1198 50 V84 M1178 58 H1202" stroke="#0d6ea8" stroke-width="3"/>
</svg>`);

const exitImage = (): string => svgDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="92" height="76" viewBox="0 0 92 76">
  <path d="M12 12 H66 V22 H80 L80 54 H66 V64 H12 Z" fill="#1fae62"/>
  <rect x="0" y="18" width="28" height="40" rx="4" fill="#fff"/>
  <path d="M14 23 V52 M9 28 H19" stroke="#1fae62" stroke-width="4" stroke-linecap="round"/>
  <path d="M45 38 H72 M64 30 L72 38 L64 46" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
  <text x="46" y="67" text-anchor="middle" font-family="Arial" font-size="11" font-weight="900" fill="#158347">EMERGENCY EXIT</text>
</svg>`);

const entranceImage = (): string => svgDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="110" height="90" viewBox="0 0 110 90">
  <path d="M18 0 H92 V34 H18 Z" fill="#ffffff"/>
  <path d="M18 0 V34 M92 0 V34" stroke="#0d6ea8" stroke-width="2"/>
  <path d="M55 0 V34" stroke="#0d6ea8" stroke-width="2"/>
  <path d="M18 34 Q34 70 55 34 Q76 70 92 34" fill="none" stroke="#202a30" stroke-width="2"/>
  <text x="55" y="76" text-anchor="middle" font-family="Arial" font-size="16" font-weight="900" fill="#0875ac">ENTRANCE</text>
</svg>`);

const compassScaleImage = (): string => svgDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="360" height="72" viewBox="0 0 360 72">
  <g transform="translate(8 4)">
    <path d="M26 4 L40 50 L26 42 L12 50 Z" fill="#111820"/>
    <text x="26" y="67" text-anchor="middle" font-family="Arial" font-size="15" font-weight="900" fill="#111820">N</text>
  </g>
  <g transform="translate(152 28)">
    <path d="M0 0 H240" stroke="#111820" stroke-width="4"/>
    <path d="M0 -7 V7 M48 -7 V7 M96 -7 V7 M144 -7 V7 M192 -7 V7 M240 -7 V7" stroke="#111820" stroke-width="3"/>
    <text x="0" y="-10" font-family="Arial" font-size="12" fill="#111820">0</text>
    <text x="48" y="-10" text-anchor="middle" font-family="Arial" font-size="12" fill="#111820">2</text>
    <text x="96" y="-10" text-anchor="middle" font-family="Arial" font-size="12" fill="#111820">4</text>
    <text x="144" y="-10" text-anchor="middle" font-family="Arial" font-size="12" fill="#111820">6</text>
    <text x="192" y="-10" text-anchor="middle" font-family="Arial" font-size="12" fill="#111820">8</text>
    <text x="240" y="-10" text-anchor="end" font-family="Arial" font-size="12" fill="#111820">10 m</text>
  </g>
</svg>`);

const booth = (
  id: string,
  name: string,
  x: number,
  y: number,
  status: SpaceStatus = 'available',
): Space => ({
  id,
  type: 'booth',
  geometry: { type: 'rectangle', x, y, width: 154, height: 80 },
  properties: {
    name,
    status,
    displayStrokeColor: '#15191d',
    displayTextColor: '#101820',
    displayTextOutlineColor: '#ffffff',
  },
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
  properties: {
    name: text,
    displayTextColor: '#5d646b',
    displayTextOutlineColor: '#ffffff',
  },
});

const boothNames: Array<[string, string][]> = [
  [
    ['A1', 'Vintage Vinyl'],
    ['A2', 'Antique Clocks'],
    ['A3', 'Hand-Crafted Jewelry'],
    ['A4', 'Retro Clothing'],
    ['A5', 'Old Books & Maps'],
    ['A6', 'Rare Coins'],
  ],
  [
    ['B1', 'Leather Goods'],
    ['B2', 'Wooden Toys'],
    ['B3', 'Ceramic Art'],
    ['B4', 'Vintage Posters'],
    ['B5', 'Silver & Gold'],
    ['B6', 'Glass & Crystal'],
  ],
  [
    ['C1', 'Stamps & Cards'],
    ['C2', 'Military Surplus'],
    ['C3', 'Fabric & Textiles'],
    ['C4', 'Vintage Electronics'],
    ['C5', 'Plant & Herbs'],
    ['C6', 'Handmade Candles'],
  ],
  [
    ['D1', 'Furniture Corner'],
    ['D2', 'Rugs & Tapestry'],
    ['D3', 'Comic Books'],
    ['D4', 'Vinyl Records'],
    ['D5', 'Watches & Clocks'],
    ['D6', 'Vintage Toys'],
  ],
  [
    ['E1', 'Art Prints'],
    ['E2', 'Sports Memorabilia'],
    ['E3', 'Kitchen Antiques'],
    ['E4', 'Dollhouse Items'],
    ['E5', 'Photography'],
    ['E6', 'Bric-a-Brac'],
  ],
];

const statuses: SpaceStatus[] = [
  'available',
  'reserved',
  'available',
  'booked',
  'available',
  'reserved',
];

const boothPositions = [
  [152, 122], [330, 122], [507, 122], [685, 122], [861, 122], [1038, 122],
  [152, 229], [330, 229], [507, 229], [685, 229], [861, 229], [1038, 229],
  [152, 336], [330, 336], [507, 336], [685, 336], [861, 336], [1038, 336],
  [152, 443], [330, 443], [507, 443], [685, 443], [861, 443], [1038, 443],
  [152, 551], [330, 551], [507, 551], [685, 551], [861, 551], [1038, 551],
] as const;

const booths: Space[] = [];
for (let row = 0; row < boothNames.length; row++) {
  for (let col = 0; col < boothNames[row].length; col++) {
    const [id, name] = boothNames[row][col];
    const [x, y] = boothPositions[row * 6 + col];
    booths.push(booth(id, `${id}\n${name}`, x, y, statuses[(row * 2 + col) % statuses.length]));
    // The renderer centers the label in the booth. The stored name remains
    // business data for booking/selection and is intentionally multi-line to
    // match the source floor-plan presentation.
  }
}

export const TEST_SPACES: Space[] = [
  // ------------------------------------------------------------------------
  // 1. Exact source-size ground and blue boundary
  // ------------------------------------------------------------------------
  prop('ground', 'Floor', 0, 0, 1344, 752, '#eef2f5', 'rectangle'),

  prop('wall-top', 'Top Wall', 62, 9, 1224, 9, '#0c6fa8', 'rectangle'),
  prop('wall-bottom', 'Bottom Wall', 62, 660, 1224, 9, '#0c6fa8', 'rectangle'),
  prop('wall-left', 'Left Wall', 62, 9, 9, 660, '#0c6fa8', 'rectangle'),
  prop('wall-right', 'Right Wall', 1277, 9, 9, 660, '#0c6fa8', 'rectangle'),

  // Fine top/bottom façade marks visible in the reference.
  prop('ceiling-slot-1', 'Vent', 350, 10, 120, 4, '#4aa4cb', 'line'),
  prop('ceiling-slot-2', 'Vent', 945, 10, 120, 4, '#4aa4cb', 'line'),
  prop('floor-slot-1', 'Vent', 170, 661, 300, 4, '#4aa4cb', 'line'),
  prop('floor-slot-2', 'Vent', 870, 661, 300, 4, '#4aa4cb', 'line'),

  // ------------------------------------------------------------------------
  // 2. Top-left restroom + top-right food court
  // ------------------------------------------------------------------------
  imageProp('facilities', 'Restrooms and Food Court', 62, 10, 1224, 108, facilitiesImage()),

  // ------------------------------------------------------------------------
  // 3. Five exact booth aisles, 6 booths per row
  // ------------------------------------------------------------------------
  ...booths,

  // Aisle labels between booth rows.
  textbox('aisle-1', 'AISLE', 616, 202, 112, 22),
  textbox('aisle-2', 'AISLE', 616, 309, 112, 22),
  textbox('aisle-3', 'AISLE', 616, 416, 112, 22),
  textbox('aisle-4', 'AISLE', 616, 523, 112, 22),
  textbox('aisle-5', 'AISLE', 616, 630, 112, 22),

  // ------------------------------------------------------------------------
  // 4. Emergency exits + main entrance
  // ------------------------------------------------------------------------
  imageProp('exit-left', 'Emergency Exit', 8, 228, 78, 80, exitImage()),
  imageProp('exit-right', 'Emergency Exit', 1258, 228, 78, 80, exitImage()),
  imageProp('main-entrance', 'Entrance', 617, 656, 110, 90, entranceImage()),

  // ------------------------------------------------------------------------
  // 5. North arrow + scale
  // ------------------------------------------------------------------------
  imageProp('orientation', 'North and scale', 18, 680, 320, 66, compassScaleImage()),

  // Source map labels that are not inside the booth cards.
  textbox('entrance-label', 'ENTRANCE', 622, 690, 104, 24),
];