# Claude Code — tax-web

This is the **standalone public frontend** (Vite + React + TypeScript). It does **not** include the private `tax` research monorepo.

**Read [`AGENTS.md`](./AGENTS.md)** for stack, commands, directory layout, and tax-content rules. Optional paths to a local private clone: copy [`AGENTS.local.md.example`](./AGENTS.local.md.example) to gitignored **`AGENTS.local.md`**.

Policies in short:

- User-facing copy: **zh-TW** unless another locale is explicitly added.
- Numeric tax data in this repo: **`src/data/numbers_2026.json`** / **`src/lib/numbers.ts`** — do not invent figures.
- After substantive changes: **`pnpm test`** and **`pnpm lint`** when practical.
- Cursor-specific snippets live in **`.cursor/rules/*.mdc`**.
