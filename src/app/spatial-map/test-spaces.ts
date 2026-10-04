import { Space, SpaceStatus } from '../../lib/core/types';

const svgDataUrl = (svg: string): string =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/**
 * This fixture is a polished cartographic-style event map inspired by the
 * supplied reference: dark road network, warm base terrain, neighborhood
 * districts, parking lots, a central green/pond, service icons and a compact
 * legend. Booths remain real interactive Spaces above the illustrated base.
 */

const siteBackdrop = (): string => svgDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="760" viewBox="0 0 1280 760">
  <defs>
    <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f3f0e8"/>
      <stop offset="1" stop-color="#e6e1d8"/>
    </linearGradient>

    <linearGradient id="road" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#151a1f"/>
      <stop offset="1" stop-color="#242a30"/>
    </linearGradient>

    <pattern id="parking" width="26" height="34" patternUnits="userSpaceOnUse">
      <rect width="26" height="34" fill="#d9d4cc"/>
      <path d="M0 34 L26 0" stroke="#b5afa7" stroke-width="2"/>
    </pattern>

    <pattern id="parkingDark" width="28" height="36" patternUnits="userSpaceOnUse">
      <rect width="28" height="36" fill="#20262c"/>
      <path d="M0 36 L28 0" stroke="#697179" stroke-width="1.5"/>
    </pattern>

    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#1b2025" flood-opacity=".15"/>
    </filter>
  </defs>

  <rect width="1280" height="760" fill="url(#ground)"/>

  <!-- Outer parking fields -->
  <rect x="0" y="18" width="175" height="210" rx="18" fill="url(#parkingDark)"/>
  <rect x="1098" y="196" width="166" height="210" rx="18" fill="url(#parkingDark)"/>
  <rect x="300" y="540" width="250" height="186" rx="18" fill="url(#parkingDark)"/>
  <rect x="1130" y="520" width="128" height="210" rx="18" fill="url(#parkingDark)"/>

  <!-- Main road network -->
  <path d="M0 264 C220 245 356 204 520 128 C652 68 794 74 920 146 C1032 210 1140 246 1280 236"
        fill="none" stroke="url(#road)" stroke-width="76" stroke-linecap="round"/>
  <path d="M255 0 C288 124 420 218 534 307 C646 394 808 446 938 497 C1036 535 1101 602 1117 760"
        fill="none" stroke="url(#road)" stroke-width="68" stroke-linecap="round"/>
  <path d="M0 465 C178 450 344 444 490 478 C640 512 792 574 920 588 C1060 603 1180 565 1280 535"
        fill="none" stroke="url(#road)" stroke-width="62" stroke-linecap="round"/>
  <path d="M750 110 C704 184 706 272 759 334 C816 401 916 405 1002 367"
        fill="none" stroke="url(#road)" stroke-width="34" stroke-linecap="round"/>

  <!-- Road center lines -->
  <path d="M20 264 C220 245 356 204 520 128 C652 68 794 74 920 146 C1032 210 1140 246 1260 236"
        fill="none" stroke="#f7f8f8" stroke-width="4" stroke-dasharray="18 18" stroke-linecap="round" opacity=".75"/>
  <path d="M255 15 C288 124 420 218 534 307 C646 394 808 446 938 497 C1036 535 1101 602 1117 745"
        fill="none" stroke="#f7f8f8" stroke-width="4" stroke-dasharray="18 18" stroke-linecap="round" opacity=".75"/>
  <path d="M15 465 C178 450 344 444 490 478 C640 512 792 574 920 588 C1060 603 1180 565 1265 535"
        fill="none" stroke="#f7f8f8" stroke-width="4" stroke-dasharray="18 18" stroke-linecap="round" opacity=".75"/>

  <!-- Neutral building footprints -->
  <g filter="url(#shadow)">
    <rect x="52" y="72" width="350" height="136" rx="24" fill="#fbfaf7" stroke="#d4cfc6" stroke-width="3"/>
    <rect x="446" y="80" width="312" height="146" rx="24" fill="#fbfaf7" stroke="#d4cfc6" stroke-width="3"/>
    <rect x="782" y="162" width="266" height="182" rx="24" fill="#fbfaf7" stroke="#d4cfc6" stroke-width="3"/>
    <rect x="418" y="320" width="376" height="180" rx="28" fill="#fbfaf7" stroke="#d4cfc6" stroke-width="3"/>
    <rect x="810" y="388" width="184" height="184" rx="24" fill="#fbfaf7" stroke="#d4cfc6" stroke-width="3"/>
    <rect x="1000" y="470" width="118" height="210" rx="22" fill="#fbfaf7" stroke="#d4cfc6" stroke-width="3"/>
  </g>

  <!-- Neighborhood district tints -->
  <path d="M58 82 H396 Q410 82 410 96 V184 Q410 202 392 202 H72 Q58 202 58 186 Z"
        fill="#f4be80" opacity=".52"/>
  <path d="M452 88 H748 Q758 88 758 102 V214 Q758 228 742 228 H468 Q452 228 452 212 Z"
        fill="#c5d99e" opacity=".50"/>
  <path d="M788 168 H1040 V338 H788 Q782 338 782 330 V180 Q782 168 788 168 Z"
        fill="#f0b4c4" opacity=".48"/>
  <path d="M426 326 H784 V494 H426 Z"
        fill="#b8d7bf" opacity=".44"/>
  <path d="M818 396 H990 V566 H818 Z"
        fill="#9cc9ed" opacity=".45"/>
  <path d="M1008 476 H1112 V676 H1008 Z"
        fill="#d9c09e" opacity=".44"/>

  <!-- Central park / pond -->
  <path d="M408 282 C480 235 610 238 682 270 C734 294 778 322 806 360 C760 414 676 452 575 447 C480 443 419 402 388 348 Z"
        fill="#d7e4cb"/>
  <path d="M542 318 C578 294 616 296 644 317 C669 336 671 359 649 378 C620 403 578 398 552 383 C526 368 518 338 542 318 Z"
        fill="#78b9cf" stroke="#5b9db6" stroke-width="3"/>

  <!-- Tree clusters -->
  <g fill="#2d7c3d">
    <circle cx="446" cy="284" r="12"/><circle cx="470" cy="268" r="13"/><circle cx="496" cy="281" r="11"/>
    <circle cx="704" cy="286" r="13"/><circle cx="730" cy="300" r="11"/><circle cx="754" cy="281" r="13"/>
    <circle cx="450" cy="408" r="13"/><circle cx="476" cy="421" r="11"/><circle cx="726" cy="417" r="14"/>
    <circle cx="752" cy="430" r="11"/><circle cx="778" cy="412" r="13"/>
    <circle cx="676" cy="350" r="12"/><circle cx="698" cy="369" r="10"/>
  </g>
  <g fill="#5b9c4d" opacity=".82">
    <circle cx="460" cy="293" r="6"/><circle cx="489" cy="270" r="5"/><circle cx="720" cy="312" r="6"/>
    <circle cx="468" cy="413" r="5"/><circle cx="742" cy="421" r="6"/><circle cx="690" cy="358" r="5"/>
  </g>

  <!-- Event tent -->
  <path d="M870 230 L930 176 L990 230 Z" fill="#e5e0d6" stroke="#bcb5aa" stroke-width="3"/>
  <path d="M900 230 V194 M930 230 V176 M960 230 V194" stroke="#bcb5aa" stroke-width="3"/>
  <text x="930" y="250" text-anchor="middle" font-family="Arial" font-size="14" font-weight="700" fill="#8c847a">EVENT TENT</text>

  <!-- Decorative pedestrian paths -->
  <g fill="none" stroke="#c0c5bd" stroke-width="8" stroke-linecap="round" opacity=".8">
    <path d="M428 304 Q514 276 602 286"/>
    <path d="M684 405 Q744 373 790 349"/>
    <path d="M496 451 Q560 430 640 442"/>
  </g>

  <!-- North arrow -->
  <g transform="translate(1168 22)">
    <circle cx="40" cy="40" r="34" fill="#fbfaf7" stroke="#b7b1a7" stroke-width="2"/>
    <path d="M40 10 L51 52 L40 45 L29 52 Z" fill="#2a3137"/>
    <text x="40" y="69" text-anchor="middle" font-family="Arial" font-size="14" font-weight="800" fill="#2a3137">N</text>
  </g>

  <!-- Scale -->
  <g transform="translate(36 718)">
    <path d="M0 0 H120" stroke="#4b535a" stroke-width="3"/>
    <path d="M0 -5 V5 M60 -5 V5 M120 -5 V5" stroke="#4b535a" stroke-width="3"/>
    <text x="60" y="22" text-anchor="middle" font-family="Arial" font-size="12" fill="#656d72">100 m</text>
  </g>
