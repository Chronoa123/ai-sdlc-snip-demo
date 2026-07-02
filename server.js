import { resolve } from 'node:path';

// ─── Config ──────────────────────────────────────────────────────────────────

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = process.env.PUBLIC_DIR ?? null;

function getBaseUrl() {
  if (process.env.BASE_URL) return process.env.BASE_URL.replace(/\/$/, '');
  if (process.env.RAILWAY_PUBLIC_DOMAIN) return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  return `http://localhost:${PORT}`;
}

// ─── In-memory store ─────────────────────────────────────────────────────────

/** @type {Map<string, {code:string, url:string, shortUrl:string, hits:number, createdAt:string}>} */
const links = new Map();

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function generateCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, b => CHARS[b % 62]).join('');
}

function isValidUrl(str) {
  try {
    const { protocol } = new URL(str);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

// ─── CORS ─────────────────────────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

// ─── Static file serving ─────────────────────────────────────────────────────

async function tryStatic(pathname) {
  if (!PUBLIC_DIR) return null;

  const rel = pathname === '/' ? 'index.html' : pathname.slice(1);
  const base = resolve(PUBLIC_DIR);
  const target = resolve(base, rel);

  // Prevent path traversal outside PUBLIC_DIR
  const sep = process.platform === 'win32' ? '\\' : '/';
  if (target !== base && !target.startsWith(base + sep)) return null;

  const file = Bun.file(target);
  return (await file.exists()) ? new Response(file, { headers: CORS }) : null;
}

// ─── Server ───────────────────────────────────────────────────────────────────

Bun.serve({
  port: PORT,

  async fetch(req) {
    const { pathname } = new URL(req.url);
    const { method } = req;

    // OPTIONS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // POST /api/links  { url }  →  201 link | 400
    if (method === 'POST' && pathname === '/api/links') {
      let body;
      try { body = await req.json(); } catch {
        return json({ error: 'Invalid JSON' }, 400);
      }
      if (!isValidUrl(body?.url)) {
        return json({ error: 'URL must be a valid http or https URL' }, 400);
      }

      let code;
      do { code = generateCode(); } while (links.has(code));

      const link = {
        code,
        url: body.url,
        shortUrl: `${getBaseUrl()}/${code}`,
        hits: 0,
        createdAt: new Date().toISOString(),
      };
      links.set(code, link);
      return json(link, 201);
    }

    // GET /api/links  →  200 array
    if (method === 'GET' && pathname === '/api/links') {
      return json([...links.values()]);
    }

    // Static files win over short codes
    const staticRes = await tryStatic(pathname);
    if (staticRes) return staticRes;

    // GET /:code  →  302 or 404
    if (method === 'GET' && pathname.length > 1) {
      const code = pathname.slice(1);
      const link = links.get(code);
      if (!link) return json({ error: 'Not found' }, 404);
      link.hits++;
      return new Response(null, {
        status: 302,
        headers: { ...CORS, Location: link.url },
      });
    }

    return json({ error: 'Not found' }, 404);
  },
});

console.log(`Snip listening on port ${PORT}`);
