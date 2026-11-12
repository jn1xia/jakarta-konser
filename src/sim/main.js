// Starts the simulator: reads the address, builds the concert's model, draws it, runs the loop.

import { CONCERT_BY_ID } from '../data/concerts.js';
import { VENUES } from '../data/venues/index.js';
import { buildModel, resolveSeat } from '../engine/model.js';
import { validate, unpack } from '../engine/config.js';
import { jakartaToday, nextDate, dday } from '../engine/calendar.js';
import { initLang, getLang, setLang, t, fmtDates } from '../i18n.js';
import { createScene } from './scene.js';
import { addStage } from './stage-mesh.js';
import { animU } from './figures.js';
import { createCamera } from './camera.js';
import { addCrowd } from './crowd.js';
import { computeFacts } from './facts.js';
import { createPanel } from './panel.js';

const $ = (sel) => document.querySelector(sel);
const params = new URLSearchParams(location.search);
const debug = params.has('debug');
const THREE = window.THREE;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Replaces the simulator with a short message and a way back to the concert list. */
function showMessage(key) {
  const draw = () => {
    $('#messageTitle').textContent = t(key);
    $('#messageLink').textContent = `← ${t('sim.toHub')}`;
  };
  draw();
  document.addEventListener('langchange', draw);
  $('#loading').hidden = true;
  $('#message').hidden = false;
}

function showFallback() {
  $('#fallbackText').textContent = t('sim.nowebgl');
  $('#loading').hidden = true;
  $('#fallback').hidden = false;
}

/** The title block in the corner: artist, tour, venue, dates, countdown, accuracy. */
function drawBrand(concert, venueDef) {
  const today = jakartaToday(), next = nextDate(concert, today);
  $('#back').textContent = `← ${t('sim.back')}`;
  $('#back').href = `index.html${getLang() === 'en' ? '?lang=en' : ''}`;
  $('#lang').textContent = t('lang.other');
  $('#lang').setAttribute('aria-label', t('lang.label'));
  $('#eyebrow').textContent = t('sim.eyebrow');
  $('#artist').textContent = concert.artist;
  $('#tour').textContent = concert.tour || '';
  $('#tour').hidden = !concert.tour;
  $('#venueName').textContent = venueDef.name;
  $('#dates').textContent = concert.dates.length ? fmtDates(concert.dates) : '';
  const days = next ? dday(next, today) : -1;
  $('#dday').hidden = days < 0;
  if (days >= 0) $('#dday').textContent = days === 0 ? t('hub.today') : t('hub.dday', { n: days });
  const custom = !!concert.custom;
  $('#accuracy').textContent = custom ? t('fan.made') : t(concert.sim.accuracy === 'official' ? 'acc.official' : 'acc.estimated');
  $('#accuracy').dataset.kind = custom ? 'fan' : concert.sim.accuracy === 'official' ? 'official' : 'estimated';
  $('#scene').setAttribute('aria-label', t('sim.canvas', { venue: venueDef.name }));
  document.title = `${concert.artist} · ${venueDef.short} · Jakarta Konser`;
}

/**
 * The concert this address asks for, or null after showing why there is none. A packed link
 * (#k=...) carries its own settings and wins; otherwise ?c= names a show from the site's data.
 */
function findConcert() {
  const packed = /^#k=(.*)$/.exec(location.hash);
  if (packed) {
    const got = unpack(packed[1], VENUES);
    if (!got.ok) { console.warn('Packed link refused:', got.error); showMessage('err.link'); return null; }
    return got.concert;
  }
  const id = params.get('c');
  const concert = id && Object.prototype.hasOwnProperty.call(CONCERT_BY_ID, id) ? CONCERT_BY_ID[id] : null;
  if (!concert) { showMessage('err.notfound'); return null; }
  if (!concert.sim) { location.replace(`index.html#${encodeURIComponent(concert.id)}`); return null; }   // listed, not simulated
  if (concert.sim.external) { location.replace(concert.sim.external); return null; }                    // BTS, BIGBANG
  const problems = validate(concert, VENUES);
  if (problems.length) { console.error(`Concert "${concert.id}" has bad data:`, problems); showMessage('err.data'); return null; }
  return concert;
}

function boot() {
  initLang();
  $('#loading').textContent = t('sim.loading');
  $('#lang').addEventListener('click', () => setLang(getLang() === 'id' ? 'en' : 'id'));

  const concert = findConcert();
  if (!concert) return;
  if (!window.THREE) { showFallback(); return; }

  const venueDef = VENUES[concert.venue];
  // Anything that goes wrong while building ends in a message, never an endless loader
  const broken = (err) => { console.error(err); showMessage(concert.custom ? 'err.link' : 'err.data'); };
  let model;
  try { model = buildModel(concert, venueDef); } catch (e) { broken(e); return; }
  if (!model.defaultSeat) { broken(new Error('Nothing is on sale: no open seat or standing place')); return; }
  let ctx;
  try { ctx = createScene($('#scene'), model); } catch (e) { console.warn(e); showFallback(); return; }
  try { start(concert, venueDef, model, ctx); } catch (e) { broken(e); }
}

