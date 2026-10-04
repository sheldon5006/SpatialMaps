import { Space, SpaceStatus } from '../../lib/core/types';

const svgDataUrl = (svg: string): string =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/**
 * Outdoor Market reference fixture.
 *
 * Layout basis: a portrait event map with a strong north/south spine,
 * intersecting east/west corridors, booth blocks around the spine, parking
 * lots, food/service areas, landscaping, gates, tents and POIs.
 *
 * Coordinates are deliberately authored as map-space pixels on a 1200x1500
 * artboard so the fixture is useful for testing camera bounds, grid editing,
 * precise positioning, rotation and readable zoom.
 */

const marketBackdrop = (): string => svgDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1500" viewBox="0 0 1200 1500">
  <defs>
    <linearGradient id="paper" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f8f6ef"/>
      <stop offset="1" stop-color="#ece8de"/>
    </linearGradient>

    <linearGradient id="road" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#d2d0ca"/>
      <stop offset="1" stop-color="#c5c3bd"/>
    </linearGradient>

    <linearGradient id="marketGreen" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#dbeed4"/>
      <stop offset="1" stop-color="#c4e0ba"/>
    </linearGradient>

    <pattern id="parking" width="34" height="42" patternUnits="userSpaceOnUse">
      <rect width="34" height="42" fill="#d8d5cf"/>
      <path d="M0 42 L34 0" stroke="#b9b6af" stroke-width="2"/>
    </pattern>

    <pattern id="parkingDark" width="34" height="42" patternUnits="userSpaceOnUse">
      <rect width="34" height="42" fill="#45484b"/>
      <path d="M0 42 L34 0" stroke="#6e7273" stroke-width="2"/>
    </pattern>

    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#4a4d50" flood-opacity=".15"/>
    </filter>
  </defs>

  <rect width="1200" height="1500" fill="url(#paper)"/>

  <!-- Parking + access fields -->
  <rect x="18" y="208" width="192" height="270" rx="26" fill="url(#parkingDark)"/>
  <rect x="990" y="170" width="192" height="300" rx="26" fill="url(#parkingDark)"/>
  <rect x="20" y="1150" width="300" height="300" rx="26" fill="url(#parkingDark)"/>
  <rect x="892" y="1110" width="282" height="340" rx="26" fill="url(#parkingDark)"/>

  <!-- Major vertical spine -->
  <rect x="522" y="0" width="156" height="1500" rx="38" fill="url(#road)"/>
  <path d="M600 18 V1480" stroke="#fafafa" stroke-width="5" stroke-dasharray="24 22" opacity=".9"/>

  <!-- Main east/west market junction -->
  <rect x="0" y="735" width="1200" height="150" rx="34" fill="url(#road)"/>
  <path d="M20 810 H1180" stroke="#fafafa" stroke-width="5" stroke-dasharray="24 22" opacity=".9"/>

  <!-- Upper east/west corridor -->
  <rect x="115" y="492" width="970" height="82" rx="30" fill="url(#road)"/>
  <path d="M130 533 H1070" stroke="#f9f9f9" stroke-width="4" stroke-dasharray="20 20" opacity=".85"/>

  <!-- Lower east/west corridor -->
  <rect x="72" y="1008" width="1050" height="82" rx="30" fill="url(#road)"/>
  <path d="M88 1049 H1100" stroke="#fafafa" stroke-width="4" stroke-dasharray="20 20" opacity=".85"/>

  <!-- Crosswalks -->
  <g stroke="#ffffff" stroke-width="7" opacity=".8">
    <path d="M505 748 V872 M522 748 V872 M539 748 V872"/>
    <path d="M661 748 V872 M678 748 V872 M695 748 V872"/>
    <path d="M115 494 H205 M115 511 H205 M115 528 H205"/>
    <path d="M995 494 H1085 M995 511 H1085 M995 528 H1085"/>
    <path d="M120 1010 H210 M120 1027 H210 M120 1044 H210"/>
    <path d="M990 1010 H1080 M990 1027 H1080 M990 1044 H1080"/>
  </g>

  <!-- Market district footprints -->
  <g filter="url(#shadow)">
    <rect x="238" y="50" width="260" height="178" rx="28" fill="#fffdf8" stroke="#d6d2c8" stroke-width="3"/>
    <rect x="704" y="52" width="262" height="172" rx="28" fill="#fffdf8" stroke="#d6d2c8" stroke-width="3"/>
    <rect x="246" y="270" width="254" height="188" rx="28" fill="#fffdf8" stroke="#d6d2c8" stroke-width="3"/>
    <rect x="700" y="272" width="254" height="188" rx="28" fill="#fffdf8" stroke="#d6d2c8" stroke-width="3"/>
    <rect x="238" y="608" width="262" height="102" rx="28" fill="#fffdf8" stroke="#d6d2c8" stroke-width="3"/>
    <rect x="700" y="608" width="260" height="102" rx="28" fill="#fffdf8" stroke="#d6d2c8" stroke-width="3"/>
    <rect x="235" y="910" width="266" height="92" rx="28" fill="#fffdf8" stroke="#d6d2c8" stroke-width="3"/>
    <rect x="702" y="910" width="265" height="92" rx="28" fill="#fffdf8" stroke="#d6d2c8" stroke-width="3"/>
  </g>

  <!-- District fills -->
  <rect x="238" y="50" width="260" height="178" rx="28" fill="#f5c79e" opacity=".45"/>
  <rect x="704" y="52" width="262" height="172" rx="28" fill="#f0b8c0" opacity=".42"/>
  <rect x="246" y="270" width="254" height="188" rx="28" fill="#c6e0a9" opacity=".46"/>
  <rect x="700" y="272" width="254" height="188" rx="28" fill="#b8d9ef" opacity=".42"/>
  <rect x="238" y="608" width="262" height="102" rx="28" fill="#f2ddb1" opacity=".52"/>
  <rect x="700" y="608" width="260" height="102" rx="28" fill="#d7d4ea" opacity=".50"/>
  <rect x="235" y="910" width="266" height="92" rx="28" fill="#bcdcc4" opacity=".46"/>
  <rect x="702" y="910" width="265" height="92" rx="28" fill="#f2c7a0" opacity=".46"/>

  <!-- Central market lawn -->
  <path d="M286 560 C350 525 450 518 512 564 C546 590 549 648 510 684 C451 738 342 746 286 698 C252 670 251 592 286 560 Z"
        fill="url(#marketGreen)" stroke="#a6c99b" stroke-width="3"/>
  <path d="M690 560 C752 522 850 526 914 564 C954 588 958 648 918 690 C866 742 762 744 700 698 C665 672 658 592 690 560 Z"
        fill="#d6ead1" stroke="#a6c99b" stroke-width="3"/>

  <!-- Market lawn water feature -->
  <ellipse cx="604" cy="612" rx="105" ry="52" fill="#83c4d4" stroke="#5e9faf" stroke-width="4"/>
  <path d="M520 610 C555 588 590 584 625 598 C660 612 686 608 708 594"
        fill="none" stroke="#c8f0f5" stroke-width="7" stroke-linecap="round" opacity=".9"/>

  <!-- Landscaping / tree islands -->
  <g fill="#2f7e3d">
    <circle cx="312" cy="536" r="16"/><circle cx="352" cy="520" r="13"/><circle cx="402" cy="538" r="17"/>
    <circle cx="448" cy="522" r="14"/><circle cx="790" cy="530" r="16"/><circle cx="834" cy="518" r="13"/>
    <circle cx="880" cy="538" r="17"/><circle cx="924" cy="524" r="14"/>
    <circle cx="300" cy="710" r="14"/><circle cx="352" cy="724" r="16"/><circle cx="404" cy="712" r="14"/>
    <circle cx="804" cy="710" r="15"/><circle cx="852" cy="724" r="13"/><circle cx="908" cy="710" r="16"/>
  </g>

  <!-- Food court tent -->
  <path d="M42 610 L154 520 L266 610 Z" fill="#f4e5c5" stroke="#b8ab96" stroke-width="4"/>
  <path d="M90 610 V558 M154 610 V520 M218 610 V558" stroke="#b8ab96" stroke-width="4"/>
  <text x="154" y="642" text-anchor="middle" font-family="Arial" font-size="20" font-weight="800" fill="#776b59">FOOD COURT TENT</text>

  <!-- Main stage -->
  <rect x="996" y="585" width="170" height="116" rx="20" fill="#2f3b42" stroke="#1e252a" stroke-width="4"/>
  <rect x="1018" y="607" width="126" height="64" rx="12" fill="#3f5059"/>
  <path d="M1028 664 L1054 634 L1077 657 L1105 620 L1135 664 Z" fill="#e7b86d"/>
  <text x="1081" y="694" text-anchor="middle" font-family="Arial" font-size="18" font-weight="800" fill="#eef2f3">LIVE STAGE</text>

  <!-- Admin / market office footprint -->
  <rect x="402" y="1212" width="168" height="108" rx="22" fill="#e6ac73" stroke="#bd7844" stroke-width="3" filter="url(#shadow)"/>
  <text x="486" y="1255" text-anchor="middle" font-family="Arial" font-size="24" font-weight="900" fill="#5a341f">MARKET</text>
  <text x="486" y="1284" text-anchor="middle" font-family="Arial" font-size="18" font-weight="800" fill="#5a341f">OFFICE</text>

  <!-- Exit wedges -->
  <g fill="#c8454d" stroke="#9f3037" stroke-width="2">
    <path d="M520 40 L600 0 L680 40 L640 40 L640 110 L560 110 L560 40 Z"/>
    <path d="M0 800 L84 760 L84 860 Z"/>
    <path d="M1116 760 L1200 800 L1116 840 Z"/>
    <path d="M520 1460 L600 1500 L680 1460 L640 1460 L640 1388 L560 1388 L560 1460 Z"/>
  </g>

  <!-- Direction labels -->
  <g font-family="Arial" font-size="16" font-weight="800" fill="#6b6f71">
    <text x="600" y="132" text-anchor="middle">NORTH MARKET SPINE</text>
    <text x="60" y="800" transform="rotate(-90 60 800)" text-anchor="middle">WEST CORRIDOR</text>
    <text x="1140" y="800" transform="rotate(90 1140 800)" text-anchor="middle">EAST CORRIDOR</text>
  </g>

  <!-- Small map furniture -->
  <g fill="#b9b5ad" opacity=".9">
    <circle cx="610" cy="526" r="6"/><circle cx="620" cy="530" r="6"/><circle cx="600" cy="530" r="6"/>
    <rect x="568" y="662" width="66" height="10" rx="5"/>
    <rect x="730" y="586" width="54" height="10" rx="5"/>
    <rect x="382" y="584" width="54" height="10" rx="5"/>
  </g>

  <!-- North arrow + scale -->
  <g transform="translate(1070 22)">
    <circle cx="48" cy="48" r="40" fill="#fffdf8" stroke="#bcb7ad" stroke-width="3"/>
    <path d="M48 12 L61 64 L48 55 L35 64 Z" fill="#30363b"/>
    <text x="48" y="82" text-anchor="middle" font-family="Arial" font-size="15" font-weight="900" fill="#30363b">N</text>
  </g>

  <g transform="translate(36 1440)">
    <path d="M0 0 H180" stroke="#4d555b" stroke-width="4"/>
    <path d="M0 -7 V7 M90 -7 V7 M180 -7 V7" stroke="#4d555b" stroke-width="4"/>
    <text x="90" y="26" text-anchor="middle" font-family="Arial" font-size="13" fill="#60686d">100 m</text>
  </g>
