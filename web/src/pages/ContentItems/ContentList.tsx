import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '@/lib/apiClient'
import { getContentTypeLabel, getPlatformLabel, getStatusLabel } from '@/lib/labels'
import ConfirmDialog from '@/components/ConfirmDialog'
import { useOptionalUser } from '@/context/useMe'
import { can } from '@/lib/permissions'

interface ContentItem {
  id: string
  title: string
  platform: string
  content_type: string
  status: string
  project_id: string | null
  client_id: string | null
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

interface Client {
  id: string
  name: string
}

interface WorkspaceMember {
  user_id: string
  user: { id: string; email: string; name: string }
}

const STATUS_COLORS: Record<string, string> = {
  pre_produccion: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
  en_espera: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300',
  en_edicion: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300',
  validacion: 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300',
  listo_para_subir: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300',
  subido: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300',
  archivado: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300',
}

export default function ContentList() {
  const { t } = useTranslation()
  const user = useOptionalUser()
  const canCreate = can(user, 'content', 'create')
  const canEdit = can(user, 'content', 'update')
  const canDelete = can(user, 'content', 'delete')
  const [items, setItems] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [members, setMembers] = useState<Record<string, WorkspaceMember>>({})
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [searchParams, setSearchParams] = useSearchParams()
  const statusFilter = searchParams.get('status') ?? ''
  const projectFilter = searchParams.get('project_id') ?? ''
  const clientFilter = searchParams.get('client_id') ?? ''
  const assignedToMe = searchParams.get('assigned_to_me') === 'true'
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const loadItems = useCallback(async () => {
    setLoading(true)
    setError('')
    const params = new URLSearchParams()
    if (statusFilter) params.set('status', statusFilter)
    if (projectFilter) params.set('project_id', projectFilter)
    if (clientFilter) params.set('client_id', clientFilter)
    if (assignedToMe) params.set('assigned_to_me', 'true')
    const qs = params.toString()
    const res = await apiClient.get<ContentItem[]>(`/content-items${qs ? `?${qs}` : ''}`)
    if (res.error) {
      setError(res.error.message)
    } else {
      setItems(res.data ?? [])
    }
    setLoading(false)
  }, [statusFilter, projectFilter, clientFilter, assignedToMe])

  useEffect(() => {
    queueMicrotask(loadItems)
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
    apiClient.get<Client[]>('/clients').then((res) => {
      if (res.data) setClients(res.data)
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
  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c.name]))

  async function handleDelete(id: string) {
    setDeleteId(null)
    const res = await apiClient.delete(`/content-items/${id}`)
    if (res.error) {
      setError(res.error.message)
      return
    }
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const statusTabs = ['all', 'pre_produccion', 'en_espera', 'en_edicion', 'validacion', 'listo_para_subir', 'subido', 'archivado']

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
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t('content.title')}</h2>
        {canCreate && (
          <Link
            to="/dashboard/content-items/new"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-socialflow-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-socialflow-700 transition-all shadow-sm active:scale-[0.97]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            {t('content.newItem')}
          </Link>
        )}
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300 mb-4">
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
                  ? 'bg-socialflow-100 dark:bg-socialflow-900/40 text-socialflow-700 dark:text-socialflow-300 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
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
          className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 focus:border-socialflow-500 focus:outline-none focus:ring-1 focus:ring-socialflow-500"
        >
          <option value="">{t('content.form.allProjects')}</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        {/* Client filter */}
        <select
          value={clientFilter}
          onChange={(e) => setFilter('client_id', e.target.value)}
          className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 focus:border-socialflow-500 focus:outline-none focus:ring-1 focus:ring-socialflow-500"
        >
          <option value="">{t('content.form.allClients')}</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Assigned to me toggle */}
        <button
          onClick={toggleAssignedToMe}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            assignedToMe
              ? 'bg-socialflow-100 dark:bg-socialflow-900/40 text-socialflow-700 dark:text-socialflow-300 shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          {t('content.assignedToMe')}
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-12 sm:p-16 text-center">
          <p className="text-slate-500 dark:text-slate-400">{t('content.noItems')}</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('content.table.title')}</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('content.table.status')}</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('content.table.platform')}</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('content.table.dates')}</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('content.table.assignee')}</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('content.table.project')}</th>
                  <th className="text-right px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('content.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link to={`/dashboard/content-items/${item.id}`} className="text-socialflow-600 dark:text-socialflow-400 hover:text-socialflow-700 dark:hover:text-socialflow-300 font-semibold">
                        {item.title}
                      </Link>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {getContentTypeLabel(item.content_type)} · {getPlatformLabel(item.platform)}
                        {item.client_id && clientMap[item.client_id] ? ` · ${clientMap[item.client_id]}` : ''}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[item.status] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>
                        {getStatusLabel(item.status)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{getPlatformLabel(item.platform)}</td>
                    <td className="px-5 py-3.5">
                      <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
                        {item.scheduled_date && <div>📅 {item.scheduled_date}</div>}
                        {item.fecha_inicial && <div>▶ {item.fecha_inicial}</div>}
                        {item.fecha_final && <div>◼ {item.fecha_final}</div>}
                        {!item.scheduled_date && !item.fecha_inicial && !item.fecha_final && <span className="text-slate-300">—</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-slate-400">
                      {item.assignee_id && members[item.assignee_id]
                        ? (members[item.assignee_id].user.name || members[item.assignee_id].user.email)
                        : (item.assignee_id || '—')}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-slate-400">
                      {item.project_id ? (projectMap[item.project_id] || item.project_id) : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-3">
                        {canEdit && (
                          <Link
                            to={`/dashboard/content-items/${item.id}/edit`}
                            className="text-xs text-socialflow-600 dark:text-socialflow-400 hover:text-socialflow-700 dark:hover:text-socialflow-300 font-semibold"
                          >
                            {t('content.edit')}
                          </Link>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setDeleteId(item.id)}
                            className="text-xs text-red-400 hover:text-red-600 font-semibold"
                          >
                            {t('content.delete')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {items.map((item) => (
              <div key={item.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 card-hover shadow-sm">
                <Link
                  to={`/dashboard/content-items/${item.id}`}
                  className="block"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm leading-snug">{item.title}</h3>
                    <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[item.status] ?? ''}`}>
                      {getStatusLabel(item.status)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
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
                <div className="flex gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  {canEdit && (
                    <Link
                      to={`/dashboard/content-items/${item.id}/edit`}
                      className="text-xs font-semibold text-socialflow-600 dark:text-socialflow-400 hover:text-socialflow-700 dark:hover:text-socialflow-300"
                    >
                      {t('content.edit')}
                    </Link>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => setDeleteId(item.id)}
                      className="text-xs font-semibold text-red-400 hover:text-red-600"
                    >
                      {t('content.delete')}
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
        title={t('content.delete')}
        message={t('content.confirmDelete')}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