/** Everything after the scene exists: stage, crowd, camera, panel, the loop. */
function start(concert, venueDef, model, ctx) {

  const stageView = addStage(ctx, model, concert, { reduceMotion });
  const crowd = addCrowd(ctx, model, concert.sim.theme);

  // The seat named in the address, or the default one when it names none (or nonsense)
  const first = resolveSeat(model, params.get('s'), params.get('r'), params.get('n'));
  const state = { ...first, mode: 'pov', lights: 'show', posture: 'sit', zoom: 1 };
  const cam = createCamera(ctx, model, state);
  let panel = null, lit = null;

  /** Recomputes the seat facts and redraws the panel and the highlighted section. */
  function refresh() {
    if (panel) panel.update(state, computeFacts(ctx, model, cam.eyePos), cam.seatPos);
    const mesh = ctx.meshOf.get(state.sec) || null;
    if (lit && lit !== mesh) lit.material.emissive.setHex(0x000000);
    if (mesh) mesh.material.emissive.set(model.cats[state.sec.cat].color).multiplyScalar(0.28);
    lit = mesh;
  }

  /** Keeps the chosen seat in the address, so the exact view can be shared. */
  function writeAddress() {
    const q = new URLSearchParams(location.search);
    q.set('s', state.sec.id); q.set('r', state.row + 1); q.set('n', state.seat + 1);
    history.replaceState(null, '', `${location.pathname}?${q}${location.hash}`);
  }

  /**
   * Sits in a seat. A missing row or seat means "a fair one": a little way up, in the middle.
   * `go` flies there from the whole-venue view; `instant` skips the glide between seats.
   */
  function selectSeat(sec, row, seat, { go = false, instant = false, keepSide = false } = {}) {
    if (!sec || sec.cat === 'CLOSED') return;
    const missing = (v) => v === null || v === undefined;
    const rows = sec.rows.length;
    const r = Math.max(0, Math.min(rows - 1, missing(row) ? Math.floor(rows * (sec.kind === 'stand' ? 0.4 : 0.35)) : row));
    const count = sec.rows[r].length / 3;
    let n = missing(seat) ? Math.floor(count / 2) : seat;
    if (keepSide && sec === state.sec && missing(seat)) {      // stay the same way along the row
      const before = state.sec.rows[state.row].length / 3;
      n = Math.round((state.seat / Math.max(1, before - 1)) * (count - 1));
    }
    cam.setSeat(sec, r, Math.max(0, Math.min(count - 1, n)));
    crowd.setSeat(cam.seatPos);
    writeAddress();
    refresh();
    if (go && state.mode !== 'pov') setMode('pov', true);
    else cam.glide(instant);
  }

  /** Show or House lights, for the venue, the stage and the crowd together. */
  function setLights(mode) {
    state.lights = mode === 'house' ? 'house' : 'show';
    ctx.setLights(state.lights, state.mode === 'overview');
    stageView.setLights(state.lights);
    crowd.setLights(state.lights);
    animU.uEnergy.value = state.lights === 'house' ? 0 : 1;
    if (panel) panel.sync(state);
  }
  function setMode(mode, fly) {
    cam.setMode(mode, fly);
    crowd.showFigures(state.mode === 'pov');
    setLights(state.lights);
    if (panel) panel.showTip(null);
  }
  /** Seated or standing, for you and everyone around you. A standing block always stands. */
  function setPosture(posture) {
    cam.setPosture(posture);
    crowd.setPosture(state.posture);
    refresh();
  }
  function setZoom(zoom) {
    cam.setZoom(zoom);
    if (panel) panel.sync(state);
  }

  panel = createPanel(model, concert, {
    onSeat: selectSeat,
    onMode: (mode) => { if (mode !== state.mode) setMode(mode, true); },
    onZoom: setZoom,
    onLights: setLights,
    onPosture: setPosture
  });

  cam.setSeat(state.sec, state.row, state.seat);
  crowd.setSeat(cam.seatPos);
  setMode('pov', false);
  refresh();
  cam.bind($('#scene'), {
    onPick: (sec, row, seat) => selectSeat(sec, row, seat, { go: true }),
    onChange: () => panel.sync(state),
    onHover: (sec, x, y) => panel.showTip(sec, x, y)
  });

  drawBrand(concert, venueDef);
  document.addEventListener('langchange', () => { drawBrand(concert, venueDef); panel.relabel(); refresh(); });
  $('#brand').hidden = false;

  addEventListener('resize', ctx.resize);
  const clock = new THREE.Clock();
  function frame() {
    requestAnimationFrame(frame);
    const time = clock.getElapsedTime();
    animU.uTime.value = reduceMotion ? 0 : time;               // reduced motion: the crowd and performers hold still
    stageView.update(time);
    crowd.update();
    cam.apply(performance.now());
    ctx.render();
  }
  requestAnimationFrame(frame);
  $('#loading').hidden = true;

  if (debug) {
    window.__jk = {
      ready: true, model, ctx, state, cam, crowd, panel, setLights, setMode, setPosture, setZoom, selectSeat,
      motion: () => ({ crowd: animU.uTime.value, sweep: stageView.sweep() }),
      /** Draws one frame and counts the different colours on a 64 x 64 grid of its pixels. */
      pixelStats() {
        cam.apply(performance.now()); ctx.render();
        const gl = ctx.renderer.getContext(), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
        const px = new Uint8Array(w * h * 4);
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
        const seen = new Set();
        for (let j = 0; j < 64; j++) for (let i = 0; i < 64; i++) {
          const k = (Math.floor(((j + 0.5) * h) / 64) * w + Math.floor(((i + 0.5) * w) / 64)) * 4;
          seen.add(((px[k] >> 2) << 12) | ((px[k + 1] >> 2) << 6) | (px[k + 2] >> 2));
        }
        return { distinct: seen.size };
      }
    };
  }
}

boot();
