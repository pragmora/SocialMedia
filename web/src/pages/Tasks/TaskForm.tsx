import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, useParams, Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '@/lib/apiClient'
import Loading from '@/components/Loading'
import { useToast } from '@/context/useToast'

interface TaskData {
  title: string
  description: string
  assignee_id: string | null
  start_date: string
  end_date: string
  content_item_id: string | null
  client_id: string | null
  project_id: string | null
  done: boolean
}

interface WorkspaceMember {
  user_id: string
  user: { id: string; email: string; name: string }
}

interface ContentItem { id: string; title: string }
interface Client { id: string; name: string }
interface Project { id: string; name: string }

export default function TaskForm() {
  const { t } = useTranslation()
  const showToast = useToast().showToast
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const returnTo = searchParams.get('return_to') || '/dashboard/tasks'

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [startDate, setStartDate] = useState(searchParams.get('start_date') ?? '')
  const [endDate, setEndDate] = useState('')
  const [contentItemId, setContentItemId] = useState(searchParams.get('content_item_id') ?? '')
  const [clientId, setClientId] = useState('')
  const [projectId, setProjectId] = useState(searchParams.get('project_id') ?? '')
  const [done, setDone] = useState(false)
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [contentItems, setContentItems] = useState<ContentItem[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEdit)
  const [error, setError] = useState('')

  useEffect(() => {
    apiClient.get<WorkspaceMember[]>('/members').then((res) => { if (res.data) setMembers(res.data) })
    apiClient.get<ContentItem[]>('/content-items').then((res) => { if (res.data) setContentItems(res.data) })
    apiClient.get<Client[]>('/clients').then((res) => { if (res.data) setClients(res.data) })
    apiClient.get<Project[]>('/projects').then((res) => { if (res.data) setProjects(res.data) })

    if (!isEdit) return
    apiClient.get<TaskData>(`/tasks/${id}`).then((res) => {
      if (res.data) {
        setTitle(res.data.title)
        setDescription(res.data.description ?? '')
        setAssigneeId(res.data.assignee_id ?? '')
        setStartDate(res.data.start_date ?? '')
        setEndDate(res.data.end_date ?? '')
        setContentItemId(res.data.content_item_id ?? '')
        setClientId(res.data.client_id ?? '')
        setProjectId(res.data.project_id ?? '')
        setDone(res.data.done)
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
      assignee_id: assigneeId || null,
      start_date: startDate || null,
      end_date: endDate || null,
      content_item_id: contentItemId || null,
      client_id: clientId || null,
      project_id: projectId || null,
      done,
    }

    const res = isEdit
      ? await apiClient.put<unknown>(`/tasks/${id}`, body)
      : await apiClient.post<unknown>('/tasks', body)

    setLoading(false)
    if (res.error) { setError(res.error.message); return }
    showToast(isEdit ? t('tasks.updated') : t('tasks.created'))
    navigate(returnTo)
  }

  if (fetching) {
    return <Loading />
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="mb-6">
        <Link to={returnTo} className="text-sm text-socialflow-600 dark:text-socialflow-400 hover:text-socialflow-700 dark:hover:text-socialflow-300 font-medium inline-flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          {t('tasks.backToTasks')}
        </Link>
      </div>

      <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">
        {isEdit ? t('tasks.editTask') : t('tasks.newTaskHeading')}
      </h2>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 md:p-7 shadow-sm">
        {error && (
          <div role="alert" className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300 mb-5">
            {error}
          </div>
        )}

        <div className="space-y-5">
          <label className="block">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5 block">{t('tasks.form.title')}</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-socialflow-500 focus:ring-2 focus:ring-socialflow-100 outline-none transition-all"
              placeholder={t('tasks.form.titlePlaceholder')}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5 block">{t('tasks.form.description')}</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-socialflow-500 focus:ring-2 focus:ring-socialflow-100 outline-none transition-all resize-none"
              placeholder={t('tasks.form.descriptionPlaceholder')}
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5 block">{t('tasks.form.startDate')}</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-socialflow-500 focus:ring-2 focus:ring-socialflow-100 outline-none transition-all"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5 block">{t('tasks.form.endDate')}</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-socialflow-500 focus:ring-2 focus:ring-socialflow-100 outline-none transition-all"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5 block">{t('tasks.form.contentItem')}</span>
              <select
                value={contentItemId}
                onChange={(e) => setContentItemId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-socialflow-500 focus:ring-2 focus:ring-socialflow-100 outline-none transition-all"
              >
                <option value="">{t('tasks.form.contentItemPlaceholder')}</option>
                {contentItems.map((item) => (
                  <option key={item.id} value={item.id}>{item.title}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5 block">{t('tasks.form.client')}</span>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-socialflow-500 focus:ring-2 focus:ring-socialflow-100 outline-none transition-all"
              >
                <option value="">{t('tasks.form.clientPlaceholder')}</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5 block">{t('tasks.form.project')}</span>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-socialflow-500 focus:ring-2 focus:ring-socialflow-100 outline-none transition-all"
              >
                <option value="">{t('tasks.form.noProject')}</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5 block">{t('tasks.form.assignee')}</span>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-socialflow-500 focus:ring-2 focus:ring-socialflow-100 outline-none transition-all"
              >
                <option value="">{t('tasks.form.noAssignee')}</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.user.name || m.user.email}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {isEdit && (
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={done}
                onChange={(e) => setDone(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-socialflow-600 dark:text-socialflow-400 focus:ring-socialflow-500"
              />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{t('tasks.form.markDone')}</span>
            </label>
          )}
        </div>

        <div className="flex gap-3 pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-socialflow-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-socialflow-700 transition-colors disabled:opacity-50 shadow-sm active:scale-[0.97]"
          >
            {loading ? t('tasks.saving') : isEdit ? t('tasks.saveChanges') : t('tasks.createTask')}
          </button>
          <button
            type="button"
            onClick={() => navigate(returnTo)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 px-6 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors active:scale-[0.97]"
          >
            {t('tasks.cancel')}
          </button>
        </div>
      </form>
    </div>
  )
}
