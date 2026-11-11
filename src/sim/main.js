// Starts the simulator: reads the address, builds the concert's model, draws it, runs the loop.

import { CONCERT_BY_ID } from '../data/concerts.js';
import { VENUES } from '../data/venues/index.js';
import { buildModel, resolveSeat } from '../engine/model.js';
import { jakartaToday, nextDate, dday } from '../engine/calendar.js';
import { initLang, getLang, setLang, t, fmtDates } from '../i18n.js';
import { createScene } from './scene.js';
import { addStage } from './stage-mesh.js';
import { animU } from './figures.js';
import { createCamera } from './camera.js';
import { addCrowd } from './crowd.js';

const $ = (sel) => document.querySelector(sel);
const params = new URLSearchParams(location.search);
const debug = params.has('debug');
const THREE = window.THREE;

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

function boot() {
  initLang();
  $('#loading').textContent = t('sim.loading');
  $('#lang').addEventListener('click', () => setLang(getLang() === 'id' ? 'en' : 'id'));

  const concert = CONCERT_BY_ID[params.get('c')];
  if (!concert || !concert.sim || concert.sim.external) { showMessage('err.notfound'); return; }
  if (!window.THREE) { showFallback(); return; }

  const venueDef = VENUES[concert.venue];
  const model = buildModel(concert, venueDef);
  let ctx;
  try { ctx = createScene($('#scene'), model); } catch (e) { console.warn(e); showFallback(); return; }

  const stageView = addStage(ctx, model, concert);
  const crowd = addCrowd(ctx, model, concert.sim.theme);

  // The seat named in the address, or the default one when it names none (or nonsense)
  const first = resolveSeat(model, params.get('s'), params.get('r'), params.get('n'));
  const state = { ...first, mode: 'pov', lights: 'show', posture: 'sit', zoom: 1 };
  const cam = createCamera(ctx, model, state);

  /** Keeps the chosen seat in the address, so the exact view can be shared. */
  function writeAddress() {
    const q = new URLSearchParams(location.search);
    q.set('s', state.sec.id); q.set('r', state.row + 1); q.set('n', state.seat + 1);
    history.replaceState(null, '', `${location.pathname}?${q}${location.hash}`);
  }
  /** Sits in a seat. `go` flies there from the whole-venue view. */
  function selectSeat(sec, row, seat, { go = false, look = true } = {}) {
    if (!sec || sec.cat === 'CLOSED') return;
    const r = Math.max(0, Math.min(sec.rows.length - 1, row)), n = Math.max(0, Math.min(sec.rows[r].length / 3 - 1, seat));
    cam.setSeat(sec, r, n, look);
    crowd.setSeat(cam.seatPos);
    writeAddress();
    if (go && state.mode !== 'pov') setMode('pov', true);
  }
  function setMode(mode, fly) {
    cam.setMode(mode, fly);
    setLights(state.lights);
  }
  /** Seated or standing, for you and everyone around you. A standing block always stands. */
  function setPosture(posture) {
    cam.setPosture(posture);
    crowd.setPosture(state.posture);
  }
  /** Show or House lights, for the venue, the stage and (later) the crowd together. */
  function setLights(mode) {
    state.lights = mode === 'house' ? 'house' : 'show';
    ctx.setLights(state.lights, state.mode === 'overview');
    stageView.setLights(state.lights);
    crowd.setLights(state.lights);
    animU.uEnergy.value = state.lights === 'house' ? 0 : 1;
  }
  cam.setSeat(state.sec, state.row, state.seat);
  crowd.setSeat(cam.seatPos);
  setMode('pov', false);
  cam.bind($('#scene'), { onPick: (sec, row, seat) => selectSeat(sec, row, seat, { go: true }) });

  drawBrand(concert, venueDef);
  document.addEventListener('langchange', () => drawBrand(concert, venueDef));
  $('#brand').hidden = false;

  addEventListener('resize', ctx.resize);
  const clock = new THREE.Clock();
  function frame() {
    requestAnimationFrame(frame);
    const time = clock.getElapsedTime();
    animU.uTime.value = time;
    stageView.update(time);
    crowd.update();
    cam.apply(performance.now());
    ctx.render();
  }
  requestAnimationFrame(frame);
  $('#loading').hidden = true;

  if (debug) {
    window.__jk = {
      ready: true, model, ctx, state, cam, crowd, setLights, setMode, setPosture, selectSeat,
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
