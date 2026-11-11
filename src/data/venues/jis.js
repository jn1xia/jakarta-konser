// Jakarta International Stadium. The bowl follows the model on jn1xia.github.io/bigbang:
// a rounded-rectangle field edge and three tiers raked at JIS's published 24, 29 and 32 degrees.

import { roundedRect } from '../../engine/outline.js';

export default {
  id: 'jis',
  name: 'Jakarta International Stadium',
  short: 'JIS',
  area: 'Jakarta Utara',
  capacity: 82000,
  capacitySource: 'https://en.wikipedia.org/wiki/Jakarta_International_Stadium',
  outline: roundedRect(41, 60, 12),
  tiers: [
    { id: 'L', name: { id: 'Tribune Bawah', en: 'Lower Tier' }, d0: 0.8, y0: 1.6, rows: 26, depth: 0.8, rake: 24 },
    { id: 'M', name: { id: 'Tribune Tengah', en: 'Middle Tier' }, d0: 19.5, y0: 14.5, rows: 20, depth: 0.85, rake: 29 },
    { id: 'U', name: { id: 'Tribune Atas', en: 'Upper Tier' }, d0: 33.5, y0: 28.5, rows: 33, depth: 0.85, rake: 32 }
  ],
  sectors: 24,
  floor: { halfX: 37, halfZ: 56 },
  roof: { type: 'closed', y: 55.5 },
  estimated: ['rows', 'depth']
};
