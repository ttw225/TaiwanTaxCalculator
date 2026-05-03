# Conventions and policies

## User-facing language

- **Traditional Chinese (zh-TW)** for UI copy and content modules unless the product adds another locale.
- Agent-facing docs in this folder are **English** by design.

## Tax numbers and claims

- **Do not invent** statutory rates, brackets, deadlines, or procedures.
- Use [`src/data/numbers_2026.json`](../src/data/numbers_2026.json) and [`src/lib/numbers.ts`](../src/lib/numbers.ts) (or existing content patterns) as the in-repo numeric source of truth.
- Align explanatory tone with existing [`src/content/`](../src/content/) modules and [`SITE_CONFIG`](../src/lib/siteConfig.ts).

## Stable identifiers

- **`source_id`** in `SourceRef` objects should stay stable for traceability (called out in [`src/content/deductions.ts`](../src/content/deductions.ts)).
- Checklist **`item.id`** and **`SituationId`** values are API surface for filtering, storage normalization, and `ITEM_INLINE_FIELDS` keys.

## Private research monorepo

- This repo is **not** the private `tax` research monorepo.
- Do not paste private research excerpts into **public** GitHub issues or PR descriptions.
- Optional local paths: copy [`AGENTS.local.md.example`](../AGENTS.local.md.example) to gitignored **`AGENTS.local.md`**.

## Cursor rules (`.cursor/rules/`)

| File | `alwaysApply` | `globs` | Summary |
|------|---------------|---------|---------|
| [`project-core.mdc`](../.cursor/rules/project-core.mdc) | yes | — | Stack, zh-TW, numbers JSON, test/lint after logic changes, no private research in public, `AGENTS.local.md` |
| [`content.mdc`](../.cursor/rules/content.mdc) | no | `src/content/**` | Align with `siteConfig`, numbers, preserve export shapes, cautious tone |
| [`typescript-react.mdc`](../.cursor/rules/typescript-react.mdc) | no | `**/*.{ts,tsx}` | Patterns, types from `src/types`, ESLint flat, functional components |

## Maintainer docs

- Human agent entry: [`AGENTS.md`](../AGENTS.md), [`CLAUDE.md`](../CLAUDE.md).
- Contributing / security: [`CONTRIBUTING.md`](../CONTRIBUTING.md), [`SECURITY.md`](../SECURITY.md).

## After substantive code changes

- Prefer **`pnpm test`** and **`pnpm lint`** when feasible ([`AGENTS.md`](../AGENTS.md)).

## Related docs

- Update triggers for `ai-context/`: [`17-update-protocol.md`](./17-update-protocol.md)
