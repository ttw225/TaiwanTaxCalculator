# CI and deploy

## `ci.yml`

[`ci.yml`](../.github/workflows/ci.yml)

- **Triggers**: `pull_request`, `push` to `main` / `dev`, `workflow_dispatch`.
- **Permissions**: `contents: read`.
- **Job** `check` on `ubuntu-latest`: checkout → pnpm setup → Node **24** with pnpm cache → `pnpm install --frozen-lockfile` → `pnpm typecheck` → `pnpm lint` → `pnpm test` → `pnpm build`.

## `pages-preview.yml`

[`pages-preview.yml`](../.github/workflows/pages-preview.yml)

- **Permissions**: `contents: write`, `pull-requests: write`.
- **Concurrency**: all jobs use group `github-pages-previews`, `cancel-in-progress: false` (serializes deploys).

### Job `deploy-dev`

- **If**: `github.event_name == 'push' || github.event_name == 'workflow_dispatch'`. Under `on.push.branches: [dev]`, a qualifying `push` is only to **`dev`**.
- Build env:

```yaml
VITE_BASE_PATH: /TaiwanTaxCalculator/dev/
VITE_DEPLOY_CONTEXT: dev
VITE_DEPLOY_LABEL: DEV
VITE_COMMIT_SHA: ${{ github.sha }}
```

- Clones or initializes **`gh-pages`** worktree, copies `dist` → `pages-worktree/dev/`, touches `.nojekyll`, runs **`render-pages-index.sh`**, commits `deploy: update dev test site` if changed, pushes to `gh-pages`.

### Job `deploy-pr-preview`

- **If**: `pull_request`, action not `closed`, **same-repo** head (`head.repo.full_name == github.repository`).
- Build env:

```yaml
VITE_BASE_PATH: /TaiwanTaxCalculator/pr-preview/pr-${{ github.event.pull_request.number }}/
VITE_DEPLOY_CONTEXT: pr-preview
VITE_PR_NUMBER: ${{ github.event.pull_request.number }}
VITE_COMMIT_SHA: ${{ github.event.pull_request.head.sha }}
```

- Deploys to `pages-worktree/pr-preview/pr-<N>/`, re-renders index, commits `deploy: update pr-<N> preview`.
- **PR comment**: `actions/github-script@v8` upserts comment with marker `<!-- tax-web-pr-preview -->` and preview URL `https://<owner>.github.io/TaiwanTaxCalculator/pr-preview/pr-<N>/`.

### Job `cleanup-pr-preview`

- **If**: PR `closed`, same-repo head.
- Checks out **`dev`** ref, removes `pr-preview/pr-<N>` from worktree, re-renders index, commits `deploy: remove pr-<N> preview`.

## `render-pages-index.sh`

[`render-pages-index.sh`](../.github/scripts/render-pages-index.sh)

- Args: `<pages-root>` (gh-pages root).
- **`PRODUCTION_URL`** env default `https://taiwantaxcalculator.com/`.
- Lists `pr-preview/pr-*` dirs (sorted), writes **`index.html`** (zh-Hant) with sections: Production link, Dev (`dev/`), PR list, UTC footer timestamp.

## Dependabot

[`dependabot.yml`](../.github/dependabot.yml): weekly **github-actions** ecosystem only (no npm entry).

## Local subpath preview

See [`README.md`](../README.md) for `VITE_BASE_PATH` + `pnpm build` / `pnpm preview` examples matching GitHub Pages paths.

## Related docs

- Release: [`15-release-process.md`](./15-release-process.md)
- Deploy metadata in app: [`src/lib/deployInfo.ts`](../src/lib/deployInfo.ts)
