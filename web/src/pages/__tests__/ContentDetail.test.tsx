import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { renderWithRouter } from '@/test/render'

// Mock apiClient BEFORE importing ContentDetail
const mockGet = vi.fn()
const mockPost = vi.fn()
const mockDelete = vi.fn()
const mockPatch = vi.fn()

vi.mock('@/lib/apiClient', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
  },
}))

// Mock useParams to provide the content item id
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useParams: vi.fn(() => ({})),
  }
})

import { useParams } from 'react-router-dom'
import ContentDetail from '@/pages/ContentItems/ContentDetail'

describe('ContentDetail — navigation/import behavior preservation (lint hardening)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useParams).mockReturnValue({ id: 'item-001' })
  })

  it('shows Loading... on mount before data resolves', async () => {
    // Never-resolving promise to keep loading state
    mockGet.mockReturnValue(new Promise(() => {}))

    renderWithRouter(<ContentDetail />)

    expect(await screen.findByText('Cargando...')).toBeInTheDocument()
  })

  it('calls GET /content-items/:id on mount with the correct id from useParams', async () => {
    mockGet.mockResolvedValue({
      data: {
        id: 'item-001',
        workspace_id: 'ws1',
        client_id: null,
        title: 'Test Post',
        description: 'A test post description',
        platform: 'instagram',
        content_type: 'post',
        status: 'draft',
        scheduled_date: null,
        created_by: 'user1',
        created_at: '2026-05-01T00:00:00Z',
        updated_at: '2026-05-01T00:00:00Z',
        comments: [],
      },
    })

    renderWithRouter(<ContentDetail />)

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('/content-items/item-001')
    })
  })

  it('renders breadcrumb link to content items list with correct href', async () => {
    mockGet.mockResolvedValue({
      data: {
        id: 'item-001',
        workspace_id: 'ws1',
        client_id: null,
        title: 'Test Post',
        description: '',
        platform: 'instagram',
        content_type: 'post',
        status: 'draft',
        scheduled_date: null,
        created_by: 'user1',
        created_at: '2026-05-01T00:00:00Z',
        updated_at: '2026-05-01T00:00:00Z',
        comments: [],
      },
    })

    renderWithRouter(<ContentDetail />)

    await waitFor(() => {
      expect(screen.getByText('Test Post')).toBeInTheDocument()
    })

    // Breadcrumb link must have correct text and href
    const breadcrumb = screen.getByText('← Elementos de contenido')
    expect(breadcrumb).toBeInTheDocument()
    expect(breadcrumb.closest('a')).toHaveAttribute('href', '/dashboard/content-items')
  })

  it('renders Edit link with correct href pointing to edit route', async () => {
    mockGet.mockResolvedValue({
      data: {
        id: 'item-001',
        workspace_id: 'ws1',
        client_id: null,
        title: 'Editable Post',
        description: '',
        platform: 'twitter',
        content_type: 'post',
        status: 'draft',
        scheduled_date: null,
        created_by: 'user1',
        created_at: '2026-05-01T00:00:00Z',
        updated_at: '2026-05-01T00:00:00Z',
        comments: [],
      },
    })

    renderWithRouter(<ContentDetail />)

    await waitFor(() => {
      expect(screen.getByText('Editable Post')).toBeInTheDocument()
    })

    const editLink = screen.getByText('Editar')
    expect(editLink).toBeInTheDocument()
    expect(editLink.closest('a')).toHaveAttribute('href', '/dashboard/content-items/item-001/edit')
  })

  it('renders status transition buttons for draft status', async () => {
    mockGet.mockResolvedValue({
      data: {
        id: 'item-001',
        workspace_id: 'ws1',
        client_id: null,
        title: 'Draft Post',
        description: '',
        platform: 'instagram',
        content_type: 'post',
        status: 'pre_produccion',
        scheduled_date: null,
        created_by: 'user1',
        created_at: '2026-05-01T00:00:00Z',
        updated_at: '2026-05-01T00:00:00Z',
        // comments field intentionally OMITTED
      },
    })

    renderWithRouter(<ContentDetail />)

    await waitFor(() => {
      expect(screen.getByText('Draft Post')).toBeInTheDocument()
    })

    // pre_produccion → En Espera transition must be available
    expect(screen.getByRole('button', { name: 'En Espera' })).toBeInTheDocument()
  })

  it('renders status transition buttons for en_espera status (en_edicion + validacion)', async () => {
    mockGet.mockResolvedValue({
      data: {
        id: 'item-001',
        workspace_id: 'ws1',
        client_id: null,
        title: 'Review Post',
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
      expect(screen.getByText('Review Post')).toBeInTheDocument()
    })

    // en_espera → En Edición and Validación transitions must be available
    expect(screen.getByRole('button', { name: 'En Edición' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Validación' })).toBeInTheDocument()
  })

  it('renders status transition buttons for subido status (archivado included)', async () => {
    mockGet.mockResolvedValue({
      data: {
        id: 'item-001',
        workspace_id: 'ws1',
        client_id: null,
        title: 'Approved Post',
        description: '',
        platform: 'instagram',
        content_type: 'post',
        status: 'subido',
        scheduled_date: null,
        created_by: 'user1',
        created_at: '2026-05-01T00:00:00Z',
        updated_at: '2026-05-01T00:00:00Z',
        comments: [],
      },
    })

    renderWithRouter(<ContentDetail />)

    await waitFor(() => {
      expect(screen.getByText('Approved Post')).toBeInTheDocument()
    })

    // subido → Archivado transition must be available
    expect(screen.getByRole('button', { name: 'Archivado' })).toBeInTheDocument()
  })

  it('renders transition buttons for an archivado item (shared map allows recovery)', async () => {
    mockGet.mockResolvedValue({
      data: {
        id: 'item-001',
        workspace_id: 'ws1',
        client_id: null,
        title: 'Archived Post',
        description: '',
        platform: 'instagram',
        content_type: 'post',
        status: 'archivado',
        scheduled_date: null,
        created_by: 'user1',
        created_at: '2026-05-01T00:00:00Z',
        updated_at: '2026-05-01T00:00:00Z',
        comments: [],
      },
    })

    renderWithRouter(<ContentDetail />)

    await waitFor(() => {
      expect(screen.getByText('Archived Post')).toBeInTheDocument()
    })

    // archivado can transition back to other statuses (e.g. En Espera)
    expect(screen.getByRole('button', { name: 'En Espera' })).toBeInTheDocument()
  })

  it('shows error and back link when API returns an error', async () => {
    mockGet.mockResolvedValue({
      error: { code: 'not_found', message: 'elemento de contenido no encontrado' },
    })

    renderWithRouter(<ContentDetail />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('elemento de contenido no encontrado')
    })

    // Back link must be present when item not found
    const backLink = screen.getByText('← Volver a la lista')
    expect(backLink).toBeInTheDocument()
    expect(backLink.closest('a')).toHaveAttribute('href', '/dashboard/content-items')
  })

  it('renders item status badge with correct status text', async () => {
    mockGet.mockResolvedValue({
      data: {
        id: 'item-001',
        workspace_id: 'ws1',
        client_id: null,
        title: 'Published Post',
        description: '',
        platform: 'facebook',
        content_type: 'post',
        status: 'subido',
        scheduled_date: null,
        created_by: 'user1',
        created_at: '2026-05-01T00:00:00Z',
        updated_at: '2026-05-01T00:00:00Z',
        comments: [],
      },
    })

    renderWithRouter(<ContentDetail />)

    await waitFor(() => {
      expect(screen.getByText('Published Post')).toBeInTheDocument()
    })

    // Status badge shows 'Subido'
    expect(screen.getByText('Subido')).toBeInTheDocument()
  })

  it('renders comments count in the header', async () => {
    mockGet.mockResolvedValue({
      data: {
        id: 'item-001',
        workspace_id: 'ws1',
        client_id: null,
        title: 'Post With Comments',
        description: '',
        platform: 'linkedin',
        content_type: 'post',
        status: 'review',
        scheduled_date: null,
        created_by: 'user1',
        created_at: '2026-05-01T00:00:00Z',
        updated_at: '2026-05-01T00:00:00Z',
        comments: [
          {
            id: 'cmt1',
            content_item_id: 'item-001',
            author_id: 'u1',
            body: 'Looks good!',
            created_at: '2026-05-02T00:00:00Z',
          },
          {
            id: 'cmt2',
            content_item_id: 'item-001',
            author_id: 'u2',
            body: 'Approved.',
            created_at: '2026-05-02T01:00:00Z',
          },
        ],
      },
    })

    renderWithRouter(<ContentDetail />)

    await waitFor(() => {
      expect(screen.getByText('Post With Comments')).toBeInTheDocument()
    })

    // Comments count must show 2
    expect(screen.getByText('Comentarios (2)')).toBeInTheDocument()
  })

  // ── RED Phase: Comments absent from initial payload ──────────
  it('handleAddComment: coalesces prev.comments to [] when comments absent from API response', async () => {
    // Item WITHOUT comments field (simulating backend not yet fixed)
    mockGet.mockResolvedValue({
      data: {
        id: 'item-001',
        workspace_id: 'ws1',
        client_id: null,
        title: 'No Comments Yet',
        description: '',
        platform: 'instagram',
        content_type: 'post',
        status: 'draft',
        scheduled_date: null,
        created_by: 'user1',
        created_at: '2026-05-01T00:00:00Z',
        updated_at: '2026-05-01T00:00:00Z',
        // comments field intentionally OMITTED
      },
    })

    mockPost.mockResolvedValue({
      data: {
        id: 'cm-new',
        content_item_id: 'item-001',
        author_id: 'user-1',
        body: 'My first comment',
        created_at: '2026-05-03T00:00:00Z',
      },
    })

    renderWithRouter(<ContentDetail />)

    // Wait for item to load
    await waitFor(() => {
      expect(screen.getByText('No Comments Yet')).toBeInTheDocument()
    })

    // Should show 0 comments (comments field absent → ?? 0)
    expect(screen.getByText('Comentarios (0)')).toBeInTheDocument()

    // Fill in comment form
    const textarea = screen.getByPlaceholderText('Escribí un comentario...')
    fireEvent.change(textarea, { target: { value: 'My first comment' } })

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /agregar comentario/i })
    fireEvent.click(submitButton)

    // Wait for the new comment to appear — proves no TypeError was thrown
    await waitFor(() => {
      expect(screen.getByText('My first comment')).toBeInTheDocument()
    })

    // Comment count should update to 1
    expect(screen.getByText('Comentarios (1)')).toBeInTheDocument()
  })

  it('handleDeleteComment: deletes from initially populated comments array (isolated, no add-before-delete)', async () => {
    // This test isolates the delete-with-populated-comments flow:
    // the item loads WITH comments, user deletes one, and the UI
    // updates correctly WITHOUT relying on add-then-delete sequence.
    mockGet.mockResolvedValue({
      data: {
        id: 'item-001',
        workspace_id: 'ws1',
        client_id: null,
        title: 'Already Has Comments',
        description: '',
        platform: 'instagram',
        content_type: 'post',
        status: 'pre_produccion',
        scheduled_date: null,
        created_by: 'user1',
        created_at: '2026-05-01T00:00:00Z',
        updated_at: '2026-05-01T00:00:00Z',
        comments: [
          {
            id: 'cm-preexist-1',
            content_item_id: 'item-001',
            author_id: 'u1',
            body: 'First existing comment',
            created_at: '2026-05-02T00:00:00Z',
          },
          {
            id: 'cm-preexist-2',
            content_item_id: 'item-001',
            author_id: 'u2',
            body: 'Second existing comment',
            created_at: '2026-05-02T01:00:00Z',
          },
        ],
      },
    })

    // Mock delete for the first comment
    mockDelete.mockResolvedValue({ data: undefined }) // 204 No Content

    renderWithRouter(<ContentDetail />)

    // Wait for item to load with comments
    await waitFor(() => {
      expect(screen.getByText('Already Has Comments')).toBeInTheDocument()
    })

    // Both comments must be visible initially
    expect(screen.getByText('First existing comment')).toBeInTheDocument()
    expect(screen.getByText('Second existing comment')).toBeInTheDocument()

    // Comment count must show 2
    expect(screen.getByText('Comentarios (2)')).toBeInTheDocument()

    // Click Delete on the first comment.
    // There are 3 Delete buttons: the item header one + 2 comment ones.
    // Comment buttons come after the header button in DOM order → index 1.
    const deleteButtons = screen.getAllByRole('button', { name: 'Eliminar' })
    expect(deleteButtons).toHaveLength(3)
    fireEvent.click(deleteButtons[1])

    // Confirm in the ConfirmDialog
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))

    // After deletion:
    // - First comment removed
    // - Second comment still visible
    // - Count updated to 1
    // - No TypeError thrown (component still renders)
    await waitFor(() => {
      expect(screen.queryByText('First existing comment')).not.toBeInTheDocument()
    })

    expect(screen.getByText('Second existing comment')).toBeInTheDocument()
    expect(screen.getByText('Comentarios (1)')).toBeInTheDocument()

    // Verify apiClient.delete was called with the correct comment ID
    expect(mockDelete).toHaveBeenCalledWith('/comments/cm-preexist-1')
  })

  it('handleDeleteComment: coalesces prev.comments to [] when comments absent and deleting', async () => {
    // First, set up the item WITHOUT comments
    mockGet.mockResolvedValue({
      data: {
        id: 'item-001',
        workspace_id: 'ws1',
        client_id: null,
        title: 'Deletable Item',
        description: '',
        platform: 'instagram',
        content_type: 'post',
        status: 'draft',
        scheduled_date: null,
        created_by: 'user1',
        created_at: '2026-05-01T00:00:00Z',
        updated_at: '2026-05-01T00:00:00Z',
        // comments field intentionally OMITTED
      },
    })

    // Mock post for add comment
    mockPost.mockResolvedValue({
      data: {
        id: 'cm-to-delete',
        content_item_id: 'item-001',
        author_id: 'user-1',
        body: 'Comment to delete',
        created_at: '2026-05-03T00:00:00Z',
      },
    })

    // Mock delete for comment deletion
    mockDelete.mockResolvedValue({ data: undefined }) // 204 No Content

    renderWithRouter(<ContentDetail />)

    await waitFor(() => {
      expect(screen.getByText('Deletable Item')).toBeInTheDocument()
    })

    // First, add a comment so there's something to delete
    const textarea = screen.getByPlaceholderText('Escribí un comentario...')
    fireEvent.change(textarea, { target: { value: 'Comment to delete' } })
    fireEvent.click(screen.getByRole('button', { name: /agregar comentario/i }))

    // Wait for the comment to appear
    await waitFor(() => {
      expect(screen.getByText('Comment to delete')).toBeInTheDocument()
    })

    // Now delete it — clicking Delete button.
    // There are 2 Delete buttons now: the item header one + the comment one.
    // The comment button comes after the header button in DOM order → index 1.
    const deleteButton = screen.getAllByRole('button', { name: 'Eliminar' })[1]
    fireEvent.click(deleteButton)

    // Confirm in the ConfirmDialog
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))

    // After deletion, the comment should disappear (back to "No comments yet.")
    // The key assertion: no TypeError thrown, component still renders
    await waitFor(() => {
      expect(screen.getByText('Sin comentarios aún.')).toBeInTheDocument()
    })

    // Comment count back to 0
    expect(screen.getByText('Comentarios (0)')).toBeInTheDocument()
  })
})