</svg>
`);

const marketLogo = (): string => svgDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="420" height="150" viewBox="0 0 420 150">
  <rect width="420" height="150" rx="28" fill="#fffdf7" stroke="#b4b29f" stroke-width="3"/>
  <path d="M62 48 C95 10 151 10 184 45 C216 11 270 11 304 46" fill="none" stroke="#2d7d42" stroke-width="7" stroke-linecap="round"/>
  <circle cx="188" cy="34" r="16" fill="#db5a45"/>
  <text x="210" y="75" text-anchor="middle" font-family="Georgia, serif" font-size="26" font-weight="700" fill="#a45d36">Riverside</text>
  <text x="210" y="109" text-anchor="middle" font-family="Georgia, serif" font-size="31" font-weight="800" fill="#2d7d42">Outdoor Market</text>
  <text x="210" y="132" text-anchor="middle" font-family="Arial" font-size="11" font-weight="700" letter-spacing="2" fill="#74776c">SHOP • EAT • DISCOVER</text>
</svg>
`);

const iconImage = (
  kind: 'parking' | 'bus' | 'info' | 'atm' | 'restroom' | 'wheelchair' | 'firstaid' | 'waste' | 'food' | 'wifi' | 'entrance' | 'kids',
): string => {
  const body = {
    parking: `
      <text x="36" y="50" text-anchor="middle" font-family="Arial" font-size="42" font-weight="900" fill="#1874b5">P</text>`,
    bus: `
      <rect x="15" y="14" width="42" height="42" rx="8" fill="#2b83ba"/>
      <rect x="21" y="21" width="30" height="15" rx="3" fill="#e4f6ff"/>
      <circle cx="26" cy="49" r="4" fill="#30363b"/><circle cx="46" cy="49" r="4" fill="#30363b"/>`,
    info: `
      <circle cx="36" cy="36" r="22" fill="#2a78ae"/>
      <text x="36" y="49" text-anchor="middle" font-family="Georgia" font-size="40" font-weight="700" fill="#fff">i</text>`,
    atm: `
      <rect x="11" y="12" width="50" height="48" rx="8" fill="#56a64e"/>
      <rect x="20" y="20" width="32" height="17" rx="3" fill="#ecf7e9"/>
      <text x="36" y="52" text-anchor="middle" font-family="Arial" font-size="12" font-weight="900" fill="#fff">ATM</text>`,
    restroom: `
      <circle cx="36" cy="36" r="23" fill="#3c9c77"/>
      <circle cx="28" cy="27" r="4" fill="#fff"/><circle cx="44" cy="27" r="4" fill="#fff"/>
      <path d="M28 33 V50 M44 33 V50 M28 40 H44" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`,
    wheelchair: `
      <circle cx="36" cy="36" r="23" fill="#13a7d7"/>
      <circle cx="43" cy="22" r="4" fill="#fff"/>
      <circle cx="36" cy="48" r="10" fill="none" stroke="#fff" stroke-width="4"/>
      <path d="M37 26 L31 39 H49 M31 39 L26 49" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`,
    firstaid: `
      <circle cx="36" cy="36" r="23" fill="#d75357"/>
      <rect x="30" y="21" width="12" height="30" rx="3" fill="#fff"/>
      <rect x="21" y="30" width="30" height="12" rx="3" fill="#fff"/>`,
    waste: `
      <rect x="21" y="19" width="30" height="36" rx="5" fill="#6d7376"/>
      <path d="M18 19 H54 M29 13 H43" stroke="#3f4549" stroke-width="5" stroke-linecap="round"/>
      <path d="M31 28 V48 M41 28 V48" stroke="#dfe4e6" stroke-width="3"/>`,
    food: `
      <circle cx="36" cy="36" r="23" fill="#ef8b4d"/>
      <path d="M25 22 V50 M25 22 Q35 25 25 31 M47 23 V48" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`,
    wifi: `
      <circle cx="36" cy="36" r="23" fill="#567fa5"/>
      <path d="M22 29 Q36 18 50 29 M27 36 Q36 29 45 36 M32 43 Q36 39 40 43" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`,
    entrance: `
      <circle cx="36" cy="36" r="23" fill="#7c5bb4"/>
      <path d="M27 22 V50 H45 M28 36 H50 M43 29 L50 36 L43 43" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`,
    kids: `
      <circle cx="36" cy="36" r="23" fill="#e9b44c"/>
      <circle cx="29" cy="27" r="4" fill="#fff"/><circle cx="43" cy="27" r="4" fill="#fff"/>
      <path d="M29 34 L27 49 M43 34 L45 49 M29 40 H43" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`,
  }[kind];

  return svgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">
      <circle cx="36" cy="36" r="31" fill="#fff" stroke="#c6cbd0" stroke-width="2"/>
      ${body}
    </svg>
  `);
};

const legendImage = (): string => svgDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="450" height="300" viewBox="0 0 450 300">
  <rect width="450" height="300" rx="22" fill="#fffdf7" stroke="#b8b3a8" stroke-width="3"/>
  <text x="24" y="38" font-family="Georgia" font-size="24" font-weight="700" fill="#2d7d56">Market Guide</text>
  <text x="24" y="62" font-family="Arial" font-size="11" fill="#74786f">DISTRICTS</text>

  <circle cx="28" cy="88" r="10" fill="#e6a15f"/><text x="48" y="94" font-family="Arial" font-size="14" fill="#51565a">North Bazaar</text>
  <circle cx="28" cy="116" r="10" fill="#7ac36b"/><text x="48" y="122" font-family="Arial" font-size="14" fill="#51565a">Garden Market</text>
  <circle cx="28" cy="144" r="10" fill="#7eb5da"/><text x="48" y="150" font-family="Arial" font-size="14" fill="#51565a">Riverside Row</text>
  <circle cx="28" cy="172" r="10" fill="#e7c67c"/><text x="48" y="178" font-family="Arial" font-size="14" fill="#51565a">Food Court</text>

  <line x1="232" y1="72" x2="232" y2="274" stroke="#d3d0c7" stroke-width="2"/>
  <text x="252" y="94" font-family="Arial" font-size="11" fill="#74786f">SERVICES</text>

  <circle cx="265" cy="120" r="10" fill="#1874b5"/><text x="259" y="126" font-family="Arial" font-size="12" font-weight="900" fill="#fff">P</text><text x="286" y="125" font-family="Arial" font-size="14" fill="#51565a">Parking</text>
  <circle cx="265" cy="150" r="10" fill="#56a64e"/><text x="257" y="154" font-family="Arial" font-size="8" font-weight="900" fill="#fff">ATM</text><text x="286" y="155" font-family="Arial" font-size="14" fill="#51565a">ATM</text>
  <circle cx="265" cy="180" r="10" fill="#3c9c77"/><text x="258" y="185" font-family="Arial" font-size="9" font-weight="900" fill="#fff">WC</text><text x="286" y="185" font-family="Arial" font-size="14" fill="#51565a">Restrooms</text>
  <circle cx="265" cy="210" r="10" fill="#d75357"/><text x="258" y="216" font-family="Arial" font-size="11" font-weight="900" fill="#fff">+</text><text x="286" y="215" font-family="Arial" font-size="14" fill="#51565a">First aid</text>
  <circle cx="265" cy="240" r="10" fill="#13a7d7"/><text x="257" y="246" font-family="Arial" font-size="10" font-weight="900" fill="#fff">♿</text><text x="286" y="245" font-family="Arial" font-size="14" fill="#51565a">Accessible</text>
</svg>`);

