# 綜所稅繳稅回饋 v2

114 年度（2026 年 5 月申報）各銀行綜所稅繳稅回饋／分期資料集。

- **唯一 SSOT**：[`tax_payment_rewards_114.json`](tax_payment_rewards_114.json)
- **卡別目錄**：[`card_catalog_114.json`](card_catalog_114.json)（已 verified campaign 中指定的卡別 metadata，透過 `card_id` 與 rewards JSON join）
- **人工核對清單**：[`banks_priority_114.md`](banks_priority_114.md)
- **舊資料**：[`../_legacy/`](../_legacy/)（2026-05-20 起停用，僅供查閱）

## 為什麼有 v2

舊架構（`../_legacy/`）把 paytax 名單、卡別清冊、活動表、Tier 規則拆成 8 個 JSON 加 8-phase 校對流程，但實際只有臺灣銀行一家經人工核對。為避免「`collection_status: collected` 誤示為已驗證」，v2 把所有未經本人核對的條目降為 `unverified`，並以**銀行為主軸**重新組織。

## Schema（v2.5）

每家銀行可有**多個 campaigns**（不同活動、不同卡別、不同 URL）。每個 campaign 自帶 source URL、適用卡別，內含可選的 `rebate` 與 `installment` 子物件。

v2.5 在既有人類可讀欄位之外，**新增一組「可計算欄位」**（`mode` / `rate` / `cap_nt` / `min` / `fixed` / `fixed_unit` / `base_fixed` / `amount_tiers` 等），供前端依使用者輸入的繳稅金額即時排序與試算。原本的 `summary` / `rate_or_amount` / `cap` / `tiers` 自由文字欄位**全部保留**，僅作顯示與資料來源校對。

```jsonc
{
  "tax_year": "114",
  "schema_version": "v2.5",
  "generated_at": "YYYY-MM-DD",
  "verification_legend": { ... },
  "banks": [
    {
      "bank_code": "005",                       // 三位數金融機構代號
      "bank_name": "土地銀行",
      "verification": "verified",               // verified | unverified | dropped（上線後此欄位會移除，全為 verified）
      "verified_at": "2026-05-20",              // 僅 verified 時填
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
          "channel": ["台灣 Pay"],              // 繳費管道；無限制則 null
          "registration_status": "open",        // "open" | "full" | null；僅 requires_registration=true 時填；缺省視同 null
          "tags": ["taiwan_pay", "credit_card"], // v2.5：前端 TypeFilter 用；可由 channel/rebate/installment 推導
          "installment_detail": "6 期 0 利率",   // v2.5：人類可讀分期摘要（前端 OfferRow 顯示）；缺省取自 installment.summary
          "rebate": {                           // 無回饋則整個物件設 null
            // ── 既有顯示欄位 ──
            "summary": "...",
            "rate_or_amount": "定額 100 元",   // 標題字串
            "tiers": [                          // 選填：可讀的階梯描述；單一利率或定額時可省
              { "condition": "單筆未達 500 萬", "rate": "0.2%" }
            ],
            "cap": "...",
            "requires_registration": false,
            "period": null,

            // ── v2.5 計算欄位 ──
            "mode": "rate",                     // 必填："rate" | "rate-tiered" | "fixed" | "installment_only" | "fee_only"
            "rate": 0.5,                        // 數字 %（mode="rate" 必填）
            "fixed": 200,                       // 數字 NT$（mode="fixed" 必填）
            "fixed_unit": "元刷卡金",            // 顯示單位字串（小樹點、紅利點、即享券等可用此欄）
            "min": 200,                         // 單筆繳稅門檻 NT$；無門檻 → null
            "base_fixed": 100,                  // rate 模式可加的「基本定額」（同筆同時拿基本與加碼回饋時用）
            "cap_nt": 3000,                     // 數字回饋上限 NT$ / 同 fixed_unit 數量；無上限 → null
            "cap_label": "加碼上限 3,000 元",   // 簡短人類可讀上限字串
            "amount_tiers": [                   // mode="rate-tiered" 必填；first matching min wins
              { "min": 10000000, "rate": 0.36, "cap_nt": 100000, "label": "單筆滿 1,000 萬" },
              { "min": 5000000,  "rate": 0.28, "cap_nt": null,   "label": "單筆滿 500 萬" },
              { "min": 0,        "rate": 0.20, "cap_nt": null,   "label": "單筆未達 500 萬" }
            ]
          },
          "installment": {                      // 無分期則整個物件設 null
            "summary": "...",
            "terms": [{ "periods": 6, "rate": 0 }],  // rate 單位 %；解析失敗則設 null
            "min_amount": 3000,               // 選填：分期最低金額（元）；缺省視同無限制
            "fee_note": "免手續費"
          },
          "notes": null
        }
        // ...同一銀行的其他活動
      ],
      "notes": null                             // 銀行層級備註（例：機構合併、業務退出）
    }
  ]
}
```

