import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '@/lib/apiClient'
import { useMe } from '@/context/useMe'

interface ProjectData {
  name: string
  description: string
  start_date: string
  end_date: string
  client_id: string | null
  assignee_id: string | null
  workspace_ids: string[]
}

interface WorkspaceMember {
  user_id: string
  user: { id: string; email: string; name: string }
}

interface Workspace {
  id: string
  name: string
}

interface Client {
  id: string
  name: string
}

export default function ProjectForm() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { user } = useMe()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [clientId, setClientId] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [selectedWorkspaceIds, setSelectedWorkspaceIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEdit)
  const [error, setError] = useState('')

  const activeWorkspaceId = user?.active_workspace_id

  useEffect(() => {
    apiClient.get<WorkspaceMember[]>('/members').then((res) => {
      if (res.data) setMembers(res.data)
    })

    apiClient.get<Client[]>('/clients').then((res) => {
      if (res.data) setClients(res.data)
    })

    apiClient.get<Workspace[]>('/workspaces').then((res) => {
      if (res.data) {
        setWorkspaces(res.data)
        if (activeWorkspaceId) {
          setSelectedWorkspaceIds((prev) => {
            if (prev.size > 0) return prev
            return new Set([activeWorkspaceId])
          })
        }
      }
    })
  }, [activeWorkspaceId])

  useEffect(() => {
    if (!isEdit) return
    apiClient.get<ProjectData>(`/projects/${id}`).then((res) => {
      if (res.data) {
        setName(res.data.name)
        setDescription(res.data.description ?? '')
        setStartDate(res.data.start_date ?? '')
        setEndDate(res.data.end_date ?? '')
        setClientId(res.data.client_id ?? '')
        setAssigneeId(res.data.assignee_id ?? '')
        if (res.data.workspace_ids) {
          setSelectedWorkspaceIds(new Set(res.data.workspace_ids))
        }
      } else if (res.error) {
        setError(res.error.message)
      }
      setFetching(false)
    })
  }, [id, isEdit])

  function toggleWorkspace(wsId: string) {
    if (wsId === activeWorkspaceId) return
    setSelectedWorkspaceIds((prev) => {
      const next = new Set(prev)
      if (next.has(wsId)) {
        next.delete(wsId)
      } else {
        next.add(wsId)
      }
      return next
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const body: Record<string, unknown> = {
      name,
      description,
      start_date: startDate || null,
      end_date: endDate || null,
      client_id: clientId || null,
      assignee_id: assigneeId || null,
      workspace_ids: Array.from(selectedWorkspaceIds),
    }

    const res = isEdit
      ? await apiClient.put<unknown>(`/projects/${id}`, body)
      : await apiClient.post<unknown>('/projects', body)

    setLoading(false)

    if (res.error) {
      setError(res.error.message)
      return
    }

    navigate('/dashboard/projects')
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-socialflow-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto animate-fade-in">
      <div className="mb-6">
        <Link to="/dashboard/projects" className="text-sm text-socialflow-600 hover:text-socialflow-700 font-medium inline-flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          {t('projects.backToList')}
        </Link>
      </div>

      <h2 className="text-2xl font-bold text-slate-900 mb-6">
        {isEdit ? t('projects.editProject') : t('projects.newProjectHeading')}
      </h2>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200/80 p-5 md:p-7 shadow-sm">
        {error && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-5">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-slate-700">{t('projects.form.name')}</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-socialflow-500 focus:outline-none focus:ring-1 focus:ring-socialflow-500"
              placeholder={t('projects.form.namePlaceholder')}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-slate-700">{t('projects.form.description')}</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-socialflow-500 focus:outline-none focus:ring-1 focus:ring-socialflow-500 resize-none"
              placeholder={t('projects.form.descriptionPlaceholder')}
            />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-slate-700">{t('projects.form.startDate')}</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-socialflow-500 focus:outline-none focus:ring-1 focus:ring-socialflow-500"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-slate-700">{t('projects.form.endDate')}</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-socialflow-500 focus:outline-none focus:ring-1 focus:ring-socialflow-500"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-slate-700">{t('projects.form.assignee')}</span>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-socialflow-500 focus:outline-none focus:ring-1 focus:ring-socialflow-500 bg-white"
            >
              <option value="">{t('projects.form.noAssignee')}</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.user.name || m.user.email}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-slate-700">{t('projects.form.client')}</span>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-socialflow-500 focus:outline-none focus:ring-1 focus:ring-socialflow-500 bg-white"
            >
              <option value="">{t('projects.form.noClient')}</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-slate-700">{t('projects.form.workspaces')}</span>
            <div className="rounded-lg border border-slate-200 p-3 space-y-2">
              {workspaces.length === 0 && (
                <p className="text-xs text-slate-400">{t('projects.form.noWorkspaces')}</p>
              )}
              {workspaces.map((ws) => {
                const isCurrent = ws.id === activeWorkspaceId
                return (
                  <label
                    key={ws.id}
                    className={`flex items-center gap-2.5 text-sm cursor-pointer ${isCurrent ? 'cursor-default' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedWorkspaceIds.has(ws.id)}
                      disabled={isCurrent}
                      onChange={() => toggleWorkspace(ws.id)}
                      className="rounded border-slate-300 text-socialflow-600 focus:ring-socialflow-500 disabled:opacity-50"
                    />
                    <span className={isCurrent ? 'text-slate-900 font-medium' : 'text-slate-700'}>
                      {ws.name}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] font-semibold text-socialflow-600 bg-socialflow-50 rounded-full px-1.5 py-0.5 leading-none">
                        {t('projects.form.currentWorkspace')}
                      </span>
                    )}
                  </label>
                )
              })}
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-6 mt-6 border-t border-slate-100">
          <button
            type="submit"
            disabled={loading || selectedWorkspaceIds.size === 0}
            className="rounded-xl bg-socialflow-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-socialflow-700 transition-colors disabled:opacity-50 shadow-sm active:scale-[0.97]"
          >
            {loading ? t('projects.saving') : isEdit ? t('projects.saveChanges') : t('projects.createProject')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard/projects')}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors active:scale-[0.97]"
          >
            {t('projects.cancel')}
          </button>
        </div>
      </form>
    </div>
  )
}
