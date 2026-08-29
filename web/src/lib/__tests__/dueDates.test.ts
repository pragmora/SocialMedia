import { describe, it, expect } from 'vitest'
import { dueTone, daysUntil, DUE_SOON_DAYS, sortByDuePriority, localTodayStr } from '../dueDates'

function addDaysTo(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

describe('localTodayStr', () => {
  it('returns YYYY-MM-DD in local timezone', () => {
    const today = localTodayStr()
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    const now = new Date()
    expect(today).toBe(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
    )
  })
})

describe('daysUntil', () => {
  it('returns null for missing dates', () => {
    expect(daysUntil(null)).toBeNull()
    expect(daysUntil(undefined)).toBeNull()
    expect(daysUntil('')).toBeNull()
  })

  it('returns 0 for today', () => {
    expect(daysUntil(localTodayStr())).toBe(0)
  })

  it('is timezone-safe: computes whole days from date components', () => {
    const today = localTodayStr()
    expect(daysUntil(addDaysTo(today, 3))).toBe(3)
    expect(daysUntil(addDaysTo(today, -2))).toBe(-2)
  })
})

describe('dueTone', () => {
  const today = localTodayStr()

  it('completed items never produce a due alert', () => {
    expect(dueTone(addDaysTo(today, -10), true)).toBe('none')
    expect(dueTone(addDaysTo(today, 0), true)).toBe('none')
  })

  it('returns none when there is no date', () => {
    expect(dueTone(null)).toBe('none')
    expect(dueTone(undefined)).toBe('none')
  })

  it('classifies overdue, today and tomorrow', () => {
    expect(dueTone(addDaysTo(today, -1))).toBe('overdue')
    expect(dueTone(today)).toBe('today')
    expect(dueTone(addDaysTo(today, 1))).toBe('tomorrow')
  })

  it('classifies soon within the window and none beyond it', () => {
    expect(dueTone(addDaysTo(today, 2))).toBe('soon')
    expect(dueTone(addDaysTo(today, DUE_SOON_DAYS))).toBe('soon')
    expect(dueTone(addDaysTo(today, DUE_SOON_DAYS + 1))).toBe('none')
  })
})

describe('sortByDuePriority', () => {
  it('orders vencidos → hoy → mañana → próximos, then by due date', () => {
    const today = localTodayStr()
    const items = [
      { id: 'a', due_date: addDaysTo(today, 2) }, // soon
      { id: 'b', due_date: addDaysTo(today, 1) }, // tomorrow
      { id: 'c', due_date: today }, // today
      { id: 'd', due_date: addDaysTo(today, -3) }, // overdue
      { id: 'e', due_date: addDaysTo(today, 5) }, // soon
    ]
    expect(sortByDuePriority(items).map((i) => i.id)).toEqual(['d', 'c', 'b', 'a', 'e'])
  })

  it('is immutable', () => {
    const today = localTodayStr()
    const items = [{ id: 'x', due_date: addDaysTo(today, -1) }, { id: 'y', due_date: today }]
    const copy = [...items]
    sortByDuePriority(items)
    expect(items).toEqual(copy)
  })
})
