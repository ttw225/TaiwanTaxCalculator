import type { CardInlineField } from '../types/content'

export const ITEM_INLINE_FIELDS: Record<string, CardInlineField[]> = {
  'mortgage-interest-deduction': [
    {
      id: 'mortgage_interest_amount',
      label: '今年支付的房貸利息',
      type: 'number',
      unit: '元',
      capKey: null,
    },
  ],
  'rent-deduction': [
    {
      id: 'rent_amount',
      label: '今年支付的租金',
      type: 'number',
      unit: '元',
      capKey: 'special_deduction_rent',
    },
  ],
  'medical-deduction': [
    {
      id: 'medical_amount',
      label: '今年醫療費用（自費部分）',
      type: 'number',
      unit: '元',
      capKey: null,
    },
  ],
  'donations-deduction': [
    {
      id: 'donation_amount',
      label: '今年對符合資格機構的捐贈總額',
      type: 'number',
      unit: '元',
      capKey: null,
    },
  ],
  'exemption-general': [
    {
      id: 'exemption_under70_count',
      label: '一般免稅額人數（未滿 70 歲）',
      type: 'number',
      unit: '人',
      capKey: null,
      perUnitKey: 'exemption_general',
    },
    {
      id: 'exemption_over70_count',
      label: '年長免稅額人數（70 歲以上）',
      type: 'number',
      unit: '人',
      capKey: null,
      perUnitKey: 'exemption_senior_70',
    },
  ],
  'savings-investment-deduction': [
    {
      id: 'savings_investment_amount',
      label: '儲蓄投資所得',
      type: 'number',
      unit: '元',
      capKey: 'special_deduction_savings_investment',
    },
  ],
  'disability-special-deduction': [
    {
      id: 'disability_count',
      label: '身心障礙人數',
      type: 'number',
      unit: '人',
      capKey: null,
      perUnitKey: 'special_deduction_disability',
    },
  ],
  'childcare-deduction': [
    {
      id: 'childcare_count',
      label: '幼兒人數',
      type: 'number',
      unit: '人',
      capKey: null,
      splitPerUnitKeys: {
        firstKey: 'special_deduction_childcare_first',
        additionalKey: 'special_deduction_childcare_additional',
      },
    },
  ],
  'education-tuition-deduction': [
    {
      id: 'education_count',
      label: '就讀大學子女人數',
      type: 'number',
      unit: '人',
      capKey: null,
      perUnitKey: 'special_deduction_education_tuition',
    },
  ],
  'long-term-care-deduction': [
    {
      id: 'long_term_care_count',
      label: '長期照顧人數',
      type: 'number',
      unit: '人',
      capKey: null,
      perUnitKey: 'special_deduction_long_term_care',
    },
  ],
}
