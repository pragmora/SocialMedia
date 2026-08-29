import { describe, it, expect } from 'vitest'
import { normalizePhoneDigits, buildWhatsAppLink } from '../whatsapp'

describe('normalizePhoneDigits', () => {
  it('returns null for empty or too-short numbers', () => {
    expect(normalizePhoneDigits('')).toBeNull()
    expect(normalizePhoneDigits('123')).toBeNull()
    expect(normalizePhoneDigits('  ')).toBeNull()
  })

  it('keeps a number that already has +54 (country code)', () => {
    expect(normalizePhoneDigits('+54 221 555-5555')).toBe('542215555555')
  })

  it('keeps a +549 mobile number as-is', () => {
    expect(normalizePhoneDigits('+549 221 5555555')).toBe('5492215555555')
  })

  it('turns a national number starting with 0 into 549 format (mobile)', () => {
    expect(normalizePhoneDigits('0221 555-5555')).toBe('5492215555555')
  })

  it('prepends 549 to a number without country code or leading 0', () => {
    expect(normalizePhoneDigits('2215555555')).toBe('5492215555555')
  })

  it('strips 00 international prefix', () => {
    expect(normalizePhoneDigits('00542215555555')).toBe('542215555555')
  })

  it('ignores dots, dashes, spaces and parentheses', () => {
    expect(normalizePhoneDigits('(0221) 555-55.55')).toBe('5492215555555')
  })
})

describe('buildWhatsAppLink', () => {
  it('builds a wa.me link with normalized digits', () => {
    expect(buildWhatsAppLink('0221 555-5555')).toBe('https://wa.me/5492215555555')
  })

  it('adds a text query param when provided', () => {
    expect(buildWhatsAppLink('02215555555', 'Hola')).toBe('https://wa.me/5492215555555?text=Hola')
  })

  it('encodes spaces in the text', () => {
    expect(buildWhatsAppLink('02215555555', 'Hola Luciano')).toContain('?text=Hola%20Luciano')
  })

  it('returns null for an empty phone', () => {
    expect(buildWhatsAppLink('')).toBeNull()
  })
})