**欄位缺省規則**：`tiers`、`registration_status`、`base_fixed`、`amount_tiers` 等選填欄位缺省或未出現時前端視同 `null`。只在有意義時加入。

## 前端試算契約（v2.5 新增）

前端依 `rebate.mode` 對使用者輸入金額 `amount` 解算「估算回饋金額」，五種模式：

| `mode` | 計算 | 必填欄位 |
| --- | --- | --- |
| `rate` | `amount * rate / 100`，若有 `base_fixed` 再加上；觸發 `cap_nt` 即封頂 | `rate`，選填 `min`／`cap_nt`／`base_fixed` |
| `rate-tiered` | 將 `amount_tiers` 按 `min` 由大到小排序，取**第一個** `amount >= tier.min` 的級距套用 `rate` 與 `cap_nt` | `amount_tiers[]` |
| `fixed` | 固定值 `fixed`（單位 `fixed_unit`，可為元／點／券） | `fixed`，建議補 `fixed_unit` |
| `installment_only` | 不算回饋金額；前端僅顯示分期資訊 | — |
| `fee_only` | 不算回饋金額；前端僅顯示手續費備註 | — |

**門檻**：若指定 `min` 且 `amount < min`，前端標示「不符門檻」並排在最後。
**上限**：`cap_nt` 觸發時顯示「已達上限 NT$ {cap_nt}」。
**階梯規則**：`amount_tiers` 不一定按順序提供；前端會內部排序。

**多卡別／多客群同公告**：若同一公告的不同卡或客群採用**不同 rate**，需在 JSON 拆成多個 campaign（各自 `eligible_card_ids` 或在 `eligible_cards` 描述客群），而**不**塞進 `amount_tiers`。`amount_tiers` 僅用於「同一張卡、依繳稅金額切級距」。

## 客戶試算欄位的填寫建議

- 「定額 100 元」→ `mode:"fixed"`, `fixed:100`, `fixed_unit:"元刷卡金"`, `min:100`
- 「0.36%（每戶上限 10 萬）」→ `mode:"rate"`, `rate:0.36`, `cap_nt:100000`
- 「單筆 500 萬以上 0.36%；以下 0.2%」→ `mode:"rate-tiered"`, `amount_tiers:[{min:5000000,rate:0.36,...},{min:0,rate:0.2,...}]`
- 「不算回饋只算分期」→ `rebate: null`（不需 mode 標籤）
- 「手續費頁」或「需另案兌換、非繳稅金額本身的回饋」→ `mode:"fee_only"`

**campaigns 空陣列的情境**：銀行有官網但目前無 114 年度活動／舊資料指向錯誤頁／業務已退出。請在 bank-level `notes` 寫原因並附 ref URL。

**`eligible_card_ids` 語意**：
- 空陣列 `[]`：活動適用對象為 `eligible_card_types` 所列類型的**全卡別**（不區分特定卡面）
- 非空陣列：活動**僅限**所列 `card_id` 的持卡人；`card_id` 對應 `card_catalog_114.json`
- `unverified` 銀行的 campaigns 不加此欄位或保持 `[]`，等 verify 時一起補

