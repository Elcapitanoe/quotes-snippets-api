import assert from 'node:assert/strict';
import test from 'node:test';
import quotes from '../data/quotes.min.json' with { type: 'json' };
import handler from '../api/quotes.js';

const request = (method = 'GET') => new Request('http://localhost/api', { method });

test('GET returns one quote using the documented response schema', async () => {
  const response = await handler.fetch(request());
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(typeof payload.id, 'string');
  assert.equal(typeof payload.from, 'string');
  assert.equal(typeof payload.quote, 'string');
  assert.match(payload.responseTime, /^\d+\.\d{3}ms$/);
  assert.ok(quotes.some((quote) => (
    quote.id === payload.id
    && quote.from === payload.from
    && quote.quote === payload.quote
  )));
});

test('GET sets public CORS and disables caching for randomized responses', async () => {
  const response = await handler.fetch(request());

  assert.equal(response.headers.get('access-control-allow-origin'), '*');
  assert.equal(response.headers.get('access-control-allow-methods'), 'GET, OPTIONS');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.match(response.headers.get('content-type') ?? '', /^application\/json; charset=utf-8$/);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
});

test('OPTIONS returns 204 without a response body', async () => {
  const response = await handler.fetch(request('OPTIONS'));

  assert.equal(response.status, 204);
  assert.equal(await response.text(), '');
});

test('unsupported methods return 405 with an Allow header', async () => {
  const response = await handler.fetch(request('POST'));

  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'GET, OPTIONS');
  assert.deepEqual(await response.json(), { error: 'Method not allowed' });
});
