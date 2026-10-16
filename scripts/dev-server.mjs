import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import quotesApi from '../api/quotes.js';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SITE_DIR = resolve(ROOT, 'dist');
const PORT = Number.parseInt(process.env.PORT ?? '3000', 10);
const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'",
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};
const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
};

function sendError(response, status, message) {
  response.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(message);
}

const server = createServer(async (request, response) => {
  let url;
  try {
    url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  } catch {
    sendError(response, 400, 'Bad request');
    return;
  }

  if (url.pathname === '/api' || url.pathname === '/api/') {
    try {
      const apiRequest = new Request(url, {
        method: request.method ?? 'GET',
        headers: request.headers,
      });
      const apiResponse = await quotesApi.fetch(apiRequest);
      response.writeHead(apiResponse.status, {
        ...SECURITY_HEADERS,
        ...Object.fromEntries(apiResponse.headers),
      });
      response.end(Buffer.from(await apiResponse.arrayBuffer()));
    } catch (error) {
      console.error('Local API request failed:', error);
      sendError(response, 500, 'Internal server error');
    }
    return;
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    sendError(response, 405, 'Method not allowed');
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    sendError(response, 400, 'Bad request');
    return;
  }

  const relativePath = pathname === '/' ? '/index.html' : pathname;
  const filePath = resolve(SITE_DIR, `.${relativePath}`);
  if (!filePath.startsWith(`${SITE_DIR}${sep}`)) {
    sendError(response, 404, 'Not found');
    return;
  }

  try {
    if (!statSync(filePath).isFile()) throw new Error('Not a file');
    const body = readFileSync(filePath);
    response.writeHead(200, {
      'Content-Type': MIME_TYPES[extname(filePath)] ?? 'application/octet-stream',
      ...SECURITY_HEADERS,
      'Cache-Control': extname(filePath) === '.html' ? 'no-cache' : 'public, max-age=3600',
    });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch {
    sendError(response, 404, 'Not found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Quotes Snippets API running at http://localhost:${PORT}`);
});