**前端查詢邏輯**（使用者選卡後過濾）：
```
使用者選卡 card_id = "bank007_ileo"（bank_code: "007"）
→ 找 bank 007 所有 campaigns
→ 篩選條件：eligible_card_ids 為空 [] 或含 "bank007_ileo"
→ 符合則顯示該 campaign
```

## card_catalog_114.json Schema

記錄已 verified campaign 中 `eligible_card_ids` 明確指定的卡別 metadata。**未出現在任何 `eligible_card_ids` 的卡別不需加入**；前端若 `eligible_card_ids: []` 則顯示「全卡別適用」，不需要逐張卡查目錄。

```jsonc
{
  "tax_year": "114",
  "schema_version": "v1.0",
  "generated_at": "YYYY-MM-DD",
  "notes": "card_id 格式：bank{bank_code}_{slug}。全卡別通用條目以 bank{code}_credit / bank{code}_debit 命名。",
  "cards": [
    {
      "card_id": "bank007_ileo",          // bank{bank_code}_{slug} 全小寫底線
      "bank_code": "007",
      "display_name": "第一銀行 iLEO 信用卡",
      "type": "credit",                   // credit | debit
      "network": "Mastercard",            // Mastercard | VISA | JCB | UnionPay | null
      "aliases": ["iLEO 卡", "一銀 iLEO"],  // 搜尋別名，可空陣列
      "image_path": null,                 // 預留
      "notes": null
    },
    // 全卡別通用條目（type=credit，不指定卡面）：
    {
      "card_id": "bank007_credit",
      "bank_code": "007",
      "display_name": "第一銀行信用卡（全卡別）",
      "type": "credit",
      "network": null,
      "aliases": ["一銀信用卡"],
      "image_path": null,
      "notes": "全卡別通用條目。"
    }
  ]
}
```

新增卡別：在 verify 該銀行時，若 campaign 有指定特定卡面，同步在 `card_catalog_114.json` 補上對應條目，再 commit。

## 驗證階梯

| 階梯 | 意義 | 前端建議顯示 |
| --- | --- | --- |
| `verified` | 使用者於 `verified_at` 親自核對銀行官網／活動頁 | 正常顯示，附 source URL |
| `unverified` | 自舊資料遷移，**尚未本人覆核** | 灰階 + 警語「資料未經核對，請點 source 確認」 |
| `dropped` | 核對後確認無此活動或已下架 | 不顯示 |

`unverified` 的欄位可能有錯或過期，前端不應宣稱「最佳回饋」。

> **上線狀態：** 上線時所有條目都會升為 `verified` 並移除 `verification` 欄位；繳費回饋頁不再做降階顯示。`unverified` 的 campaigns 也可能尚未補齊 v2.5 計算欄位（`rebate.mode` 等）；前端載入時會略過缺 `mode` 的 rebate，僅顯示分期或不顯示。

## 升等一筆的流程

1. 開銀行官網／活動頁核對。
2. 編輯本 JSON 對應銀行物件：
   - `verification` 改為 `verified` 或 `dropped`。
   - 若 verified：填 `verified_at`。
   - 視需要新增、修改、移除 `campaigns[]` 內的活動；每個 campaign 各有自己的 `source_url`。
3. `git commit -m "verify bank_XXX 繳稅回饋"`。

**沒有 phase、沒有 checkpoint script、沒有 bundle finalize。** 一家一家做。

## 與外部前端的契約

本 repo 的角色：產出 `tax_payment_rewards_114.json`；外部前端專案自行讀取。本 repo 不再維護 `apps/web/public/data/payment_rewards_114.bundle.json` 的衍生複本。

## 與其他研究文件的關係

- source id 仍可追溯到 [`../../../Z0_sources/notes/sources.yaml`](../../../Z0_sources/notes/sources.yaml)。
- 產品設計：[`research/product/payment_rewards_entry.md`](../../../product/payment_rewards_entry.md)（其資料模型段落待對齊 v2，後續另開小修）。
