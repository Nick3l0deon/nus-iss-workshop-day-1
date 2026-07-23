# Snip CLI

Zero-dependency Node.js CLI for the [Snip](../backend) URL shortener.  
Requires Node 18+ (uses global `fetch`).

## Install

```bash
npm link          # makes `snip` available globally via the bin entry
# — or run directly —
node cli.js <command>
```

## Usage

```
snip add <url>    Shorten a URL and print the short link
snip ls           List all shortened links (aligned table)
snip open <code>  Open a short code in the default OS browser
```

### Examples

```bash
snip add https://github.com/nicholaschew/snip
# → http://localhost:3000/aB3xYz

snip ls
# CODE    HITS  URL
# ──────  ────  ────────────────────────────────────────
# aB3xYz     2  https://github.com/nicholaschew/snip

snip open aB3xYz
# Opening https://github.com/nicholaschew/snip
```

## Configuration

| Variable   | Default                  | Description               |
|------------|--------------------------|---------------------------|
| `SNIP_API` | `http://localhost:3000`  | Backend base URL          |

```bash
SNIP_API=https://my-snip.railway.app snip ls
```

## Error handling

- Invalid or non-http(s) URL → message on stderr, exit 1  
- Unknown short code → message on stderr, exit 1  
- Backend unreachable → message on stderr, exit 1  

## Files

| File       | Purpose                              |
|------------|--------------------------------------|
| `cli.js`   | Main entry — all commands            |
| `snip`     | POSIX shell wrapper (macOS / Linux)  |
| `snip.cmd` | CMD wrapper (Windows)                |
| `snip.ps1` | PowerShell wrapper (Windows)         |
