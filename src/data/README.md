# 綜所稅繳稅回饋 v2

114 年度（2026 年 5 月申報）各銀行綜所稅繳稅回饋／分期資料集。

- **唯一 SSOT**：[`tax_payment_rewards_114.json`](tax_payment_rewards_114.json)
- **卡別目錄**：[`card_catalog_114.json`](card_catalog_114.json)（`eligible_card_ids` 指定卡別的 metadata，透過 `card_id` 與 rewards JSON join）
- **舊資料**：[`../_legacy/`](../_legacy/)（2026-05-20 起停用，僅供查閱）

## 為什麼有 v2

舊架構（`../_legacy/`）把 paytax 名單、卡別清冊、活動表、Tier 規則拆成 8 個 JSON 加 8-phase 校對流程，維護成本高。v2 改以**銀行為主軸**、單一 JSON 承載活動；收集期曾用 `verification` 區分覆核進度，**v2.5 起已移除**，複核與變更紀錄改由 git commit 歷史追蹤。

## Schema（v2.7）

每家銀行可有**多個 campaigns**（不同活動、不同卡別、不同 URL）。每個 campaign 自帶 source URL、適用卡別，內含可選的 `rebate` 與 `installment` 子物件。

```jsonc
{
  "tax_year": "114",
  "schema_version": "v2.7",
  "banks": [
    {
      "bank_code": "005",                       // 三位數金融機構代號
      "bank_name": "土地銀行",
      "campaigns": [
        {
          "campaign_id": "twpay_general",       // 銀行內唯一 slug
          "title": "台灣 Pay 掃碼繳稅",
          "source_url": "https://...",          // 此活動的主要官方公告頁
          "source_url_alt": "https://...",      // 選填：同活動的替代連結（例如圖文版）；缺省視同無
          "source_id": "tp_bank_005_tax_114_1", // 對應 sources.yaml；無對應時可為 null
          "eligible_cards": "全卡別 / 金融卡",  // 自由文字，人類可讀描述
          "eligible_card_types": ["credit", "debit"], // 適用卡別類型；["credit"] | ["debit"] | ["credit","debit"] | []
          "eligible_card_ids": [                // 明確指定的 card_id 陣列（對應 card_catalog_114.json）；全卡別填 []
            "bank005_jcb_premium"
          ],
          "channel": ["台灣 Pay"],              // 繳費管道列表（互斥入口，同一官方管道只列一項）；無限制則 null
          "registration_status": "open",        // "open" | "full" | null；僅 requires_registration=true 時填；缺省視同 null
          "tags": ["taiwan_pay", "credit_card"], // 前端 TypeFilter 標籤；人工維護，可空陣列
          "rebate": {                           // 無回饋則整個物件設 null
            "requires_registration": false,
            "period": null,

            // ── 可計算欄位（前端排序與試算用） ──
            "mode": "rate",                     // "rate" | "rate-tiered" | "fixed" | "installment_only" | "fee_only"
            "rate": 0.5,                        // 數字 %（mode="rate" 必填）
            "fixed": 200,                       // 數字 NT$（mode="fixed" 必填）
            "fixed_unit": "元刷卡金",            // 顯示單位（元／哩／點／券／LINE POINTS 等）
            "min": 200,                         // 單筆繳稅門檻 NT$；無門檻 → null
            "base_fixed": 100,                  // rate 模式可加的基本定額（與 rate 同筆併發）
            "cap_nt": 3000,                     // 數字回饋上限（單位同 fixed_unit）；無上限 → null
            "cap_label": "加碼上限 3,000 元",   // 簡短人類可讀上限字串
            "amount_tiers": [                   // mode="rate-tiered" 必填；first matching min wins
              // rate-type 級距：按金額 * rate% 計算，可帶 cap_nt
              { "kind": "rate",  "min": 10000000, "rate": 0.36, "cap_nt": 100000, "label": "單筆滿 1,000 萬" },
              { "kind": "rate",  "min": 5000000,  "rate": 0.28, "cap_nt": null,   "label": "單筆滿 500 萬" },
              { "kind": "rate",  "min": 0,        "rate": 0.20, "cap_nt": null,   "label": "單筆未達 500 萬" },
              // fixed-type 級距：到達 min 即送 fixed 數量（單位由 fixed_unit 指定）
              { "kind": "fixed", "min": 1000000,  "fixed": 2500, "fixed_unit": "元", "label": "滿 100 萬 → 2,500 元" }
            ]
          },
          "installment": {                      // 無分期則整個物件設 null
            "summary": "...",
            "min_amount": 3000                  // 選填：分期最低金額（元）；缺省視同無限制
          },
          "notes": null
        }
        // ...同一銀行的其他活動
      ]
    }
  ]
}
```

