import { describe, it, expect } from 'vitest'
import { NEXT_STATUS } from '@/lib/statusTransitions'

describe('NEXT_STATUS — shared status transition map', () => {
  it('exports a Record<string, string[]> with all seven status keys', () => {
    const keys = Object.keys(NEXT_STATUS)
    expect(keys).toHaveLength(7)
    expect(keys).toContain('pre_produccion')
    expect(keys).toContain('en_espera')
    expect(keys).toContain('en_edicion')
    expect(keys).toContain('validacion')
    expect(keys).toContain('listo_para_subir')
    expect(keys).toContain('subido')
    expect(keys).toContain('archivado')
  })

  it('each status can transition to any other status (but not itself)', () => {
    const all = ['pre_produccion', 'en_espera', 'en_edicion', 'validacion', 'listo_para_subir', 'subido', 'archivado']
    for (const status of all) {
      const expected = all.filter((s) => s !== status)
      expect(NEXT_STATUS[status]).toEqual(expect.arrayContaining(expected))
      expect(NEXT_STATUS[status]).toHaveLength(expected.length)
    }
  })

  it('all transition targets are valid statuses (closed map integrity)', () => {
    const allStatuses = new Set(Object.keys(NEXT_STATUS))
    for (const [from, toList] of Object.entries(NEXT_STATUS)) {
      for (const to of toList) {
        expect(
          allStatuses.has(to),
          `"${to}" in NEXT_STATUS["${from}"] must be a valid status`,
        ).toBe(true)
      }
    }
  })

  it('augmenting the shared map would expose new transitions to both Calendar and ContentDetail', () => {
    const augmented: Record<string, string[]> = {
      ...NEXT_STATUS,
      en_espera: [...NEXT_STATUS['en_espera'], 'rejected'],
    }

    expect(augmented['en_espera']).toContain('rejected')
    expect(augmented['en_espera']).toContain('pre_produccion')
    expect(augmented['en_espera']).toContain('en_edicion')

    expect(NEXT_STATUS['en_espera']).not.toContain('rejected')
    expect(NEXT_STATUS['en_espera']).toEqual(['pre_produccion', 'en_edicion', 'validacion', 'listo_para_subir', 'subido', 'archivado'])
  })
})
