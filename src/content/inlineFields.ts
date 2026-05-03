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
}
