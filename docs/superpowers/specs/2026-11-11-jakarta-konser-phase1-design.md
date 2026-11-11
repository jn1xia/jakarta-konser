# Jakarta Konser, phase 1: hub, shared engine, six venues

Date: 11 November 2026. Status: awaiting review.

## Purpose

One site where a fan picks any upcoming Jakarta concert and sees the view from their seat before
they buy or go, the way `jn1xia.github.io/bts` does for one concert.

Phase 1 is done when:

- every announced Jakarta show appears in a calendar on the hub;
- 12 simulations, covering 13 listed shows at six venues, open in a 3D seat view;
- the BTS and BIGBANG cards open the existing hand-built sites;
- the whole site works in Indonesian (default) and English;
- adding a new show at a venue that is already modelled takes one data entry and no engine code;
- a simulation's settings can be packed into a link and opened, ready for the phase 2 builder.

## Decisions already made

| Question | Decision |
| --- | --- |
| How fans customise from a poster | Guided builder. It is phase 2 and has its own spec. |
| Which shows get a 3D view at launch | Big seated venues: GBK Main Stadium, JIS, Stadion Madya, Indonesia Arena, Istora, ICE BSD. |
| BTS and BIGBANG | Link to the existing sites. They are not rebuilt. |
| Language | Indonesian and English with a toggle, Indonesian by default. |
| How it is built | Shared engine in plain JavaScript modules, no build step, hosted free on GitHub Pages. |
| Accuracy | Seat-plan images cannot be opened from the build sandbox. Layouts are estimated from written descriptions and labelled as estimates. Unknown prices are shown as not announced, never invented. |

## Not in phase 1

- The builder page and the 360° centre stage preset. No phase 1 concert uses a centre stage (BTS
  links out), so that preset is built with the builder. The stage interface below leaves room for it.
- 3D views for small halls and festival grounds (Tennis Indoor, Basket Hall, Kasablanka Hall,
  Balai Sarbini, TIM, JIExpo). Those shows are listed in the calendar only.
- The BTS site's extras: show moments, song player, weather, and performers that walk the runways.

## Pages

**Hub, `index.html`.** A calendar of shows grouped by month. Each card shows the dates, artist,
tour, venue, promoter, price range when known, a D-day countdown, and one badge:

- *3D siap* (3D ready): opens the simulator, or the external BTS or BIGBANG site;
- *Hanya jadwal* (listing only): the venue is not modelled;
- *Venue belum diumumkan* (venue not announced).

Two filters: "3D only" and a venue select. A show disappears once its last date has passed in
Jakarta time. The page states when the data was last checked and links to the sources. A language
switch sits in the header. A visitor counter works as on the BTS site and only counts on
`jn1xia.github.io`.

**Simulator, `sim.html?c=<concert id>`.** The same controls as the BTS site:

- views: My seat (first person at eye height) and Stadium (orbit; click a section to sit there);
- zoom: Eyes, 2×, 4×, plus scroll and pinch;
- lights: Show and House;
- crowd: Seated and Standing;
- seat panel: category and price, section, row and seat, a verdict line, seat facts, a 2D map drawn
  to scale, a section list, row and seat sliders, and the category legend.

Seat facts: distance to the nearest stage edge, distance to the main screen, eye height, angle off
the stage's centre line, how much of the main screen a sightline raycast can see, the TV size the
screen looks like, and how tall a performer looks at arm's length.

The chosen seat is kept in the address (`&s=<section>&r=<row>&n=<seat>`), so a fan can share the
exact view. A badge next to the title says whether the layout is *sesuai seat plan resmi* or
*estimasi*. Stand-in performer figures (generic, not likenesses) stand on the stage for scale.

`sim.html#k=<packed settings>` opens a simulation from a link instead of from the site's data. It
is always labelled fan-made and unofficial.

## Structure

```
index.html  sim.html
assets/site.css
vendor/three.min.js           three.js r128, copied from the npm package (MIT)
src/
  i18n.js                     both languages, t(), language choice
  hub.js                      the hub page
  engine/                     pure logic: no DOM, no three.js, tested in Node
    geometry.js               point-in-polygon, distances, clamp
    outline.js                outline pieces -> ring(u,d), lenAt, uAtLen, sampleU
    venue.js                  venue definition -> tiers and sections with seat rows
    stage.js                  stage preset + parameters -> stage layout
    floor.js                  floor bands -> blocks of seats or standing spots
    categories.js             rules -> a category for every section and block
    model.js                  buildModel(concert, venue) -> everything the view needs
    config.js                 validate(concert), pack(concert), unpack(text)
    calendar.js               upcoming(shows, today), D-day, month grouping
  sim/                        the 3D view, built on three.js
    main.js                   read the address, load, build, start
    scene.js                  renderer, bowl, roof, sky, lights
    stage-mesh.js             stage, screens, sound desk and towers from a stage layout
    crowd.js                  lightstick glows and jointed fans near the seat
    camera.js                 seat and overview poses, zoom, pointer and keyboard
    facts.js                  sightline raycast and seat facts
    panel.js                  seat panel, 2D map, dock buttons
  data/
    venues/<id>.js            one file per venue, plus index.js
    concerts.js               every show: calendar fields and, where modelled, sim settings
tests/                        node --test files, one per engine module and for the data
tests/e2e/smoke.spec.js       Playwright
.github/workflows/pages.yml   deploy
.github/workflows/test.yml    unit tests on every push
package.json                  "type": "module", test scripts; no runtime dependencies
README.md
```

