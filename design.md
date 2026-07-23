# Snip Design System
_Borrowed visual language from lovable.dev — dark, minimal, warm-glow hero._

---

## Colour Tokens

| Token              | Value          | Usage                          |
|--------------------|----------------|--------------------------------|
| `--bg`             | `#0d0d10`      | Page background                |
| `--surface`        | `#17171c`      | Cards / input fields           |
| `--surface-raised` | `#1e1e26`      | Hovered / elevated cards       |
| `--border`         | `#2a2a36`      | Subtle card / input borders    |
| `--text`           | `#f0f0f4`      | Primary text                   |
| `--muted`          | `#7a7a92`      | Subtitles, metadata, placeholders |
| `--accent`         | `#f06a40`      | Primary CTA button             |
| `--accent-hover`   | `#e5562c`      | CTA hover state                |
| `--success-bg`     | `rgba(255,255,255,.06)` | Result notice surface  |
| `--error`          | `#f26b6b`      | Inline error text              |

## Accent Gradient (Hero Glow)

A **full-viewport-width** band fixed at the top — not confined to the content column.

```css
background: radial-gradient(ellipse 120% 60% at 50% -10%,
  rgba(240, 106, 64, 0.35) 0%,
  rgba(220,  80,120, 0.20) 40%,
  transparent 70%);
```

- `position: fixed; top: 0; left: 0; right: 0; height: 420px`
- `pointer-events: none; z-index: 0`
- Content layer sits on `z-index: 1` above the glow

## Typography

```
font-family: "Inter", "Helvetica Neue", Arial, sans-serif;
```

| Scale       | Size / Weight          | Usage                  |
|-------------|------------------------|------------------------|
| Hero title  | 3rem / 700             | `<h1>` page header     |
| Subtitle    | 1.1rem / 400, muted    | Hero sub-line          |
| Section h2  | 1rem / 600, uppercase, muted | Table heading    |
| Body        | 0.95rem / 400          | Table cells, labels    |
| Small/meta  | 0.8rem / 400, muted    | Timestamps, hit counts |
| Letter-spacing on h1 | `-0.03em`   |                        |

## Spacing

Base unit: `8px`. Use multiples: `8 / 16 / 24 / 32 / 48 / 64 / 96px`.

- Page top-padding (below hero band): `160px`
- Max-width content column: `680px`, centered
- Section gap: `48px`
- Card internal padding: `24px`

## Border Radii

| Context        | Value   |
|----------------|---------|
| Pill input     | `999px` |
| CTA button     | `999px` |
| Cards / table  | `16px`  |
| Small badges   | `6px`   |

## Borders, Shadows & Glow

```css
/* Card */
border: 1px solid var(--border);
box-shadow: 0 4px 32px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.04);

/* Input focus glow */
box-shadow: 0 0 0 3px rgba(240,106,64,.30);
outline: none;
```

---

## Snip Element → Design System Map

| Snip element       | Design role                                                  |
|--------------------|--------------------------------------------------------------|
| `<h1>Snip</h1>`    | Hero title — large, bold, centered, above the glow band      |
| Subtitle copy      | Muted sub-line directly under h1                             |
| URL `<form>`       | Chat-style pill input + pill CTA button, centred in hero     |
| Inline errors      | `--error` colour, small, under the input row                 |
| Result notice      | Semi-transparent surface card (`--success-bg`), rounded, short code link |
| "All links" table  | Dark surface card (`--surface`), `border-radius: 16px`, full-width inside column |
| Table header row   | `--muted` uppercase labels, `0.75rem`, letter-spaced         |
| Table data rows    | Separated by `border-top: 1px solid var(--border)`           |
