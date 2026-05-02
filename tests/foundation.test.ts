import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import rawNumbers from '../src/data/numbers_2026.json'
import { getNumber, getBrackets } from '../src/lib/numbers'
import { readLocal, writeLocal, removeLocal } from '../src/lib/storage'

// numbers_2026.json smoke tests
describe('numbers_2026.json', () => {
  it('can be imported and items array is non-empty', () => {
    expect(Array.isArray(rawNumbers.items)).toBe(true)
    expect(rawNumbers.items.length).toBeGreaterThan(0)
  })
})

// numbers bridge — spec Example: key-to-value mapping
describe('getNumber', () => {
  it('returns 131000 for standard_deduction_single', () => {
    expect(getNumber('standard_deduction_single')).toBe(131000)
  })

  it('returns 262000 for standard_deduction_married', () => {
    expect(getNumber('standard_deduction_married')).toBe(262000)
  })

  it('returns 97000 for exemption_general', () => {
    expect(getNumber('exemption_general')).toBe(97000)
  })

  it('returns 213000 for basic_living_expense', () => {
    expect(getNumber('basic_living_expense')).toBe(213000)
  })

  it('throws on unknown key', () => {
    expect(() => getNumber('nonexistent_key')).toThrow('nonexistent_key')
  })
})

describe('getBrackets', () => {
  it('returns 5 brackets with first entry rate 0.05 and up_to 590000', () => {
    const brackets = getBrackets()
    expect(brackets).toHaveLength(5)
    expect(brackets[0].rate).toBe(0.05)
    expect(brackets[0].up_to).toBe(590000)
  })
})

// localStorage boundary — storage.ts smoke tests
describe('readLocal', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  it('returns null for an absent key', () => {
    expect(readLocal('nonexistent')).toBeNull()
  })
})

describe('writeLocal / readLocal roundtrip', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  it('returns the written value', () => {
    writeLocal('test', { foo: 42 })
    expect(readLocal<{ foo: number }>('test')).toEqual({ foo: 42 })
  })
})

describe('readLocal on invalid JSON', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('bad-key', 'not valid json {{{')
  })
  afterEach(() => localStorage.clear())

  it('returns null without throwing', () => {
    expect(() => readLocal('bad-key')).not.toThrow()
    expect(readLocal('bad-key')).toBeNull()
  })
})

describe('removeLocal', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  it('removes a key so readLocal returns null', () => {
    writeLocal('to-remove', 'value')
    removeLocal('to-remove')
    expect(readLocal('to-remove')).toBeNull()
  })
})
