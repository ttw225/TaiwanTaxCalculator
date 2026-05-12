import type { ChecklistItem, Situation, SituationGroup } from '../types/content'
import { getNumber, getValidYear } from '../lib/numbers'

const validYear = getValidYear()
const n = (key: string) => getNumber(key).toLocaleString('zh-TW')

// Source refs shared across items. Keep IDs stable for public traceability UI.
const SRC_ITA = {
  source_id: 'law_income_tax_act',
  label: '所得稅法',
  authority: '法務部全國法規資料庫',
  url: 'https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=G0340003',
}
const SRC_MOF = {
  source_id: 'mof_114_tax_measures',
  label: '財政部114年度申報新措施',
  authority: '財政部',
  url: 'https://www.mof.gov.tw/singlehtml/384fb3077bb349ea973e7fc6f13b6974?cntId=1303f6fa4c0446fa8568d30915166ae6',
}
const SRC_MANUAL = {
  source_id: 'ntb_114_return_manual',
  label: '114年度申報書說明',
  authority: '財政部電子申報繳稅服務網',
  url: 'https://download.tax.nat.gov.tw/irx/doc/114%E5%B9%B4%E5%BA%A6%E7%B6%9C%E5%90%88%E6%89%80%E5%BE%97%E7%A8%85%E7%B5%90%E7%AE%97%E7%94%B3%E5%A0%B1%E6%9B%B8%E8%AA%AA%E6%98%8E.pdf',
}
const SRC_TAX_SAVING_MANUAL = {
  source_id: 'etax_tax_saving_manual_deductions',
  label: '國稅節稅手冊：扣除額篇',
  authority: '財政部稅務入口網',
  url: 'https://www.etax.nat.gov.tw/etwmain/tax-info/understanding/tax-saving-manual/national/individual-income-tax/k2Jbgrp',
}
const SRC_AMT = {
  source_id: 'law_amt_act',
  label: '所得基本稅額條例',
  authority: '法務部全國法規資料庫',
  url: 'https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=G0340115',
}

