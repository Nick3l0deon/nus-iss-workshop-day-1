const { randomInt } = require("node:crypto");
const { existsSync } = require("node:fs");
const path = require("node:path");

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = process.env.PUBLIC_DIR || "";
const links = new Map();

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

function resolveBaseOrigin() {
  const explicit = process.env.BASE_URL;
  if (explicit) {
    try {
      return new URL(explicit).origin;
    } catch {
      // Ignore invalid BASE_URL and continue fallback chain.
    }
  }

  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  }

  return `http://localhost:${PORT}`;
}

const BASE_ORIGIN = resolveBaseOrigin();

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(),
    },
  });
}

function randomCode() {
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += BASE62[randomInt(0, BASE62.length)];
  }
  return code;
}

function generateUniqueCode() {
  let code = randomCode();
  while (links.has(code)) {
    code = randomCode();
  }
  return code;
}

function normalizePathname(pathname) {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return pathname;
  }
}

function staticPathFor(pathname) {
  if (!PUBLIC_DIR) {
    return null;
  }

  const normalizedPath = pathname === "/" ? "/index.html" : pathname;
  const relative = normalizedPath.replace(/^\/+/, "");
  const absPublic = path.resolve(PUBLIC_DIR);
  const absFile = path.resolve(absPublic, relative);

  if (absFile === absPublic || absFile.startsWith(`${absPublic}${path.sep}`)) {
    return absFile;
  }

  return null;
}

async function maybeServeStatic(pathname, headers = {}) {
  const filePath = staticPathFor(pathname);
  if (!filePath) {
    return null;
  }

  if (!existsSync(filePath)) {
    return null;
  }

  const file = Bun.file(filePath);
  return new Response(file, {
    status: 200,
    headers: {
      ...headers,
      ...corsHeaders(),
    },
  });
}

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const pathname = normalizePathname(url.pathname);

    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    if (req.method === "POST" && pathname === "/api/links") {
      let payload;
      try {
        payload = await req.json();
      } catch {
        return json({ error: "Invalid JSON" }, 400);
      }

      const rawUrl = typeof payload?.url === "string" ? payload.url.trim() : "";
      let parsed;
      try {
        parsed = new URL(rawUrl);
      } catch {
        return json({ error: "Invalid URL" }, 400);
      }

      if (parsed.protocol !== "http:" && parsed.protocol !== "https:"\) {
        return json({ error: "Invalid URL" }, 400);
      }

      const code = generateUniqueCode();
      const record = {
        code,
        url: parsed.toString(),
        shortUrl: `${BASE_ORIGIN}/${code}`,
        hits: 0,
        createdAt: new Date().toISOString(),
      };

      links.set(code, record);
      return json(record, 201);
    }

    if (req.method === "GET" && pathname === "/api/links") {
      return json(Array.from(links.values()));
    }

    if (req.method === "GET") {
      const staticResponse = await maybeServeStatic(pathname);
      if (staticResponse) {
        return staticResponse;
      }

      const code = pathname.slice(1);
      if (!code) {
        return json({ error: "Not Found" }, 404);
      }

      const record = links.get(code);
      if (!record) {
        return json({ error: "Not Found" }, 404);
      }

      record.hits += 1;
      return new Response(null, {
        status: 302,
        headers: {
          Location: record.url,
          ...corsHeaders(),
        },
      });
    }

    return json({ error: "Not Found" }, 404);
  },
});

console.log(`Snip backend listening on ${BASE_ORIGIN} (port ${PORT})`);
