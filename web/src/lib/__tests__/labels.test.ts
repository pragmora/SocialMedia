import { describe, it, expect } from 'vitest'
import { getMovementStatusLabel } from '@/lib/labels'

/**
 * Matriz de presentación contextual del estado de movimientos.
 * El valor persistido `paid` es polisémico y se resuelve con `is_spent`:
 *
 *   Pago   + pending → Pendiente
 *   Pago   + paid    → Cobrado
 *   Egreso + paid    → Pagado
 */
describe('getMovementStatusLabel — semántica contextual de estados', () => {
  it('pago pendiente se muestra como Pendiente', () => {
    expect(getMovementStatusLabel('pending', false)).toBe('Pendiente')
  })

  it('pago cobrado se muestra como Cobrado', () => {
    expect(getMovementStatusLabel('paid', false)).toBe('Cobrado')
  })

  it('egreso pagado se muestra como Pagado (no Cobrado)', () => {
    expect(getMovementStatusLabel('paid', true)).toBe('Pagado')
  })

  it('egreso histórico con status pending no rompe y se muestra como Pagado', () => {
    expect(getMovementStatusLabel('pending', true)).toBe('Pagado')
  })

  it('estado desconocido en un pago devuelve el valor crudo sin explotar', () => {
    expect(getMovementStatusLabel('unknown', false)).toBe('unknown')
  })
})