three.js is served from the repository instead of a CDN. The CDN is unreachable from the build
sandbox, and a local copy also removes a point of failure for visitors.

Each `engine` module takes plain data and returns plain data, so it can be understood and tested
alone. `sim` modules only draw what `model.js` returns. The geometry, crowd shader and sightline
code are carried over from the `bts` and `bigbang` repositories and generalised.

## Coordinates

Metres. `y` is up. The centre of the field or floor is the origin. For an end stage, the stage is
at the `-z` end. `u` is the distance along the front-row outline and `d` is the offset outwards
from it, as in the existing sites.

## Venue definition

```js
{
  id: 'jis',
  name: 'Jakarta International Stadium', short: 'JIS',
  capacity: 82000,                        // published figure, used by tests
  outline: [ /* closed list of lines and arcs: the front-row edge */ ],
  tiers: [
    { id: 'L', name: { id: 'Bawah', en: 'Lower' },
      d0: 0.8, y0: 1.6, rows: 26, depth: 0.8, rake: 24,
      span: null }                        // or [[u0, u1], ...] when a tier covers part of the outline
  ],
  sectors: 24,                            // sections per tier, or an explicit list of [u0, u1]
  floor: { halfX: 37, halfZ: 56 },        // usable floor rectangle
  roof: { type: 'ring' | 'closed' | 'hall' | 'none', /* sizes */ },
  estimated: ['rows', 'depth']            // which figures are estimates, shown in the fine print
}
```

`span` handles Stadion Madya (a main tribune and an east stand, open ends) and ICE BSD (a flat
hall with a temporary stand at the back).

Roofs are drawn as each venue has them on a concert night: GBK's ring roof over the stands, JIS's
retractable roof closed, and a ceiling for the three indoor venues. There is no roof or weather
switch in phase 1.

Build order follows how many upcoming shows each venue has: JIS, GBK Main Stadium, Indonesia
Arena, ICE BSD, Istora, then Stadion Madya. GBK and JIS reuse the geometry from the existing
sites. The other four are new; their dimensions come from published figures where they exist and
are flagged as estimates where they do not.

## Stage layout

`stage.js` turns a preset and its parameters into a layout:

```js
{
  frontZ,                                 // z of the stage's front edge
  footprint: [ /* polygons */ ],          // stage, runway, B-stage
  deckY,
  screens: [ { c, w, h, n } ],            // main first
  foh: { x0, x1, z0, z1 } | null,
  towers: [ [x, z] ],
  dist(x, z),                             // distance to the nearest stage edge
  blocked(x, z)                           // true inside the stage, runway, sound desk or a tower
}
```

Phase 1 has one preset, `end`, with parameters `width`, `depth`, `runway` (`none`, `straight` or
`T`), `runwayLength`, `bStage`, `sideScreens`, `foh` and `towers`. Defaults scale with the venue's
floor. Phase 2 adds `centre` behind the same layout shape.

## Concert entry

```js
{
  id: 'enhypen-jis-2027',
  artist: 'ENHYPEN', tour: "WORLD TOUR 'BLOOD SAGA'",
  dates: ['2027-01-23'], time: '19:00',
  venue: 'jis',                           // or venueName: '...' when the venue is not modelled,
                                          // or venueName: null when it is not announced
  promoter: 'PK Entertainment',
  confidence: 'confirmed' | 'single-source',
  sources: ['https://...'],
  sim: null                               // listing only
     | { external: 'https://jn1xia.github.io/bts/' }
     | {
         accuracy: 'official' | 'estimated',
         theme: { stick: '#ff7a00', accent: '#ff7a00' },
         performers: 7,
         stage: { preset: 'end', runway: 'T', bStage: true },
         categories: [
           { id: 'VIPA', name: 'VIP A', price: 3650000, kind: 'standing', color: '#e5484d' },
           { id: 'CAT7', name: 'CAT 7', price: null, kind: 'seat', color: '#3b82f6' }
         ],
         floor: [                         // bands from the stage outwards
           { depth: 0.35, blocks: ['VIPA', 'VIPB'], standing: true },
           { depth: 0.65, blocks: ['CAT1'] }
         ],
         stands: [                        // first matching rule wins
           { tier: 'L', zone: 'sideNear', cat: 'CAT2' },
           { tier: 'U', rows: [1, 12], cat: 'CAT5' }
         ],
         sections: { 'L-07': 'CAT6' }     // explicit overrides; the builder will write these
       }
}
```

