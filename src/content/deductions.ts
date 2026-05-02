import type { ChecklistItem, Situation, SituationGroup } from '../types/content'
import { getNumber } from '../lib/numbers'

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
const SRC_AMT = {
  source_id: 'law_amt_act',
  label: '所得基本稅額條例',
  authority: '法務部全國法規資料庫',
  url: 'https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=G0340115',
}

export const CHECKLIST_ITEMS: ChecklistItem[] = [
  // ── Exemptions ────────────────────────────────────────────────────────────
  {
    id: 'exemption-general',
    title: '免稅額（一般）',
    category: 'exemptions',
    situations: ['salary_income', 'dependents'],
    why_it_matters: `每位申報人及符合資格的扶養親屬各享 ${n('exemption_general')} 元免稅額，直接減少課稅所得`,
    eligibility_cues: [
      '申報人本人、配偶及符合條件的扶養親屬均可適用',
      '扶養親屬包括父母、子女及其他依法扶養者',
    ],
    documents_to_prepare: ['扶養親屬身分證或戶口名簿影本（如有扶養）'],
    limitations: [
      '扶養親屬需符合所得稅法第17條規定的扶養資格',
      '70歲以上者另有較高免稅額，請確認是否適用',
    ],
    source_refs: [SRC_ITA],
    verification_status: 'verified',
    disclaimer_level: 'low',
    next_action: '確認受扶養親屬名單並備妥戶口資料',
  },
  {
    id: 'exemption-senior-70',
    title: '免稅額（70歲以上加成）',
    category: 'exemptions',
    situations: ['dependents'],
    why_it_matters: `年滿70歲的申報人、配偶或扶養親屬，免稅額提高為 ${n('exemption_senior_70')} 元`,
    eligibility_cues: ['申報年度（2025年12月31日前）年滿70歲者適用'],
    documents_to_prepare: ['身分證（確認出生年月日）'],
    limitations: ['以實際出生年月日計算，非戶籍登記年齡'],
    source_refs: [SRC_ITA],
    verification_status: 'verified',
    disclaimer_level: 'low',
    next_action: '確認家庭成員中是否有70歲以上者',
  },

  // ── General deductions (列舉) ──────────────────────────────────────────────
  {
    id: 'standard-deduction-single',
    title: '標準扣除額（單身）',
    category: 'general_deductions',
    situations: ['salary_income'],
    why_it_matters: `可直接扣除 ${n('standard_deduction_single')} 元，無需收集任何憑證，最省事的選擇`,
    eligibility_cues: ['所有申報人均可適用，無資格限制'],
    documents_to_prepare: [],
    limitations: ['選擇標準扣除額後，不可再申報列舉扣除額（兩者擇一）'],
    source_refs: [SRC_ITA],
    verification_status: 'verified',
    disclaimer_level: 'low',
    next_action: '申報書確認已選擇標準扣除額欄位',
  },
  {
    id: 'standard-deduction-married',
    title: '標準扣除額（配偶合併申報）',
    category: 'general_deductions',
    situations: ['married'],
    why_it_matters: `夫妻合併申報標準扣除額為 ${n('standard_deduction_married')} 元，不需準備任何憑證`,
    eligibility_cues: ['配偶合併申報者適用'],
    documents_to_prepare: [],
    limitations: ['選擇標準扣除額後，不可再申報列舉扣除額（兩者擇一）'],
    source_refs: [SRC_ITA],
    verification_status: 'verified',
    disclaimer_level: 'low',
    next_action: '申報書確認夫妻合併申報及標準扣除額欄位',
  },
  {
    id: 'donations-deduction',
    title: '捐贈扣除額',
    category: 'general_deductions',
    situations: ['donations'],
    why_it_matters: '對符合資格機構的捐贈可列舉扣除，一般上限為綜合所得總額20%',
    eligibility_cues: [
      '捐贈對象需為依法立案的公益社團、基金會、學術機構或政府',
      '具有稅捐稽徵法第11條之4規定的捐贈收據',
    ],
    documents_to_prepare: ['正式捐贈收據（需含受贈機構統一編號及官方章戳）'],
    limitations: [
      '一般捐贈上限為綜合所得總額20%',
      '捐贈給政府機關及指定機構（如國防、教育等）無上限限制',
      '請確認受贈機構是否具備所得稅法扣除資格',
    ],
    source_refs: [SRC_ITA, SRC_MANUAL],
    verification_status: 'partially_verified',
    disclaimer_level: 'medium',
    next_action: '收集全年捐贈收據，確認受贈機構資格',
  },
  {
    id: 'insurance-deduction',
    title: '保險費扣除額',
    category: 'general_deductions',
    situations: ['insurance'],
    why_it_matters: '人身保險費可列舉扣除（每人有年度上限），全民健保費另計可全額扣除；金額請查閱申報書說明',
    eligibility_cues: [
      '本人、配偶及受扶養親屬繳納的人身保險費均可列舉',
      '全民健保費可全額扣除',
    ],
    documents_to_prepare: ['保險公司年度繳費證明或收據'],
    limitations: [
      '人身保險每人每年有扣除上限，確切金額以114年度申報書說明為準',
      '全民健保費無上限，可全額列舉',
      '僅限本人、配偶及受扶養親屬的保費',
    ],
    source_refs: [SRC_ITA],
    verification_status: 'partially_verified',
    disclaimer_level: 'low',
    next_action: '向各保險公司索取年度繳費證明',
  },
  {
    id: 'medical-deduction',
    title: '醫療及生育費用扣除額',
    category: 'general_deductions',
    situations: ['medical_expenses'],
    why_it_matters: '公立或全民健保特約醫療機構的醫療費用及生育費用可全額列舉扣除，無金額上限',
    eligibility_cues: [
      '本人、配偶或受扶養親屬的醫療費用',
      '僅限公立或全民健保特約醫療機構',
    ],
    documents_to_prepare: ['醫療收據正本（需含診療項目及金額）'],
    limitations: [
      '自費美容、整形或非必要手術不適用',
      '已由保險公司或健保理賠的部分不可重複扣除',
      '僅限公立或全民健保特約醫療機構，私立非特約院所不適用',
    ],
    source_refs: [SRC_ITA],
    verification_status: 'partially_verified',
    disclaimer_level: 'medium',
    next_action: '收集全年度醫療機構收據，確認機構是否為特約院所',
  },
  {
    id: 'mortgage-interest-deduction',
    title: '購屋借款利息扣除額',
    category: 'general_deductions',
    situations: ['mortgage_interest'],
    why_it_matters: '自住房屋貸款利息可列舉扣除，每戶每年有金額上限；確切金額以申報書說明為準',
    eligibility_cues: [
      '貸款房屋需為本人或配偶實際自住，且未出租',
      '本人或配偶為貸款借款人',
    ],
    documents_to_prepare: [
      '銀行房貸年度利息繳納證明',
      '戶籍謄本或其他自住證明',
    ],
    limitations: [
      '每戶每年有扣除上限，確切金額以114年度申報書說明為準',
      '不得與租金扣除額同時適用',
      '需扣除儲蓄投資特別扣除額後才計算可扣除金額',
      '出租中的房屋不適用',
    ],
    source_refs: [SRC_ITA],
    verification_status: 'partially_verified',
    disclaimer_level: 'medium',
    next_action: '向銀行申請年度貸款利息繳納證明',
  },

  // ── Special deductions (特別) ──────────────────────────────────────────────
  {
    id: 'salary-special-deduction',
    title: '薪資所得特別扣除額',
    category: 'special_deductions',
    situations: ['salary_income'],
    why_it_matters: `有薪資所得即可每人扣除 ${n('special_deduction_salary')} 元，夫妻各自計算，無需憑證`,
    eligibility_cues: [
      '有薪資所得的納稅義務人與配偶各自適用',
      '無其他資格限制',
    ],
    documents_to_prepare: [],
    limitations: [
      '扣除額不超過實際薪資所得金額',
      '申報系統通常自動帶入，請確認金額正確',
    ],
    source_refs: [SRC_ITA, SRC_MANUAL],
    verification_status: 'verified',
    disclaimer_level: 'low',
    next_action: '確認申報書薪資所得欄位及特別扣除額已正確帶入',
  },
  {
    id: 'disability-special-deduction',
    title: '身心障礙特別扣除額',
    category: 'special_deductions',
    situations: ['disability'],
    why_it_matters: `每位持有身心障礙手冊或重大傷病卡的成員可扣除 ${n('special_deduction_disability')} 元`,
    eligibility_cues: [
      '本人、配偶或受扶養親屬持有身心障礙手冊',
      '或持有衛福部公告的重大傷病卡',
    ],
    documents_to_prepare: [
      '身心障礙手冊影本',
      '或重大傷病卡影本',
    ],
    limitations: [
      '重大傷病與身心障礙擇一適用，同一人不可重複申報',
      '需為申報年度有效期間內的證明',
    ],
    source_refs: [SRC_ITA],
    verification_status: 'verified',
    disclaimer_level: 'low',
    next_action: '備妥身心障礙手冊或重大傷病卡影本',
  },
  {
    id: 'long-term-care-deduction',
    title: '長照特別扣除額',
    category: 'special_deductions',
    situations: ['long_term_care'],
    why_it_matters: `每位符合長照資格者可扣除 ${n('special_deduction_long_term_care')} 元，但有排富條款，建議先確認是否適用`,
    eligibility_cues: [
      '本人、配偶或受扶養親屬需要長期照顧服務',
      '依長照服務法或相關規定認定',
    ],
    documents_to_prepare: [
      '長照機構服務紀錄或收據',
      '或居家長照服務相關文件',
    ],
    limitations: [
      '排富條款：適用稅率達20%或股利選擇分開計稅且超過門檻者，不得適用',
      '與身心障礙特別扣除額不可針對同一人重複申報',
    ],
    source_refs: [SRC_ITA, SRC_MOF],
    verification_status: 'verified',
    disclaimer_level: 'high',
    next_action: '確認長照資格及是否受排富條款影響，建議查閱申報書說明',
  },
  {
    id: 'childcare-deduction',
    title: '幼兒學前特別扣除額（需進一步確認）',
    category: 'special_deductions',
    situations: ['childcare'],
    why_it_matters: '6歲以下（申報年度）子女可申請幼兒學前特別扣除，但有排富條款',
    eligibility_cues: [
      '子女於2025年12月31日前未滿6歲（114年度適用）',
      '本人或配偶為申報義務人',
    ],
    documents_to_prepare: ['子女戶口名簿或出生證明影本'],
    limitations: [
      '排富條款：適用稅率達20%以上者不得適用',
      '金額及條件每年可能調整，請查閱114年度申報書說明確認最新規定',
    ],
    source_refs: [SRC_ITA, SRC_MANUAL],
    verification_status: 'partially_verified',
    disclaimer_level: 'high',
    next_action: '確認子女年齡及排富門檻，查閱114年度申報書說明',
  },

  // ── Further check items ────────────────────────────────────────────────────
  {
    id: 'rent-deduction',
    title: '房屋租金扣除額（需進一步確認）',
    category: 'further_check',
    situations: ['rent'],
    why_it_matters: '在台灣租屋居住（本人及配偶均無自有房屋）者可能適用租金扣除，但有排富條款及申報注意事項',
    eligibility_cues: [
      '全年在台灣租屋居住',
      '本人及配偶在租住地區均無自有房屋',
    ],
    documents_to_prepare: [
      '租賃契約書影本',
      '租金支付紀錄（轉帳紀錄或收據）',
    ],
    limitations: [
      '排富條款，高所得者不適用',
      '不得與購屋借款利息扣除額同時申報',
      '出租方可能因此被要求申報租金收入，建議事先與房東確認',
    ],
    source_refs: [SRC_ITA],
    verification_status: 'partially_verified',
    disclaimer_level: 'high',
    next_action: '確認是否符合排富門檻，與房東溝通後再決定是否申報',
  },
  {
    id: 'dividends-tax-choice',
    title: '股利所得課稅方式（需進一步確認）',
    category: 'further_check',
    situations: ['dividends'],
    why_it_matters: '股利所得可選擇「合併計稅」或「28%分開計稅」，須依個人綜所稅率判斷哪種方式較有利',
    eligibility_cues: [
      '申報年度有收到股利或盈餘分配者',
    ],
    documents_to_prepare: ['股利分配通知書或扣繳憑單'],
    limitations: [
      '兩種計稅方式各有利弊，需依個人邊際稅率判斷',
      '選擇分開計稅者不可再享股利可抵減稅額',
      '建議使用財政部電子申報系統試算比較',
    ],
    source_refs: [SRC_ITA, SRC_MOF],
    verification_status: 'partially_verified',
    disclaimer_level: 'high',
    next_action: '收集全年股利憑單，使用申報系統試算兩種計稅方式後再決定',
  },
  {
    id: 'overseas-income-amt',
    title: '海外所得與最低稅負（需進一步確認）',
    category: 'further_check',
    situations: ['overseas_income'],
    why_it_matters: '海外所得超過所得基本稅額條例規定門檻者須計入最低稅負制（AMT），計算方式與一般綜所稅不同，稅負較複雜',
    eligibility_cues: [
      '全年海外所得達到所得基本稅額條例規定申報門檻者',
      '需確認是否達到最低稅負制申報門檻（詳見所得基本稅額條例及申報書說明）',
    ],
    documents_to_prepare: [
      '境外所得相關文件（匯款紀錄、境外稅單等）',
    ],
    limitations: [
      '計算方式較複雜，建議諮詢稅務師或記帳士',
      '境外稅負可申請抵扣，但有相關限制',
      '海外所得的範圍及認定依所得稅法定義，非所有境外收入均計入',
    ],
    source_refs: [SRC_AMT, SRC_MANUAL],
    verification_status: 'partially_verified',
    disclaimer_level: 'high',
    next_action: '確認海外所得金額，如超過門檻建議諮詢稅務師',
  },
]

