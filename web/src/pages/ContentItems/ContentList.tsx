import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '@/lib/apiClient'
import { getContentTypeLabel, getPlatformLabel, getStatusLabel } from '@/lib/labels'

interface ContentItem {
  id: string
  title: string
  platform: string
  content_type: string
  status: string
  project_id: string | null
  scheduled_date: string | null
  fecha_inicial: string | null
  fecha_final: string | null
  assignee_id: string | null
  created_at: string
  updated_at: string
}

interface Project {
  id: string
  name: string
}

interface WorkspaceMember {
  user_id: string
  user: { id: string; email: string; name: string }
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  review: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  published: 'bg-green-100 text-green-800',
  archived: 'bg-red-100 text-red-800',
}

export default function ContentList() {
  const { t } = useTranslation()
  const [items, setItems] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [members, setMembers] = useState<Record<string, WorkspaceMember>>({})
  const [projects, setProjects] = useState<Project[]>([])
  const [searchParams, setSearchParams] = useSearchParams()
  const statusFilter = searchParams.get('status') ?? ''
  const projectFilter = searchParams.get('project_id') ?? ''
  const assignedToMe = searchParams.get('assigned_to_me') === 'true'
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({})

  const loadItems = useCallback(async () => {
    setLoading(true)
    setError('')
    const params = new URLSearchParams()
    if (statusFilter) params.set('status', statusFilter)
    if (projectFilter) params.set('project_id', projectFilter)
    if (assignedToMe) params.set('assigned_to_me', 'true')
    const qs = params.toString()
    const res = await apiClient.get<ContentItem[]>(`/content-items${qs ? `?${qs}` : ''}`)
    if (res.error) {
      setError(res.error.message)
    } else {
      setItems(res.data ?? [])
    }
    setLoading(false)
  }, [statusFilter, projectFilter, assignedToMe])

  useEffect(() => {
    loadItems()
    apiClient.get<WorkspaceMember[]>('/members').then((res) => {
      if (res.data) {
        const map: Record<string, WorkspaceMember> = {}
        res.data.forEach((m) => { map[m.user_id] = m })
        setMembers(map)
      }
    })
    apiClient.get<Project[]>('/projects').then((res) => {
      if (res.data) setProjects(res.data)
    })
  }, [loadItems])

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(searchParams)
    if (value) {
      next.set(key, value)
    } else {
      next.delete(key)
    }
    setSearchParams(next, { replace: true })
  }

  function toggleAssignedToMe() {
    const next = new URLSearchParams(searchParams)
    if (assignedToMe) {
      next.delete('assigned_to_me')
    } else {
      next.set('assigned_to_me', 'true')
    }
    setSearchParams(next, { replace: true })
  }

  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.name]))

  const grouped = items.reduce<Record<string, ContentItem[]>>((acc, item) => {
    const key = item.project_id || '__none__'
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  const projectKeys = Object.keys(grouped).sort((a, b) => {
    if (a === '__none__') return 1
    if (b === '__none__') return -1
    return (projectMap[a] || '').localeCompare(projectMap[b] || '')
  })

  // expand all groups by default when items load
  useEffect(() => {
    if (items.length > 0 && Object.keys(expandedProjects).length === 0) {
      const allExpanded: Record<string, boolean> = {}
      projectKeys.forEach((k) => { allExpanded[k] = true })
      setExpandedProjects(allExpanded)
    }
  }, [items.length, projectKeys.length])

  function toggleProject(key: string) {
    setExpandedProjects((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const statusTabs = ['all', 'draft', 'review', 'approved', 'published', 'archived']

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
        <h2 className="text-2xl font-bold text-slate-900">{t('content.title')}</h2>
        <Link
          to="/dashboard/content-items/new"
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-socialflow-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-socialflow-700 transition-all shadow-sm active:scale-[0.97]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          {t('content.newItem')}
        </Link>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Status tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {statusTabs.map((s) => (
            <button
              key={s}
              onClick={() => setFilter('status', s === 'all' ? '' : s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                (s === 'all' && !statusFilter) || statusFilter === s
                  ? 'bg-socialflow-100 text-socialflow-700 shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s === 'all' ? t('status.all') : getStatusLabel(s)}
            </button>
          ))}
        </div>

        {/* Project filter */}
        <select
          value={projectFilter}
          onChange={(e) => setFilter('project_id', e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium bg-white text-slate-600 focus:border-socialflow-500 focus:outline-none focus:ring-1 focus:ring-socialflow-500"
        >
          <option value="">{t('content.form.allProjects')}</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        {/* Assigned to me toggle */}
        <button
          onClick={toggleAssignedToMe}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            assignedToMe
              ? 'bg-socialflow-100 text-socialflow-700 shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {t('content.assignedToMe')}
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 sm:p-16 text-center">
          <p className="text-slate-500">{t('content.noItems')}</p>
        </div>
      ) : (
        <>
          {projectKeys.map((key) => {
            const groupItems = grouped[key]
            const projectName = key === '__none__' ? t('content.noProject') : projectMap[key] || key
            const isExpanded = expandedProjects[key] !== false

            return (
              <div key={key} className="mb-5">
                {/* Project header */}
                <button
                  onClick={() => toggleProject(key)}
                  className="flex items-center gap-2 w-full text-left mb-2 group"
                >
                  <svg
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">
                    {projectName}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">({groupItems.length})</span>
                </button>

                {isExpanded && (
                  <>
                    {/* Desktop table */}
                    <div className="hidden md:block bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">{t('content.table.title')}</th>
                            <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">{t('content.table.status')}</th>
                            <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">{t('content.table.platform')}</th>
                            <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">{t('content.table.dates')}</th>
                            <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">{t('content.table.assignee')}</th>
                            <th className="text-right px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">{t('content.table.actions')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {groupItems.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="px-5 py-3.5">
                                <Link to={`/dashboard/content-items/${item.id}`} className="text-socialflow-600 hover:text-socialflow-700 font-semibold">
                                  {item.title}
                                </Link>
                                <p className="text-xs text-slate-400 mt-0.5">
                                  {getContentTypeLabel(item.content_type)} · {getPlatformLabel(item.platform)}
                                </p>
                              </td>
                              <td className="px-5 py-3.5">
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[item.status] ?? 'bg-gray-100 text-gray-700'}`}>
                                  {getStatusLabel(item.status)}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-slate-600">{getPlatformLabel(item.platform)}</td>
                              <td className="px-5 py-3.5">
                                <div className="text-xs text-slate-500 space-y-0.5">
                                  {item.scheduled_date && <div>📅 {item.scheduled_date}</div>}
                                  {item.fecha_inicial && <div>▶ {item.fecha_inicial}</div>}
                                  {item.fecha_final && <div>◼ {item.fecha_final}</div>}
                                  {!item.scheduled_date && !item.fecha_inicial && !item.fecha_final && <span className="text-slate-300">—</span>}
                                </div>
                              </td>
                              <td className="px-5 py-3.5 text-xs text-slate-500">
                                {item.assignee_id && members[item.assignee_id]
                                  ? (members[item.assignee_id].user.name || members[item.assignee_id].user.email)
                                  : (item.assignee_id || '—')}
                              </td>
                              <td className="px-5 py-3.5 text-right">
                                <Link
                                  to={`/dashboard/content-items/${item.id}/edit`}
                                  className="text-xs text-socialflow-600 hover:text-socialflow-700 font-semibold"
                                >
                                  {t('content.edit')}
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="md:hidden space-y-3">
                      {groupItems.map((item) => (
                        <Link
                          key={item.id}
                          to={`/dashboard/content-items/${item.id}`}
                          className="block bg-white rounded-xl border border-slate-200/80 p-4 card-hover shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-semibold text-slate-900 text-sm leading-snug">{item.title}</h3>
                            <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[item.status] ?? ''}`}>
                              {getStatusLabel(item.status)}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                            <span>{getPlatformLabel(item.platform)}</span>
                            <span>·</span>
                            <span>{getContentTypeLabel(item.content_type)}</span>
                            {item.scheduled_date && (
                              <>
                                <span>·</span>
                                <span>📅 {item.scheduled_date}</span>
                              </>
                            )}
                          </div>
                          {(item.fecha_inicial || item.fecha_final || item.assignee_id) && (
                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs text-slate-400">
                              {item.fecha_inicial && <span>▶ {item.fecha_inicial}</span>}
                              {item.fecha_final && <span>◼ {item.fecha_final}</span>}
                              {item.assignee_id && <span>👤 {members[item.assignee_id]?.user?.name || members[item.assignee_id]?.user?.email || item.assignee_id}</span>}
                            </div>
                          )}
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
