import { Space, SpaceStatus } from '../../lib/core/types';

const svgDataUrl = (svg: string): string =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

const backdropImage = (): string => svgDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="760" height="1060" viewBox="0 0 760 1060">
  <defs>
    <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f4f0df"/>
      <stop offset="1" stop-color="#ebe6d3"/>
    </linearGradient>
    <linearGradient id="road" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#d8dde2"/>
      <stop offset="1" stop-color="#c7cdd3"/>
    </linearGradient>
    <pattern id="parking" width="38" height="22" patternUnits="userSpaceOnUse">
      <path d="M0 22 L38 0" stroke="#b9c1c8" stroke-width="2"/>
    </pattern>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#38506b" flood-opacity=".15"/>
    </filter>
  </defs>

  <rect width="760" height="1060" fill="url(#ground)"/>

  <!-- Main roads -->
  <rect x="282" y="0" width="70" height="960" rx="26" fill="url(#road)"/>
  <rect x="0" y="438" width="760" height="58" rx="22" fill="url(#road)"/>
  <rect x="0" y="858" width="760" height="54" rx="22" fill="url(#road)"/>
  <path d="M300 18 V940" stroke="#f7f8f9" stroke-width="3" stroke-dasharray="14 16" opacity=".85"/>
  <path d="M0 467 H760" stroke="#f7f8f9" stroke-width="3" stroke-dasharray="14 16" opacity=".85"/>
  <path d="M0 885 H760" stroke="#f7f8f9" stroke-width="3" stroke-dasharray="14 16" opacity=".85"/>

  <!-- Food vendors -->
  <rect x="38" y="66" width="224" height="356" rx="20" fill="#eef4f8" stroke="#bac8d3" stroke-width="2" filter="url(#softShadow)"/>
  <rect x="54" y="82" width="192" height="52" rx="16" fill="#d8eff1"/>
  <text x="150" y="112" text-anchor="middle" font-family="Arial" font-size="22" font-weight="800" fill="#20323e">BEVERAGE TENT</text>
  <text x="150" y="152" text-anchor="middle" font-family="Arial" font-size="17" font-weight="800" fill="#50606b">FOOD VENDORS</text>

  <!-- General store -->
  <rect x="366" y="76" width="178" height="258" rx="22" fill="#f7f7f4" stroke="#c8c8c0" stroke-width="2" filter="url(#softShadow)"/>
  <path d="M390 111 H520" stroke="#6b7280" stroke-width="5" stroke-linecap="round"/>
  <rect x="392" y="124" width="126" height="44" rx="12" fill="#f1efe8"/>
  <text x="455" y="150" text-anchor="middle" font-family="Arial" font-size="19" font-weight="800" fill="#27323b">GENERAL STORE</text>

  <!-- Tree grove -->
  <path d="M548 54 C585 34 693 55 706 115 L700 330 C672 353 567 348 544 309 Z" fill="#b9d4a6" opacity=".7"/>
  <g fill="#2f7d32">
    <circle cx="570" cy="72" r="19"/><circle cx="604" cy="64" r="23"/><circle cx="640" cy="73" r="18"/>
    <circle cx="677" cy="82" r="24"/><circle cx="695" cy="120" r="20"/><circle cx="585" cy="108" r="25"/>
    <circle cx="622" cy="108" r="20"/><circle cx="657" cy="111" r="26"/><circle cx="573" cy="146" r="21"/>
    <circle cx="611" cy="149" r="25"/><circle cx="649" cy="148" r="23"/><circle cx="687" cy="160" r="22"/>
    <circle cx="580" cy="193" r="22"/><circle cx="619" cy="192" r="27"/><circle cx="657" cy="196" r="21"/>
    <circle cx="694" cy="208" r="24"/><circle cx="576" cy="240" r="22"/><circle cx="610" cy="232" r="25"/>
    <circle cx="648" cy="243" r="26"/><circle cx="687" cy="252" r="21"/><circle cx="584" cy="282" r="21"/>
    <circle cx="620" cy="284" r="24"/><circle cx="660" cy="286" r="23"/>
  </g>
  <g fill="#4f9a45" opacity=".7">
    <circle cx="592" cy="91" r="8"/><circle cx="632" cy="89" r="7"/><circle cx="668" cy="133" r="8"/>
    <circle cx="601" cy="174" r="7"/><circle cx="681" cy="186" r="8"/><circle cx="590" cy="218" r="7"/>
    <circle cx="639" cy="219" r="8"/><circle cx="612" cy="268" r="7"/>
  </g>

  <!-- Camp 3 -->
  <rect x="486" y="330" width="224" height="122" rx="18" fill="#fff9fb" stroke="#d6c0c8" stroke-width="2"/>
  <rect x="486" y="330" width="224" height="34" rx="18" fill="#f1c7d5"/>
  <text x="598" y="354" text-anchor="middle" font-family="Arial" font-size="20" font-weight="800" fill="#a21e58">CAMP 3</text>

  <!-- Camp 2 -->
  <rect x="486" y="506" width="224" height="196" rx="18" fill="#fff9fb" stroke="#d6c0c8" stroke-width="2"/>
  <rect x="486" y="506" width="224" height="38" rx="18" fill="#f1c7d5"/>
  <text x="598" y="531" text-anchor="middle" font-family="Arial" font-size="21" font-weight="800" fill="#a21e58">CAMP 2</text>

  <!-- Car sales -->
  <rect x="38" y="524" width="224" height="218" rx="20" fill="#f7d7bd" stroke="#dfb497" stroke-width="2" filter="url(#softShadow)"/>
  <text x="150" y="552" text-anchor="middle" font-family="Arial" font-size="15" font-weight="800" fill="#6b5342">PARTS PICKUP</text>
  <text x="150" y="598" text-anchor="middle" font-family="Arial" font-size="24" font-weight="900" fill="#2f3439">CAR SALES &amp;</text>
  <text x="150" y="628" text-anchor="middle" font-family="Arial" font-size="24" font-weight="900" fill="#2f3439">CAR SHOW</text>

  <!-- Arts Park -->
  <rect x="44" y="762" width="218" height="72" rx="18" fill="#f1e6ba" stroke="#d1bf7c" stroke-width="2"/>
  <text x="153" y="806" text-anchor="middle" font-family="Arial" font-size="20" font-weight="800" fill="#8b5b2a">ARTS PARK</text>

  <!-- Overflow parking -->
  <rect x="366" y="730" width="344" height="112" rx="20" fill="#dcead3" stroke="#b8ccb0" stroke-width="2"/>
  <rect x="390" y="756" width="296" height="58" rx="12" fill="url(#parking)" opacity=".8"/>
  <text x="538" y="746" text-anchor="middle" font-family="Arial" font-size="18" font-weight="900" fill="#34443a">OVERFLOW PARKING</text>

  <!-- BAFM office -->
  <rect x="296" y="766" width="102" height="72" rx="16" fill="#f39a65" stroke="#c96c3a" stroke-width="2" filter="url(#softShadow)"/>
  <text x="347" y="796" text-anchor="middle" font-family="Arial" font-size="18" font-weight="900" fill="#4a2415">BAFM</text>
  <text x="347" y="818" text-anchor="middle" font-family="Arial" font-size="13" font-weight="800" fill="#4a2415">OFFICE</text>

  <!-- Directional wedges / exits -->
  <path d="M52 932 L78 988 L104 932 Z" fill="#c62f43"/>
  <text x="78" y="919" text-anchor="middle" font-family="Arial" font-size="15" font-weight="800" fill="#9a2434">PUBLIC EXIT</text>

  <path d="M322 936 L350 1000 L378 936 Z" fill="#cb4f4d"/>
  <text x="350" y="926" text-anchor="middle" font-family="Arial" font-size="15" font-weight="800" fill="#8b2d31">GATE 75</text>

  <path d="M610 930 L640 1000 L670 930 Z" fill="#c62f43"/>
  <text x="640" y="916" text-anchor="middle" font-family="Arial" font-size="14" font-weight="800" fill="#8b2d31">VENDOR / CAMPER</text>

  <!-- Decorative landscaping border -->
  <g fill="#2d7b32">
    <circle cx="24" cy="56" r="7"/><circle cx="24" cy="96" r="11"/><circle cx="24" cy="138" r="7"/>
    <circle cx="24" cy="180" r="10"/><circle cx="24" cy="224" r="6"/><circle cx="24" cy="264" r="11"/>
    <circle cx="24" cy="310" r="7"/><circle cx="24" cy="356" r="10"/><circle cx="24" cy="398" r="7"/>
    <circle cx="24" cy="454" r="11"/><circle cx="24" cy="500" r="7"/><circle cx="24" cy="548" r="10"/>
    <circle cx="24" cy="600" r="6"/><circle cx="24" cy="650" r="11"/><circle cx="24" cy="700" r="7"/>
    <circle cx="24" cy="760" r="10"/><circle cx="24" cy="812" r="7"/><circle cx="24" cy="866" r="11"/>
    <circle cx="24" cy="918" r="7"/>
    <circle cx="728" cy="336" r="8"/><circle cx="728" cy="378" r="11"/><circle cx="728" cy="424" r="7"/>
    <circle cx="728" cy="476" r="10"/><circle cx="728" cy="528" r="7"/><circle cx="728" cy="578" r="11"/>
    <circle cx="728" cy="630" r="7"/><circle cx="728" cy="684" r="10"/><circle cx="728" cy="736" r="8"/>
  </g>

  <!-- North arrow -->
  <g transform="translate(686 18)">
    <circle cx="24" cy="24" r="21" fill="#ffffff" opacity=".86" stroke="#9ca3af"/>
    <path d="M24 8 L31 30 L24 25 L17 30 Z" fill="#374151"/>
    <text x="24" y="49" text-anchor="middle" font-family="Arial" font-size="10" font-weight="800" fill="#374151">N</text>
  </g>