</svg>
`);

const iconImage = (
  kind: 'parking' | 'bus' | 'info' | 'atm' | 'restroom' | 'wheelchair' | 'gift' | 'post',
): string => {
  const body = {
    parking: `
      <text x="36" y="47" text-anchor="middle" font-family="Arial" font-size="42" font-weight="900" fill="#1668a8">P</text>`,
    bus: `
      <rect x="17" y="16" width="38" height="40" rx="8" fill="#1583be"/>
      <rect x="22" y="23" width="28" height="16" rx="3" fill="#d9f0ff"/>
      <circle cx="27" cy="51" r="4" fill="#24323b"/><circle cx="45" cy="51" r="4" fill="#24323b"/>`,
    info: `
      <circle cx="36" cy="36" r="20" fill="#1975ad"/>
      <text x="36" y="48" text-anchor="middle" font-family="Georgia" font-size="38" font-weight="700" fill="#fff">i</text>`,
    atm: `
      <rect x="13" y="14" width="46" height="44" rx="8" fill="#55a94d"/>
      <rect x="21" y="21" width="30" height="16" rx="3" fill="#e9f7e6"/>
      <text x="36" y="50" text-anchor="middle" font-family="Arial" font-size="12" font-weight="900" fill="#fff">ATM</text>`,
    restroom: `
      <circle cx="36" cy="36" r="23" fill="#3e9d77"/>
      <circle cx="28" cy="28" r="4" fill="#fff"/><circle cx="44" cy="28" r="4" fill="#fff"/>
      <path d="M28 33 L28 49 M44 33 L44 49 M28 39 H44" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`,
    wheelchair: `
      <circle cx="36" cy="36" r="23" fill="#12a5d7"/>
      <circle cx="42" cy="22" r="4" fill="#fff"/>
      <circle cx="36" cy="47" r="10" fill="none" stroke="#fff" stroke-width="4"/>
      <path d="M37 26 L31 38 L48 38 M31 38 L26 48" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`,
    gift: `
      <rect x="14" y="24" width="44" height="33" rx="5" fill="#2a7bb4"/>
      <path d="M36 24 V57 M14 34 H58" stroke="#fff" stroke-width="3"/>
      <path d="M36 24 C29 18 22 20 24 25 C26 28 31 26 36 24 C41 26 46 28 48 25 C50 20 43 18 36 24" fill="none" stroke="#fff" stroke-width="3"/>`,
    post: `
      <rect x="14" y="24" width="44" height="33" rx="5" fill="#2d6c9f"/>
      <path d="M18 28 L36 44 L54 28 M18 53 L31 39 M54 53 L41 39" fill="none" stroke="#fff" stroke-width="3"/>`,
  }[kind];

  return svgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">
      <circle cx="36" cy="36" r="31" fill="#fff" opacity=".95" stroke="#c8cdd0" stroke-width="2"/>
      ${body}
    </svg>
  `);
};

