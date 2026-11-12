// The seat panel, the scale map, the control dock and the hover tip. All text is set with
// textContent, so names from the concert data (or a packed link) are never read as markup.

import { verdictKeys } from '../engine/verdict.js';
import { t, tx, fmtPrice, fmtCount } from '../i18n.js';
import { openSupport } from '../support.js';

const $ = (sel) => document.querySelector(sel);
const SVG = 'http://www.w3.org/2000/svg';
const FACTS = ['f.edge', 'f.screen', 'f.height', 'f.angle', 'f.vis', 'f.tv', 'f.perf'];

function node(tag, props = {}, children = []) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else e.setAttribute(k, v);
  }
  for (const c of [].concat(children)) if (c) e.append(c);
  return e;
}
function svg(tag, attrs, parent) {
  const e = document.createElementNS(SVG, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
const press = (el, on) => el.setAttribute('aria-pressed', on ? 'true' : 'false');

export function createPanel(model, concert, handlers) {
  const { venue, stage, cats, catOrder, sections } = model;
  const o = venue.outline;
  const open = sections.filter((s) => s.cat !== 'CLOSED');
  const standing = (s) => s.kind === 'floor' && s.standing;

  /* Names */
  const bandsOf = {};                                           // tier id -> how many row bands it has
  for (const s of sections) if (s.kind === 'stand') bandsOf[s.tier.id] = Math.max(bandsOf[s.tier.id] || 1, s.band || 1);
  const sharedBlocks = (s) => sections.filter((x) => x.kind === 'floor' && x.band === s.band && x.cat === s.cat).length;
  /** The category as this section's ticket would name it: "CAT 6 A", "VIP B". */
  function catLabel(s) {
    const c = cats[s.cat], name = tx(c.name);
    if (s.kind === 'floor') return sharedBlocks(s) > 1 ? `${name} ${s.letter}` : name;
    return c.ab ? `${name} ${s.side === 'L' ? 'A' : 'B'}` : name;
  }
  function secTitle(s) {
    if (s.kind === 'floor') return catLabel(s);
    let title = t('sec.stand', { tier: tx(s.tier.name), n: s.sector });
    if (s.band) title += ` · ${bandsOf[s.tier.id] === 2 ? t(s.band === 1 ? 'sec.front' : 'sec.back') : t('sec.rows', { a: s.r0 + 1, b: s.r1 })}`;
    return title;
  }

  /* Category list: click a category to sit in it */
  const catList = $('#catList');
  /** A fair example of a category: its section nearest the far-end centre, a little way up. */
  function representative(catId) {
    const mine = open.filter((s) => s.cat === catId), { halfZ } = venue.def.floor;
    const away = (s) => (s.kind === 'floor' ? Math.hypot((s.x0 + s.x1) / 2, (s.z0 + s.z1) / 2 - halfZ) : (() => { const p = o.ring((s.u0 + s.u1) / 2, s.tier.d0); return Math.hypot(p.x, p.z - halfZ); })());
    return mine.sort((a, b) => away(a) - away(b))[0];
  }
  function drawCats() {
    catList.replaceChildren(...catOrder.filter((id) => model.stats.byCat[id]).map((id) => {
      const c = cats[id];
      const b = node('button', { type: 'button', class: 'cat', 'data-cat': id }, [
        node('span', { class: 'sw', style: `background:${c.color}` }),
        node('span', { class: 'nm', text: tx(c.name) + (c.ab ? ' A/B' : '') }),
        node('span', { class: 'pr', text: fmtPrice(c.price) }),
        node('span', { class: 'wh', text: `${t(c.kind === 'standing' ? 'kind.standing' : 'kind.seat')} · ${t('panel.places', { n: fmtCount(model.stats.byCat[id]) })}` })
      ]);
      b.addEventListener('click', () => handlers.onSeat(representative(id), null, null, { go: true }));
      return node('li', {}, b);
    }));
  }

  /* Section list, grouped by category */
  const secSel = $('#secSel');
  function drawSections() {
    secSel.replaceChildren(...catOrder.map((id) => {
      const mine = open.filter((s) => s.cat === id);
      if (!mine.length) return null;
      const group = node('optgroup', { label: `${tx(cats[id].name)} · ${fmtPrice(cats[id].price)}` });
      for (const s of mine) group.append(node('option', { value: s.id, text: secTitle(s) }));
      return group;
    }).filter(Boolean));
  }
  secSel.addEventListener('change', () => handlers.onSeat(model.byId[secSel.value], null, null, {}));
  const rowIn = $('#rowIn'), seatIn = $('#seatIn');
  rowIn.addEventListener('input', () => handlers.onSeat(current.sec, Number(rowIn.value) - 1, null, { instant: true, keepSide: true }));
  seatIn.addEventListener('input', () => handlers.onSeat(current.sec, current.row, Number(seatIn.value) - 1, { instant: true }));

  /* Map, drawn to scale: stage at the top, every section where it really is */
  const map = $('#map'), mapSecs = {};
  let mapPin;
  {
    let lim = 0;
    const paths = sections.map((s) => {
      let pts;
      if (s.kind === 'floor') pts = s.poly;
      else {
        const us = o.sampleU(s.u0 + 0.3, s.u1 - 0.3, 1.5), dIn = s.tier.d0 + s.r0 * s.tier.depth, dOut = s.tier.d0 + s.r1 * s.tier.depth - 0.4;
        pts = us.map((u) => o.ring(u, dIn)).concat(us.map((u) => o.ring(u, dOut)).reverse()).map((p) => [p.x, p.z]);
      }
      for (const [x, z] of pts) lim = Math.max(lim, Math.abs(x), Math.abs(z));
      return [s, pts];
    });
    lim = Math.ceil(Math.max(lim, -stage.backZ + 2) + 3);
    map.setAttribute('viewBox', `${-lim} ${-lim} ${2 * lim} ${2 * lim}`);
    for (const [s, pts] of paths) {
      const p = svg('path', { d: `M${pts.map(([x, z]) => `${x.toFixed(1)} ${z.toFixed(1)}`).join('L')}Z`, fill: cats[s.cat].color, class: `sec${s.cat === 'CLOSED' ? ' shut' : ''}` }, map);
      p.dataset.id = s.id; mapSecs[s.id] = p;
    }
    for (const poly of stage.footprint) svg('path', { d: `M${poly.map(([x, z]) => `${x.toFixed(1)} ${z.toFixed(1)}`).join('L')}Z`, fill: '#eceef3' }, map);
    const size = Math.min(lim * 0.055, stage.width / 8.5);     // "PANGGUNG" has to fit on the stage
    const label = svg('text', { x: 0, y: ((stage.backZ + stage.frontZ) / 2 + size * 0.36).toFixed(1), 'text-anchor': 'middle', 'font-size': size.toFixed(1), 'font-weight': 600, fill: '#0b0c0f', 'letter-spacing': (size * 0.08).toFixed(2) }, map);
    label.dataset.role = 'stage';
    if (stage.foh) svg('rect', { x: stage.foh.x0, y: stage.foh.z0, width: stage.foh.x1 - stage.foh.x0, height: stage.foh.z1 - stage.foh.z0, fill: '#3a3d44' }, map);
    for (const [x, z] of stage.towers) svg('rect', { x: x - 1.6, y: z - 1.6, width: 3.2, height: 3.2, fill: '#6b707b' }, map);
    mapPin = svg('g', {}, map);
    svg('circle', { r: (lim * 0.05).toFixed(1), fill: 'none', stroke: '#ffd84a', 'stroke-width': (lim * 0.013).toFixed(2) }, mapPin);
    svg('circle', { r: (lim * 0.022).toFixed(1), fill: '#ffd84a', stroke: '#0b0c0f', 'stroke-width': (lim * 0.007).toFixed(2) }, mapPin);
    map.addEventListener('click', (e) => {
      const hit = e.target.closest('.sec'); if (!hit) return;
      const s = model.byId[hit.dataset.id];
      if (s.cat !== 'CLOSED') handlers.onSeat(s, null, null, { go: true });
    });
    map.addEventListener('pointermove', (e) => { const hit = e.target.closest('.sec'); showTip(hit ? model.byId[hit.dataset.id] : null, e.clientX, e.clientY); });
    map.addEventListener('pointerleave', () => showTip(null));
  }

  /* Hover tip */
  const tip = $('#tip');
  function showTip(s, x, y) {
    if (!s) { tip.hidden = true; return; }
    tip.textContent = s.cat === 'CLOSED' ? `${secTitle(s)} · ${tx(cats.CLOSED.name)}` : `${secTitle(s)} · ${catLabel(s)} · ${fmtPrice(cats[s.cat].price)}`;
    tip.style.left = `${x}px`; tip.style.top = `${y}px`; tip.hidden = false;
    const r = tip.getBoundingClientRect();
    if (r.right > innerWidth - 8) tip.style.left = `${x - r.width - 28}px`;
  }

  /* Seat facts */
  const stats = $('#stats'), factEls = {};
  for (const key of FACTS) {
    const dt = node('dt'), dd = node('dd');
    factEls[key] = { dt, dd };
    stats.append(node('div', {}, [dt, dd]));
  }
  const meter = (share) => node('div', { class: 'meter' }, node('span', { style: `width:${Math.round(share * 100)}%` }));

  /* Dock */
  const dock = { pov: $('#btn-pov'), over: $('#btn-over'), show: $('#btn-show'), house: $('#btn-house'), sit: $('#btn-sit'), stand: $('#btn-stand'), zooms: [...document.querySelectorAll('[data-zoom]')] };
  dock.pov.addEventListener('click', () => handlers.onMode('pov'));
  dock.over.addEventListener('click', () => handlers.onMode('overview'));
  dock.show.addEventListener('click', () => handlers.onLights('show'));
  dock.house.addEventListener('click', () => handlers.onLights('house'));
  dock.sit.addEventListener('click', () => handlers.onPosture('sit'));
  dock.stand.addEventListener('click', () => handlers.onPosture('stand'));
  for (const b of dock.zooms) b.addEventListener('click', () => handlers.onZoom(Number(b.dataset.zoom)));

  /* Bottom sheet on phones */
  const panel = $('#panel'), toggle = $('#sheetToggle');
  toggle.addEventListener('click', () => {
    const shut = panel.classList.toggle('collapsed');
    toggle.setAttribute('aria-expanded', String(!shut));
  });
  if (innerWidth <= 760) { panel.classList.add('collapsed'); toggle.setAttribute('aria-expanded', 'false'); }

  /* Fine print */
  function drawFine() {
    const fine = $('#fine'), est = venue.def.estimated || [];
    const parts = [node('p', { text: t('fine.sim', { artist: concert.artist }) })];
    if (est.length) parts.push(node('p', { text: t('fine.estimated', { list: est.map((k) => t(`est.${k}`)).join(', ') }) }));
    parts.push(node('p', { text: t('fine.prices') }));
    const links = (concert.sources || []).filter((u) => /^https:\/\//.test(u)).map((u) => {
      let host = u; try { host = new URL(u).hostname.replace(/^www\./, ''); } catch (e) { /* keep the address */ }
      return node('a', { href: u, target: '_blank', rel: 'noopener', text: host });
    });
    if (links.length) {
      const p = node('p', { text: `${t('fine.sources')}: ` });
      links.forEach((a, i) => { if (i) p.append(' · '); p.append(a); });
      parts.push(p);
    }
    const support = node('button', { type: 'button', class: 'support-link', text: t('support.line') });
    support.addEventListener('click', openSupport);
    parts.push(node('p', {}, support));
    fine.replaceChildren(...parts);
  }

  let current = null, lastFacts = null;

  /** Buttons follow the state: which view, lights, posture and zoom are on. */
  function sync(state) {
    const pov = state.mode === 'pov', lock = standing(state.sec);
    press(dock.pov, pov); press(dock.over, !pov);
    press(dock.show, state.lights === 'show'); press(dock.house, state.lights === 'house');
    press(dock.sit, !lock && state.posture === 'sit'); press(dock.stand, lock || state.posture === 'stand');
    dock.sit.disabled = lock;
    for (const b of dock.zooms) { b.disabled = !pov; press(b, pov && Math.abs(state.zoom - Number(b.dataset.zoom)) < 0.01); }
    $('#hint').textContent = t(pov ? 'dock.hint' : 'dock.hintVenue');
  }

  /** Redraws the panel for the chosen seat. */
  function update(state, facts, seatPos) {
    current = state; lastFacts = facts;
    const s = state.sec, c = cats[s.cat], stand = standing(s);
    $('#nowChip').style.background = c.color;
    $('#nowCat').textContent = catLabel(s);
    $('#nowPrice').textContent = fmtPrice(c.price);
    $('#nowTitle').textContent = secTitle(s);
    $('#nowSub').textContent = stand ? t('panel.subStanding', { r: state.row + 1 }) : t('panel.sub', { r: state.row + 1, s: state.seat + 1 });
    $('#verdict').textContent = verdictKeys(facts, s, state.row).map((k) => t(k)).join(' ');

    const set = (key, value, extra) => { factEls[key].dt.textContent = t(key); factEls[key].dd.replaceChildren(value, ...(extra ? [extra] : [])); };
    set('f.edge', t('f.metres', { n: Math.round(facts.dStage) }));
    set('f.screen', t('f.metres', { n: Math.round(facts.dScreen) }));
    set('f.height', t('f.metres', { n: facts.height.toFixed(1) }));
    set('f.angle', `${Math.round(Math.min(facts.off, 180))}°`);
    set('f.vis', `${Math.round(facts.mainVis * 100)}%`, meter(facts.mainVis));
    set('f.tv', facts.mainVis > 0 ? t('f.tvValue', { n: Math.round(facts.tvIn) }) : t('f.visNone'));
    set('f.perf', t('f.perfValue', { n: facts.perfMM < 10 ? facts.perfMM.toFixed(1) : Math.round(facts.perfMM) }));
    factEls['f.tv'].dd.className = 'small'; factEls['f.perf'].dd.className = 'small';

    $('#rowLbl').textContent = t('panel.row'); $('#seatLbl').textContent = t(stand ? 'panel.spot' : 'panel.seat');
    rowIn.max = s.rows.length; rowIn.value = state.row + 1; $('#rowOut').textContent = state.row + 1;
    seatIn.max = s.rows[state.row].length / 3; seatIn.value = state.seat + 1; $('#seatOut').textContent = state.seat + 1;
    secSel.value = s.id;

    for (const b of catList.querySelectorAll('.cat')) b.setAttribute('aria-current', b.dataset.cat === s.cat ? 'true' : 'false');
    for (const id in mapSecs) mapSecs[id].classList.toggle('on', id === s.id);
    if (seatPos) mapPin.setAttribute('transform', `translate(${seatPos.x.toFixed(1)} ${seatPos.z.toFixed(1)})`);
    sync(state);
  }

  /** Redraws every label in the current language. */
  function relabel() {
    $('#lbl-view').textContent = t('dock.view'); dock.pov.textContent = t('dock.seat'); dock.over.textContent = t('dock.venue');
    $('#lbl-zoom').textContent = t('dock.zoom'); dock.zooms[0].textContent = t('dock.eyes');
    $('#lbl-light').textContent = t('dock.lights'); dock.show.textContent = t('dock.show'); dock.house.textContent = t('dock.house');
    $('#lbl-crowd').textContent = t('dock.crowd'); dock.sit.textContent = t('dock.sit'); dock.stand.textContent = t('dock.stand');
    $('#dock').setAttribute('aria-label', t('dock.label')); panel.setAttribute('aria-label', t('panel.label'));
    toggle.textContent = t('panel.toggle');
    $('#h-pick').textContent = t('panel.choose'); $('#h-cats').textContent = t('panel.cats');
    $('#secLbl').textContent = t('panel.section');
    map.setAttribute('aria-label', t('map.label'));
    map.querySelector('[data-role="stage"]').textContent = t('map.stage');
    drawCats(); drawSections(); drawFine();
  }

  relabel();
  $('#dock').hidden = false; panel.hidden = false;
  return { update, sync, relabel, showTip, secTitle, catLabel, last: () => lastFacts };
}