`price: null` shows as *harga belum diumumkan*.

**Zones.** The engine gives every stand section a zone from where it sits relative to the stage,
so the same rule words work in every venue: `behind` (behind the stage front; closed unless a rule
opens it), `beside`, `sideNear`, `sideMid`, `sideFar`, `cornerFar`, `end`. Rules may also name a
`side` (`L` or `R`) for A and B categories. A rule with `rows` splits a tier into front and back
bands, each its own section in the panel, as Platinum and CAT 1 are on the BTS site.

**Floor.** Bands run from the stage outwards. Each band takes a share of the floor depth and is
split into side-by-side blocks, one category each. Seats and standing spots never fall inside the
stage, a runway, the sound desk or a tower.

## The twelve simulations

| Concert | Venue | Stage | Category data in hand |
| --- | --- | --- | --- |
| My Chemical Romance, 22 Nov 2026 | JIS | end | Lowest price only |
| ENHYPEN, 23 Jan 2027 | JIS | end, runway | Full list |
| Maroon 5, 5 Feb 2027 | JIS | end | Lowest price and category count |
| Westlife, 23 Jan 2027 | GBK Main Stadium | end | Top and bottom prices firm; CAT 1–5 differ between outlets |
| 5 Seconds of Summer, 14 Nov and 6 Dec 2026 | Indonesia Arena | end | Not gathered yet |
| Boyz II Men + Dewa 19, 9 Dec 2026 | Indonesia Arena | end | Not gathered yet |
| The Script, 3 Apr 2027 | Indonesia Arena | end | Price range |
| BOYNEXTDOOR, 5 Dec 2026 | ICE BSD Hall 5–6 | end, runway | Not found |
| NCT WISH, 10 Apr 2027 | ICE BSD Hall 5 | end, runway | Not announced |
| D.O., 21–22 Nov 2026 | Istora | end | Not gathered yet |
| Nancy Ajram, 30 Jan 2027 | Istora | end | Price range and category count |
| Guns N' Roses, 21 Nov 2026 | Stadion Madya | end | Full list |

Before each simulation is written, its categories are searched for once more. Whatever is still
unknown stays unpriced. Every one of these starts as `accuracy: 'estimated'`.

The other 19 shows in `docs/research/jakarta-concerts-2026-2027.md`, plus BTS and BIGBANG, go into
`concerts.js` as listings or external links.

## Language

`i18n.js` holds two dictionaries with the same keys. The language comes from `?lang=`, then the
last choice saved in the browser, then Indonesian. Switching re-renders the page without a reload.
Artist, tour and category names are never translated. Data that needs both languages, such as tier
names, carries `{ id, en }`.

## Packed links

`pack(concert)` writes the settings as compact JSON and encodes it for a URL. `unpack(text)` reverses
it and validates the result. A link that fails to unpack shows *tautan rusak* with a way back to
the hub.

## When things go wrong

| Situation | What the visitor sees |
| --- | --- |
| No WebGL | A message naming browsers that work, as on the existing sites |
| Unknown `?c=` | "Concert not found" and a link to the hub |
| A listed show with no simulation opened directly | Sent to its card on the hub |
| Broken packed link | *Tautan rusak* and a link to the hub |
| Settings that name a missing venue or category | A friendly message; details in the console |
| Counter service down | The counter line stays hidden |

Phones get fewer detailed fans and a lower pixel ratio, as on the existing sites, and the page
respects the reduced-motion setting.

## Testing

Written test-first.

**Unit tests (`node --test`):**

- outlines close, and `ring` is continuous along them;
- each venue's seat count is within 5% of its published capacity, or inside a stated sanity range
  where no reliable figure exists (ICE BSD has no fixed seating);
- no floor seat or standing spot lies inside the stage, a runway, the sound desk or a tower;
- for every simulation, every section that is not closed has a category, and every category named
  by a rule exists;
- `pack` then `unpack` returns the same settings; damaged text is rejected;
- both languages have exactly the same keys;
- concert data: unique ids, valid dates, venues that exist, at least one source each;
- `upcoming` drops a show the day after its last date in Jakarta time.

**Browser test (Playwright, run locally):**

- the hub lists shows, the language switch changes the text, and the BTS card points to the
  external site;
- each of the twelve simulations loads with no console errors and draws a canvas that is not blank;
- choosing a section updates the panel and the address;
- an unknown concert id and a broken packed link each show their message.

## Deploy

GitHub Pages through `pages.yml`, publishing `index.html`, `sim.html`, `assets`, `src` and
`vendor` on every push to `main`. The site lives at `https://jn1xia.github.io/jakarta-konser/`.
`test.yml` runs the unit tests on every push.

## Fine print the site carries

Fan-made and unofficial; not affiliated with any artist, label, promoter or venue. No artist
logos, photos or artwork. Performer figures are generic. The site sells no tickets and tells fans
to confirm their seat against the official seat plan.
