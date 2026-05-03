# Release process

## Branch workflow

From [`CONTRIBUTING.md`](../CONTRIBUTING.md):

- Feature branches from **`dev`**.
- Pull requests into **`dev`**.
- Promote releases **`dev` → `main`**.

## Commitizen (`cz.toml`)

[`cz.toml`](../cz.toml):

| Setting | Value |
|---------|--------|
| `name` | `cz_conventional_commits` |
| `tag_format` | `$version` |
| `version_scheme` | `semver` |
| `version_provider` | `npm` |
| `update_changelog_on_bump` | `true` |
| `major_version_zero` | `true` |

Version source is [`package.json`](../package.json) `version` (currently `0.0.0` style).

## `bumpversion.yml`

[`bumpversion.yml`](../.github/workflows/bumpversion.yml)

- **Trigger**: `push` to **`main`** only.
- **Skip** when commit message starts with `bump:` or `auto:` (avoids loops).
- **Checkout**: `PERSONAL_ACCESS_TOKEN` secret with `fetch-depth: 0`.
- **Steps**: `commitizen-tools/commitizen-action@master` with `changelog_increment_filename: body.md` → `ncipollo/release-action@v1` with `tag: ${{ env.REVISION }}`, `bodyFile: body.md`, `skipIfReleaseExists: true`.

**Note:** Workflow comments mention default `GITHUB_TOKEN` read-only limitations for some release scenarios; PAT used for checkout/commitizen.

## Related docs

- CI (not bump): [`14-ci-and-deploy.md`](./14-ci-and-deploy.md)
