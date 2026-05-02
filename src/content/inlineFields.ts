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
      capKey: null,
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
  'salary-special-deduction': [
    {
      id: 'salary_amount',
      label: '今年薪資所得總額',
      type: 'number',
      unit: '元',
      capKey: 'special_deduction_salary',
    },
  ],
  'exemption-general': [
    {
      id: 'dependents_count',
      label: '受扶養親屬人數（不含本人）',
      type: 'number',
      unit: '人',
      capKey: null,
    },
  ],
}