**`channel` 命名**：財政部官方線上繳稅入口 canonical 為 `財政部網路繳稅服務網（Paytax）`（`pay.tax.gov.tw`）。勿在陣列中並列 `Paytax` 與 `財政部網路繳稅服務網`；`summary` 等自由文字可口語寫 Paytax。

**欄位缺省規則**：`tiers`、`registration_status` 是選填欄位，缺省或未出現時前端視同 `null`。只在有意義時加入，不需要補到每一筆。

**v2.7 欄位移除**：相較 v2.6 刪去 `rebate.{summary,rate_or_amount,tiers,cap}`、`installment.{terms,fee_note}`、`bank.notes`；`amount_tiers` 改為 `kind: "rate" | "fixed"` 的 discriminated union。前端僅顯示 `installment.summary`；若 `installment` 為 `null`，則不顯示分期摘要。

**列表文案規則**：`title` 是前端列表掃描用短標籤，預期由卡別／客群／管道加優惠類型組成；銀行名稱、綜所稅、繳稅等頁面上下文通常不重複寫入。`installment.summary` 是一行摘要，優先放主要門檻、期數與上限；登錄、管道限制、互斥、入帳與資格細節放 `period`、`channel`、`requires_registration` 或 `campaign.notes`。摘要目標 35–55 字，階梯式優惠可較長但不應遺失門檻。

**campaigns 空陣列的情境**：銀行有官網但目前無 114 年度活動／舊資料指向錯誤頁／業務已退出。請在 `campaigns[0].notes` 寫原因並附 ref URL（v2.7 起已不保留 bank-level `notes`）。

**`eligible_card_ids` 語意**：
- 空陣列 `[]`：活動適用對象為 `eligible_card_types` 所列類型的**全卡別**（不區分特定卡面）
- 非空陣列：活動**僅限**所列 `card_id` 的持卡人；`card_id` 對應 `card_catalog_114.json`，新增指定卡面時同步補目錄

**前端查詢邏輯**（使用者選卡後過濾）：
```
使用者選卡 card_id = "bank007_ileo"（bank_code: "007"）
→ 找 bank 007 所有 campaigns
→ 篩選條件：eligible_card_ids 為空 [] 或含 "bank007_ileo"
→ 符合則顯示該 campaign
```

## 前端試算契約（v2.7）

前端依 `rebate.mode` 對使用者輸入金額 `amount` 解算「估算回饋金額」，五種模式：

| `mode` | 計算 | 必填欄位 |
| --- | --- | --- |
| `rate` | `amount * rate / 100`，有 `base_fixed` 再加上；觸發 `cap_nt` 即封頂 | `rate`；選填 `min`／`cap_nt`／`base_fixed`／`fixed_unit` |
| `rate-tiered` | 依 `amount_tiers` 由大到小排序，取**第一個** `amount >= tier.min` 的級距：`kind:"rate"` 套用 `rate` 與 `cap_nt`；`kind:"fixed"` 直接給 `fixed`（單位 `fixed_unit`，可選 `cap_nt`） | `amount_tiers[]` |
| `fixed` | 固定值 `fixed`（單位 `fixed_unit`） | `fixed`；建議補 `fixed_unit` |
| `installment_only` | 不算回饋金額，僅顯示分期資訊 | — |
| `fee_only` | 不算回饋金額（例：手續費頁、抽獎、間接回饋） | — |

