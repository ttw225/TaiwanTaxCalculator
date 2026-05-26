import { describe, expect, it } from 'vitest'
import { getBankAliases, normalizeSearchText } from '../src/lib/bankSearch'

describe('normalizeSearchText', () => {
  it('treats 臺 and 台 as the same character', () => {
    expect(normalizeSearchText('臺灣銀行')).toBe(normalizeSearchText('台灣銀行'))
  })

  it('lowercases ASCII letters', () => {
    expect(normalizeSearchText('DAWHO')).toBe('dawho')
  })

  it('normalizes full-width digits and letters via NFKC', () => {
    expect(normalizeSearchText('ＡＢＣ１２３')).toBe('abc123')
  })

  it('removes whitespace', () => {
    expect(normalizeSearchText('  台 灣 銀 行  ')).toBe('台灣銀行')
  })
})

describe('getBankAliases', () => {
  it('returns aliases for 臺灣銀行 (traditional form) including 台銀', () => {
    const aliases = getBankAliases('臺灣銀行')
    expect(aliases).toContain('台銀')
  })

  it('returns aliases for 台灣銀行 (simplified form) including 台銀', () => {
    const aliases = getBankAliases('台灣銀行')
    expect(aliases).toContain('台銀')
  })

  it('returns 土銀 for 土地銀行', () => {
    expect(getBankAliases('土地銀行')).toContain('土銀')
  })

  it('returns 合庫 for 合作金庫', () => {
    expect(getBankAliases('合作金庫')).toContain('合庫')
  })

  it('returns an empty array for banks without aliases', () => {
    expect(getBankAliases('玉山銀行')).toEqual([])
  })
})
