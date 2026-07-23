# Snip

A tiny URL shortener built as three independent layers, each on its own git branch
and mounted here as a submodule.

```
snip-demo (superproject, main branch)
├── backend/    ← branch: backend   — Bun server, zero npm deps
├── frontend/   ← branch: frontend  — Angular 19 SPA
└── cli/        ← branch: cli       — Node CLI, zero npm deps
```

---

## Architecture

```
Browser / CLI
     │
     ▼
POST /api/links  { url }  →  201  { code, url, shortUrl, hits, createdAt }
GET  /api/links           →  200  [ …link objects… ]
GET  /:code               →  302  Location: <original URL>   (hits++)
                              404  unknown code
```

### API contract

| Method | Path         | Body / Notes                     | Success | Error          |
|--------|--------------|----------------------------------|---------|----------------|
| POST   | /api/links   | `{ "url": "https://…" }`         | 201 link object | 400 `{ error }` |
| GET    | /api/links   | —                                | 200 array       | —               |
| GET    | /:code       | Redirects, increments `hits`     | 302 Location    | 404 `{ error }` |

**Link object shape**

```json
{
  "code":     "aB3xYz",
  "url":      "https://example.com/very/long/path",
  "shortUrl": "https://my-snip.railway.app/aB3xYz",
  "hits":     4,
  "createdAt":"2026-07-23T08:00:00.000Z"
}
```

---

## Branch-per-layer layout

Each layer lives on its own orphan branch with no shared history:

| Branch     | Contents                                 |
|------------|------------------------------------------|
| `main`     | This file + `.gitmodules` + `scripts/` only (superproject) |
| `backend`  | `server.js`, `package.json`, `README.md` |
| `frontend` | Angular 19 app (`src/`, `angular.json`, …) |
| `cli`      | `cli.js`, wrappers, `package.json`, `README.md` |
| [`bundle`](https://github.com/Nick3l0deon/nus-iss-workshop-day-1/tree/bundle) | Generated output — `server.js` + `cli.js` + built Angular assets + `Dockerfile` |

> **Do not edit the `bundle` branch by hand.** It is assembled by
> `scripts/build-bundle.mjs` (see [Bundle workflow](#bundle-workflow) below).

The `main` branch mounts the other three as submodules so a single
`git clone --recurse-submodules` gives you the whole project.

---

## Clone

```bash
# Full clone — all three submodules checked out automatically
git clone --recurse-submodules <REPO_URL>

# Already cloned but forgot --recurse-submodules?
git submodule update --init --recursive
```

> Plain `git clone <REPO_URL>` leaves `backend/`, `frontend/`, and `cli/`
> as empty directories. Always use `--recurse-submodules`.

---

## Run

### Backend (Bun required, Node 18+ also works via `node server.js`)

```bash
cd backend
# optional env vars:
#   PORT=3000  BASE_URL=https://my-snip.railway.app  PUBLIC_DIR=../frontend/dist/snip-frontend/browser
bun start          # or: node server.js
```

### Frontend (dev server)

```bash
cd frontend
npm install
npx ng serve       # → http://localhost:4200
```

### Frontend (serve built assets via backend)

```bash
cd frontend && npm install && npx ng build
cd ../backend
PUBLIC_DIR=../frontend/dist/snip-frontend/browser bun start
# single origin: http://localhost:3000
```

### CLI

```bash
cd cli
# run directly:
node cli.js add https://example.com
node cli.js ls
node cli.js open aB3xYz

# or install globally:
npm link           # then just: snip add / snip ls / snip open

# point at a non-local backend:
SNIP_API=https://my-snip.railway.app snip ls
```

---

## Update workflow

When you commit new work inside a submodule, the superproject needs its pointer
bumped too:

```bash
# 1. Work inside a submodule as normal
cd backend
# ... edit files ...
git add -A && git commit -m "feat: add expiry support"
git push origin backend

# 2. Back in the superproject — pull the new commit and bump the pointer
cd ..
git submodule update --remote backend   # fast-forward to HEAD of the branch
git add backend
git commit -m "chore: bump backend submodule"
git push origin main
```

To update **all** submodules at once:

```bash
git submodule update --remote
git add backend frontend cli
git commit -m "chore: bump all submodules"
```

> `git submodule update --remote` fetches the tracked branch tip for every
> submodule. Without `--remote` git only checks out the pinned commit already
> recorded in the superproject.

---

## Note on `.gitmodules` URLs

The `url` fields in `.gitmodules` must be set to the actual remote URL before
pushing or sharing this superproject. Replace `<REPO_URL>` with the real URL:

```bash
# Quick sed replacement (macOS):
sed -i '' 's|<REPO_URL>|git@github.com:you/snip-demo.git|g' .gitmodules
git config -f .gitmodules submodule.backend.url  git@github.com:you/snip-demo.git
git config -f .gitmodules submodule.frontend.url git@github.com:you/snip-demo.git
git config -f .gitmodules submodule.cli.url      git@github.com:you/snip-demo.git
git submodule sync
git add .gitmodules && git commit -m "chore: set remote submodule URLs"
git push -u origin main
```

---

## Bundle workflow

`scripts/build-bundle.mjs` (Node 18+, zero dependencies) assembles the `bundle`
branch from the three source branches. It is **idempotent** — running it twice in
a row when nothing changed produces no new commits.

### What it does

1. Updates `backend`, `frontend`, `cli` submodules to their branch tips
2. Runs `npm install` + `npx ng build` in `frontend/`
3. Assembles `bundle/`:
   - `server.js` — copied from `backend/`
   - `cli.js` — copied from `cli/`
   - `public/` — Angular build output (`dist/snip-frontend/browser/`)
   - `.env` — `PUBLIC_DIR=./public` (tells Bun server to serve the SPA)
   - `package.json` — `"start": "bun server.js"`, no `"type"` field
   - `Dockerfile` — `FROM oven/bun:1-alpine`, exposes port 3000
   - `.dockerignore`
   - `railway.json` — selects the Dockerfile builder
4. Commits inside `bundle/` and bumps the superproject pointer

### Usage

```bash
# Build only (safe, no network writes)
node scripts/build-bundle.mjs

# Build + push bundle branch + push main
node scripts/build-bundle.mjs --push
```

### Deploy to Railway

Point Railway at this repo, select the **bundle** branch, and it will use
`railway.json` → `Dockerfile` automatically. Set env vars:

| Variable              | Example value                      |
|-----------------------|------------------------------------|
| `PORT`                | `3000` (Railway sets this for you) |
| `RAILWAY_PUBLIC_DOMAIN` | set by Railway automatically     |
