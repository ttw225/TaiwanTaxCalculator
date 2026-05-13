/**
 * Official 114 couple filing examples for regression tests.
 * Expected amounts match each source’s published tables (see SOURCE_*); they were cross-checked against
 * `calcTaxScenarios` formula lines when building this file.
 */
import type { CoupleScenarioMode, DividendScenarioMode, TaxScenarioInputs } from '../../src/lib/taxScenarios'

export const SOURCE_MOF_STRATEGY_HTML =
  'docs/references/mof-couple-filing-strategy.html（財政部稅務入口網節稅秘笈精簡版；綜合所得總額 5,650,000／股利分開分支 4,050,000）'

export const SOURCE_ETAX_FAQ_LE0K8LG =
  'https://www.etax.nat.gov.tw/etwmain/tax-info/understanding/tax-q-and-a/national/individual-income-tax/exemption-scope/rule/LE0K8lg（問答 1239；薪資淨額 178.2 萬／128.2 萬，綜合所得總額 5,614,000）'

const dependentPerson = {
  id: 'extra-0',
  label: '扶養親屬',
  salaryNetIncome: 0,
  dividendIncome: 0,
  interestIncome: 100_000,
  otherIncome: 0,
} as const

const commonInputs = {
  isMarried: true,
  exemptionAmount: 291_000,
  selfExemptionAmount: 97_000,
  spouseExemptionAmount: 97_000,
  householdMemberCount: 3,
  generalDeductionAmount: 262_000,
  specialDeductionAmount: 270_000,
  savingsInvestmentDeductionAmount: 270_000,
  overseasIncome: 0,
  overseasTaxPaid: 0,
} as const

/** MOF 精簡版：本人薪資淨額 180 萬、配偶 130 萬（2,018,000／1,518,000 − 薪特扣） */
export const mofStrategyHtml114Inputs: TaxScenarioInputs = {
  ...commonInputs,
  persons: [
    {
      id: 'self',
      label: '本人',
      salaryNetIncome: 1_800_000,
      dividendIncome: 1_000_000,
      interestIncome: 150_000,
      otherIncome: 400_000,
    },
    {
      id: 'spouse',
      label: '配偶',
      salaryNetIncome: 1_300_000,
      dividendIncome: 600_000,
      interestIncome: 100_000,
      otherIncome: 200_000,
    },
    { ...dependentPerson },
  ],
}

/** 問答 LE0K8lg：本人薪資淨額 178.2 萬、配偶 128.2 萬 */
export const etaxFaqLe0k8lg114Inputs: TaxScenarioInputs = {
  ...commonInputs,
  persons: [
    {
      id: 'self',
      label: '本人',
      salaryNetIncome: 1_782_000,
      dividendIncome: 1_000_000,
      interestIncome: 150_000,
      otherIncome: 400_000,
    },
    {
      id: 'spouse',
      label: '配偶',
      salaryNetIncome: 1_282_000,
      dividendIncome: 600_000,
      interestIncome: 100_000,
      otherIncome: 200_000,
    },
    { ...dependentPerson },
  ],
}

export type OfficialDividendMode = Extract<DividendScenarioMode, 'merged' | 'separate_28'>

export interface OfficialGoldenBlock {
  /** Must match `TaxScenario.formulas` label for the net line (e.g. 綜合所得淨額). */
  netLabel: string
  net: number
  tax: number
}

export interface OfficialCoupleScenarioGolden {
  coupleMode: CoupleScenarioMode
  dividendMode: OfficialDividendMode
  grossIncome: number
  basicLivingApplied: number
  /** Equals `TaxScenario.taxableIncome` (sum of split nets). */
  jointOrTotalNet: number
  blocks: OfficialGoldenBlock[]
  regularIncomeTaxBeforeDividendCredit: number
  dividendCredit: number
  separateDividendTax: number
  regularTax: number
}

function j(net: number, tax: number): OfficialGoldenBlock {
  return { netLabel: '綜合所得淨額', net, tax }
}