</svg>
`);

const iconImage = (kind: 'tent' | 'car' | 'tree' | 'gate'): string => {
  const body = {
    tent: `
      <path d="M8 40 L36 8 L64 40 Z" fill="#4f7cac"/>
      <path d="M36 8 L36 40 L64 40 Z" fill="#86a9d3"/>
      <path d="M22 40 L31 26 L40 40 Z" fill="#f3e7c9"/>
      <path d="M6 44 H66" stroke="#34465d" stroke-width="4" stroke-linecap="round"/>
    `,
    car: `
      <path d="M9 38 L18 24 Q21 18 29 18 H47 Q54 18 58 24 L64 38 Z" fill="#d6534f"/>
      <rect x="15" y="36" width="48" height="10" rx="5" fill="#7f1d1d"/>
      <circle cx="21" cy="46" r="6" fill="#293241"/><circle cx="55" cy="46" r="6" fill="#293241"/>
      <path d="M25 24 H48 L54 34 H20 Z" fill="#dbeafe"/>
    `,
    tree: `
      <rect x="31" y="40" width="10" height="19" rx="4" fill="#7c4a27"/>
      <circle cx="36" cy="30" r="21" fill="#2f7d32"/>
      <circle cx="23" cy="35" r="14" fill="#3f8f3e"/>
      <circle cx="49" cy="37" r="14" fill="#4a9b47"/>
      <circle cx="35" cy="20" r="13" fill="#64ad58"/>
    `,
    gate: `
      <path d="M10 50 L36 10 L62 50 Z" fill="#c2414c"/>
      <path d="M24 40 H48" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
      <path d="M27 30 H45" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
    `,
  }[kind];

  return svgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">
      <circle cx="36" cy="36" r="33" fill="#ffffff" opacity=".92" stroke="#cbd5e1" stroke-width="2"/>
      ${body}
    </svg>
  `);
};

