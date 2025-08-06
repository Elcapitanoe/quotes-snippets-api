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
  runtime: 'edge',
  memory: 128
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
  
  // If we've exceeded max attempts, wait for circuit breaker timeout
  if (quotesCache.fetchAttempts >= MAX_FETCH_ATTEMPTS) {
    if (quotesCache.lastFetchError && 
        (now - quotesCache.lastFetchError) < CIRCUIT_BREAKER_TIMEOUT) {
      return false;
    }
    // Reset attempts after timeout
    quotesCache.fetchAttempts = 0;
  }
  
  return true;
}

// Optimized quote loading with error handling
async function loadQuotes(isWarmup = false) {
  const now = Date.now();
  
  // Return cached data if still valid
  if (quotesCache.data && (now - quotesCache.timestamp) < CACHE_DURATION) {
    return quotesCache.data;
  }
  
  // Check circuit breaker
  if (!shouldAttemptFetch()) {
    if (quotesCache.data) {
      console.log('Circuit breaker active, returning stale cache');
      return quotesCache.data;
    }
    throw new Error('Circuit breaker active and no cached data available');
  }
  
  // Prevent concurrent fetches
  if (quotesCache.isLoading && !isWarmup) {
    // Wait briefly and return cached data if available
    if (quotesCache.data) {
      return quotesCache.data;
    }
  }
  
  quotesCache.isLoading = true;
  
  try {
    const startTime = performance.now();
    
    // Use hardcoded internal URL for security
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';
    
    const response = await fetch(`${baseUrl}/assets/quotes.min.json`, {
      headers: {
        'User-Agent': 'Vercel-Edge-Function',
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const quotes = await response.json();
    const loadTime = performance.now() - startTime;
    
    if (!Array.isArray(quotes) || quotes.length === 0) {
      throw new Error('Invalid quotes data structure');
    }
    
    // Update cache with new data
    quotesCache.data = quotes;
    quotesCache.timestamp = now;
    quotesCache.fetchAttempts = 0;
    quotesCache.lastFetchError = null;
    
    // Refresh the quote buffer with new data
    refreshQuoteBuffer(quotes);
    
    console.log(`Quotes loaded: ${quotes.length} items in ${loadTime.toFixed(2)}ms`);
    
    return quotes;
    
  } catch (error) {
    quotesCache.fetchAttempts++;
    quotesCache.lastFetchError = now;
    
    console.error(`Quote fetch attempt ${quotesCache.fetchAttempts} failed:`, error.message);
    
    // Return stale cache if available and not too old
    if (quotesCache.data && (now - quotesCache.timestamp) < STALE_CACHE_MAX_AGE) {
      console.log('Returning stale cache due to fetch error');
      return quotesCache.data;
    }
    
    throw error;
  } finally {
    quotesCache.isLoading = false;
  }
}

// Optimized quote selection
function selectQuote() {
  // Try buffered quote first (fastest path)
  const bufferedQuote = getBufferedQuote();
  if (bufferedQuote) {
    return bufferedQuote;
  }
  
  // Fallback to direct selection if buffer is empty
  if (quotesCache.data && quotesCache.data.length > 0) {
    const randomIndex = Math.floor(Math.random() * quotesCache.data.length);
    return quotesCache.data[randomIndex];
  }
  
  return null;
}

// Enhanced response headers for optimal caching
function getCacheHeaders(cacheStatus) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'X-Cache-Status': cacheStatus
  };
  
  // Adaptive cache control based on cache status
  switch (cacheStatus) {
    case 'hit':
      headers['Cache-Control'] = 'public, max-age=30, s-maxage=60, stale-while-revalidate=300';
      break;
    case 'stale':
      headers['Cache-Control'] = 'public, max-age=0, s-maxage=30, stale-while-revalidate=600';
      break;
    default:
      headers['Cache-Control'] = 'public, max-age=0, s-maxage=60, stale-while-revalidate=300';
  }
  
  return headers;
}

export default async function handler(request) {
  const startTime = performance.now();
  const url = new URL(request.url);
  const isWarmup = url.searchParams.get('warmup') === 'true';
  
  // Handle warmup requests
  if (isWarmup) {
    try {
      await loadQuotes(true);
      return new Response(
        JSON.stringify({ 
          status: 'warmed',
          cacheSize: quotesCache.data?.length || 0,
          bufferSize: quotesCache.buffer.length
        }),
        {
          status: 200,
          headers: getCacheHeaders('warmup')
        }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ status: 'warmup-failed', error: error.message }),
        { status: 500, headers: getCacheHeaders('error') }
      );
    }
  }
  
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: getCacheHeaders('options')
    });
  }
  
  // Only allow GET requests for quotes
  if (request.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: getCacheHeaders('error')
      }
    );
  }
  
  try {
    // Load quotes (from cache or fetch)
    await loadQuotes();
    
    // Get optimized quote selection
    const quote = selectQuote();
    
    if (!quote) {
      throw new Error('No quotes available');
    }
    
    const processingTime = performance.now() - startTime;
    const cacheAge = Date.now() - quotesCache.timestamp;
    const cacheStatus = cacheAge < CACHE_DURATION ? 'hit' : 'stale';
    
    // Add performance headers for monitoring
    const headers = getCacheHeaders(cacheStatus);
    headers['X-Response-Time'] = `${processingTime.toFixed(2)}ms`;
    headers['X-Cache-Age'] = `${Math.floor(cacheAge / 1000)}s`;
    headers['X-Buffer-Index'] = quotesCache.bufferIndex.toString();
    
    return new Response(
      JSON.stringify(quote),
      {
        status: 200,
        headers
      }
    );
    
  } catch (error) {
    console.error('API Error:', error);
    
    const processingTime = performance.now() - startTime;
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch quote',
        message: 'Please try again later'
      }),
      {
        status: 500,
        headers: {
          ...getCacheHeaders('error'),
          'X-Response-Time': `${processingTime.toFixed(2)}ms`
        }
      }
    );
  }
}
