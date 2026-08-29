import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithRouter } from '@/test/render'

const mockGet = vi.fn()
const mockPost = vi.fn()
const mockPut = vi.fn()

vi.mock('@/lib/apiClient', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
  },
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useParams: vi.fn(() => ({})),
  }
})

import { useParams } from 'react-router-dom'
import FinanceForm from '@/pages/Finances/FinanceForm'

function mockCatalogsAndPayment(payment?: Record<string, unknown>) {
  mockGet.mockImplementation((url: string) => {
    if (url.startsWith('/payments')) return Promise.resolve({ data: payment })
    if (url === '/clients') return Promise.resolve({ data: [] })
    if (url === '/projects') return Promise.resolve({ data: [] })
    return Promise.resolve({ data: null })
  })
}

function getStatusSelect() {
  return screen.getByLabelText('Estado') as HTMLSelectElement
}

async function fillAmount(value: string) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Monto'), value)
  return user
}

describe('FinanceForm — regla de dominio Egreso => Cobrado', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useParams).mockReturnValue({})
    mockCatalogsAndPayment()
    mockPost.mockResolvedValue({ data: { id: 'p1' } })
    mockPut.mockResolvedValue({ data: { id: 'p1' } })
  })

  it('al seleccionar Egreso establece el estado en Pagado', async () => {
    const user = userEvent.setup()
    renderWithRouter(<FinanceForm />)

    await user.click(screen.getByRole('button', { name: /Egreso/ }))

    const statusSelect = getStatusSelect()
    expect(statusSelect.value).toBe('paid')
    // El campo visible muestra la etiqueta contextual del egreso
    expect((screen.getByRole('option', { name: 'Pagado' }) as HTMLOptionElement).selected).toBe(true)
  })

  it('al seleccionar Egreso deshabilita el selector y no permite elegir Pendiente', async () => {
    const user = userEvent.setup()
    renderWithRouter(<FinanceForm />)

    await user.click(screen.getByRole('button', { name: /Egreso/ }))

    const statusSelect = getStatusSelect()
    expect(statusSelect).toBeDisabled()
    // El campo sigue visible mostrando Pagado
    expect(statusSelect).toBeInTheDocument()
    expect((screen.queryByRole('option', { name: 'Pendiente' }) as HTMLOptionElement | null)?.selected ?? false).toBe(false)
  })

  it('al volver de Egreso a Pago rehabilita el selector con un estado consistente', async () => {
    const user = userEvent.setup()
    renderWithRouter(<FinanceForm />)

    await user.click(screen.getByRole('button', { name: /Egreso/ }))
    await user.click(screen.getByRole('button', { name: /Pago/ }))

    const statusSelect = getStatusSelect()
    expect(statusSelect).toBeEnabled()
    expect(statusSelect.value).toBe('pending')
  })

  it('un pago permite elegir su estado normalmente', async () => {
    const user = userEvent.setup()
    renderWithRouter(<FinanceForm />)

    const statusSelect = getStatusSelect()
    expect(statusSelect).toBeEnabled()
    await user.selectOptions(statusSelect, 'paid')
    expect(statusSelect.value).toBe('paid')
  })

  it('no permite enviar un egreso con un estado distinto de Cobrado', async () => {
    renderWithRouter(<FinanceForm />)
    const user = await fillAmount('5000')
    await user.click(screen.getByRole('button', { name: /Egreso/ }))
    await user.click(screen.getByRole('button', { name: 'Registrar egreso' }))

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalled()
    })
    expect(mockPost).toHaveBeenCalledWith(
      '/payments',
      expect.objectContaining({ is_spent: true, status: 'paid' }),
    )
  })

  it('edita un egreso mostrando Pagado deshabilitado y lo envía cobrado', async () => {
    vi.mocked(useParams).mockReturnValue({ id: 'legacy-1' })
    mockCatalogsAndPayment({
      amount: 10000,
      payment_date: '2026-08-24',
      payment_method: 'efectivo',
      status: 'pending',
      notes: '',
      client_id: null,
      project_id: null,
      is_spent: true,
    })

    renderWithRouter(<FinanceForm />)

    await waitFor(() => {
      expect(getStatusSelect().value).toBe('paid')
    })
    expect(getStatusSelect()).toBeDisabled()
    // Histórico con status pending se presenta como Pagado
    expect((screen.getByRole('option', { name: 'Pagado' }) as HTMLOptionElement).selected).toBe(true)

    await fillAmount('1')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith(
        '/payments/legacy-1',
        expect.objectContaining({ is_spent: true, status: 'paid' }),
      )
    })
  })
})
