// Starts the simulator: reads the address, builds the concert's model, draws it, runs the loop.

import { CONCERT_BY_ID } from '../data/concerts.js';
import { VENUES } from '../data/venues/index.js';
import { buildModel } from '../engine/model.js';
import { jakartaToday, nextDate, dday } from '../engine/calendar.js';
import { initLang, getLang, setLang, t, fmtDates } from '../i18n.js';
import { createScene } from './scene.js';

const $ = (sel) => document.querySelector(sel);
const params = new URLSearchParams(location.search);
const debug = params.has('debug');

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

  const state = { ...model.defaultSeat, mode: 'overview', lights: 'show', posture: 'sit', zoom: 1 };
  ctx.setLights(state.lights, true);

  drawBrand(concert, venueDef);
  document.addEventListener('langchange', () => drawBrand(concert, venueDef));
  $('#brand').hidden = false;

  addEventListener('resize', ctx.resize);
  function frame() {
    requestAnimationFrame(frame);
    ctx.render();
  }
  requestAnimationFrame(frame);
  $('#loading').hidden = true;

  if (debug) {
    window.__jk = {
      ready: true, model, ctx, state,
      /** Draws one frame and counts the different colours on a 64 x 64 grid of its pixels. */
      pixelStats() {
        ctx.render();
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
