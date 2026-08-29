import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useMe } from '@/context/MeContext'
import apiClient from '@/lib/apiClient'

interface Workspace {
  id: string
  name: string
}

export default function WorkspaceSwitcher() {
  const { t } = useTranslation()
  const { user, switchWorkspace } = useMe()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [open, setOpen] = useState(false)
  const [switching, setSwitching] = useState(false)

  useEffect(() => {
    async function load() {
      const res = await apiClient.get<Workspace[]>('/workspaces')
      if (res.data) setWorkspaces(res.data)
    }
    load()
  }, [])

  const currentWs = workspaces.find((w) => w.id === user?.active_workspace_id)

  useEffect(() => {
    if (!open) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  async function handleSwitch(wsId: string) {
    if (wsId === user?.active_workspace_id) { setOpen(false); return }
    setSwitching(true)
    await switchWorkspace(wsId)
    setSwitching(false)
    setOpen(false)
  }

  if (!user) return null

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={switching}
        className="flex items-center gap-1.5 w-full rounded-lg border border-slate-800/60 bg-slate-900/50 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800/60 hover:text-slate-200 transition-all disabled:opacity-50"
      >
        <svg className="w-3.5 h-3.5 shrink-0 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <span className="truncate flex-1 text-left">{currentWs ? currentWs.name : t('workspace.noWorkspace')}</span>
        <svg className={`w-3 h-3 text-slate-500 dark:text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 mt-1.5 rounded-xl border border-slate-800/60 bg-slate-900 shadow-xl shadow-black/20 z-50 overflow-hidden">
            <div className="px-3.5 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('workspace.switchLabel')}</div>
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => handleSwitch(ws.id)}
                aria-label={ws.id === user.active_workspace_id ? `${ws.name} (${t('workspace.active')})` : ws.name}
                className={`w-full text-left px-3.5 py-2 text-xs transition-colors ${
                  ws.id === user.active_workspace_id
                    ? 'font-semibold text-socialflow-300 bg-socialflow-600/10'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                {ws.name}
                {ws.id === user.active_workspace_id && (
                  <span className="ml-2 text-[10px] text-socialflow-500 dark:text-socialflow-400">({t('workspace.active')})</span>
                )}
              </button>
            ))}
            {workspaces.length === 0 && (
              <p className="px-3.5 py-3 text-xs text-slate-500 dark:text-slate-400">{t('workspace.empty')}</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
