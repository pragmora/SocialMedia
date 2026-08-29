import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MeProvider, useMe } from '@/context/MeContext'
import { ToastProvider } from '@/context/ToastContext'
import { ThemeProvider } from '@/context/ThemeProvider'
import { getRoleLabel } from '@/lib/labels'
import apiClient from '@/lib/apiClient'
import ThemeToggle from '@/components/ThemeToggle'
import { useTheme } from '@/context/useTheme'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import WorkspaceSwitcher from '@/components/WorkspaceSwitcher'
import ClientList from '@/pages/Clients/ClientList'
import ClientForm from '@/pages/Clients/ClientForm'
import ContentList from '@/pages/ContentItems/ContentList'
import ContentForm from '@/pages/ContentItems/ContentForm'
import ContentDetail from '@/pages/ContentItems/ContentDetail'
import Dashboard from '@/pages/Dashboard/Dashboard'
import Calendar from '@/pages/Calendar/Calendar'
import TaskList from '@/pages/Tasks/TaskList'
import TaskForm from '@/pages/Tasks/TaskForm'
import TaskDetail from '@/pages/Tasks/TaskDetail'
import ProjectList from '@/pages/Projects/ProjectList'
import ProjectForm from '@/pages/Projects/ProjectForm'
import MemberList from '@/pages/Members/MemberList'
import InviteClaim from '@/pages/InviteClaim'
import FinancesList from '@/pages/Finances/FinanceList'
import FinanceForm from '@/pages/Finances/FinanceForm'

function Home() {
  const { t } = useTranslation()
  return (
    <div className="min-h-screen bg-[#faf9f6] dark:bg-slate-950 flex flex-col items-center justify-center gap-6 px-4"
      style={{ backgroundImage: 'radial-gradient(ellipse at 30% 20%, rgba(76,110,245,0.06) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(249,115,22,0.04) 0%, transparent 60%)' }}>
      <ThemeToggle className="fixed top-4 right-4 z-40 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 bg-white/70 dark:bg-slate-800/70 backdrop-blur shadow-sm" />
      <h1 className="text-5xl md:text-6xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t('app.title')}</h1>
      <p className="text-lg text-slate-500 dark:text-slate-400 max-w-md text-center leading-relaxed">
        {t('app.tagline')}
      </p>
      <div className="flex gap-4 mt-2">
        <a href="/login" className="rounded-xl bg-socialflow-600 px-7 py-3 text-white font-semibold hover:bg-socialflow-700 transition-all duration-200 shadow-lg shadow-socialflow-600/20 hover:shadow-xl hover:shadow-socialflow-600/30 active:scale-[0.97]">
          {t('auth.logIn')}
        </a>
        <a href="/register" className="rounded-xl border-2 border-slate-200 dark:border-slate-700 px-7 py-3 text-slate-700 dark:text-slate-300 font-semibold hover:border-slate-300 hover:bg-white dark:hover:border-slate-600 dark:hover:bg-slate-900 transition-all duration-200 active:scale-[0.97]">
          {t('auth.register')}
        </a>
      </div>
    </div>
  )
}

/* ── No workspace screen ─────────────────────────────────────── */

