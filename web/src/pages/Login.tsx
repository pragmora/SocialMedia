import { useState, type FormEvent } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '@/lib/apiClient'
import { useMe } from '@/context/MeContext'
import ThemeToggle from '@/components/ThemeToggle'

const LOGO_PATH = import.meta.env.VITE_LOGO_PATH || '/pragmora_solutions_vector.svg'
const LOGO_ALT = import.meta.env.VITE_LOGO_ALT || 'SocialFlow'

export default function Login() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const invite = searchParams.get('invite')
  const { reauthenticate, switchWorkspace } = useMe()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await apiClient.post<{ id: string; email: string; name: string }>(
      '/auth/login',
      { email, password },
    )

    if (res.error) {
      setLoading(false)
      setError(res.error.message)
      return
    }

    const ok = await reauthenticate()

    setLoading(false)

    if (!ok) {
      setError(t('auth.loginSuccessButSessionFailed'))
      return
    }

    if (invite) {
      const claim = await apiClient.post<{ workspace_id: string }>(`/invites/${invite}/claim`)
      if (claim.data?.workspace_id) {
        await switchWorkspace(claim.data.workspace_id)
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
          <img
            src={LOGO_PATH}
            alt={LOGO_ALT}
            className="w-16 h-16 rounded-xl mx-auto mb-4 shadow-lg shadow-socialflow-600/20"
          />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t('auth.loginTitle')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('auth.loginSubtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm">
          {error && (
            <div role="alert" className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300 mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4">
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
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2.5 pr-10 text-sm focus:border-socialflow-500 focus:outline-none focus:ring-1 focus:ring-socialflow-500"
                  placeholder={t('auth.passwordPlaceholder')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? (
                    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-socialflow-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-socialflow-700 transition-colors disabled:opacity-50 mt-5 shadow-sm active:scale-[0.98]"
          >
            {loading ? t('auth.loggingIn') : t('auth.logIn')}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="text-socialflow-600 dark:text-socialflow-400 hover:text-socialflow-700 dark:hover:text-socialflow-300 font-semibold">
            {t('auth.register')}
          </Link>
        </p>
      </div>
    </div>
  )
}
