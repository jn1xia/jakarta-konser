# jakarta-konser

Unofficial 3D seat-view simulators for upcoming concerts in Jakarta, on one site. Pick a show,
pick a seat, and see the stage from there before you buy or go.

It grew out of two single-concert sites, [bts](https://jn1xia.github.io/bts/) and
[bigbang](https://jn1xia.github.io/bigbang/). Those were each built by hand. Here one shared engine
draws every show from a short description of the venue and the concert.

## What is on the site

- **Hub** (`index.html`): a calendar of every announced Jakarta show, with dates, venue, promoter,
  price range where known and a countdown. A show drops off the day after its last date.
  Each card says what it offers:
  - *3D siap*: opens the simulator. BTS and BIGBANG open their own sites.
  - *Hanya jadwal*: listed only, because the venue is not modelled.
  - *Venue belum diumumkan*: the venue has not been announced.
- **Simulator** (`sim.html?c=<concert id>`):
  - **My seat**: first person at eye height, seated or standing. Drag to look around; scroll, pinch
    or use Eyes / 2× / 4× to zoom.
  - **Whole venue**: orbit the bowl. Sections are tinted by ticket category; click one to sit there.
  - **Seat panel**: category and price, distance to the stage edge and to the main screen, eye
    height, angle off the centre line, how much of the main screen a sightline check can see, the
    TV size the screen looks like, and how tall a performer looks at arm's length. It also has a map
    drawn to scale, a section list, row and seat sliders, and the category list.
  - **Crowd**: every place is taken. Fans near you are jointed figures; everyone else is a point of
    light. K-pop shows get a lightstick for everyone; other shows get phone torches on about a
    third of the crowd.
  - **Show / House lights**.
  - The chosen seat is kept in the address, so the exact view can be shared.
- **Indonesian and English**, switched with the button in the corner. Indonesian is the default.

Phase 2, not built yet, is a guided builder: pick a venue and a stage, paint the sections from a
seat-plan poster, and share the result by link. The link format it needs is already here
(`sim.html#k=…`), and a simulation opened that way is always labelled fan-made.

## How accurate it is

Seat-plan images could not be opened where this was built, so **where each category sits is an
estimate** made from written descriptions, and every simulation says *Estimasi* next to its title.
The same goes for stage sizes and row counts. Venue shells use published figures where they exist:

| Venue | Seats in the model | Published | Shape and rows |
| --- | --- | --- | --- |
| Jakarta International Stadium | 85,460 | 82,000 | From the BIGBANG site; rakes are JIS's published 24°, 29°, 32° |
| GBK Main Stadium | 80,156 | 77,193 | From the BTS site |
| Indonesia Arena | 15,440 | 16,088 | Estimated to match the seat count |
| Istora Senayan | 6,980 | 7,166 | Estimated to match the seat count |
| Stadion Madya GBK | 9,152 | not found | Estimated around a standard athletics track |
| ICE BSD Hall 5–6 / Hall 5 | 3,480 / 1,600 in the temporary stand | none | Estimated; halls taken as 50 × 100 m each |

Prices are before tax and fees. A price the sources do not agree on, or do not give, is shown as
*Harga belum diumumkan*. Nothing is invented.

Always check your seat against the official seat plan.

## The data

`src/data/concerts.js` holds every show. The facts and their sources are in
`docs/research/jakarta-concerts-2026-2027.md`, last checked on 11 November 2026. Nothing had been
announced for May–December 2027 at that point, so the list needs a refresh every month or so.

### Add a show

Add one entry to `CONCERTS` in `src/data/concerts.js`:

```js
{
  id: 'artist-venue-2027',            // unique; it becomes sim.html?c=artist-venue-2027
  artist: 'Artist', tour: 'Tour name',
  dates: ['2027-06-12'],
  venue: 'jis',                       // a venue id from src/data/venues, or:
  // venueName: 'Tennis Indoor Senayan',   a venue that is not modelled (use null if not announced)
  promoter: 'Promoter', genre: 'kpop', confidence: 'confirmed',
  priceFrom: 1250000, priceTo: 3500000,   // optional, shown on the hub card
  sources: ['https://…'],
  sim: null                           // listed only
}
```

To give it a simulation, replace `sim: null` with settings:

```js
sim: {
  accuracy: 'estimated',              // 'official' once it follows the real seat plan
  theme: { lights: 'stick', stick: '#ffe9b8', accent: '#f76b15' },   // or { lights: 'phone' }
  performers: 5,
  stage: { preset: 'end', runway: 'straight', bStage: true },        // runway: 'none' | 'straight' | 'T'
  categories: [
    { id: 'VIP', name: 'VIP', price: 3500000, kind: 'standing', color: '#e5484d' },
    { id: 'CAT1', name: 'CAT 1', price: null, kind: 'seat', color: '#0090ff' }
  ],
  floor: [{ depth: 1, blocks: ['VIP'], standing: true }],            // bands from the stage outwards
  stands: [                                                          // first matching rule wins
    { tier: 'L', zone: ['sideNear', 'sideMid'], cat: 'CAT1' },
    { cat: 'CAT1' }
  ]
}
```

- **Zones** say where a section sits relative to the stage: `beside`, `sideNear`, `sideMid`,
  `sideFar`, `cornerFar`, `end`, and `behind`. Sections behind the stage are closed unless a rule
  names `behind`.
- A rule may also give `side: 'L' | 'R'` and `rows: [from, to]`. A rule with `rows` splits a tier
  into front and back bands.
- `sections: { 'L-07': 'CAT1' }` overrides single sections by id.
- When a show's categories are not published yet, use `...fallback('jis', true)`: one unpriced
  category for the floor and one per tier.

`npm test` checks every entry: real dates, a known venue, categories that exist, and a seat in
every category.

### Add a venue

Add a file in `src/data/venues/` and list it in `index.js`. A venue is a front-row outline
(`roundedRect` or `fourCentredOval`), its tiers (`d0` and `y0` of the first row, `rows`, row
`depth`, `rake`), the number of sectors, the usable floor, and the roof type (`ring`, `closed`,
`hall` or `none`). A tier with `span` covers only part of the outline, as at Stadion Madya and
ICE BSD. Add the venue to `tests/venues.test.js` with its published capacity or a sane range.

## Run it

No build step and no dependencies to install.

```sh
npm run serve        # then open http://localhost:8000
npm test             # unit tests (Node 22)
npm run e2e          # browser test; needs Playwright with Chromium
npm run e2e -- --only=hub        # one group: hub, sim, or a part of sim
                                 # (venues, stage, seat, crowd, panel, links)
```

`SITE_ROOT=_site npm run e2e` runs the browser test against a built copy of the published files.

Add `?debug` to a simulator address to expose a small `window.__jk` test hook. On the hub,
`?debug&today=2026-12-28` shows the calendar as of that day.

`src/engine` is pure logic and runs in Node: outline geometry, seats, stage layout, floor blocks,
category rules, validation and link packing. `src/sim` draws what the engine returns with
three.js r128, which is served from `vendor/` so the site depends on no CDN.

## Deploy

GitHub Pages is free for public repositories.

- **Preview from a branch:** Settings → Pages → Build and deployment, set Source to "Deploy from a
  branch", then pick the branch and folder `/ (root)`. The site goes live at
  https://jn1xia.github.io/jakarta-konser/ in about a minute.
- **From `main`:** set Source to "GitHub Actions". `.github/workflows/pages.yml` then runs the
  unit tests and publishes every push to `main`. It can also be run by hand from the Actions tab.

Any other static host works: upload `index.html`, `sim.html`, `assets/`, `src/` and `vendor/`.

## Visitor counter

The hub shows "N pengunjung sejauh ini" under the title. It counts each browser once: the first
visit adds one and leaves a flag in the browser, and later visits only read the total. It uses
[Abacus](https://github.com/JasonLovesDoggo/abacus), a free counter service that needs no account.
It runs only on `jn1xia.github.io`, so local copies and previews never change the count. If the
service is slow or down, the line stays hidden.

- **See the total any time:** https://abacus.jasoncameron.dev/get/jn1xia.github.io/jakarta-konser-visitors
- **Protect the count (optional, only possible before the counter goes live):** open
  https://abacus.jasoncameron.dev/create/jn1xia.github.io/jakarta-konser-visitors in a browser and
  save the `admin_key` it shows somewhere private (never in this repo). With that key the number
  can be corrected later with Abacus's `/set` call. Once the live site has counted a single
  visit, `/create` is refused for good.
- **Limits:** this counts browsers, not people. The same person counts again on another device,
  after clearing browser data, and in each app's built-in browser. Browsers that block storage
  only see the total and are not counted.

To count on another host, add its name to `COUNTER.hosts` in `src/counter.js`.

## Fine print

Fan-made and unofficial. Not affiliated with any artist, label, promoter or venue. The site uses no
artist logos, photos or artwork; the figures on stage are generic stand-ins, not likenesses. It
sells no tickets. three.js is © its authors, MIT licence (`vendor/THREE-LICENSE`).
