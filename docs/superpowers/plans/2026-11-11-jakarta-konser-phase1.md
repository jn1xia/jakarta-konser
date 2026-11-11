# Jakarta Konser Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A static site that lists every upcoming Jakarta concert and shows a 3D seat view for twelve of them from one shared, data-driven engine.

**Architecture:** Pure-logic `engine` modules turn a venue definition and a concert's settings into seat positions, a stage layout and a category for every section. `sim` modules draw that with three.js. The hub renders the calendar from the same data. Geometry, crowd shader and sightline code are generalised from the `jn1xia/bts` and `jn1xia/bigbang` repositories.

**Tech Stack:** Plain ES modules with no build step, three.js r128 (vendored), Node 22 `node:test`, Playwright (pre-installed; driven from a CommonJS script), GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-11-11-jakarta-konser-phase1-design.md`. Concert facts: `docs/research/jakarta-concerts-2026-2027.md`.

## Global Constraints

- No runtime dependencies and no build step. `package.json` has `"type": "module"`.
- `src/engine/*` and `src/data/*` use no DOM and no three.js, so they import cleanly in Node.
- three.js is the global `THREE` from `vendor/three.min.js` (r128). `sim` modules read `window.THREE`.
- Units are metres, `y` is up, the floor centre is the origin, the stage is at the `-z` end. Outline `u` starts at the far-end centre `(0, +halfZ)` and increases towards `+x` first. ICE BSD alone puts the seam at the stage end, so its far-end stand is one stretch of `u`.
- Every visible string goes through `i18n.js`. Indonesian is the default. Artist, tour and category names are never translated.
- Text that comes from concert data or a packed link is put into the page with `textContent` or canvas `fillText`, never `innerHTML`.
- `price: null` is shown as "Harga belum diumumkan" / "Price not announced". No price is ever invented.
- Every phase 1 simulation has `accuracy: 'estimated'`.
- Fan-made and unofficial: no artist logos, photos or artwork; performer figures are generic.
- Visual language follows the BTS site: tokens `--void:#07070a`, `--panel:rgba(12,11,14,.9)`, `--ink:#f1eef0`, `--muted:#9d97a2`, fonts Archivo (display), IBM Plex Sans (body), IBM Plex Mono (data).
- Commit after every task. End each commit message with:
  `Co-Authored-By: Claude <noreply@anthropic.com>` and
  `Claude-Session: https://claude.ai/code/session_01KbqiCpLfzaw8v2fWF1hTt5`. No model names anywhere in the repository.
- Unit tests: `npm test`. Browser test: `npm run e2e`. Both must pass before a task is committed once they exist.

## Reference code

Clone if missing: `git clone --depth 1 https://github.com/jn1xia/bigbang /home/user/jn1xia/bigbang` and the same for `bts`. Read-only.

| What to carry over | Where |
| --- | --- |
| Rounded-rectangle outline, `ring`, `lenAt`, `uAtLen`, `sampleU` | `bigbang/index.html` 250–300 |
| Four-centred oval outline (long axis along `x` there; turn it to `z`) | `bts/index.html` 310–345 |
| Seat rows per section, floor polygons | `bigbang/index.html` 334–393 |
| Renderer, sky, ground, stands meshes, roof | `bigbang/index.html` 396–590; ring roof in `bts/index.html` 505–728 |
| Stage boxes, screens, beams | `bigbang/index.html` 591–704 |
| Crowd pose shader, lightstick points, jointed figures | `bigbang/index.html` 705–909, 1031–1059 |
| Seat state, camera, zoom | `bigbang/index.html` 910–977 |
| Screen visibility raycast, seat facts | `bigbang/index.html` 978–1030 |
| Panel, 2D map, dock, pointer and keyboard, frame loop | `bigbang/index.html` 1060–1367 |
| CSS and page markup | `bts/index.html` 13–283 |
| Visitor counter | `bts/index.html` 1995–2039 |

## File map

```
index.html  sim.html  assets/site.css  vendor/three.min.js  vendor/THREE-LICENSE
src/i18n.js  src/hub.js
src/engine/  geometry.js outline.js venue.js stage.js floor.js categories.js
             model.js verdict.js config.js calendar.js
src/sim/     main.js scene.js stage-mesh.js crowd.js camera.js facts.js panel.js
src/data/    concerts.js  venues/index.js  venues/{jis,gbk-main,indonesia-arena,istora,madya,ice-bsd}.js
tests/       outline venues stage floor categories model config calendar i18n concerts (.test.js)
tests/e2e/smoke.cjs
.github/workflows/test.yml  .github/workflows/pages.yml
package.json  .gitignore  README.md
```

`engine/verdict.js` is an addition to the spec's list: the verdict line is pure logic, so it is tested in Node.

## Review Focus

1. A packed link whose artist, tour or category name contains markup: it must appear as literal text and run nothing. Tests in Tasks 8 and 17.
2. A link to a show whose dates have passed, and a hub with no upcoming shows at all: the simulation still opens, and the hub shows an empty-state message instead of a blank page. Tests in Tasks 11 and 17.
3. Seat values in the address that are missing, out of range or garbage (`&s=ZZ&r=999&n=-3`): the default seat opens. Test in Task 7.
4. A multi-date show that is partly over (BTS on 28 Dec): still listed, counting down to the next date. Test in Task 9.
5. A category with no known price: the panel, legend and hub card say it is not announced and never show `Rp0` or `NaN`. Tests in Tasks 9 and 16.

---

### Task 1: Scaffold, geometry helpers, outline

**Files:**
- Create: `package.json`, `.gitignore`, `vendor/three.min.js`, `vendor/THREE-LICENSE`, `.github/workflows/test.yml`
- Create: `src/engine/geometry.js`, `src/engine/outline.js`
- Test: `tests/outline.test.js`

**Interfaces:**
- Produces, `geometry.js`: `D2R`, `clamp(v,a,b)`, `inPoly(x,z,poly)` with `poly = [[x,z],...]`, `segDist(px,pz,x0,z0,x1,z1)`, `rectDist(x,z,x0,x1,z0,z1)` (0 inside), `rng(seed) -> () => number` (the mulberry32 in `bigbang/index.html` line 408).
- Produces, `outline.js`:
  - `roundedRect(halfX, halfZ, r, seam = 'far') -> pieces`; `seam: 'stage'` starts at `(0, -halfZ)` instead.
  - `fourCentredOval(halfX, halfZ, endR) -> pieces`: tight arcs of radius `endR` at the `±z` ends, wide arcs along the sides.
  - `makeOutline(pieces) -> { L, ring(u,d) -> {x,z,nx,nz}, lenAt(u0,u1,d), uAtLen(u0,len,d), sampleU(u0,u1,step), wrap(u), polygon(d, step) -> [[x,z],...] }`.

- [ ] **Step 1: Write `package.json`, `.gitignore` and `test.yml`**

`package.json`: `name: "jakarta-konser"`, `private: true`, `type: "module"`, scripts `test: node --test "tests/*.test.js"`, `e2e: node tests/e2e/smoke.cjs`, `serve: python3 -m http.server 8000`. `.gitignore`: `node_modules/`. `test.yml`: on push and pull request, `actions/checkout@v4`, `actions/setup-node@v4` with Node 22, `npm test`.

- [ ] **Step 2: Vendor three.js r128**

In the scratchpad run `npm pack three@0.128.0`, extract it, and copy `package/build/three.min.js` to `vendor/three.min.js` and `package/LICENSE` to `vendor/THREE-LICENSE`.
Verify: `head -c 300 vendor/three.min.js` mentions three.js, and `grep -c 'REVISION="128"' vendor/three.min.js` prints `1`.

- [ ] **Step 3: Write the failing tests**

```js
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
```

- [ ] **Step 4: Run to verify failure.** `npm test` fails with "Cannot find module".
- [ ] **Step 5: Implement `geometry.js` and `outline.js`** from the reference lines, with each arc piece carrying its own radius so one `ring` serves both outline kinds.
- [ ] **Step 6: Run to verify.** `npm test` passes 5 tests.
- [ ] **Step 7: Commit** as `chore: scaffold, vendor three.js, add outline geometry`.

### Task 2: Venue builder, JIS and GBK

**Files:**
- Create: `src/engine/venue.js`, `src/data/venues/jis.js`, `src/data/venues/gbk-main.js`, `src/data/venues/index.js`
- Test: `tests/venues.test.js`

**Interfaces:**
- Consumes: `makeOutline`, `roundedRect`, `fourCentredOval`.
- Produces, `venue.js`:
  - `SEAT_W = 0.5`, `AISLE = 0.6`.
  - `buildVenue(def) -> { def, outline, tiers }`, each tier gaining `rise`, `dBack`, `yTop`, `index`.
  - `sectorsOf(venue, tier) -> [{ k, u0, u1 }]`: `def.sectors` equal parts of the whole outline, or, when the tier has `span`, parts of about `outline.L / def.sectors` inside each span range. `k` counts from 1 per tier.
  - `seatRows(venue, tier, u0, u1, r0, r1) -> { rows: Float32Array[], rowsU: Float32Array[] }` for rows `r0 ≤ r < r1`, one `x,y,z` triple per seat.
  - `venueSeatCount(venue) -> number`.
- Produces, `venues/index.js`: `VENUES`, an object keyed by venue id.
- Venue definition shape: as in the spec. `outline` holds the pieces an outline builder returns. Added fields: `ceilingY` for indoor venues and `capacitySource` (a URL).

Starting values, taken from the existing sites:

| | JIS | GBK Main Stadium |
| --- | --- | --- |
| id, short | `jis`, `JIS` | `gbk-main`, `GBK` |
| capacity | 82000 | 77193 |
| outline | `roundedRect(41, 60, 12)` | `fourCentredOval(66, 90.5, 45)` |
| tiers (`id`, `d0`, `y0`, `rows`, `depth`, `rake`) | `L` 0.8, 1.6, 26, 0.8, 24 · `M` 19.5, 14.5, 20, 0.85, 29 · `U` 33.5, 28.5, 34, 0.85, 32 | `L` 0.6, 1.5, 38, 0.85, 20 · `U` 36.3, 15.6, 26, 0.85, 33 |
| sectors | 24 | 24 |
| floor | `halfX 37, halfZ 56` | `halfX 50, halfZ 74` |
| roof | `{ type: 'closed', y: 55.5 }` | `{ type: 'ring', dIn: 17, dOut: 64, yIn: 41, yOut: 35.5 }` |
| estimated | rows, depth | rows, depth, rake, roof edge |

Tier names: `L` "Bawah"/"Lower", `M` "Tengah"/"Middle", `U` "Atas"/"Upper".

- [ ] **Step 1: Write the failing tests**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildVenue, sectorsOf, seatRows, venueSeatCount, SEAT_W } from '../src/engine/venue.js';
import { VENUES } from '../src/data/venues/index.js';

const CAPACITY_RANGE = {};          // filled in Task 3 for venues without a firm figure
for (const id of ['jis', 'gbk-main']) {
  test(`${id}: seat count is within 5% of the published capacity`, () => {
    const v = buildVenue(VENUES[id]), n = venueSeatCount(v);
    assert.ok(Math.abs(n - v.def.capacity) / v.def.capacity <= 0.05, `${n} seats`);
  });
}
test('rows hold xyz triples, climb with the rake, and seats are a seat-width apart', () => {
  const v = buildVenue(VENUES.jis), t = v.tiers[0], s = sectorsOf(v, t)[3];
  const { rows } = seatRows(v, t, s.u0, s.u1, 0, t.rows);
  assert.equal(rows.length, t.rows);
  assert.ok(rows[5][1] > rows[4][1]);
  const r = rows[0];
  for (let i = 3; i < r.length; i += 3)
    assert.ok(Math.hypot(r[i] - r[i - 3], r[i + 2] - r[i - 1]) >= SEAT_W * 0.9);
});
test('24 sectors per full-ring tier, numbered from 1', () => {
  const v = buildVenue(VENUES['gbk-main']), s = sectorsOf(v, v.tiers[1]);
  assert.equal(s.length, 24); assert.equal(s[0].k, 1); assert.equal(s[0].u0, 0);
});
```

- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement `venue.js` and the two venue files.** If a capacity test fails, change `rows` in the venue file by the smallest amount that passes; never change the test.
- [ ] **Step 4: Run to verify.** `npm test` passes.
- [ ] **Step 5: Commit** as `feat: venue builder with JIS and GBK Main Stadium`.

### Task 3: Indonesia Arena, Istora, Stadion Madya, ICE BSD

**Files:**
- Create: `src/data/venues/indonesia-arena.js`, `istora.js`, `madya.js`, `ice-bsd.js`
- Modify: `src/data/venues/index.js`, `tests/venues.test.js`

**Interfaces:**
- Produces: `VENUES` gains `indonesia-arena`, `istora`, `madya`, `ice-bsd-5-6` and `ice-bsd-5`. The two ICE entries come from one factory `iceHall(id, name, halfX)` in `ice-bsd.js`.

Starting values. All dimensions here are estimates, so `estimated` lists every figure.

| | Indonesia Arena | Istora | Stadion Madya | ICE BSD |
| --- | --- | --- | --- | --- |
| outline | `roundedRect(20, 31, 8)` | `roundedRect(15, 25, 6)` | `roundedRect(48, 90, 46)` | `roundedRect(halfX, 50, 2, 'stage')`, `halfX` 50 for Halls 5–6 and 25 for Hall 5 |
| tiers | `L` 0.6, 1.2, 18, 0.85, 26 · `U` 18.4, 11.5, 13, 0.85, 34 | `T` 0.6, 1.2, 20, 0.8, 27 | `A` and `B`, each 0.8, 1.5, 22, 0.8, 22 | `T` 0.5, 0.8, 20, 0.85, 25 |
| span | none | none | each long-side straight, extended 12 m into the curves at both ends: `A` on the `+x` side (about `[[62.3, 174.3]]`), `B` on the `-x` side (about `[[298.8, 410.8]]`) | `T`: the far-end straight, found from the outline, not hard-coded |
| sectors | 24 | 20 | 40 | 24 |
| floor | `halfX 19, halfZ 30` | `halfX 14, halfZ 24` | `halfX 34, halfZ 52` | `halfX - 1`, `halfZ 49` |
| roof | `{ type: 'hall' }`, `ceilingY 30` | `{ type: 'hall' }`, `ceilingY 20` | `{ type: 'none' }` | `{ type: 'hall' }`, `ceilingY 14` |
| capacity | 16500 | 7166 | 9170 | none |

Tier names: Madya `A` "Tribune Barat"/"West Stand", `B` "Tribune Timur"/"East Stand"; Istora and ICE `T` "Tribune"/"Stand".

- [ ] **Step 1: Confirm capacities.** One web search each for Indonesia Arena, Istora and Stadion Madya. Put the figure and its URL in `capacity` and `capacitySource`. If no reliable figure turns up, set `capacity: null` and add a range to `CAPACITY_RANGE` in the test file instead.
- [ ] **Step 2: Extend the tests**

```js
CAPACITY_RANGE['ice-bsd-5-6'] = [2500, 5000];
CAPACITY_RANGE['ice-bsd-5'] = [1200, 2500];
for (const id of ['indonesia-arena', 'istora', 'madya', 'ice-bsd-5-6', 'ice-bsd-5']) {
  test(`${id}: seat count is plausible`, () => {
    const v = buildVenue(VENUES[id]), n = venueSeatCount(v), r = CAPACITY_RANGE[id];
    if (r) assert.ok(n >= r[0] && n <= r[1], `${n} seats`);
    else assert.ok(Math.abs(n - v.def.capacity) / v.def.capacity <= 0.05, `${n} seats`);
  });
}
test('Madya stands sit only on the two long sides', () => {
  const v = buildVenue(VENUES.madya);
  for (const t of v.tiers) for (const s of sectorsOf(v, t)) {
    const p = v.outline.ring((s.u0 + s.u1) / 2, t.d0);
    assert.ok(Math.abs(p.x) > 45 && Math.abs(p.z) < 60);
  }
});
test('the ICE stand is at the far end only', () => {
  const v = buildVenue(VENUES['ice-bsd-5']);
  for (const s of sectorsOf(v, v.tiers[0])) assert.ok(v.outline.ring((s.u0 + s.u1) / 2, 0.5).z > 49);
});
```

- [ ] **Step 3: Run to verify failure.** `npm test` fails on the new tests.
- [ ] **Step 4: Implement the four files.** Tune `rows` as in Task 2.
- [ ] **Step 5: Run to verify.** `npm test` passes.
- [ ] **Step 6: Commit** as `feat: add Indonesia Arena, Istora, Stadion Madya and ICE BSD`.

### Task 4: Stage layout, `end` preset

**Files:**
- Create: `src/engine/stage.js`
- Test: `tests/stage.test.js`

**Interfaces:**
- Consumes: `buildVenue`, `rectDist`, `inPoly`, `clamp`.
- Produces: `buildStage(venue, params) -> layout` with the shape in the spec's "Stage layout" section, plus `backZ`, `width`, `runwayEndZ` (equal to `frontZ` without a runway) and `screens[i] = { c: [x,y,z], w, h, n: [x,y,z], rot }`. `blocked(x, z, margin = 1)`. An unknown preset throws `Error('Unknown stage preset: <name>')`.

Defaults, with `halfX`, `halfZ` from `venue.def.floor`:

| Value | Rule |
| --- | --- |
| `width` | `clamp(1.25 * halfX, 14, 54)` |
| `depth` | `clamp(0.3 * halfZ, 8, 19)` |
| `backZ`, `frontZ` | `-halfZ + 1`, `backZ + depth` |
| `deckY` | 2.2 when `halfZ >= 40`, else 1.6 |
| runway | 3 m wide from `frontZ`; `runwayLength` default `0.45 * (halfZ - frontZ)` |
| `runway: 'T'` | a bar `0.5 * width` wide and 3 m deep across the runway's end |
| `bStage` | a 9 × 9 m platform centred on the runway's end; needs a runway |
| main screen | `w = 0.72 * width`, `h = w / 2`, centre at `y = deckY + 2 + h / 2`, `z = backZ + 0.6`, facing `+z` |
| side screens | on by default when `halfX >= 30`: `w = 0.23 * width`, `h = 1.5 * w`, at `x = ±(width / 2 + w / 2 + 2)`, turned 25° inwards |
| sound desk | on by default when `halfZ >= 40`: 16 × 6 m centred at `z = frontZ + 0.62 * (halfZ - frontZ)` |
| towers | 2 by default when `halfZ >= 50`, else 0: at `x = ±0.55 * halfX`, `z = frontZ + 0.45 * (halfZ - frontZ)`, 2.2 m half-size |

- [ ] **Step 1: Write the failing tests**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildVenue } from '../src/engine/venue.js';
import { buildStage } from '../src/engine/stage.js';
import { VENUES } from '../src/data/venues/index.js';
const jis = buildVenue(VENUES.jis), near = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} vs ${b}`);

test('plain end stage on JIS', () => {
  const s = buildStage(jis, { preset: 'end' });
  near(s.backZ, -55); near(s.frontZ, -38.2); near(s.width, 46.25); near(s.deckY, 2.2);
  assert.equal(s.blocked(0, s.frontZ - 1), true);
  assert.equal(s.blocked(0, s.frontZ + 5), false);
  near(s.dist(0, s.frontZ + 10), 10);
  assert.deepEqual(s.screens[0].n, [0, 0, 1]); near(s.screens[0].c[0], 0);
  assert.equal(s.screens.length, 3); assert.equal(s.towers.length, 2);
  assert.ok(s.foh && s.blocked((s.foh.x0 + s.foh.x1) / 2, (s.foh.z0 + s.foh.z1) / 2));
});
test('runway, T bar and B-stage extend the footprint', () => {
  const r = buildStage(jis, { preset: 'end', runway: 'straight', runwayLength: 30 });
  assert.equal(r.blocked(0, r.frontZ + 15), true); near(r.runwayEndZ, r.frontZ + 30);
  near(r.dist(0, r.runwayEndZ + 4), 4);
  const t = buildStage(jis, { preset: 'end', runway: 'T', runwayLength: 30 });
  assert.equal(t.blocked(t.width * 0.25 - 0.5, t.runwayEndZ - 1.5, 0), true);
  const b = buildStage(jis, { preset: 'end', runway: 'straight', runwayLength: 30, bStage: true });
  assert.equal(b.blocked(4, b.runwayEndZ, 0), true);
});
test('small indoor floor: lower deck, no towers, no side screens', () => {
  const s = buildStage(buildVenue(VENUES.istora), { preset: 'end' });
  near(s.deckY, 1.6); assert.equal(s.towers.length, 0); assert.equal(s.screens.length, 1); assert.equal(s.foh, null);
});
test('unknown preset is refused', () => {
  assert.throws(() => buildStage(jis, { preset: 'centre' }), /Unknown stage preset: centre/);
});
```

- [ ] **Step 2: Run to verify failure.** `npm test` fails on the new tests.
- [ ] **Step 3: Implement `stage.js`.**
- [ ] **Step 4: Run to verify.** `npm test` passes.
- [ ] **Step 5: Commit** as `feat: end-stage layout with runway, T bar and B-stage`.

### Task 5: Floor blocks

**Files:**
- Create: `src/engine/floor.js`
- Test: `tests/floor.test.js`

**Interfaces:**
- Consumes: `buildVenue`, `buildStage`, `inPoly`.
- Produces: `buildFloor(venue, stage, bands) -> block[]`. `bands = [{ depth, blocks: [catId,...], standing? }]`, listed from the stage outwards. A block is `{ id, kind: 'floor', band, letter, cat, standing, poly, x0, x1, z0, z1, rows: Float32Array[] }`.

Rules: the usable floor is `|x| <= halfX - 1`, `frontZ + 2 <= z <= halfZ - 1`. Band depths are shares, normalised to sum to 1. Bands and blocks are separated by 1.2 m aisles. Ids are `F<band>-<letter>`, band 1 nearest the stage, letter `A` at `-x`. Seated grid: rows 0.95 m apart, seats 0.55 m apart. Standing grid: 1 m each way. Row 1 of a block is nearest the stage. A spot is dropped when `stage.blocked(x, z)` or when it falls outside `venue.outline.polygon(-1.5, 2)`. Rows with no spots are dropped.

- [ ] **Step 1: Write the failing tests**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildVenue } from '../src/engine/venue.js';
import { buildStage } from '../src/engine/stage.js';
import { buildFloor } from '../src/engine/floor.js';
import { inPoly } from '../src/engine/geometry.js';
import { VENUES } from '../src/data/venues/index.js';
const spots = (b) => b.rows.flatMap((r) => Array.from({ length: r.length / 3 }, (_, i) => [r[i * 3], r[i * 3 + 2]]));

test('bands become lettered blocks from the stage outwards', () => {
  const v = buildVenue(VENUES.jis), s = buildStage(v, { preset: 'end' });
  const f = buildFloor(v, s, [{ depth: 1, blocks: ['VA', 'VB'], standing: true }, { depth: 3, blocks: ['C1'] }]);
  assert.deepEqual(f.map((b) => b.id), ['F1-A', 'F1-B', 'F2-A']);
  assert.ok(f[0].x1 <= 0 && f[1].x0 >= 0 && f[0].standing && !f[2].standing);
  assert.ok(f[2].z0 > f[0].z1);
  const depth1 = f[0].z1 - f[0].z0, depth2 = f[2].z1 - f[2].z0;
  assert.ok(Math.abs(depth2 / depth1 - 3) < 0.2);
  assert.ok(f[2].rows[0][2] < f[2].rows[1][2]);          // row 1 is nearest the stage
});
test('no spot lies in the stage, a runway, the sound desk or a tower', () => {
  const v = buildVenue(VENUES.jis), s = buildStage(v, { preset: 'end', runway: 'T', bStage: true });
  for (const b of buildFloor(v, s, [{ depth: 1, blocks: ['A'] }]))
    for (const [x, z] of spots(b)) assert.equal(s.blocked(x, z), false);
});
test('on an oval field, spots outside the front row are dropped', () => {
  const v = buildVenue(VENUES['gbk-main']), s = buildStage(v, { preset: 'end' });
  const edge = v.outline.polygon(-1.5, 2);
  for (const b of buildFloor(v, s, [{ depth: 1, blocks: ['A', 'B'] }]))
    for (const [x, z] of spots(b)) assert.ok(inPoly(x, z, edge));
});
```

- [ ] **Step 2: Run to verify failure.** `npm test` fails on the new tests.
- [ ] **Step 3: Implement `floor.js`.**
- [ ] **Step 4: Run to verify.** `npm test` passes.
- [ ] **Step 5: Commit** as `feat: floor bands and blocks`.

### Task 6: Zones, row bands, category rules

**Files:**
- Create: `src/engine/categories.js`
- Test: `tests/categories.test.js`

**Interfaces:**
- Consumes: `buildVenue`, `buildStage`, `sectorsOf`.
- Produces:
  - `zoneOf(venue, stage, tier, u0, u1) -> { zone, side }`
  - `tierBands(tier, rules) -> [[r0, r1], ...]`, 0-based and half-open, covering every row once
  - `pickCategory(rules, { tier, zone, side, r0, r1 }) -> catId | null`

`zoneOf`: let `p = ring((u0 + u1) / 2, tier.d0)` and `rel = (p.z - frontZ) / (halfZ - frontZ)`. In order: `rel < -0.03` is `behind`; `rel < 0.12` is `beside`; `|p.x| < 0.6 * halfX` and `p.z > 0` is `end`; `p.z > 0.85 * halfZ` is `cornerFar`; `rel < 0.45` is `sideNear`; `rel < 0.75` is `sideMid`; otherwise `sideFar`. `side` is `L` when `p.x < 0`, else `R`.

A rule is `{ tier?, zone?, side?, rows?: [from, to], cat }` with 1-based inclusive rows. `tierBands` cuts a tier at every `rows` boundary named by a rule for that tier. `pickCategory` returns the first rule whose named fields all match; a rule with `rows` matches a band only when the band lies inside it; a rule without `zone` never matches `behind`.

- [ ] **Step 1: Write the failing tests**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildVenue } from '../src/engine/venue.js';
import { buildStage } from '../src/engine/stage.js';
import { zoneOf, tierBands, pickCategory } from '../src/engine/categories.js';
import { VENUES } from '../src/data/venues/index.js';
const v = buildVenue(VENUES.jis), s = buildStage(v, { preset: 'end' }), L = v.outline.L, t = v.tiers[0];
const at = (u) => zoneOf(v, s, t, u - 2, u + 2);

test('zones follow the stage', () => {
  assert.equal(at(0.01 + 2).zone, 'end');
  assert.equal(at(L / 2).zone, 'behind');
  assert.deepEqual(at(L / 4), { zone: 'sideNear', side: 'R' });
  assert.equal(at(3 * L / 4).side, 'L');
});
test('row rules cut a tier into bands', () => {
  const u = v.tiers[2];
  assert.deepEqual(tierBands(u, [{ tier: 'U', rows: [1, 12], cat: 'A' }, { tier: 'U', cat: 'B' }]), [[0, 12], [12, 34]]);
  assert.deepEqual(tierBands(u, [{ tier: 'U', cat: 'B' }]), [[0, 34]]);
});
test('first matching rule wins; behind is closed unless named', () => {
  const rules = [{ tier: 'L', zone: 'beside', cat: 'C6' }, { tier: 'L', cat: 'C2' }, { zone: 'behind', tier: 'U', cat: 'C9' }];
  assert.equal(pickCategory(rules, { tier: 'L', zone: 'beside', side: 'L', r0: 0, r1: 26 }), 'C6');
  assert.equal(pickCategory(rules, { tier: 'L', zone: 'end', side: 'L', r0: 0, r1: 26 }), 'C2');
  assert.equal(pickCategory(rules, { tier: 'L', zone: 'behind', side: 'L', r0: 0, r1: 26 }), null);
  assert.equal(pickCategory(rules, { tier: 'U', zone: 'behind', side: 'R', r0: 0, r1: 34 }), 'C9');
  assert.equal(pickCategory([{ tier: 'U', rows: [1, 12], cat: 'A' }], { tier: 'U', zone: 'end', side: 'L', r0: 12, r1: 34 }), null);
});
```

- [ ] **Step 2: Run to verify failure.** `npm test` fails on the new tests.
- [ ] **Step 3: Implement `categories.js`.**
- [ ] **Step 4: Run to verify.** `npm test` passes.
- [ ] **Step 5: Commit** as `feat: zones, row bands and category rules`.

### Task 7: Model, default seat, verdict

**Files:**
- Create: `src/engine/model.js`, `src/engine/verdict.js`
- Test: `tests/model.test.js`

**Interfaces:**
- Consumes: everything from Tasks 2–6.
- Produces, `model.js`:
  - `buildModel(concert, venueDef) -> { venue, stage, cats, catOrder, sections, byId, stats: { total, byCat }, defaultSeat }`.
  - Stand section: `{ id, kind: 'stand', tier, sector, band, u0, u1, r0, r1, zone, side, cat, rows, rowsU }`. Id is `L-07`, or `L-07.1` (front band is 1) when the tier is banded.
  - Floor section: a block from `buildFloor`.
  - `cats` holds the concert's categories plus `CLOSED: { id: 'CLOSED', name: { id: 'Ditutup', en: 'Closed' }, price: null, color: '#24272e' }`. A stand section with no matching rule gets `cat: 'CLOSED'`. `concert.sim.sections` overrides by id.
  - Sections with no seats are left out. `stats` counts seats outside `CLOSED`.
  - `defaultSeat`: the middle seat of the middle row of the lowest tier's open section whose centre is nearest the point `(0, +halfZ)` (measured in metres, not in `u`; the lower sector number wins a tie); otherwise the first section that is not closed.
  - `resolveSeat(model, s, r, n) -> { sec, row, seat }`: `r` and `n` are 1-based as written in the address; the result is 0-based. An unknown or closed section gives `defaultSeat`. Row and seat are clamped; anything that is not a number becomes the middle.
- Produces, `verdict.js`: `verdictKeys(facts, section, row) -> string[]` where `facts = { dStage, mainVis, off, blockedByTower }`. Distance, first match: `v.close` under 22 m, `v.clear` under 55, `v.small` under 100, else `v.far`. Then `v.screenHidden` when `mainVis === 0`, else `v.screenPart` when under 0.75, else `v.screenAngle` when `off > 55`. Then `v.pit` for a standing floor section with `row < 3`, and `v.tower` when `blockedByTower`.

- [ ] **Step 1: Write the failing tests**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildModel, resolveSeat } from '../src/engine/model.js';
import { verdictKeys } from '../src/engine/verdict.js';
import { VENUES } from '../src/data/venues/index.js';

const concert = { id: 'fixture', artist: 'X', tour: 'Y', dates: ['2027-01-01'], venue: 'jis', sim: {
  accuracy: 'estimated', stage: { preset: 'end', runway: 'straight' },
  categories: [{ id: 'VIP', name: 'VIP', price: 3000000, kind: 'standing', color: '#e5484d' },
               { id: 'C1', name: 'CAT 1', price: null, kind: 'seat', color: '#0090ff' },
               { id: 'C2', name: 'CAT 2', price: 1000000, kind: 'seat', color: '#46a758' }],
  floor: [{ depth: 1, blocks: ['VIP', 'VIP'], standing: true }],
  stands: [{ tier: 'U', rows: [1, 10], cat: 'C1' }, { tier: 'U', cat: 'C2' }, { cat: 'C1' }],
  sections: { 'L-01': 'C2' } } };
const m = buildModel(concert, VENUES.jis);

test('every section has a category, ids are stable, bands are numbered', () => {
  assert.ok(m.byId['L-01'] && m.byId['U-01.1'] && m.byId['U-01.2'] && m.byId['F1-A']);
  assert.equal(m.byId['L-01'].cat, 'C2');                       // explicit override
  assert.equal(m.byId['U-01.1'].cat, 'C1'); assert.equal(m.byId['U-01.2'].cat, 'C2');
  assert.ok(m.sections.every((s) => m.cats[s.cat]));
  assert.ok(m.sections.some((s) => s.cat === 'CLOSED' && s.zone === 'behind'));
  assert.ok(m.sections.every((s) => s.rows.length > 0));
});
test('stats add up and leave out closed seats', () => {
  const sum = Object.values(m.stats.byCat).reduce((a, b) => a + b, 0);
  assert.equal(sum, m.stats.total); assert.equal(m.stats.byCat.CLOSED, undefined);
});
test('seat values from the address are clamped or replaced by the default', () => {
  assert.deepEqual(resolveSeat(m, 'ZZ', 999, -3), m.defaultSeat);
  assert.deepEqual(resolveSeat(m, undefined, undefined, undefined), m.defaultSeat);
  const closed = m.sections.find((s) => s.cat === 'CLOSED');
  assert.deepEqual(resolveSeat(m, closed.id, 1, 1), m.defaultSeat);
  const r = resolveSeat(m, 'L-05', 999, 'abc'), sec = m.byId['L-05'];
  assert.equal(r.sec, sec); assert.equal(r.row, sec.rows.length - 1);
  assert.equal(r.seat, Math.floor(sec.rows[r.row].length / 3 / 2));
  assert.equal(m.defaultSeat.sec.zone, 'end'); assert.equal(m.defaultSeat.sec.tier.id, 'L');
});
test('verdict keys', () => {
  const f = (o) => ({ dStage: 60, mainVis: 1, off: 10, blockedByTower: false, ...o });
  assert.deepEqual(verdictKeys(f({ dStage: 10 }), { kind: 'stand' }, 5), ['v.close']);
  assert.deepEqual(verdictKeys(f({ mainVis: 0 }), { kind: 'stand' }, 5), ['v.small', 'v.screenHidden']);
  assert.deepEqual(verdictKeys(f({ dStage: 120, off: 70 }), { kind: 'stand' }, 5), ['v.far', 'v.screenAngle']);
  assert.deepEqual(verdictKeys(f({ dStage: 8, blockedByTower: true }), { kind: 'floor', standing: true }, 1), ['v.close', 'v.pit', 'v.tower']);
});
```

- [ ] **Step 2: Run to verify failure.** `npm test` fails on the new tests.
- [ ] **Step 3: Implement both modules.**
- [ ] **Step 4: Run to verify.** `npm test` passes.
- [ ] **Step 5: Commit** as `feat: build a concert model, resolve seats, verdict keys`.

### Task 8: Validate, pack, unpack

**Files:**
- Create: `src/engine/config.js`
- Test: `tests/config.test.js`

**Interfaces:**
- Produces:
  - `validate(concert, venues) -> string[]`, empty when the entry is sound, one string per problem. It reports: missing `id`, `artist` or `dates`; a date that is not a real `YYYY-MM-DD`; a `venue` not in `venues` (`venue` may be absent when `venueName` is a string or `null`; checks that need the venue are skipped when it is missing); and, for an engine simulation, a stage preset other than `end`, duplicate category ids, a colour that is not `#rrggbb`, a price that is neither `null` nor a non-negative integer, a rule, floor block or override naming a category that does not exist, a rule naming a tier the venue lacks, and a floor band whose `depth` is not above 0.
  - `pack(concert) -> string`: base64url of the UTF-8 JSON of `{ v: 1, a: artist, t: tour, d: dates, ve: venue, s: sim }`.
  - `unpack(text, venues) -> { ok: true, concert } | { ok: false, error }`. The concert comes back with `id: 'custom'` and `custom: true`. It refuses text longer than 20000 characters, anything that is not base64url JSON, `v` other than 1, a `sim` with `external`, more than 24 categories, and anything `validate` reports. `artist` and `tour` are cut to 80 characters and category names to 40.

- [ ] **Step 1: Write the failing tests**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate, pack, unpack } from '../src/engine/config.js';
import { VENUES } from '../src/data/venues/index.js';
const base = () => ({ id: 'x', artist: 'A', tour: 'T', dates: ['2027-01-23'], venue: 'jis', sim: {
  accuracy: 'estimated', stage: { preset: 'end' },
  categories: [{ id: 'C1', name: 'CAT 1', price: null, kind: 'seat', color: '#0090ff' }],
  floor: [{ depth: 1, blocks: ['C1'] }], stands: [{ cat: 'C1' }] } });
const bad = (edit) => { const c = base(); edit(c); return validate(c, VENUES); };

test('a sound entry has no problems', () => assert.deepEqual(validate(base(), VENUES), []));
test('each kind of mistake is reported', () => {
  assert.equal(bad((c) => { c.venue = 'nowhere'; }).length, 1);
  assert.equal(bad((c) => { c.dates = ['2027-02-30']; }).length, 1);
  assert.equal(bad((c) => { c.sim.stands.push({ cat: 'C9' }); }).length, 1);
  assert.equal(bad((c) => { c.sim.stands.push({ tier: 'Z', cat: 'C1' }); }).length, 1);
  assert.equal(bad((c) => { c.sim.categories[0].color = 'red'; }).length, 1);
  assert.equal(bad((c) => { c.sim.categories[0].price = 12.5; }).length, 1);
  assert.equal(bad((c) => { c.sim.categories.push({ ...c.sim.categories[0] }); }).length, 1);
  assert.equal(bad((c) => { c.sim.floor[0].depth = 0; }).length, 1);
  assert.equal(bad((c) => { c.sim.stage.preset = 'centre'; }).length, 1);
});
test('pack then unpack returns the same settings', () => {
  const c = base(), r = unpack(pack(c), VENUES);
  assert.equal(r.ok, true); assert.deepEqual(r.concert.sim, c.sim);
  assert.equal(r.concert.custom, true); assert.equal(r.concert.id, 'custom');
  assert.match(pack(c), /^[A-Za-z0-9_-]+$/);
});
test('damaged, oversized or unsafe text is refused; long names are cut', () => {
  assert.equal(unpack('!!!', VENUES).ok, false);
  assert.equal(unpack('A'.repeat(20001), VENUES).ok, false);
  const ext = base(); ext.sim = { external: 'https://example.com' };
  assert.equal(unpack(pack(ext), VENUES).ok, false);
  const long = base(); long.artist = '<img src=x onerror=alert(1)>'.repeat(10);
  const r = unpack(pack(long), VENUES);
  assert.equal(r.ok, true); assert.equal(r.concert.artist.length, 80);
});
```

- [ ] **Step 2: Run to verify failure.** `npm test` fails on the new tests.
- [ ] **Step 3: Implement `config.js`.** Use `TextEncoder`, `btoa` and `atob`, which exist in both Node 22 and browsers.
- [ ] **Step 4: Run to verify.** `npm test` passes.
- [ ] **Step 5: Commit** as `feat: validate concert settings and pack them into links`.

### Task 9: Calendar and language

**Files:**
- Create: `src/engine/calendar.js`, `src/i18n.js`
- Test: `tests/calendar.test.js`, `tests/i18n.test.js`

**Interfaces:**
- Produces, `calendar.js`: `jakartaToday(now = new Date()) -> 'YYYY-MM-DD'` (UTC+7), `nextDate(show, today)`, `upcoming(shows, today)` (last date on or after today, sorted by `nextDate`), `dday(date, today) -> number`, `groupByMonth(shows, today) -> [{ month: 'YYYY-MM', shows }]`.
- Produces, `i18n.js`: `STRINGS = { id: {...}, en: {...} }`, `pickLang(query, stored) -> 'id' | 'en'`, `getLang()`, `setLang(lang)` (saves under `jk.lang`, sets `<html lang>`, fires `langchange` on `document`), `t(key, vars)`, `tx(value)` for `{ id, en }` or a plain string, `fmtRp(n)`, `fmtPrice(n)`, `fmtDates(dates)`. It must import in Node, so browser globals are touched only inside functions and guarded.

Fixed copy:

| Key | Indonesian | English |
| --- | --- | --- |
| `badge.3d` | 3D siap | 3D ready |
| `badge.list` | Hanya jadwal | Listing only |
| `badge.novenue` | Venue belum diumumkan | Venue not announced |
| `acc.official` | Sesuai seat plan resmi | Follows the official seat plan |
| `acc.estimated` | Estimasi | Estimate |
| `price.none` | Harga belum diumumkan | Price not announced |
| `err.link` | Tautan rusak | Broken link |
| `err.notfound` | Konser tidak ditemukan | Concert not found |
| `err.data` | Data konser ini bermasalah | This concert's data has a problem |
| `fan.made` | Buatan penggemar · tidak resmi | Fan-made · unofficial |
| `hub.empty` | Belum ada konser yang diumumkan. Cek lagi nanti. | No shows announced yet. Check back soon. |

Write the remaining strings (dock, panel, seat facts, verdict keys `v.*`, hub filters, fine print) in the same plain register. Dates read "Sab 23 Jan 2027" and "Sat 23 Jan 2027"; several dates in one month read "26 · 27 · 29 Des 2026".

- [ ] **Step 1: Write the failing tests**

```js
// tests/calendar.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jakartaToday, upcoming, nextDate, dday, groupByMonth } from '../src/engine/calendar.js';
const bts = { id: 'bts', dates: ['2026-12-26', '2026-12-27', '2026-12-29'] };
const mit = { id: 'mit', dates: ['2026-11-12'] };

test('the day changes at midnight in Jakarta', () => {
  assert.equal(jakartaToday(new Date('2026-12-28T16:59:00Z')), '2026-12-28');
  assert.equal(jakartaToday(new Date('2026-12-28T17:30:00Z')), '2026-12-29');
});
test('a partly finished run is still upcoming and counts down to its next date', () => {
  assert.deepEqual(upcoming([bts, mit], '2026-12-28').map((s) => s.id), ['bts']);
  assert.equal(nextDate(bts, '2026-12-28'), '2026-12-29');
  assert.equal(dday('2026-12-29', '2026-12-28'), 1);
});
test('a show stays on its last day and goes the day after', () => {
  assert.equal(upcoming([bts], '2026-12-29').length, 1);
  assert.equal(upcoming([bts], '2026-12-30').length, 0);
});
test('shows are sorted and grouped by the month of their next date', () => {
  const g = groupByMonth([bts, mit], '2026-11-11');
  assert.deepEqual(g.map((x) => x.month), ['2026-11', '2026-12']);
});
```

```js
// tests/i18n.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STRINGS, pickLang, t, setLang, fmtRp, fmtPrice } from '../src/i18n.js';

test('both languages have exactly the same keys', () => {
  assert.deepEqual(Object.keys(STRINGS.id).sort(), Object.keys(STRINGS.en).sort());
});
test('language choice: address, then saved choice, then Indonesian', () => {
  assert.equal(pickLang('en', 'id'), 'en'); assert.equal(pickLang(null, 'en'), 'en');
  assert.equal(pickLang('xx', null), 'id'); assert.equal(pickLang(null, null), 'id');
});
test('prices', () => {
  setLang('id');
  assert.equal(fmtRp(3650000), 'Rp3.650.000');
  assert.equal(fmtPrice(null), 'Harga belum diumumkan');
  assert.equal(fmtPrice(undefined), 'Harga belum diumumkan');
  setLang('en'); assert.equal(fmtPrice(null), 'Price not announced');
  assert.equal(t('no.such.key'), 'no.such.key');
});
```

- [ ] **Step 2: Run to verify failure.** `npm test` fails on the new tests.
- [ ] **Step 3: Implement both modules.**
- [ ] **Step 4: Run to verify.** `npm test` passes.
- [ ] **Step 5: Commit** as `feat: calendar helpers and two-language strings`.

### Task 10: Concert data

**Files:**
- Create: `src/data/concerts.js`
- Test: `tests/concerts.test.js`

**Interfaces:**
- Consumes: `VENUES`, `validate`, `buildModel`.
- Produces: `CONCERTS` (array, shape in the spec's "Concert entry" section, plus `genre: 'kpop' | 'international' | 'indonesia' | 'festival'`), `DATA_CHECKED = '2026-11-11'`, `PALETTE`.

Calendar entries: one per row of the research file, except that the two 5 Seconds of Summer rows are one entry with two dates. That is 33 entries. Ids read `<artist>-<venue>-<year of the first date>`. Other tasks rely on `bts-gbk-2026`, `bigbang-jis-2027`, `txt-jakarta-2027` and the twelve ids in the table below. A venue that is not modelled uses `venueName`. TXT and Lomba Sihir use `venueName: null`. BTS uses `sim: { external: 'https://jn1xia.github.io/bts/' }` and BIGBANG `sim: { external: 'https://jn1xia.github.io/bigbang/' }`.

`PALETTE = ['#e5484d', '#f76b15', '#ffc53d', '#46a758', '#12a594', '#0090ff', '#8e4ec6', '#d6409f', '#978365', '#6e56cf']`, given to categories from the most expensive down.

The twelve simulations:

| id | venue | stage | lights | floor | performers |
| --- | --- | --- | --- | --- | --- |
| `mcr-jis-2026` | `jis` | end | phone | standing | 5 |
| `enhypen-jis-2027` | `jis` | end, straight runway, B-stage | stick `#ffe9b8` | standing | 7 |
| `maroon5-jis-2027` | `jis` | end | phone | standing | 6 |
| `westlife-gbk-2027` | `gbk-main` | end | phone | seated | 4 |
| `5sos-indonesia-arena-2026` | `indonesia-arena` | end | phone | standing | 4 |
| `boyz2men-dewa19-indonesia-arena-2026` | `indonesia-arena` | end | phone | seated | 4 |
| `thescript-indonesia-arena-2027` | `indonesia-arena` | end | phone | standing | 3 |
| `boynextdoor-ice-2026` | `ice-bsd-5-6` | end, straight runway, B-stage | stick `#ffe9b8` | standing | 6 |
| `nctwish-ice-2027` | `ice-bsd-5` | end, straight runway, B-stage | stick `#c7f000` | standing | 6 |
| `do-istora-2026` | `istora` | end, straight runway | stick `#fff8e7` | seated | 1 |
| `nancyajram-istora-2027` | `istora` | end | phone | seated | 1 |
| `gnr-madya-2026` | `madya` | end | phone | standing | 7 |

`theme.lights: 'phone'` means white phone lights on about a third of the crowd; `'stick'` means a lightstick for everyone in `theme.stick`.

Categories with data in hand:

- **ENHYPEN:** VIP A and VIP B (standing) Rp3.650.000, CAT 1 Rp3.450.000, CAT 2 Rp3.250.000, CAT 3 Rp2.950.000, CAT 4 Rp2.750.000, CAT 5 Rp2.250.000, CAT 6 Rp1.850.000, CAT 7 Rp1.450.000. Floor: one band, blocks `VIPA`, `VIPB`. Stands, in order: `L` beside → CAT 6; `M` beside → CAT 6; `U` beside → CAT 7; `L` sideNear and sideMid → CAT 1; `L` → CAT 2; `M` → CAT 3; `U` sideNear and sideMid → CAT 5; `U` → CAT 4. CAT 6 and CAT 7 have `ab: true`.
- **Guns N' Roses** (general-sale prices): VIP Rp7.500.000, Festival A Rp3.750.000, Festival B Rp2.750.000, Festival C Rp1.750.000, Tribune A Rp4.250.000, Tribune B Rp2.250.000. Floor bands, all standing, depths 0.18, 0.30, 0.26, 0.26: VIP, Festival A, B, C. Stands: tier `A` → Tribune A, tier `B` → Tribune B.
- **Westlife:** VIP Rp2.750.000 and CAT 6 Rp850.000 are firm. CAT 1 to CAT 5 get a price only if Step 1 finds two outlets that agree; otherwise `null`. Floor, seated: band 0.3 `VIP`, band 0.7 `CAT1`, `CAT1`. Stands: `L` sideNear and sideMid → CAT 2; `L` → CAT 3; `U` rows 15–26 → CAT 6; `U` sideNear and sideMid → CAT 4; `U` → CAT 5.

A category with `ab: true` is shown with " A" on the left side and " B" on the right. A rule's `rows` range is clamped to the tier's rows. If the test in Step 2 finds a category with no seats, move its rule to the nearest zone that exists in that venue.

**Fallback** for a concert whose category names are still unknown after Step 1: one floor category `FLOOR` named `{ id: 'Lantai', en: 'Floor' }`, and one category per tier, id `T-<tier id>`, named after the tier, all with `price: null`. One floor band, one block. Stands: one rule per tier.

- [ ] **Step 1: Search once per simulation for its categories.** For the nine concerts without a full list, run one web search for the official category names and prices. Use a name or price only when the result states it for this show; add the URL to `sources`. Otherwise use the fallback.
- [ ] **Step 2: Write the failing tests**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONCERTS } from '../src/data/concerts.js';
import { VENUES } from '../src/data/venues/index.js';
import { validate } from '../src/engine/config.js';
import { buildModel } from '../src/engine/model.js';
const engine = CONCERTS.filter((c) => c.sim && !c.sim.external);

test('33 entries with unique ids, real dates and at least one source', () => {
  assert.equal(CONCERTS.length, 33);
  assert.equal(new Set(CONCERTS.map((c) => c.id)).size, 33);
  for (const c of CONCERTS) {
    assert.deepEqual(validate(c, VENUES), [], c.id);
    assert.ok(c.sources.length >= 1, c.id);
    assert.ok(c.venue ? VENUES[c.venue] : c.venueName === null || typeof c.venueName === 'string', c.id);
  }
});
test('twelve engine simulations and two external ones', () => {
  assert.equal(engine.length, 12);
  assert.deepEqual(CONCERTS.filter((c) => c.sim && c.sim.external).map((c) => c.id).sort(), ['bigbang-jis-2027', 'bts-gbk-2026']);
  assert.ok(engine.every((c) => c.sim.accuracy === 'estimated'));
});
for (const c of engine) {
  test(`${c.id}: the model is complete`, () => {
    const m = buildModel(c, VENUES[c.venue]);
    assert.ok(m.stats.total > 1000, `${m.stats.total} places`);
    for (const s of m.sections) if (s.kind === 'stand' && s.zone !== 'behind') assert.notEqual(s.cat, 'CLOSED', s.id);
    for (const id of m.catOrder) assert.ok(m.stats.byCat[id] > 0, `${id} has no seats`);
  });
}
```

- [ ] **Step 3: Run to verify failure.** `npm test` fails on the new tests.
- [ ] **Step 4: Write `concerts.js`.**
- [ ] **Step 5: Run to verify.** `npm test` passes.
- [ ] **Step 6: Commit** as `feat: concert calendar and twelve simulation settings`.

### Task 11: Hub page and the browser-test harness

**Files:**
- Create: `index.html`, `src/hub.js`, `assets/site.css`, `tests/e2e/smoke.cjs`

**Interfaces:**
- Consumes: `CONCERTS`, `DATA_CHECKED`, `VENUES`, calendar and i18n functions.
- Produces: the hub. Each card is an `<article class="card" data-id="...">`; a card with a simulation wraps its title in a link to `sim.html?c=<id>` or to the external address (`target="_blank" rel="noopener"`). The badge is `.badge` with `data-kind="3d" | "list" | "novenue"`. Controls: `#f3d` (3D-only checkbox), `#fvenue` (select), `#lang` (button showing the other language's code). `#empty` holds `hub.empty` and is shown when no card is. With `?debug`, `&today=YYYY-MM-DD` replaces today's date.
- Produces: `tests/e2e/smoke.cjs`, a script that serves the repository root from a Node `http` server on a free port, launches Chromium with `--use-gl=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`, runs named checks, prints one line per check and exits non-zero if any fail. It loads the data with dynamic `import()` so expected counts come from the data. It records `console.error` and `pageerror` per page, ignoring failed requests to other hosts.

Page head: `<title>Jakarta Konser · Simulasi View Kursi 3D</title>`, a description, `og:title` and `og:description`, and the fonts link from the BTS site.

- [ ] **Step 1: Write the hub checks in `smoke.cjs`**

With `index.html?debug&today=2026-11-11`:
- the number of `.card` elements equals `upcoming(CONCERTS, '2026-11-11').length`;
- the BTS card links to `https://jn1xia.github.io/bts/`;
- `.badge[data-kind="3d"]` reads "3D siap"; after clicking `#lang` it reads "3D ready" and `<html lang>` is `en`;
- ticking `#f3d` leaves exactly the cards whose concert has a `sim`;
- choosing `jis` in `#fvenue` leaves exactly the JIS shows;
- no card text contains "Rp0" or "NaN".

With `&today=2026-12-28`: the BTS card is present and shows a one-day countdown.
With `&today=2028-01-01`: there are no cards and `#empty` is visible.
No page errors on any of the three.

- [ ] **Step 2: Run to verify failure.** `npm run e2e` fails on the first check.
- [ ] **Step 3: Implement `index.html`, `hub.js` and `site.css`.** Layout: header with the site name, a one-line pitch, the language button; filters; month headings; a responsive card grid (one column under 640 px). Footer: the fine print from the spec, "data last checked" with `DATA_CHECKED`, and a link to the research file on GitHub.
- [ ] **Step 4: Run to verify.** `npm run e2e` and `npm test` pass. Take a screenshot at 1280 × 800 and at 390 × 844 and look at both.
- [ ] **Step 5: Commit** as `feat: hub calendar page and browser-test harness`.

### Task 12: Simulator scene and boot

**Files:**
- Create: `sim.html`, `src/sim/main.js`, `src/sim/scene.js`
- Modify: `assets/site.css`, `tests/e2e/smoke.cjs`

**Interfaces:**
- Consumes: `CONCERTS`, `VENUES`, `buildModel`, i18n.
- Produces, `scene.js`: `createScene(canvas, model) -> ctx` with `ctx = { renderer, scene, camera, obstacles, floorObs, sectionMeshes, setLights(mode), resize(), render() }`. It draws the sky, ground, floor, one mesh per stand section tinted by its category colour (`mesh.userData.sec` is the section), floor block tints, and the roof by `venue.def.roof.type`: `ring`, `closed`, `hall` (a flat ceiling at `ceilingY` and walls) or `none`.
- Produces, `main.js`: reads `?c=`, builds the model, creates the scene, runs the frame loop, hides `#loading`. With `?debug` it sets `window.__jk = { ready: true, model, ctx, state, pixelStats() }`, where `pixelStats()` renders one frame, reads a 64 × 64 grid of pixels with `gl.readPixels` and returns `{ distinct }`, the number of different colours.
- `sim.html` markup follows `bts/index.html` 174–283 without the song, weather and moment controls. It adds `#back` (link to the hub), `#lang`, `#accuracy`, `#fallback`, `#loading` and `#message`. It loads `vendor/three.min.js` with a plain script tag, then `src/sim/main.js` as a module.

- [ ] **Step 1: Add the simulator checks to `smoke.cjs`.** For each engine concert, open `sim.html?c=<id>&debug`, wait for `window.__jk && window.__jk.ready`, and require `pixelStats().distinct > 50` and no page errors.
- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement.** In this task the camera sits at a fixed overview pose (`yaw 0.62, pitch 0.82`, distance `3.2 × halfZ + 150`, looking at the floor centre). Phones (`innerWidth <= 760`) get a pixel ratio capped at 1.6.
- [ ] **Step 4: Run to verify.** All twelve pass. Screenshot one stadium and one hall and look at both.
- [ ] **Step 5: Commit** as `feat: simulator page with venue scene`.

### Task 13: Stage, screens, towers, performers

**Files:**
- Create: `src/sim/stage-mesh.js`
- Modify: `src/sim/main.js`, `tests/e2e/smoke.cjs`

**Interfaces:**
- Consumes: `ctx`, `model.stage`, the concert.
- Produces: `addStage(ctx, model, concert) -> { update(t), setLights(mode) }`. It builds the deck from `stage.footprint` at `deckY`, a back wall, a roof truss over the main stage, the screens (a canvas texture: dark gradient, the artist in large type, the tour under it, drawn with `fillText`), the sound desk and the towers. The screens, back wall, truss, desk and towers go into `ctx.obstacles`; the desk and towers also into `ctx.floorObs`. Show mode adds moving beams from the truss in `theme.accent`; House mode hides them and dims the screens. `sim.performers` stand-in figures stand spread along the stage front (and one on the B-stage when there is one) in an idle pose.

- [ ] **Step 1: Add a check.** For `enhypen-jis-2027`, `__jk.ctx.obstacles.length` is larger than the number of stand sections, and `pixelStats().distinct` stays above 50 after `__jk.ctx.setLights('house')`.
- [ ] **Step 2: Run to verify failure.** `npm run e2e` fails on the new checks.
- [ ] **Step 3: Implement the module and wire it into `main.js`.**
- [ ] **Step 4: Run to verify.** `npm test` and `npm run e2e` pass. Screenshot the stage from the overview in Show and House modes and look at both.
- [ ] **Step 5: Commit** as `feat: stage, screens, sound desk, towers and performers`.

### Task 14: Camera, seat state and the address

**Files:**
- Create: `src/sim/camera.js`
- Modify: `src/sim/main.js`, `tests/e2e/smoke.cjs`

**Interfaces:**
- Consumes: `ctx`, `model`, `resolveSeat`.
- Produces: `createCamera(ctx, model, state) -> { eyePos, seatPos, setSeat(sec, row, seat), setMode(mode, fly), setZoom(z), setPosture(p), apply(now), pick(clientX, clientY) -> section | null, bind(canvas, { onPick, onChange }) }`.
- `state = { sec, row, seat, mode: 'pov' | 'overview', lights: 'show' | 'house', posture: 'sit' | 'stand', zoom: 1 | 2 | 4 }`. `main.js` gains `selectSeat(sec, row, seat)` (also added to `window.__jk`), which updates the state, the camera and the address (`history.replaceState`, keeping `c`, `lang` and `debug`, writing `s`, and 1-based `r` and `n`).
- Eye height is 1.18 m seated and 1.62 m standing; a standing floor block always stands. In My seat view the camera first looks at a point above the stage front: `y = deckY + 2 + 7 * clamp((d - 15) / 60, 0, 1)` with `d` the distance to the stage. Drag looks around, scroll and pinch zoom, arrow keys turn, and in Stadium view drag orbits and a click on a section sits there. Flights are skipped under `prefers-reduced-motion`.

- [ ] **Step 1: Add checks.** Opening `sim.html?c=enhypen-jis-2027&debug` puts `__jk.state.sec` at `model.defaultSeat.sec`. Opening it with `&s=ZZ&r=999&n=-3` does the same with no page error. Calling `__jk.selectSeat(__jk.model.byId['U-03'], 3, 5)` makes the address contain `s=U-03`, `r=4` and `n=6`, and reloading that address restores the same section, row and seat.
- [ ] **Step 2: Run to verify failure.** `npm run e2e` fails on the new checks.
- [ ] **Step 3: Implement the module and wire it into `main.js`.**
- [ ] **Step 4: Run to verify.** `npm test` and `npm run e2e` pass.
- [ ] **Step 5: Commit** as `feat: seat camera, overview orbit and shareable seat address`.

### Task 15: Crowd

**Files:**
- Create: `src/sim/crowd.js`
- Modify: `src/sim/main.js`, `tests/e2e/smoke.cjs`

**Interfaces:**
- Consumes: `ctx`, `model`, `theme`, `rng`.
- Produces: `addCrowd(ctx, model, theme) -> { count, update(t), setPosture(p), setLights(mode), setSeat(seatPos) }`, added to `window.__jk` as `crowd`. One light per place outside `CLOSED` (standing blocks are filled on a 0.7 m jittered grid), drawn as additive points with the pose shader from the reference. `theme.lights === 'phone'` lights only places whose random phase is under 0.35 and uses white. Jointed figures surround the seat at two levels of detail, with the reference's radii and caps, fewer on phones. The fan in the chosen seat is not drawn. House lights lower the arms and dim the glow.

- [ ] **Step 1: Add a check.** For `gnr-madya-2026`, `__jk.crowd.count` is above 5000 and at least the number of seated places outside `CLOSED`; `pixelStats().distinct > 50` in My seat view.
- [ ] **Step 2: Run to verify failure.** `npm run e2e` fails on the new checks.
- [ ] **Step 3: Implement the module and wire it into `main.js`.**
- [ ] **Step 4: Run to verify.** `npm test` and `npm run e2e` pass. Screenshot a seat view in a stick show and in a phone-light show and look at both.
- [ ] **Step 5: Commit** as `feat: crowd lights and jointed fans near the seat`.

### Task 16: Seat facts, panel, map, dock, language

**Files:**
- Create: `src/sim/facts.js`, `src/sim/panel.js`
- Modify: `sim.html`, `src/sim/main.js`, `assets/site.css`, `tests/e2e/smoke.cjs`

**Interfaces:**
- Consumes: `ctx`, `model`, the camera, `verdictKeys`, i18n.
- Produces, `facts.js`: `computeFacts(ctx, model, eyePos) -> { dStage, dScreen, height, off, mainVis, tvIn, perfMM, blockedByTower }`. `dStage` is `hypot(stage.dist(x, z), eye height above the deck)`. `mainVis` is the 6 × 4 raycast from the reference against `ctx.obstacles`. `tvIn` and `perfMM` use the reference's formulas. `blockedByTower` raycasts from the eye to the stage front centre against `ctx.floorObs`.
- Produces, `panel.js`: `createPanel(model, concert, { onSeat, onMode, onZoom, onLights, onPosture }) -> { update(state, facts), relabel() }`. It fills the brand header (artist, tour, venue, dates, countdown), the accuracy badge, the category chip and price, the section title, the verdict, the seat facts, the 2D map (an SVG drawn to scale from section outlines, floor blocks and the stage footprint; click to sit), the section select grouped by category, the row and seat sliders, the legend with seat counts, and the fine print (the unofficial notice, which of this venue's figures are estimates, from `def.estimated`, and the concert's sources). Section titles: a stand section reads tier name, "Sektor"/"Sector" and number, with "depan"/"front" or "belakang"/"back" when banded; a floor block reads the category name and its letter. On phones the panel is a bottom sheet with a toggle, as on the BTS site. `relabel()` redraws every string after a language change.

- [ ] **Step 1: Add checks.**
  - For `enhypen-jis-2027`: the panel shows "CAT" and a price beginning with "Rp"; choosing another option in the section select changes `__jk.state.sec` and the address; `#accuracy` reads "Estimasi"; after clicking `#lang` it reads "Estimate" and the dock's first button is in English.
  - For a simulation that has a `null` price: the panel and the legend contain "Harga belum diumumkan" and neither "Rp0" nor "NaN".
  - At 390 × 844: the canvas is visible, the sheet toggle collapses and expands the panel, and nothing scrolls sideways.
- [ ] **Step 2: Run to verify failure.** `npm run e2e` fails on the new checks.
- [ ] **Step 3: Implement the module and wire it into `main.js`.**
- [ ] **Step 4: Run to verify.** `npm test` and `npm run e2e` pass. Screenshot desktop and phone and look at both.
- [ ] **Step 5: Commit** as `feat: seat facts, panel, scale map and language switch`.

### Task 17: Packed links and error states

**Files:**
- Modify: `src/sim/main.js`, `sim.html`, `assets/site.css`, `tests/e2e/smoke.cjs`

**Interfaces:**
- Consumes: `unpack`, `pack`, `CONCERTS`.
- Produces: the boot order in `main.js`. A `#k=` fragment is unpacked first; failure shows `err.link` in `#message` with a link to the hub. Otherwise `?c=` is looked up: unknown shows `err.notfound`; an entry for which `validate` reports a problem shows `err.data` and logs the problems to the console; an entry with `sim: null` redirects to `index.html#<id>`; an entry with `external` redirects there. A custom concert shows `fan.made` beside the title and never the official-accuracy badge. Missing WebGL shows `#fallback`. The hub scrolls to and highlights the card named in its fragment.

- [ ] **Step 1: Add checks.**
  - `sim.html?c=nope` shows "Konser tidak ditemukan" and a link to `index.html`.
  - `sim.html#k=@@@` shows "Tautan rusak".
  - A link built in the test with `pack()` from the ENHYPEN entry, its artist replaced by `<img src=x onerror="window.__xss=1">`, opens a simulation whose title's `textContent` contains `<img`, shows "Buatan penggemar", and leaves `window.__xss` undefined.
  - `sim.html?c=5sos-indonesia-arena-2026&debug` still opens (the simulator never checks the date).
  - `sim.html?c=txt-jakarta-2027` lands on `index.html#txt-jakarta-2027`.
- [ ] **Step 2: Run to verify failure.** `npm run e2e` fails on the new checks.
- [ ] **Step 3: Implement the module and wire it into `main.js`.**
- [ ] **Step 4: Run to verify.** `npm test` and `npm run e2e` pass.
- [ ] **Step 5: Commit** as `feat: packed links and error states`.

### Task 18: Counter, deploy, README, full check

**Files:**
- Create: `.github/workflows/pages.yml`, `README.md`
- Modify: `index.html`, `src/hub.js`

**Interfaces:**
- Produces: the visitor line on the hub, from the BTS site's counter code with key `jn1xia.github.io/jakarta-konser-visitors`, flag `jk.counted.v1`, live host `jn1xia.github.io`, hidden on any failure.
- Produces: `pages.yml`, the BTS repository's workflow with the collect step changed to `mkdir _site && cp -r index.html sim.html assets src vendor _site/ && touch _site/.nojekyll`.
- Produces: `README.md` covering what the site is, how to run it locally (`npm run serve`), how to run both test suites, how to add a show (one entry in `concerts.js`; fields; the fallback; how accuracy is labelled), how to add a venue, how to refresh the calendar, the deploy steps (Pages source "GitHub Actions", or "Deploy from a branch" for a preview), the counter notes from the BTS README, and the fine print.

- [ ] **Step 1: Implement the counter, workflow and README.**
- [ ] **Step 2: Run everything.** `npm test` and `npm run e2e` pass with no skipped checks.
- [ ] **Step 3: Look at every simulation.** Open each of the twelve at 1280 × 800 in My seat and Stadium views and at 390 × 844 in My seat view; save screenshots to the scratchpad and check each for a visible stage, coloured sections, crowd lights and a readable panel. Fix what is wrong and re-run Step 2.
- [ ] **Step 4: Check the published file set.** Build `_site` as the workflow does, serve it, and confirm the hub and one simulation load from it with no missing files.
- [ ] **Step 5: Commit** as `feat: visitor counter, Pages deploy and README`, then push the branch.
