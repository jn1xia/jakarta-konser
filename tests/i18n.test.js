// tests/i18n.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STRINGS, pickLang, t, setLang, fmtRp, fmtPrice } from '../src/i18n.js';

test('both languages have exactly the same keys', () => {
  assert.deepEqual(Object.keys(STRINGS.id).sort(), Object.keys(STRINGS.en).sort());
});
test('language choice: address, then saved choice, then Indonesian', () => {
  assert.equal(pickLang('en', 'id'), 'en'); assert.equal(pickLang(null, 'en'), 'en');
  assert.equal(pickLang('xx', null), 'id'); assert.equal(pickLang(null, null), 'id');
});
test('prices', () => {
  setLang('id');
  assert.equal(fmtRp(3650000), 'Rp3.650.000');
  assert.equal(fmtPrice(null), 'Harga belum diumumkan');
  assert.equal(fmtPrice(undefined), 'Harga belum diumumkan');
  setLang('en'); assert.equal(fmtPrice(null), 'Price not announced');
  assert.equal(t('no.such.key'), 'no.such.key');
});
