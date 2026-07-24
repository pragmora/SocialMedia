import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '@/lib/apiClient'
import { getContentTypeLabel, getPlatformLabel, getStatusLabel } from '@/lib/labels'
import { NEXT_STATUS } from '@/lib/statusTransitions'
import ConfirmDialog from '@/components/ConfirmDialog'

interface ContentItem {
  id: string
  workspace_id: string
  client_id: string | null
  title: string
  description: string
  platform: string
  content_type: string
  status: string
  scheduled_date: string | null
  fecha_inicial: string | null
  fecha_final: string | null
  assignee_id: string | null
  created_by: string
  created_at: string
  updated_at: string
  comments: Comment[]
}

interface Comment {
  id: string
  content_item_id: string
  author_id: string
  body: string
  created_at: string
  author_name?: string
  author_email?: string
}

interface TaskItem {
  id: string
  content_item_id: string
  title: string
  description: string | null
  done: boolean
  due_date: string | null
  created_at: string
}

interface WorkspaceMember {
  user_id: string
  user: { id: string; email: string; name: string }
}

const STATUS_COLORS: Record<string, string> = {
  pre_produccion: 'bg-gray-100 text-gray-700',
  en_espera: 'bg-yellow-100 text-yellow-800',
  en_edicion: 'bg-blue-100 text-blue-800',
  validacion: 'bg-purple-100 text-purple-800',
  listo_para_subir: 'bg-indigo-100 text-indigo-800',
  subido: 'bg-green-100 text-green-800',
  archivado: 'bg-red-100 text-red-800',
}

