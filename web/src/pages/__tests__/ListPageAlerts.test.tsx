import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithRouter } from '@/test/render'

const mockGet = vi.fn()

vi.mock('@/lib/apiClient', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}))

import Dashboard from '@/pages/Dashboard/Dashboard'
import ClientList from '@/pages/Clients/ClientList'
import ContentList from '@/pages/ContentItems/ContentList'
import TaskList from '@/pages/Tasks/TaskList'

describe('Dashboard/ClientList/ContentList/TaskList alert semantics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the dashboard load failure as a Spanish alert', async () => {
    mockGet.mockResolvedValue({
      error: { code: 'server_error', message: 'No se pudo cargar el panel' },
    })

    renderWithRouter(<Dashboard />)

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('/dashboard')
    })

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar el panel')
  })

  it('renders the client list load failure as a Spanish alert', async () => {
    mockGet.mockResolvedValue({
      error: { code: 'server_error', message: 'No se pudieron cargar los clientes' },
    })

    renderWithRouter(<ClientList />)

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('/clients?all=true')
    })

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar los clientes')
  })

  it('renders the content list load failure as a Spanish alert', async () => {
    mockGet.mockResolvedValue({
      error: { code: 'server_error', message: 'No se pudo cargar el contenido' },
    })

    renderWithRouter(<ContentList />)

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('/content-items')
    })

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar el contenido')
  })

  it('renders the task list load failure as a Spanish alert', async () => {
    mockGet.mockResolvedValue({
      error: { code: 'server_error', message: 'No se pudieron cargar las tareas' },
    })

    renderWithRouter(<TaskList />)

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('/tasks')
    })

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar las tareas')
  })
})
