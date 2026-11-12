// A quiet note in the simulator that the site can be supported through QRIS. It appears a few
// seconds after a simulation opens, goes away by itself, and is rationed per browser: at most
// once a day, not for a week after it is closed, not for a month after the QRIS is opened.
// This file loads in Node for the tests, so the page is only touched inside functions.

import { t } from './i18n.js';

const H = 3600 * 1000, D = 24 * H;
export const NUDGE = { delay: 8000, visible: 12000, every: D, afterClose: 7 * D, afterOpen: 30 * D, key: 'jk.nudge.v1' };

const when = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : -Infinity);

/** Whether the note may appear now, given what this browser remembers ({ shown, dismissed, opened }). */
export function shouldNudge(record, now) {
  const r = record && typeof record === 'object' ? record : {};
  if (now - when(r.opened) < NUDGE.afterOpen) return false;
  if (now - when(r.dismissed) < NUDGE.afterClose) return false;
  return now - when(r.shown) >= NUDGE.every;
}

function read() {
  try { return JSON.parse(localStorage.getItem(NUDGE.key) || '{}') || {}; } catch (e) { return null; }
}
function remember(field) {
  try {
    const r = read() || {};
    r[field] = Date.now();
    localStorage.setItem(NUDGE.key, JSON.stringify(r));
  } catch (e) { /* storage blocked: nothing to remember */ }
}

/** Called whenever the QRIS window opens, from anywhere, so the note stays away for a month. */
export const rememberOpened = () => remember('opened');

/**
 * Schedules the note. `open` opens the QRIS window. With storage blocked the note never shows,
 * since it could not keep its promise to stay away.
 */
export function scheduleNudge({ open, delay = NUDGE.delay, visible = NUDGE.visible }) {
  const record = read();
  if (record === null || !shouldNudge(record, Date.now())) return;
  setTimeout(() => {
    if (!shouldNudge(read() || {}, Date.now())) return;           // the QRIS may have been opened meanwhile
    remember('shown');
    const note = document.createElement('div');
    note.id = 'nudge'; note.className = 'nudge'; note.setAttribute('role', 'status');
    const text = document.createElement('span');
    const go = document.createElement('button'); go.type = 'button'; go.className = 'nudge-open';
    const close = document.createElement('button'); close.type = 'button'; close.className = 'nudge-close';
    close.textContent = '×';
    note.append(text, go, close);
    const label = () => {
      text.textContent = t('nudge.text');
      go.textContent = t('nudge.open');
      close.setAttribute('aria-label', t('nudge.close'));
    };
    label();
    document.addEventListener('langchange', label);
    document.body.append(note);

    let timer = 0;
    const hide = () => {
      clearTimeout(timer);
      note.classList.remove('on');
      document.removeEventListener('langchange', label);
      setTimeout(() => note.remove(), 400);
    };
    go.addEventListener('click', () => { hide(); open(); });
    close.addEventListener('click', () => { remember('dismissed'); hide(); });
    requestAnimationFrame(() => note.classList.add('on'));
    timer = setTimeout(hide, visible);
  }, delay);
}
