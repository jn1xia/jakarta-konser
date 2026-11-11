// Lays the floor out as bands from the stage outwards, each split into side-by-side blocks.
// A band is { depth, blocks: [categoryId, ...], standing? }: depth is its share of the floor.

import { inPoly } from './geometry.js';

const AISLE = 1.2;                              // between bands and between blocks
const SEATED = { row: 0.95, seat: 0.55 };       // metres between rows and between seats
const STANDING = { row: 1, seat: 1 };           // the grid a standing spot is picked from
const letter = (i) => String.fromCharCode(65 + i);

export function buildFloor(venue, stage, bands) {
  const { halfX, halfZ } = venue.def.floor;
  const edge = venue.outline.polygon(-1.5, 2);  // keeps spots off the front row on curved fields
  const xa = -(halfX - 1), xb = halfX - 1;
  const za = stage.frontZ + 2, zb = halfZ - 1;
  const shares = bands.reduce((sum, b) => sum + b.depth, 0);
  const usable = zb - za - AISLE * (bands.length - 1);

  const blocks = [];
  let z0 = za;
  bands.forEach((band, bi) => {
    const z1 = z0 + (usable * band.depth) / shares;
    const n = band.blocks.length, width = (xb - xa - AISLE * (n - 1)) / n;
    const standing = !!band.standing, pitch = standing ? STANDING : SEATED;
    band.blocks.forEach((cat, i) => {
      const x0 = xa + i * (width + AISLE), x1 = x0 + width;
      const rows = [];
      for (let z = z0 + pitch.row / 2; z < z1; z += pitch.row) {       // row 1 is nearest the stage
        const row = [];
        for (let x = x0 + pitch.seat / 2; x < x1; x += pitch.seat) {
          if (!stage.blocked(x, z) && inPoly(x, z, edge)) row.push(x, 0, z);
        }
        if (row.length) rows.push(new Float32Array(row));
      }
      blocks.push({
        id: `F${bi + 1}-${letter(i)}`, kind: 'floor', band: bi + 1, letter: letter(i), cat, standing,
        poly: [[x0, z0], [x1, z0], [x1, z1], [x0, z1]], x0, x1, z0, z1, rows
      });
    });
    z0 = z1 + AISLE;
  });
  return blocks;
}
