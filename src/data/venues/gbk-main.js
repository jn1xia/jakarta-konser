// Gelora Bung Karno Main Stadium. The bowl follows the model on jn1xia.github.io/bts, turned so
// the long axis runs along z: a four-centred oval front row, a lower and an upper tribune, and
// the ring roof that shades the stands but not the field.

import { fourCentredOval } from '../../engine/outline.js';

export default {
  id: 'gbk-main',
  name: 'Stadion Utama Gelora Bung Karno',
  short: 'GBK',
  area: 'Senayan, Jakarta Pusat',
  capacity: 77193,
  capacitySource: 'https://en.wikipedia.org/wiki/Gelora_Bung_Karno_Stadium',
  outline: fourCentredOval(66, 90.5, 45),
  tiers: [
    { id: 'L', name: { id: 'Tribune Bawah', en: 'Lower Tier' }, d0: 0.6, y0: 1.5, rows: 38, depth: 0.85, rake: 20 },
    { id: 'U', name: { id: 'Tribune Atas', en: 'Upper Tier' }, d0: 36.3, y0: 15.6, rows: 25, depth: 0.85, rake: 33 }
  ],
  sectors: 24,
  floor: { halfX: 50, halfZ: 74 },
  roof: { type: 'ring', dIn: 17, dOut: 64, yIn: 41, yOut: 35.5 },
  estimated: ['rows', 'depth', 'rake', 'roofEdge']
};
