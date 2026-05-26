const BANK_ALIASES_BY_NORMALIZED_NAME = new Map<string, string[]>([
  ['台灣銀行', ['台灣銀行', '台銀']],
  ['土地銀行', ['土銀']],
  ['合作金庫', ['合庫']],
])

export function normalizeSearchText(value: string): string {
  return value.normalize('NFKC').toLowerCase().replaceAll('臺', '台').replace(/\s+/g, '')
}

export function getBankAliases(bankName: string): string[] {
  return BANK_ALIASES_BY_NORMALIZED_NAME.get(normalizeSearchText(bankName)) ?? []
}
