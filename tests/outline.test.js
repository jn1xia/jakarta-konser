import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeOutline, roundedRect, fourCentredOval } from '../src/engine/outline.js';
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);

test('rounded rect: length, seam, closure, continuity, outward normals', () => {
  const o = makeOutline(roundedRect(41, 60, 12));
  near(o.L, 2 * 58 + 2 * 96 + 2 * Math.PI * 12);
  const a = o.ring(0, 0), b = o.ring(o.L, 0);
  near(a.x, 0); near(a.z, 60); near(b.x, 0); near(b.z, 60);
  assert.ok(o.ring(5, 0).x > 0);                       // u grows towards +x first
  for (let u = 0; u < o.L; u += 0.5) {
    const p = o.ring(u, 0), q = o.ring(u + 0.5, 0);
    assert.ok(Math.hypot(p.x - q.x, p.z - q.z) <= 0.5 + 1e-6);
    near(Math.hypot(p.nx, p.nz), 1, 1e-9);
    assert.ok(p.x * p.nx + p.z * p.nz > 0);
  }
});
test('an offset outline is longer by 2*pi*d, and uAtLen inverts lenAt', () => {
  const o = makeOutline(roundedRect(41, 60, 12));
  near(o.lenAt(0, o.L, 10), o.L + 2 * Math.PI * 10);
  near(o.lenAt(30, o.uAtLen(30, 55, 7), 7), 55);
});
test('seam can sit at the stage end', () => {
  const p = makeOutline(roundedRect(25, 50, 2, 'stage')).ring(0, 0);
  near(p.x, 0); near(p.z, -50);
});
test('four-centred oval passes through its half-axes', () => {
  const o = makeOutline(fourCentredOval(66, 90.5, 45));
  near(o.ring(0, 0).z, 90.5); near(o.ring(o.L / 4, 0).x, 66, 1e-4);
  near(o.ring(o.L / 2, 0).z, -90.5, 1e-4);
});
test('polygon(d) is the outline offset by d', () => {
  const pts = makeOutline(roundedRect(20, 30, 5)).polygon(-1.5, 2);
  assert.ok(pts.every(([x, z]) => Math.abs(x) <= 18.5 + 1e-6 && Math.abs(z) <= 28.5 + 1e-6));
});
