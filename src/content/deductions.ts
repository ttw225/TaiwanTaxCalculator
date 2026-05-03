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
  // ── Exemptions ────────────────────────────────────────────────────────────
  {
    id: 'exemption-general',
    title: '免稅額',
    category: 'exemptions',
    situations: ['salary_income', 'dividends', 'overseas_income'],
    why_it_matters: `每位申報人及符合資格的家庭成員各享 ${n('exemption_general')} 元免稅額；年滿70歲者可適用 ${n('exemption_senior_70')} 元，直接減少課稅所得`,
    eligibility_cues: [
      '有綜合所得稅申報需求時，申報人本人、配偶及符合條件的家庭成員均可能適用',
      '年滿70歲者適用較高免稅額，請確認出生年月日',
    ],
    documents_to_prepare: ['身分證或戶口名簿影本（如需確認家庭成員資格）'],
    limitations: [
      '家庭成員資格需符合所得稅法第17條規定',
      '70歲以上者以實際出生年月日計算，非戶籍登記年齡',
    ],
    source_refs: [SRC_ITA],
    verification_status: 'verified',
    disclaimer_level: 'low',
    next_action: '確認申報戶成員及是否有70歲以上者',
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
    why_it_matters: `向金融機構借款購買自用住宅所支付的利息，扣除儲蓄投資特別扣除額後的餘額可列舉扣除，最高 ${n('itemized_deduction_mortgage_interest')} 元/戶`,
    eligibility_cues: [
      '向金融機構借款購買自用住宅所支付的利息',
      '該住宅無出租、供營業或執行業務使用',
    ],
    documents_to_prepare: [
      '銀行房貸年度利息繳納證明',
      '戶籍謄本或其他自住證明',
    ],
    limitations: [
      `最高 ${n('itemized_deduction_mortgage_interest')} 元/戶`,
      '不得與租金扣除額同時適用',
      '以實際支付利息扣除儲蓄投資特別扣除額後的餘額申報扣除',
      '出租、供營業或執行業務使用的房屋不適用',
    ],
    source_refs: [SRC_ITA, SRC_TAX_SAVING_MANUAL],
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
    id: 'savings-investment-deduction',
    title: '儲蓄投資特別扣除額',
    category: 'special_deductions',
    situations: ['savings_investment'],
    why_it_matters: `享有金融機構存款利息、儲蓄性質信託資金等收益，可扣除最高 ${n('special_deduction_savings_investment')} 元/戶`,
    eligibility_cues: [
      '納稅義務人、配偶及申報受扶養親屬享有金融機構存款利息',
      '儲蓄性質信託資金收益等符合規定收益也可能適用',
    ],
    documents_to_prepare: ['利息所得扣繳憑單或金融機構利息資料'],
    limitations: [
      `最高 ${n('special_deduction_savings_investment')} 元/戶`,
      '郵政儲金免稅利息及分離課稅利息不包括在內',
      '夫妻選擇分開計算稅額時，扣除順序需依申報規定確認',
    ],
    source_refs: [SRC_ITA, SRC_TAX_SAVING_MANUAL],
    verification_status: 'verified',
    disclaimer_level: 'low',
    next_action: '確認全年利息所得資料與申報系統帶入金額',
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
    id: 'childcare-deduction',
    title: '幼兒學前特別扣除額',
    category: 'special_deductions',
    situations: ['childcare'],
    why_it_matters: `申報扶養6歲（含）以下幼兒，第一人可扣除 ${n('special_deduction_childcare_first')} 元/人，第二人起每人 ${n('special_deduction_childcare_additional')} 元，無排富`,
    eligibility_cues: [
      '申報扶養6歲（含）以下幼兒',
      '第一人與第二人起適用不同扣除額',
    ],
    documents_to_prepare: ['子女戶口名簿或出生證明影本'],
    limitations: [
      `第一人最高 ${n('special_deduction_childcare_first')} 元/人`,
      `第二人起最高 ${n('special_deduction_childcare_additional')} 元/人`,
      '無排富條款',
    ],
    source_refs: [SRC_ITA, SRC_TAX_SAVING_MANUAL],
    verification_status: 'verified',
    disclaimer_level: 'low',
    next_action: '確認幼兒年齡與申報扶養資料',
  },
  {
    id: 'education-tuition-deduction',
    title: '教育學費特別扣除額',
    category: 'special_deductions',
    situations: ['education_tuition'],
    why_it_matters: `受扶養子女就讀經教育部認可之國內外大專院校，可扣除最高 ${n('special_deduction_education_tuition')} 元/人`,
    eligibility_cues: [
      '受扶養子女就讀經教育部認可之國內外大專院校',
      '已接受政府補助者，應扣除補助後按限額列報',
    ],
    documents_to_prepare: ['學費繳費收據影本或其他足資證明文件'],
    limitations: [
      `最高 ${n('special_deduction_education_tuition')} 元/人`,
      '就讀空大、空中專校及五專前3年者不適用',
      '納稅義務人本人、配偶或受扶養的兄弟姊妹就學不適用',
    ],
    source_refs: [SRC_ITA, SRC_TAX_SAVING_MANUAL],
    verification_status: 'verified',
    disclaimer_level: 'low',
    next_action: '確認子女就學資格並備妥學費繳費證明',
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
    id: 'rent-deduction',
    title: '房屋租金支出特別扣除額',
    category: 'special_deductions',
    situations: ['rent'],
    why_it_matters: `納稅義務人、配偶及受扶養直系親屬在境內租屋自住，最高可扣除 ${n('special_deduction_rent')} 元/戶，但有排富條款`,
    eligibility_cues: [
      '納稅義務人、配偶及受扶養直系親屬在中華民國境內租屋',
      '供自住且非供營業或執行業務使用',
      '納稅義務人、配偶或受扶養直系親屬在中華民國境內有房屋者不得扣除',
    ],
    documents_to_prepare: [
      '租賃契約書影本',
      '租金支付紀錄（轉帳紀錄或收據）',
      '戶籍登記證明或自住切結書',
    ],
    limitations: [
      `最高 ${n('special_deduction_rent')} 元/戶`,
      '有排富條款，高所得或特定股利、基本所得額情形不得適用',
      '不得與購屋借款利息扣除額同時申報',
    ],
    source_refs: [SRC_ITA, SRC_TAX_SAVING_MANUAL],
    verification_status: 'verified',
    disclaimer_level: 'high',
    next_action: '確認租屋自住、境內無房屋及排富條件是否符合',
  },

  // ── Further check items ────────────────────────────────────────────────────
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
    label: '薪資收入',
    description: '任職公司、機關或個人受雇，每月領取薪水',
  },
  {
    id: 'married',
    label: '配偶合併申報',
    description: '已婚並選擇與配偶合併辦理綜合所得稅申報',
  },
  {
    id: 'disability',
    label: '身心障礙',
    description: '持有身心障礙手冊或衛福部公告重大傷病卡',
  },
  {
    id: 'long_term_care',
    label: '長照',
    description: '家中有需要長照服務的成員',
  },
  {
    id: 'donations',
    label: '捐贈',
    description: '捐款給公益團體、學術機構或政府機關',
  },
  {
    id: 'insurance',
    label: '保險費',
    description: '繳納人身保險費（含壽險、意外險、健康險等）',
  },
  {
    id: 'medical_expenses',
    label: '醫療費用',
    description: '家庭成員在醫療機構就診或生育的自費支出',
  },
  {
    id: 'mortgage_interest',
    label: '購屋房貸利息',
    description: '自住房屋的房貸每年需繳利息',
  },
  {
    id: 'rent',
    label: '租屋',
    description: '本人及配偶在台灣租房居住，無自有房屋',
  },
  {
    id: 'childcare',
    label: '幼兒',
    description: '家中有6歲（含）以下幼兒',
  },
  {
    id: 'education_tuition',
    label: '教育學費',
    description: '受扶養子女就讀經教育部認可之國內外大專院校',
  },
  {
    id: 'savings_investment',
    label: '儲蓄投資',
    description: '有金融機構存款利息、儲蓄性質信託資金等收益',
  },
  {
    id: 'dividends',
    label: '股利收入',
    description: '持有台股或基金，收到股利或盈餘分配',
  },
  {
    id: 'overseas_income',
    label: '海外所得',
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
    id: 'general-deductions',
    title: '一般扣除額',
    description: '這些費用若有憑證，可能適用列舉扣除，有機會超過標準扣除額。',
    situationIds: ['donations', 'insurance', 'medical_expenses', 'mortgage_interest'],
  },
  {
    id: 'special-deductions',
    title: '特別扣除額',
    description: '依身分、照顧、居住與金融所得等條件確認可用的特別扣除。',
    situationIds: ['savings_investment', 'disability', 'childcare', 'education_tuition', 'long_term_care', 'rent'],
  },
]