const legendImage = (): string => svgDataUrl(`
  <svg xmlns="http://www.w3.org/2000/svg" width="430" height="250" viewBox="0 0 430 250">
    <rect width="430" height="250" rx="20" fill="#f7f5ef" opacity=".96"/>
    <rect x="2" y="2" width="426" height="246" rx="18" fill="none" stroke="#b9b3a9" stroke-width="2"/>
    <text x="24" y="34" font-family="Georgia" font-size="24" font-weight="700" fill="#27684d">Neighborhoods</text>

    <circle cx="30" cy="65" r="13" fill="#b7333f"/><text x="55" y="71" font-family="Arial" font-size="16" fill="#4d4f52">The Courtyard</text>
    <circle cx="30" cy="99" r="13" fill="#147ab5"/><text x="55" y="105" font-family="Arial" font-size="16" fill="#4d4f52">Merchants Row</text>
    <circle cx="30" cy="133" r="13" fill="#087c58"/><text x="55" y="139" font-family="Arial" font-size="16" fill="#4d4f52">Village Green</text>
    <circle cx="30" cy="167" r="13" fill="#63ad42"/><text x="55" y="173" font-family="Arial" font-size="16" fill="#4d4f52">Upper Village Green</text>
    <circle cx="30" cy="201" r="13" fill="#ec963d"/><text x="55" y="207" font-family="Arial" font-size="16" fill="#4d4f52">Wagon House Shops</text>

    <line x1="255" y1="52" x2="255" y2="220" stroke="#d5d0c7" stroke-width="2"/>
    <text x="278" y="73" font-family="Arial" font-size="13" font-weight="700" fill="#555b60">MAP SERVICES</text>
    <circle cx="291" cy="102" r="11" fill="#2b7bb0"/><text x="284" y="108" font-family="Arial" font-size="13" font-weight="900" fill="#fff">P</text><text x="311" y="107" font-family="Arial" font-size="14" fill="#555b60">Parking</text>
    <circle cx="291" cy="134" r="11" fill="#55a94d"/><text x="283" y="139" font-family="Arial" font-size="10" font-weight="900" fill="#fff">ATM</text><text x="311" y="139" font-family="Arial" font-size="14" fill="#555b60">ATM</text>
    <circle cx="291" cy="166" r="11" fill="#3e9d77"/><text x="287" y="171" font-family="Arial" font-size="11" font-weight="900" fill="#fff">WC</text><text x="311" y="171" font-family="Arial" font-size="14" fill="#555b60">Restrooms</text>
    <circle cx="291" cy="198" r="11" fill="#12a5d7"/><text x="284" y="203" font-family="Arial" font-size="11" font-weight="900" fill="#fff">♿</text><text x="311" y="203" font-family="Arial" font-size="14" fill="#555b60">Accessible</text>
  </svg>
`);

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

