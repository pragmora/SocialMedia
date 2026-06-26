import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '@/lib/apiClient'

interface ClientData {
  name: string
  notes: string
  active: boolean
}

export default function ClientForm() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [active, setActive] = useState(true)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEdit)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isEdit) return
    apiClient.get<ClientData>(`/clients/${id}`).then((res) => {
      if (res.data) {
        setName(res.data.name)
        setNotes(res.data.notes ?? '')
        setActive(res.data.active)
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

    const body = { name, notes, active }
    const res = isEdit
      ? await apiClient.put<unknown>(`/clients/${id}`, body)
      : await apiClient.post<unknown>('/clients', body)

    setLoading(false)

    if (res.error) {
      setError(res.error.message)
      return
    }

    navigate('/dashboard/clients')
  }

  if (fetching) {
    return <p className="text-gray-500 p-4">{t('app.loading')}</p>
  }

  return (
    <div className="max-w-lg">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        {isEdit ? t('clients.editClient') : t('clients.newClientHeading')}
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">{t('clients.name')}</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-socialflow-500 focus:outline-none focus:ring-1 focus:ring-socialflow-500"
            placeholder={t('clients.namePlaceholder')}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">{t('clients.notes')}</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-socialflow-500 focus:outline-none focus:ring-1 focus:ring-socialflow-500"
            placeholder={t('clients.notesPlaceholder')}
          />
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="rounded border-gray-300 text-socialflow-600 focus:ring-socialflow-500"
          />
          <span className="text-sm text-gray-700">{t('clients.active')}</span>
        </label>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-socialflow-600 px-4 py-2 text-sm font-medium text-white hover:bg-socialflow-700 transition-colors disabled:opacity-50"
          >
            {loading ? t('clients.saving') : isEdit ? t('clients.saveChanges') : t('clients.createClient')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard/clients')}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {t('clients.cancel')}
          </button>
        </div>
      </form>
    </div>
  )
}