export const SITUATIONS: Situation[] = [
  {
    id: 'salary_income',
    label: '有薪資收入',
    description: '任職公司、機關或個人受雇，每月領取薪水',
  },
  {
    id: 'married',
    label: '配偶合併申報',
    description: '已婚並選擇與配偶合併辦理綜合所得稅申報',
  },
  {
    id: 'dependents',
    label: '有扶養親屬',
    description: '扶養父母、子女或其他符合條件的親屬',
  },
  {
    id: 'disability',
    label: '本人或家人有身心障礙',
    description: '持有身心障礙手冊或衛福部公告重大傷病卡',
  },
  {
    id: 'long_term_care',
    label: '有長期照顧需求',
    description: '家中有需要長照服務的成員',
  },
  {
    id: 'donations',
    label: '有捐贈',
    description: '捐款給公益團體、學術機構或政府機關',
  },
  {
    id: 'insurance',
    label: '有繳保險費',
    description: '繳納人身保險費（含壽險、意外險、健康險等）',
  },
  {
    id: 'medical_expenses',
    label: '有醫療費用',
    description: '家庭成員在醫療機構就診或生育的自費支出',
  },
  {
    id: 'mortgage_interest',
    label: '有購屋房貸利息',
    description: '自住房屋的房貸每年需繳利息',
  },
  {
    id: 'rent',
    label: '租屋居住',
    description: '本人及配偶在台灣租房居住，無自有房屋',
  },
  {
    id: 'childcare',
    label: '有幼兒（6歲以下）',
    description: '家中有114年度申報時未滿6歲的子女',
  },
  {
    id: 'dividends',
    label: '有股利收入',
    description: '持有台股或基金，收到股利或盈餘分配',
  },
  {
    id: 'overseas_income',
    label: '有海外所得',
    description: '全年海外所得超過100萬元，可能需申報最低稅負',
  },
]

export const SITUATION_GROUPS: SituationGroup[] = [
  {
    id: 'filing-method',
    title: '申報方式',
    description: '先確認這次是一個人報，還是夫妻合併申報。',
    situationIds: ['married'],
  },
  {
    id: 'income-sources',
    title: '所得來源',
    description: '確認你今年有哪些收入類型，影響適用的扣除與稅率計算。',
    situationIds: ['salary_income', 'dividends', 'overseas_income'],
  },
  {
    id: 'family-dependents',
    title: '家庭與扶養身分',
    description: '扶養人數與特殊身分影響免稅額與特別扣除。',
    situationIds: ['dependents', 'childcare', 'disability', 'long_term_care'],
  },
  {
    id: 'itemizable-expenses',
    title: '費用與支出（可列舉）',
    description: '這些費用若有憑證，可能適用列舉扣除，有機會超過標準扣除額。',
    situationIds: ['donations', 'insurance', 'medical_expenses', 'mortgage_interest', 'rent'],
  },
]
