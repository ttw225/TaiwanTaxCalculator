import { describe, it, expect } from 'vitest'
import { calcBracketTax, calcDividendOptions, calcCoupleFilingOptions, checkAmtThreshold } from '../src/lib/decisions'

// ── calcBracketTax ────────────────────────────────────────────────────────────

describe('calcBracketTax', () => {
  it('returns 0 for zero income', () => {
    expect(calcBracketTax(0)).toBe(0)
  })

  it('returns 0 for negative income', () => {
    expect(calcBracketTax(-100)).toBe(0)
  })

  it('5% bracket top: 590,000 → 29,500', () => {
    expect(calcBracketTax(590_000)).toBe(29_500)
  })

  it('12% bracket entry: 590,001 → 590001 × 0.12 - 41300 = 29,500', () => {
    // 590001 × 0.12 - 41300 = 70800.12 - 41300 = 29500 (rounded)
    expect(calcBracketTax(590_001)).toBe(29_500)
  })

  it('12% bracket top: 1,330,000 → 1330000 × 0.12 - 41300 = 118,300', () => {
    expect(calcBracketTax(1_330_000)).toBe(118_300)
  })

  it('20% bracket entry: 1,330,001 → 1330001 × 0.20 - 147700 = 118,300', () => {
    expect(calcBracketTax(1_330_001)).toBe(118_300)
  })

  it('12% bracket mid: 1,000,000 → 78,700', () => {
    expect(calcBracketTax(1_000_000)).toBe(78_700)
  })

  it('20% bracket: 2,000,000 → 252,300', () => {
    expect(calcBracketTax(2_000_000)).toBe(252_300)
  })

  it('40% bracket (top): 5,000,000 → 5000000 × 0.40 - 911700 = 1,088,300', () => {
    expect(calcBracketTax(5_000_000)).toBe(1_088_300)
  })
})

// ── calcDividendOptions ───────────────────────────────────────────────────────

describe('calcDividendOptions', () => {
  it('at 20% bracket with NT$500,000 dividends: Option A should win', () => {
    const result = calcDividendOptions(500_000, 0.20)
    // optionA_credit = min(500000 × 0.085, 80000) = min(42500, 80000) = 42500
    // optionA_tax = 500000 × 0.20 - 42500 = 100000 - 42500 = 57500
    // optionB_tax = 500000 × 0.28 = 140000
    expect(result.optionA.credit).toBe(42_500)
    expect(result.optionA.tax).toBe(57_500)
    expect(result.optionB.tax).toBe(140_000)
    expect(result.recommended).toBe('A')
    expect(result.savings).toBe(82_500)
  })

  it('at 40% bracket with NT$1,000,000 dividends: Option B should win', () => {
    const result = calcDividendOptions(1_000_000, 0.40)
    // optionA_credit = min(1000000 × 0.085, 80000) = min(85000, 80000) = 80000 (capped)
    // optionA_tax = 1000000 × 0.40 - 80000 = 400000 - 80000 = 320000
    // optionB_tax = 1000000 × 0.28 = 280000
    expect(result.optionA.credit).toBe(80_000)
    expect(result.optionA.tax).toBe(320_000)
    expect(result.optionB.tax).toBe(280_000)
    expect(result.recommended).toBe('B')
    expect(result.savings).toBe(40_000)
  })

  it('credit is capped at 80,000 for large dividend amounts', () => {
    const result = calcDividendOptions(2_000_000, 0.12)
    // raw credit = 2000000 × 0.085 = 170000 → capped at 80000
    expect(result.optionA.credit).toBe(80_000)
  })

  it('clamps negative dividend to 0 (both options return 0)', () => {
    const result = calcDividendOptions(-100_000, 0.20)
    expect(result.optionA.tax).toBe(0)
    expect(result.optionB.tax).toBe(0)
    expect(result.recommended).toBe('equal')
  })

  it('break-even: near 33% rate both options are close', () => {
    // At exactly 28% + 8.5% credit arrangement, break-even is around 33%
    const resultLow = calcDividendOptions(1_000_000, 0.30)
    const resultHigh = calcDividendOptions(1_000_000, 0.40)
    // 30% bracket: optionA = 300000 - 80000 = 220000; B = 280000 → A wins
    expect(resultLow.recommended).toBe('A')
    // 40% bracket: optionA = 400000 - 80000 = 320000; B = 280000 → B wins
    expect(resultHigh.recommended).toBe('B')
  })
})

