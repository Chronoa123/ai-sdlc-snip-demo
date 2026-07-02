#!/usr/bin/env node
'use strict';

const { spawn }  = require('child_process');
const http       = require('http');
const https      = require('https');

const BASE = (process.env.SNIP_API || 'http://localhost:3000').replace(/\/$/, '');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function die(msg) {
  process.stderr.write(msg + '\n');
  process.exit(1);
}

/** Thin wrapper around global fetch for JSON API calls. */
async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  try {
    return await fetch(`${BASE}${path}`, opts);
  } catch (err) {
    die(`Cannot reach backend at ${BASE} — ${err.message}`);
  }
}

/**
 * GET <url> without following redirects (redirect:'manual' semantics).
 * Uses http/https directly so the Location header is always accessible.
 */
function getNoRedirect(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.request(url, { method: 'GET' }, (res) => {
      res.resume();                              // discard body
      resolve({ status: res.statusCode, location: res.headers.location });
    }).on('error', reject).end();
  });
}

function openBrowser(url) {
  let cmd, args;
  if (process.platform === 'win32') {
    cmd = 'cmd.exe'; args = ['/c', 'start', '', url];
  } else if (process.platform === 'darwin') {
    cmd = 'open';    args = [url];
  } else {
    cmd = 'xdg-open'; args = [url];
  }
  try {
    spawn(cmd, args, { detached: true, stdio: 'ignore' }).unref();
  } catch {
    die(`Could not open browser. URL: ${url}`);
  }
}

// ─── Commands ─────────────────────────────────────────────────────────────────

async function cmdAdd(url) {
  if (!url) die('Usage: snip add <url>');

  const res = await api('POST', '/api/links', { url });
  if (res.status === 400) {
    const body = await res.json().catch(() => ({}));
    die(`Error: ${body.error || 'Bad request'}`);
  }
  if (!res.ok) die(`Error: server returned ${res.status}`);

  const link = await res.json();
  console.log(link.shortUrl);
}

async function cmdLs() {
  const res = await api('GET', '/api/links');
  if (!res.ok) die(`Error: server returned ${res.status}`);

  const links = await res.json();
  if (links.length === 0) { console.log('No links yet.'); return; }

  const codeW = Math.max(4, ...links.map(l => l.code.length));
  const hitsW = Math.max(4, ...links.map(l => String(l.hits).length));
  const urlW  = Math.max(3, ...links.map(l => l.url.length));

  const header = `${'CODE'.padEnd(codeW)}  ${'HITS'.padStart(hitsW)}  URL`;
  const sep    = `${'-'.repeat(codeW)}  ${'-'.repeat(hitsW)}  ${'-'.repeat(Math.min(urlW, 60))}`;

  console.log(header);
  console.log(sep);
  for (const l of links) {
    console.log(`${l.code.padEnd(codeW)}  ${String(l.hits).padStart(hitsW)}  ${l.url}`);
  }
}

async function cmdOpen(code) {
  if (!code) die('Usage: snip open <code>');

  let result;
  try {
    result = await getNoRedirect(`${BASE}/${code}`);
  } catch (err) {
    die(`Cannot reach backend at ${BASE} — ${err.message}`);
  }

  if (result.status === 404) die(`Error: Unknown code "${code}"`);
  if (![301, 302, 303, 307, 308].includes(result.status)) {
    die(`Error: Unexpected status ${result.status} for code "${code}"`);
  }
  if (!result.location) die('Error: No Location header in redirect response');

  console.log(`Opening: ${result.location}`);
  openBrowser(result.location);
}

// ─── Usage ────────────────────────────────────────────────────────────────────

const USAGE = `Snip CLI — URL shortener

Usage:
  snip add <url>    Shorten a URL and print the short link
  snip ls           List all short links
  snip open <code>  Open a short link in the default browser
  snip help         Show this help

Environment:
  SNIP_API          Backend base URL (default: http://localhost:3000)`;

// ─── Dispatch ─────────────────────────────────────────────────────────────────

async function main() {
  const [cmd, arg] = process.argv.slice(2);
  switch (cmd) {
    case 'add':              return cmdAdd(arg);
    case 'ls':               return cmdLs();
    case 'open':             return cmdOpen(arg);
    case 'help': case '--help': case '-h':
    case undefined:          console.log(USAGE); return;
    default: die(`Unknown command: "${cmd}"\n\n${USAGE}`);
  }
}

main().catch(err => die(`Unexpected error: ${err.message}`));