const booth = (
  id: string,
  name: string,
  x: number,
  y: number,
  width = 60,
  height = 34,
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
  width = 56,
  height = 32,
  gapX = 7,
  gapY = 8,
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
  // Base map — intentionally composed from editable props/text instead of
  // one large background image. This keeps roads, districts and landmarks
  // aligned with the same coordinate system as the interactive booths.
  // ------------------------------------------------------------------------
  prop('ground', 'Market Ground', 0, 0, 1200, 1500, '#f3f0e8', 'rectangle'),
  prop('north-spine', 'North South Road', 522, 0, 156, 1500, '#c8c6bf', 'rounded-rectangle'),
  prop('main-cross', 'Main East West Road', 0, 735, 1200, 150, '#c8c6bf', 'rounded-rectangle'),
  prop('upper-cross', 'Upper Market Road', 115, 492, 970, 82, '#d0cec8', 'rounded-rectangle'),
  prop('lower-cross', 'Lower Market Road', 72, 1008, 1050, 82, '#d0cec8', 'rounded-rectangle'),
  prop('central-loop', 'Central Loop Road', 430, 500, 340, 78, '#d1cfca', 'rounded-rectangle'),

  // Parking lots
  prop('parking-west-lot', 'West Parking Lot', 18, 208, 192, 270, '#55585b', 'rounded-rectangle'),
  prop('parking-east-lot', 'East Parking Lot', 990, 170, 192, 300, '#55585b', 'rounded-rectangle'),
  prop('parking-south-lot', 'South Parking Lot', 20, 1150, 300, 300, '#55585b', 'rounded-rectangle'),
  prop('parking-family-lot', 'Family Parking Lot', 892, 1110, 282, 340, '#55585b', 'rounded-rectangle'),

  // Districts / neighborhood footprints
  prop('north-bazaar-zone', 'North Bazaar District', 238, 50, 260, 178, '#f0c39a', 'rounded-rectangle'),
  prop('north-east-zone', 'North East District', 704, 52, 262, 172, '#edb8c2', 'rounded-rectangle'),
  prop('garden-zone', 'Garden Market District', 246, 270, 254, 188, '#c6e0a9', 'rounded-rectangle'),
  prop('riverside-zone', 'Riverside Row District', 700, 272, 254, 188, '#b9d9ee', 'rounded-rectangle'),
  prop('food-zone', 'Food Court District', 238, 608, 262, 102, '#f2dcae', 'rounded-rectangle'),
  prop('service-zone', 'Service Plaza District', 700, 608, 260, 102, '#d9d5ea', 'rounded-rectangle'),
  prop('west-market-zone', 'West Market District', 235, 910, 266, 92, '#bcd9c3', 'rounded-rectangle'),
  prop('east-market-zone', 'East Market District', 702, 910, 265, 92, '#f0c7a0', 'rounded-rectangle'),

  // Parks / water / event structures
  prop('west-lawn', 'West Market Lawn', 286, 560, 226, 160, '#d7ebcf', 'ellipse'),
  prop('east-lawn', 'East Market Lawn', 688, 560, 226, 160, '#d7ebcf', 'ellipse'),
  prop('market-pond', 'Market Pond', 542, 566, 124, 92, '#78b9cf', 'ellipse'),
  prop('food-tent', 'Food Court Tent', 42, 610, 224, 120, '#eadfc9', 'triangle'),
  prop('event-stage', 'Live Stage', 996, 585, 170, 116, '#334149', 'rounded-rectangle'),
  prop('market-office-zone', 'Market Office', 394, 1204, 184, 140, '#e4aa72', 'rounded-rectangle'),

  // Branded image used as an accent, not as the whole map.
  imageProp('market-logo', 'Riverside Outdoor Market', 48, 28, 340, 122, marketLogo()),

  // ------------------------------------------------------------------------
  // First-class text labels
  // ------------------------------------------------------------------------
  textbox('north-bazaar-title', 'NORTH BAZAAR', 276, 68, 190, 34),
  textbox('garden-market-title', 'GARDEN MARKET', 286, 286, 194, 34),
  textbox('riverside-row-title', 'RIVERSIDE ROW', 742, 286, 190, 34),
  textbox('food-court-title', 'FOOD COURT', 286, 622, 160, 34),
  textbox('service-plaza-title', 'SERVICE PLAZA', 744, 622, 190, 34),
  textbox('west-market-title', 'WEST MARKET', 270, 922, 184, 32),
  textbox('east-market-title', 'EAST MARKET', 742, 922, 184, 32),
  textbox('north-corridor', 'NORTH CORRIDOR', 682, 372, 160, 28, 90),
  textbox('south-corridor', 'SOUTH CORRIDOR', 670, 1128, 160, 28, 90),
  textbox('loading-zone', 'VENDOR LOADING', 36, 1162, 180, 30),
  textbox('kids-zone', 'FAMILY & KIDS', 996, 1002, 160, 30),
  textbox('event-stage-label', 'EVENT STAGE', 1010, 566, 140, 28),

  // ------------------------------------------------------------------------
  // North Bazaar - main shop rows
  // ------------------------------------------------------------------------
  booth('A101', 'North 01', 264, 118, 62, 34, 'available'),
  booth('A102', 'North 02', 334, 118, 62, 34, 'reserved'),
  booth('A103', 'North 03', 404, 118, 62, 34, 'booked'),
  booth('A104', 'North 04', 264, 164, 62, 34, 'available'),
  booth('A105', 'North 05', 334, 164, 62, 34, 'maintenance'),
  booth('A106', 'North 06', 404, 164, 62, 34, 'reserved', 12),

  ...boothGrid('north-west', 'NW Shop', 264, 354, 3, 2, 60, 34, 8, 9, 1),
  ...boothGrid('north-east', 'NE Shop', 712, 354, 3, 2, 60, 34, 8, 9, 2),

  // ------------------------------------------------------------------------
  // Garden Market
  // ------------------------------------------------------------------------
  ...boothGrid('garden', 'Garden', 272, 324, 3, 3, 60, 34, 8, 9, 0),
  ...boothGrid('garden-low', 'Garden', 282, 416, 3, 1, 60, 34, 8, 0, 2),

  // ------------------------------------------------------------------------
  // Riverside Row
  // ------------------------------------------------------------------------
  ...boothGrid('river', 'Riverside', 716, 322, 3, 3, 60, 34, 8, 9, 1),
  booth('river-feature', 'Riverside 10', 850, 416, 70, 38, 'reserved'),

  // ------------------------------------------------------------------------
  // Food court / craft area
  // ------------------------------------------------------------------------
  ...boothGrid('food', 'Food', 270, 654, 3, 1, 60, 34, 8, 0, 0),
  ...boothGrid('craft', 'Craft', 270, 954, 3, 1, 60, 34, 8, 0, 1),

  // Service plaza
  booth('service-01', 'Service 01', 712, 654, 62, 34, 'reserved'),
  booth('service-02', 'Service 02', 782, 654, 62, 34, 'available'),
  booth('service-03', 'Service 03', 852, 654, 62, 34, 'booked'),

  // ------------------------------------------------------------------------
  // Lower east/west shop rows
  // ------------------------------------------------------------------------
  ...boothGrid('west-lower', 'West', 250, 954, 3, 1, 60, 34, 8, 0, 2),
  ...boothGrid('east-lower', 'East', 716, 954, 3, 1, 60, 34, 8, 0, 0),

  // ------------------------------------------------------------------------
  // POIs / services - image props
  // ------------------------------------------------------------------------
  imageProp('poi-parking-west', 'West Parking', 78, 258, 64, 64, iconImage('parking')),
  imageProp('poi-parking-east', 'East Parking', 1068, 246, 64, 64, iconImage('parking')),
  imageProp('poi-parking-south', 'South Parking', 96, 1236, 64, 64, iconImage('parking')),
  imageProp('poi-bus', 'Bus Stop', 1088, 1048, 64, 64, iconImage('bus')),
  imageProp('poi-info', 'Information Booth', 746, 694, 64, 64, iconImage('info')),
  imageProp('poi-atm', 'ATM', 392, 236, 64, 64, iconImage('atm')),
  imageProp('poi-restrooms', 'Restrooms', 842, 698, 64, 64, iconImage('restroom')),
  imageProp('poi-accessible', 'Accessible', 930, 700, 64, 64, iconImage('wheelchair')),
  imageProp('poi-firstaid', 'First Aid', 1008, 704, 64, 64, iconImage('firstaid')),
  imageProp('poi-waste', 'Waste & Recycling', 102, 1098, 64, 64, iconImage('waste')),
  imageProp('poi-food', 'Food Truck', 54, 664, 64, 64, iconImage('food')),
  imageProp('poi-wifi', 'Guest WiFi', 1080, 590, 64, 64, iconImage('wifi')),
  imageProp('poi-entrance', 'Main Entrance', 574, 1378, 64, 64, iconImage('entrance')),
  imageProp('poi-kids', 'Kids Area', 1030, 960, 64, 64, iconImage('kids')),

  // ------------------------------------------------------------------------
  // Feature props - signs, furniture, landscaping
  // ------------------------------------------------------------------------
  prop('green-island-1', 'Garden Tree', 336, 534, 24, 24, '#2f7e3d', 'circle'),
  prop('green-island-2', 'Garden Tree', 392, 520, 28, 28, '#3f8f3e', 'circle'),
  prop('green-island-3', 'Garden Tree', 802, 530, 26, 26, '#2f7e3d', 'circle'),
  prop('green-island-4', 'Garden Tree', 866, 520, 24, 24, '#3f8f3e', 'circle'),
  prop('fountain', 'FOUNTAIN', 566, 578, 76, 24, '#2d8aa0', 'rounded-rectangle', true),
  prop('food-sign', 'FOOD & DRINK', 34, 612, 210, 38, '#ef8b4d', 'rounded-rectangle', true),
  prop('market-sign', 'MARKET INFO', 728, 606, 178, 38, '#2a78ae', 'rounded-rectangle', true),
  prop('family-sign', 'FAMILY AREA', 980, 1002, 180, 38, '#e9b44c', 'rounded-rectangle', true),

  // ------------------------------------------------------------------------
  // Market operations / entrances
  // ------------------------------------------------------------------------
  booth('market-office', 'Market Office', 402, 1226, 164, 74, 'available'),
  booth('loading-01', 'Vendor Loading', 76, 1182, 92, 40, 'available'),
  booth('loading-02', 'Vendor Loading 2', 188, 1182, 92, 40, 'reserved'),
  booth('entry-west', 'West Entry', 12, 786, 82, 40, 'reserved'),
  booth('entry-east', 'East Entry', 1106, 786, 82, 40, 'available'),
  booth('entry-south', 'South Entry', 554, 1430, 92, 38, 'available'),

  // ------------------------------------------------------------------------
  // Legend + operational hints
  // ------------------------------------------------------------------------
  imageProp('legend', 'Market Guide', 720, 1160, 360, 240, legendImage()),
  textbox('vendor-note', 'VENDOR PARKING', 910, 1190, 180, 28),
  textbox('public-note', 'PUBLIC PARKING', 42, 1320, 170, 28),

  // Small rotated path labels to exercise real text-box rotation.
  textbox('west-road-label', 'WEST ACCESS ROAD', 146, 746, 190, 26, -14),
  textbox('east-road-label', 'EAST ACCESS ROAD', 882, 842, 190, 26, 14),
];
