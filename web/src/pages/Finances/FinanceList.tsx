import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '@/lib/apiClient'
import { useOptionalUser } from '@/context/useMe'
import { can } from '@/lib/permissions'
import { getMovementStatusLabel, getPaymentMethodLabel } from '@/lib/labels'
import { formatCurrency } from '@/lib/utils'
import ConfirmDialog from '@/components/ConfirmDialog'

interface Payment {
  id: string
  client_id: string | null
  client_name: string | null
  project_id: string | null
  project_name: string | null
  amount: number
  payment_date: string
  payment_method: string
  status: string
  notes: string
  is_spent: boolean
}

interface Client {
  id: string
  name: string
}

interface Project {
  id: string
  name: string
}

export default function FinanceList() {
  const { t } = useTranslation()
  const user = useOptionalUser()
  const canCreate = can(user, 'finances', 'create')
  const canUpdate = can(user, 'finances', 'update')
  const canDelete = can(user, 'finances', 'delete')

  const [payments, setPayments] = useState<Payment[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [clientIdFilter, setClientIdFilter] = useState('')
  const [projectIdFilter, setProjectIdFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    setError('')

    const params = new URLSearchParams()
    if (clientIdFilter) params.set('client_id', clientIdFilter)
    if (projectIdFilter) params.set('project_id', projectIdFilter)
    if (typeFilter !== 'all') params.set('is_spent', String(typeFilter === 'expense'))
    if (startDate) params.set('start_date', startDate)
    if (endDate) params.set('end_date', endDate)

    const qs = params.toString()
    const path = `/payments${qs ? `?${qs}` : ''}`

    const res = await apiClient.get<Payment[]>(path)
    if (res.error) {
      setError(res.error.message)
    } else {
      setPayments(res.data ?? [])
    }
    setLoading(false)
  }, [clientIdFilter, projectIdFilter, typeFilter, startDate, endDate])

  useEffect(() => {
    apiClient.get<Client[]>('/clients').then((res) => {
      if (res.data) setClients(res.data)
    })
    apiClient.get<Project[]>('/projects').then((res) => {
      if (res.data) setProjects(res.data)
    })
  }, [])

  useEffect(() => {
    queueMicrotask(fetchPayments)
  }, [fetchPayments])

  const totalIncome = payments.filter((p) => !p.is_spent).reduce((sum, p) => sum + p.amount, 0)
  const totalExpenses = payments.filter((p) => p.is_spent).reduce((sum, p) => sum + p.amount, 0)
  const totalPaid = payments.filter((p) => !p.is_spent && p.status === 'paid').reduce((sum, p) => sum + p.amount, 0)
  const totalPending = payments.filter((p) => !p.is_spent && p.status === 'pending').reduce((sum, p) => sum + p.amount, 0)
  const balance = totalIncome - totalExpenses

  const handleDelete = async (id: string) => {
    setDeleteId(null)
    const res = await apiClient.delete(`/payments/${id}`)
    if (res.error) {
      setError(res.error.message)
    } else {
      setPayments((prev) => prev.filter((p) => p.id !== id))
    }
  }

  const handleToggleStatus = async (id: string) => {
    const res = await apiClient.patch<Payment>(`/payments/${id}/toggle-status`)
    if (res.error) {
      setError(res.error.message)
    } else if (res.data) {
      setPayments((prev) => prev.map((p) => (p.id === id ? { ...p, status: res.data!.status } : p)))
    }
  }

  if (loading && payments.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-socialflow-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t('finances.title')}</h2>
        <div className="flex items-center gap-2">
          {canCreate && (
            <Link
              to="/dashboard/finances/new"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-socialflow-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-socialflow-700 transition-all shadow-sm active:scale-[0.97]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              {t('finances.newMovement')}
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300 mb-4">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-sm mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{t('finances.filter.type')}</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-socialflow-500 focus:ring-1 focus:ring-socialflow-500 outline-none transition-colors"
            >
              <option value="all">{t('finances.filter.allTypes')}</option>
              <option value="income">{t('finances.type.income')}</option>
              <option value="expense">{t('finances.type.expense')}</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{t('finances.filter.client')}</label>
            <select
              value={clientIdFilter}
              onChange={(e) => setClientIdFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-socialflow-500 focus:ring-1 focus:ring-socialflow-500 outline-none transition-colors"
            >
              <option value="">{t('finances.filter.allClients')}</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{t('finances.filter.project')}</label>
            <select
              value={projectIdFilter}
              onChange={(e) => setProjectIdFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-socialflow-500 focus:ring-1 focus:ring-socialflow-500 outline-none transition-colors"
            >
              <option value="">{t('finances.filter.allProjects')}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{t('finances.filter.startDate')}</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-socialflow-500 focus:ring-1 focus:ring-socialflow-500 outline-none transition-colors"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{t('finances.filter.endDate')}</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-socialflow-500 focus:ring-1 focus:ring-socialflow-500 outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-sm mb-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs font-medium text-green-600 uppercase tracking-wider mb-1">{t('finances.totalIncome')}</p>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">{formatCurrency(totalIncome)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">{t('finances.totalExpenses')}</p>
            <p className="text-2xl font-bold text-red-700 dark:text-red-300">{formatCurrency(totalExpenses)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{t('finances.totalPaid')}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{formatCurrency(totalPaid)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-amber-600 uppercase tracking-wider mb-1">{t('finances.totalPending')}</p>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{formatCurrency(totalPending)}</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('finances.balance')}</p>
          <p className={`text-xl font-bold ${balance >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
            {formatCurrency(balance)}
          </p>
        </div>
      </div>

      {payments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-12 sm:p-16 text-center">
          <div className="text-4xl mb-3 opacity-30">💰</div>
          <p className="text-slate-500 dark:text-slate-400">{t('finances.noPayments')}</p>
        </div>
      ) : (
        <>
          <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('finances.table.type')}</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('finances.table.client')}</th>
                  <th className="text-right px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('finances.table.amount')}</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('finances.table.date')}</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('finances.table.method')}</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('finances.table.project')}</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('finances.table.status')}</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('finances.table.notes')}</th>
                  <th className="text-right px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('finances.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        p.is_spent ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300' : 'bg-green-50 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                      }`}>
                        {p.is_spent ? t('finances.type.expense') : t('finances.type.income')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-900 dark:text-slate-100 font-semibold">{p.is_spent ? '—' : (p.client_name || '—')}</td>
                    <td className={`px-5 py-3.5 text-right font-semibold ${p.is_spent ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}`}>
                      {p.is_spent ? '−' : ''}{formatCurrency(p.amount)}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{new Date(p.payment_date).toLocaleDateString('es-AR')}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                        {getPaymentMethodLabel(p.payment_method)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-slate-400">{p.project_name || '—'}</td>
                    <td className="px-5 py-3.5">
                      {p.is_spent ? (
                        <span className="text-xs text-slate-400">{getMovementStatusLabel(p.status, p.is_spent)}</span>
                      ) : canUpdate ? (
                        <button
                          onClick={() => handleToggleStatus(p.id)}
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${
                            p.status === 'paid'
                              ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 hover:bg-green-200'
                              : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 hover:bg-amber-200'
                          }`}
                        >
                          {getMovementStatusLabel(p.status, p.is_spent)}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">{getMovementStatusLabel(p.status, p.is_spent)}</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 text-xs truncate max-w-[200px]">{p.notes || '—'}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-3">
                        {canUpdate && (
                          <Link
                            to={`/dashboard/finances/${p.id}/edit`}
                            className="text-xs text-socialflow-600 dark:text-socialflow-400 hover:text-socialflow-700 dark:hover:text-socialflow-300 font-semibold"
                          >
                            {t('finances.edit')}
                          </Link>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setDeleteId(p.id)}
                            className="text-xs text-red-500 hover:text-red-700 font-semibold"
                          >
                            {t('finances.delete')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {payments.map((p) => (
              <div key={p.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 card-hover shadow-sm">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium mb-1.5 ${
                      p.is_spent ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300' : 'bg-green-50 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                    }`}>
                      {p.is_spent ? t('finances.type.expense') : t('finances.type.income')}
                    </span>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">{p.is_spent ? (p.project_name || t('finances.type.expense')) : (p.client_name || '—')}</h3>
                  </div>
                  <span className={`shrink-0 text-sm font-bold ${p.is_spent ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}`}>
                    {p.is_spent ? '−' : ''}{formatCurrency(p.amount)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mb-2">
                  <span>{new Date(p.payment_date).toLocaleDateString('es-AR')}</span>
                  <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                    {getPaymentMethodLabel(p.payment_method)}
                  </span>
                  {p.project_name && <span>{p.project_name}</span>}
                  {!p.is_spent && (
                    canUpdate ? (
                      <button
                        onClick={() => handleToggleStatus(p.id)}
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                          p.status === 'paid'
                            ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 hover:bg-green-200'
                            : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 hover:bg-amber-200'
                        }`}
                      >
                        {getMovementStatusLabel(p.status, p.is_spent)}
                      </button>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                        {getMovementStatusLabel(p.status, p.is_spent)}
                      </span>
                    )
                  )}
                </div>
                {p.notes && <p className="text-xs text-slate-400 line-clamp-2">{p.notes}</p>}
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
                  {canUpdate && (
                    <Link
                      to={`/dashboard/finances/${p.id}/edit`}
                      className="text-xs font-semibold text-socialflow-600 dark:text-socialflow-400 hover:text-socialflow-700 dark:hover:text-socialflow-300"
                    >
                      {t('finances.edit')}
                    </Link>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => setDeleteId(p.id)}
                      className="text-xs font-semibold text-red-500 hover:text-red-700"
                    >
                      {t('finances.delete')}
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
        title={t('finances.delete')}
        message={t('finances.confirmDelete')}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
