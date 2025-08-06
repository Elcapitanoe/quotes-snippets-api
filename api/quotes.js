// Optimized memory cache with multiple strategies
let quotesCache = {
  data: null,
  buffer: [], // Pre-selected quotes buffer
  bufferIndex: 0,
  timestamp: 0,
  fetchAttempts: 0,
  lastFetchError: null,
  isLoading: false
};

// Configuration constants
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const BUFFER_SIZE = 100; // Pre-generate 100 random quotes
const MAX_FETCH_ATTEMPTS = 3;
const CIRCUIT_BREAKER_TIMEOUT = 30 * 1000; // 30 seconds
const STALE_CACHE_MAX_AGE = 60 * 60 * 1000; // 1 hour max stale

export const config = {
  runtime: 'edge'
};

// Efficient random selection with pre-computed indices
function generateRandomIndices(length, count) {
  const indices = new Set();
  while (indices.size < Math.min(count, length)) {
    indices.add(Math.floor(Math.random() * length));
  }
  return Array.from(indices);
}

// Optimized quote buffer management
function refreshQuoteBuffer(quotes) {
  if (!quotes || quotes.length === 0) return;
  
  const indices = generateRandomIndices(quotes.length, BUFFER_SIZE);
  quotesCache.buffer = indices.map(i => quotes[i]);
  quotesCache.bufferIndex = 0;
}

// Get next quote from buffer with rotation
function getBufferedQuote() {
  if (quotesCache.buffer.length === 0) return null;
  
  const quote = quotesCache.buffer[quotesCache.bufferIndex];
  quotesCache.bufferIndex = (quotesCache.bufferIndex + 1) % quotesCache.buffer.length;
  
  // Refresh buffer when we've cycled through half of it
  if (quotesCache.bufferIndex === Math.floor(BUFFER_SIZE / 2) && quotesCache.data) {
    refreshQuoteBuffer(quotesCache.data);
  }
  
  return quote;
}

// Circuit breaker pattern for fetch failures
function shouldAttemptFetch() {
  const now = Date.now();
  
  if (quotesCache.fetchAttempts >= MAX_FETCH_ATTEMPTS) {
    if (quotesCache.lastFetchError && (now - quotesCache.lastFetchError) < CIRCUIT_BREAKER_TIMEOUT) {
      return false;
    }
    quotesCache.fetchAttempts = 0;
  }
  return true;
}

// Optimized quote loading with error handling
async function loadQuotes(isWarmup = false, request) {
  const now = Date.now();
  
  if (quotesCache.data && (now - quotesCache.timestamp) < CACHE_DURATION) {
    return quotesCache.data;
  }
  
  if (!shouldAttemptFetch()) {
    if (quotesCache.data) return quotesCache.data;
    throw new Error('Circuit breaker active and no cached data available');
  }
  
  if (quotesCache.isLoading && !isWarmup) {
    if (quotesCache.data) return quotesCache.data;
  }
  
  quotesCache.isLoading = true;
  
  try {
    const startTime = performance.now();
    // Fetch from public assets directly
    const url = new URL('/assets/quotes.min.json', request.url);
    const response = await fetch(url.toString(), { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const quotes = await response.json();
    const loadTime = performance.now() - startTime;
    if (!Array.isArray(quotes) || quotes.length === 0) throw new Error('Invalid data');
    quotesCache.data = quotes;
    quotesCache.timestamp = now;
    quotesCache.fetchAttempts = 0;
    quotesCache.lastFetchError = null;
    refreshQuoteBuffer(quotes);
    console.log(`Quotes loaded ${quotes.length} items in ${loadTime.toFixed(2)}ms`);
    return quotes;
  } catch (error) {
    quotesCache.fetchAttempts++;
    quotesCache.lastFetchError = Date.now();
    console.error(`Fetch failed #${quotesCache.fetchAttempts}:`, error);
    if (quotesCache.data && (now - quotesCache.timestamp) < STALE_CACHE_MAX_AGE) {
      return quotesCache.data;
    }
    throw error;
  } finally {
    quotesCache.isLoading = false;
  }
}

// Optimized quote selection
function selectQuote() {
  const buffered = getBufferedQuote();
  if (buffered) return buffered;
  if (quotesCache.data && quotesCache.data.length > 0) return quotesCache.data[Math.floor(Math.random() * quotesCache.data.length)];
  return null;
}

// Response headers
function getCacheHeaders(status) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Cache-Status': status,
    'Cache-Control': status === 'hit' ? 'public, max-age=30' : 'public, max-age=0'
  };
  return headers;
}

export default async function handler(request) {
  const start = performance.now();
  const isWarmup = new URL(request.url).searchParams.get('warmup') === 'true';
  
  try {
    const quotes = await loadQuotes(isWarmup, request);
    if (isWarmup) {
      return new Response(JSON.stringify({ status: 'warmed', count: quotes.length }), { headers: getCacheHeaders('hit') });
    }
    if (request.method === 'OPTIONS') return new Response(null, { headers: getCacheHeaders('hit') });
    if (request.method !== 'GET') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: getCacheHeaders('error') });
    const quote = selectQuote();
    if (!quote) throw new Error('No data');
    const processing = performance.now() - start;
    const headers = getCacheHeaders('hit');
    headers['X-Response-Time'] = `${processing.toFixed(2)}ms`;
    return new Response(JSON.stringify(quote), { headers });
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch quote', message: 'Please try again later' }),
      { status: 500, headers: getCacheHeaders('error') }
    );
  }
}
