import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '@/lib/apiClient'
import { getStatusLabel, getPlatformLabel } from '@/lib/labels'
import { STATUS_OPTIONS, PLATFORM_OPTIONS, buildCalendarQuery } from '@/lib/calendarHelpers'
import { NEXT_STATUS } from '@/lib/statusTransitions'
import { resolveClientColor, hexToRgba } from '@/lib/colors'
import { dueTone, daysUntil, DUE_TONE_STYLES } from '@/lib/dueDates'
import { useOptionalUser } from '@/context/useMe'
import { useTheme } from '@/context/useTheme'
import { can } from '@/lib/permissions'

const STATUS_COLORS: Record<string, string> = {
  pre_produccion: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
  en_espera: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300',
  en_edicion: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300',
  validacion: 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300',
  listo_para_subir: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300',
  subido: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300',
  archivado: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300',
}

const VALID_VIEWS = ['month', 'week', 'year']
const MAX_CELL_ITEMS = 5

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function monthToParts(monthStr: string): { year: number; month: number } {
  const [y, m] = monthStr.split('-').map(Number)
  return { year: y, month: m }
}

function partsToMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return toDateStr(d)
}

function mondayOf(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const dow = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dow)
  return toDateStr(d)
}

interface CalendarItem {
  id: string
  title: string
  platform: string
  content_type: string
  status: string
  scheduled_date: string | null
  fecha_inicial?: string | null
  fecha_final?: string | null
  type: 'content' | 'task'
  done?: boolean
  client_id?: string | null
  project_id?: string | null
  assignee_id?: string | null
}

interface ProjectDates {
  start_date: string | null
  end_date: string | null
}

interface CalendarResult {
  items: CalendarItem[]
  counts_by_day: Record<string, number>
  project_dates: ProjectDates | null
}

interface Project {
  id: string
  name: string
}

interface Client {
  id: string
  name: string
  color: string | null
  active: boolean
}

interface Member {
  user_id: string
  user: { id: string; email: string; name: string }
}

function SkeletonGrid() {
  const cells = Array.from({ length: 42 })
  return (
    <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
      <div className="grid grid-cols-7 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="px-2 py-2 text-center text-xs font-medium text-slate-500 dark:text-slate-400">{d.slice(0, 3)}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((_, i) => (
          <div key={i} className="min-h-[80px] border-b border-r border-slate-100 dark:border-slate-800 p-1.5 animate-pulse">
            <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 mb-1" />
            <div className="w-8 h-3 rounded bg-slate-100 dark:bg-slate-800" />
          </div>
        ))}
      </div>
    </div>
  )
}

const TYPE_DOT_COLORS: Record<CalendarItem['type'], string> = {
  content: '#8B5CF6',
  task: '#10B981',
}

