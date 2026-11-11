// Indonesia Arena, the indoor arena in the GBK complex. Only the seat count is published;
// the bowl's shape and size here are estimates built to match it.

import { roundedRect } from '../../engine/outline.js';

export default {
  id: 'indonesia-arena',
  name: 'Indonesia Arena',
  short: 'Indonesia Arena',
  area: 'Senayan, Jakarta Pusat',
  capacity: 16088,
  capacitySource: 'https://goodstats.id/article/inilah-indonesia-arena-venue-indoor-mewah-terbesar-milik-indonesia-3VFYE',
  outline: roundedRect(20, 31, 8),
  tiers: [
    { id: 'L', name: { id: 'Tribune Bawah', en: 'Lower Tier' }, d0: 0.6, y0: 1.2, rows: 18, depth: 0.85, rake: 26 },
    { id: 'U', name: { id: 'Tribune Atas', en: 'Upper Tier' }, d0: 18.4, y0: 11.5, rows: 13, depth: 0.85, rake: 34 }
  ],
  sectors: 24,
  floor: { halfX: 19, halfZ: 30 },
  roof: { type: 'hall' },
  ceilingY: 30,
  estimated: ['outline', 'rows', 'depth', 'rake', 'ceiling']
};
