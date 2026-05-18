export const COUPLE_TYPE_MAP: Record<string, string> = {
  single: '合併',
  joint: '合併',
  self_salary_separate: '分開',
  spouse_salary_separate: '分開',
  self_all_income_separate: '分開',
  spouse_all_income_separate: '分開',
}

export const COUPLE_LABEL_MAP: Record<string, string> = {
  single: '單身申報',
  joint: '配偶所得合併',
  self_salary_separate: '本人薪資所得分開',
  spouse_salary_separate: '配偶薪資所得分開',
  self_all_income_separate: '本人各類所得分開',
  spouse_all_income_separate: '配偶各類所得分開',
}

export const DIVIDEND_LABEL_MAP: Record<string, string | null> = {
  none: null,
  merged: '股利合併',
  separate_28: '股利分開',
}

export function displayScenarioTitle(title: string): string {
  return title.replaceAll('計稅', '')
}
