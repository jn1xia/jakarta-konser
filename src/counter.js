// Visitor counter, as on the BTS and BIGBANG sites. It counts each browser once: the first
// visit adds one and leaves a flag in the browser, and later visits only read the total.
// It runs only on the published site (COUNTER.hosts), so local copies and previews never touch the count.
// Service: Abacus (abacus.jasoncameron.dev), a free counter that needs no account.
// The owner can read the total any time at COUNTER.base + '/get/' + COUNTER.key.

export const COUNTER = {
  base: 'https://abacus.jasoncameron.dev',
  key: 'jn1xia.github.io/jakarta-konser-visitors',
  // The published addresses. Vercel preview deployments (…-git-…vercel.app) are left out on purpose.
  hosts: ['jakarta-konser.vercel.app', 'jn1xia.github.io'],
  flag: 'jk.counted.v1'
};

/**
 * Counts this visit if it is the browser's first, and returns the total, or null when there is
 * no number to show (not the live site, service down or slow, or an answer that is not a count).
 */
export async function countVisit({ hostname, fetch, storage, timeout = 6000 }) {
  if (!COUNTER.hosts.includes(hostname)) return null;

  // If the browser blocks storage, only read the total, so a reload never counts again
  let counted = true;
  try { counted = storage.getItem(COUNTER.flag) === '1'; } catch (e) { /* storage blocked */ }

  const call = async (path) => {
    const ctl = typeof AbortController === 'function' ? new AbortController() : null;
    let timer;
    const late = new Promise((resolve, reject) => { timer = setTimeout(() => { if (ctl) ctl.abort(); reject(new Error('timeout')); }, timeout); });
    try {
      const res = await Promise.race([fetch(COUNTER.base + path + COUNTER.key, { cache: 'no-store', signal: ctl ? ctl.signal : undefined }), late]);
      if (!res.ok) { const err = new Error(`status ${res.status}`); err.status = res.status; throw err; }
      return await res.json();
    } finally { clearTimeout(timer); }
  };

  try {
    let data;
    if (counted) {
      try { data = await call('/get/'); }
      catch (err) { if (err.status !== 404) throw err; data = await call('/hit/'); }   // the very first visitor
    } else {
      data = await call('/hit/');
      try { storage.setItem(COUNTER.flag, '1'); } catch (e) { /* storage blocked */ }
    }
    const n = Number(data && data.value);
    return typeof (data && data.value) === 'number' && Number.isFinite(n) && n >= 1 ? n : null;
  } catch (e) {
    return null;
  }
}
