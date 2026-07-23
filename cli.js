#!/usr/bin/env node
"use strict";

// cli.js — Snip CLI  (zero npm dependencies, CommonJS, Node 18+)

const { execSync } = require("child_process");

const BASE = (process.env.SNIP_API || "http://localhost:3000").replace(/\/$/, "");

// ── Helpers ────────────────────────────────────────────────────────────────

function die(msg) {
  process.stderr.write(`snip: ${msg}\n`);
  process.exit(1);
}

async function apiFetch(path, opts = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, opts);
  } catch (err) {
    die(`Cannot reach backend at ${BASE} — ${err.message}`);
  }
  return res;
}

/** Open a URL in the default OS browser (macOS / Windows / Linux). */
function openBrowser(url) {
  const platform = process.platform;
  try {
    if (platform === "darwin") {
      execSync(`open ${JSON.stringify(url)}`);
    } else if (platform === "win32") {
      execSync(`start "" ${JSON.stringify(url)}`, { shell: true });
    } else {
      execSync(`xdg-open ${JSON.stringify(url)}`);
    }
  } catch (err) {
    die(`Could not open browser: ${err.message}`);
  }
}

// ── Commands ───────────────────────────────────────────────────────────────

async function cmdAdd(url) {
  if (!url) die("Usage: snip add <url>");

  // Basic client-side validation
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      die("URL must use http or https");
    }
  } catch {
    die(`Invalid URL: ${url}`);
  }

  const res = await apiFetch("/api/links", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body.error) msg += ` — ${body.error}`;
    } catch {}
    die(msg);
  }

  const link = await res.json();
  process.stdout.write(`${link.shortUrl}\n`);
}

async function cmdLs() {
  const res = await apiFetch("/api/links");

  if (!res.ok) die(`HTTP ${res.status}`);

  const links = await res.json();
  if (!Array.isArray(links) || links.length === 0) {
    process.stdout.write("No links yet.\n");
    return;
  }

  // Align columns: CODE  HITS  URL
  const codeW = Math.max(4, ...links.map((l) => l.code.length));
  const hitsW = Math.max(4, ...links.map((l) => String(l.hits).length));

  const row = (code, hits, url) =>
    `${code.padEnd(codeW)}  ${String(hits).padStart(hitsW)}  ${url}`;

  process.stdout.write(row("CODE", "HITS", "URL") + "\n");
  process.stdout.write(row("─".repeat(codeW), "─".repeat(hitsW), "─".repeat(40)) + "\n");
  for (const l of links) {
    process.stdout.write(row(l.code, l.hits, l.url) + "\n");
  }
}

async function cmdOpen(code) {
  if (!code) die("Usage: snip open <code>");

  // Follow the redirect manually so we can read the Location header
  const res = await apiFetch(`/${code}`, { redirect: "manual" });

  if (res.status === 404) die(`Unknown code: ${code}`);

  if (res.status === 302 || res.status === 301) {
    const location = res.headers.get("location");
    if (!location) die("Backend returned a redirect without a Location header");
    process.stdout.write(`Opening ${location}\n`);
    openBrowser(location);
    return;
  }

  die(`Unexpected response: HTTP ${res.status}`);
}

function printUsage() {
  process.stdout.write(
    [
      "Usage:",
      "  snip add <url>    Shorten a URL and print the short link",
      "  snip ls           List all shortened links",
      "  snip open <code>  Open a short code in the browser",
      "",
      "Environment:",
      `  SNIP_API   Backend base URL (default: http://localhost:3000)`,
      "",
    ].join("\n")
  );
}

// ── Entry point ────────────────────────────────────────────────────────────

(async () => {
  const [, , cmd, arg] = process.argv;

  switch (cmd) {
    case "add":
      await cmdAdd(arg);
      break;
    case "ls":
      await cmdLs();
      break;
    case "open":
      await cmdOpen(arg);
      break;
    default:
      printUsage();
      if (cmd && cmd !== "help") process.exit(1);
  }
})();
