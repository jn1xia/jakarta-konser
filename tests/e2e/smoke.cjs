'use strict';
// Browser test. Serves the repository from a local server, opens the pages in headless
// Chromium and runs named checks. Run with `npm run e2e`; add `--only=hub` (or sim, or a part
// of sim: venues, stage, seat, crowd, panel, links) to run one group. Requests to other hosts are blocked, so the test never needs the network.

const http = require('http');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');

// SITE_ROOT=_site checks the folder the deploy workflow publishes instead of the repository
const ROOT = path.resolve(process.env.SITE_ROOT || path.join(__dirname, '../..'));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const only = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7);
const wants = (group) => !only || only.split(',').includes(group);
// Parts of the simulator group, so one part can be run alone: --only=venues,stage,seat,crowd,panel,links
const part = (name) => wants('sim') || wants(name);

function serve() {
  const server = http.createServer((req, res) => {
    let file = path.normalize(path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
    if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); res.end('not found'); return; }
      res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

let failed = 0, passed = 0;
async function check(name, fn) {
  try { await fn(); passed++; console.log(`ok    ${name}`); }
  catch (e) { failed++; console.log(`FAIL  ${name}\n      ${String(e && e.message).split('\n')[0]}`); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
function equal(a, b, msg) { if (a !== b) throw new Error(`${msg || 'not equal'}: got ${JSON.stringify(a)}, wanted ${JSON.stringify(b)}`); }

(async () => {
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

  /** Opens a page and records its errors. Same-origin 404s count; other hosts are blocked. */
  async function open(url, viewport = { width: 1280, height: 800 }, options = {}) {
    const context = await browser.newContext({ viewport, ...options });
    const page = await context.newPage();
    const errors = [];
    await page.route((u) => !u.href.startsWith(base), (route) => route.abort());
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`); });
    page.on('response', (r) => { if (r.url().startsWith(base) && r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
    await page.goto(base + url, { waitUntil: 'load' });
    return { page, errors, close: () => context.close() };
  }

  const { CONCERTS } = await import(pathToFileURL(path.join(ROOT, 'src/data/concerts.js')));
  const { upcoming } = await import(pathToFileURL(path.join(ROOT, 'src/engine/calendar.js')));
  const ids = (page) => page.$$eval('.card', (els) => els.map((e) => e.dataset.id).sort());
  const sorted = (list) => list.map((c) => c.id).sort();

  if (wants('hub')) {
    const TODAY = '2026-11-11', soon = upcoming(CONCERTS, TODAY);
    const hub = await open(`/index.html?debug&today=${TODAY}`);
    const { page } = hub;
    await page.waitForSelector('.card');

    await check('hub: lists every upcoming show', async () => {
      equal(JSON.stringify(await ids(page)), JSON.stringify(sorted(soon)), 'cards');
    });
    await check('hub: the BTS card opens the existing site', async () => {
      assert(await page.$('.card[data-id="bts-gbk-2026"] a[href="https://jn1xia.github.io/bts/"][target="_blank"][rel~="noopener"]'), 'no external BTS link');
      assert(await page.$('.card[data-id="enhypen-jis-2027"] a[href^="sim.html?c=enhypen-jis-2027"]'), 'no simulator link');
      equal(await page.$eval('.card[data-id="men-i-trust-tennis-indoor-2026"]', (e) => e.querySelectorAll('a').length), 0, 'a listing-only card has links');
    });
    await check('hub: badges say what each card offers', async () => {
      equal(await page.$eval('.card[data-id="enhypen-jis-2027"] .badge', (e) => `${e.dataset.kind}|${e.textContent}`), '3d|3D siap');
      equal(await page.$eval('.card[data-id="m2m-tennis-indoor-2027"] .badge', (e) => `${e.dataset.kind}|${e.textContent}`), 'list|Hanya jadwal');
      equal(await page.$eval('.card[data-id="txt-jakarta-2027"] .badge', (e) => `${e.dataset.kind}|${e.textContent}`), 'novenue|Venue belum diumumkan');
    });
    await check('hub: no card shows a made-up price', async () => {
      const text = await page.$eval('#list', (e) => e.textContent);
      assert(!/Rp0\b|NaN|undefined|null/.test(text), 'found Rp0, NaN, undefined or null in the cards');
    });
    await check('hub: the 3D filter keeps only shows with a simulation', async () => {
      await page.check('#f3d');
      equal(JSON.stringify(await ids(page)), JSON.stringify(sorted(soon.filter((c) => c.sim))), 'cards');
      await page.uncheck('#f3d');
    });
    await check('hub: the venue filter keeps only that venue', async () => {
      await page.selectOption('#fvenue', 'jis');
      equal(JSON.stringify(await ids(page)), JSON.stringify(sorted(soon.filter((c) => c.venue === 'jis'))), 'cards');
      await page.selectOption('#fvenue', '');
    });
    await check('hub: the language button switches every label without a reload', async () => {
      await page.evaluate(() => { window.__sameDocument = true; });
      await page.click('#lang');
      equal(await page.$eval('.card[data-id="enhypen-jis-2027"] .badge', (e) => e.textContent), '3D ready');
      equal(await page.$eval('html', (e) => e.lang), 'en');
      equal(await page.evaluate(() => window.__sameDocument), true, 'the page reloaded');
      await page.click('#lang');
      equal(await page.$eval('html', (e) => e.lang), 'id');
    });
    await check('hub: no errors on the page', async () => equal(hub.errors.join(' | '), ''));
    await hub.close();

    const mid = await open('/index.html?debug&today=2026-12-28');
    await mid.page.waitForSelector('.card');
    await check('hub: a run that is partly over still counts down to its next date', async () => {
      equal(await mid.page.$eval('.card[data-id="bts-gbk-2026"] .dday', (e) => e.textContent), 'H-1');
      equal(mid.errors.join(' | '), '');
    });
    await mid.close();

    const late = await open('/index.html?debug&today=2028-01-01');
    await late.page.waitForSelector('#empty:not([hidden])');
    await check('hub: with nothing upcoming it says so instead of going blank', async () => {
      equal((await late.page.$$('.card')).length, 0, 'cards');
      equal(await late.page.$eval('#empty', (e) => e.textContent), 'Belum ada konser yang diumumkan. Cek lagi nanti.');
      equal(late.errors.join(' | '), '');
    });
    await late.close();

    const phone = await open(`/index.html?debug&today=${TODAY}`, { width: 390, height: 844 });
    await phone.page.waitForSelector('.card');
    await check('hub: fits a phone without sideways scrolling', async () => {
      const over = await phone.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert(over <= 0, `page is ${over}px wider than the screen`);
    });
    await phone.close();
  }

  if (wants('support')) {
    const opened = (page) => page.evaluate(() => {
      const d = document.querySelector('#supportDialog'), img = d && d.querySelector('img');
      return { open: !!(d && d.open), img: img ? { src: img.getAttribute('src'), loaded: img.complete && img.naturalWidth > 0 } : null,
        save: d ? (d.querySelector('a[download]') || {}).getAttribute?.('href') : null };
    });
    const hub = await open('/index.html?debug&today=2026-11-12');
    await hub.page.waitForSelector('.card');
    await check('support: the QRIS loads only when asked for, then opens from the header button', async () => {
      equal(await hub.page.evaluate(() => [...document.images].some((i) => /qris/.test(i.src))), false, 'the QRIS image loads before anyone asks');
      equal(await hub.page.$eval('#support', (e) => e.textContent.trim()), 'Dukung ♥');
      await hub.page.click('#support');
      await hub.page.waitForFunction(() => { const i = document.querySelector('#supportDialog img'); return i && i.complete && i.naturalWidth > 0; });
      const got = await opened(hub.page);
      equal(got.open, true, 'dialog open'); equal(got.img.src, 'assets/qris.png'); equal(got.save, 'assets/qris.png', 'save link');
      assert((await hub.page.$eval('#supportDialog', (e) => e.textContent)).includes('tidak wajib'), 'the dialog does not say it is optional');
      await hub.page.keyboard.press('Escape');
      equal((await opened(hub.page)).open, false, 'Escape did not close it');
    });
    await check('support: the footer line opens it too, and it speaks English after the switch', async () => {
      await hub.page.click('#supportLine'); equal((await opened(hub.page)).open, true);
      await hub.page.click('#supportDialog [data-close]'); equal((await opened(hub.page)).open, false, 'Tutup did not close it');
      await hub.page.click('#lang');
      equal(await hub.page.$eval('#support', (e) => e.textContent.trim()), 'Support ♥');
      await hub.page.click('#support');
      assert((await hub.page.$eval('#supportDialog', (e) => e.textContent)).includes('never required'), 'dialog not in English');
      await hub.page.keyboard.press('Escape'); await hub.page.click('#lang');
      equal(hub.errors.join(' | '), '');
    });
    await hub.close();

    const sim = await open('/sim.html?c=enhypen-jis-2027&debug');
    await sim.page.waitForFunction(() => window.__jk && window.__jk.ready, null, { timeout: 45000 });
    await check('support: the seat panel offers it too, without getting in the way of the view', async () => {
      await sim.page.click('#fine .support-link');
      await sim.page.waitForFunction(() => { const i = document.querySelector('#supportDialog img'); return i && i.complete && i.naturalWidth > 0; });
      equal((await opened(sim.page)).open, true);
      await sim.page.keyboard.press('Escape');
      equal((await opened(sim.page)).open, false);
      equal(sim.errors.join(' | '), '');
    });
    await sim.close();
  }

  if (['sim', 'venues', 'stage', 'seat', 'crowd', 'panel', 'links'].some(wants)) {
    const engine = CONCERTS.filter((c) => c.sim && !c.sim.external);
    const ready = (page) => page.waitForFunction(() => window.__jk && window.__jk.ready, null, { timeout: 45000 });

    for (const c of part('venues') ? engine : []) {
      const s = await open(`/sim.html?c=${c.id}&debug`);
      await check(`sim ${c.id}: loads and draws the venue`, async () => {
        await ready(s.page);
        const stats = await s.page.evaluate(() => window.__jk.pixelStats());
        assert(stats.distinct > 50, `only ${stats.distinct} colours on the canvas`);
        equal(s.errors.join(' | '), '');
      });
      await s.close();
    }
    if (part('stage')) {
      const s = await open('/sim.html?c=enhypen-jis-2027&debug');
      await ready(s.page);
      await check('sim: the stage, screens, sound desk and towers are built and can block a view', async () => {
        const n = await s.page.evaluate(() => ({
          obstacles: window.__jk.ctx.obstacles.length, floorObs: window.__jk.ctx.floorObs.length,
          stands: window.__jk.model.sections.filter((x) => x.kind === 'stand').length
        }));
        assert(n.obstacles > n.stands + 5, `only ${n.obstacles} obstacles for ${n.stands} stand sections`);
        equal(n.floorObs, 3, 'sound desk plus two towers');
      });
      await check('sim: house lights still draw the venue', async () => {
        const stats = await s.page.evaluate(() => { window.__jk.setLights('house'); return window.__jk.pixelStats(); });
        assert(stats.distinct > 50, `only ${stats.distinct} colours`);
        equal(s.errors.join(' | '), '');
      });
      await s.close();
    }
    if (part('seat')) {
      const seat = (page) => page.evaluate(() => { const j = window.__jk; return { sec: j.state.sec.id, row: j.state.row, seat: j.state.seat, mode: j.state.mode }; });
      const dflt = (page) => page.evaluate(() => { const d = window.__jk.model.defaultSeat; return { sec: d.sec.id, row: d.row, seat: d.seat }; });
      const plain = await open('/sim.html?c=enhypen-jis-2027&debug');
      await ready(plain.page);
      await check('seat: opens on the default seat, in My seat view, looking at the stage', async () => {
        const now = await seat(plain.page), d = await dflt(plain.page);
        equal(`${now.sec}/${now.row}/${now.seat}`, `${d.sec}/${d.row}/${d.seat}`); equal(now.mode, 'pov');
        const facing = await plain.page.evaluate(() => { const c = window.__jk.ctx.camera, v = new THREE.Vector3(); c.getWorldDirection(v); return { z: v.z, eyeY: c.position.y, seatY: window.__jk.cam.seatPos.y }; });
        assert(facing.z < -0.8, `camera is not facing the stage end (direction z ${facing.z})`);
        assert(Math.abs(facing.eyeY - facing.seatY - 1.18) < 0.01, 'seated eye height is not 1.18 m');
      });
      await check('seat: choosing a seat writes it into the address, and that address restores it', async () => {
        await plain.page.evaluate(() => window.__jk.selectSeat(window.__jk.model.byId['U-03'], 3, 5));
        const url = new URL(plain.page.url());
        equal(url.searchParams.get('s'), 'U-03'); equal(url.searchParams.get('r'), '4'); equal(url.searchParams.get('n'), '6');
        equal(url.searchParams.get('c'), 'enhypen-jis-2027'); assert(url.searchParams.has('debug'), 'debug was dropped from the address');
        await plain.page.reload(); await ready(plain.page);
        const now = await seat(plain.page);
        equal(`${now.sec}/${now.row}/${now.seat}`, 'U-03/3/5');
        equal(plain.errors.join(' | '), '');
      });
      await check('seat: the whole-venue view and back again', async () => {
        await plain.page.evaluate(() => window.__jk.setMode('overview', false));
        const high = await plain.page.evaluate(() => window.__jk.ctx.camera.position.y);
        assert(high > 60, `overview camera is only ${high} m up`);
        const picked = await plain.page.evaluate(() => { const j = window.__jk, r = j.ctx.renderer.domElement.getBoundingClientRect(); const h = j.cam.pick(r.left + r.width * 0.45, r.top + r.height * 0.55); return h ? h.sec.id : null; });
        assert(picked, 'clicking the middle of the venue hits no section');
        await plain.page.evaluate(() => window.__jk.setMode('pov', false));
        const low = await plain.page.evaluate(() => { const j = window.__jk; return Math.abs(j.ctx.camera.position.y - j.cam.eyePos.y); });
        assert(low < 0.01, 'camera did not return to the seat');
      });
      await check('seat: the whole-venue view is centred beside the panel and shows lights, not figures', async () => {
        const got = await plain.page.evaluate(() => {
          const j = window.__jk; j.setMode('overview', false); j.cam.apply(performance.now());
          const c = j.ctx.camera; c.updateMatrixWorld();
          const v = new THREE.Vector3(0, 0, 0).project(c), w = j.ctx.renderer.domElement.clientWidth;
          const out = { x: (v.x + 1) / 2 * w, w, figures: j.crowd.figuresShown() };
          j.setMode('pov', false);
          return { ...out, back: j.crowd.figuresShown() };
        });
        const free = (got.w - 384) / 2;
        assert(Math.abs(got.x - free) < 70, `venue centre is at x=${Math.round(got.x)}, the free area's middle is ${Math.round(free)}`);
        equal(got.figures, false, 'jointed fans are drawn in the whole-venue view'); equal(got.back, true, 'jointed fans did not come back');
      });
      await plain.close();

      for (const s of ['ZZ', 'constructor', '__proto__']) {
        const junk = await open(`/sim.html?c=enhypen-jis-2027&debug&s=${s}&r=999&n=-3`);
        await check(`seat: garbage seat values in the address (s=${s}) fall back to the default seat`, async () => {
          await ready(junk.page);
          const now = await seat(junk.page), d = await dflt(junk.page);
          equal(`${now.sec}/${now.row}/${now.seat}`, `${d.sec}/${d.row}/${d.seat}`);
          equal(junk.errors.join(' | '), '');
        });
        await junk.close();
      }

      const flight = await open('/sim.html?c=enhypen-jis-2027&debug');
      await ready(flight.page);
      await check('seat: the roof comes back over the seat even when the flight there is interrupted', async () => {
        for (const interrupt of ['wheel', 'legend']) {
          await flight.page.evaluate((how) => {
            const j = window.__jk; j.setMode('overview', false); j.setMode('pov', true);
            if (how === 'wheel') document.querySelector('#scene').dispatchEvent(new WheelEvent('wheel', { deltaY: 40, bubbles: true, cancelable: true }));
            else document.querySelector('#catList .cat').click();
          }, interrupt);
          // Frames are slow under software rendering, so wait for the glide to land rather than a fixed time
          await flight.page.waitForFunction(() => window.__jk.ctx.roofOn(), null, { timeout: 15000 }).catch(() => {});
          const got = await flight.page.evaluate(() => ({ mode: window.__jk.state.mode, roof: window.__jk.ctx.roofOn() }));
          equal(`${interrupt}: ${got.mode} roof ${got.roof}`, `${interrupt}: pov roof true`);
        }
        equal(flight.errors.join(' | '), '');
      });
      await flight.close();

      const calm = await open('/sim.html?c=enhypen-jis-2027&debug', { width: 1280, height: 800 }, { reducedMotion: 'reduce' });
      await ready(calm.page);
      const busy = await open('/sim.html?c=enhypen-jis-2027&debug');
      await ready(busy.page);
      await check('seat: with reduced motion the crowd and performers hold still', async () => {
        await calm.page.waitForTimeout(800); await busy.page.waitForTimeout(800);
        const still = await calm.page.evaluate(() => window.__jk.motion());
        const moving = await busy.page.evaluate(() => window.__jk.motion());
        equal(still.crowd, 0, 'crowd time with reduced motion');
        assert(moving.crowd > 0, 'crowd does not move without reduced motion');
        assert(still.sweep < moving.sweep, `beams sweep at ${still.sweep} with reduced motion, ${moving.sweep} without`);
        equal(calm.errors.join(' | '), '');
      });
      await calm.close(); await busy.close();

      const pit = await open('/sim.html?c=enhypen-jis-2027&debug&s=F1-A&r=1&n=10');
      await ready(pit.page);
      await check('seat: a standing floor block always stands', async () => {
        const h = await pit.page.evaluate(() => { const j = window.__jk; return j.cam.eyePos.y - j.cam.seatPos.y; });
        assert(Math.abs(h - 1.62) < 0.01, `eye height ${h}`);
      });
      await pit.close();
    }
    if (part('crowd')) {
      const s = await open('/sim.html?c=gnr-madya-2026&debug');
      await ready(s.page);
      await check('crowd: every open place has a fan, and the seat view still draws', async () => {
        const n = await s.page.evaluate(() => {
          const j = window.__jk, open = j.model.sections.filter((x) => x.cat !== 'CLOSED');
          const seated = open.filter((x) => !(x.kind === 'floor' && x.standing)).reduce((a, x) => a + x.rows.reduce((b, r) => b + r.length / 3, 0), 0);
          return { crowd: j.crowd.count, seated, near: j.crowd.nearCount(), stats: j.pixelStats() };
        });
        assert(n.crowd > 5000, `only ${n.crowd} fans`);
        assert(n.crowd >= n.seated, `${n.crowd} fans for ${n.seated} seats`);
        assert(n.near > 50, `only ${n.near} jointed fans near the seat`);
        assert(n.stats.distinct > 50, `only ${n.stats.distinct} colours`);
        equal(s.errors.join(' | '), '');
      });
      await check('crowd: standing up and house lights do not break the view', async () => {
        const stats = await s.page.evaluate(() => { const j = window.__jk; j.setPosture('stand'); j.setLights('house'); return { stats: j.pixelStats(), eye: j.cam.eyePos.y - j.cam.seatPos.y }; });
        assert(Math.abs(stats.eye - 1.62) < 0.01, `standing eye height ${stats.eye}`);
        assert(stats.stats.distinct > 50, `only ${stats.stats.distinct} colours`);
        equal(s.errors.join(' | '), '');
      });
      await s.close();
    }
    if (part('panel')) {
      const s = await open('/sim.html?c=enhypen-jis-2027&debug');
      await ready(s.page);
      const text = (sel) => s.page.$eval(sel, (e) => e.textContent.trim());
      await check('panel: shows the seat, its category, its price and seven facts', async () => {
        assert((await text('#nowCat')).includes('CAT'), `chip reads "${await text('#nowCat')}"`);
        assert((await text('#nowPrice')).startsWith('Rp'), `price reads "${await text('#nowPrice')}"`);
        assert((await text('#nowTitle')).includes('Sektor'), `title reads "${await text('#nowTitle')}"`);
        equal(await s.page.$$eval('#stats > div', (els) => els.length), 7, 'seat facts');
        const facts = await text('#stats');
        assert(/\d+ m/.test(facts) && !/NaN|undefined|Infinity/.test(facts), `facts read "${facts}"`);
        assert((await text('#verdict')).length > 20, 'no verdict line');
        equal(await s.page.$$eval('#catList .cat', (els) => els.length), 9, 'categories in the legend');
        assert(await s.page.$eval('#map', (e) => e.querySelectorAll('.sec').length > 60), 'the map has no sections');
      });
      await check('panel: the section list moves the seat and the address', async () => {
        await s.page.selectOption('#secSel', 'M-05');
        equal(await s.page.evaluate(() => window.__jk.state.sec.id), 'M-05');
        equal(new URL(s.page.url()).searchParams.get('s'), 'M-05');
        assert((await text('#nowCat')).includes('CAT 3'), `chip reads "${await text('#nowCat')}"`);
        await s.page.$eval('#rowIn', (e) => { e.value = '2'; e.dispatchEvent(new Event('input', { bubbles: true })); });
        equal(await s.page.evaluate(() => window.__jk.state.row), 1, 'row slider');
        equal(new URL(s.page.url()).searchParams.get('r'), '2');
      });
      await check('panel: clicking the map sits in that section', async () => {
        await s.page.$eval('#map .sec[data-id="U-04"]', (e) => e.dispatchEvent(new MouseEvent('click', { bubbles: true })));
        equal(await s.page.evaluate(() => window.__jk.state.sec.id), 'U-04');
        assert(await s.page.$eval('#map .sec[data-id="U-04"]', (e) => e.classList.contains('on')), 'the map does not mark the chosen section');
      });
      await check('panel: the dock switches view, lights and posture', async () => {
        await s.page.click('#btn-over');
        equal(await s.page.evaluate(() => window.__jk.state.mode), 'overview');
        equal(await s.page.$eval('#btn-over', (e) => e.getAttribute('aria-pressed')), 'true');
        assert(await s.page.$eval('[data-zoom="2"]', (e) => e.disabled), 'zoom should be off in the whole-venue view');
        await s.page.click('#btn-pov'); await s.page.click('#btn-house'); await s.page.click('#btn-stand'); await s.page.click('[data-zoom="2"]');
        const st = await s.page.evaluate(() => { const j = window.__jk.state; return `${j.mode}/${j.lights}/${j.posture}/${j.zoom}`; });
        equal(st, 'pov/house/stand/2');
      });
      await check('panel: the language button changes every label', async () => {
        equal(await text('#accuracy'), 'Estimasi'); equal(await text('#btn-pov'), 'Kursiku');
        await s.page.click('#lang');
        equal(await text('#accuracy'), 'Estimate'); equal(await text('#btn-pov'), 'My seat');
        assert((await text('#nowTitle')).includes('Sector'), `title reads "${await text('#nowTitle')}"`);
        assert((await text('#h-cats')) === 'Ticket categories', 'legend heading not translated');
        await s.page.click('#lang');
        equal(s.errors.join(' | '), '');
      });
      await s.close();

      const m5 = await open('/sim.html?c=maroon5-jis-2027&debug');
      await ready(m5.page);
      await check('panel: an unknown price says so and never shows Rp0 or NaN', async () => {
        equal(await m5.page.$eval('#nowPrice', (e) => e.textContent.trim()), 'Harga belum diumumkan');
        const all = await m5.page.$eval('#panel', (e) => e.textContent);
        assert(all.split('Harga belum diumumkan').length > 3, 'the legend does not say the price is not announced');
        assert(!/Rp0\b|NaN|undefined|null/.test(all), 'found Rp0, NaN, undefined or null in the panel');
        equal(m5.errors.join(' | '), '');
      });
      await m5.close();

      const ph = await open('/sim.html?c=thescript-indonesia-arena-2027&debug', { width: 390, height: 844 });
      await ready(ph.page);
      await check('panel: on a phone it is a bottom sheet that opens and closes', async () => {
        const over = await ph.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        assert(over <= 0, `page is ${over}px wider than the screen`);
        const box = async () => ph.page.$eval('#panel', (e) => e.getBoundingClientRect().height);
        const closed = await box();
        assert(closed < 844 * 0.45, `the closed sheet covers ${Math.round(closed)}px of the view`);
        await ph.page.click('#sheetToggle');
        const opened = await box();
        assert(opened > closed + 80, 'the sheet did not open');
        equal(await ph.page.$eval('#sheetToggle', (e) => e.getAttribute('aria-expanded')), 'true');
        await ph.page.click('#sheetToggle');
        assert((await box()) < opened, 'the sheet did not close');
        const stats = await ph.page.evaluate(() => window.__jk.pixelStats());
        assert(stats.distinct > 50, 'the canvas is blank on a phone');
        equal(ph.errors.join(' | '), '');
      });
      await ph.close();
    }
    if (part('links')) {
      const { pack } = await import(pathToFileURL(path.join(ROOT, 'src/engine/config.js')));
      const message = async (url) => {
        const pg = await open(url);
        await pg.page.waitForSelector('#message:not([hidden])', { timeout: 15000 });
        const out = { title: await pg.page.$eval('#messageTitle', (e) => e.textContent), href: await pg.page.$eval('#messageLink', (e) => e.getAttribute('href')), errors: pg.errors.join(' | ') };
        await pg.close();
        return out;
      };
      await check('links: an unknown concert says so and offers the way back', async () => {
        const m = await message('/sim.html?c=nope');
        equal(m.title, 'Konser tidak ditemukan'); assert(m.href.startsWith('index.html'), `link goes to ${m.href}`); equal(m.errors, '');
      });
      await check('links: a broken packed link says so', async () => {
        equal((await message('/sim.html#k=@@@')).title, 'Tautan rusak');
        equal((await message('/sim.html#k=' + Buffer.from('{"v":2}').toString('base64url'))).title, 'Tautan rusak');
      });
      await check('links: a packed link opens as a fan-made simulation and its text is never run as markup', async () => {
        const base0 = CONCERTS.find((c) => c.id === 'enhypen-jis-2027');
        const evil = '<img src=x onerror="window.__xss=1">';
        const cats = base0.sim.categories.map((c, i) => (i === 2 ? { ...c, name: '<b onclick="window.__xss=1">CAT</b>' } : c));
        const link = '/sim.html?debug#k=' + pack({ ...base0, artist: evil, tour: '<script>window.__xss=1</script>', sim: { ...base0.sim, categories: cats } });
        const pg = await open(link);
        await ready(pg.page);
        const got = await pg.page.evaluate(() => ({
          artist: document.querySelector('#artist').textContent, imgs: document.querySelectorAll('#brand img, #panel img, #panel b, #brand script').length,
          badge: document.querySelector('#accuracy').textContent, xss: window.__xss, custom: window.__jk.model.concert.custom === true,
          legend: document.querySelector('#catList').textContent
        }));
        equal(got.artist, evil); equal(got.imgs, 0, 'markup from the link became elements'); equal(got.xss, undefined, 'script from the link ran');
        equal(got.badge, 'Buatan penggemar · tidak resmi'); equal(got.custom, true);
        assert(got.legend.includes('<b onclick'), 'the category name is not shown as text');
        await pg.page.evaluate(() => window.__jk.selectSeat(window.__jk.model.byId['U-03'], 3, 5));
        assert(pg.page.url().includes('#k=') && pg.page.url().includes('s=U-03'), 'choosing a seat lost the packed settings');
        equal(pg.errors.join(' | '), '');
        await pg.close();
      });
      await check('links: a link that leaves nothing on sale says so instead of hanging', async () => {
        const base0 = CONCERTS.find((c) => c.id === 'enhypen-jis-2027');
        equal((await message('/sim.html#k=' + pack({ ...base0, sim: { ...base0.sim, floor: [], stands: [] } }))).title, 'Tautan rusak');
      });
      await check('links: a show that is over still opens', async () => {
        const pg = await open('/sim.html?c=5sos-indonesia-arena-2026&debug&s=U-03&r=2&n=4');
        await ready(pg.page);
        equal(await pg.page.evaluate(() => window.__jk.state.sec.id), 'U-03'); equal(pg.errors.join(' | '), '');
        await pg.close();
      });
      await check('links: a show with no simulation goes to its card on the hub', async () => {
        const pg = await open('/sim.html?c=txt-jakarta-2027');
        await pg.page.waitForURL(/index\.html#txt-jakarta-2027$/, { timeout: 15000 });
        await pg.page.waitForSelector('.card.is-target');
        equal(await pg.page.$eval('.card.is-target', (e) => e.dataset.id), 'txt-jakarta-2027');
        await pg.close();
      });
      await check('links: BTS goes to its own site', async () => {
        const context = await browser.newContext();
        const page = await context.newPage();
        const asked = [];
        await page.route((u) => !u.href.startsWith(base), (route) => { asked.push(route.request().url()); route.abort(); });
        await page.goto(base + '/sim.html?c=bts-gbk-2026').catch(() => {});
        await page.waitForTimeout(800);
        assert(asked.includes('https://jn1xia.github.io/bts/'), `asked for ${asked.join(', ') || 'nothing'}`);
        await context.close();
      });
    }
    // SIM-CHECKS (later tasks add their checks above this line)
  }

  await browser.close();
  server.close();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
