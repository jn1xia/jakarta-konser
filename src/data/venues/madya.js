// Stadion Madya GBK: an athletics stadium with a stand along each long side and open ends.
// No reliable seat count was found, so everything here is an estimate around a standard track.

import { roundedRect, makeOutline } from '../../engine/outline.js';

const outline = roundedRect(48, 90, 46);
// Each stand follows its straight and runs 12 m into the curves at both ends.
const WRAP = 12;
const along = (nx) => {
  const p = makeOutline(outline).pieces.find((q) => q.t === 'l' && q.nx === nx);
  return [[p.u0 - WRAP, p.u1 + WRAP]];
};
const stand = (id, name, nx) => ({ id, name, d0: 0.8, y0: 1.5, rows: 22, depth: 0.8, rake: 22, span: along(nx) });

export default {
  id: 'madya',
  name: 'Stadion Madya Gelora Bung Karno',
  short: 'Stadion Madya',
  area: 'Senayan, Jakarta Pusat',
  capacity: null,
  capacitySource: null,
  outline,
  tiers: [
    stand('A', { id: 'Tribune Barat', en: 'West Stand' }, 1),
    stand('B', { id: 'Tribune Timur', en: 'East Stand' }, -1)
  ],
  sectors: 40,
  floor: { halfX: 34, halfZ: 52 },
  roof: { type: 'none' },
  estimated: ['outline', 'rows', 'depth', 'rake', 'capacity']
};
