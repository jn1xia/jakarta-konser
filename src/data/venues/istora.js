// Istora Senayan (Istora Gelora Bung Karno): a single tribune all round a rectangular floor.
// The seat count is published; the bowl's shape and size here are estimates built to match it.

import { roundedRect } from '../../engine/outline.js';

export default {
  id: 'istora',
  name: 'Istora Senayan',
  short: 'Istora',
  area: 'Senayan, Jakarta Pusat',
  capacity: 7166,
  capacitySource: 'https://en.wikipedia.org/wiki/Istora_Gelora_Bung_Karno',
  outline: roundedRect(15, 25, 6),
  tiers: [
    { id: 'T', name: { id: 'Tribune', en: 'Stand' }, d0: 0.6, y0: 1.2, rows: 20, depth: 0.8, rake: 27 }
  ],
  sectors: 20,
  floor: { halfX: 14, halfZ: 24 },
  roof: { type: 'hall' },
  ceilingY: 20,
  estimated: ['outline', 'rows', 'depth', 'rake', 'ceiling']
};