const boothGrid = (
  prefix: string,
  label: string,
  startX: number,
  startY: number,
  columns: number,
  rows: number,
  width = 48,
  height = 28,
  gapX = 7,
  gapY = 7,
  statusOffset = 0,
): Space[] => {
  const statuses: SpaceStatus[] = [
    'available',
    'reserved',
    'booked',
    'available',
    'reserved',
    'unavailable',
    'maintenance',
  ];

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
  // ------------------------------------------------------------------------
  // Illustrated site base
  // ------------------------------------------------------------------------
  imageProp('site-backdrop', 'Event Site', 0, 0, 1280, 760, siteBackdrop()),

  // ------------------------------------------------------------------------
  // First-class map labels (standalone text boxes)
  // ------------------------------------------------------------------------
  textbox('title', 'RIVERSIDE MARKET • EVENT MAP', 38, 28, 320, 34),
  textbox('wagon-label', 'WAGON HOUSE SHOPS', 110, 96, 240, 30, -10),
  textbox('upper-green-label', 'UPPER VILLAGE GREEN', 468, 96, 250, 30),
  textbox('courtyard-label', 'THE COURTYARD', 824, 208, 188, 30, 10),
  textbox('village-green-label', 'VILLAGE GREEN', 520, 252, 190, 30),
  textbox('merchants-label', 'MERCHANTS ROW', 828, 432, 175, 30, 12),
  textbox('courtyard-lower-label', 'THE COURTYARD', 1020, 548, 100, 28, -6),
  textbox('street-road-label', 'STREET ROAD', 1006, 288, 130, 26, 67),
  textbox('pedllers-label', 'PEDDLERS LANE', 860, 322, 170, 26, 32),

  // ------------------------------------------------------------------------
  // Neighborhood shop/booth clusters
  // ------------------------------------------------------------------------

  // Wagon House Shops — includes the six canonical A101-A106 dev fixtures.
  booth('A101', 'Shop 101', 92, 116, 62, 34, 'available'),
  booth('A102', 'Shop 102', 162, 116, 62, 34, 'reserved'),
  booth('A103', 'Shop 103', 232, 116, 62, 34, 'booked'),
  booth('A104', 'Shop 104', 302, 116, 62, 34, 'available'),
  booth('A105', 'Shop 105', 92, 160, 62, 34, 'maintenance'),
  booth('A106', 'Shop 106', 162, 160, 62, 34, 'reserved', 12),
  ...boothGrid('wagon', 'Shop', 232, 160, 2, 2, 62, 34, 8, 10, 1),

  // Upper Village Green.
  ...boothGrid('upper', 'Shop', 474, 126, 3, 2, 64, 34, 8, 12, 2),
  ...boothGrid('upper-low', 'Shop', 536, 206, 2, 1, 64, 34, 8, 12, 0),

  // Central Village Green.
  ...boothGrid('village', 'Shop', 546, 330, 3, 2, 62, 34, 8, 10, 0),
  ...boothGrid('village-east', 'Shop', 694, 374, 2, 2, 62, 34, 8, 10, 2),

  // Merchants Row.
  ...boothGrid('merchant', 'Shop', 836, 452, 2, 4, 62, 34, 9, 9, 1),

  // The Courtyard.
  ...boothGrid('court', 'Shop', 1028, 574, 3, 3, 60, 34, 7, 8, 2),
  booth('court-10', 'Shop 10', 1172, 590, 56, 34, 'available'),
  booth('court-11', 'Shop 11', 1172, 634, 56, 34, 'reserved'),
  booth('court-12', 'Shop 12', 1172, 678, 56, 34, 'booked'),

  // ------------------------------------------------------------------------
  // Service / POI image props
  // ------------------------------------------------------------------------
  imageProp('poi-parking-1', 'Parking', 136, 228, 58, 58, iconImage('parking')),
  imageProp('poi-parking-2', 'Parking', 1064, 208, 58, 58, iconImage('parking')),
  imageProp('poi-parking-3', 'Parking', 310, 598, 58, 58, iconImage('parking')),
  imageProp('poi-bus', 'Bus Parking', 1098, 306, 58, 58, iconImage('bus')),
  imageProp('poi-info', 'Guest Services', 742, 244, 58, 58, iconImage('info')),
  imageProp('poi-atm', 'ATM', 354, 120, 58, 58, iconImage('atm')),
  imageProp('poi-restroom', 'Rest Rooms', 444, 392, 58, 58, iconImage('restroom')),
  imageProp('poi-wheelchair', 'Wheelchair Accessible', 804, 468, 58, 58, iconImage('wheelchair')),
  imageProp('poi-gift', 'Gift Cards', 930, 626, 58, 58, iconImage('gift')),
  imageProp('poi-post', 'Post Office', 1048, 428, 58, 58, iconImage('post')),

  // ------------------------------------------------------------------------
  // Demonstration prop with text visibility enabled.
  // ------------------------------------------------------------------------
  prop('featured-fountain', 'FOUNTAIN', 592, 292, 74, 28, '#176f7f', 'rounded-rectangle', true),

  // Decorative map symbols / landscaping.
  prop('garden-1', 'Tree', 420, 322, 18, 18, '#2d7c3d', 'circle'),
  prop('garden-2', 'Tree', 455, 344, 22, 22, '#3f8f3e', 'circle'),
  prop('garden-3', 'Tree', 720, 300, 18, 18, '#2d7c3d', 'circle'),
  prop('garden-4', 'Tree', 755, 326, 24, 24, '#4b9c47', 'circle'),
  prop('garden-5', 'Tree', 478, 420, 22, 22, '#3f8f3e', 'circle'),
  prop('garden-6', 'Tree', 716, 432, 22, 22, '#3f8f3e', 'circle'),

  // Small landmark markers.
  prop('market-marker', 'Market Marker', 392, 286, 24, 24, '#8b5cf6', 'diamond'),
  prop('park-marker', 'Park Marker', 774, 350, 24, 24, '#14b8a6', 'diamond'),
  prop('gate-marker', 'Main Gate', 536, 704, 34, 34, '#b7333f', 'triangle'),

  // ------------------------------------------------------------------------
  // Illustrated legend
  // ------------------------------------------------------------------------
  imageProp('legend', 'Neighborhood Legend', 920, 28, 322, 186, legendImage()),
];