/** Ten scenarios: 5 couple modes × 2 dividend modes — MOF 精簡版數字 */
export const mofStrategyHtml114Goldens: OfficialCoupleScenarioGolden[] = [
  {
    coupleMode: 'joint',
    dividendMode: 'merged',
    grossIncome: 5_650_000,
    basicLivingApplied: 0,
    jointOrTotalNet: 4_827_000,
    blocks: [j(4_827_000, 1_034_400)],
    regularIncomeTaxBeforeDividendCredit: 1_034_400,
    dividendCredit: 80_000,
    separateDividendTax: 0,
    regularTax: 954_400,
  },
  {
    coupleMode: 'joint',
    dividendMode: 'separate_28',
    grossIncome: 4_050_000,
    basicLivingApplied: 0,
    jointOrTotalNet: 3_227_000,
    blocks: [j(3_227_000, 554_400)],
    regularIncomeTaxBeforeDividendCredit: 554_400,
    dividendCredit: 0,
    separateDividendTax: 448_000,
    regularTax: 1_002_400,
  },
  {
    coupleMode: 'self_salary_separate',
    dividendMode: 'merged',
    grossIncome: 5_650_000,
    basicLivingApplied: 0,
    jointOrTotalNet: 4_827_000,
    blocks: [
      { netLabel: '本人薪資分開計稅淨額', net: 1_703_000, tax: 192_900 },
      { netLabel: '不含薪資分開計稅部分所得淨額', net: 3_124_000, tax: 523_500 },
    ],
    regularIncomeTaxBeforeDividendCredit: 716_400,
    dividendCredit: 80_000,
    separateDividendTax: 0,
    regularTax: 636_400,
  },
  {
    coupleMode: 'self_salary_separate',
    dividendMode: 'separate_28',
    grossIncome: 4_050_000,
    basicLivingApplied: 0,
    jointOrTotalNet: 3_227_000,
    blocks: [
      { netLabel: '本人薪資分開計稅淨額', net: 1_703_000, tax: 192_900 },
      { netLabel: '不含薪資分開計稅部分所得淨額', net: 1_524_000, tax: 157_100 },
    ],
    regularIncomeTaxBeforeDividendCredit: 350_000,
    dividendCredit: 0,
    separateDividendTax: 448_000,
    regularTax: 798_000,
  },
  {
    coupleMode: 'spouse_salary_separate',
    dividendMode: 'merged',
    grossIncome: 5_650_000,
    basicLivingApplied: 0,
    jointOrTotalNet: 4_827_000,
    blocks: [
      { netLabel: '配偶薪資分開計稅淨額', net: 1_203_000, tax: 103_060 },
      { netLabel: '不含薪資分開計稅部分所得淨額', net: 3_624_000, tax: 673_500 },
    ],
    regularIncomeTaxBeforeDividendCredit: 776_560,
    dividendCredit: 80_000,
    separateDividendTax: 0,
    regularTax: 696_560,
  },
  {
    coupleMode: 'spouse_salary_separate',
    dividendMode: 'separate_28',
    grossIncome: 4_050_000,
    basicLivingApplied: 0,
    jointOrTotalNet: 3_227_000,
    blocks: [
      { netLabel: '配偶薪資分開計稅淨額', net: 1_203_000, tax: 103_060 },
      { netLabel: '不含薪資分開計稅部分所得淨額', net: 2_024_000, tax: 257_100 },
    ],
    regularIncomeTaxBeforeDividendCredit: 360_160,
    dividendCredit: 0,
    separateDividendTax: 448_000,
    regularTax: 808_160,
  },
  {
    coupleMode: 'self_all_income_separate',
    dividendMode: 'merged',
    grossIncome: 5_650_000,
    basicLivingApplied: 0,
    jointOrTotalNet: 4_827_000,
    blocks: [
      { netLabel: '本人各類所得分開計稅淨額', net: 3_183_000, tax: 541_200 },
      { netLabel: '不含各類所得分開計稅部分所得淨額', net: 1_644_000, tax: 181_100 },
    ],
    regularIncomeTaxBeforeDividendCredit: 722_300,
    dividendCredit: 80_000,
    separateDividendTax: 0,
    regularTax: 642_300,
  },
  {
    coupleMode: 'self_all_income_separate',
    dividendMode: 'separate_28',
    grossIncome: 4_050_000,
    basicLivingApplied: 0,
    jointOrTotalNet: 3_227_000,
    blocks: [
      { netLabel: '本人各類所得分開計稅淨額', net: 2_183_000, tax: 288_900 },
      { netLabel: '不含各類所得分開計稅部分所得淨額', net: 1_044_000, tax: 83_980 },
    ],
    regularIncomeTaxBeforeDividendCredit: 372_880,
    dividendCredit: 0,
    separateDividendTax: 448_000,
    regularTax: 820_880,
  },
  {
    coupleMode: 'spouse_all_income_separate',
    dividendMode: 'merged',
    grossIncome: 5_650_000,
    basicLivingApplied: 0,
    jointOrTotalNet: 4_827_000,
    blocks: [
      { netLabel: '配偶各類所得分開計稅淨額', net: 2_083_000, tax: 268_900 },
      { netLabel: '不含各類所得分開計稅部分所得淨額', net: 2_744_000, tax: 409_500 },
    ],
    regularIncomeTaxBeforeDividendCredit: 678_400,
    dividendCredit: 80_000,
    separateDividendTax: 0,
    regularTax: 598_400,
  },
  {
    coupleMode: 'spouse_all_income_separate',
    dividendMode: 'separate_28',
    grossIncome: 4_050_000,
    basicLivingApplied: 0,
    jointOrTotalNet: 3_227_000,
    blocks: [
      { netLabel: '配偶各類所得分開計稅淨額', net: 1_483_000, tax: 148_900 },
      { netLabel: '不含各類所得分開計稅部分所得淨額', net: 1_744_000, tax: 201_100 },
    ],
    regularIncomeTaxBeforeDividendCredit: 350_000,
    dividendCredit: 0,
    separateDividendTax: 448_000,
    regularTax: 798_000,
  },
]

