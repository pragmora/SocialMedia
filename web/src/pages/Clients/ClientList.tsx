import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '@/lib/apiClient'

interface Client {
  id: string
  workspace_id: string
  name: string
  social_handles: Record<string, string>
  notes: string
  active: boolean
  created_at: string
}

export default function ClientList() {
  const { t } = useTranslation()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    apiClient.get<Client[]>('/clients').then((res) => {
      if (res.error) {
        setError(res.error.message)
      } else {
        setClients(res.data ?? [])
      }
      setLoading(false)
    })
  }, [])

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
        <h2 className="text-2xl font-bold text-slate-900">{t('clients.title')}</h2>
        <Link
          to="/dashboard/clients/new"
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-socialflow-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-socialflow-700 transition-all shadow-sm active:scale-[0.97]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          {t('clients.newClient')}
        </Link>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      {clients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 sm:p-16 text-center">
          <div className="text-4xl mb-3 opacity-30">👥</div>
          <p className="text-slate-500">{t('clients.noClients')}</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">{t('clients.table.name')}</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">{t('clients.table.active')}</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">{t('clients.table.handles')}</th>
                  <th className="text-right px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">{t('clients.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clients.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="text-slate-900 font-semibold">{c.name}</span>
                      {c.notes && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{c.notes}</p>}
                    </td>
                    <td className="px-5 py-3.5">
                      {c.active ? (
                        <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-green-600/20">
                          {t('clients.active')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                          {t('clients.inactive')}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">
                      {c.social_handles && Object.keys(c.social_handles).length > 0
                        ? Object.entries(c.social_handles).map(([k, v]) => (
                            <span key={k} className="mr-3">
                              <span className="font-medium text-slate-600">{k}:</span> {String(v)}
                            </span>
                          ))
                        : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        to={`/dashboard/clients/${c.id}/edit`}
                        className="text-xs text-socialflow-600 hover:text-socialflow-700 font-semibold"
                      >
                        {t('clients.edit')}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {clients.map((c) => (
              <div key={c.id} className="bg-white rounded-xl border border-slate-200/80 p-4 card-hover shadow-sm">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-slate-900 text-sm">{c.name}</h3>
                  {c.active ? (
                    <span className="shrink-0 inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700 ring-1 ring-green-600/20">
                      {t('clients.active')}
                    </span>
                  ) : (
                    <span className="shrink-0 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                      {t('clients.inactive')}
                    </span>
                  )}
                </div>
                {c.social_handles && Object.keys(c.social_handles).length > 0 && (
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 mb-2">
                    {Object.entries(c.social_handles).map(([k, v]) => (
                      <span key={k}><span className="font-medium">{k}:</span> {String(v)}</span>
                    ))}
                  </div>
                )}
                {c.notes && <p className="text-xs text-slate-400 line-clamp-2">{c.notes}</p>}
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <Link
                    to={`/dashboard/clients/${c.id}/edit`}
                    className="text-xs font-semibold text-socialflow-600 hover:text-socialflow-700"
                  >
                    {t('clients.edit')}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
