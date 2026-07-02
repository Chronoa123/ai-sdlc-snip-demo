#!/usr/bin/env node
/**
 * scripts/build-bundle.mjs
 *
 * Assembles the production bundle/ submodule from the three source branches.
 * Safe to re-run: each git stage is guarded by a diff check; nothing is
 * committed or pushed when the content is identical to the previous run.
 *
 * Usage:
 *   node scripts/build-bundle.mjs          # build + local commits only
 *   node scripts/build-bundle.mjs --push   # build + commit + push to origin
 */

import { spawnSync }                                  from 'node:child_process';
import { cpSync, writeFileSync, mkdirSync,
         existsSync, rmSync, renameSync }             from 'node:fs';
import { join, resolve }                              from 'node:path';
import { fileURLToPath }                              from 'node:url';
import https                                          from 'node:https';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT      = resolve(__dirname, '..');
const FRONTEND  = join(ROOT, 'frontend');
const BUNDLE    = join(ROOT, 'bundle');
const PUSH      = process.argv.includes('--push');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const C = { cyan: '\x1b[36m', dim: '\x1b[2m', red: '\x1b[31m', reset: '\x1b[0m' };
const log = msg => console.log(`\n${C.cyan}● ${msg}${C.reset}`);

function run(cmd, cwd = ROOT) {
  console.log(`  ${C.dim}$ ${cmd}${C.reset}`);
  const r = spawnSync(cmd, { cwd, shell: true, stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`\n${C.red}✗ Command failed (exit ${r.status}): ${cmd}${C.reset}`);
    process.exit(r.status ?? 1);
  }
}

/** true when the git index has staged changes relative to HEAD (or no HEAD yet). */
function hasStagedChanges(cwd) {
  // On a branch with no commits yet, diff --cached returns 1 even when empty;
  // check for commits first.
  const head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd, stdio: 'pipe' });
  if (head.status !== 0) {
    // No commits yet — anything staged counts as a change.
    const ls = spawnSync('git', ['diff', '--cached', '--name-only'], { cwd, stdio: 'pipe' });
    return ls.stdout.toString().trim().length > 0;
  }
  const diff = spawnSync('git', ['diff', '--cached', '--quiet'], { cwd, stdio: 'pipe' });
  return diff.status !== 0;
}

function fetchText(url) {
  return new Promise((ok, fail) => {
    https.get(url, r => {
      let b = '';
      r.on('data', c => b += c);
      r.on('end', () =>
        r.statusCode === 200 ? ok(b) : fail(new Error(`HTTP ${r.statusCode} ${url}`))
      );
    }).on('error', fail);
  });
}

// ─── 1. Update source submodules to branch tips ──────────────────────────────

log('Updating backend / frontend / cli submodules to their branch tips…');
run('git submodule update --init --remote backend frontend cli');

// ─── 2. Build the Angular frontend ───────────────────────────────────────────

log('Installing frontend dependencies…');
// The committed package-lock.json may contain empty version strings for
// optional platform packages (a known npm lock-file stale-entry issue).
// Delete it before install so npm resolves fresh, then restore it.
const lockFile  = join(FRONTEND, 'package-lock.json');
const lockBak   = lockFile + '.bak';
const lockExist = existsSync(lockFile);
if (lockExist) renameSync(lockFile, lockBak);
try {
  run('npm install', FRONTEND);
} finally {
  // Restore so the submodule working tree stays clean for git
  if (lockExist && existsSync(lockBak)) renameSync(lockBak, lockFile);
}

// ── Patch packages that ship broken on the npm registry ──────────────────────
//
//  • postcss-media-query-parser  — dist/nodes/ directory missing from tarball
//  • tinyglobby                  — dist/index.mjs missing from tarball
//
//  These checks are no-ops once patches are already in place.

const PQP_DIST = join(FRONTEND, 'node_modules/postcss-media-query-parser/dist');

if (!existsSync(join(PQP_DIST, 'nodes/Node.js'))) {
  log('Patching postcss-media-query-parser (dist/nodes/ absent from npm tarball)…');
  const RAW = 'https://raw.githubusercontent.com/dryoma/postcss-media-query-parser/master/src/';

  function esmToCjs(src) {
    const named = [], defs = [];
    src = src.replace(/^export default (class|function) (\w+)/gm, (_, kw, n) => { defs.push(n); return `${kw} ${n}`; });
    src = src.replace(/^export default (\w+);\s*$/gm, (_, n) => { defs.push(n); return ''; });
    src = src.replace(/^export (class|function|const|let|var) (\w+)/gm, (_, kw, n) => { named.push(n); return `${kw} ${n}`; });
    src = src.replace(/^export \{([^}]+)\};\s*$/gm, (_, ns) =>
      ns.split(',').map(n => n.trim()).map(n => `exports.${n}=${n};`).join('\n'));
    src = src.replace(/^import (\w+) from '([^']+?)(?:\.js)?';\s*$/gm, (_, n, p) => `const ${n}=require('${p}').default;`);
    src = src.replace(/^import \{([^}]+)\} from '([^']+?)(?:\.js)?';\s*$/gm, (_, ns, p) => `const {${ns.trim()}}=require('${p}');`);
    let out = `'use strict';\nObject.defineProperty(exports,'__esModule',{value:true});\n\n${src}`;
    [...new Set(defs)].forEach(n => out += `\nexports.default=${n};`);
    [...new Set(named)].forEach(n => out += `\nexports.${n}=${n};`);
    return out;
  }

  mkdirSync(join(PQP_DIST, 'nodes'), { recursive: true });
  for (const f of ['nodes/Node.js', 'nodes/Container.js', 'parsers.js']) {
    const src = await fetchText(RAW + f);
    writeFileSync(join(PQP_DIST, f), esmToCjs(src));
    console.log(`    patched ${f}`);
  }
}

