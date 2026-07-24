import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '@/lib/apiClient'
import { getStatusLabel, getPlatformLabel } from '@/lib/labels'
import { STATUS_OPTIONS, PLATFORM_OPTIONS, buildCalendarQuery } from '@/lib/calendarHelpers'
import { NEXT_STATUS } from '@/lib/statusTransitions'

const STATUS_COLORS: Record<string, string> = {
  pre_produccion: 'bg-gray-100 text-gray-700',
  en_espera: 'bg-yellow-100 text-yellow-800',
  en_edicion: 'bg-blue-100 text-blue-800',
  validacion: 'bg-purple-100 text-purple-800',
  listo_para_subir: 'bg-indigo-100 text-indigo-800',
  subido: 'bg-green-100 text-green-800',
  archivado: 'bg-red-100 text-red-800',
}

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

interface CalendarItem {
  id: string
  title: string
  platform: string
  content_type: string
  status: string
  scheduled_date: string | null
  type: 'content' | 'task' | 'payment'
  amount?: number
  done?: boolean
  payment_status?: string
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

function SkeletonGrid() {
  const cells = Array.from({ length: 42 })
  return (
    <div className="flex-1 bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
      <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="px-2 py-2 text-center text-xs font-medium text-slate-500">{d.slice(0, 3)}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((_, i) => (
          <div key={i} className="min-h-[80px] border-b border-r border-slate-100 p-1.5 animate-pulse">
            <div className="w-6 h-6 rounded-full bg-slate-200 mb-1" />
            <div className="w-8 h-3 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Calendar() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [data, setData] = useState<CalendarResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pendingTransitions, setPendingTransitions] = useState<Record<string, string>>({})
  const [projects, setProjects] = useState<Project[]>([])

  const month = searchParams.get('month') || getCurrentMonth()
  const status = searchParams.get('status') ?? ''
  const platform = searchParams.get('platform') ?? ''
  const day = searchParams.get('day') ?? ''
  const projectId = searchParams.get('project_id') ?? ''
  const activeDay = day
  const hasActiveFilters = (status && status !== 'all') || (platform && platform !== 'all') || !!projectId

  const { year, month: monthNum } = monthToParts(month)
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const currentMonthStr = getCurrentMonth()
  const monthName = new Date(year, monthNum - 1).toLocaleString('es', { month: 'long' })

  const DAYS = [t('calendar.days.sun'), t('calendar.days.mon'), t('calendar.days.mar'), t('calendar.days.mi\u00E9'), t('calendar.days.jue'), t('calendar.days.vie'), t('calendar.days.s\u00E1b')]

  useEffect(() => {
    apiClient.get<Project[]>('/projects').then((res) => {
      if (res.data) setProjects(res.data)
    })
  }, [])

  const loadMonth = useCallback(async () => {
    setLoading(true)
    setError('')
    const queryPath = buildCalendarQuery({
      month,
      status: status || undefined,
      platform: platform || undefined,
      project_id: projectId || undefined,
    })
    const res = await apiClient.get<CalendarResult>(queryPath)
    if (res.error) {
      setError(res.error.message)
    } else if (res.data) {
      setData({
        ...res.data,
        items: res.data.items ?? [],
        counts_by_day: res.data.counts_by_day ?? {},
        project_dates: res.data.project_dates ?? null,
      })
    } else {
      setData(null)
    }
    setLoading(false)
  }, [month, status, platform, projectId])

  useEffect(() => { loadMonth() }, [loadMonth])

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
      await loadMonth()
    } else if (res.data) {
      setData((prev) => {
        if (!prev) return prev
        return { ...prev, items: prev.items.map((item) => item.id === itemId ? { ...item, status: res.data!.status } : item) }
      })
    }
  }

  async function handleTogglePaymentStatus(paymentId: string) {
    setData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        items: prev.items.map((item) =>
          item.id === paymentId ? { ...item, payment_status: item.payment_status === 'paid' ? 'pending' : 'paid' } : item
        ),
      }
    })
    const res = await apiClient.patch<CalendarItem>(`/payments/${paymentId}/toggle-status`)
    if (res.error) {
      setError(res.error.message)
      await loadMonth()
    } else if (res.data) {
      setData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          items: prev.items.map((item) =>
            item.id === paymentId ? { ...item, payment_status: res.data!.status } : item
          ),
        }
      })
    }
  }

  function navToMonth(newMonth: string) {
    const newParams = new URLSearchParams(searchParams)
    newParams.set('month', newMonth)
    setSearchParams(newParams, { replace: true })
  }

  function prevMonth() {
    if (monthNum === 1) navToMonth(partsToMonth(year - 1, 12))
    else navToMonth(partsToMonth(year, monthNum - 1))
  }

  function nextMonth() {
    if (monthNum === 12) navToMonth(partsToMonth(year + 1, 1))
    else navToMonth(partsToMonth(year, monthNum + 1))
  }

  function goToToday() {
    const newParams = new URLSearchParams(searchParams)
    newParams.set('month', currentMonthStr)
    setSearchParams(newParams, { replace: true })
  }

  function setPlatformFilter(value: string) {
    const newParams = new URLSearchParams(searchParams)
    if (value === 'all') newParams.delete('platform')
    else newParams.set('platform', value)
    setSearchParams(newParams, { replace: true })
  }

  function setStatusFilter(value: string) {
    const newParams = new URLSearchParams(searchParams)
    if (value === 'all') newParams.delete('status')
    else newParams.set('status', value)
    setSearchParams(newParams, { replace: true })
  }

  function setProjectFilter(value: string) {
    const newParams = new URLSearchParams(searchParams)
    if (!value) newParams.delete('project_id')
    else newParams.set('project_id', value)
    setSearchParams(newParams, { replace: true })
  }

  function selectDay(dateStr: string) {
    const newParams = new URLSearchParams(searchParams)
    newParams.set('day', dateStr)
    setSearchParams(newParams, { replace: true })
  }

  function isWithinProjectRange(dateStr: string): boolean {
    if (!data?.project_dates?.start_date || !data?.project_dates?.end_date) return false
    return dateStr >= data.project_dates.start_date && dateStr <= data.project_dates.end_date
  }

  const firstDay = new Date(year, monthNum - 1, 1)
  const lastDay = new Date(year, monthNum, 0)
  const startDayOfWeek = firstDay.getDay()
  const totalDays = lastDay.getDate()

  const days: (number | null)[] = []
  for (let i = 0; i < startDayOfWeek; i++) days.push(null)
  for (let d = 1; d <= totalDays; d++) days.push(d)

  const selectedItems = activeDay && data
    ? data.items.filter((item) => item.scheduled_date === activeDay)
    : []

  const contentItems = selectedItems.filter((i) => i.type === 'content')
  const taskItems = selectedItems.filter((i) => i.type === 'task')
  const paymentItems = selectedItems.filter((i) => i.type === 'payment')

  const countsByTypeByDay: Record<string, { content: number; task: number; payment: number }> = {}
  if (data) {
    for (const item of data.items) {
      if (!item.scheduled_date) continue
      if (!countsByTypeByDay[item.scheduled_date]) countsByTypeByDay[item.scheduled_date] = { content: 0, task: 0, payment: 0 }
      countsByTypeByDay[item.scheduled_date][item.type]++
    }
  }

  const isEmptyMonth = !loading && !error && data && (!data.items || data.items.length === 0)
  const isFilteredEmpty = !loading && !error && data && data.items && data.items.length > 0 &&
    hasActiveFilters && days.every((d) => {
      if (!d) return true
      const ds = `${year}-${String(monthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      return !data?.items.some((item) => item.scheduled_date === ds)
    })

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
        <h2 className="text-2xl font-bold text-slate-900">{t('calendar.title')}</h2>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-white transition-all active:scale-[0.97]">
            {t('calendar.prev')}
          </button>
          <span className="text-lg font-bold text-slate-900 min-w-[140px] text-center font-heading">
            {monthName} {year}
          </span>
          <button onClick={nextMonth} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-white transition-all active:scale-[0.97]">
            {t('calendar.next')}
          </button>
          <button onClick={goToToday} className="rounded-lg bg-socialflow-50 border border-socialflow-200 px-3 py-1.5 text-sm font-medium text-socialflow-700 hover:bg-socialflow-100 transition-all active:scale-[0.97]">
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
                    ? 'bg-socialflow-100 text-socialflow-700 shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {s === 'all' ? t('status.all') : getStatusLabel(s)}
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={platform || 'all'}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-socialflow-300"
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
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-socialflow-300"
          >
            <option value="">{t('calendar.allProjects')}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-slate-400">{t('calendar.activeFilters')}</span>
          {status && status !== 'all' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-socialflow-100 px-2 py-0.5 text-[10px] font-medium text-socialflow-700">
              {getStatusLabel(status)}
            </span>
          )}
          {platform && platform !== 'all' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-socialflow-100 px-2 py-0.5 text-[10px] font-medium text-socialflow-700">
              {getPlatformLabel(platform)}
            </span>
          )}
          {projectId && (
            <span className="inline-flex items-center gap-1 rounded-full bg-socialflow-100 px-2 py-0.5 text-[10px] font-medium text-socialflow-700">
              {projects.find((p) => p.id === projectId)?.name ?? projectId}
            </span>
          )}
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col lg:flex-row gap-6">
          <SkeletonGrid />
          <div className="w-full lg:w-72 shrink-0">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
              <div className="animate-pulse space-y-2">
                <div className="h-4 w-24 bg-slate-200 rounded" />
                <div className="h-3 w-32 bg-slate-100 rounded" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
            {(isEmptyMonth || isFilteredEmpty) && (
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-center">
                <p className="text-xs text-slate-400">{isEmptyMonth ? t('calendar.noContentMonth') : t('calendar.noContentFilters')}</p>
              </div>
            )}
            <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
              {DAYS.map((d) => (
                <div key={d} className="px-2 py-2 text-center text-xs font-medium text-slate-500">{d}</div>
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

                return (
                  <div
                    key={i}
                    data-testid={dateStr ? `day-cell-${dateStr}` : 'day-cell-empty'}
                    data-selected={isSelected ? 'true' : 'false'}
                    className={`min-h-[70px] sm:min-h-[90px] border-b border-r border-slate-100 p-1.5 ${
                      dayNum ? 'cursor-pointer hover:bg-slate-50' : ''
                    } ${isSelected ? 'bg-socialflow-50 ring-1 ring-inset ring-socialflow-300' : ''} ${
                      inProjectRange && dayNum ? 'bg-blue-50/50' : ''
                    }`}
                    onClick={() => dayNum && selectDay(dateStr!)}
                  >
                    {dayNum && (
                      <>
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                            isToday ? 'bg-socialflow-600 text-white' : 'text-slate-600'
                          }`}
                        >
                          {dayNum}
                        </span>
                        {dateStr && countsByTypeByDay[dateStr] && (
                          <div className="mt-0.5 flex flex-wrap gap-0.5">
                            {countsByTypeByDay[dateStr].content > 0 && (
                              <span className="inline-flex items-center rounded-full bg-socialflow-100 px-1.5 py-0.5 text-[10px] font-medium text-socialflow-700">
                                {countsByTypeByDay[dateStr].content}
                              </span>
                            )}
                            {countsByTypeByDay[dateStr].task > 0 && (
                              <span className="inline-flex items-center rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                                {countsByTypeByDay[dateStr].task}
                              </span>
                            )}
                            {countsByTypeByDay[dateStr].payment > 0 && (
                              <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                                ${' '}
                              </span>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="w-full lg:w-72 shrink-0">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
              {activeDay ? (
                <>
                  <h3 className="text-sm font-bold text-slate-900 mb-3">{activeDay}</h3>
                  {selectedItems.length === 0 ? (
                    <p className="text-xs text-slate-400">{t('calendar.noContentDay')}</p>
                  ) : (
                    <div className="space-y-4">
                      {contentItems.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{t('calendar.sectionContent')}</p>
                          <div className="space-y-2">
                            {contentItems.map((item) => {
                              const isPending = pendingTransitions[item.id] !== undefined
                              const allowedNext = NEXT_STATUS[item.status] ?? []
                              return (
                                <div key={item.id} className="rounded-xl border border-slate-100 px-3 py-2.5">
                                  <Link
                                    to={`/dashboard/content-items/${item.id}`}
                                    className="text-sm font-semibold text-slate-900 truncate hover:text-socialflow-600 block rounded"
                                  >
                                    {item.title}
                                  </Link>
                                  <div className="flex gap-2 mt-1">
                                    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${STATUS_COLORS[item.status] ?? 'bg-gray-100 text-gray-700'}`}>
                                      {getStatusLabel(item.status)}
                                    </span>
                                    <span className="text-[10px] text-slate-400">{getPlatformLabel(item.platform)}</span>
                                  </div>
                                  {allowedNext.length > 0 && !isPending && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {allowedNext.map((next) => (
                                        <button
                                          key={next}
                                          onClick={() => handleSidebarTransition(item.id, next)}
                                          disabled={isPending}
                                          className="rounded px-2 py-0.5 text-[10px] font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                                        >
                                          {getStatusLabel(next)}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                  {isPending && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {allowedNext.map((next) => (
                                        <button key={next} disabled className="rounded px-2 py-0.5 text-[10px] font-medium border border-slate-200 text-slate-400 opacity-50">
                                          {getStatusLabel(next)}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                  <Link
                                    to={`/dashboard/content-items/${item.id}`}
                                    className="text-[10px] text-socialflow-600 hover:text-socialflow-700 mt-2 inline-block font-medium rounded"
                                  >
                                    {t('calendar.detailsAndComments')}
                                  </Link>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {taskItems.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider mb-1.5">{t('calendar.sectionTasks')}</p>
                          <div className="space-y-2">
                            {taskItems.map((item) => (
                              <div key={item.id} className="rounded-xl border border-blue-100 bg-blue-50/30 px-3 py-2.5">
                                <Link
                                  to={`/dashboard/content-items/${item.id}`}
                                  className="text-sm font-semibold text-slate-900 truncate hover:text-socialflow-600 block rounded"
                                >
                                  📋 {item.title}
                                </Link>
                                <div className="flex gap-2 mt-1">
                                  <span className={`text-[10px] font-medium ${item.done ? 'text-green-600' : 'text-blue-600'}`}>
                                    {item.done ? t('calendar.taskDone') : t('calendar.taskPending')}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {paymentItems.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider mb-1.5">{t('calendar.sectionPayments')}</p>
                          <div className="space-y-2">
                            {paymentItems.map((item) => {
                              const isPaid = item.payment_status === 'paid'
                              return (
                                <div key={item.id} className={`rounded-xl border px-3 py-2.5 ${isPaid ? 'border-green-200 bg-green-50/40' : 'border-amber-200 bg-amber-50/40'}`}>
                                  <Link
                                    to={`/dashboard/finances`}
                                    className="text-sm font-semibold text-slate-900 truncate hover:text-socialflow-600 block rounded"
                                  >
                                    💰 {item.title}
                                  </Link>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] font-medium text-slate-600">
                                      {item.amount != null ? `$${item.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : ''}
                                    </span>
                                    <button
                                      onClick={() => handleTogglePaymentStatus(item.id)}
                                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                                        isPaid
                                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                          : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                      }`}
                                    >
                                      {isPaid ? t('finances.status.paid') : t('finances.status.pending')}
                                    </button>
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
