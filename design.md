# Snip Design System

Borrowed visual language from lovable.dev — dark-first, warm coral/pink gradient
glow, pill-shaped centered input, generously rounded cards, clean sans-serif type,
lots of breathing room.

---

## Color Tokens

| Token           | Value                       | Usage                                        |
|-----------------|-----------------------------|----------------------------------------------|
| `--bg`          | `#0a0a0f`                   | Page background                              |
| `--surface`     | `#111118`                   | Card / section backgrounds                   |
| `--surface-hi`  | `#191926`                   | Input container, raised / hovered surface    |
| `--border`      | `rgba(255 255 255 / 0.07)`  | Subtle dividers, card and input borders      |
| `--border-hi`   | `rgba(255 255 255 / 0.14)`  | Focus / hover state borders                  |
| `--text`        | `#ededf5`                   | Primary body text                            |
| `--muted`       | `rgba(237 237 245 / 0.42)`  | Subheadline, table labels, placeholder text  |
| `--accent-from` | `#ff6a50`                   | Gradient start — coral-orange                |
| `--accent-to`   | `#d040b8`                   | Gradient end — hot pink / violet             |
| `--error`       | `#f87171`                   | Inline error messages                        |
| `--success`     | `#4ade80`                   | Short-link result color                      |

---

## Accent Gradient

Applied to h1 gradient-clip text, the primary button, and as the ambient hero glow.

```css
/* Button / text gradient */
linear-gradient(135deg, var(--accent-from), var(--accent-to))

/* Body-level hero glow (fixed background-image on body) */
radial-gradient(
  ellipse 90% 60% at 50% -10%,
  rgba(255, 106, 80, 0.28) 0%,
  rgba(200, 50, 180, 0.16) 50%,
  transparent 70%
)
```

---

## Typography

Font stack: `system-ui, -apple-system, 'Segoe UI', sans-serif`

| Element           | Size                         | Weight | Extra                            |
|-------------------|------------------------------|--------|----------------------------------|
| `h1` hero         | `clamp(2.2rem, 5vw, 3.2rem)` | 800    | Gradient clip text, -0.04em tracking |
| `.hero-sub`       | `1.05rem`                    | 400    | `--muted`, centered              |
| Body              | `0.95rem`                    | 400    | `--text`, 1.6 line-height        |
| `td:first-child a`| `0.85rem`                    | 600    | Monospace, `--accent-from`       |
| `h2` section label| `0.72rem`                    | 600    | Uppercase, 0.08em tracking, `--muted` |
| `th` column head  | `0.68rem`                    | 500    | Uppercase, 0.07em tracking, `--muted` |

---

## Spacing Scale

| Name | Value    | Usage                               |
|------|----------|-------------------------------------|
| xs   | `0.4rem` | Tight internal gaps                 |
| sm   | `0.75rem`| Cell padding, form inner spacing    |
| md   | `1.25rem`| Between form elements               |
| lg   | `1.5rem` | Card internal padding               |
| xl   | `4rem`   | Hero top padding                    |

---

## Border Radius

| Token      | Value   | Usage                            |
|------------|---------|----------------------------------|
| `--r-sm`   | `8px`   | Result / error notices           |
| `--r-md`   | `18px`  | Cards                            |
| `--r-pill` | `999px` | URL input row, primary button    |

---

## Borders, Shadows & Glow

**Card:**
```
border: 1px solid var(--border)
border-radius: var(--r-md)
box-shadow: 0 8px 32px rgba(0 0 0 / 0.55), 0 0 0 1px rgba(255 255 255 / 0.05)
```

**Input row (rest):**
```
background: var(--surface-hi)
border: 1px solid var(--border)
border-radius: var(--r-pill)
```

**Input row (:focus-within):**
```
border-color: rgba(255, 106, 80, 0.45)
box-shadow: 0 0 0 2px rgba(255, 106, 80, 0.30), 0 0 20px rgba(255, 106, 80, 0.12)
```

**Primary button:**
```
background: linear-gradient(135deg, --accent-from, --accent-to)
border-radius: var(--r-pill)
box-shadow: 0 0 20px rgba(255, 106, 80, 0.35)
```

---

## Snip UI Element Mapping

| UI Element           | Design Role               | Key Rules                                              |
|----------------------|---------------------------|--------------------------------------------------------|
| `<body>`             | Ambient glow canvas       | Near-black + fixed coral radial gradient on top        |
| `.hero` + `<h1>`     | Hero headline             | Centered, gradient clip text, xl top padding           |
| `.hero-sub`          | Muted tagline             | `--muted` color, `1.05rem`, centered                   |
| `.row` (input + btn) | Chat-style pill input     | `--surface-hi` bg, pill radius, glow on `:focus-within`|
| `button[type=submit]`| Primary CTA               | Accent gradient, pill, coral glow shadow               |
| `.result`            | Success feedback          | Soft green-tinted surface, `--success` link            |
| `.error`             | Error feedback            | `--error` text only, no background                     |
| `.card`              | Content card              | `--surface`, `--r-md`, shadow-card                     |
| `<table>`            | Link records              | Full-width, `--border` row dividers                    |
| `<th>`               | Column labels             | Uppercase micro-text, `--muted`                        |
| `td:first-child a`   | Short code                | Monospace, `--accent-from`, semi-bold                  |
