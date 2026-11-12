import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countVisit, COUNTER } from '../src/counter.js';

/** A stand-in for the counter service: records what was asked and answers from a script. */
function service(answers) {
  const asked = [];
  const fetch = async (url) => {
    asked.push(url.replace(COUNTER.base, ''));
    const a = answers.shift();
    if (a === 'down') throw new Error('network');
    return { ok: a.status === undefined, status: a.status || 200, json: async () => a };
  };
  return { fetch, asked };
}
function storage(initial = {}) {
  const data = { ...initial };
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = v; } };
}
const live = 'jn1xia.github.io', key = COUNTER.key;

test('away from the published site nothing is counted and nothing is asked', async () => {
  const s = service([]);
  assert.equal(await countVisit({ hostname: 'localhost', fetch: s.fetch, storage: storage() }), null);
  assert.equal(await countVisit({ hostname: 'evil.example', fetch: s.fetch, storage: storage() }), null);
  assert.deepEqual(s.asked, []);
});
test('a first visit adds one and remembers it', async () => {
  const s = service([{ value: 41 }]), store = storage();
  assert.equal(await countVisit({ hostname: live, fetch: s.fetch, storage: store }), 41);
  assert.deepEqual(s.asked, [`/hit/${key}`]);
  assert.equal(store.data[COUNTER.flag], '1');
});
test('a later visit only reads the total', async () => {
  const s = service([{ value: 41 }]);
  assert.equal(await countVisit({ hostname: live, fetch: s.fetch, storage: storage({ [COUNTER.flag]: '1' }) }), 41);
  assert.deepEqual(s.asked, [`/get/${key}`]);
});
test('reading a counter that does not exist yet creates it', async () => {
  const s = service([{ status: 404 }, { value: 1 }]);
  assert.equal(await countVisit({ hostname: live, fetch: s.fetch, storage: storage({ [COUNTER.flag]: '1' }) }), 1);
  assert.deepEqual(s.asked, [`/get/${key}`, `/hit/${key}`]);
});
test('when storage is blocked the visit is not counted again on every reload', async () => {
  const s = service([{ value: 7 }]);
  const blocked = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  assert.equal(await countVisit({ hostname: live, fetch: s.fetch, storage: blocked }), 7);
  assert.deepEqual(s.asked, [`/get/${key}`]);
});
test('a service that is down, slow or answers nonsense gives no number', async () => {
  assert.equal(await countVisit({ hostname: live, fetch: service(['down']).fetch, storage: storage() }), null);
  assert.equal(await countVisit({ hostname: live, fetch: service([{ status: 500 }]).fetch, storage: storage() }), null);
  assert.equal(await countVisit({ hostname: live, fetch: service([{ value: 'lots' }]).fetch, storage: storage() }), null);
  assert.equal(await countVisit({ hostname: live, fetch: service([{}]).fetch, storage: storage() }), null);
  const never = () => new Promise(() => {});
  assert.equal(await countVisit({ hostname: live, fetch: never, storage: storage(), timeout: 20 }), null);
});
test('the Vercel production address counts, preview deployments do not', async () => {
  const s = service([{ value: 5 }]);
  assert.equal(await countVisit({ hostname: 'jakarta-konser.vercel.app', fetch: s.fetch, storage: storage() }), 5);
  assert.deepEqual(s.asked, [`/hit/${key}`]);
  const p = service([]);
  assert.equal(await countVisit({ hostname: 'jakarta-konser-git-main-jn1xia.vercel.app', fetch: p.fetch, storage: storage() }), null);
  assert.deepEqual(p.asked, []);
});
