import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '@/lib/apiClient'
import ConfirmDialog from '@/components/ConfirmDialog'
import Loading from '@/components/Loading'
import { useToast } from '@/context/useToast'
import { useOptionalUser } from '@/context/useMe'
import { can } from '@/lib/permissions'

interface TaskDetailData {
  id: string
  title: string
  description: string
  start_date: string | null
  end_date: string | null
  done: boolean
  assignee_id: string | null
  assignee_name: string | null
  assignee_email: string | null
  content_item_id: string | null
  content_title: string | null
  client_id: string | null
  client_name: string | null
  project_id: string | null
  project_name: string | null
  created_at: string
  updated_at: string
}

function MetaBox({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 px-3.5 py-2.5">
      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-medium text-slate-800 dark:text-slate-200 mt-0.5 truncate ${accent ?? ''}`}>{value}</p>
    </div>
  )
}

export default function TaskDetail() {
  const { t } = useTranslation()
  const showToast = useToast().showToast
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnTo = searchParams.get('return_to')
  const backTarget = returnTo || '/dashboard/tasks'
  const [task, setTask] = useState<TaskDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toggling, setToggling] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const user = useOptionalUser()
  const canUpdate = can(user, 'tasks', 'update')
  const canDelete = can(user, 'tasks', 'delete')

  const loadTask = useCallback(async () => {
    setLoading(true)
    setError('')
    const res = await apiClient.get<TaskDetailData>(`/tasks/${id}`)
    if (res.error) {
      setError(res.error.message)
    } else {
      setTask(res.data ?? null)
    }
    setLoading(false)
  }, [id])

  useEffect(() => { queueMicrotask(loadTask) }, [loadTask])

  async function handleToggle() {
    if (!task) return
    setToggling(true)
    const res = await apiClient.put<TaskDetailData>(`/tasks/${id}`, {
      title: task.title,
      description: task.description,
      assignee_id: task.assignee_id,
      start_date: task.start_date,
      end_date: task.end_date,
      content_item_id: task.content_item_id,
      client_id: task.client_id,
      project_id: task.project_id,
      done: !task.done,
    })
    setToggling(false)
    if (res.error) {
      setError(res.error.message)
    } else if (res.data) {
      setTask(res.data)
      showToast(res.data.done ? t('tasks.completed') : t('tasks.uncompleted'))
    }
  }

  async function handleDelete() {
    setDeleteOpen(false)
    const res = await apiClient.delete(`/tasks/${id}`)
    if (res.error) {
      setError(res.error.message)
      return
    }
    navigate(returnTo || '/dashboard/tasks')
  }

  if (loading) {
    return <Loading />
  }

  if (!task) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-5 py-4 text-sm text-red-700 dark:text-red-300">{error || t('tasks.notFound')}</div>
        <Link to="/dashboard/tasks" className="text-socialflow-600 dark:text-socialflow-400 hover:underline text-sm mt-3 inline-block">
          {t('tasks.backToTasks')}
        </Link>
      </div>
    )
  }

  const isOverdue = task.end_date && !task.done && task.end_date < new Date().toISOString().slice(0, 10)

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="mb-5">
        <Link to={backTarget} className="text-sm text-socialflow-600 dark:text-socialflow-400 hover:text-socialflow-700 dark:hover:text-socialflow-300 font-medium inline-flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          {t('tasks.backToTasks')}
        </Link>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-5 py-3 text-sm text-red-700 dark:text-red-300 mb-5 animate-scale-in">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 md:p-7 mb-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              {canUpdate ? (
                <button
                  onClick={handleToggle}
                  disabled={toggling}
                  aria-label={t('tasks.form.markDone')}
                  className={`w-6 h-6 rounded border-2 flex items-center justify-center shrink-0 transition-all disabled:opacity-50 ${
                    task.done
                      ? 'bg-socialflow-600 border-socialflow-600'
                      : 'border-slate-300 dark:border-slate-600 hover:border-socialflow-400'
                  }`}
                >
                  {task.done && (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ) : (
                <span
                  aria-label={t('tasks.form.markDone')}
                  className={`w-6 h-6 rounded border-2 flex items-center justify-center shrink-0 ${
                    task.done ? 'bg-socialflow-600 border-socialflow-600' : 'border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {task.done && (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
              )}
              <h1 className={`text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 leading-tight ${task.done ? 'line-through text-slate-400' : ''}`}>
                {task.title}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-2.5 ml-9">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                task.done ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700'
              }`}>
                {task.done ? t('calendar.taskDone') : t('calendar.taskPending')}
              </span>
              {isOverdue && (
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">
                  ⚠ {t('tasks.overdue')}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 self-start shrink-0">
            {canUpdate && (
              <Link
                to={returnTo ? `/dashboard/tasks/${task.id}/edit?return_to=${encodeURIComponent(returnTo)}` : `/dashboard/tasks/${task.id}/edit`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                {t('tasks.edit')}
              </Link>
            )}
            {canDelete && (
              <button
                onClick={() => setDeleteOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 dark:border-red-900/60 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:border-red-300 transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                {t('tasks.delete')}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <MetaBox label={t('tasks.form.startDate')} value={task.start_date || '—'} />
          <MetaBox
            label={t('tasks.form.endDate')}
            value={task.end_date || '—'}
            accent={isOverdue ? 'text-red-600 dark:text-red-400' : undefined}
          />
          <MetaBox
            label={t('tasks.form.assignee')}
            value={task.assignee_name || task.assignee_email || '—'}
          />
          {task.content_item_id && (
            <Link to={`/dashboard/content-items/${task.content_item_id}`} className="block rounded-xl hover:bg-slate-100/70 transition-colors">
              <MetaBox label={t('tasks.linkedContent')} value={task.content_title || '—'} accent="text-socialflow-600 dark:text-socialflow-400" />
            </Link>
          )}
          {task.client_id && (
            <MetaBox label={t('tasks.linkedClient')} value={task.client_name || '—'} />
          )}
          {task.project_id && (
            <MetaBox label={t('tasks.form.project')} value={task.project_name || '—'} />
          )}
        </div>

        {task.description && (
          <div className="mt-4 text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 py-3.5 border border-slate-100/60">
            {task.description}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title={t('tasks.delete')}
        message={t('tasks.confirmDelete')}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  )
}