export default function Calendar() {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [searchParams, setSearchParams] = useSearchParams()
  const [data, setData] = useState<CalendarResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pendingTransitions, setPendingTransitions] = useState<Record<string, string>>({})
  const [reloadToken, setReloadToken] = useState(0)
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [members, setMembers] = useState<Member[]>([])

  const month = searchParams.get('month') || getCurrentMonth()
  const view = VALID_VIEWS.includes(searchParams.get('view') ?? '') ? (searchParams.get('view') as string) : 'month'
  const status = searchParams.get('status') ?? ''
  const platform = searchParams.get('platform') ?? ''
  const day = searchParams.get('day') ?? ''
  const projectId = searchParams.get('project_id') ?? ''
  const clientId = searchParams.get('client_id') ?? ''
  const assigneeId = searchParams.get('assignee_id') ?? ''
  const activeDay = day
  const hasActiveFilters = (status && status !== 'all') || (platform && platform !== 'all') || !!projectId || !!clientId || !!assigneeId

  const { year, month: monthNum } = monthToParts(month)
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const currentMonthStr = getCurrentMonth()
  const monthName = new Date(year, monthNum - 1).toLocaleString('es', { month: 'long' })

  const DAYS = [t('calendar.days.sun'), t('calendar.days.mon'), t('calendar.days.mar'), t('calendar.days.mi\u00E9'), t('calendar.days.jue'), t('calendar.days.vie'), t('calendar.days.s\u00E1b')]

  const rawWeekStart = searchParams.get('week_start') ?? ''
  const weekStart = view === 'week'
    ? (/^\d{4}-\d{2}-\d{2}$/.test(rawWeekStart) ? rawWeekStart : mondayOf(day || todayStr))
    : null
  const weekDays = weekStart ? Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)) : []

  const returnTo = `/dashboard/calendar?${searchParams.toString()}`

  const user = useOptionalUser()
  const canCreateTask = can(user, 'tasks', 'create')
  const canCreateContent = can(user, 'content', 'create')
  const canUpdateTask = can(user, 'tasks', 'update')
  const canUpdateContent = can(user, 'content', 'update')

  useEffect(() => {
    apiClient.get<Project[]>('/projects').then((res) => {
      if (res.data) setProjects(res.data)
    })
    apiClient.get<Client[]>('/clients').then((res) => {
      if (res.data) setClients(res.data)
    })
    apiClient.get<Member[]>('/members').then((res) => {
      if (res.data) setMembers(res.data)
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      setLoading(true)
      setError('')
    })
    const common = {
      status: status || undefined,
      platform: platform || undefined,
      project_id: projectId || undefined,
      client_id: clientId || undefined,
      assignee_id: assigneeId || undefined,
    }
    const queryPath =
      view === 'month'
        ? buildCalendarQuery({ month, ...common })
        : buildCalendarQuery({ month: undefined, year: view === 'week' ? (weekStart || '').slice(0, 4) : String(year), ...common })
    apiClient.get<CalendarResult>(queryPath).then((res) => {
      if (cancelled) return
      if (res.error) {
        setError(res.error.message)
      } else if (res.data) {
        setData({
          ...res.data,
          items: (res.data.items ?? [])
            .map((item) => ({ ...item, type: item.type ?? 'content' }))
            .filter((i) => i.type === 'content' || i.type === 'task'),
          counts_by_day: res.data.counts_by_day ?? {},
          project_dates: res.data.project_dates ?? null,
        })
      } else {
        setData(null)
      }
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [month, view, weekStart, year, status, platform, projectId, clientId, assigneeId, reloadToken])

  async function handleSidebarTransition(itemId: string, nextStatus: string) {
    setData((prev) => {
      if (!prev) return prev
      return { ...prev, items: prev.items.map((item) => item.id === itemId ? { ...item, status: nextStatus } : item) }
    })
    setPendingTransitions((prev) => ({ ...prev, [itemId]: nextStatus }))
    const res = await apiClient.patch<CalendarItem>(`/content-items/${itemId}/status`, { status: nextStatus })
    setPendingTransitions((prev) => { const next = { ...prev }; delete next[itemId]; return next })
    if (res.error) {
      setError(res.error.message)
      setReloadToken((t) => t + 1)
    } else if (res.data) {
      setData((prev) => {
        if (!prev) return prev
        return { ...prev, items: prev.items.map((item) => item.id === itemId ? { ...item, status: res.data!.status } : item) }
      })
    }
  }

  function updateParams(mutator: (p: URLSearchParams) => void) {
    const newParams = new URLSearchParams(searchParams)
    mutator(newParams)
    setSearchParams(newParams, { replace: true })
  }

  function shiftPeriod(sign: 1 | -1) {
    updateParams((p) => {
      if (view === 'month') {
        const d = new Date(year, monthNum - 1 + sign, 1)
        p.set('month', partsToMonth(d.getFullYear(), d.getMonth() + 1))
      } else if (view === 'week' && weekStart) {
        const newStart = addDays(weekStart, sign * 7)
        p.set('week_start', newStart)
        p.set('month', newStart.slice(0, 7))
      } else {
        const d = new Date(year + sign, monthNum - 1, 1)
        p.set('month', partsToMonth(d.getFullYear(), d.getMonth() + 1))
      }
    })
  }

  function goToToday() {
    updateParams((p) => {
      p.set('month', currentMonthStr)
      if (view === 'week') p.set('week_start', mondayOf(todayStr))
    })
  }

  function setView(nextView: string) {
    updateParams((p) => {
      if (nextView === 'month') {
        p.delete('view')
        p.delete('week_start')
      } else {
        p.set('view', nextView)
        if (nextView === 'week' && !p.get('week_start')) {
          p.set('week_start', mondayOf(day || todayStr))
        }
      }
    })
  }

  function clearFilters() {
    updateParams((p) => {
      ;['status', 'platform', 'project_id', 'client_id', 'assignee_id'].forEach((k) => p.delete(k))
    })
  }

  function setStatusFilter(value: string) {
    updateParams((p) => {
      if (value === 'all') p.delete('status')
      else p.set('status', value)
    })
  }

  function setPlatformFilter(value: string) {
    updateParams((p) => {
      if (value === 'all') p.delete('platform')
      else p.set('platform', value)
    })
  }

  function setProjectFilter(value: string) {
    updateParams((p) => {
      if (!value) p.delete('project_id')
      else p.set('project_id', value)
    })
  }

  function setClientFilter(value: string) {
    updateParams((p) => {
      if (!value) p.delete('client_id')
      else p.set('client_id', value)
    })
  }

  function setAssigneeFilter(value: string) {
    updateParams((p) => {
      if (!value) p.delete('assignee_id')
      else p.set('assignee_id', value)
    })
  }

  function selectDay(dateStr: string) {
    updateParams((p) => p.set('day', dateStr))
  }

  function goToMonthView(monthStr: string) {
    updateParams((p) => {
      p.set('month', monthStr)
      p.set('view', 'month')
      p.delete('week_start')
    })
  }

  function isWithinProjectRange(dateStr: string): boolean {
    if (!data?.project_dates?.start_date || !data?.project_dates?.end_date) return false
    return dateStr >= data.project_dates.start_date && dateStr <= data.project_dates.end_date
  }

  function clientColorFor(item: CalendarItem): string | null {
    if (!item.client_id) return null
    const client = clients.find((c) => c.id === item.client_id)
    if (!client) return null
    return resolveClientColor(client.color)
  }

  function itemMeta(item: CalendarItem): string {
    const parts: string[] = []
    const client = clients.find((c) => c.id === item.client_id)
    const project = projects.find((p) => p.id === item.project_id)
    const member = members.find((m) => m.user_id === item.assignee_id)
    if (client) parts.push(`${t('calendar.client')}: ${client.name}`)
    if (project) parts.push(`${t('calendar.project')}: ${project.name}`)
    if (member) parts.push(`${t('calendar.assignee')}: ${member.user.name || member.user.email}`)
    return parts.join(' · ')
  }

  function namesFor(item: CalendarItem) {
    const member = members.find((m) => m.user_id === item.assignee_id)
    return {
      client: clients.find((c) => c.id === item.client_id)?.name,
      project: projects.find((p) => p.id === item.project_id)?.name,
      assignee: member ? member.user.name || member.user.email : undefined,
    }
  }

  function formatSidebarDate(dateStr: string | null | undefined): string | null {
    if (!dateStr) return null
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  function isItemDone(item: CalendarItem): boolean {
    if (item.type === 'task') return !!item.done
    return item.status === 'subido' || item.status === 'archivado'
  }

  function dueDateOf(item: CalendarItem): string | null {
    return item.fecha_final ?? item.scheduled_date ?? null
  }

  function dueInfoFor(item: CalendarItem) {
    const date = dueDateOf(item)
    const tone = dueTone(date, isItemDone(item))
    if (tone === 'none') return null
    const style = DUE_TONE_STYLES[tone]
    const label =
      tone === 'soon'
        ? t('due.days', { count: daysUntil(date) ?? 0 })
        : t(style.i18nKey)
    return { ...style, label }
  }

  async function handleTaskDone(item: CalendarItem) {
    const nextDone = !item.done
    setPendingTransitions((prev) => ({ ...prev, [item.id]: nextDone ? 'done' : 'pending' }))
    setData((prev) =>
      prev
        ? { ...prev, items: prev.items.map((i) => i.id === item.id ? { ...i, done: nextDone, status: nextDone ? 'subido' : 'pre_produccion' } : i) }
        : prev,
    )
    const res = await apiClient.patch<CalendarItem>(`/tasks/${item.id}/done`, { done: nextDone })
    setPendingTransitions((prev) => { const next = { ...prev }; delete next[item.id]; return next })
    if (res.error) {
      setError(res.error.message)
      setReloadToken((rt) => rt + 1)
    }
  }

  const firstDay = new Date(year, monthNum - 1, 1)
  const lastDay = new Date(year, monthNum, 0)
  const startDayOfWeek = firstDay.getDay()
  const totalDays = lastDay.getDate()

  const days: (number | null)[] = []
  for (let i = 0; i < startDayOfWeek; i++) days.push(null)
  for (let d = 1; d <= totalDays; d++) days.push(d)

  const monthDates = days
    .filter((d): d is number => d !== null)
    .map((d) => `${year}-${String(monthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`)

  const itemsByDate: Record<string, CalendarItem[]> = {}
  for (const item of data?.items ?? []) {
    if (item.scheduled_date) {
      (itemsByDate[item.scheduled_date] ??= []).push(item)
    }
  }

  const selectedItems = activeDay ? (itemsByDate[activeDay] ?? []) : []
  const contentItems = selectedItems.filter((i) => i.type === 'content')
  const taskItems = selectedItems.filter((i) => i.type === 'task')

  const hasAnyItems = (data?.items ?? []).length > 0
  const visibleDates = view === 'month' ? monthDates : view === 'week' ? weekDays : null
  const hasVisibleItems = visibleDates
    ? hasAnyItems && (data?.items ?? []).some((i) => i.scheduled_date && visibleDates!.includes(i.scheduled_date))
    : hasAnyItems

  const isEmptyMonth = !loading && !error && data && !hasAnyItems
  const isFilteredEmpty = !loading && !error && data && hasAnyItems && hasActiveFilters && !hasVisibleItems

  let headerLabel: string
  if (view === 'month') {
    headerLabel = `${monthName} ${year}`
  } else if (view === 'week' && weekDays.length === 7) {
    const f = new Date(weekDays[0] + 'T12:00:00')
    const l = new Date(weekDays[6] + 'T12:00:00')
    if (f.getMonth() === l.getMonth()) {
      headerLabel = `${f.getDate()} – ${l.getDate()} ${f.toLocaleString('es', { month: 'long' })} ${f.getFullYear()}`
    } else {
      headerLabel = `${f.getDate()} ${f.toLocaleString('es', { month: 'short' })} – ${l.getDate()} ${l.toLocaleString('es', { month: 'short' })} ${f.getFullYear()}`
    }
  } else {
    headerLabel = String(year)
  }
  function CellChip({ item, onClick }: { item: CalendarItem; onClick: () => void }) {
    const cc = clientColorFor(item)
    const clean = item.title
    const isDone = item.type === 'task' && !!item.done
    const meta = itemMeta(item)
    const due = dueInfoFor(item)
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onClick()
          }
        }}
        title={clean + (meta ? `\n${meta}` : '') + (due ? `\n${due.label}` : '')}
        className={`flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[10px] lg:text-[11px] leading-tight min-w-0 max-w-full cursor-pointer border transition-all duration-150 hover:shadow-sm hover:-translate-y-px hover:brightness-[1.05] ${
          isDone ? 'opacity-55' : ''
        }`}
        style={{
          backgroundColor: cc
            ? isDark ? hexToRgba(cc, 0.3) : hexToRgba(cc, 0.12)
            : isDark ? '#1e293b' : '#f1f5f9',
          borderColor: cc
            ? isDark ? hexToRgba(cc, 0.5) : hexToRgba(cc, 0.25)
            : isDark ? '#334155' : 'transparent',
          borderLeft: `3px solid ${cc ?? (isDark ? '#475569' : '#cbd5e1')}`,
          color: isDark ? '#e2e8f0' : '#334155',
        }}
      >
        {isDone ? (
          <svg className="w-2.5 h-2.5 shrink-0 text-emerald-600 dark:text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: TYPE_DOT_COLORS[item.type] }} />
        )}
        <span className={`truncate ${isDone ? 'line-through' : ''}`}>{clean}</span>
        {due && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ml-auto ${due.dot}`} aria-hidden="true" />}
      </div>
    )
  }

  function QuickAddLinks({ dateStr }: { dateStr: string }) {
    const createTaskLabel = t('calendar.createTaskFor', { date: dateStr })
    const createContentLabel = t('calendar.createContentFor', { date: dateStr })
    return (
      <div className="flex gap-1">
        {canCreateTask && (
          <Link
            to={`/dashboard/tasks/new?start_date=${dateStr}&return_to=${encodeURIComponent(returnTo)}`}
            onClick={(e) => e.stopPropagation()}
            aria-label={createTaskLabel}
            title={createTaskLabel}
            className="inline-flex items-center gap-0.5 rounded-md border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-900/40 px-1 py-px text-[9px] font-semibold text-emerald-700 dark:text-emerald-300 transition-all hover:bg-emerald-600 hover:text-white hover:border-emerald-600 hover:shadow-sm active:scale-95"
          >
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
            </svg>
            {t('calendar.addTask')}
          </Link>
        )}
        {canCreateContent && (
          <Link
            to={`/dashboard/content-items/new?scheduled_date=${dateStr}&return_to=${encodeURIComponent(returnTo)}`}
            onClick={(e) => e.stopPropagation()}
            aria-label={createContentLabel}
            title={createContentLabel}
            className="inline-flex items-center gap-0.5 rounded-md border border-violet-200 bg-violet-50 px-1 py-px text-[9px] font-semibold text-violet-700 transition-all hover:bg-violet-600 hover:text-white hover:border-violet-600 hover:shadow-sm active:scale-95"
          >
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
            </svg>
            {t('calendar.addContent')}
          </Link>
        )}
      </div>
    )
  }

  function renderDayCells(dayItems: CalendarItem[], dateStr: string, isToday: boolean, cellClass: string, maxItems = MAX_CELL_ITEMS) {
    const overflow = dayItems.length > maxItems ? dayItems.length - maxItems : 0
    const visible = dayItems.slice(0, maxItems)
    const mobileDots = dayItems.slice(0, 4)
    const mobileOverflow = dayItems.length - mobileDots.length
    return (
      <div className={`flex flex-col ${cellClass}`}>
        <div className="flex items-start justify-between gap-1">
          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${isToday ? 'bg-socialflow-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}>
            {dateStr.slice(8, 10).replace(/^0/, '')}
          </span>
        </div>
        <div className="hidden md:block mt-0.5">
          <div className="inline-flex rounded-md bg-slate-50/70 dark:bg-slate-800/60 p-0.5">
            <QuickAddLinks dateStr={dateStr} />
          </div>
        </div>
        <div className="hidden md:block mt-1.5 border-t border-slate-100 dark:border-slate-800" />
        <div className="hidden md:flex flex-col gap-0.5 mt-1">
          {visible.map((item) => (
            <CellChip key={item.id} item={item} onClick={() => selectDay(dateStr)} />
          ))}
          {overflow > 0 && (
            <button
              type="button"
              onClick={() => selectDay(dateStr)}
              className="self-start rounded-full bg-socialflow-50 dark:bg-socialflow-900/30 px-1.5 py-0.5 text-[10px] font-semibold text-socialflow-600 dark:text-socialflow-400 hover:bg-socialflow-100 dark:hover:bg-socialflow-900/50 transition-colors"
            >
              {t('calendar.more', { count: overflow })}
            </button>
          )}
        </div>
        <div className="mt-1 flex md:hidden flex-wrap items-center gap-1">
          {mobileDots.map((item) => (
            <span
              key={item.id}
              title={item.title}
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: clientColorFor(item) ?? TYPE_DOT_COLORS[item.type] }}
            />
          ))}
          {mobileOverflow > 0 && (
            <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400">+{mobileOverflow}</span>
          )}
        </div>
      </div>
    )
  }

  function SidebarMetaRow({ label, value }: { label: string; value?: string | null }) {
    if (!value) return null
    return (
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="text-slate-400 shrink-0">{label}</span>
        <span className="text-slate-700 dark:text-slate-200 font-medium truncate text-right">{value}</span>
      </div>
    )
  }

  function SidebarActions({ item }: { item: CalendarItem }) {
    const base = item.type === 'task' ? `/dashboard/tasks/${item.id}` : `/dashboard/content-items/${item.id}`
    const canEdit = item.type === 'task' ? canUpdateTask : canUpdateContent
    return (
      <div className="flex gap-1.5 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        <Link
          to={`${base}?return_to=${encodeURIComponent(returnTo)}`}
          className="inline-flex items-center gap-1 rounded-lg bg-socialflow-50 dark:bg-socialflow-900/30 border border-socialflow-200 dark:border-socialflow-800 px-2 py-1 text-[10px] font-semibold text-socialflow-700 dark:text-socialflow-300 hover:bg-socialflow-100 dark:hover:bg-socialflow-900/50 transition-all"
        >
          {t('calendar.viewDetail')}
        </Link>
        {canEdit && (
          <Link
            to={`${base}/edit?return_to=${encodeURIComponent(returnTo)}`}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1 text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
            {t('calendar.edit')}
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t('calendar.title')}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-0.5 mr-1">
            {(['month', 'week', 'year'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                  view === v ? 'bg-white dark:bg-slate-900 text-socialflow-700 dark:text-socialflow-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                }`}
              >
                {t(`calendar.views.${v}`)}
              </button>
            ))}
          </div>
          <button onClick={() => shiftPeriod(-1)} className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-all active:scale-[0.97]">
            {t('calendar.prev')}
          </button>
          <span className="text-lg font-bold text-slate-900 dark:text-slate-100 min-w-[140px] text-center font-heading">
            {headerLabel}
          </span>
          <button onClick={() => shiftPeriod(1)} className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-all active:scale-[0.97]">
            {t('calendar.next')}
          </button>
          <button onClick={goToToday} className="rounded-lg bg-socialflow-50 dark:bg-socialflow-900/30 border border-socialflow-200 dark:border-socialflow-800 px-3 py-1.5 text-sm font-medium text-socialflow-700 dark:text-socialflow-300 hover:bg-socialflow-100 dark:hover:bg-socialflow-900/50 transition-all active:scale-[0.97]">
            {t('calendar.today')}
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_OPTIONS.map((s) => {
            const active = (s === 'all' && !status) || status === s
            return (
              <button
                type="button"
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  active
                    ? 'bg-socialflow-100 dark:bg-socialflow-900/40 text-socialflow-700 dark:text-socialflow-300 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {s === 'all' ? t('status.all') : getStatusLabel(s)}
              </button>
            )
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={platform || 'all'}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-socialflow-300"
          >
            {PLATFORM_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p === 'all' ? t('platform.all') : getPlatformLabel(p)}
              </option>
            ))}
          </select>
          <select
            value={projectId || ''}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-socialflow-300"
          >
            <option value="">{t('calendar.allProjects')}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select
            value={clientId || ''}
            onChange={(e) => setClientFilter(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-socialflow-300"
          >
            <option value="">{t('calendar.allClients')}</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            value={assigneeId || ''}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-socialflow-300"
          >
            <option value="">{t('calendar.allAssignees')}</option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.user.name || m.user.email}
              </option>
            ))}
          </select>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-xs text-slate-400">{t('calendar.activeFilters')}</span>
          {status && status !== 'all' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-socialflow-100 dark:bg-socialflow-900/40 px-2 py-0.5 text-[10px] font-medium text-socialflow-700 dark:text-socialflow-300">
              {getStatusLabel(status)}
            </span>
          )}
          {platform && platform !== 'all' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-socialflow-100 dark:bg-socialflow-900/40 px-2 py-0.5 text-[10px] font-medium text-socialflow-700 dark:text-socialflow-300">
              {getPlatformLabel(platform)}
            </span>
          )}
          {projectId && (
            <span className="inline-flex items-center gap-1 rounded-full bg-socialflow-100 dark:bg-socialflow-900/40 px-2 py-0.5 text-[10px] font-medium text-socialflow-700 dark:text-socialflow-300">
              {projects.find((p) => p.id === projectId)?.name ?? projectId}
            </span>
          )}
          {clientId && (
            <span className="inline-flex items-center gap-1 rounded-full bg-socialflow-100 dark:bg-socialflow-900/40 px-2 py-0.5 text-[10px] font-medium text-socialflow-700 dark:text-socialflow-300">
              {clients.find((c) => c.id === clientId)?.name ?? clientId}
            </span>
          )}
          {assigneeId && (
            <span className="inline-flex items-center gap-1 rounded-full bg-socialflow-100 dark:bg-socialflow-900/40 px-2 py-0.5 text-[10px] font-medium text-socialflow-700 dark:text-socialflow-300">
              {members.find((m) => m.user_id === assigneeId)?.user?.name || members.find((m) => m.user_id === assigneeId)?.user?.email || assigneeId}
            </span>
          )}
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            {t('calendar.clearFilters')}
          </button>
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300 mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col lg:flex-row gap-6">
          <SkeletonGrid />
          <div className="w-full lg:w-72 shrink-0">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4">
              <div className="animate-pulse space-y-2">
                <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-3 w-32 bg-slate-100 dark:bg-slate-800 rounded" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
            {(isEmptyMonth || isFilteredEmpty) && (
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-center">
                <p className="text-xs text-slate-400">{isEmptyMonth ? t('calendar.noContentMonth') : t('calendar.noContentFilters')}</p>
              </div>
            )}

            {clients.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-1.5 bg-slate-50/60 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 max-h-14 overflow-y-auto" data-testid="calendar-legend">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{t('calendar.legend')}</span>
                {clients.filter((c) => c.active !== false).map((c) => (
                  <span key={c.id} className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: resolveClientColor(c.color) }} />
                    {c.name}
                  </span>
                ))}
              </div>
            )}

            {view === 'month' && (
              <>
                <div className="grid grid-cols-7 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                  {DAYS.map((d) => (
                    <div key={d} className="px-2 py-2 text-center text-xs font-medium text-slate-500 dark:text-slate-400">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {days.map((dayNum, i) => {
                    const dateStr = dayNum
                      ? `${year}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
                      : null
                    const isToday = dateStr === todayStr
                    const isSelected = dateStr === activeDay
                    const inProjectRange = dateStr ? isWithinProjectRange(dateStr) : false
                    const dayItems = dateStr ? (itemsByDate[dateStr] ?? []) : []

                    return (
                      <div
                        key={i}
                        data-testid={dateStr ? `day-cell-${dateStr}` : 'day-cell-empty'}
                        data-selected={isSelected ? 'true' : 'false'}
                        className={`min-h-[120px] md:min-h-[140px] lg:min-h-[150px] border-b border-r border-slate-100 dark:border-slate-800 p-1.5 ${
                          dayNum ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800' : ''
                        } ${isSelected ? 'bg-socialflow-50 dark:bg-socialflow-900/30 ring-1 ring-inset ring-socialflow-300 dark:ring-socialflow-800' : ''} ${
                          inProjectRange && dayNum ? 'bg-blue-50/50 dark:bg-blue-900/30' : ''
                        }`}
                        onClick={() => dayNum && selectDay(dateStr!)}
                      >
                        {dayNum && dateStr && renderDayCells(dayItems, dateStr, isToday, 'min-h-[92px] md:min-h-[112px] lg:min-h-[122px]', 4)}
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {view === 'week' && (
              <>
                <div className="grid grid-cols-7 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                  {weekDays.map((ds) => {
                    const d = new Date(ds + 'T12:00:00')
                    const isToday = ds === todayStr
                    return (
                      <div key={ds} className="px-2 py-2 text-center">
                        <div className={`text-xs font-medium ${isToday ? 'text-socialflow-700 dark:text-socialflow-300' : 'text-slate-500 dark:text-slate-400'}`}>{DAYS[d.getDay()]}</div>
                        <div className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${isToday ? 'bg-socialflow-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                          {d.getDate()}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="grid grid-cols-7">
                  {weekDays.map((ds) => {
                    const dayItems = itemsByDate[ds] ?? []
                    const isToday = ds === todayStr
                    const isSelected = ds === activeDay
                    const inProjectRange = isWithinProjectRange(ds)
                    return (
                      <div
                        key={ds}
                        data-testid={`day-cell-${ds}`}
                        data-selected={isSelected ? 'true' : 'false'}
                        className={`min-h-[300px] lg:min-h-[340px] border-b border-r border-slate-100 dark:border-slate-800 p-1.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 ${isSelected ? 'bg-socialflow-50 dark:bg-socialflow-900/30 ring-1 ring-inset ring-socialflow-300 dark:ring-socialflow-800' : ''} ${inProjectRange ? 'bg-blue-50/50 dark:bg-blue-900/30' : ''}`}
                        onClick={() => selectDay(ds)}
                      >
                        {renderDayCells(dayItems, ds, isToday, 'min-h-0', 9)}
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {view === 'year' && (
              <div className="p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array.from({ length: 12 }, (_, idx) => idx + 1).map((m) => {
                  const mStartDow = new Date(year, m - 1, 1).getDay()
                  const mDays = new Date(year, m, 0).getDate()
                  let monthTotal = 0
                  for (let d = 1; d <= mDays; d++) {
                    const ds = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                    monthTotal += (data?.counts_by_day[ds] ?? 0)
                  }
                  return (
                    <div key={m} className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 p-2">
                      <button
                        type="button"
                        onClick={() => goToMonthView(partsToMonth(year, m))}
                        className="mb-1.5 flex items-center justify-between w-full text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-socialflow-600 dark:hover:text-socialflow-400 transition-colors"
                      >
                        <span>{new Date(year, m - 1).toLocaleString('es', { month: 'short' })}</span>
                        {monthTotal > 0 && <span className="text-[10px] font-medium text-slate-400">{monthTotal}</span>}
                      </button>
                      <div className="grid grid-cols-7 gap-0.5">
                        {Array.from({ length: mStartDow }, (_, i) => <span key={`b${i}`} />)}
                        {Array.from({ length: mDays }, (_, i) => {
                          const d = i + 1
                          const ds = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                          const count = data?.counts_by_day[ds] ?? 0
                          const isToday = ds === todayStr
                          const isSelected = ds === activeDay
                          return (
                            <button
                              key={d}
                              type="button"
                              onClick={() => selectDay(ds)}
                              title={`${ds}${count > 0 ? ` · ${count}` : ''}`}
                              className={`relative flex items-center justify-center rounded-full h-5 w-5 text-[9px] transition-colors ${
                                isToday ? 'bg-socialflow-600 text-white font-bold' : isSelected ? 'bg-socialflow-100 dark:bg-socialflow-900/40 text-socialflow-700 dark:text-socialflow-300 font-semibold' : count > 0 ? 'text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700' : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                              }`}
                            >
                              {d}
                              {count > 0 && !isToday && <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-socialflow-500" />}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="w-full lg:w-72 shrink-0" data-testid="calendar-sidebar">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm">
              {activeDay ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{activeDay}</h3>
                    <div className="flex gap-1.5">
                      {canCreateTask && (
                        <Link
                          to={`/dashboard/tasks/new?start_date=${activeDay}&return_to=${encodeURIComponent(returnTo)}`}
                          title={t('calendar.createTaskFor', { date: activeDay })}
                          aria-label={t('calendar.createTaskFor', { date: activeDay })}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-900/60 px-2 py-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                          {t('calendar.addTask')}
                        </Link>
                      )}
                      {canCreateContent && (
                        <Link
                          to={`/dashboard/content-items/new?scheduled_date=${activeDay}&return_to=${encodeURIComponent(returnTo)}`}
                          title={t('calendar.createContentFor', { date: activeDay })}
                          aria-label={t('calendar.createContentFor', { date: activeDay })}
                          className="inline-flex items-center gap-1 rounded-lg bg-violet-50 border border-violet-200 px-2 py-1 text-[10px] font-semibold text-violet-700 hover:bg-violet-100 transition-all"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                          {t('calendar.addContent')}
                        </Link>
                      )}
                    </div>
                  </div>
                  {selectedItems.length === 0 ? (
                    <p className="text-xs text-slate-400">{t('calendar.noContentDay')}</p>
                  ) : (
                    <div className="space-y-4">
                      {contentItems.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold text-violet-500 uppercase tracking-wider mb-1.5">{t('calendar.sectionContent')}</p>
                          <div className="space-y-2">
                            {contentItems.map((item) => {
                              const isPending = pendingTransitions[item.id] !== undefined
                              const allowedNext = NEXT_STATUS[item.status] ?? []
                              const names = namesFor(item)
                              const cc = clientColorFor(item)
                              const due = dueInfoFor(item)
                              return (
                                <div
                                  key={item.id}
                                  className="rounded-xl border border-slate-100 dark:border-slate-800 px-3 py-2.5 transition-all hover:shadow-sm hover:border-slate-200 dark:hover:border-slate-600"
                                  style={cc ? { borderLeft: `3px solid ${cc}` } : undefined}
                                >
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-violet-600 uppercase tracking-wider">
                                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: TYPE_DOT_COLORS.content }} />
                                      {t('calendar.sectionContent')}
                                    </span>
                                    {due && (
                                      <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${due.badge}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${due.dot}`} aria-hidden="true" />
                                        {due.label}
                                      </span>
                                    )}
                                  </div>
                                  <Link
                                    to={`/dashboard/content-items/${item.id}?return_to=${encodeURIComponent(returnTo)}`}
                                    className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate hover:text-socialflow-600 dark:hover:text-socialflow-400 block rounded"
                                  >
                                    {item.title}
                                  </Link>
                                  <div className="mt-1.5 space-y-0.5">
                                    <SidebarMetaRow label={t('calendar.client')} value={names.client} />
                                    <SidebarMetaRow label={t('calendar.project')} value={names.project} />
                                    <SidebarMetaRow label={t('calendar.assignee')} value={names.assignee} />
                                    <SidebarMetaRow label={t('calendar.startDate')} value={formatSidebarDate(item.fecha_inicial)} />
                                    <SidebarMetaRow label={t('calendar.endDate')} value={formatSidebarDate(item.fecha_final)} />
                                  </div>
                                  <div className="flex gap-2 mt-1.5">
                                    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${STATUS_COLORS[item.status] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>
                                      {getStatusLabel(item.status)}
                                    </span>
                                    <span className="text-[10px] text-slate-400">{getPlatformLabel(item.platform)}</span>
                                  </div>
                                  {canUpdateContent && allowedNext.length > 0 && !isPending && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {allowedNext.map((next) => (
                                        <button
                                          key={next}
                                          onClick={() => handleSidebarTransition(item.id, next)}
                                          disabled={isPending}
                                          aria-label={t('calendar.ariaMoveTo', { status: getStatusLabel(next) })}
                                          className="rounded px-2 py-0.5 text-[10px] font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                                        >
                                          {getStatusLabel(next)}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                  {canUpdateContent && isPending && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {allowedNext.map((next) => (
                                        <button key={next} disabled className="rounded px-2 py-0.5 text-[10px] font-medium border border-slate-200 dark:border-slate-700 text-slate-400 opacity-50">
                                          {getStatusLabel(next)}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                  <SidebarActions item={item} />
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {taskItems.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-300 uppercase tracking-wider mb-1.5">{t('calendar.sectionTasks')}</p>
                          <div className="space-y-2">
                            {taskItems.map((item) => {
                              const names = namesFor(item)
                              const cc = clientColorFor(item)
                              const due = dueInfoFor(item)
                              const donePending = pendingTransitions[item.id] !== undefined
                              return (
                                <div
                                  key={item.id}
                                  className={`rounded-xl border px-3 py-2.5 transition-all ${item.done ? 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40' : 'border-emerald-100 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-900/30 hover:border-emerald-200'}`}
                                  style={cc ? { borderLeft: `3px solid ${cc}` } : undefined}
                                >
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-300 uppercase tracking-wider">
                                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: TYPE_DOT_COLORS.task }} />
                                      {t('calendar.sectionTasks')}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      {due && (
                                        <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${due.badge}`}>
                                          <span className={`w-1.5 h-1.5 rounded-full ${due.dot}`} aria-hidden="true" />
                                          {due.label}
                                        </span>
                                      )}
                                      <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${item.done ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'}`}>
                                        {item.done ? t('calendar.taskDone') : t('calendar.taskPending')}
                                      </span>
                                    </div>
                                  </div>
                                  <Link
                                    to={`/dashboard/tasks/${item.id}?return_to=${encodeURIComponent(returnTo)}`}
                                    className={`block rounded text-sm font-semibold truncate hover:text-socialflow-600 dark:hover:text-socialflow-400 ${item.done ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-slate-100'}`}
                                  >
                                    {item.title}
                                  </Link>
                                  <div className="mt-1.5 space-y-0.5">
                                    <SidebarMetaRow label={t('calendar.client')} value={names.client} />
                                    <SidebarMetaRow label={t('calendar.project')} value={names.project} />
                                    <SidebarMetaRow label={t('calendar.assignee')} value={names.assignee} />
                                    <SidebarMetaRow label={t('calendar.startDate')} value={formatSidebarDate(item.fecha_inicial)} />
                                    <SidebarMetaRow label={t('calendar.endDate')} value={formatSidebarDate(item.fecha_final)} />
                                  </div>
                                  <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                    {canUpdateTask && (
                                      <button
                                        type="button"
                                        onClick={() => handleTaskDone(item)}
                                        disabled={donePending}
                                        aria-label={item.done ? t('calendar.markPending') : t('calendar.markDone')}
                                        className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold transition-all disabled:opacity-50 ${
                                          item.done
                                            ? 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                            : 'bg-emerald-50 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                                        }`}
                                      >
                                        {donePending ? (
                                          <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                                        ) : (
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                          </svg>
                                        )}
                                        {item.done ? t('calendar.markPending') : t('calendar.markDone')}
                                      </button>
                                    )}
                                    {canUpdateTask && (
                                      <Link
                                        to={`/dashboard/tasks/${item.id}/edit?return_to=${encodeURIComponent(returnTo)}`}
                                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1 text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                                      >
                                        {t('calendar.edit')}
                                      </Link>
                                    )}
                                    <Link
                                      to={`/dashboard/tasks/${item.id}?return_to=${encodeURIComponent(returnTo)}`}
                                      className="inline-flex items-center gap-1 rounded-lg bg-socialflow-50 dark:bg-socialflow-900/30 border border-socialflow-200 dark:border-socialflow-800 px-2 py-1 text-[10px] font-semibold text-socialflow-700 dark:text-socialflow-300 hover:bg-socialflow-100 dark:hover:bg-socialflow-900/50 transition-all"
                                    >
                                      {t('calendar.viewDetail')}
                                    </Link>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-slate-400">{t('calendar.selectDay')}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
