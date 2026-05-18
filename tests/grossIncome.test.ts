import { describe, it, expect } from 'vitest'
import {
  defaultExtraDependentLabel,
  getSalaryDeductionCap,
  getVisibleIncomeCardPersons,
  calcPersonDeduction,
  calcPersonNetIncome,
  parseGrossIncomePersons,
  parseIncome,
  serializePersonsJson,
  calcTotalGrossIncome,
  INCOME_CARD_CONFIGS,
  INCOME_PARTICIPANTS_ITEM_ID,
  calcRawIncomeTotal,
  incomeCardIsComplete,
  parseIncomeCardPersons,
  parseIncomeParticipantsFromMap,
  serializeIncomeAmounts,
  serializeIncomeParticipants,
} from '../src/lib/grossIncome'

describe('parseIncome', () => {
  it('treats empty and non-positive raw like salary self_income', () => {
    expect(parseIncome('')).toBe(0)
    expect(parseIncome('0')).toBe(0)
    expect(parseIncome('-1')).toBe(0)
    expect(parseIncome('abc')).toBe(0)
    expect(parseIncome('100')).toBe(100)
  })
})

describe('getSalaryDeductionCap', () => {
  it('returns 218000', () => {
    expect(getSalaryDeductionCap()).toBe(218_000)
  })
})

describe('calcPersonDeduction', () => {
  it('returns income when below cap', () => {
    expect(calcPersonDeduction(100_000)).toBe(100_000)
  })

  it('returns cap when income equals cap', () => {
    expect(calcPersonDeduction(218_000)).toBe(218_000)
  })

  it('returns cap when income exceeds cap', () => {
    expect(calcPersonDeduction(500_000)).toBe(218_000)
  })

  it('returns 0 for 0 income', () => {
    expect(calcPersonDeduction(0)).toBe(0)
  })
})

describe('defaultExtraDependentLabel', () => {
  it('returns 親屬1 for the first extra dependent', () => {
    expect(defaultExtraDependentLabel(0)).toBe('親屬1')
  })

  it('returns 親屬2 and 親屬3 for subsequent slots', () => {
    expect(defaultExtraDependentLabel(1)).toBe('親屬2')
    expect(defaultExtraDependentLabel(2)).toBe('親屬3')
  })
})

describe('calcPersonNetIncome', () => {
  it('returns 0 when income below cap (fully deducted)', () => {
    expect(calcPersonNetIncome(150_000)).toBe(0)
  })

  it('returns 0 when income equals cap', () => {
    expect(calcPersonNetIncome(218_000)).toBe(0)
  })

  it('returns excess over cap', () => {
    expect(calcPersonNetIncome(800_000)).toBe(582_000)
  })

  it('returns 0 for 0 income', () => {
    expect(calcPersonNetIncome(0)).toBe(0)
  })
})

describe('parseGrossIncomePersons', () => {
  it('always includes self with income from self_income', () => {
    const result = parseGrossIncomePersons({ self_income: '500000' }, false)
    expect(result[0]).toMatchObject({ id: 'self', label: '本人', income: 500_000 })
  })

  it('self income defaults to 0 if missing', () => {
    const result = parseGrossIncomePersons({}, false)
    expect(result[0].income).toBe(0)
  })

  it('self income defaults to 0 for empty string', () => {
    const result = parseGrossIncomePersons({ self_income: '' }, false)
    expect(result[0].income).toBe(0)
  })

  it('self income defaults to 0 for invalid string', () => {
    const result = parseGrossIncomePersons({ self_income: 'abc' }, false)
    expect(result[0].income).toBe(0)
  })

  it('self income clamps negative to 0', () => {
    const result = parseGrossIncomePersons({ self_income: '-1000' }, false)
    expect(result[0].income).toBe(0)
  })

  it('adds spouse when isMarriedFiling=true and persons_json is empty', () => {
    const result = parseGrossIncomePersons({ self_income: '500000' }, true)
    expect(result).toHaveLength(2)
    expect(result[1]).toMatchObject({ id: 'spouse', label: '配偶', income: 0 })
  })

  it('does not duplicate spouse when already in persons_json', () => {
    const json = serializePersonsJson([{ id: 'spouse', label: '配偶', income: 300_000 }])
    const result = parseGrossIncomePersons({ persons_json: json }, true)
    const spouseEntries = result.filter((p) => p.id === 'spouse')
    expect(spouseEntries).toHaveLength(1)
    expect(spouseEntries[0].income).toBe(300_000)
  })

  it('filters out spouse when isMarriedFiling=false', () => {
    const json = serializePersonsJson([{ id: 'spouse', label: '配偶', income: 300_000 }])
    const result = parseGrossIncomePersons({ persons_json: json }, false)
    expect(result.every((p) => p.id !== 'spouse')).toBe(true)
  })

  it('includes extra persons from persons_json', () => {
    const json = serializePersonsJson([
      { id: 'extra-0', label: '父親', income: 100_000 },
    ])
    const result = parseGrossIncomePersons({ self_income: '500000', persons_json: json }, false)
    expect(result).toHaveLength(2)
    expect(result[1]).toMatchObject({ id: 'extra-0', label: '父親', income: 100_000 })
  })

  it('handles malformed persons_json gracefully', () => {
    const result = parseGrossIncomePersons({ persons_json: 'not-json' }, false)
    expect(result).toHaveLength(1) // only self
  })
})

