# Styling and print

## Tailwind CSS v4

- Entry: [`src/index.css`](../src/index.css) — `@import "tailwindcss";`
- Vite plugin: `@tailwindcss/vite` in [`vite.config.ts`](../vite.config.ts).
- Utility classes applied inline in components (e.g. layout, colors). Brand token strings live in [`src/lib/siteConfig.ts`](../src/lib/siteConfig.ts) `BRAND` for header/footer.

## Screen vs print visibility

- **`.print-only`**: `display: none` on screen; `display: block !important` in `@media print`. Used for the duplicate tax-summary stack in [`ChecklistResult`](../src/components/ChecklistResult.tsx).
- **`.no-print`**: hidden in print (header actions, sidebar summary, modals, FAB, export controls).

## Print stylesheet (`@media print` in `index.css`)

- **`@page`**: `size: A4`, `margin: 14mm 14mm 26mm` (extra bottom margin for browser print headers/footers).
- **`html, body`**: white background; `print-color-adjust: exact` on root and all descendants so badge/radio backgrounds print faithfully.
- **`.print-container`**: full width; `padding: 0 2px 0 0` (2px right inset so card borders are not clipped at the page edge in Safari).
- **`.print-main-layout`**: `display: block` (single-column flow for print).
- **Page breaks**: `section`, `.print-card`, `.print-summary-card` use `break-inside: avoid` / `page-break-inside: avoid`.
- **Exception**: `.print-scenarios-card` and inner `section` use `break-inside: auto` so long “all combinations” content can continue across pages instead of forcing a blank page.
- **Shadows**: removed on `.print-card`, `.print-summary-card`, `.print-scenarios-card`.
- **Chrome cleanup**: `.min-h-screen` and `main` forced to white block layout; `.checklist-reminder-card` white background (no gray fill on paper).
- **`details`**: summary list-style suppressed; closed `details` still show non-summary children for print.
- **`a`**: inherit color, no underline in print.

### Site footer in print

- `footer.site-footer > .print-footer-content`: `break-before: page` — footer starts on a fresh page (site metadata separate from checklist body; avoids clipping copyright under browser-generated URL footers).
- Footer `.grid` → `display: block` (Chrome `break-inside: avoid` is unreliable on flex children).
- `.print-footer-section` blocks: `break-inside: avoid`, `display: table` + `width: 100%` so each section (關於本站, 申報提醒, 意見回報, 支持我們) reflows whole to the next page when needed.

## Layout hooks used in components

| Class | Typical use |
|-------|-------------|
| `print-container` | Results page root in `ChecklistResult` |
| `print-card` | Each checklist card root (`ChecklistCardShell` — used by `DeductionCard` / `IncomeCard`) |
| `print-only` | Screen-hidden; print-visible tax summary + all scenarios |
| `print-tax-summary-stack` | Wrapper for print-mode `TaxSummaryPanel` + `PrintScenarioCombinations` |
| `print-tax-summary-cards` | Outer wrapper when `TaxSummaryPanel` `printMode` |
| `print-summary-card` | 填寫摘要 / 試算結果 summary cards |
| `print-scenarios-card` | Print “all tax combinations” card (may break inside) |
| `print-scenario-divider` | Divider spacing inside scenarios card |
| `print-footer-section` | Footer subsection kept atomic across page breaks |
| `no-print` | Header actions, interactive sidebar, modals, back-to-top, export controls |

## Scroll animation

[`src/lib/scrollAnimation.ts`](../src/lib/scrollAnimation.ts):

- Default duration **1000ms**, ease-out cubic.
- **`prefers-reduced-motion: reduce`** → instant `scrollTo` (no rAF animation).
- Cancels in-flight animation on new target via `cancelScrollAnimation`.

## Related docs

- UI: [`10-ui-components.md`](./10-ui-components.md)
