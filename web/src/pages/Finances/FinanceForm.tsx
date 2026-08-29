import { useState, useEffect, useRef, type FormEvent } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '@/lib/apiClient'
import { getMovementStatusLabel, PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from '@/lib/labels'

/**
 * Regla de dominio: un egreso (is_spent=true) siempre está cobrado.
 * Única fuente de verdad para sincronizar tipo y estado; el backend
 * aplica la misma normalización de forma independiente.
 */
function resolveStatus(isSpent: boolean, status?: string | null): string {
  return isSpent ? 'paid' : status || 'pending'
}

interface FinanceData {
  amount: number
  payment_date: string
  payment_method: string
  status: string
  notes: string
  client_id: string | null
  project_id: string | null
  is_spent: boolean
}

interface ClientOption { id: string; name: string }
interface ProjectOption { id: string; name: string }

export default function FinanceForm() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [isSpent, setIsSpent] = useState(false)
  const [amount, setAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10))
  const [paymentMethod, setPaymentMethod] = useState('transferencia')
  const [status, setStatus] = useState('pending')
  const [notes, setNotes] = useState('')
  const [clientId, setClientId] = useState('')
  const [projectId, setProjectId] = useState('')
  const lastPaymentStatusRef = useRef('pending')
  const [clients, setClients] = useState<ClientOption[]>([])
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEdit)
  const [error, setError] = useState('')

  useEffect(() => {
    apiClient.get<ClientOption[]>('/clients').then((res) => { if (res.data) setClients(res.data) })
    apiClient.get<ProjectOption[]>('/projects').then((res) => { if (res.data) setProjects(res.data) })

    if (!isEdit) return
    apiClient.get<FinanceData>(`/payments/${id}`).then((res) => {
      if (res.data) {
        const spent = !!res.data.is_spent
        const loadedStatus = resolveStatus(spent, res.data.status)
        setIsSpent(spent)
        setAmount(String(res.data.amount ?? ''))
        setPaymentDate(res.data.payment_date?.slice(0, 10) ?? '')
        setPaymentMethod(res.data.payment_method ?? 'transferencia')
        setStatus(loadedStatus)
        if (!spent) lastPaymentStatusRef.current = loadedStatus
        setNotes(res.data.notes ?? '')
        setClientId(res.data.client_id ?? '')
        setProjectId(res.data.project_id ?? '')
      } else if (res.error) {
        setError(res.error.message)
      }
      setFetching(false)
    })
  }, [id, isEdit])

  /**
   * Único punto de sincronización tipo → estado.
   * Egreso fuerza Cobrado; al volver a Pago se restaura el último estado de pago.
   */
  function handleTypeChange(nextIsSpent: boolean) {
    setIsSpent(nextIsSpent)
    if (nextIsSpent) {
      lastPaymentStatusRef.current = resolveStatus(false, status)
      setStatus(resolveStatus(true))
    } else {
      setStatus(resolveStatus(false, lastPaymentStatusRef.current))
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const body: Record<string, unknown> = {
      amount: Number(amount),
      payment_date: paymentDate || null,
      payment_method: paymentMethod,
      status: resolveStatus(isSpent, status),
      notes,
      client_id: isSpent ? null : (clientId || null),
      project_id: projectId || null,
      is_spent: isSpent,
    }

    const res = isEdit
      ? await apiClient.put<unknown>(`/payments/${id}`, body)
      : await apiClient.post<unknown>('/payments', body)

    setLoading(false)
    if (res.error) { setError(res.error.message); return }
    navigate('/dashboard/finances')
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-socialflow-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="mb-6">
        <Link to="/dashboard/finances" className="text-sm text-socialflow-600 dark:text-socialflow-400 hover:text-socialflow-700 dark:hover:text-socialflow-300 font-medium inline-flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          {t('finances.title')}
        </Link>
      </div>

      <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">
        {isEdit ? t('finances.edit') : isSpent ? t('finances.newExpense') : t('finances.new')}
      </h2>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 md:p-7 shadow-sm">
        {error && (
          <div role="alert" className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300 mb-5">
            {error}
          </div>
        )}

        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleTypeChange(false)}
              className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
                !isSpent
                  ? 'border-socialflow-600 bg-socialflow-50 dark:bg-socialflow-900/30 text-socialflow-700 dark:text-socialflow-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              💰 {t('finances.type.income')}
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange(true)}
              className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
                isSpent
                  ? 'border-red-300 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              💸 {t('finances.type.expense')}
            </button>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5 block">{t('finances.form.amount')}</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              autoFocus
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-socialflow-500 focus:ring-2 focus:ring-socialflow-100 outline-none transition-all"
              placeholder={t('finances.form.amountPlaceholder')}
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5 block">{t('finances.form.paymentDate')}</span>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-socialflow-500 focus:ring-2 focus:ring-socialflow-100 outline-none transition-all"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5 block">{t('finances.form.paymentMethod')}</span>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-socialflow-500 focus:ring-2 focus:ring-socialflow-100 outline-none transition-all"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5 block">{t('finances.form.status')}</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={isSpent}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-socialflow-500 focus:ring-2 focus:ring-socialflow-100 outline-none transition-all disabled:cursor-not-allowed disabled:opacity-60"
              >
                {/* `paid` es contextual: Cobrado para pagos, Pagado para egresos */}
                <option value="pending">{getMovementStatusLabel('pending', false)}</option>
                <option value="paid">{getMovementStatusLabel('paid', isSpent)}</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5 block">{t('finances.form.project')}</span>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-socialflow-500 focus:ring-2 focus:ring-socialflow-100 outline-none transition-all"
              >
                <option value="">{t('finances.form.noProject')}</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
          </div>

          {!isSpent && (
            <label className="block">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5 block">{t('finances.form.client')}</span>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-socialflow-500 focus:ring-2 focus:ring-socialflow-100 outline-none transition-all"
              >
                <option value="">{t('finances.form.clientPlaceholder')}</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
          )}

          <label className="block">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5 block">{t('finances.form.notes')}</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-socialflow-500 focus:ring-2 focus:ring-socialflow-100 outline-none transition-all resize-none"
              placeholder={t('finances.form.notesPlaceholder')}
            />
          </label>
        </div>

        <div className="flex gap-3 pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-socialflow-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-socialflow-700 transition-colors disabled:opacity-50 shadow-sm active:scale-[0.97]"
          >
            {loading ? t('finances.saving') : isEdit ? t('finances.saveChanges') : isSpent ? t('finances.createExpense') : t('finances.createPayment')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard/finances')}
            className="rounded-xl border border-slate-200 dark:border-slate-700 px-6 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors active:scale-[0.97]"
          >
            {t('finances.cancel')}
          </button>
        </div>
      </form>
    </div>
  )
}
