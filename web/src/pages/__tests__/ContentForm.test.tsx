import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithRouter } from '@/test/render'

// Mock apiClient BEFORE importing ContentForm
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

// Mock useParams to control edit/create mode
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useParams: vi.fn(() => ({})),
  }
})

import { useParams } from 'react-router-dom'
import ContentForm from '@/pages/ContentItems/ContentForm'

describe('ContentForm — fetching-state behavior preservation (lint hardening)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useParams).mockReturnValue({})
  })

  it('in create mode, fetching=false, form renders immediately, and clients preload fires', async () => {
    vi.mocked(useParams).mockReturnValue({})

    // Clients preload always fires; content item fetch only in edit mode.
    // Per-URL mock: /clients returns clients, /projects & /members get [].
    mockGet.mockImplementation((url: string) => {
      if (url === '/clients') return Promise.resolve({ data: [{ id: 'c1', name: 'Client A' }] })
      return Promise.resolve({ data: [] })
    })

    renderWithRouter(<ContentForm />)

    // Heading renders immediately in create mode (no Loading... shown)
    await waitFor(() => {
      expect(screen.getByText('Nuevo elemento')).toBeInTheDocument()
    })

    // Loading text must NOT appear in create mode
    expect(screen.queryByText('Cargando...')).not.toBeInTheDocument()

    // Clients preload API call must fire: GET /clients
    expect(mockGet).toHaveBeenCalledWith('/clients')

    // Form fields must be visible
    expect(screen.getByLabelText('Título')).toBeInTheDocument()
    expect(screen.getByLabelText('Descripción')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Crear elemento' })).toBeInTheDocument()
  })

  it('in edit mode, fetching starts as true, shows Loading..., then pre-fills form fields', async () => {
    vi.mocked(useParams).mockReturnValue({ id: 'content-456' })

    // Mock preloads (clients/projects/members) AND content item data by URL,
    // since the component fires 4 GETs in edit mode (preloads + item fetch)
    mockGet.mockImplementation((url: string) => {
      if (url === '/content-items/content-456') {
        return Promise.resolve({
          data: {
            title: 'Summer Campaign',
            description: 'A sunny campaign',
            platform: 'instagram',
            content_type: 'post',
            client_id: 'c1',
            scheduled_date: '2026-06-15',
          },
        })
      }
      if (url === '/clients') return Promise.resolve({ data: [{ id: 'c1', name: 'Client A' }] })
      return Promise.resolve({ data: [] })
    })

    renderWithRouter(<ContentForm />)

    // Loading... must show while fetching is true
    expect(screen.getByText('Cargando...')).toBeInTheDocument()

    // Both API calls must fire
    expect(mockGet).toHaveBeenCalledWith('/clients')
    expect(mockGet).toHaveBeenCalledWith('/content-items/content-456')

    // Wait for data to resolve and form to render
    await waitFor(() => {
      expect(screen.getByText('Editar elemento')).toBeInTheDocument()
    })

    // Title field must be pre-filled
    const titleInput = screen.getByLabelText('Título') as HTMLInputElement
    expect(titleInput.value).toBe('Summer Campaign')

    // Loading text must be gone
    expect(screen.queryByText('Cargando...')).not.toBeInTheDocument()
  })

  it('in create mode, clients preload still fires to populate client dropdown', async () => {
    vi.mocked(useParams).mockReturnValue({})

    // Per-URL mock: /clients returns the dropdown options; other preloads get []
    mockGet.mockImplementation((url: string) => {
      if (url === '/clients') {
        return Promise.resolve({
          data: [
            { id: 'c1', name: 'Client One' },
            { id: 'c2', name: 'Client Two' },
          ],
        })
      }
      return Promise.resolve({ data: [] })
    })

    renderWithRouter(<ContentForm />)

    // Wait for clients preload to resolve and dropdown to populate
    await waitFor(() => {
      expect(screen.getByText('Client One')).toBeInTheDocument()
    })

    expect(screen.getByText('Client Two')).toBeInTheDocument()

    // Verify clients preload fired but NO content item fetch happened (create mode)
    expect(mockGet).toHaveBeenCalledWith('/clients')
    expect(mockGet).not.toHaveBeenCalledWith(expect.stringContaining('/content-items/'))
  })

  it('in edit mode, shows error when content item API returns error', async () => {
    vi.mocked(useParams).mockReturnValue({ id: 'content-err' })

    mockGet.mockImplementation((url: string) => {
      if (url === '/content-items/content-err') {
        return Promise.resolve({
          error: { code: 'not_found', message: 'elemento de contenido no encontrado' },
        })
      }
      return Promise.resolve({ data: [] }) // preloads (clients/projects/members)
    })

    renderWithRouter(<ContentForm />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('elemento de contenido no encontrado')
    })
  })
})
