import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '@/lib/apiClient'
import { getStatusLabel } from '@/lib/labels'

interface ContentItem {
  id: string
  title: string
  platform: string
  content_type: string
  status: string
  scheduled_date: string | null
  updated_at: string
}

interface DashboardData {
  status_counts: Record<string, number>
  recent_items: ContentItem[]
  overdue_tasks: number
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  review: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  published: 'bg-green-100 text-green-800',
  archived: 'bg-red-100 text-red-800',
}

export default function Dashboard() {
  const { t } = useTranslation()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDashboard()
  }, [loadDashboard])

  if (loading) {
    return <p className="text-gray-500 p-4">{t('dashboard.loadingDashboard')}</p>
  }

  if (!data) {
    return (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">{t('dashboard.title')}</h2>
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
          <p role="alert" className="text-red-600">{error || t('dashboard.failedToLoad')}</p>
          </div>
        </div>
      )
  }

  const totalContent = Object.values(data.status_counts).reduce((a, b) => a + b, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">{t('dashboard.title')}</h2>
        <button
          onClick={loadDashboard}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          {t('dashboard.refresh')}
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      {/* Status count cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        {Object.entries(data.status_counts).map(([status, count]) => (
          <div
            key={status}
            className="bg-white rounded-lg border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-700'}`}>
                {getStatusLabel(status)}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{count}</p>
          </div>
        ))}

        {data.overdue_tasks > 0 && (
          <div className="bg-white rounded-lg border border-red-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-red-100 text-red-700">
                {t('dashboard.overdueTasks')}
              </span>
            </div>
            <p className="text-2xl font-bold text-red-600">{data.overdue_tasks}</p>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="flex gap-3 mb-8">
        <Link
          to="/dashboard/content-items/new"
          className="rounded-lg bg-socialflow-600 px-4 py-2 text-sm font-medium text-white hover:bg-socialflow-700 transition-colors"
        >
          {t('dashboard.newContent')}
        </Link>
        <Link
          to="/dashboard/tasks/new"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          {t('dashboard.newTask')}
        </Link>
      </div>

      {/* Recent items */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('dashboard.recentContentTotal', { count: totalContent })}
        </h3>
        {data.recent_items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
            <p className="text-gray-500">{t('dashboard.noContent')}</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('dashboard.table.title')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('dashboard.table.status')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('dashboard.table.platform')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('dashboard.table.updated')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.recent_items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        to={`/dashboard/content-items/${item.id}`}
                        className="text-socialflow-600 hover:text-socialflow-700 font-medium"
                      >
                        {item.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[item.status] ?? ''}`}>
                        {getStatusLabel(item.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{item.platform}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(item.updated_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