describe('serializePersonsJson round-trip', () => {
  it('round-trips correctly', () => {
    const persons = [
      { id: 'spouse', label: '配偶', income: 300_000 },
      { id: 'extra-0', label: '父親', income: 100_000 },
    ]
    const json = serializePersonsJson(persons)
    const parsed = parseGrossIncomePersons(
      { self_income: '500000', persons_json: json },
      true,
    )
    expect(parsed[1]).toMatchObject({ id: 'spouse', income: 300_000 })
    expect(parsed[2]).toMatchObject({ id: 'extra-0', label: '父親', income: 100_000 })
  })
})

describe('calcTotalGrossIncome', () => {
  it('sums net incomes of all persons', () => {
    const persons = [
      { id: 'self', label: '本人', income: 800_000 },
      { id: 'spouse', label: '配偶', income: 300_000 },
      { id: 'extra-0', label: '父親', income: 100_000 },
    ]
    // 800k - 218k = 582k; 300k - 218k = 82k; 100k fully deducted = 0
    expect(calcTotalGrossIncome(persons)).toBe(582_000 + 82_000 + 0)
  })

  it('returns 0 when all incomes are at or below cap', () => {
    const persons = [
      { id: 'self', label: '本人', income: 218_000 },
      { id: 'spouse', label: '配偶', income: 150_000 },
    ]
    expect(calcTotalGrossIncome(persons)).toBe(0)
  })

  it('returns 0 for empty persons list', () => {
    expect(calcTotalGrossIncome([])).toBe(0)
  })
})

describe('shared income participants', () => {
  it('syncs participants from the shared map and auto-adds spouse when married', () => {
    const participants = parseIncomeParticipantsFromMap({
      [INCOME_PARTICIPANTS_ITEM_ID]: {
        persons_json: serializeIncomeParticipants([{ id: 'extra-0', label: '母親' }]),
      },
    }, true)

    expect(participants).toEqual([
      { id: 'self', label: '本人' },
      { id: 'spouse', label: '配偶' },
      { id: 'extra-0', label: '母親' },
    ])
  })

  it('falls back to legacy salary persons_json labels for existing saved data', () => {
    const participants = parseIncomeParticipantsFromMap({
      'gross-income': {
        persons_json: serializePersonsJson([{ id: 'extra-0', label: '父親', income: 100_000 }]),
      },
    }, false)

    expect(participants).toEqual([
      { id: 'self', label: '本人' },
      { id: 'extra-0', label: '父親' },
    ])
  })
})

describe('parseIncomeCardPersons', () => {
  const participants = [
    { id: 'self', label: '本人' },
    { id: 'spouse', label: '配偶' },
    { id: 'extra-0', label: '父親' },
  ]

  it('marks only visible salary rows as required for completion', () => {
    const persons = parseIncomeCardPersons({ self_income: '300000' }, participants)
    expect(persons.map((p) => [p.id, p.hasInput])).toEqual([
      ['self', true],
      ['spouse', false],
      ['extra-0', false],
    ])
    expect(incomeCardIsComplete(INCOME_CARD_CONFIGS['gross-income'], persons)).toBe(false)
    expect(incomeCardIsComplete(
      INCOME_CARD_CONFIGS['gross-income'],
      getVisibleIncomeCardPersons(persons),
    )).toBe(false)
  })

  it('does not require an extra participant absent from the salary card', () => {
    const persons = parseIncomeCardPersons({ self_income: '300000' }, [
      { id: 'self', label: '本人' },
      { id: 'extra-0', label: '父親' },
    ])
    const visiblePersons = getVisibleIncomeCardPersons(persons)

    expect(visiblePersons.map((p) => p.id)).toEqual(['self'])
    expect(incomeCardIsComplete(INCOME_CARD_CONFIGS['gross-income'], visiblePersons)).toBe(true)
  })

  it('treats explicit 0 salary as filled', () => {
    const persons = parseIncomeCardPersons({
      self_income: '300000',
      persons_json: serializeIncomeAmounts([
        { id: 'spouse', label: '配偶', income: 0 },
        { id: 'extra-0', label: '父親', income: 0 },
      ]),
    }, participants)

    expect(incomeCardIsComplete(INCOME_CARD_CONFIGS['gross-income'], persons)).toBe(true)
  })

  it('defaults non-salary income rows to 0 while remaining complete', () => {
    const persons = parseIncomeCardPersons({}, participants)
    expect(calcRawIncomeTotal(persons)).toBe(0)
    expect(incomeCardIsComplete(INCOME_CARD_CONFIGS['interest-income'], persons)).toBe(true)
  })
})
