import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ResultList } from '../src/components/payment/ResultList'
import type { TypeFilterValue } from '../src/components/payment/TypeFilter'
import type { Offer } from '../src/types/paymentOffers'

let container: HTMLDivElement
let root: Root | null

const ALL_TYPES_ON: TypeFilterValue = {
  taiwan_pay: true,
  credit_card: true,
  debit_card: true,
  installment: true,
}

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  root = null
  container = document.createElement('div')
  document.body.appendChild(container)
})

afterEach(() => {
  if (root) {
    act(() => {
      root?.unmount()
    })
    root = null
  }
  document.body.removeChild(container)
})

function makeOffer(overrides: Partial<Offer>): Offer {
  const id = overrides.id ?? 'offer-default'
  const bankCode = overrides.bank_code ?? '999'
  return {
    id,
    bank_code: bankCode,
    bank: overrides.bank ?? '測試銀行',
    card_name: overrides.card_name ?? '測試卡',
    card_scope: overrides.card_scope ?? null,
    campaign_title: overrides.campaign_title ?? `活動-${id}`,
    source_url: overrides.source_url ?? 'https://example.com',
    source_id: overrides.source_id ?? null,
    mode: overrides.mode ?? 'rate',
    rate: overrides.rate ?? 1,
    fixed: overrides.fixed,
    fixed_unit: overrides.fixed_unit,
    min: overrides.min ?? null,
    base_min: overrides.base_min ?? null,
    base_fixed: overrides.base_fixed ?? null,
    cap_nt: overrides.cap_nt ?? null,
    cap_label: overrides.cap_label ?? null,
    amount_tiers: overrides.amount_tiers,
    eligible_card_ids: overrides.eligible_card_ids ?? [],
    is_card_specific: overrides.is_card_specific ?? false,
    tags: overrides.tags ?? ['credit_card'],
    requires_registration: overrides.requires_registration ?? false,
    period: overrides.period ?? null,
    installment_summary: overrides.installment_summary ?? null,
    note: overrides.note ?? null,
    channel: overrides.channel ?? null,
  }
}

function renderResultList({ offers, amount = 500, query = '' }: { offers: Offer[]; amount?: number; query?: string }) {
  const nextRoot = createRoot(container)
  root = nextRoot
  act(() => {
    nextRoot.render(
      createElement(ResultList, {
        offers,
        amount,
        typeFilter: ALL_TYPES_ON,
        selectedCardIds: new Set<string>(),
        query,
        onQueryChange: () => {},
      }),
    )
  })
}

function getFirstCapValueText() {
  const labels = Array.from(container.querySelectorAll('p'))
  const capLabel = labels.find((p) => p.textContent?.trim() === '回饋上限')
  return capLabel?.nextElementSibling?.textContent?.trim() ?? null
}

describe('ResultList applicable filtering', () => {
  it('hides offers that do not meet min threshold', () => {
    const offers = [
      makeOffer({ id: 'inapplicable', campaign_title: '高門檻活動', min: 1000 }),
      makeOffer({ id: 'applicable', campaign_title: '可用活動', min: 100 }),
    ]
    renderResultList({ offers, amount: 500 })

    expect(container.textContent).toContain('可用活動')
    expect(container.textContent).not.toContain('高門檻活動')
    expect(container.textContent).toContain('共 1 個方案')
  })

  it('shows searched empty state when matches exist but all are inapplicable', () => {
    const offers = [
      makeOffer({ id: 'inapplicable', campaign_title: '高門檻專屬活動', min: 2000 }),
    ]
    renderResultList({ offers, amount: 500, query: '專屬' })

    expect(container.textContent).toContain('查無符合方案，試試其他關鍵字')
    expect(container.textContent).not.toContain('高門檻專屬活動')
  })

  it('keeps applicable offers and count text in sync', () => {
    const offers = [
      makeOffer({ id: 'rate-ok', campaign_title: '一般回饋', min: 100 }),
      makeOffer({ id: 'fixed-ok', campaign_title: '固定回饋', mode: 'fixed', fixed: 88, min: 100 }),
    ]
    renderResultList({ offers, amount: 500 })

    expect(container.textContent).toContain('一般回饋')
    expect(container.textContent).toContain('固定回饋')
    expect(container.textContent).toContain('共 2 個方案')
  })

  it('keeps installment_only and fee_only offers visible when applicable', () => {
    const offers = [
      makeOffer({
        id: 'installment-ok',
        campaign_title: '分期活動',
        mode: 'installment_only',
        tags: ['installment'],
        rate: undefined,
      }),
      makeOffer({
        id: 'fee-ok',
        campaign_title: '手續費活動',
        mode: 'fee_only',
        tags: ['credit_card'],
        rate: undefined,
      }),
      makeOffer({
        id: 'inapplicable',
        campaign_title: '高門檻活動',
        mode: 'rate',
        min: 3000,
      }),
    ]
    renderResultList({ offers, amount: 500 })

    expect(container.textContent).toContain('分期活動')
    expect(container.textContent).toContain('手續費活動')
    expect(container.textContent).not.toContain('高門檻活動')
    expect(container.textContent).toContain('共 2 個方案')
  })

  it('shows "—" when both cap_label and cap_nt are missing', () => {
    const offers = [
      makeOffer({
        id: 'fallback-cap',
        campaign_title: '無上限欄位活動',
        cap_label: null,
        cap_nt: null,
      }),
    ]
    renderResultList({ offers, amount: 500 })

    expect(getFirstCapValueText()).toBe('—')
  })

  it('shows formatted cap_nt when cap_label is missing', () => {
    const offers = [
      makeOffer({
        id: 'cap-nt-only',
        campaign_title: '數字上限活動',
        cap_label: null,
        cap_nt: 3000,
      }),
    ]
    renderResultList({ offers, amount: 500 })

    expect(getFirstCapValueText()).toBe('NT$ 3,000')
  })

  it('prefers cap_label over cap_nt when both exist', () => {
    const offers = [
      makeOffer({
        id: 'cap-label-priority',
        campaign_title: '文字上限優先活動',
        cap_label: '每戶回饋上限 20,000 元',
        cap_nt: 3000,
      }),
    ]
    renderResultList({ offers, amount: 500 })

    expect(getFirstCapValueText()).toBe('每戶回饋上限 20,000 元')
  })
})
