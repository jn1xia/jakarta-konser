// The hub: a calendar of every upcoming Jakarta show. Cards for shows the engine can draw open
// the simulator; BTS and BIGBANG open their own sites. Everything is built with textContent,
// so nothing in the data is ever read as markup.

import { CONCERTS, DATA_CHECKED } from './data/concerts.js';
import { VENUES } from './data/venues/index.js';
import { jakartaToday, upcoming, nextDate, dday, groupByMonth } from './engine/calendar.js';
import { initLang, getLang, setLang, t, fmtRp, fmtDates, fmtMonth, fmtCount } from './i18n.js';
import { countVisit } from './counter.js';
import { openSupport } from './support.js';

const $ = (sel) => document.querySelector(sel);
const params = new URLSearchParams(location.search);
// ?debug&today=YYYY-MM-DD lets the browser test look at the calendar on a chosen day
const forced = params.has('debug') && /^\d{4}-\d{2}-\d{2}$/.test(params.get('today') || '') ? params.get('today') : null;
const today = forced || jakartaToday();

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'data') Object.assign(node.dataset, v);
    else node.setAttribute(k, v);
  }
  for (const child of [].concat(children)) if (child) node.append(child);
  return node;
}

const venueKey = (c) => c.venue || c.venueName || '';
const venueName = (c) => (c.venue ? VENUES[c.venue].name : c.venueName);

function simLink(c) {
  if (!c.sim) return null;
  if (c.sim.external) return { href: c.sim.external, external: true };
  return { href: `sim.html?c=${encodeURIComponent(c.id)}${getLang() === 'en' ? '&lang=en' : ''}`, external: false };
}

function priceLine(c) {
  if (c.priceFrom && c.priceTo) return `${fmtRp(c.priceFrom)} – ${fmtRp(c.priceTo)}`;
  if (c.priceFrom) return t('hub.from', { price: fmtRp(c.priceFrom) });
  if (c.priceTo) return t('hub.upto', { price: fmtRp(c.priceTo) });
  return t('price.none');
}

function card(c) {
  const link = simLink(c);
  const linkProps = link ? { href: link.href, target: link.external ? '_blank' : null, rel: link.external ? 'noopener' : null } : null;
  const kind = link ? '3d' : venueName(c) === null ? 'novenue' : 'list';
  const days = dday(nextDate(c, today), today);
  const title = el('h3', { class: 'card-title' }, link ? el('a', { ...linkProps, text: c.artist }) : document.createTextNode(c.artist));

  return el('article', { class: `card${link ? ' has-sim' : ''}`, id: c.id, data: { id: c.id } }, [
    el('p', { class: 'card-when' }, [
      el('span', { class: 'date', text: fmtDates(c.dates) }),
      el('span', { class: 'dday', text: days === 0 ? t('hub.today') : t('hub.dday', { n: days }) })
    ]),
    title,
    el('p', { class: 'card-tour', text: c.tour }),
    el('p', { class: 'card-where' }, [
      el('span', { class: 'venue', text: venueName(c) === null ? t('badge.novenue') : venueName(c) }),
      c.promoter ? el('span', { class: 'promoter', text: c.promoter }) : null
    ]),
    el('p', { class: 'card-price' }, [
      el('span', { text: priceLine(c) }),
      c.soldOut ? el('span', { class: 'chip', text: t('hub.soldout') }) : null
    ]),
    el('p', { class: 'card-foot' }, [
      el('span', { class: 'badge', data: { kind }, text: t(`badge.${kind}`) }),
      c.confidence === 'single-source' ? el('span', { class: 'note', text: t('hub.single') }) : null,
      link ? el('a', { ...linkProps, class: 'open', text: `${t(link.external ? 'hub.openExternal' : 'hub.open')} →` }) : null
    ])
  ]);
}

function fillVenues(shows) {
  const select = $('#fvenue'), chosen = select.value;
  const seen = new Map();
  for (const c of shows) if (venueKey(c)) seen.set(venueKey(c), venueName(c));
  const options = [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  select.replaceChildren(
    el('option', { value: '', text: t('hub.allVenues') }),
    ...options.map(([value, text]) => el('option', { value, text }))
  );
  select.value = seen.has(chosen) ? chosen : '';
}

let visitors = null;                                         // stays null unless the counter answers
function drawVisitors() {
  $('#visitors').hidden = visitors === null;
  if (visitors !== null) $('#visitorText').textContent = t('hub.visitors', { n: fmtCount(visitors) });
}

function render() {
  const all = upcoming(CONCERTS, today);
  fillVenues(all);
  const only3d = $('#f3d').checked, venue = $('#fvenue').value;
  const shown = all.filter((c) => (!only3d || c.sim) && (!venue || venueKey(c) === venue));

  $('#lang').textContent = t('lang.other');
  $('#lang').setAttribute('aria-label', t('lang.label'));
  $('#tagline').textContent = t('site.tagline');
  $('#sub').textContent = t('site.sub');
  $('#count').textContent = t('hub.count', { n: all.length });
  $('#f3dLabel').textContent = t('hub.filter3d');
  $('#fvenueLabel').textContent = t('hub.filterVenue');
  $('#fine').textContent = t('fine.hub');
  $('#support').textContent = t('support.button');
  $('#supportLine').textContent = t('support.line');
  $('#checked').textContent = t('hub.checked', { date: fmtDates([DATA_CHECKED]) });
  $('#sources').textContent = t('hub.sources');
  $('#filters').hidden = all.length === 0;
  drawVisitors();

  $('#list').replaceChildren(...groupByMonth(shown, today).map((g) =>
    el('section', { class: 'month' }, [
      el('h2', { class: 'month-name', text: fmtMonth(g.month) }),
      el('div', { class: 'grid' }, g.shows.map(card))
    ])
  ));
  // A link such as index.html#txt-jakarta-2027 points at one card
  const wanted = decodeURIComponent(location.hash.slice(1));
  const target = wanted && [...document.querySelectorAll('.card')].find((c) => c.dataset.id === wanted);
  if (target) {
    target.classList.add('is-target');
    if (!render.arrived) { render.arrived = true; target.scrollIntoView({ block: 'center' }); }
  }
  const empty = $('#empty');
  empty.hidden = shown.length > 0;
  empty.textContent = all.length ? t('hub.noMatch') : t('hub.empty');
}

initLang();
$('#lang').addEventListener('click', () => setLang(getLang() === 'id' ? 'en' : 'id'));
$('#f3d').addEventListener('change', render);
$('#support').addEventListener('click', openSupport);
$('#supportLine').addEventListener('click', openSupport);
$('#fvenue').addEventListener('change', render);
$('#filters').addEventListener('submit', (e) => e.preventDefault());
document.addEventListener('langchange', render);
countVisit({
  hostname: location.hostname,
  fetch: (url, options) => fetch(url, options),
  storage: { getItem: (k) => localStorage.getItem(k), setItem: (k, v) => localStorage.setItem(k, v) }
}).then((n) => { visitors = n; drawVisitors(); });
addEventListener('hashchange', () => { render.arrived = false; render(); });
render();
