import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '@/lib/apiClient'
import ConfirmDialog from '@/components/ConfirmDialog'
import { useOptionalUser } from '@/context/useMe'
import { can } from '@/lib/permissions'

interface Task {
  id: string
  workspace_id: string
  title: string
  description: string
  assignee_id: string | null
  start_date: string | null
  end_date: string | null
  done: boolean
  content_item_id: string | null
  content_title: string | null
  client_id: string | null
  client_name: string | null
  project_id: string | null
  project_name: string | null
  created_at: string
  updated_at: string
}

export default function TaskList() {
  const { t } = useTranslation()
  const user = useOptionalUser()
  const canCreate = can(user, 'tasks', 'create')
  const canUpdate = can(user, 'tasks', 'update')
  const canDelete = can(user, 'tasks', 'delete')
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    apiClient.get<Task[]>('/tasks').then((res) => {
      if (res.error) {
        setError(res.error.message)
      } else {
        setTasks(res.data ?? [])
      }
      setLoading(false)
    })
  }, [])

  async function handleToggle(task: Task) {
    const res = await apiClient.put<Task>(`/tasks/${task.id}`, {
      title: task.title,
      description: task.description,
      assignee_id: task.assignee_id,
      start_date: task.start_date,
      end_date: task.end_date,
      done: !task.done,
      content_item_id: task.content_item_id,
      client_id: task.client_id,
      project_id: task.project_id,
    })
    if (res.data) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? res.data! : t)))
    }
  }

  async function handleDelete(taskId: string) {
    setDeleteId(null)
    const res = await apiClient.delete(`/tasks/${taskId}`)
    if (res.error) {
      setError(res.error.message)
      return
    }
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
  }

  const isOverdue = (task: Task) =>
    task.end_date && !task.done && task.end_date < new Date().toISOString().slice(0, 10)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-socialflow-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t('tasks.title')}</h2>
        {canCreate && (
          <Link
            to="/dashboard/tasks/new"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-socialflow-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-socialflow-700 transition-all shadow-sm active:scale-[0.97]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            {t('tasks.newTask')}
          </Link>
        )}
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300 mb-4">
          {error}
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-12 sm:p-16 text-center">
          <div className="text-4xl mb-3 opacity-30">✅</div>
          <p className="text-slate-500 dark:text-slate-400">{t('tasks.noTasks')}</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('tasks.table.done')}</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('tasks.table.title')}</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('tasks.table.project')}</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('tasks.table.content')}</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('tasks.table.startDate')}</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('tasks.table.endDate')}</th>
                  <th className="text-right px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('tasks.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="px-5 py-3.5">
                      {canUpdate ? (
                        <button
                          onClick={() => handleToggle(task)}
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                            task.done
                              ? 'bg-socialflow-600 border-socialflow-600'
                              : 'border-slate-300 dark:border-slate-600 hover:border-socialflow-400'
                          }`}
                        >
                          {task.done && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      ) : (
                        <span className={`inline-block w-4 h-4 rounded border-2 ${task.done ? 'bg-socialflow-600 border-socialflow-600' : 'border-slate-300 dark:border-slate-600'}`}>
                          {task.done && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <Link
                        to={`/dashboard/tasks/${task.id}`}
                        className={`font-semibold hover:text-socialflow-700 dark:hover:text-socialflow-300 ${
                          task.done ? 'line-through text-slate-400' : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {task.title}
                      </Link>
                      {task.description && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{task.description}</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {task.project_name ? (
                        <span className="inline-flex items-center rounded-full bg-violet-100 dark:bg-violet-900/40 px-2.5 py-0.5 text-xs font-medium text-violet-700 dark:text-violet-300 max-w-[160px] truncate">
                          📁 {task.project_name}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300 dark:text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {task.content_item_id && task.content_title ? (
                        <Link
                          to={`/dashboard/content-items/${task.content_item_id}`}
                          className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 dark:bg-sky-900/40 px-2.5 py-0.5 text-xs font-medium text-sky-700 dark:text-sky-300 hover:bg-sky-200 dark:hover:bg-sky-900/60 transition-colors max-w-[180px]"
                        >
                          <span className="truncate">📝 {task.content_title}</span>
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-300 dark:text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-slate-400">
                      {task.start_date || '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      {task.end_date ? (
                        <span className={`text-xs font-medium ${isOverdue(task) ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
                          {isOverdue(task) && '⚠ '}{task.end_date}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-3">
                      {canUpdate && (
                        <Link
                          to={`/dashboard/tasks/${task.id}/edit`}
                          className="text-xs text-socialflow-600 dark:text-socialflow-400 hover:text-socialflow-700 dark:hover:text-socialflow-300 font-semibold"
                        >
                          {t('tasks.edit')}
                        </Link>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => setDeleteId(task.id)}
                          className="text-xs text-red-400 hover:text-red-600 font-semibold"
                        >
                          {t('tasks.delete')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {tasks.map((task) => (
              <div key={task.id} className={`bg-white dark:bg-slate-900 rounded-xl border p-4 card-hover shadow-sm ${
                task.done ? 'border-slate-200/60 dark:border-slate-800' : 'border-slate-200/80 dark:border-slate-800'
              }`}>
                <div className="flex items-start gap-3">
                  {canUpdate ? (
                    <button
                      onClick={() => handleToggle(task)}
                      className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                        task.done
                          ? 'bg-socialflow-600 border-socialflow-600'
                          : 'border-slate-300 dark:border-slate-600 hover:border-socialflow-400'
                      }`}
                    >
                      {task.done && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ) : (
                    <span className={`mt-0.5 inline-flex w-5 h-5 rounded border-2 shrink-0 ${task.done ? 'bg-socialflow-600 border-socialflow-600' : 'border-slate-300 dark:border-slate-600'}`}>
                      {task.done && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/dashboard/tasks/${task.id}`}
                      className={`font-semibold text-sm ${task.done ? 'line-through text-slate-400' : 'text-slate-900 dark:text-slate-100'}`}
                    >
                      {task.title}
                    </Link>
                    {task.description && (
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{task.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-slate-400">
                      {task.project_name && (
                        <span className="inline-flex items-center rounded-full bg-violet-100 dark:bg-violet-900/40 px-2 py-0.5 font-medium text-violet-700 dark:text-violet-300">
                          📁 {task.project_name}
                        </span>
                      )}
                      {task.content_item_id && task.content_title && (
                        <Link
                          to={`/dashboard/content-items/${task.content_item_id}`}
                          className="inline-flex items-center rounded-full bg-sky-100 dark:bg-sky-900/40 px-2 py-0.5 font-medium text-sky-700 dark:text-sky-300 hover:bg-sky-200 dark:hover:bg-sky-900/60 transition-colors max-w-[200px]"
                        >
                          <span className="truncate">📝 {task.content_title}</span>
                        </Link>
                      )}
                      {task.start_date && <span>📅 {task.start_date}</span>}
                      {task.end_date && (
                        <span className={isOverdue(task) ? 'text-red-500 font-medium' : ''}>
                          {isOverdue(task) ? '⚠ ' : '📅 '}{task.end_date}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  {canUpdate && (
                    <Link
                      to={`/dashboard/tasks/${task.id}/edit`}
                      className="text-xs font-semibold text-socialflow-600 dark:text-socialflow-400 hover:text-socialflow-700 dark:hover:text-socialflow-300"
                    >
                      {t('tasks.edit')}
                    </Link>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => setDeleteId(task.id)}
                      className="text-xs font-semibold text-red-400 hover:text-red-600"
                    >
                      {t('tasks.delete')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        title={t('tasks.delete')}
        message={t('tasks.confirmDelete')}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
