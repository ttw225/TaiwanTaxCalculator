# Taiwan Tax Calculate · 台灣節稅資訊平台

網站：<https://TaiwanTaxCalculate.com>

開源網站，協助理解台灣 **綜合所得稅** 常見節稅方向、檢核與決策工具。目前仍持續開發中。

本網站為純前端應用：計算與輸入的內容僅在瀏覽器內處理，不會傳送至任何伺服器；偏好與表單狀態等僅儲存在您的瀏覽器本機。

本 repo 以 Vite + React + TypeScript 建置，稅額與欄位以站內資料與內容模組為準；內容僅供參考，不構成專業稅務或法律建議。

## Tech stack

Vite、React 19、TypeScript、Tailwind CSS、Vitest、ESLint（flat config）。

## Requirements

- [Node.js](https://nodejs.org/) **20.19+** or **22.12+** (Vite 8; see `engines` in [`package.json`](./package.json))
- [pnpm](https://pnpm.io/) **9+** (lockfile v9 in this repo; see `engines` in [`package.json`](./package.json))

## Command

| 指令 | 說明 |
|------|------|
| `pnpm install` | 安裝依賴 |
| `pnpm dev` | 本機開發（預設 port `5173`） |
| `pnpm build` | 型別檢查與正式建置 |
| `pnpm preview` | 預覽 production 建置 |
| `pnpm typecheck` | 僅 TypeScript 檢查 |
| `pnpm test` | 執行測試 |
| `pnpm test:watch` | 測試監看模式 |
| `pnpm lint` | ESLint |

## Project layout

- `src/components/` — 介面元件  
- `src/content/` — 文案與結構化內容  
- `src/lib/` — 邏輯、設定（如 `siteConfig.ts`）  
- `src/data/` — 站內年度數值等 JSON  
- `tests/` — Vitest 測試  
