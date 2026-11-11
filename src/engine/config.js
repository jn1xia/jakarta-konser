// Checks a concert entry and packs a simulation's settings into a link.
//
// A packed link is untrusted input: anyone can write one. unpack() refuses anything validate()
// reports, so a page that opens a packed concert only has to render its text as text.

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const COLOR = /^#[0-9a-f]{6}$/i;
const CAT_ID = /^[A-Za-z0-9_-]{1,16}$/;
const ZONES = ['behind', 'beside', 'sideNear', 'sideMid', 'sideFar', 'cornerFar', 'end'];
const RUNWAYS = ['none', 'straight', 'T'];
const MAX_TEXT = 20000, MAX_CATEGORIES = 24, MAX_TITLE = 80, MAX_NAME = 40;
// Stage sizes a link may ask for, in metres. Outside these the floor loops could run away.
const STAGE_RANGE = { width: [6, 80], depth: [4, 30], runwayLength: [0, 120], deckY: [0.5, 4] };

const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const realDate = (s) => typeof s === 'string' && DATE.test(s) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;
const isName = (n) => typeof n === 'string' ? n.length > 0 : isObj(n) && typeof n.id === 'string' && typeof n.en === 'string';

/** Problems with a concert entry, one string each; empty when it is sound. */
export function validate(concert, venues, opts = {}) {
  if (!isObj(concert)) return ['the entry is not an object'];
  const p = [];
  if (!concert.id) p.push('missing id');
  if (!concert.artist || typeof concert.artist !== 'string') p.push('missing artist');
  const dates = concert.dates;
  if (!Array.isArray(dates) || (!dates.length && !opts.custom)) p.push('missing dates');
  else for (const d of dates) if (!realDate(d)) p.push(`not a real date: ${d}`);

  let venue = null;
  if (concert.venue !== undefined) {
    if (typeof concert.venue === 'string' && has(venues, concert.venue)) venue = venues[concert.venue];
    else p.push(`unknown venue: ${concert.venue}`);
  } else if (!(concert.venueName === null || typeof concert.venueName === 'string')) {
    p.push('needs a venue or a venueName');
  }

  const sim = concert.sim;
  if (sim === null || sim === undefined) return p;
  if (!isObj(sim)) return [...p, 'sim is not an object'];
  if (has(sim, 'external')) {
    if (typeof sim.external !== 'string' || !/^https:\/\//.test(sim.external)) p.push('external must be an https address');
    return p;
  }
  if (concert.venue === undefined) p.push('a simulation needs a venue');
  if (sim.accuracy !== undefined && !['official', 'estimated'].includes(sim.accuracy)) p.push(`unknown accuracy: ${sim.accuracy}`);

  // Stage
  const stage = sim.stage === undefined ? {} : sim.stage;
  if (!isObj(stage)) p.push('stage is not an object');
  else {
    const preset = stage.preset === undefined ? 'end' : stage.preset;
    if (preset !== 'end') p.push(`unknown stage preset: ${preset}`);
    if (stage.runway !== undefined && !RUNWAYS.includes(stage.runway)) p.push(`unknown runway: ${stage.runway}`);
    for (const [key, [lo, hi]] of Object.entries(STAGE_RANGE)) {
      const v = stage[key];
      if (v !== undefined && !(typeof v === 'number' && v >= lo && v <= hi)) p.push(`stage ${key} must be between ${lo} and ${hi}`);
    }
    if (stage.towers !== undefined && ![0, 2, 4].includes(stage.towers)) p.push('stage towers must be 0, 2 or 4');
  }

  // Look
  const theme = sim.theme === undefined ? {} : sim.theme;
  if (!isObj(theme)) p.push('theme is not an object');
  else {
    for (const key of ['stick', 'accent']) if (theme[key] !== undefined && !COLOR.test(String(theme[key]))) p.push(`theme ${key} is not a #rrggbb colour`);
    if (theme.lights !== undefined && !['stick', 'phone'].includes(theme.lights)) p.push(`unknown lights: ${theme.lights}`);
  }
  if (sim.performers !== undefined && !(Number.isInteger(sim.performers) && sim.performers >= 0 && sim.performers <= 12)) p.push('performers must be a whole number from 0 to 12');

  // Categories
  const ids = new Set();
  if (!Array.isArray(sim.categories) || !sim.categories.length) p.push('missing categories');
  else for (const c of sim.categories) {
    if (!isObj(c) || typeof c.id !== 'string' || !CAT_ID.test(c.id) || c.id === 'CLOSED') { p.push(`bad category id: ${c && c.id}`); continue; }
    if (ids.has(c.id)) { p.push(`duplicate category id: ${c.id}`); continue; }
    ids.add(c.id);
    if (!isName(c.name)) p.push(`category ${c.id} has no name`);
    if (!COLOR.test(String(c.color))) p.push(`category ${c.id}: colour is not #rrggbb`);
    if (!(c.price === null || (Number.isInteger(c.price) && c.price >= 0))) p.push(`category ${c.id}: price must be null or a whole number`);
    if (c.kind !== undefined && !['seat', 'standing'].includes(c.kind)) p.push(`category ${c.id}: unknown kind ${c.kind}`);
  }
  const known = (cat, where) => { if (!ids.has(cat)) p.push(`${where} names a category that does not exist: ${cat}`); };

  // Floor bands
  const floor = sim.floor === undefined ? [] : sim.floor;
  if (!Array.isArray(floor)) p.push('floor is not a list');
  else floor.forEach((band, i) => {
    if (!isObj(band)) { p.push(`floor band ${i + 1} is not an object`); return; }
    if (!(typeof band.depth === 'number' && band.depth > 0 && Number.isFinite(band.depth))) p.push(`floor band ${i + 1}: depth must be above 0`);
    if (!Array.isArray(band.blocks) || !band.blocks.length || band.blocks.length > 8) p.push(`floor band ${i + 1}: needs 1 to 8 blocks`);
    else band.blocks.forEach((cat) => known(cat, `floor band ${i + 1}`));
  });

  // Stand rules
  const tierIds = venue ? venue.tiers.map((t) => t.id) : null;
  const stands = sim.stands === undefined ? [] : sim.stands;
  if (!Array.isArray(stands)) p.push('stands is not a list');
  else stands.forEach((rule, i) => {
    const where = `stand rule ${i + 1}`;
    if (!isObj(rule)) { p.push(`${where} is not an object`); return; }
    known(rule.cat, where);
    if (rule.tier !== undefined && tierIds && !tierIds.includes(rule.tier)) p.push(`${where} names a tier this venue lacks: ${rule.tier}`);
    if (rule.zone !== undefined && ![].concat(rule.zone).every((z) => ZONES.includes(z))) p.push(`${where}: unknown zone ${rule.zone}`);
    if (rule.side !== undefined && !['L', 'R'].includes(rule.side)) p.push(`${where}: side must be L or R`);
    if (rule.rows !== undefined && !(Array.isArray(rule.rows) && rule.rows.length === 2 && rule.rows.every(Number.isInteger) && rule.rows[0] >= 1 && rule.rows[1] >= rule.rows[0])) p.push(`${where}: rows must be [from, to]`);
  });

  // Per-section overrides
  if (sim.sections !== undefined) {
    if (!isObj(sim.sections)) p.push('sections is not an object');
    else for (const [id, cat] of Object.entries(sim.sections)) known(cat, `section ${id}`);
  }
  return p;
}

function toBase64Url(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text) {
  const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

/** The settings of one simulation as text that is safe inside an address. */
export function pack(concert) {
  return toBase64Url(JSON.stringify({ v: 1, a: concert.artist, t: concert.tour, d: concert.dates, ve: concert.venue, s: concert.sim }));
}

const cut = (v, n) => String(v === undefined || v === null ? '' : v).slice(0, n);

/** Reads a packed link back into a concert entry, or says why it cannot. */
export function unpack(text, venues) {
  const fail = (error) => ({ ok: false, error });
  if (typeof text !== 'string' || !text.length) return fail('empty');
  if (text.length > MAX_TEXT) return fail('too long');
  if (!/^[A-Za-z0-9_-]+$/.test(text)) return fail('not base64url');
  let data;
  try { data = JSON.parse(fromBase64Url(text)); } catch (e) { return fail('not readable'); }
  if (!isObj(data) || data.v !== 1) return fail('unknown version');
  if (!isObj(data.s)) return fail('no settings');
  if (has(data.s, 'external')) return fail('external links cannot be packed');
  if (Array.isArray(data.s.categories) && data.s.categories.length > MAX_CATEGORIES) return fail('too many categories');

  const sim = JSON.parse(JSON.stringify(data.s));              // a copy with plain prototypes
  if (Array.isArray(sim.categories)) {
    for (const c of sim.categories) {
      if (!isObj(c)) continue;
      if (typeof c.name === 'string') c.name = c.name.slice(0, MAX_NAME);
      else if (isObj(c.name)) c.name = { id: cut(c.name.id, MAX_NAME), en: cut(c.name.en, MAX_NAME) };
    }
  }
  const concert = {
    id: 'custom', custom: true,
    artist: cut(data.a, MAX_TITLE), tour: cut(data.t, MAX_TITLE),
    dates: Array.isArray(data.d) ? data.d : [],
    venue: data.ve, sim
  };
  const problems = validate(concert, venues, { custom: true });
  return problems.length ? fail(problems.join('; ')) : { ok: true, concert };
}
