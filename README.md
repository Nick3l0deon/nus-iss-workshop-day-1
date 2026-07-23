# Snip Backend

Single-file Bun backend for a tiny URL shortener.

## Run

```bash
bun start
```

## API

- `POST /api/links` with `{ "url": "https://..." }` -> `201` link record, `400` on invalid JSON/URL
- `GET /api/links` -> `200` array of link records
- `GET /:code` -> `302` redirect and increments `hits`, `404` if unknown

Link record shape:

```json
{
  "code": "a1B2c3",
  "url": "https://example.com/",
  "shortUrl": "http://localhost:3000/a1B2c3",
  "hits": 0,
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```

## Environment

- `PORT` (default `3000`)
- `BASE_URL` (uses URL origin for `shortUrl`)
- fallback base origin: `https://$RAILWAY_PUBLIC_DOMAIN` when set, else `http://localhost:$PORT`
- `PUBLIC_DIR` optional static directory; `/` serves `index.html`, and existing static files win over same-named short codes
