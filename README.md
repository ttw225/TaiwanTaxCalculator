# Taiwan Tax Calculate · 台灣節稅資訊平台

網站：<https://TaiwanTaxCalculate.com>

開源網站，協助理解台灣 **綜合所得稅** 常見節稅方向與檢核。目前仍持續開發中。

本網站為純前端應用：計算與輸入的內容僅在瀏覽器內處理，不會傳送至任何伺服器；偏好與表單狀態等僅儲存在您的瀏覽器本機。

本 repo 以 React Router v7（靜態預渲染）+ Vite + React + TypeScript 建置，稅額與欄位以站內資料與內容模組為準；內容僅供參考，不構成專業稅務或法律建議。

## Tech stack

React Router v7、Vite 8、React 19、TypeScript、Tailwind CSS、Vitest、ESLint（flat config）。

## Requirements

- [Node.js](https://nodejs.org/) **24+** (see `engines` in [`package.json`](./package.json))
- [pnpm](https://pnpm.io/) **11+** (see `engines` and `packageManager` in [`package.json`](./package.json))

### 基本安裝流程（nvm → Node → pnpm）

以下為 **macOS / Linux** 常見指令。

推薦使用 nvm 管理本機 node 版本；
如不使用 nvm，可改由 [Node.js 官網](https://nodejs.org/) 安裝程式取得符合版本的 Node，並跳至 **步驟 3** 。
Node 版本來源以 [`package.json`](./package.json) `engines.node` 為準（目前為 24+）。

**1. 安裝 nvm**

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
```

重新開啟終端機，或載入 shell 設定：

```bash
source ~/.zshrc    # zsh
# source ~/.bashrc # bash
```

**2. 安裝並使用 Node**（以 **24** 為例）

```bash
nvm install 24
nvm use 24
nvm alias default 24   # 可選：預設開啟終端機時使用此版本
node -v
```

**3. 安裝 pnpm**（**11+**）

```bash
corepack enable
pnpm -v
```

### 升級既有環境到目前版本

```bash
# 進入專案後，使用 Node 24
nvm install 24
nvm use 24

# 啟用並切到 package.json 指定的 pnpm 版本
corepack enable
pnpm -v

# 同步依賴套件
pnpm install
```

## Command

| 指令 | 說明 |
|------|------|
| `pnpm install` | 安裝依賴套件 |
| `pnpm dev` | 本機開發（預設 port `5173`） |
| `pnpm build` | 型別檢查與正式建置 |
| `pnpm preview` | 預覽 production 建置 |
| `pnpm typecheck` | 僅 TypeScript 檢查 |
| `pnpm test` | 執行測試 |
| `pnpm test:watch` | 測試監看模式 |
| `pnpm lint` | ESLint |

## Deploy previews

正式網站部署在 Cloudflare Pages；GitHub Pages 僅作為測試站與 PR preview。

| 目標 | URL | 觸發 |
|------|-----|------|
| 測試站 | <https://ttw225.github.io/TaiwanTaxCalculator/dev/> | push 到 `dev` branch |
| PR preview | `https://ttw225.github.io/TaiwanTaxCalculator/pr-preview/pr-<number>/` | PR opened / synchronized / reopened |

GitHub repository 的 Pages 設定需使用 `gh-pages` branch、`/(root)` 作為 publishing source。Workflow 會保留同一個 Pages site 內的不同資料夾：

```text
index.html
dev/
pr-preview/pr-123/
```

<https://ttw225.github.io/TaiwanTaxCalculator/> 會顯示一個簡單入口頁，列出 production、dev 與目前存在的 PR preview。入口頁由 `.github/scripts/render-pages-index.sh` 在部署與 cleanup 時重新產生。

測試站與 PR preview build 會注入 `VITE_BASE_PATH`，避免 GitHub Pages 子路徑載入資產時壞掉；畫面上也會顯示 `DEV` 或 `PR #123` 標籤。

### 本地測試 GitHub Pages 子路徑

<details>
<summary>子路徑 build／preview 指令與本機網址</summary>

本地測試時，`pnpm build` 和 `pnpm preview` 都要帶同一個 `VITE_BASE_PATH`，否則 preview server 會把子路徑 asset request fallback 成 HTML，瀏覽器會顯示空白頁。

測試站：

```bash
VITE_BASE_PATH=/TaiwanTaxCalculator/dev/ \
VITE_DEPLOY_CONTEXT=dev \
VITE_DEPLOY_LABEL=DEV \
VITE_COMMIT_SHA=$(git rev-parse HEAD) \
pnpm build

VITE_BASE_PATH=/TaiwanTaxCalculator/dev/ pnpm preview
```

打開：

```text
http://localhost:4173/TaiwanTaxCalculator/dev/
```

PR preview：

```bash
VITE_BASE_PATH=/TaiwanTaxCalculator/pr-preview/pr-123/ \
VITE_DEPLOY_CONTEXT=pr-preview \
VITE_PR_NUMBER=123 \
VITE_COMMIT_SHA=$(git rev-parse HEAD) \
pnpm build

VITE_BASE_PATH=/TaiwanTaxCalculator/pr-preview/pr-123/ pnpm preview
```

打開：

```text
http://localhost:4173/TaiwanTaxCalculator/pr-preview/pr-123/
```

</details>

## Project layout

- `src/components/` — 介面元件  
- `src/content/` — 文案與結構化內容  
- `src/lib/` — 邏輯、設定（如 `siteConfig.ts`）  
- `src/data/` — 站內年度數值等 JSON  
- `tests/` — Vitest 測試  

## Authors

- **[Peter](https://github.com/ttw225)** — 專案建立人，主導功能開發 / Project creator & lead developer
- **[Jessica](https://github.com/jessicaips)** — UI/UX 設計主導，規劃介面設計與互動流程，並共同參與功能開發 / UX lead — shaped the interface design and interaction flows; co-developer