const TGMJS = join(FRONTEND, 'node_modules/tinyglobby/dist/index.mjs');
if (!existsSync(TGMJS)) {
  log('Patching tinyglobby (dist/index.mjs absent from npm tarball)…');
  writeFileSync(TGMJS,
    `import cjs from './index.cjs';\n` +
    `const { convertPathToPattern, escapePath, glob, globSync, isDynamicPattern } = cjs;\n` +
    `export { convertPathToPattern, escapePath, glob, globSync, isDynamicPattern };\n` +
    `export default cjs;\n`
  );
  console.log('    patched tinyglobby/dist/index.mjs');
}
// ─────────────────────────────────────────────────────────────────────────────

log('Building Angular SPA…');
run('npx ng build', FRONTEND);

const INDEX_HTML = join(FRONTEND, 'dist/snip-frontend/browser/index.html');
if (!existsSync(INDEX_HTML)) {
  console.error(`\n${C.red}✗ Build output missing: ${INDEX_HTML}${C.reset}`);
  process.exit(1);
}
log('Frontend build verified ✓');

// ─── 3. Assemble bundle/ ─────────────────────────────────────────────────────

log('Assembling bundle/…');

// Ensure bundle submodule is on the bundle branch before writing
{
  const br = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'],
    { cwd: BUNDLE, stdio: 'pipe' }).stdout.toString().trim();
  if (br !== 'bundle') run('git checkout -B bundle', BUNDLE);
}

// Propagate git identity into the submodule if not already set
{
  const email = spawnSync('git', ['config', 'user.email'], { cwd: BUNDLE, stdio: 'pipe' }).stdout.toString().trim();
  if (!email) {
    const parentEmail = spawnSync('git', ['config', 'user.email'], { cwd: ROOT, stdio: 'pipe' }).stdout.toString().trim();
    const parentName  = spawnSync('git', ['config', 'user.name'],  { cwd: ROOT, stdio: 'pipe' }).stdout.toString().trim();
    if (parentEmail) run(`git config user.email "${parentEmail}"`, BUNDLE);
    if (parentName)  run(`git config user.name  "${parentName}"`,  BUNDLE);
  }
}

// server.js  (Bun API server — used as-is)
cpSync(join(ROOT, 'backend/server.js'), join(BUNDLE, 'server.js'));

// cli.js  (Node CLI — used as-is)
cpSync(join(ROOT, 'cli/cli.js'), join(BUNDLE, 'cli.js'));

// public/  (Angular SPA build output)
const PUBLIC = join(BUNDLE, 'public');
if (existsSync(PUBLIC)) rmSync(PUBLIC, { recursive: true, force: true });
cpSync(join(FRONTEND, 'dist/snip-frontend/browser'), PUBLIC, { recursive: true });

// .env  — Bun auto-loads this; enables static-file serving in server.js
writeFileSync(join(BUNDLE, '.env'), 'PUBLIC_DIR=./public\n');

// package.json  — NO "type" field: keeps cli.js runnable under plain node
writeFileSync(join(BUNDLE, 'package.json'), JSON.stringify({
  name:        'snip-bundle',
  version:     '1.0.0',
  description: 'Snip URL shortener — production bundle (auto-generated, do not edit)',
  scripts:     { start: 'bun server.js' },
}, null, 2) + '\n');

// Dockerfile
writeFileSync(join(BUNDLE, 'Dockerfile'), [
  'FROM oven/bun:1-alpine',
  'WORKDIR /app',
  'COPY . .',
  'ENV PORT=3000',
  'EXPOSE 3000',
  'CMD bun server.js',
  '',
].join('\n'));

// .dockerignore
writeFileSync(join(BUNDLE, '.dockerignore'), [
  'node_modules',
  '*.md',
  '',
].join('\n'));

// railway.json  — select Dockerfile builder
writeFileSync(join(BUNDLE, 'railway.json'), JSON.stringify({
  $schema: 'https://railway.app/railway.schema.json',
  build:   { builder: 'DOCKERFILE' },
  deploy:  { restartPolicyType: 'ON_FAILURE' },
}, null, 2) + '\n');

log('bundle/ assembled ✓');

// ─── 4. Commit inside bundle/ ────────────────────────────────────────────────

log('Committing inside bundle/…');
run('git add -A', BUNDLE);
if (hasStagedChanges(BUNDLE)) {
  run('git commit -m "chore: bundle update [automated]"', BUNDLE);
  log('bundle/: committed ✓');
} else {
  log('bundle/: nothing to commit — skipping ✓');
}

// ─── 5. Bump bundle submodule pointer in superproject ────────────────────────

log('Bumping bundle pointer in superproject…');
run('git add bundle', ROOT);
if (hasStagedChanges(ROOT)) {
  run('git commit -m "chore: bump bundle submodule"', ROOT);
  log('superproject: committed ✓');
} else {
  log('superproject: nothing to commit — skipping ✓');
}

// ─── 6. Push (only with --push) ──────────────────────────────────────────────

if (PUSH) {
  log('Pushing bundle branch…');
  run('git push origin HEAD:bundle', BUNDLE);   // HEAD:bundle works from detached HEAD too
  log('Pushing main branch…');
  run('git push', ROOT);
  log('Pushed ✓');
} else {
  log('Skipping push — re-run with --push to publish.');
}

log('Done!');