export const CHECKLIST_ITEMS: ChecklistItem[] = [
  // ── Gross income (綜合所得總額) ─────────────────────────────────────────────
  {
    id: 'gross-income',
    title: '薪資收入',
    category: 'gross_income',
    situations: ['salary_income'],
    why_it_matters: `填入去年（114年1月至12月）本人與親屬的「薪資收入」。系統自動套用「薪資所得特別扣除額」（每人最多 ${n('special_deduction_salary')} 元），計算出綜合所得總額。`,
    eligibility_cues: [
      '有薪資收入的納稅義務人、配偶及申報受扶養親屬均需申報',
      `薪資所得特別扣除額每人最高 ${n('special_deduction_salary')} 元，不超過實際薪資收入`,
      '本網站簡化扣除額流程，統一採用「薪資所得特別扣除額」計算，無「必要費用」選項。',
    ],
    documents_to_prepare: [],
    source_refs: [SRC_ITA, SRC_MANUAL],
    show_wealth_clause_notice: false,
  },
  {
    id: 'dividend-income',
    title: '股利收入',
    category: 'gross_income',
    situations: ['dividends'],
    why_it_matters: '填入本人與共同報稅者的股利收入；系統會同時呈現合併計稅與 28% 分開計稅時的綜合所得總額差異。',
    eligibility_cues: [
      '申報年度有收到股利或盈餘分配者',
      '兩種計稅方式各有利弊，需搭配完整稅額方案判斷',
      '選擇分開計稅者不可再享股利可抵減稅額',
      '建議使用財政部電子申報系統試算比較',
    ],
    documents_to_prepare: ['股利分配通知書或扣繳憑單'],
    source_refs: [SRC_ITA, SRC_MOF],
    show_wealth_clause_notice: true,
  },
  {
    id: 'interest-income',
    title: '利息收入',
    category: 'gross_income',
    situations: ['interest_income'],
    why_it_matters: '填入本人與共同報稅者的利息收入；此金額會同步作為「儲蓄投資特別扣除額」的計算基礎。',
    eligibility_cues: [
      '申報年度有金融機構存款利息、儲蓄性質信託收益等收入者',
      '利息收入會自動帶動儲蓄投資特別扣除額，無需在扣除額卡片重複輸入',
      '郵政儲金免稅利息及分離課稅利息不列入本項簡化試算',
    ],
    documents_to_prepare: ['利息所得扣繳憑單或金融機構所得資料'],
    source_refs: [SRC_ITA, SRC_TAX_SAVING_MANUAL],
    show_wealth_clause_notice: false,
  },
  {
    id: 'other-income',
    title: '其他收入',
    category: 'gross_income',
    situations: ['other_income'],
    why_it_matters: '填入本人與共同報稅者除薪資、股利、利息以外的其他綜合所得金額；本版先以單一總額欄位估算。',
    eligibility_cues: [
      '申報年度有其他應併入綜合所得總額的收入者',
      '本版不細分所得類型，請先填入合計金額',
      '正式申報時仍需依所得類別與憑單資料確認',
    ],
    documents_to_prepare: ['其他所得相關憑單或收入資料'],
    source_refs: [SRC_ITA, SRC_MANUAL],
    show_wealth_clause_notice: true,
  },
  {
    id: 'overseas-income-amt',
    title: '海外所得',
    category: 'gross_income',
    situations: ['overseas_income'],
    why_it_matters: '海外所得超過所得基本稅額條例規定門檻者須計入最低稅負制（AMT），計算方式與一般綜所稅不同，稅負較複雜',
    eligibility_cues: [
      '全年海外所得達到所得基本稅額條例規定申報門檻者',
      '需確認是否達到最低稅負制申報門檻（詳見所得基本稅額條例及申報書說明）',
      '境外稅負可申請抵扣，但有相關限制',
      '海外所得的範圍及認定依所得稅法定義，非所有境外收入均計入',
    ],
    documents_to_prepare: [
      '境外所得相關文件（匯款紀錄、境外稅單等）',
    ],
    source_refs: [SRC_AMT, SRC_MANUAL],
    show_wealth_clause_notice: true,
  },

  // ── Exemptions ────────────────────────────────────────────────────────────
  {
    id: 'exemption-general',
    title: '免稅額',
    category: 'exemptions',
    situations: [],
    why_it_matters: `未滿70歲每人免稅額 ${n('exemption_general')} 元；年滿70歲每人免稅額 ${n('exemption_senior_70')} 元`,
    eligibility_cues: [
      '申報人本人、配偶及符合條件的家庭成員',
      `${validYear}年度年滿70歲：民國${validYear - 70}年（含該年）以前出生`,
    ],
    documents_to_prepare: ['身分證或戶口名簿影本'],
    source_refs: [SRC_ITA],
    show_wealth_clause_notice: false,
  },

  // ── General deductions (標準) ──────────────────────────────────────────────
  {
    id: 'standard-deduction-single',
    title: '標準扣除額（單身）',
    category: 'general_deductions',
    situations: [],
    why_it_matters: `可直接扣除 ${n('standard_deduction_single')} 元`,
    eligibility_cues: ['所有申報人均可適用，不需提供任何文件'],
    documents_to_prepare: [],
    source_refs: [SRC_ITA, SRC_TAX_SAVING_MANUAL],
    show_wealth_clause_notice: false,
  },
  {
    id: 'standard-deduction-married',
    title: '標準扣除額（配偶合併申報）',
    category: 'general_deductions',
    situations: [],
    why_it_matters: `配偶合併申報標準扣除額為 ${n('standard_deduction_married')} 元`,
    eligibility_cues: ['配偶合併申報者適用，不需提供任何文件'],
    documents_to_prepare: [],
    source_refs: [SRC_ITA, SRC_TAX_SAVING_MANUAL],
    show_wealth_clause_notice: false,
  },

  // ── General deductions (列舉) ──────────────────────────────────────────────
  {
    id: 'donations-deduction',
    title: '捐贈扣除額',
    category: 'general_deductions',
    situations: ['donations'],
    why_it_matters: '對符合資格機構的捐贈可列舉，一般上限為每戶綜合所得總額20%',
    eligibility_cues: [
      '捐贈對象需為依法立案的公益社團、基金會、學術機構或政府',
      '捐贈給政府機關及指定機構（如國防、教育等）無上限限制',
    ],
    documents_to_prepare: ['正式捐贈收據'],
    source_refs: [SRC_ITA, SRC_MANUAL, SRC_TAX_SAVING_MANUAL],
    show_wealth_clause_notice: false,
  },
  {
    id: 'insurance-deduction',
    title: '人身保險費',
    category: 'general_deductions',
    situations: ['insurance'],
    why_it_matters: `人身保險費可列舉，每人每年最高 ${n('itemized_deduction_personal_insurance')} 元；全民健保費無金額限制`,
    eligibility_cues: [
      '僅限本人、配偶及受扶養親屬的保費',
      '全民健保費認列無金額限制',
    ],
    documents_to_prepare: ['保險公司年度繳費證明或收據'],
    source_refs: [SRC_ITA, SRC_MANUAL, SRC_TAX_SAVING_MANUAL],
    show_wealth_clause_notice: false,
  },
  {
    id: 'medical-deduction',
    title: '醫藥及生育費',
    category: 'general_deductions',
    situations: ['medical_expenses'],
    why_it_matters: '符合資格的醫療機構費用扣除「保險給付」後的差額，可全額列舉',
    eligibility_cues: [
      '本人、配偶或受扶養親屬的醫療費用及生育費用',
      '僅限公立或全民健保特約醫療機構，私立非特約院所不適用',
      '自費美容、整形或非必要手術不適用',
      '已由保險公司或健保理賠的部分不可重複扣抵',
    ],
    documents_to_prepare: ['醫療收據正本（需含診療項目及金額）'],
    source_refs: [SRC_ITA, SRC_TAX_SAVING_MANUAL],
    show_wealth_clause_notice: false,
  },
  {
    id: 'mortgage-interest-deduction',
    title: '購屋借款利息',
    category: 'general_deductions',
    situations: ['mortgage_interest'],
    why_it_matters: `向金融機構借款購買「自用住宅」所支付的「利息」，扣除「儲蓄投資特別扣除額」後的餘額可列舉扣除，最高 ${n('itemized_deduction_mortgage_interest')} 元/戶`,
    eligibility_cues: [
      '該住宅無出租、供營業或執行業務使用',
    ],
    documents_to_prepare: [
      '銀行房貸年度利息繳納證明',
      '戶籍謄本或其他自住證明',
    ],
    source_refs: [SRC_ITA, SRC_TAX_SAVING_MANUAL],
    show_wealth_clause_notice: false,
  },

  // ── Special deductions (列舉) ──────────────────────────────────────────────
  {
    id: 'savings-investment-deduction',
    title: '儲蓄投資特別扣除額',
    category: 'special_deductions',
    situations: ['savings_investment'],
    why_it_matters: `金融機構存款利息、儲蓄性質信託資金等收益，可扣除最高 ${n('special_deduction_savings_investment')} 元/戶`,
    eligibility_cues: [
      '郵政儲金免稅利息及分離課稅利息不包括在內',
      '配偶選擇分開計算稅額時，扣除順序需依申報規定確認',
    ],
    documents_to_prepare: [],
    source_refs: [SRC_ITA, SRC_TAX_SAVING_MANUAL],
    show_wealth_clause_notice: false,
  },
  {
    id: 'disability-special-deduction',
    title: '身心障礙特別扣除額',
    category: 'special_deductions',
    situations: ['disability'],
    why_it_matters: `每位持有身心障礙證明（或手冊）的成員可扣除 ${n('special_deduction_disability')} 元`,
    eligibility_cues: [
      '本人、配偶或受扶養親屬持有身心障礙手冊',
    ],
    documents_to_prepare: [
      '身心障礙證明影本',
    ],
    source_refs: [SRC_ITA, SRC_TAX_SAVING_MANUAL],
    show_wealth_clause_notice: false,
  },
  {
    id: 'childcare-deduction',
    title: '幼兒學前',
    category: 'special_deductions',
    situations: ['childcare'],
    why_it_matters: `申報扶養6歲（含）以下幼兒，第一人可扣除 ${n('special_deduction_childcare_first')} 元/人，第二人起每人 ${n('special_deduction_childcare_additional')} 元`,
    eligibility_cues: [
      '申報扶養6歲（含）以下幼兒',
      '第一人與第二人起適用不同扣除額',
      `${validYear}年度6歲以下：民國${validYear - 6}年（含該年）以後出生`,
    ],
    documents_to_prepare: [],
    source_refs: [SRC_ITA, SRC_TAX_SAVING_MANUAL],
    show_wealth_clause_notice: false,
  },
  {
    id: 'education-tuition-deduction',
    title: '教育學費',
    category: 'special_deductions',
    situations: ['education_tuition'],
    why_it_matters: `受扶養子女就讀經教育部認可之國內外大專院校，可扣除最高 ${n('special_deduction_education_tuition')} 元/人`,
    eligibility_cues: [
      '受扶養子女就讀經教育部認可之國內外大專院校',
      '納稅義務人本人、配偶或受扶養的兄弟姊妹就學不適用',
      '已接受政府補助者，應扣除補助後按限額列報',
      '就讀空大、空中專校及五專前3年者不適用',
    ],
    documents_to_prepare: ['學費繳費收據影本或其他足資證明文件'],
    source_refs: [SRC_ITA, SRC_TAX_SAVING_MANUAL],
    show_wealth_clause_notice: false,
  },
  {
    id: 'long-term-care-deduction',
    title: '長期照顧',
    category: 'special_deductions',
    situations: ['long_term_care'],
    why_it_matters: `每位符合長照資格者可扣除 ${n('special_deduction_long_term_care')} 元，有排富條款`,
    eligibility_cues: [
      '本人、配偶或受扶養親屬需要長期照顧服務',
      '依長照服務法或相關規定認定',
      '排富條款：適用稅率達20%或股利選擇分開計稅或所得超過門檻者，不得適用',
    ],
    documents_to_prepare: [
      '外籍家庭看護聘僱許可函影本',
      '或使用長照服務的繳費收據影本任一張',
      '或長照機構服務繳費收據影本',
    ],
    source_refs: [SRC_ITA, SRC_MOF, SRC_TAX_SAVING_MANUAL],
    show_wealth_clause_notice: true,
  },
  {
    id: 'rent-deduction',
    title: '房屋租金支出',
    category: 'special_deductions',
    situations: ['rent'],
    why_it_matters: `租屋自住之租金支出，最高可扣除 ${n('special_deduction_rent')} 元/戶，有排富條款`,
    eligibility_cues: [
      '納稅義務人、配偶及受扶養直系親屬在中華民國境內租屋',
      '自住且非供營業或執行業務使用',
      '排富條款：有房屋者、高所得或特定股利、基本所得額情形不得適用',
    ],
    documents_to_prepare: [
      '租賃契約書影本',
      '租金支付紀錄（轉帳紀錄或收據）',
      '戶籍登記證明或自住切結書',
    ],
    source_refs: [SRC_ITA, SRC_TAX_SAVING_MANUAL],
    show_wealth_clause_notice: true,
  },
]

