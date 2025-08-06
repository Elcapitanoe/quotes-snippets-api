import quotesList from '../../assets/quotes.min.json';

let quotesCache = {
  data: null,
  buffer: [],
  bufferIndex: 0,
  timestamp: 0,
  isLoading: false
};

const CACHE_DURATION = 5 * 60 * 1000;
const BUFFER_SIZE = 100;

export const config = {
  runtime: 'edge'
};

function generateRandomIndices(length, count) {
  const indices = new Set();
  while (indices.size < Math.min(count, length)) {
    indices.add(Math.floor(Math.random() * length));
  }
  return Array.from(indices);
}

function refreshQuoteBuffer() {
  const quotes = quotesCache.data;
  if (!quotes) return;
  const indices = generateRandomIndices(quotes.length, BUFFER_SIZE);
  quotesCache.buffer = indices.map(i => quotes[i]);
  quotesCache.bufferIndex = 0;
}

function getBufferedQuote() {
  if (!quotesCache.buffer.length) return null;
  const q = quotesCache.buffer[quotesCache.bufferIndex];
  quotesCache.bufferIndex = (quotesCache.bufferIndex + 1) % quotesCache.buffer.length;
  if (quotesCache.bufferIndex === Math.floor(BUFFER_SIZE / 2)) refreshQuoteBuffer();
  return q;
}

function initCache() {
  if (quotesCache.data) return;
  quotesCache.data = quotesList;
  quotesCache.timestamp = Date.now();
  refreshQuoteBuffer();
}

function selectQuote() {
  initCache();
  const buffered = getBufferedQuote();
  if (buffered) return buffered;
  return quotesCache.data[Math.floor(Math.random() * quotesCache.data.length)];
}

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=30'
  };
}

export default function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }
  try {
    const quote = selectQuote();
    return new Response(JSON.stringify(quote), {
      status: 200,
      headers: getHeaders()
    });
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch quote', message: 'Please try again later' }),
      { status: 500 }
    );
  }
}
