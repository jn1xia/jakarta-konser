// Turns a stage preset and its parameters into a layout the floor, the seat facts and the 3D
// view all share. Phase 1 has one preset, 'end': a stage across the -z end of the floor, with
// an optional runway, T bar and B-stage. Sizes default from the venue's floor.

import { clamp, rectDist, D2R } from './geometry.js';

const RUNWAY_W = 3;       // metres
const B_STAGE = 9;        // side of the square B-stage
const TOWER_HALF = 1.2;   // half-width of a delay tower's footprint
const SIDE_TURN = 25;     // degrees the side screens are turned towards the side stands

const rect = (part, x0, x1, z0, z1) => ({ part, x0, x1, z0, z1 });
const inRect = (r, x, z, m) => x >= r.x0 - m && x <= r.x1 + m && z >= r.z0 - m && z <= r.z1 + m;

export function buildStage(venue, params = {}) {
  const preset = params.preset || 'end';
  if (preset !== 'end') throw new Error(`Unknown stage preset: ${preset}`);
  const runway = params.runway || 'none';
  if (!['none', 'straight', 'T'].includes(runway)) throw new Error(`Unknown runway: ${runway}`);

  const { halfX, halfZ } = venue.def.floor;
  const width = params.width ?? clamp(1.25 * halfX, 14, 54);
  const depth = params.depth ?? clamp(0.3 * halfZ, 8, 19);
  const backZ = -halfZ + 1, frontZ = backZ + depth;
  const deckY = params.deckY ?? (halfZ >= 40 ? 2.2 : 1.6);
  const reach = halfZ - frontZ;                               // floor depth in front of the stage

  // Everything fans cannot stand on, as plan rectangles
  const parts = [rect('main', -width / 2, width / 2, backZ, frontZ)];
  let runwayEndZ = frontZ;
  if (runway !== 'none') {
    runwayEndZ = frontZ + (params.runwayLength ?? 0.45 * reach);
    parts.push(rect('runway', -RUNWAY_W / 2, RUNWAY_W / 2, frontZ, runwayEndZ));
    if (runway === 'T') parts.push(rect('bar', -0.25 * width, 0.25 * width, runwayEndZ - 3, runwayEndZ));
    if (params.bStage) parts.push(rect('b', -B_STAGE / 2, B_STAGE / 2, runwayEndZ - B_STAGE / 2, runwayEndZ + B_STAGE / 2));
  }

  // Screens: the main one on the back wall, and one each side on bigger floors
  const mw = 0.72 * width, mh = mw / 2;
  const screens = [{ c: [0, deckY + 2 + mh / 2, backZ + 0.6], w: mw, h: mh, n: [0, 0, 1], rot: 0 }];
  if (params.sideScreens ?? halfX >= 30) {
    const sw = 0.23 * width, sh = 1.5 * sw;
    for (const s of [-1, 1]) {
      const rot = s * SIDE_TURN * D2R;
      screens.push({
        c: [s * (width / 2 + sw / 2 + 2), deckY + 2 + sh / 2, backZ + 0.45 * depth],
        w: sw, h: sh, n: [Math.sin(rot), 0, Math.cos(rot)], rot
      });
    }
  }

  // Sound desk (front of house) and delay towers out on the floor
  let foh = null;
  if (params.foh ?? halfZ >= 40) {
    const zc = frontZ + 0.62 * reach;
    foh = { x0: -8, x1: 8, z0: zc - 3, z1: zc + 3 };
  }
  const towers = [];
  const nTowers = params.towers ?? (halfZ >= 50 ? 2 : 0);
  if (nTowers >= 2) towers.push([-0.55 * halfX, frontZ + 0.45 * reach], [0.55 * halfX, frontZ + 0.45 * reach]);
  if (nTowers >= 4) towers.push([-0.3 * halfX, frontZ + 0.8 * reach], [0.3 * halfX, frontZ + 0.8 * reach]);

  /** Distance from a point on the floor to the nearest stage edge; 0 on the stage. */
  const dist = (x, z) => Math.min(...parts.map((r) => rectDist(x, z, r.x0, r.x1, r.z0, r.z1)));

  /** True where nobody can sit or stand: stage, runway, sound desk or tower, plus a margin. */
  function blocked(x, z, margin = 1) {
    if (parts.some((r) => inRect(r, x, z, margin))) return true;
    if (foh && inRect(foh, x, z, margin)) return true;
    const h = TOWER_HALF + margin;
    return towers.some(([tx, tz]) => Math.abs(x - tx) <= h && Math.abs(z - tz) <= h);
  }

  return {
    preset, runway, width, depth, backZ, frontZ, deckY, runwayEndZ,
    parts,
    footprint: parts.map((r) => [[r.x0, r.z0], [r.x1, r.z0], [r.x1, r.z1], [r.x0, r.z1]]),
    screens, foh, towers, towerHalf: TOWER_HALF,
    dist, blocked
  };
}
