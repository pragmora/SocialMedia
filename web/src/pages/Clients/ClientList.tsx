import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '@/lib/apiClient'
import { resolveClientColor } from '@/lib/colors'
import { buildWhatsAppLink } from '@/lib/whatsapp'
import { useOptionalUser } from '@/context/useMe'
import { can } from '@/lib/permissions'

interface Client {
  id: string
  workspace_id: string
  workspace_name: string | null
  name: string
  social_handles: Record<string, string>
  notes: string
  phone: string
  email: string
  website: string
  active: boolean
  color: string | null
  created_at: string
}

function PhoneLink({ phone }: { phone: string }) {
  const { t } = useTranslation()
  const href = buildWhatsAppLink(phone)
  if (!href) {
    return <span className="text-slate-500 dark:text-slate-400">{phone || '—'}</span>
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={t('clients.whatsappTitle')}
      className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-emerald-600 font-medium rounded"
    >
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
      {phone}
    </a>
  )
}

export default function ClientList() {
  const { t } = useTranslation()
  const user = useOptionalUser()
  const canCreate = can(user, 'clients', 'create')
  const canEdit = can(user, 'clients', 'update')
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [workspaceFilter, setWorkspaceFilter] = useState('')

  useEffect(() => {
    apiClient.get<Client[]>('/clients?all=true').then((res) => {
      if (res.error) {
        setError(res.error.message)
      } else {
        setClients(res.data ?? [])
      }
      setLoading(false)
    })
  }, [])

  const workspaceOptions: { id: string; name: string }[] = []
  const seen = new Set<string>()
  for (const c of clients) {
    if (c.workspace_id && c.workspace_name && !seen.has(c.workspace_id)) {
      seen.add(c.workspace_id)
      workspaceOptions.push({ id: c.workspace_id, name: c.workspace_name })
    }
  }
  workspaceOptions.sort((a, b) => a.name.localeCompare(b.name))

  const visibleClients = workspaceFilter
    ? clients.filter((c) => c.workspace_id === workspaceFilter)
    : clients

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
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t('clients.title')}</h2>
        {canCreate && (
          <Link
            to="/dashboard/clients/new"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-socialflow-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-socialflow-700 transition-all shadow-sm active:scale-[0.97]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            {t('clients.newClient')}
          </Link>
        )}
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300 mb-4">
          {error}
        </div>
      )}

      {workspaceOptions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <select
            value={workspaceFilter}
            onChange={(e) => setWorkspaceFilter(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 focus:border-socialflow-500 focus:outline-none focus:ring-1 focus:ring-socialflow-500"
          >
            <option value="">{t('clients.allWorkspaces')}</option>
            {workspaceOptions.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
      )}

      {visibleClients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-12 sm:p-16 text-center">
          <div className="text-4xl mb-3 opacity-30">👥</div>
          <p className="text-slate-500 dark:text-slate-400">{t('clients.noClients')}</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('clients.table.name')}</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('clients.table.phone')}</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('clients.table.email')}</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('clients.table.active')}</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('clients.table.handles')}</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('clients.table.workspace')}</th>
                  <th className="text-right px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('clients.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {visibleClients.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: resolveClientColor(c.color) }}
                        />
                        <span className="text-slate-900 dark:text-slate-100 font-semibold">{c.name}</span>
                      </span>
                      {c.notes && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{c.notes}</p>}
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      {c.phone ? <PhoneLink phone={c.phone} /> : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      {c.email ? (
                        <a href={`mailto:${c.email}`} className="text-slate-600 dark:text-slate-300 hover:text-socialflow-600 dark:hover:text-socialflow-400 rounded">{c.email}</a>
                      ) : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      {c.active ? (
                        <span className="inline-flex items-center rounded-full bg-green-50 dark:bg-green-900/40 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:text-green-300 ring-1 ring-green-600/20">
                          {t('clients.active')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                          {t('clients.inactive')}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 text-xs">
                      {c.social_handles && Object.keys(c.social_handles).length > 0
                        ? Object.entries(c.social_handles).map(([k, v]) => (
                            <span key={k} className="mr-3">
                              <span className="font-medium text-slate-600 dark:text-slate-300">{k}:</span> {String(v)}
                            </span>
                          ))
                        : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      {c.workspace_name ? (
                        <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                          {c.workspace_name}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {canEdit && (
                        <Link
                          to={`/dashboard/clients/${c.id}/edit`}
                          className="text-xs text-socialflow-600 dark:text-socialflow-400 hover:text-socialflow-700 dark:hover:text-socialflow-300 font-semibold"
                        >
                          {t('clients.edit')}
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {visibleClients.map((c) => (
              <div key={c.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 card-hover shadow-sm">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="inline-flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100 text-sm">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: resolveClientColor(c.color) }}
                    />
                    {c.name}
                  </h3>
                  {c.active ? (
                    <span className="shrink-0 inline-flex items-center rounded-full bg-green-50 dark:bg-green-900/40 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:text-green-300 ring-1 ring-green-600/20">
                      {t('clients.active')}
                    </span>
                  ) : (
                    <span className="shrink-0 inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                      {t('clients.inactive')}
                    </span>
                  )}
                </div>
                {c.social_handles && Object.keys(c.social_handles).length > 0 && (
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mb-2">
                    {Object.entries(c.social_handles).map(([k, v]) => (
                      <span key={k}><span className="font-medium">{k}:</span> {String(v)}</span>
                    ))}
                  </div>
                )}
                {c.workspace_name && (
                  <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300 mb-2">
                    {c.workspace_name}
                  </span>
                )}
                {(c.phone || c.email) && (
                  <div className="flex flex-col gap-1 text-xs mb-2">
                    {c.phone && <PhoneLink phone={c.phone} />}
                    {c.email && <a href={`mailto:${c.email}`} className="text-slate-600 dark:text-slate-300 hover:text-socialflow-600 dark:hover:text-socialflow-400 rounded">{c.email}</a>}
                  </div>
                )}
                {c.notes && <p className="text-xs text-slate-400 line-clamp-2">{c.notes}</p>}
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  {canEdit && (
                    <Link
                      to={`/dashboard/clients/${c.id}/edit`}
                      className="text-xs font-semibold text-socialflow-600 dark:text-socialflow-400 hover:text-socialflow-700 dark:hover:text-socialflow-300"
                    >
                      {t('clients.edit')}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
