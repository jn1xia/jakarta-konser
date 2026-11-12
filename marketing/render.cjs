'use strict';
// Renders the promotional posters. Run with `npm run posters`.
//
// 1. Takes fresh screenshots of the site (served from this repository) into marketing/shots/.
//    Add --skip-shots to reuse the last ones.
// 2. Opens each poster page at each size and saves it to marketing/out/ at twice the pixel size,
//    after checking that nothing spills out of its box or off the poster.
//
// Posters:  promo (what the site is) and howto (four steps), each as
//           feed (Instagram 4:5, 1080 x 1350) and wide (X 16:9, 1600 x 900).

const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = path.join(__dirname, 'shots');
const OUT = path.join(__dirname, 'out');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };
const SIZES = { feed: [1080, 1350], wide: [1600, 900] };
const POSTERS = ['promo', 'howto'];
const SCALE = 2;
const SEAT = 's=L-08&r=10&n=12';          // a lower-tier seat at ENHYPEN with a good view of the stage

function serve() {
  const server = http.createServer((req, res) => {
    let file = path.normalize(path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
    if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

/** Width and height from a PNG's header. */
function pngSize(file) {
  const b = fs.readFileSync(file);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

const HIDE_UI = '.brand,.panel,.tip{display:none!important}';
const HIDE_ALL = HIDE_UI + '.dock{display:none!important}';

async function takeShots(browser, base) {
  fs.mkdirSync(SHOTS, { recursive: true });
  const page = async (viewport, scale) => {
    const context = await browser.newContext({ viewport, deviceScaleFactor: scale });
    return { context, page: await context.newPage() };
  };
  const ready = (p) => p.waitForFunction(() => window.__jk && window.__jk.ready, null, { timeout: 60000 });
  const settle = (p, ms = 2500) => p.waitForTimeout(ms);
  // With the panel hidden, the view no longer needs to sit left of it
  const centre = (p) => p.evaluate(() => { const c = window.__jk.ctx.camera; c.clearViewOffset(); c.updateProjectionMatrix(); });

  // A phone in a fan's hand: the seat view with the panel folded away
  {
    const { context, page: p } = await page({ width: 390, height: 844 }, 3);
    await p.goto(`${base}/sim.html?c=enhypen-jis-2027&debug&${SEAT}`); await ready(p); await settle(p, 3000);
    await p.screenshot({ path: path.join(SHOTS, 'phone.png') });
    await context.close();
  }
  // The whole of GBK from above, without the interface
  {
    const { context, page: p } = await page({ width: 1600, height: 1000 }, 2);
    await p.goto(`${base}/sim.html?c=westlife-gbk-2027&debug`); await ready(p);
    await p.addStyleTag({ content: HIDE_ALL });
    await p.evaluate(() => window.__jk.setMode('overview', false)); await centre(p); await settle(p);
    await p.screenshot({ path: path.join(SHOTS, 'venue.png') });
    await context.close();
  }
  // Desktop: the seat view with the control dock, the seat panel's top and its map
  {
    const { context, page: p } = await page({ width: 1280, height: 800 }, 2);
    await p.goto(`${base}/sim.html?c=enhypen-jis-2027&debug&${SEAT}`); await ready(p); await settle(p);
    await p.locator('.now').screenshot({ path: path.join(SHOTS, 'now.png') });
    await p.locator('section.block[aria-labelledby="h-pick"]').screenshot({ path: path.join(SHOTS, 'pick.png') });
    await p.addStyleTag({ content: HIDE_UI }); await centre(p); await settle(p, 800);
    await p.screenshot({ path: path.join(SHOTS, 'seat.png') });
    await context.close();
  }
  // One card from the concert list
  {
    const { context, page: p } = await page({ width: 1280, height: 900 }, 2);
    await p.goto(`${base}/index.html?debug&today=2026-11-12`); await p.waitForSelector('.card');
    await p.evaluate(() => document.fonts.ready);
    await p.locator('.card[data-id="enhypen-jis-2027"]').screenshot({ path: path.join(SHOTS, 'card.png') });
    await context.close();
  }
  console.log('shots   phone, venue, now, pick, seat, card');
}

(async () => {
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  let failed = 0;
  try {
    if (!process.argv.includes('--skip-shots')) await takeShots(browser, base);
    fs.mkdirSync(OUT, { recursive: true });
    for (const name of POSTERS) {
      for (const [size, [w, h]] of Object.entries(SIZES)) {
        const context = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: SCALE });
        const p = await context.newPage();
        const errors = [];
        p.on('pageerror', (e) => errors.push(e.message));
        p.on('response', (r) => { if (r.url().startsWith(base) && r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
        await p.goto(`${base}/marketing/posters/${name}.html?size=${size}`);
        await p.waitForFunction(() => window.__poster && window.__poster.ready, null, { timeout: 30000 });
        const problems = [...errors, ...(await p.evaluate(() => window.__poster.check()))];
        const file = path.join(OUT, `${name}-${size}.png`);
        await p.screenshot({ path: file });
        const [pw, ph] = pngSize(file);
        if (pw !== w * SCALE || ph !== h * SCALE) problems.push(`saved at ${pw} x ${ph}, wanted ${w * SCALE} x ${h * SCALE}`);
        console.log(`${problems.length ? 'FAIL' : 'ok  '}    ${path.relative(ROOT, file)}  ${pw} x ${ph}${problems.length ? '\n        ' + problems.join('\n        ') : ''}`);
        failed += problems.length ? 1 : 0;
        await context.close();
      }
    }
  } finally {
    await browser.close();
    server.close();
  }
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