// ── calcCoupleFilingOptions ───────────────────────────────────────────────────

describe('calcCoupleFilingOptions', () => {
  it('returns 3 modes', () => {
    const result = calcCoupleFilingOptions(800_000, 600_000)
    expect(result.modes).toHaveLength(3)
  })

  it('bestIndex points to the mode with lowest tax', () => {
    const result = calcCoupleFilingOptions(800_000, 600_000)
    const minTax = Math.min(...result.modes.map((m) => m.tax))
    expect(result.modes[result.bestIndex].tax).toBe(minTax)
  })

  it('savings equals difference between best and second-best mode', () => {
    const result = calcCoupleFilingOptions(800_000, 600_000)
    const sorted = [...result.modes.map((m) => m.tax)].sort((a, b) => a - b)
    expect(result.savings).toBe(sorted[1] - sorted[0])
  })

  it('all tax values are non-negative', () => {
    const result = calcCoupleFilingOptions(300_000, 250_000)
    for (const mode of result.modes) {
      expect(mode.tax).toBeGreaterThanOrEqual(0)
    }
  })

  it('handles zero salary', () => {
    const result = calcCoupleFilingOptions(0, 0)
    for (const mode of result.modes) {
      expect(mode.tax).toBe(0)
    }
  })

  it('symmetric: husband 800k + wife 600k give same minimum tax as 600k + 800k', () => {
    const r1 = calcCoupleFilingOptions(800_000, 600_000)
    const r2 = calcCoupleFilingOptions(600_000, 800_000)
    const min1 = Math.min(...r1.modes.map((m) => m.tax))
    const min2 = Math.min(...r2.modes.map((m) => m.tax))
    expect(min1).toBe(min2)
  })

  it('800k/600k salaries: all three modes return equal tax (pure salary symmetric)', () => {
    // STANDARD_MARRIED=262000, SALARY_DED=218000, EXEMPTION=97000
    // Joint: (800k+600k) - 262k - 218k×2 - 97k×2 = 1400k - 892k = 508k → 5% = 25400
    // Separate: each spouse: half-standard=131k
    //   h taxable = max(0, 800k - 131k - 218k - 97k) = max(0, 354k) = 354k → 5% = 17700
    //   w taxable = max(0, 600k - 131k - 218k - 97k) = max(0, 154k) = 154k → 5% = 7700
    //   total = 17700 + 7700 = 25400
    const result = calcCoupleFilingOptions(800_000, 600_000)
    expect(result.modes[0].tax).toBe(25_400) // joint
    expect(result.modes[1].tax).toBe(25_400) // husband primary
    expect(result.modes[2].tax).toBe(25_400) // wife primary
    expect(result.savings).toBe(0)
  })

  it('one spouse zero salary: only one earner', () => {
    // h=1500k, w=0
    // Joint: 1500k - 262k - 218k×2 - 97k×2 = 1500k - 892k = 608k → 12% = 608k×0.12 - 41300 = 31660
    const result = calcCoupleFilingOptions(1_500_000, 0)
    expect(result.modes[0].tax).toBe(31_660)
    for (const mode of result.modes) {
      expect(mode.tax).toBeGreaterThanOrEqual(0)
    }
  })

  it('clamps negative salary inputs to 0', () => {
    const resultNeg = calcCoupleFilingOptions(-500_000, -300_000)
    const resultZero = calcCoupleFilingOptions(0, 0)
    expect(resultNeg.modes[0].tax).toBe(resultZero.modes[0].tax)
  })
})

// ── checkAmtThreshold ─────────────────────────────────────────────────────────

describe('checkAmtThreshold', () => {
  it('returns aboveThreshold=false when income is below 1,000,000', () => {
    const result = checkAmtThreshold(900_000)
    expect(result.aboveThreshold).toBe(false)
    expect(result.threshold).toBe(1_000_000)
  })

  it('returns aboveThreshold=true when income equals threshold', () => {
    const result = checkAmtThreshold(1_000_000)
    expect(result.aboveThreshold).toBe(true)
  })

  it('returns aboveThreshold=true when income exceeds threshold', () => {
    const result = checkAmtThreshold(1_500_000)
    expect(result.aboveThreshold).toBe(true)
  })

  it('returns aboveThreshold=false for zero income', () => {
    const result = checkAmtThreshold(0)
    expect(result.aboveThreshold).toBe(false)
  })
})
