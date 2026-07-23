#!/usr/bin/env node
// scripts/build-bundle.mjs
// Assembles the "bundle" submodule from backend + frontend + cli.
// Usage:
//   node scripts/build-bundle.mjs           # build only
//   node scripts/build-bundle.mjs --push    # build + push bundle + bump main
//
// Safe no-op when nothing changed (idempotent).

import { execSync }           from "node:child_process";
import { existsSync, mkdirSync, cpSync, writeFileSync, rmSync } from "node:fs";
import { resolve, join }      from "node:path";
import { fileURLToPath }      from "node:url";

// ── Paths ──────────────────────────────────────────────────────────────────

const ROOT     = resolve(fileURLToPath(import.meta.url), "../..");
const BACKEND  = join(ROOT, "backend");
const FRONTEND = join(ROOT, "frontend");
const CLI_DIR  = join(ROOT, "cli");
const BUNDLE   = join(ROOT, "bundle");
const DIST     = join(FRONTEND, "dist", "snip-frontend", "browser");

const PUSH = process.argv.includes("--push");

// ── Helpers ────────────────────────────────────────────────────────────────

function run(cmd, cwd = ROOT) {
  console.log(`  $ ${cmd}`);
  execSync(cmd, { cwd, stdio: "inherit" });
}

function runCapture(cmd, cwd = ROOT) {
  return execSync(cmd, { cwd, encoding: "utf8" }).trim();
}

/** Returns true when `git diff --cached` is non-empty inside dir. */
function hasStaged(dir) {
  const out = runCapture("git diff --cached --name-only", dir);
  return out.length > 0;
}

/** Returns true when there is any diff (staged or unstaged) for a path. */
function superprojectDirty(path) {
  const rel = path.replace(ROOT + "/", "");
  const out = runCapture(`git status --porcelain -- ${rel}`, ROOT);
  return out.length > 0;
}

// ── Step 1: update all source submodules to branch tips ───────────────────

console.log("\n▶ Updating submodules to branch tips…");
run("git submodule update --init --remote backend frontend cli");

// ── Step 2: build the Angular frontend ────────────────────────────────────

console.log("\n▶ Installing frontend dependencies…");
run("npm install --prefer-offline", FRONTEND);

console.log("\n▶ Building Angular app…");
run("npx ng build", FRONTEND);

if (!existsSync(join(DIST, "index.html"))) {
  console.error(`\n✗ Build output missing: ${join(DIST, "index.html")}`);
  process.exit(1);
}
console.log("  ✓ frontend/dist/snip-frontend/browser/index.html exists");

// ── Step 3: assemble bundle/ ───────────────────────────────────────────────

console.log("\n▶ Assembling bundle/…");

// 3a. server.js
const serverSrc = join(BACKEND, "server.js");
const serverDst = join(BUNDLE, "server.js");
cpSync(serverSrc, serverDst);
console.log("  ✓ server.js");

// 3b. cli.js
const cliSrc = join(CLI_DIR, "cli.js");
const cliDst = join(BUNDLE, "cli.js");
cpSync(cliSrc, cliDst);
console.log("  ✓ cli.js");

// 3c. public/ — wipe and re-copy so stale files don't linger
const publicDst = join(BUNDLE, "public");
if (existsSync(publicDst)) rmSync(publicDst, { recursive: true });
mkdirSync(publicDst, { recursive: true });
cpSync(DIST, publicDst, { recursive: true });
console.log("  ✓ public/ (Angular build output)");

// 3d. .env
writeFileSync(join(BUNDLE, ".env"), "PUBLIC_DIR=./public\n");
console.log("  ✓ .env");

// 3e. package.json  (NO "type" field — cli.js is CommonJS)
const pkgJson = {
  name: "snip-bundle",
  version: "1.0.0",
  private: true,
  scripts: { start: "bun server.js" },
  engines: { bun: ">=1" },
};
writeFileSync(join(BUNDLE, "package.json"), JSON.stringify(pkgJson, null, 2) + "\n");
console.log("  ✓ package.json");

// 3f. Dockerfile
const dockerfile = `\
FROM oven/bun:1-alpine
WORKDIR /app
COPY . .
ENV PORT=3000
EXPOSE 3000
CMD bun server.js
`;
writeFileSync(join(BUNDLE, "Dockerfile"), dockerfile);
console.log("  ✓ Dockerfile");

// 3g. .dockerignore
const dockerignore = `\
node_modules
.git
`;
writeFileSync(join(BUNDLE, ".dockerignore"), dockerignore);
console.log("  ✓ .dockerignore");

// 3h. railway.json
const railwayJson = {
  $schema: "https://railway.app/railway.schema.json",
  build: { builder: "DOCKERFILE", dockerfilePath: "Dockerfile" },
  deploy: { startCommand: "bun server.js", restartPolicyType: "ON_FAILURE" },
};
writeFileSync(join(BUNDLE, "railway.json"), JSON.stringify(railwayJson, null, 2) + "\n");
console.log("  ✓ railway.json");

// ── Step 4: commit inside bundle/ (no-op if nothing changed) ──────────────

console.log("\n▶ Committing inside bundle/…");
run("git add -A", BUNDLE);

if (!hasStaged(BUNDLE)) {
  console.log("  ✓ Nothing to commit in bundle/ — output is unchanged.");
} else {
  const now = new Date().toISOString();
  run(`git commit -m "chore: regenerate bundle ${now}"`, BUNDLE);
  console.log("  ✓ bundle/ committed");

  if (PUSH) {
    console.log("\n▶ Pushing bundle branch…");
    // Submodule checkouts are detached — push explicitly to the branch ref
    run("git push origin HEAD:bundle", BUNDLE);
    console.log("  ✓ bundle branch pushed");
  }
}

// ── Step 5: bump submodule pointer in superproject (no-op if unchanged) ───

console.log("\n▶ Bumping superproject submodule pointer…");
run("git add bundle", ROOT);

if (!hasStaged(ROOT)) {
  console.log("  ✓ Superproject pointer unchanged — nothing to commit.");
} else {
  run(`git commit -m "chore: bump bundle submodule"`, ROOT);
  console.log("  ✓ Superproject committed");

  if (PUSH) {
    console.log("\n▶ Pushing main…");
    run("git push origin main", ROOT);
    console.log("  ✓ main pushed");
  }
}

console.log("\n✅ build-bundle.mjs complete.\n");
