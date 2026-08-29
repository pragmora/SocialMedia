import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithRouter } from '@/test/render'

// ── Shared mocks for apiClient ─────────────────────────────────────
const mockGet = vi.fn()
const mockPatch = vi.fn()

vi.mock('@/lib/apiClient', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
  },
}))

// ── Mock react-router-dom (only override useParams) ────────────────
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useParams: vi.fn(() => ({})),
  }
})

// ── THE KEY: mock the shared NEXT_STATUS map (8 canonical statuses) ─
// Both Calendar and ContentDetail import from @/lib/statusTransitions,
// so this ONE mock propagates to both. 'en_pausa' is an extra transition
// target added ONLY here to prove both consumers read from this shared map.
vi.mock('@/lib/statusTransitions', () => {
  const ALL = ['pre_produccion', 'en_espera', 'en_edicion', 'validacion', 'listo_para_subir', 'subido', 'archivado']
  const NEXT_STATUS: Record<string, string[]> = {}
  for (const s of ALL) NEXT_STATUS[s] = [...ALL.filter((t) => t !== s), 'en_pausa']
  return { NEXT_STATUS }
})

import Calendar from '@/pages/Calendar/Calendar'
import ContentDetail from '@/pages/ContentItems/ContentDetail'
import { useParams } from 'react-router-dom'

const dateStr = '2026-05-15'
const monthStr = '2026-05'

// Helper: route /projects, /clients, /members to [] and everything else (calendar query) to the payload
function mockApi(calendarData: unknown) {
  mockGet.mockImplementation((url: string) => {
    if (url.startsWith('/projects') || url.startsWith('/clients') || url.startsWith('/members')) {
      return Promise.resolve({ data: [] })
    }
    return Promise.resolve(calendarData)
  })
}

// ── Shared NEXT_STATUS propagation — Calendar ───────────────────────
describe('Shared NEXT_STATUS propagation — Calendar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useParams).mockReturnValue({})
  })

  it('renders a transition added to the shared map for a pre_produccion sidebar item', async () => {
    mockApi({
      data: {
        items: [
          {
            id: 'ci-r1',
            title: 'Review Item',
            platform: 'instagram',
            content_type: 'post',
            status: 'pre_produccion',
            scheduled_date: dateStr,
          },
        ],
        counts_by_day: { [dateStr]: 1 },
      },
    })

    renderWithRouter(<Calendar />, {
      initialEntries: [{ pathname: '/', search: `?month=${monthStr}&day=${dateStr}` }],
    })

    await waitFor(() => {
      expect(screen.queryAllByTestId('skeleton-cell')).toHaveLength(0)
    })

    // Canonical transition derived from the shared map
    expect(screen.getByRole('button', { name: 'Mover a En Espera' })).toBeInTheDocument()

    // Augmented transition from the shared map (raw status label fallback)
    expect(screen.getByRole('button', { name: 'Mover a en_pausa' })).toBeInTheDocument()
  })
})

// ── Shared NEXT_STATUS propagation — ContentDetail ──────────────────
describe('Shared NEXT_STATUS propagation — ContentDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useParams).mockReturnValue({ id: 'ci-r1' })
  })

  it('renders a transition added to the shared map for an en_espera item', async () => {
    mockGet.mockResolvedValue({
      data: {
        id: 'ci-r1',
        workspace_id: 'ws1',
        client_id: null,
        title: 'Review Item',
        description: '',
        platform: 'instagram',
        content_type: 'post',
        status: 'en_espera',
        scheduled_date: null,
        created_by: 'user1',
        created_at: '2026-05-01T00:00:00Z',
        updated_at: '2026-05-01T00:00:00Z',
        comments: [],
      },
    })

    renderWithRouter(<ContentDetail />)

    await waitFor(() => {
      expect(screen.getByText('Review Item')).toBeInTheDocument()
    })

    // Canonical transitions derived from the shared map
    expect(screen.getByRole('button', { name: 'En Edición' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Validación' })).toBeInTheDocument()

    // Augmented transition from the shared map — ContentDetail buttons
    // use text content as accessible name (no aria-label), so fallback is raw 'en_pausa'
    expect(screen.getByRole('button', { name: 'en_pausa' })).toBeInTheDocument()
  })
})
