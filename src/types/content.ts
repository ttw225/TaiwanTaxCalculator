export type VerificationStatus = 'verified' | 'partially_verified' | 'unverified'

export type DisclaimerLevel = 'low' | 'medium' | 'high'

export type SituationId =
  | 'salary_income'
  | 'married'
  | 'disability'
  | 'long_term_care'
  | 'donations'
  | 'insurance'
  | 'medical_expenses'
  | 'mortgage_interest'
  | 'rent'
  | 'childcare'
  | 'education_tuition'
  | 'savings_investment'
  | 'dividends'
  | 'overseas_income'

export interface Situation {
  id: SituationId
  label: string
  description: string
}

export interface SituationGroup {
  id: string
  title: string
  description: string
  situationIds: SituationId[]
}

export type CategoryId =
  | 'gross_income'
  | 'exemptions'
  | 'general_deductions'
  | 'special_deductions'
  | 'further_check'

export interface SourceRef {
  source_id: string
  label: string
  authority?: string
  url?: string
}

export interface ChecklistItem {
  id: string
  title: string
  category: CategoryId
  situations: SituationId[]
  why_it_matters: string
  eligibility_cues: string[]
  documents_to_prepare: string[]
  limitations: string[]
  source_refs: SourceRef[]
  verification_status: VerificationStatus
  disclaimer_level: DisclaimerLevel
  next_action: string
}

export interface CardInlineField {
  id: string
  label: string
  type: 'number'
  unit: string
  capKey: string | null
}

export type CardInputMap = Record<string, Record<string, string>>

export type DecisionToolId = 'dividend' | 'couple_filing' | 'amt'
