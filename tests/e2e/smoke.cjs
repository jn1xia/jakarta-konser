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

  await browser.close();
  server.close();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