const booth = (
  id: string,
  name: string,
  x: number,
  y: number,
  width = 52,
  height = 30,
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
  textVisible = false,
): Space => ({
  id,
  type: 'prop',
  geometry: { type: shape, x, y, width, height },
  properties: { name, propColor: color, textVisible },
});

const textbox = (
  id: string,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
): Space => ({
  id,
  type: 'textbox',
  geometry: { type: 'rectangle', x, y, width, height },
  properties: { name: text },
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

const boothGrid = (
  prefix: string,
  label: string,
  startX: number,
  startY: number,
  columns: number,
  rows: number,
  width = 52,
  height = 30,
  gapX = 6,
  gapY = 7,
  statusOffset = 0,
): Space[] => {
  const statuses: SpaceStatus[] = ['available', 'reserved', 'booked', 'available', 'reserved'];
  return Array.from({ length: columns * rows }, (_, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    return booth(
      `${prefix}-${String(index + 1).padStart(2, '0')}`,
      `${label} ${index + 1}`,
      startX + col * (width + gapX),
      startY + row * (height + gapY),
      width,
      height,
      statuses[(index + statusOffset) % statuses.length],
    );
  });
};

export const TEST_SPACES: Space[] = [
  // High-level vector/image backdrop. Individual booths and symbols remain
  // interactive above it.
  imageProp('site-backdrop', 'Event Site', 0, 0, 760, 1060, backdropImage()),

  // Image-based callouts/icons — these demonstrate where real PNG/SVG assets
  // can replace simple vector props in production.
  imageProp('icon-beverage', 'Beverage Tent', 166, 94, 72, 72, iconImage('tent')),
  imageProp('icon-car-show', 'Car Show', 182, 554, 72, 72, iconImage('car')),
  imageProp('icon-tree', 'Tree Landmark', 548, 300, 72, 72, iconImage('tree')),
  imageProp('icon-gate', 'Gate 75', 314, 930, 72, 72, iconImage('gate')),

  // Examples for the new text controls:
  prop('label-food', 'FOOD VENDORS', 62, 146, 192, 30, '#d8eff1', 'rounded-rectangle', true),
  textbox('label-general-store', 'GENERAL STORE', 382, 144, 148, 34),

  // ---- Food / Hall Blue --------------------------------------------------
  ...boothGrid('blue', 'Blue', 58, 182, 3, 4, 52, 30, 7, 8, 0),
  ...boothGrid('gold', 'Gold', 58, 336, 3, 3, 52, 30, 7, 8, 1),
  ...boothGrid('red', 'Red', 58, 456, 3, 2, 52, 30, 7, 8, 2),

  // General Store
  ...boothGrid('store', 'Store', 390, 180, 2, 4, 58, 31, 8, 8, 1),

  // ---- Camp 3 -----------------------------------------------------------
  ...boothGrid('camp3', 'Camp 3', 502, 374, 3, 2, 57, 30, 7, 9, 0),

  // ---- Camp 2 -----------------------------------------------------------
  ...boothGrid('camp2', 'Camp 2', 502, 552, 3, 4, 57, 30, 7, 9, 1),

  // ---- Car sales / show -------------------------------------------------
  ...boothGrid('cars', 'Car', 54, 646, 3, 2, 54, 31, 8, 8, 0),

  // ---- Arts Park ---------------------------------------------------------
  ...boothGrid('arts', 'Arts', 54, 772, 3, 1, 54, 30, 8, 0, 1),

  // ---- Overflow parking detail ------------------------------------------
  prop('parking-a', 'Parking aisle A', 392, 780, 288, 6, '#83929d', 'line'),
  prop('parking-b', 'Parking aisle B', 392, 806, 288, 6, '#83929d', 'line'),
  prop('parking-c', 'Parking aisle C', 392, 832, 288, 6, '#83929d', 'line'),

  // Lower landscaping and separators
  prop('walkway-east', 'East footpath', 712, 335, 6, 510, '#86a38a', 'line'),
  prop('walkway-west', 'West footpath', 25, 80, 6, 790, '#86a38a', 'line'),

  // A few marker shapes for renderer coverage.
  prop('marker-1', 'Info marker', 365, 715, 22, 22, '#0f766e', 'circle'),
  prop('marker-2', 'Parking marker', 392, 720, 22, 22, '#2563eb', 'diamond'),
  prop('marker-3', 'Service marker', 421, 716, 30, 16, '#7c3aed', 'ellipse'),

  // Real interactive bottom facilities.
  booth('office-01', 'BAFM Office', 304, 778, 92, 42, 'available'),
  booth('gate-75', 'Gate 75', 304, 934, 92, 34, 'reserved'),
  booth('vendor-entry-01', 'Vendor Entry', 570, 934, 108, 34, 'available'),

  // A rotated booth keeps the edit/rotation tool exercised on the realistic map.
  booth('A106', 'Blue 6', 170, 372, 52, 30, 'reserved', 12),
];
