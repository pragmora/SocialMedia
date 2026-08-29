import { useState, type FormEvent } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '@/lib/apiClient'
import { useMe } from '@/context/MeContext'
import ThemeToggle from '@/components/ThemeToggle'

export default function Register() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const invite = searchParams.get('invite')
  const { reauthenticate, switchWorkspace } = useMe()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await apiClient.post<{ id: string; email: string; name: string }>(
      '/auth/register',
      { name: name || undefined, email, password },
    )

    if (res.error) {
      setLoading(false)
      setError(res.error.message)
      return
    }

    const ok = await reauthenticate()

    setLoading(false)

    if (!ok) {
      setError(t('auth.accountCreatedButSessionFailed'))
      return
    }

    if (invite) {
      const claim = await apiClient.post<{ workspace_id: string }>(`/invites/${invite}/claim`)
      if (claim.data?.workspace_id) {
        await switchWorkspace(claim.data.workspace_id)
      } else {
        await reauthenticate()
      }
    }

    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#faf9f6] dark:bg-slate-950 flex items-center justify-center px-4"
      style={{ backgroundImage: 'radial-gradient(ellipse at 30% 20%, rgba(76,110,245,0.06) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(249,115,22,0.04) 0%, transparent 60%)' }}>
      <ThemeToggle className="fixed top-4 right-4 z-40 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 bg-white/70 dark:bg-slate-800/70 backdrop-blur shadow-sm" />
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-socialflow-500 to-socialflow-700 flex items-center justify-center text-white font-bold text-lg mx-auto mb-4 shadow-lg shadow-socialflow-600/20">
            S
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t('auth.registerTitle')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('auth.registerSubtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm">
          {error && (
            <div role="alert" className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300 mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('auth.name')}</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-sm focus:border-socialflow-500 focus:outline-none focus:ring-1 focus:ring-socialflow-500"
                placeholder={t('auth.namePlaceholder')}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('auth.email')}</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-sm focus:border-socialflow-500 focus:outline-none focus:ring-1 focus:ring-socialflow-500"
                placeholder={t('auth.emailPlaceholder')}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('auth.password')}</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-sm focus:border-socialflow-500 focus:outline-none focus:ring-1 focus:ring-socialflow-500"
                placeholder={t('auth.passwordMinLength')}
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-socialflow-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-socialflow-700 transition-colors disabled:opacity-50 mt-5 shadow-sm active:scale-[0.98]"
          >
            {loading ? t('auth.creatingAccount') : t('auth.register')}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          {t('auth.hasAccount')}{' '}
          <Link to="/login" className="text-socialflow-600 dark:text-socialflow-400 hover:text-socialflow-700 dark:hover:text-socialflow-300 font-semibold">
            {t('auth.logIn')}
          </Link>
        </p>
      </div>
    </div>
  )
}
