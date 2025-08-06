let quotesCache = { data: null, buffer: [], bufferIndex: 0, timestamp: 0, isLoading: false };
const CACHE_DURATION = 5 * 60 * 1000;
const BUFFER_SIZE = 100;
export const config = { runtime: 'edge' };
function generateRandomIndices(length, count) { const s = new Set(); while (s.size < Math.min(count, length)) s.add(Math.floor(Math.random() * length)); return Array.from(s); }
function refreshQuoteBuffer() { const q = quotesCache.data; if (!q) return; const ids = generateRandomIndices(q.length, BUFFER_SIZE); quotesCache.buffer = ids.map(i => q[i]); quotesCache.bufferIndex = 0; }
async function initCache(request) {
  if (quotesCache.data && Date.now() - quotesCache.timestamp < CACHE_DURATION) return;
  if (quotesCache.isLoading) return;
  quotesCache.isLoading = true;
  try {
    const url = new URL('/assets/quotes.min.json', request.url);
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    quotesCache.data = data;
    quotesCache.timestamp = Date.now();
    refreshQuoteBuffer();
  } finally { quotesCache.isLoading = false; }
}
function getBufferedQuote() { if (!quotesCache.buffer.length) return null; const q = quotesCache.buffer[quotesCache.bufferIndex]; quotesCache.bufferIndex = (quotesCache.bufferIndex + 1) % quotesCache.buffer.length; if (quotesCache.bufferIndex === Math.floor(BUFFER_SIZE/2)) refreshQuoteBuffer(); return q; }
function selectQuote() { const b = getBufferedQuote(); if (b) return b; const d = quotesCache.data || []; return d[Math.floor(Math.random()*d.length)]; }
function getHeaders() { return { 'Content-Type':'application/json', 'Cache-Control':'public, max-age=30' }; }
export default async function handler(request) {
  if (request.method==='OPTIONS') return new Response(null,{status:204});
  if (request.method!=='GET') return new Response(JSON.stringify({error:'Method not allowed'}),{status:405});
  try {
    await initCache(request);
    if (!quotesCache.data) throw new Error('No data');
    const quote = selectQuote();
    return new Response(JSON.stringify(quote),{status:200,headers:getHeaders()});
  } catch(e) {
    console.error(e);
    return new Response(JSON.stringify({error:'Failed to fetch quote',message:'Please try again later'}),{status:500});
  }
}
