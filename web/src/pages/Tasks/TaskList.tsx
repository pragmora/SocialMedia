import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '@/lib/apiClient'

interface Task {
  id: string
  workspace_id: string
  title: string
  description: string
  assignee_id: string | null
  due_date: string | null
  done: boolean
  content_item_id: string | null
  client_id: string | null
  created_at: string
  updated_at: string
}

export default function TaskList() {
  const { t } = useTranslation()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
      due_date: task.due_date,
      done: !task.done,
      content_item_id: task.content_item_id,
      client_id: task.client_id,
    })
    if (res.data) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? res.data! : t)))
    }
  }

  async function handleDelete(taskId: string) {
    const res = await apiClient.delete(`/tasks/${taskId}`)
    if (res.error) {
      setError(res.error.message)
      return
    }
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
  }

  const isOverdue = (task: Task) =>
    task.due_date && !task.done && task.due_date < new Date().toISOString().slice(0, 10)

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
        <h2 className="text-2xl font-bold text-slate-900">{t('tasks.title')}</h2>
        <Link
          to="/dashboard/tasks/new"
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-socialflow-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-socialflow-700 transition-all shadow-sm active:scale-[0.97]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          {t('tasks.newTask')}
        </Link>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 sm:p-16 text-center">
          <div className="text-4xl mb-3 opacity-30">✅</div>
          <p className="text-slate-500">{t('tasks.noTasks')}</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">{t('tasks.table.done')}</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">{t('tasks.table.title')}</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">{t('tasks.table.due')}</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">{t('tasks.table.linked')}</th>
                  <th className="text-right px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">{t('tasks.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => handleToggle(task)}
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
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
                    </td>
                    <td className="px-5 py-3.5">
                      <Link
                        to={`/dashboard/tasks/${task.id}/edit`}
                        className={`font-semibold hover:text-socialflow-700 ${
                          task.done ? 'line-through text-slate-400' : 'text-slate-900'
                        }`}
                      >
                        {task.title}
                      </Link>
                      {task.description && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{task.description}</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {task.due_date ? (
                        <span className={`text-xs font-medium ${isOverdue(task) ? 'text-red-600' : 'text-slate-500'}`}>
                          {isOverdue(task) && '⚠ '}{task.due_date}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">
                      {task.content_item_id && <span className="mr-2">📝</span>}
                      {task.client_id && <span>👤</span>}
                      {!task.content_item_id && !task.client_id && '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-3">
                      <Link
                        to={`/dashboard/tasks/${task.id}/edit`}
                        className="text-xs text-socialflow-600 hover:text-socialflow-700 font-semibold"
                      >
                        {t('tasks.edit')}
                      </Link>
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="text-xs text-red-400 hover:text-red-600 font-semibold"
                      >
                        {t('tasks.delete')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {tasks.map((task) => (
              <div key={task.id} className={`bg-white rounded-xl border p-4 card-hover shadow-sm ${
                task.done ? 'border-slate-200/60' : 'border-slate-200/80'
              }`}>
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => handleToggle(task)}
                    className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                      task.done
                        ? 'bg-socialflow-600 border-socialflow-600'
                        : 'border-slate-300 hover:border-socialflow-400'
                    }`}
                  >
                    {task.done && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/dashboard/tasks/${task.id}/edit`}
                      className={`font-semibold text-sm ${task.done ? 'line-through text-slate-400' : 'text-slate-900'}`}
                    >
                      {task.title}
                    </Link>
                    {task.description && (
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{task.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-slate-400">
                      {task.due_date && (
                        <span className={isOverdue(task) ? 'text-red-500 font-medium' : ''}>
                          {isOverdue(task) ? '⚠ ' : '📅 '}{task.due_date}
                        </span>
                      )}
                      {task.content_item_id && <span>📝</span>}
                      {task.client_id && <span>👤</span>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 mt-3 pt-3 border-t border-slate-100">
                  <Link
                    to={`/dashboard/tasks/${task.id}/edit`}
                    className="text-xs font-semibold text-socialflow-600 hover:text-socialflow-700"
                  >
                    {t('tasks.edit')}
                  </Link>
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="text-xs font-semibold text-red-400 hover:text-red-600"
                  >
                    {t('tasks.delete')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
