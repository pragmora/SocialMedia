import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '@/lib/apiClient'
import Loading from '@/components/Loading'
import { CLIENT_COLOR_PALETTE, isValidHexColor } from '@/lib/colors'
import { useToast } from '@/context/useToast'

interface ClientData {
  name: string
  notes: string
  phone: string
  email: string
  website: string
  active: boolean
  color: string
}

export default function ClientForm() {
  const { t } = useTranslation()
  const showToast = useToast().showToast
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [active, setActive] = useState(true)
  const [color, setColor] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEdit)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isEdit) return
    apiClient.get<ClientData>(`/clients/${id}`).then((res) => {
      if (res.data) {
        setName(res.data.name)
        setNotes(res.data.notes ?? '')
        setPhone(res.data.phone ?? '')
        setEmail(res.data.email ?? '')
        setWebsite(res.data.website ?? '')
        setActive(res.data.active)
        if (isValidHexColor(res.data.color)) {
          setColor(res.data.color)
        }
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

    const body = { name, notes, phone, email, website, active, color: isValidHexColor(color) ? color : null }
    const res = isEdit
      ? await apiClient.put<unknown>(`/clients/${id}`, body)
      : await apiClient.post<unknown>('/clients', body)

    setLoading(false)

    if (res.error) {
      setError(res.error.message)
      return
    }

    showToast(isEdit ? t('clients.updated') : t('clients.created'))
    navigate('/dashboard/clients')
  }

  if (fetching) {
    return <Loading />
  }

  return (
    <div className="max-w-xl mx-auto animate-fade-in">
      <div className="mb-6">
        <Link to="/dashboard/clients" className="text-sm text-socialflow-600 dark:text-socialflow-400 hover:text-socialflow-700 dark:hover:text-socialflow-300 font-medium inline-flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          {t('clients.title')}
        </Link>
      </div>

      <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">
        {isEdit ? t('clients.editClient') : t('clients.newClientHeading')}
      </h2>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 md:p-7 shadow-sm">
        {error && (
          <div role="alert" className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300 mb-5">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('clients.name')}</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-sm focus:border-socialflow-500 focus:outline-none focus:ring-1 focus:ring-socialflow-500"
              placeholder={t('clients.namePlaceholder')}
            />
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('clients.color')}</span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setColor('')}
                title={t('clients.colorNone')}
                className={`h-8 w-8 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-socialflow-500 flex items-center justify-center ${
                  color === '' ? 'ring-2 ring-offset-2 ring-slate-800 scale-110' : ''
                }`}
                aria-label={t('clients.colorNone')}
              >
                <span className="w-3 h-0.5 rotate-45 bg-slate-400 rounded-full" />
              </button>
              {CLIENT_COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  title={c}
                  className={`h-8 w-8 rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-socialflow-500 ${
                    color === c ? 'ring-2 ring-offset-2 ring-slate-800 scale-110' : ''
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
              <label className="flex items-center gap-1.5 cursor-pointer ml-1" title={t('clients.colorCustom')}>
                <input
                  type="color"
                  value={isValidHexColor(color) ? color : '#4F46E5'}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-8 w-10 cursor-pointer rounded-md border border-slate-200 dark:border-slate-700 bg-transparent p-0.5"
                />
                <span className="text-xs text-slate-500 dark:text-slate-400">{t('clients.colorCustom')}</span>
              </label>
            </div>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('clients.notes')}</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-sm focus:border-socialflow-500 focus:outline-none focus:ring-1 focus:ring-socialflow-500 resize-none"
              placeholder={t('clients.notesPlaceholder')}
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('clients.phone')}</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-sm focus:border-socialflow-500 focus:outline-none focus:ring-1 focus:ring-socialflow-500"
                placeholder={t('clients.phonePlaceholder')}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('clients.email')}</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-sm focus:border-socialflow-500 focus:outline-none focus:ring-1 focus:ring-socialflow-500"
                placeholder={t('clients.emailPlaceholder')}
              />
            </label>

            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('clients.website')}</span>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-sm focus:border-socialflow-500 focus:outline-none focus:ring-1 focus:ring-socialflow-500"
                placeholder={t('clients.websitePlaceholder')}
              />
            </label>
          </div>

          <label className="flex items-center gap-2.5 pt-1">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-socialflow-600 dark:text-socialflow-400 focus:ring-socialflow-500"
            />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('clients.active')}</span>
          </label>
        </div>

        <div className="flex gap-3 pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-socialflow-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-socialflow-700 transition-colors disabled:opacity-50 shadow-sm active:scale-[0.97]"
          >
            {loading ? t('clients.saving') : isEdit ? t('clients.saveChanges') : t('clients.createClient')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard/clients')}
            className="rounded-xl border border-slate-200 dark:border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors active:scale-[0.97]"
          >
            {t('clients.cancel')}
          </button>
        </div>
      </form>
    </div>
  )
}
