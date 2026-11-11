// ICE BSD (Indonesia Convention Exhibition, Tangerang): flat exhibition halls with a temporary
// stand at the back. Each hall is taken as about 50 x 100 m; all sizes here are estimates.
// The seam of the outline sits at the stage end, so the far-end stand is one stretch of u.

import { roundedRect, makeOutline } from '../../engine/outline.js';

export function iceHall(id, name, halfX) {
  const outline = roundedRect(halfX, 50, 2, 'stage');
  const far = makeOutline(outline).pieces.find((p) => p.t === 'l' && p.nz === 1);
  return {
    id,
    name,
    short: name,
    area: 'BSD City, Tangerang',
    capacity: null,
    capacitySource: null,
    outline,
    tiers: [
      { id: 'T', name: { id: 'Tribune', en: 'Stand' }, d0: 0.5, y0: 0.8, rows: 20, depth: 0.85, rake: 25, span: [[far.u0, far.u1]] }
    ],
    sectors: 24,
    floor: { halfX: halfX - 1, halfZ: 49 },
    roof: { type: 'hall' },
    ceilingY: 14,
    estimated: ['outline', 'rows', 'depth', 'rake', 'ceiling', 'capacity']
  };
}

export const iceBsd56 = iceHall('ice-bsd-5-6', 'ICE BSD Hall 5-6', 50);
export const iceBsd5 = iceHall('ice-bsd-5', 'ICE BSD Hall 5', 25);
