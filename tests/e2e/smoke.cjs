'use strict';
// Browser test. Serves the repository from a local server, opens the pages in headless
// Chromium and runs named checks. Run with `npm run e2e`; add `--only=hub` (or sim, links)
// to run one group. Requests to other hosts are blocked, so the test never needs the network.

const http = require('http');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '../..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const only = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7);
const wants = (group) => !only || only.split(',').includes(group);

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
  async function open(url, viewport = { width: 1280, height: 800 }) {
    const context = await browser.newContext({ viewport });
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

  if (wants('sim')) {
    const engine = CONCERTS.filter((c) => c.sim && !c.sim.external);
    const ready = (page) => page.waitForFunction(() => window.__jk && window.__jk.ready, null, { timeout: 45000 });

    for (const c of engine) {
      const s = await open(`/sim.html?c=${c.id}&debug`);
      await check(`sim ${c.id}: loads and draws the venue`, async () => {
        await ready(s.page);
        const stats = await s.page.evaluate(() => window.__jk.pixelStats());
        assert(stats.distinct > 50, `only ${stats.distinct} colours on the canvas`);
        equal(s.errors.join(' | '), '');
      });
      await s.close();
    }
    {
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
    {
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
      await plain.close();

      const junk = await open('/sim.html?c=enhypen-jis-2027&debug&s=ZZ&r=999&n=-3');
      await ready(junk.page);
      await check('seat: garbage seat values in the address fall back to the default seat', async () => {
        const now = await seat(junk.page), d = await dflt(junk.page);
        equal(`${now.sec}/${now.row}/${now.seat}`, `${d.sec}/${d.row}/${d.seat}`);
        equal(junk.errors.join(' | '), '');
      });
      await junk.close();

      const pit = await open('/sim.html?c=enhypen-jis-2027&debug&s=F1-A&r=1&n=10');
      await ready(pit.page);
      await check('seat: a standing floor block always stands', async () => {
        const h = await pit.page.evaluate(() => { const j = window.__jk; return j.cam.eyePos.y - j.cam.seatPos.y; });
        assert(Math.abs(h - 1.62) < 0.01, `eye height ${h}`);
      });
      await pit.close();
    }
    // SIM-CHECKS (later tasks add their checks above this line)
  }

  await browser.close();
  server.close();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