function NoWorkspaceScreen() {
  const { t } = useTranslation()
  const { reauthenticate, switchWorkspace } = useMe()
  const [mode, setMode] = useState<'create' | 'join'>('create')
  const [name, setName] = useState('')
  const [inviteInput, setInviteInput] = useState('')
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')

  function extractToken(input: string): string {
    const trimmed = input.trim()
    const match = trimmed.match(/\/invite\/([A-Za-z0-9]+)$/)
    if (match) return match[1]
    return trimmed
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    setError('')
    const res = await apiClient.post<{ id: string; name: string }>('/workspaces', { name: name.trim() })
    if (res.error) {
      setError(res.error.message)
      setCreating(false)
      return
    }
    if (res.data) {
      await switchWorkspace(res.data.id)
    } else {
      await reauthenticate()
    }
    setCreating(false)
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    const token = extractToken(inviteInput)
    if (!token) return
    setJoining(true)
    setError('')
    const res = await apiClient.post<{ workspace_id: string }>(`/invites/${token}/claim`)
    setJoining(false)
    if (res.error) {
      setError(res.error.message)
      return
    }
    if (res.data?.workspace_id) {
      await switchWorkspace(res.data.workspace_id)
    } else {
      await reauthenticate()
    }
  }

  return (
    <div className="min-h-screen bg-[#faf9f6] dark:bg-slate-950 flex items-center justify-center px-4"
      style={{ backgroundImage: 'radial-gradient(ellipse at 30% 20%, rgba(76,110,245,0.06) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(249,115,22,0.04) 0%, transparent 60%)' }}>
      <ThemeToggle className="fixed top-4 right-4 z-40 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 bg-white/70 dark:bg-slate-800/70 backdrop-blur shadow-sm" />
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-socialflow-500 to-socialflow-700 flex items-center justify-center text-white font-bold text-lg mx-auto mb-4 shadow-lg shadow-socialflow-600/20">
            S
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t('workspace.noWorkspaceTitle')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('workspace.noWorkspaceSubtitle')}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm">
          <div className="flex gap-1.5 mb-5 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
            <button
              type="button"
              onClick={() => { setMode('create'); setError('') }}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                mode === 'create'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {t('workspace.createTab')}
            </button>
            <button
              type="button"
              onClick={() => { setMode('join'); setError('') }}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                mode === 'join'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {t('workspace.joinTab')}
            </button>
          </div>

          {error && (
            <div role="alert" className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-400 mb-4">
              {error}
            </div>
          )}

          {mode === 'create' ? (
            <form onSubmit={handleCreate}>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('workspace.createName')}</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-socialflow-500 focus:outline-none focus:ring-1 focus:ring-socialflow-500"
                  placeholder={t('workspace.createNamePlaceholder')}
                />
              </label>
              <button
                type="submit"
                disabled={creating}
                className="w-full rounded-xl bg-socialflow-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-socialflow-700 transition-colors disabled:opacity-50 mt-5 shadow-sm active:scale-[0.98]"
              >
                {creating ? t('workspace.creating') : t('workspace.create')}
              </button>
              <p className="mt-4 text-xs text-slate-400 leading-relaxed">{t('workspace.noWorkspaceHint')}</p>
            </form>
          ) : (
            <form onSubmit={handleJoin}>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('workspace.joinInvite')}</span>
                <input
                  type="text"
                  value={inviteInput}
                  onChange={(e) => setInviteInput(e.target.value)}
                  required
                  autoFocus
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-socialflow-500 focus:outline-none focus:ring-1 focus:ring-socialflow-500"
                  placeholder={t('workspace.joinInvitePlaceholder')}
                />
              </label>
              <button
                type="submit"
                disabled={joining}
                className="w-full rounded-xl bg-socialflow-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-socialflow-700 transition-colors disabled:opacity-50 mt-5 shadow-sm active:scale-[0.98]"
              >
                {joining ? t('workspace.joining') : t('workspace.join')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── SVG Icons ────────────────────────────────────────────── */

const icons = {
  dashboard: (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  ),
  content: (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  ),
  projects: (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
  ),
  clients: (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
  ),
  tasks: (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  calendar: (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  ),
  members: (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
  logout: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </svg>
  ),
  finances: (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
}

const iconMap: Record<string, React.ReactNode> = {
  dashboard: icons.dashboard,
  content: icons.content,
  projects: icons.projects,
  clients: icons.clients,
  tasks: icons.tasks,
  calendar: icons.calendar,
  members: icons.members,
  finances: icons.finances,
}

/* ── Nav link ────────────────────────────────────────────── */

interface NavItem {
  label: string
  path: string
  icon: string
  module?: string
}

function NavLink({ item, location, onClick }: { item: NavItem; location: { pathname: string }; onClick?: () => void }) {
  const isActive = item.path === '/dashboard'
    ? location.pathname === '/dashboard'
    : location.pathname.startsWith(item.path)

  return (
    <Link
      to={item.path}
      onClick={() => onClick?.()}
      className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150 ${
        isActive
          ? 'bg-white/10 text-white'
          : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
      }`}
    >
      <span className={`shrink-0 ${isActive ? 'text-socialflow-400' : 'text-slate-500 group-hover:text-slate-400'} transition-colors`}>
        {iconMap[item.icon] || icons.dashboard}
      </span>
      <span>{item.label}</span>
      {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-socialflow-400 shrink-0" />}
    </Link>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pt-5 pb-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
      {children}
    </p>
  )
}

/* ── Dashboard Shell ─────────────────────────────────────── */

function DashboardShell() {
  const { t } = useTranslation()
  const { user, loading, logout } = useMe()
  const { theme } = useTheme()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const isDark = theme === 'dark'

  const mainNav: NavItem[] = [
    { label: t('nav.dashboard'), path: '/dashboard', icon: 'dashboard', module: 'dashboard' },
    { label: t('nav.calendar'), path: '/dashboard/calendar', icon: 'calendar', module: 'calendar' },
  ]

  const managementNav: NavItem[] = [
    { label: t('nav.content'), path: '/dashboard/content-items', icon: 'content', module: 'content' },
    { label: t('nav.projects'), path: '/dashboard/projects', icon: 'projects', module: 'projects' },
    { label: t('nav.tasks'), path: '/dashboard/tasks', icon: 'tasks', module: 'tasks' },
    { label: t('nav.clients'), path: '/dashboard/clients', icon: 'clients', module: 'clients' },
    { label: t('nav.finances'), path: '/dashboard/finances', icon: 'finances', module: 'finances' },
  ]

  const adminNav: NavItem[] = [
    { label: t('nav.members'), path: '/dashboard/members', icon: 'members', module: 'members' },
  ]

  const canSee = (item: NavItem) => {
    if (!item.module) return true
    return user?.modules?.includes(item.module) ?? true
  }

  const visibleMain = mainNav.filter(canSee)
  const visibleManagement = managementNav.filter(canSee)
  const visibleAdmin = adminNav.filter(canSee)

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf9f6] dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-socialflow-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 dark:text-slate-400 text-sm">{t('app.loading')}</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!user.active_workspace_id) {
    return <NoWorkspaceScreen />
  }

  const sidebar = (
    <aside className="h-full flex flex-col bg-slate-950 text-slate-300">
      {/* Brand */}
      <div className="px-5 pt-5 pb-4">
        <Link to="/dashboard" className="flex items-center gap-3" onClick={() => setMobileMenuOpen(false)}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-socialflow-500 to-socialflow-700 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-socialflow-600/25">
            S
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-white tracking-tight leading-none">{t('app.title')}</h1>
            <p className="text-[11px] text-slate-500 mt-0.5">Community Manager</p>
          </div>
        </Link>
      </div>

      {/* Workspace switcher */}
      <div className="px-4 pb-2">
        <WorkspaceSwitcher />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto sidebar-scroll">
        {visibleMain.length > 0 && (
          <div className="space-y-0.5">
            {visibleMain.map((item) => (
              <NavLink key={item.path} item={item} location={location} onClick={() => setMobileMenuOpen(false)} />
            ))}
          </div>
        )}

        {visibleManagement.length > 0 && (
          <div className="space-y-0.5">
            <SectionLabel>{t('nav.management')}</SectionLabel>
            {visibleManagement.map((item) => (
              <NavLink key={item.path} item={item} location={location} onClick={() => setMobileMenuOpen(false)} />
            ))}
          </div>
        )}

        {visibleAdmin.length > 0 && (
          <div className="space-y-0.5">
            <SectionLabel>{t('nav.administration')}</SectionLabel>
            {visibleAdmin.map((item) => (
              <NavLink key={item.path} item={item} location={location} onClick={() => setMobileMenuOpen(false)} />
            ))}
          </div>
        )}
      </nav>

      {/* User section */}
      <div className="px-4 py-4 border-t border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-socialflow-500/20 to-socialflow-700/20 flex items-center justify-center text-socialflow-400 text-xs font-bold ring-1 ring-white/10 shrink-0">
            {(user.name || user.email || '?').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-slate-200 truncate leading-tight">{user.name || user.email}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-flex items-center rounded-full bg-socialflow-600/15 px-1.5 py-px text-[10px] font-semibold text-socialflow-400 ring-1 ring-socialflow-500/20">
                {getRoleLabel(user.role)}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={logout}
          className="mt-3 w-full flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-slate-500 hover:text-red-400 hover:bg-white/5 transition-colors"
        >
          {icons.logout}
          <span>{t('auth.logOut')}</span>
        </button>
        <div className="mt-1 flex items-center justify-between border-t border-white/5 pt-2">
          <span className="text-[11px] text-slate-500">{isDark ? t('theme.dark') : t('theme.light')}</span>
          <ThemeToggle className="text-slate-400 hover:text-slate-200 hover:bg-white/5" />
        </div>
      </div>
    </aside>
  )

  return (
    <div className="min-h-screen bg-[#faf9f6] dark:bg-slate-950 flex">
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30">
        {sidebar}
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 animate-slide-in">
            {sidebar}
          </div>
        </div>
      )}

      {/* Mobile hamburger */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 h-14 flex items-center justify-between">
        <button onClick={() => setMobileMenuOpen(true)} className="p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" aria-label={t('app.menu')}>
          <svg className="w-5 h-5 text-slate-700 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-socialflow-500 to-socialflow-700 flex items-center justify-center text-white font-bold text-xs">S</div>
          <span className="font-semibold text-slate-900 dark:text-slate-100">{t('app.title')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <WorkspaceSwitcher />
          <ThemeToggle className="text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200" />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-64">
        <main className="flex-1 p-4 md:p-8 pt-20 md:pt-8">
          <Routes key={user?.active_workspace_id ?? 'none'}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clients" element={<ClientList />} />
            <Route path="/clients/new" element={<ClientForm />} />
            <Route path="/clients/:id/edit" element={<ClientForm />} />
            <Route path="/content-items" element={<ContentList />} />
            <Route path="/content-items/new" element={<ContentForm />} />
            <Route path="/content-items/:id" element={<ContentDetail />} />
            <Route path="/content-items/:id/edit" element={<ContentForm />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/tasks" element={<TaskList />} />
            <Route path="/tasks/new" element={<TaskForm />} />
            <Route path="/tasks/:id" element={<TaskDetail />} />
            <Route path="/tasks/:id/edit" element={<TaskForm />} />
            <Route path="/projects" element={<ProjectList />} />
            <Route path="/projects/new" element={<ProjectForm />} />
            <Route path="/projects/:id/edit" element={<ProjectForm />} />
            <Route path="/members" element={<MemberList />} />
            <Route path="/finances" element={<FinancesList />} />
            <Route path="/finances/new" element={<FinanceForm />} />
            <Route path="/finances/:id/edit" element={<FinanceForm />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <MeProvider>
          <ToastProvider>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/invite/:token" element={<InviteClaim />} />
              <Route path="/dashboard/*" element={<DashboardShell />} />
            </Routes>
          </ToastProvider>
        </MeProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
