// The optional "support this site" window with the owner's QRIS. It is built the first time
// someone asks for it, so the image never loads for anyone who does not. Nothing on the site
// depends on it, and it never opens by itself.

import { t } from './i18n.js';

const IMAGE = 'assets/qris.png';
let dialog = null;

function node(tag, props = {}, children = []) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') e.className = v; else if (k === 'data') Object.assign(e.dataset, v); else e.setAttribute(k, v);
  }
  for (const c of [].concat(children)) if (c) e.append(c);
  return e;
}

function relabel() {
  if (!dialog) return;
  dialog.setAttribute('aria-label', t('support.title'));
  dialog.querySelector('h2').textContent = t('support.title');
  dialog.querySelector('[data-role="body"]').textContent = t('support.body');
  dialog.querySelector('[data-role="hint"]').textContent = t('support.hint');
  dialog.querySelector('img').alt = t('support.alt');
  dialog.querySelector('a[download]').textContent = t('support.save');
  dialog.querySelector('[data-close]').textContent = t('support.close');
}

function build() {
  dialog = node('dialog', { id: 'supportDialog', class: 'support' }, [
    node('h2'),
    node('p', { data: { role: 'body' } }),
    node('figure', {}, node('img', { width: '1200', height: '1700', decoding: 'async' })),
    node('p', { class: 'support-hint', data: { role: 'hint' } }),
    node('p', { class: 'support-actions' }, [
      node('a', { class: 'support-save', href: IMAGE, download: 'qris-jakarta-konser.png' }),
      node('button', { type: 'button', class: 'support-close', data: { close: '' } })
    ])
  ]);
  dialog.addEventListener('click', (e) => {
    // A click on the dimmed backdrop lands on the dialog itself, outside its box
    if (e.target.closest('[data-close]')) { dialog.close(); return; }
    if (e.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close();
    }
  });
  document.body.append(dialog);
  document.addEventListener('langchange', relabel);
}

/** Opens the support window; the QRIS image loads now, not before. */
export function openSupport() {
  if (!dialog) build();
  relabel();
  const img = dialog.querySelector('img');
  if (!img.getAttribute('src')) img.setAttribute('src', IMAGE);
  dialog.showModal();
  dialog.querySelector('[data-close]').focus();
}
