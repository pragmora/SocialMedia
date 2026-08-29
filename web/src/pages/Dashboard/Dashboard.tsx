import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '@/lib/apiClient'
import { getStatusLabel } from '@/lib/labels'
import { dueTone, daysUntil, DUE_TONE_STYLES, sortByDuePriority } from '@/lib/dueDates'
import { useOptionalUser } from '@/context/useMe'
import { can } from '@/lib/permissions'

interface ContentItem {
  id: string
  title: string
  platform: string
  content_type: string
  status: string
  scheduled_date: string | null
  updated_at: string
}

interface DueItem {
  id: string
  title: string
  type: 'task' | 'content'
  due_date: string
  status: string
  done: boolean
  client_name: string | null
  project_name: string | null
  assignee_name: string | null
}

interface DashboardData {
  status_counts: Record<string, number>
  recent_items: ContentItem[]
  overdue_tasks: number
  due_soon: DueItem[]
}

function formatDueDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
}

function dueInfoFor(item: DueItem, t: ReturnType<typeof useTranslation>['t']) {
  const tone = dueTone(item.due_date, item.done)
  if (tone === 'none') return null
  const style = DUE_TONE_STYLES[tone]
  const label = tone === 'soon' ? t('due.days', { count: daysUntil(item.due_date) ?? 0 }) : t(style.i18nKey)
  return { ...style, label, tone }
}

const STATUS_COLORS: Record<string, string> = {
  pre_produccion: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  en_espera: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  en_edicion: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  validacion: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  listo_para_subir: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
  subido: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  archivado: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
}

const STATUS_ORDER = ['pre_produccion', 'en_espera', 'en_edicion', 'validacion', 'listo_para_subir', 'subido', 'archivado']

export default function Dashboard() {
  const { t } = useTranslation()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const user = useOptionalUser()
  const canCreateContent = can(user, 'content', 'create')
  const canCreateTask = can(user, 'tasks', 'create')

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError('')
    const res = await apiClient.get<DashboardData>('/dashboard')
    if (res.error) {
      setError(res.error.message)
    } else {
      setData(res.data ?? null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    queueMicrotask(loadDashboard)
  }, [loadDashboard])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-socialflow-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="animate-fade-in">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">{t('dashboard.title')}</h2>
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-12 text-center">
          <p role="alert" className="text-red-600 dark:text-red-400">{error || t('dashboard.failedToLoad')}</p>
        </div>
      </div>
    )
  }

  const totalContent = Object.values(data.status_counts).reduce((a, b) => a + b, 0)

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t('dashboard.title')}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('dashboard.recentContentTotal', { count: totalContent })}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadDashboard} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-all active:scale-[0.97]">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            {t('dashboard.refresh')}
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-400 mb-5">
          {error}
        </div>
      )}

      {/* Próximos vencimientos */}
      {data && (() => {
        const sortedDue = sortByDuePriority(data.due_soon ?? []).slice(0, 8)

        if (sortedDue.length === 0) {
          return (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm mb-8 flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" aria-hidden="true" />
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('due.empty')}</p>
            </div>
          )
        }

        return (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="inline-flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100">
                {t('due.title')}
                <span className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-xs font-bold">
                  {sortedDue.length}
                </span>
              </h3>
              <Link
                to="/dashboard/calendar"
                className="inline-flex items-center gap-1 text-xs font-semibold text-socialflow-600 hover:text-socialflow-700 dark:text-socialflow-400 dark:hover:text-socialflow-300 transition-colors"
              >
                {t('due.seeCalendar')}
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </Link>
            </div>
            <div className="space-y-2">
              {sortedDue.map((item) => {
                const info = dueInfoFor(item, t)
                const to = item.type === 'task' ? `/dashboard/tasks/${item.id}` : `/dashboard/content-items/${item.id}`
                const typeLabel = item.type === 'task' ? t('due.itemTask') : t('due.itemContent')
                return (
                  <Link
                    key={`${item.type}-${item.id}`}
                    to={to}
                    className={`flex items-start gap-3 rounded-xl border px-3.5 py-2.5 transition-all duration-150 hover:shadow-sm hover:bg-slate-50/60 dark:hover:bg-slate-800/60 ${
                      info?.tone === 'overdue' ? 'border-red-200/70 bg-red-50/30 dark:border-red-900/50 dark:bg-red-950/30' : 'border-slate-100 dark:border-slate-800'
                    }`}
                  >
                    <span className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${info?.dot ?? 'bg-slate-300 dark:bg-slate-600'}`} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{item.title}</span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {formatDueDate(item.due_date)} · {typeLabel}
                        {item.client_name ? ` · ${item.client_name}` : ''}
                        {item.project_name ? ` · ${item.project_name}` : ''}
                        {item.assignee_name ? ` · ${item.assignee_name}` : ''}
                      </span>
                    </span>
                    {info && (
                      <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${info.badge}`}>
                        {info.label}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Status count cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3 mb-8">
        {STATUS_ORDER.filter((s) => (data.status_counts[s] ?? 0) > 0).map((status) => (
          <Link
            key={status}
            to={`/dashboard/content-items?status=${status}`}
            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 card-hover shadow-sm"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
                {getStatusLabel(status)}
              </span>
            </div>
            <p className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">{data.status_counts[status]}</p>
          </Link>
        ))}

        {data.overdue_tasks > 0 && (
          <Link
            to="/dashboard/tasks"
            className="bg-white dark:bg-slate-900 rounded-xl border border-red-200/80 dark:border-red-900/60 p-4 card-hover shadow-sm"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                {t('dashboard.overdueTasks')}
              </span>
            </div>
            <p className="text-2xl md:text-3xl font-bold text-red-600 dark:text-red-400">{data.overdue_tasks}</p>
          </Link>
        )}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        {canCreateContent && (
          <Link
            to="/dashboard/content-items/new"
            className="inline-flex items-center gap-1.5 rounded-xl bg-socialflow-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-socialflow-700 transition-all shadow-sm active:scale-[0.97]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            {t('dashboard.newContent')}
          </Link>
        )}
        {canCreateTask && (
          <Link
            to="/dashboard/tasks/new"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all active:scale-[0.97] shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            {t('dashboard.newTask')}
          </Link>
        )}
      </div>

      {/* Recent items */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
          {t('dashboard.recentContent')}
        </h3>
        {data.recent_items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-12 text-center">
            <div className="text-4xl mb-3 opacity-30">📝</div>
            <p className="text-slate-500 dark:text-slate-400">{t('dashboard.noContent')}</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('dashboard.table.title')}</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('dashboard.table.status')}</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('dashboard.table.platform')}</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('dashboard.table.updated')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.recent_items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <Link to={`/dashboard/content-items/${item.id}`} className="text-socialflow-600 hover:text-socialflow-700 dark:text-socialflow-400 dark:hover:text-socialflow-300 font-semibold">
                          {item.title}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[item.status] ?? ''}`}>
                          {getStatusLabel(item.status)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300 capitalize">{item.platform}</td>
                      <td className="px-5 py-3.5 text-slate-400 text-xs">{new Date(item.updated_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {data.recent_items.map((item) => (
                <Link
                  key={item.id}
                  to={`/dashboard/content-items/${item.id}`}
                  className="block bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 card-hover shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{item.title}</span>
                    <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[item.status] ?? ''}`}>
                      {getStatusLabel(item.status)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="capitalize">{item.platform}</span>
                    <span>·</span>
                    <span>{new Date(item.updated_at).toLocaleDateString()}</span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