export const SITUATIONS: Situation[] = [
  {
    id: 'married',
    label: '配偶合併申報',
    description: '已婚並選擇與配偶合併辦理綜合所得稅申報',
  },
  {
    id: 'salary_income',
    label: '薪資收入',
    description: '任職公司、機關或個人受雇，每月領取薪水',
  },
  {
    id: 'dividends',
    label: '股利收入',
    description: '持有台股或基金，收到股利或盈餘分配',
  },
  {
    id: 'interest_income',
    label: '利息收入',
    description: '有銀行存款利息、儲蓄性質信託收益等收入',
  },
  {
    id: 'other_income',
    label: '其他收入',
    description: '有薪資、股利、利息以外需併入綜所稅的收入',
  },
  {
    id: 'overseas_income',
    label: '海外所得',
    description: '全年海外所得超過100萬元，可能需申報最低稅負',
  },
  {
    id: 'donations',
    label: '捐贈',
    description: '捐款給公益團體、學術機構或政府機關',
  },
  {
    id: 'insurance',
    label: '人身保險費',
    description: `繳納人身保險費（含壽險、意外險、健康險等）`,
  },
  {
    id: 'medical_expenses',
    label: '醫藥及生育費',
    description: '家庭成員在醫療機構就診或生育的自費支出',
  },
  {
    id: 'mortgage_interest',
    label: '購屋借款利息',
    description: '自住房屋的房貸每年需繳利息',
  },
  {
    id: 'disability',
    label: '身心障礙',
    description: '持有身心障礙手冊',
  },
  {
    id: 'childcare',
    label: '幼兒學前',
    description: '家中有6歲（含）以下幼兒',
  },
  {
    id: 'education_tuition',
    label: '教育學費',
    description: '受扶養子女就讀經教育部認可之國內外大專院校',
  },
  {
    id: 'long_term_care',
    label: '長期照顧',
    description: '家中有需要長照服務的成員',
  },
  {
    id: 'rent',
    label: '房屋租金支出',
    description: '在境內租房居住，無自有房屋',
  },
]

export const SITUATION_GROUPS: SituationGroup[] = [
  {
    id: 'filing-method',
    title: '申報方式',
    description: '已婚者需與配偶合併申報；新婚可選擇與配偶分開或合併申報',
    situationIds: ['married'],
  },
  {
    id: 'income-sources',
    title: '所得來源',
    description: '確認有哪些收入類型，影響適用的扣除與稅率計算。',
    situationIds: ['salary_income', 'dividends', 'interest_income', 'other_income', 'overseas_income'],
  },
  {
    id: 'general-deductions',
    title: '一般扣除額',
    description: '這些費用若有憑證，可能適用列舉扣除，有機會超過標準扣除額。',
    situationIds: ['donations', 'insurance', 'medical_expenses', 'mortgage_interest'],
  },
  {
    id: 'special-deductions',
    title: '特別扣除額',
    description: '依身分、照顧與居住等條件確認可用的特別扣除。',
    situationIds: ['disability', 'childcare', 'education_tuition', 'long_term_care', 'rent'],
  },
]
