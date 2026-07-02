# Snip — URL Shortener

One backend, two clients. Each layer lives on its own orphan branch in this repository
and is mounted here as a git submodule.

```
snip-demo/          ← superproject (main branch)
├── backend/        ← Bun server           (branch: backend)
├── frontend/       ← Angular 19 SPA       (branch: frontend)
└── cli/            ← Node 18+ CLI         (branch: cli)
```

The **backend** stores short links in an in-memory Map and exposes a tiny REST API.
The **frontend** (browser) and the **cli** (terminal) are independent clients that both
speak to the same three endpoints — you can run either or both alongside the server.

---

## API Contract

All endpoints include open CORS headers (`Access-Control-Allow-Origin: *`) and handle
`OPTIONS` preflight requests.

| Method | Path         | Body                      | Success                                               | Error |
|--------|--------------|---------------------------|-------------------------------------------------------|-------|
| POST   | /api/links   | `{ "url": "https://…" }` | **201** `{ code, url, shortUrl, hits, createdAt }`    | 400 — invalid JSON or non-http(s) URL |
| GET    | /api/links   | —                         | **200** array of link objects (same shape)            | —     |
| GET    | /:code       | —                         | **302** → original URL, `hits` incremented            | 404 — unknown code |

### Link object shape

```json
{
  "code":      "aB3xY9",
  "url":       "https://example.com/very/long/path",
  "shortUrl":  "https://snip.example.com/aB3xY9",
  "hits":      3,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

---

## Repository Layout

Each layer is developed independently on its own **orphan branch** (no shared history)
and pinned here as a **submodule** commit pointer:

| Submodule    | Branch     | Tech                              | Start command               |
|--------------|------------|-----------------------------------|-----------------------------|
| `backend/`   | `backend`  | Bun, single file, zero npm deps   | `bun start`                 |
| `frontend/`  | `frontend` | Angular 19, signals, HttpClient   | `npm start` (ng serve)      |
| `cli/`       | `cli`      | Node 18+, CommonJS, zero npm deps | `node cli.js` / `snip …`    |

The superproject (`main`) only contains `.gitmodules` and this README — no source code.

---

## Cloning

> **Important:** a plain `git clone` leaves all submodule folders **empty**.
> Always clone the superproject branch with `--recurse-submodules`:

```sh
git clone -b main --recurse-submodules https://github.com/Chronoa123/ai-sdlc-snip-demo.git
```

Already cloned without the flag?

```sh
git submodule update --init --recursive
```

---

## Running All Three Pieces

### 1 — Backend (start this first)

```sh
cd backend
bun start          # default port 3000
```

| Variable               | Default                       | Purpose                                          |
|------------------------|-------------------------------|--------------------------------------------------|
| `PORT`                 | `3000`                        | HTTP listen port                                 |
| `BASE_URL`             | `http://localhost:<PORT>`     | Origin prepended to short codes in responses     |
| `RAILWAY_PUBLIC_DOMAIN`| —                             | Auto-set by Railway; fallback when BASE_URL absent|
| `PUBLIC_DIR`           | —                             | Serve static files (e.g. frontend build output)  |

### 2 — Frontend (browser SPA)

```sh
cd frontend
npm install
npm start          # ng serve → http://localhost:4200
```

Or serve the production build through the backend directly:

```sh
cd frontend && npx ng build
cd ../backend && PUBLIC_DIR=../frontend/dist/snip-frontend/browser bun start
```

### 3 — CLI (terminal)

```sh
# Install globally (once):
cd cli && npm install -g .

snip add https://example.com/long/path   # → http://localhost:3000/aB3xY9
snip ls                                  # aligned CODE / HITS / URL table
snip open aB3xY9                         # opens URL in default browser
```

Without a global install:

```sh
node cli/cli.js add https://example.com/long/path
```

Set `SNIP_API` to point at a non-local backend:

```sh
SNIP_API=https://your-backend.railway.app snip ls
```

---

## Submodule Update Workflow

The superproject stores a **commit pointer** for each submodule, not a branch ref.
When you push new commits to a submodule branch, bump the pointer in the superproject:

```sh
# 1. Develop & push inside the submodule
cd backend
# ... edit server.js ...
git add -A && git commit -m "feat: add rate limiting"
git push

# 2. Update the pointer in the superproject
cd ..
git submodule update --remote backend   # fast-forwards pointer to latest commit
git add backend
git commit -m "chore: bump backend submodule"
git push
```

To update **all** submodules at once:

```sh
git submodule update --remote
git add .
git commit -m "chore: bump all submodules"
git push
```

To work on a submodule in-place (without leaving the superproject tree):

```sh
cd backend
git checkout backend          # put submodule on its branch (not detached HEAD)
# ... make changes, commit, push as normal ...
cd ..
git add backend && git commit -m "chore: bump backend"
```