**門檻**：若指定 `min` 且 `amount < min`，前端標示「不符門檻」並排在最後。
**上限**：`cap_nt` 觸發時顯示「已達上限 NT$ {cap_nt}」。
**多卡別／多客群同公告**：若同公告的不同卡或客群採用**不同 rate**，需在 JSON 拆成多個 campaign（各自 `eligible_card_ids` 或在 `eligible_cards` 描述客群），**不要**塞進 `amount_tiers`。`amount_tiers` 僅用於「同一張卡、依繳稅金額切級距」。

### 計算欄位填寫範例

- 「定額 100 元」→ `mode:"fixed"`, `fixed:100`, `fixed_unit:"元刷卡金"`, `min:100`
- 「0.36%（每戶上限 10 萬）」→ `mode:"rate"`, `rate:0.36`, `cap_nt:100000`
- 「單筆 500 萬以上 0.36%；以下 0.2%」→ `mode:"rate-tiered"`, `amount_tiers:[{kind:"rate",min:5000000,rate:0.36,...},{kind:"rate",min:0,rate:0.2,...}]`
- 「滿 100 萬送 2,500 元；滿 50 萬送 1,000 元」→ `mode:"rate-tiered"`, `amount_tiers:[{kind:"fixed",min:1000000,fixed:2500,fixed_unit:"元",...},{kind:"fixed",min:500000,fixed:1000,fixed_unit:"元",...}]`
- 「不算回饋只算分期」→ `rebate: null`（不需 mode）
- 「手續費頁／抽獎／需另案兌換的非繳稅金額回饋」→ `mode:"fee_only"`

## card_catalog_114.json Schema

記錄 `eligible_card_ids` 明確指定的卡別 metadata。**未出現在任何 `eligible_card_ids` 的卡別不需加入**；前端若 `eligible_card_ids: []` 則顯示「全卡別適用」，不需要逐張卡查目錄。

```jsonc
{
  "tax_year": "114",
  "schema_version": "v1.1",
  "notes": "card_id 格式：bank{bank_code}_{slug}…",
  "cards": [
    {
      "card_id": "bank005_jcb_premium",
      "bank_code": "005",
      "bank_name": "土地銀行",
      "display_name_zh": "土地銀行 JCB 極緻卡",
      "type": "credit",
      "card_network": "JCB",
      "is_generic": false,
      "image_url": null,
      "notes": null
    }
  ]
}
```

新增卡別：若 campaign 指定特定卡面，在 `card_catalog_114.json` 補上對應條目後 commit。

## 日常維護流程

1. 開銀行官網／活動頁核對。
2. 編輯 [`tax_payment_rewards_114.json`](tax_payment_rewards_114.json) 對應銀行物件：新增、修改或移除 `campaigns[]`；更新各 campaign 的 `source_url` 與內容欄位。
3. 有指定卡別時，同步 [`card_catalog_114.json`](card_catalog_114.json)。
4. `git commit -m "update bank_XXX 繳稅回饋"`。

**沒有 phase、沒有 checkpoint script、沒有 bundle finalize。**

## 與外部前端的契約

本 repo 的角色：產出 `tax_payment_rewards_114.json`；外部前端專案自行讀取。本 repo 不再維護 `apps/web/public/data/payment_rewards_114.bundle.json` 的衍生複本。

## 與其他研究文件的關係

- source id 仍可追溯到 [`../../../Z0_sources/notes/sources.yaml`](../../../Z0_sources/notes/sources.yaml)。
- 產品設計：[`research/product/payment_rewards_entry.md`](../../../product/payment_rewards_entry.md)（其資料模型段落待對齊 v2，後續另開小修）。