export default function ContentDetail() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [item, setItem] = useState<ContentItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [commentBody, setCommentBody] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [transitioning, setTransitioning] = useState(false)

  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [tasksLoading, setTasksLoading] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [creatingTask, setCreatingTask] = useState(false)
  const [membersList, setMembersList] = useState<WorkspaceMember[]>([])
  const [assigning, setAssigning] = useState(false)
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null)
  const [deleteItemId, setDeleteItemId] = useState(false)

  const loadItem = useCallback(async () => {
    setLoading(true)
    setError('')
    const res = await apiClient.get<ContentItem>(`/content-items/${id}`)
    if (res.error) {
      setError(res.error.message)
    } else {
      setItem(res.data ?? null)
    }
    setLoading(false)
  }, [id])

  const loadTasks = useCallback(async () => {
    if (!id) return
    setTasksLoading(true)
    const res = await apiClient.get<TaskItem[]>(`/content-items/${id}/tasks`)
    if (res.data) setTasks(res.data)
    setTasksLoading(false)
  }, [id])

  useEffect(() => {
    loadItem()
    loadTasks()
    apiClient.get<WorkspaceMember[]>('/members').then((res) => {
      if (res.data) {
        setMembersList(res.data)
      }
    })
  }, [loadItem, loadTasks])

  async function handleQuickAssign(assigneeId: string) {
    setAssigning(true)
    const res = await apiClient.patch<ContentItem>(`/content-items/${id}/assign`, { assignee_id: assigneeId || null })
    if (res.data) {
      setItem((prev) => (prev ? { ...prev, assignee_id: res.data!.assignee_id } : prev))
    } else if (res.error) {
      setError(res.error.message)
    }
    setAssigning(false)
  }

  async function handleTransition(newStatus: string) {
    setTransitioning(true)
    const res = await apiClient.patch<ContentItem>(`/content-items/${id}/status`, { status: newStatus })
    if (res.error) {
      setError(res.error.message)
    } else if (res.data) {
      setItem((prev) => (prev ? { ...prev, status: res.data!.status, updated_at: res.data!.updated_at } : prev))
      setError('')
    }
    setTransitioning(false)
  }

  async function handleAddComment(e: FormEvent) {
    e.preventDefault()
    if (!commentBody.trim()) return
    setSubmittingComment(true)
    const res = await apiClient.post<Comment>(`/content-items/${id}/comments`, { body: commentBody })
    if (res.error) {
      setError(res.error.message)
    } else if (res.data) {
      setItem((prev) =>
        prev ? { ...prev, comments: [...(prev.comments ?? []), res.data!] } : prev,
      )
      setCommentBody('')
      setError('')
    }
    setSubmittingComment(false)
  }

  async function handleDeleteComment(commentId: string) {
    setDeleteCommentId(null)
    const res = await apiClient.delete(`/comments/${commentId}`)
    if (res.error) {
      setError(res.error.message)
      return
    }
    setItem((prev) =>
      prev ? { ...prev, comments: (prev.comments ?? []).filter((c) => c.id !== commentId) } : prev,
    )
  }

  async function handleDeleteItem() {
    setDeleteItemId(false)
    if (!id) return
    const res = await apiClient.delete(`/content-items/${id}`)
    if (res.error) {
      setError(res.error.message)
      return
    }
    navigate('/dashboard/content-items')
  }

  async function handleCreateTask(e: FormEvent) {
    e.preventDefault()
    if (!newTaskTitle.trim() || !id) return
    setCreatingTask(true)
    const res = await apiClient.post<TaskItem>(`/content-items/${id}/tasks`, { title: newTaskTitle })
    if (res.data) {
      setTasks((prev) => [...prev, res.data!])
      setNewTaskTitle('')
    } else if (res.error) {
      setError(res.error.message)
    }
    setCreatingTask(false)
  }

  async function handleToggleTask(task: TaskItem) {
    const res = await apiClient.put<TaskItem>(`/tasks/${task.id}`, {
      title: task.title,
      description: task.description,
      done: !task.done,
      due_date: task.due_date,
    })
    if (res.data) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? res.data! : t)))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-socialflow-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!item) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error || t('content.notFound')}</div>
        <Link to="/dashboard/content-items" className="text-socialflow-600 hover:underline text-sm mt-3 inline-block">
          {t('content.backToList')}
        </Link>
      </div>
    )
  }

  const allowedTransitions = NEXT_STATUS[item.status] ?? []

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="mb-5">
        <Link to="/dashboard/content-items" className="text-sm text-socialflow-600 hover:text-socialflow-700 font-medium inline-flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          {t('content.backToContentItems')}
        </Link>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700 mb-5 animate-scale-in">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 md:p-7 mb-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-5">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight">{item.title}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2.5">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[item.status] ?? ''}`}>
                {getStatusLabel(item.status)}
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-slate-500">{getPlatformLabel(item.platform)}</span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-slate-500">{getContentTypeLabel(item.content_type)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start shrink-0">
            <Link
              to={`/dashboard/content-items/${item.id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              {t('content.edit')}
            </Link>
            <button
              onClick={() => setDeleteItemId(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:border-red-300 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              {t('content.delete')}
            </button>
          </div>
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {item.scheduled_date && (
            <div className="rounded-xl bg-slate-50 px-3.5 py-2.5">
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{t('content.scheduled')}</p>
              <p className="text-sm font-medium text-slate-800 mt-0.5">{item.scheduled_date}</p>
            </div>
          )}
          {item.fecha_inicial && (
            <div className="rounded-xl bg-slate-50 px-3.5 py-2.5">
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{t('content.startDate')}</p>
              <p className="text-sm font-medium text-slate-800 mt-0.5">{item.fecha_inicial}</p>
            </div>
          )}
          {item.fecha_final && (
            <div className="rounded-xl bg-slate-50 px-3.5 py-2.5">
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{t('content.endDate')}</p>
              <p className="text-sm font-medium text-slate-800 mt-0.5">{item.fecha_final}</p>
            </div>
          )}
          <div className="rounded-xl bg-slate-50 px-3.5 py-2.5 min-w-0">
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{t('content.form.assignee')}</p>
            <select
              value={item.assignee_id ?? ''}
              onChange={(e) => handleQuickAssign(e.target.value)}
              disabled={assigning}
              className="w-full mt-0.5 rounded-lg border border-slate-200 px-2 py-1 text-sm bg-white focus:border-socialflow-500 focus:outline-none focus:ring-1 focus:ring-socialflow-500 disabled:opacity-50 truncate"
            >
              <option value="">{t('content.unassigned')}</option>
              {membersList.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.user.name || m.user.email}
                </option>
              ))}
            </select>
          </div>
        </div>

        {item.description && (
          <div className="mt-4 text-sm text-slate-600 whitespace-pre-wrap leading-relaxed bg-slate-50 rounded-xl px-4 py-3.5 border border-slate-100/60">
            {item.description}
          </div>
        )}

        {allowedTransitions.length > 0 && (
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2.5">{t('content.moveTo')}</p>
            <div className="flex flex-wrap gap-2">
              {allowedTransitions.map((next) => (
                <button
                  key={next}
                  onClick={() => handleTransition(next)}
                  disabled={transitioning}
                  className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50 active:scale-[0.97]"
                >
                  {getStatusLabel(next)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tasks section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 md:p-7 mb-5 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-4">
          {t('content.tasksCount', { count: tasks.length })}
        </h3>

        <form onSubmit={handleCreateTask} className="flex gap-2 mb-5">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder={t('content.taskTitle')}
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-socialflow-500 focus:outline-none focus:ring-1 focus:ring-socialflow-500"
          />
          <button
            type="submit"
            disabled={creatingTask || !newTaskTitle.trim()}
            className="rounded-lg bg-socialflow-600 px-4 py-2 text-sm font-medium text-white hover:bg-socialflow-700 transition-colors disabled:opacity-50 shrink-0"
          >
            {creatingTask ? t('content.creatingTask') : t('content.addTask')}
          </button>
        </form>

        {tasksLoading ? (
          <div className="flex justify-center py-4">
            <div className="w-5 h-5 border-2 border-socialflow-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tasks.length === 0 ? (
          <p className="text-sm text-slate-400 py-3">{t('content.noTasks')}</p>
        ) : (
          <div className="space-y-1.5">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3.5 py-2.5 hover:bg-slate-100/60 transition-colors group">
                <button
                  onClick={() => handleToggleTask(task)}
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                    task.done
                      ? 'bg-socialflow-600 border-socialflow-600'
                      : 'border-slate-300 hover:border-socialflow-400'
                  }`}
                >
                  {task.done && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <span className={`flex-1 text-sm ${task.done ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                  {task.title}
                </span>
                {task.due_date && (
                  <span className="text-xs text-slate-400">{task.due_date}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Comments section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 md:p-7 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-4">
          {t('content.commentsCount', { count: item.comments?.length ?? 0 })}
        </h3>

        <form onSubmit={handleAddComment} className="mb-6">
          <textarea
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            placeholder={t('content.writeComment')}
            rows={2}
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-socialflow-500 focus:outline-none focus:ring-1 focus:ring-socialflow-500 resize-none"
          />
          <div className="flex justify-end mt-2">
            <button
              type="submit"
              disabled={submittingComment || !commentBody.trim()}
              className="rounded-lg bg-socialflow-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-socialflow-700 transition-colors disabled:opacity-50"
            >
              {submittingComment ? t('content.posting') : t('content.addComment')}
            </button>
          </div>
        </form>

        {(!item.comments || item.comments.length === 0) ? (
          <p className="text-sm text-slate-400">{t('content.noComments')}</p>
        ) : (
          <div className="space-y-3">
            {item.comments.map((c) => (
              <div key={c.id} className="rounded-xl bg-slate-50 px-4 py-3 border border-slate-100/60">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-socialflow-100 flex items-center justify-center text-socialflow-700 text-[10px] font-semibold shrink-0">
                      {(c.author_name || c.author_email || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate">
                        {c.author_name || c.author_email || 'Usuario'}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {new Date(c.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setDeleteCommentId(c.id)}
                    className="text-xs text-red-400 hover:text-red-600 font-medium shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {t('content.delete')}
                  </button>
                </div>
                <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{c.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteCommentId !== null}
        title={t('content.delete')}
        message={t('content.confirmDeleteComment')}
        onConfirm={() => deleteCommentId && handleDeleteComment(deleteCommentId)}
        onCancel={() => setDeleteCommentId(null)}
      />

      <ConfirmDialog
        open={deleteItemId}
        title={t('content.delete')}
        message={t('content.confirmDelete')}
        onConfirm={handleDeleteItem}
        onCancel={() => setDeleteItemId(false)}
      />
    </div>
  )
}
