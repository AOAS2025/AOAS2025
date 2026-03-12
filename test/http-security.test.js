const test = require('node:test');
const assert = require('node:assert/strict');

const {
  API_CSP,
  PRIVATE_PAGE_CSP,
  PUBLIC_PAGE_CSP,
  buildContentSecurityPolicy,
} = require('../lib/http-security');

test('public page CSP stays self-hosted while allowing required map endpoints', () => {
  assert.match(PUBLIC_PAGE_CSP, /script-src 'self' 'unsafe-inline'/);
  assert.match(PUBLIC_PAGE_CSP, /script-src-elem 'self' 'unsafe-inline'/);
  assert.match(PUBLIC_PAGE_CSP, /style-src 'self' 'unsafe-inline'/);
  assert.match(PUBLIC_PAGE_CSP, /style-src-elem 'self' 'unsafe-inline'/);
  assert.match(PUBLIC_PAGE_CSP, /img-src 'self' data: blob: https:\/\/\*\.tile\.openstreetmap\.org https:\/\/server\.arcgisonline\.com/);
  assert.match(PUBLIC_PAGE_CSP, /connect-src 'self' https:\/\/router\.project-osrm\.org/);
  assert.doesNotMatch(PUBLIC_PAGE_CSP, /cdn\.tailwindcss\.com/);
  assert.doesNotMatch(PUBLIC_PAGE_CSP, /unpkg\.com/);
  assert.doesNotMatch(PUBLIC_PAGE_CSP, /fonts\.googleapis\.com/);
  assert.doesNotMatch(PUBLIC_PAGE_CSP, /fonts\.gstatic\.com/);
  assert.equal(buildContentSecurityPolicy('/'), PUBLIC_PAGE_CSP);
  assert.equal(buildContentSecurityPolicy('/careers'), PUBLIC_PAGE_CSP);
});

test('private and API CSP stay strict', () => {
  assert.match(PRIVATE_PAGE_CSP, /script-src 'self'/);
  assert.match(PRIVATE_PAGE_CSP, /connect-src 'self'/);
  assert.doesNotMatch(PRIVATE_PAGE_CSP, /cdn\.tailwindcss\.com|unpkg\.com/);
  assert.equal(buildContentSecurityPolicy('/admin'), PRIVATE_PAGE_CSP);
  assert.equal(buildContentSecurityPolicy('/insights'), PRIVATE_PAGE_CSP);
  assert.equal(buildContentSecurityPolicy('/api/contact'), API_CSP);
});
