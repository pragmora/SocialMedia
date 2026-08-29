import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithRouter } from '@/test/render'
import { formatCurrency } from '@/lib/utils'

const mockGet = vi.fn()

vi.mock('@/lib/apiClient', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

import FinanceList from '@/pages/Finances/FinanceList'

interface Row {
  id: string
  client_id: string | null
  client_name: string | null
  project_id: string | null
  project_name: string | null
  amount: number
  payment_date: string
  payment_method: string
  status: string
  notes: string
  is_spent: boolean
}

function row(overrides: Partial<Row>): Row {
  return {
    id: overrides.id ?? 'r',
    client_id: null,
    client_name: null,
    project_id: null,
    project_name: null,
    amount: 0,
    payment_date: '2026-08-24',
    payment_method: 'efectivo',
    status: 'pending',
    notes: '',
    is_spent: false,
    ...overrides,
  }
}

const ROWS: Row[] = [
  row({ id: 'pago-pendiente', amount: 1000, status: 'pending', is_spent: false, client_name: 'Acme' }),
  row({ id: 'pago-pagado', amount: 2000, status: 'paid', is_spent: false, client_name: 'Beta' }),
  row({ id: 'egreso-pagado', amount: 500, status: 'paid', is_spent: true }),
  // Registro histórico inconsistente: la app debe mostrarlo sin romperse
  row({ id: 'egreso-historico', amount: 300, status: 'pending', is_spent: true }),
]

describe('FinanceList — presentación contextual de estados y métricas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockImplementation((url: string) => {
      if (url.startsWith('/payments')) return Promise.resolve({ data: ROWS })
      if (url === '/clients') return Promise.resolve({ data: [] })
      if (url === '/projects') return Promise.resolve({ data: [] })
      return Promise.resolve({ data: null })
    })
  })

  /**
   * Matcher por igualdad exacta de textContent: evita problemas del
   * normalizador de RTL con espacios invisibles (NBSP) del formateo es-AR.
   */
  function findAmounts(value: number) {
    const expected = formatCurrency(value)
    return screen.getAllByText((_, element) => element?.textContent === expected)
  }

  it('Pago + pending se muestra como Pendiente', async () => {
    renderWithRouter(<FinanceList />)
    // Cada fila se renderiza en la tabla desktop y en las tarjetas móviles
    await screen.findAllByText('Pendiente')
    expect(screen.getAllByText('Pendiente')).toHaveLength(2)
  })

  it('Pago + paid se muestra como Cobrado', async () => {
    renderWithRouter(<FinanceList />)
    await screen.findAllByText('Cobrado')
    expect(screen.getAllByText('Cobrado')).toHaveLength(2)
  })

  it('Egreso + paid se muestra como Pagado, nunca como Cobrado', async () => {
    renderWithRouter(<FinanceList />)
    await screen.findAllByText('Pagado')
    expect(screen.getAllByText('Pagado')).toHaveLength(2)
  })

  it('egreso histórico con status pending no rompe y se muestra como Pagado', async () => {
    renderWithRouter(<FinanceList />)
    await screen.findAllByText('Pagado')
    // Solo hay dos filas egreso y ambas se presentan como Pagado
    expect(screen.getAllByText('Pagado')).toHaveLength(2)
  })

  it('métricas calculadas sobre datos existentes sin asumir estado de egresos', async () => {
    renderWithRouter(<FinanceList />)
    await screen.findByText('Ingresos')

    // Ingresos = is_spent=false → 1000 + 2000
    expect(findAmounts(3000).length).toBeGreaterThan(0)
    // Egresos = is_spent=true, sin mirar status (incluye el histórico) → 500 + 300
    expect(findAmounts(800).length).toBeGreaterThan(0)
    // Total cobrado = ingreso + paid → 2000
    expect(findAmounts(2000).length).toBeGreaterThan(0)
    // Total pendiente = ingreso + pending → 1000
    expect(findAmounts(1000).length).toBeGreaterThan(0)
    // Balance del período → 3000 - 800
    expect(findAmounts(2200).length).toBeGreaterThan(0)
  })
})
