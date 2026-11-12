// Shared by the posters: picks the size from ?size=, fills the numbers from the site's own data
// (so a poster never claims more than the site has), and checks the layout before it is saved.

import { CONCERTS } from '../../src/data/concerts.js';
import { upcoming, jakartaToday } from '../../src/engine/calendar.js';

const size = new URLSearchParams(location.search).get('size') === 'wide' ? 'wide' : 'feed';
document.documentElement.dataset.size = size;

const today = jakartaToday();
const soon = upcoming(CONCERTS, today);
const in3d = soon.filter((c) => c.sim);
const engine = in3d.filter((c) => !c.sim.external);
// ICE BSD's two halls are one venue
const venues = new Set(engine.map((c) => c.venue.replace(/-\d.*$/, '')));
// Rounded down to the nearest five, so the poster stays true for a while as shows pass
const listed = soon.length >= 10 ? `${Math.floor(soon.length / 5) * 5}+` : String(soon.length);

/** Display names in date order, with the big stadium shows first. */
const BIG = ['bts-gbk-2026', 'bigbang-jis-2027', 'enhypen-jis-2027', 'westlife-gbk-2027', 'maroon5-jis-2027', 'mcr-jis-2026'];
const names = [...BIG.filter((id) => in3d.some((c) => c.id === id)).map((id) => in3d.find((c) => c.id === id)),
  ...in3d.filter((c) => !BIG.includes(c.id))].map((c) => c.artist.replace(/ \(.*\)$/, ''));
const SHOW = 8;                                                 // names that fit two lines
const named = names.length > SHOW ? [...names.slice(0, SHOW), `+${names.length - SHOW} lainnya`] : names;

export const facts = { size, sims: in3d.length, venues: venues.size, listed, names: named };

for (const el of document.querySelectorAll('[data-fact]')) {
  const v = facts[el.dataset.fact];
  // A name never breaks across lines: its own spaces become non-breaking ones
  el.textContent = Array.isArray(v) ? v.map((n) => n.replace(/ /g, '\u00a0')).join('  ·  ') : String(v);
}

/** Everything that would spoil the poster: text that does not fit its box, or a block off the edge. */
function check() {
  const problems = [], W = innerWidth, H = innerHeight;
  for (const el of document.querySelectorAll('[data-fit]')) {
    if (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) {
      problems.push(`text does not fit: ${el.dataset.fit} (${el.scrollWidth}x${el.scrollHeight} in ${el.clientWidth}x${el.clientHeight})`);
    }
  }
  for (const el of document.querySelectorAll('[data-keep-in]')) {
    const r = el.getBoundingClientRect();
    if (r.left < -1 || r.top < -1 || r.right > W + 1 || r.bottom > H + 1) {
      problems.push(`off the poster: ${el.dataset.keepIn} (${Math.round(r.left)},${Math.round(r.top)} to ${Math.round(r.right)},${Math.round(r.bottom)})`);
    }
  }
  for (const img of document.images) if (!img.complete || !img.naturalWidth) problems.push(`image missing: ${img.getAttribute('src')}`);
  return problems;
}

Promise.all([document.fonts.ready, ...[...document.images].map((img) => img.decode().catch(() => {}))])
  .then(() => { window.__poster = { ready: true, check, facts }; });
