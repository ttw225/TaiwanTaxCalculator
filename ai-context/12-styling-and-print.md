# Styling and print

## Tailwind CSS v4

- Entry: [`src/index.css`](../src/index.css) — `@import "tailwindcss";`
- Vite plugin: `@tailwindcss/vite` in [`vite.config.ts`](../vite.config.ts).
- Utility classes applied inline in components (e.g. layout, colors). Brand token strings live in [`src/lib/siteConfig.ts`](../src/lib/siteConfig.ts) `BRAND` for header/footer.

## Print stylesheet (`@media print` in `index.css`)

- **`@page`**: `size: A4`, `margin: 14mm`.
- **`html, body`**: white background, dark text (forced with `!important`).
- **`.no-print`**: `display: none !important` — hides nav actions, modals, FAB, etc., for print/PDF.
- **`.print-container`**: full width, no extra max-width/padding constraints for print.
- **`section`, `.print-card`**: `break-inside: avoid` / `page-break-inside: avoid` to reduce split cards across pages.
- **`details`**: summary list-style suppressed; closed `details` still show non-summary children for print.
- **`a`**: inherit color, no underline in print.

## Layout hooks used in components

| Class | Typical use |
|-------|-------------|
| `print-container` | Results page root in `ChecklistResult` |
| `print-card` | Each checklist card root (`ChecklistCardShell` — used by `DeductionCard` / `GrossIncomeCard`) |
| `no-print` | Header actions, modals, decision tools panel (per product choice), back-to-top, export controls |

## Scroll animation

[`src/lib/scrollAnimation.ts`](../src/lib/scrollAnimation.ts):

- Default duration **1000ms**, ease-out cubic.
- **`prefers-reduced-motion: reduce`** → instant `scrollTo` (no rAF animation).
- Cancels in-flight animation on new target via `cancelScrollAnimation`.

## Related docs

- UI: [`10-ui-components.md`](./10-ui-components.md)