/** Ten scenarios — eTax 問答 LE0K8lg（561.4 萬／401.4 萬 股利分開） */
export const etaxFaqLe0k8lg114Goldens: OfficialCoupleScenarioGolden[] = [
  {
    coupleMode: 'joint',
    dividendMode: 'merged',
    grossIncome: 5_614_000,
    basicLivingApplied: 0,
    jointOrTotalNet: 4_791_000,
    blocks: [j(4_791_000, 1_023_600)],
    regularIncomeTaxBeforeDividendCredit: 1_023_600,
    dividendCredit: 80_000,
    separateDividendTax: 0,
    regularTax: 943_600,
  },
  {
    coupleMode: 'joint',
    dividendMode: 'separate_28',
    grossIncome: 4_014_000,
    basicLivingApplied: 0,
    jointOrTotalNet: 3_191_000,
    blocks: [j(3_191_000, 543_600)],
    regularIncomeTaxBeforeDividendCredit: 543_600,
    dividendCredit: 0,
    separateDividendTax: 448_000,
    regularTax: 991_600,
  },
  {
    coupleMode: 'self_salary_separate',
    dividendMode: 'merged',
    grossIncome: 5_614_000,
    basicLivingApplied: 0,
    jointOrTotalNet: 4_791_000,
    blocks: [
      { netLabel: '本人薪資分開計稅淨額', net: 1_685_000, tax: 189_300 },
      { netLabel: '不含薪資分開計稅部分所得淨額', net: 3_106_000, tax: 518_100 },
    ],
    regularIncomeTaxBeforeDividendCredit: 707_400,
    dividendCredit: 80_000,
    separateDividendTax: 0,
    regularTax: 627_400,
  },
  {
    coupleMode: 'self_salary_separate',
    dividendMode: 'separate_28',
    grossIncome: 4_014_000,
    basicLivingApplied: 0,
    jointOrTotalNet: 3_191_000,
    blocks: [
      { netLabel: '本人薪資分開計稅淨額', net: 1_685_000, tax: 189_300 },
      { netLabel: '不含薪資分開計稅部分所得淨額', net: 1_506_000, tax: 153_500 },
    ],
    regularIncomeTaxBeforeDividendCredit: 342_800,
    dividendCredit: 0,
    separateDividendTax: 448_000,
    regularTax: 790_800,
  },
  {
    coupleMode: 'spouse_salary_separate',
    dividendMode: 'merged',
    grossIncome: 5_614_000,
    basicLivingApplied: 0,
    jointOrTotalNet: 4_791_000,
    blocks: [
      { netLabel: '配偶薪資分開計稅淨額', net: 1_185_000, tax: 100_900 },
      { netLabel: '不含薪資分開計稅部分所得淨額', net: 3_606_000, tax: 668_100 },
    ],
    regularIncomeTaxBeforeDividendCredit: 769_000,
    dividendCredit: 80_000,
    separateDividendTax: 0,
    regularTax: 689_000,
  },
  {
    coupleMode: 'spouse_salary_separate',
    dividendMode: 'separate_28',
    grossIncome: 4_014_000,
    basicLivingApplied: 0,
    jointOrTotalNet: 3_191_000,
    blocks: [
      { netLabel: '配偶薪資分開計稅淨額', net: 1_185_000, tax: 100_900 },
      { netLabel: '不含薪資分開計稅部分所得淨額', net: 2_006_000, tax: 253_500 },
    ],
    regularIncomeTaxBeforeDividendCredit: 354_400,
    dividendCredit: 0,
    separateDividendTax: 448_000,
    regularTax: 802_400,
  },
  {
    coupleMode: 'self_all_income_separate',
    dividendMode: 'merged',
    grossIncome: 5_614_000,
    basicLivingApplied: 0,
    jointOrTotalNet: 4_791_000,
    blocks: [
      { netLabel: '本人各類所得分開計稅淨額', net: 3_165_000, tax: 535_800 },
      { netLabel: '不含各類所得分開計稅部分所得淨額', net: 1_626_000, tax: 177_500 },
    ],
    regularIncomeTaxBeforeDividendCredit: 713_300,
    dividendCredit: 80_000,
    separateDividendTax: 0,
    regularTax: 633_300,
  },
  {
    coupleMode: 'self_all_income_separate',
    dividendMode: 'separate_28',
    grossIncome: 4_014_000,
    basicLivingApplied: 0,
    jointOrTotalNet: 3_191_000,
    blocks: [
      { netLabel: '本人各類所得分開計稅淨額', net: 2_165_000, tax: 285_300 },
      { netLabel: '不含各類所得分開計稅部分所得淨額', net: 1_026_000, tax: 81_820 },
    ],
    regularIncomeTaxBeforeDividendCredit: 367_120,
    dividendCredit: 0,
    separateDividendTax: 448_000,
    regularTax: 815_120,
  },
  {
    coupleMode: 'spouse_all_income_separate',
    dividendMode: 'merged',
    grossIncome: 5_614_000,
    basicLivingApplied: 0,
    jointOrTotalNet: 4_791_000,
    blocks: [
      { netLabel: '配偶各類所得分開計稅淨額', net: 2_065_000, tax: 265_300 },
      { netLabel: '不含各類所得分開計稅部分所得淨額', net: 2_726_000, tax: 404_100 },
    ],
    regularIncomeTaxBeforeDividendCredit: 669_400,
    dividendCredit: 80_000,
    separateDividendTax: 0,
    regularTax: 589_400,
  },
  {
    coupleMode: 'spouse_all_income_separate',
    dividendMode: 'separate_28',
    grossIncome: 4_014_000,
    basicLivingApplied: 0,
    jointOrTotalNet: 3_191_000,
    blocks: [
      { netLabel: '配偶各類所得分開計稅淨額', net: 1_465_000, tax: 145_300 },
      { netLabel: '不含各類所得分開計稅部分所得淨額', net: 1_726_000, tax: 197_500 },
    ],
    regularIncomeTaxBeforeDividendCredit: 342_800,
    dividendCredit: 0,
    separateDividendTax: 448_000,
    regularTax: 790_800,
  },
]

export function scenarioId(g: OfficialCoupleScenarioGolden): string {
  return `${g.coupleMode}:${g.dividendMode}`
}
