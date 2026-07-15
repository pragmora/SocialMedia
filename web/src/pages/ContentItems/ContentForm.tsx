import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '@/lib/apiClient'
import { getContentTypeLabel, getPlatformLabel } from '@/lib/labels'

const PLATFORMS = ['instagram', 'facebook', 'twitter', 'linkedin', 'tiktok', 'youtube', 'other'] as const
const CONTENT_TYPES = ['post', 'story', 'reel', 'video', 'carousel', 'other'] as const

interface ContentItemData {
  title: string
  description: string
  platform: string
  content_type: string
  client_id: string | null
  scheduled_date: string
  fecha_inicial: string
  fecha_final: string
  assignee_id: string | null
}

interface ClientOption {
  id: string
  name: string
}

interface ProjectOption {
  id: string
  name: string
}

interface WorkspaceMember {
  user_id: string
  user: { id: string; email: string; name: string }
}

export default function ContentForm() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [platform, setPlatform] = useState('instagram')
  const [contentType, setContentType] = useState('post')
  const [clientId, setClientId] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [fechaInicial, setFechaInicial] = useState('')
  const [fechaFinal, setFechaFinal] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [clients, setClients] = useState<ClientOption[]>([])
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEdit)
  const [error, setError] = useState('')

  useEffect(() => {
    apiClient.get<ClientOption[]>('/clients').then((res) => {
      if (res.data) setClients(res.data)
    })
    apiClient.get<ProjectOption[]>('/projects').then((res) => {
      if (res.data) setProjects(res.data)
    })
    apiClient.get<WorkspaceMember[]>('/members').then((res) => {
      if (res.data) setMembers(res.data)
    })

    if (!isEdit) return
    apiClient.get<ContentItemData>(`/content-items/${id}`).then((res) => {
      if (res.data) {
        setTitle(res.data.title)
        setDescription(res.data.description ?? '')
        setPlatform(res.data.platform)
        setContentType(res.data.content_type)
        setClientId(res.data.client_id ?? '')
        setScheduledDate(res.data.scheduled_date ?? '')
        setFechaInicial(res.data.fecha_inicial ?? '')
        setFechaFinal(res.data.fecha_final ?? '')
        setAssigneeId(res.data.assignee_id ?? '')
        setProjectId((res.data as any).project_id ?? '')
      } else if (res.error) {
        setError(res.error.message)
      }
      setFetching(false)
    })
  }, [id, isEdit])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const body: Record<string, unknown> = {
      title,
      description,
      platform,
      content_type: contentType,
      client_id: clientId || null,
      scheduled_date: scheduledDate || null,
      fecha_inicial: fechaInicial || null,
      fecha_final: fechaFinal || null,
      assignee_id: assigneeId || null,
      project_id: projectId || null,
    }

    const res = isEdit
      ? await apiClient.put<unknown>(`/content-items/${id}`, body)
      : await apiClient.post<unknown>('/content-items', body)

    setLoading(false)

    if (res.error) {
      setError(res.error.message)
      return
    }

    navigate('/dashboard/content-items')
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
        <Link to="/dashboard/content-items" className="text-sm text-socialflow-600 hover:text-socialflow-700 font-medium inline-flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          {t('content.backToContentItems')}
        </Link>
      </div>

      <h2 className="text-2xl font-bold text-slate-900 mb-6">
        {isEdit ? t('content.editContentItem') : t('content.newContentItem')}
      </h2>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200/80 p-5 md:p-7 shadow-sm">
        {error && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-5">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-slate-700">{t('content.form.title')}</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
              className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-socialflow-500 focus:outline-none focus:ring-1 focus:ring-socialflow-500"
              placeholder={t('content.form.titlePlaceholder')}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-slate-700">{t('content.form.description')}</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-socialflow-500 focus:outline-none focus:ring-1 focus:ring-socialflow-500 resize-none"
              placeholder={t('content.form.descriptionPlaceholder')}
            />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-slate-700">{t('content.form.platform')}</span>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-socialflow-500 focus:outline-none focus:ring-1 focus:ring-socialflow-500 bg-white"
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>{getPlatformLabel(p)}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-slate-700">{t('content.form.type')}</span>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-socialflow-500 focus:outline-none focus:ring-1 focus:ring-socialflow-500 bg-white"
              >
                {CONTENT_TYPES.map((ct) => (
                  <option key={ct} value={ct}>{getContentTypeLabel(ct)}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-slate-700">{t('content.form.project')}</span>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-socialflow-500 focus:outline-none focus:ring-1 focus:ring-socialflow-500 bg-white"
            >
              <option value="">{t('content.form.noProject')}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-slate-700">{t('content.form.client')}</span>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-socialflow-500 focus:outline-none focus:ring-1 focus:ring-socialflow-500 bg-white"
            >
              <option value="">{t('content.form.noClient')}</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-slate-700">{t('content.form.scheduledDate')}</span>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-socialflow-500 focus:outline-none focus:ring-1 focus:ring-socialflow-500"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-slate-700">{t('content.form.startDate')}</span>
              <input
                type="date"
                value={fechaInicial}
                onChange={(e) => setFechaInicial(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-socialflow-500 focus:outline-none focus:ring-1 focus:ring-socialflow-500"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-slate-700">{t('content.form.endDate')}</span>
              <input
                type="date"
                value={fechaFinal}
                onChange={(e) => setFechaFinal(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-socialflow-500 focus:outline-none focus:ring-1 focus:ring-socialflow-500"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-slate-700">{t('content.form.assignee')}</span>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-socialflow-500 focus:outline-none focus:ring-1 focus:ring-socialflow-500 bg-white"
            >
              <option value="">{t('content.form.noAssignee')}</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.user.name || m.user.email}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex gap-3 pt-6 mt-6 border-t border-slate-100">
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-socialflow-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-socialflow-700 transition-colors disabled:opacity-50 shadow-sm active:scale-[0.97]"
          >
            {loading ? t('content.saving') : isEdit ? t('content.saveChanges') : t('content.createItem')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard/content-items')}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors active:scale-[0.97]"
          >
            {t('content.cancel')}
          </button>
        </div>
      </form>
    </div>
  )
}

