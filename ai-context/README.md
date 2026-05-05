# tax-web — AI context (English)

Machine- and human-oriented documentation for this repository. Read this folder **before** large edits so you do not need to re-scan the whole tree.

## How to use

1. Skim this file and `MAP.json` (topic index).
2. Open the numbered doc that matches your task (domain, UI, CI, etc.).
3. Treat linked paths (`src/...`, `tests/...`) as the source of truth; refresh `ai-context/` when those contracts change (see `17-update-protocol.md`).

## Document map

| File | Topic |
|------|--------|
| [01-overview.md](./01-overview.md) | Product scope, deployments, non-goals |
| [02-stack-and-tooling.md](./02-stack-and-tooling.md) | Stack, engines, scripts, configs |
| [03-repo-layout.md](./03-repo-layout.md) | Directory roles |
| [04-domain-model.md](./04-domain-model.md) | Shared TypeScript types |
| [05-tax-numbers.md](./05-tax-numbers.md) | `numbers_2026.json`, `getNumber`, brackets |
| [06-content-modules.md](./06-content-modules.md) | Situations, checklist items, decision-tool meta, inline fields |
| [07-app-flow-and-state.md](./07-app-flow-and-state.md) | `App.tsx` state machine and effects |
| [08-checklist-engine.md](./08-checklist-engine.md) | Publication gate, situation filter, category grouping |
| [09-decision-tools.md](./09-decision-tools.md) | Dividend / couple filing / AMT logic |
| [10-ui-components.md](./10-ui-components.md) | React components and props |
| [11-storage-and-persistence.md](./11-storage-and-persistence.md) | localStorage keys and sync |
| [12-styling-and-print.md](./12-styling-and-print.md) | Tailwind v4, print CSS |
| [13-testing.md](./13-testing.md) | Vitest layout and invariants |
| [14-ci-and-deploy.md](./14-ci-and-deploy.md) | GitHub Actions, Pages previews |
| [15-release-process.md](./15-release-process.md) | Commitizen, version bump workflow |
| [16-conventions-and-policies.md](./16-conventions-and-policies.md) | zh-TW UI, numbers policy, private repo policy |
| [17-update-protocol.md](./17-update-protocol.md) | When to update which doc |

## Machine-readable index

See [`MAP.json`](./MAP.json) for a stable `topics[]` list (id, file, keywords).

## Maintenance

Non-trivial changes should update the relevant `ai-context/*.md` files in the same PR when feasible. Full trigger matrix: `17-update-protocol.md`.
