import type { DecisionToolId, SourceRef } from '../types/content'

export interface DecisionToolMeta {
  id: DecisionToolId
  title: string
  subtitle: string
  disclaimer: string
  sourceRefs: SourceRef[]
}

export const DIVIDEND_TOOL_META: DecisionToolMeta = {
  id: 'dividend',
  title: '股利課稅方式試算',
  subtitle: '合併計稅 vs 28% 分開計稅，哪種對你比較有利？',
  disclaimer:
    '此為初步估算工具。實際稅負須依個人完整所得、扣除額及財政部電子申報系統試算結果為準。',
  sourceRefs: [
    {
      source_id: 'law_income_tax_act',
      label: '所得稅法',
      authority: '法務部全國法規資料庫',
      url: 'https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=G0340003',
    },
    {
      source_id: 'mof_114_tax_measures',
      label: '財政部114年度申報新措施',
      authority: '財政部',
      url: 'https://www.mof.gov.tw/singlehtml/384fb3077bb349ea973e7fc6f13b6974?cntId=1303f6fa4c0446fa8568d30915166ae6',
    },
  ],
}

export const COUPLE_FILING_TOOL_META: DecisionToolMeta = {
  id: 'couple_filing',
  title: '夫妻申報方式比較',
  subtitle: '合併申報 vs 薪資分開計稅，試算三種方式的稅負差異',
  disclaimer:
    '此工具僅估算薪資所得部分，其他所得（股利、租賃、執行業務等）、特別扣除額細項及排富條款尚未納入。請以財政部報稅系統試算完整結果，並視個人情況諮詢稅務師。',
  sourceRefs: [
    {
      source_id: 'law_income_tax_act',
      label: '所得稅法',
      authority: '法務部全國法規資料庫',
      url: 'https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=G0340003',
    },
    {
      source_id: 'ntb_114_return_manual',
      label: '114年度申報書說明',
      authority: '財政部電子申報繳稅服務網',
      url: 'https://download.tax.nat.gov.tw/irx/doc/114%E5%B9%B4%E5%BA%A6%E7%B6%9C%E5%90%88%E6%89%80%E5%BE%97%E7%A8%85%E7%B5%90%E7%AE%97%E7%94%B3%E5%A0%B1%E6%9B%B8%E8%AA%AA%E6%98%8E.pdf',
    },
  ],
}

export const AMT_TOOL_META: DecisionToolMeta = {
  id: 'amt',
  title: '海外所得 AMT 門檻確認',
  subtitle: '確認是否需要進入最低稅負制（AMT）計算流程',
  disclaimer:
    '海外所得與最低稅負制規定較複雜，此工具僅提供門檻確認與準備方向。實際計算及申報建議諮詢稅務師或記帳士。',
  sourceRefs: [
    {
      source_id: 'law_amt_act',
      label: '所得基本稅額條例',
      authority: '法務部全國法規資料庫',
      url: 'https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=G0340115',
    },
    {
      source_id: 'etax_mof_amt_overseas_manual',
      label: '財政部最低稅負制海外所得說明',
      authority: '財政部電子申報繳稅服務網',
    },
  ],
}

export const AMT_CHECKLIST_STEPS = [
  '確認台灣稅務居民身分（依所得稅法及主管機關函釋）',
  '彙整非中華民國來源所得（含港澳），依官方定義分類',
  '計算「基本所得額」，並與一般綜合所得稅比較，確認是否須繳基本稅額',
  '確認可扣抵境外稅額（依基本稅額條例規定，有上限，不可全額扣抵）',
  '備齊境外所得文件：扣繳憑單、匯款紀錄、外幣換算基礎、券商對帳單',
] as const
