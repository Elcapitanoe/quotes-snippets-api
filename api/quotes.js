import { randomInt } from 'node:crypto';
import quotes from '../data/quotes.min.json' with { type: 'json' };

const BASE_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
};

function isQuoteRecord(value) {
  return value !== null
    && typeof value === 'object'
    && typeof value.id === 'string'
    && value.id.length > 0
    && typeof value.from === 'string'
    && value.from.trim().length > 0
    && typeof value.quote === 'string'
    && value.quote.trim().length > 0;
}

if (!Array.isArray(quotes) || quotes.length === 0 || !quotes.every(isQuoteRecord)) {
  throw new Error('The quote dataset contains invalid or missing records.');
}

function jsonResponse(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...BASE_HEADERS, ...extraHeaders },
  });
}

export default {
  async fetch(request) {
    const startedAt = performance.now();

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: BASE_HEADERS,
      });
    }

    if (request.method !== 'GET') {
      return jsonResponse(
        { error: 'Method not allowed' },
        405,
        { Allow: 'GET, OPTIONS' },
      );
    }

    const quote = quotes[randomInt(0, quotes.length)];
    const responseTime = `${(performance.now() - startedAt).toFixed(3)}ms`;

    return jsonResponse({ ...quote, responseTime });
  },
};
