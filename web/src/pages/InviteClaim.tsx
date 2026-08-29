import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '@/lib/apiClient'
import { useMe } from '@/context/useMe'
import ThemeToggle from '@/components/ThemeToggle'

export default function InviteClaim() {
  const { t } = useTranslation()
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { user, loading: authLoading, reauthenticate } = useMe()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token || authLoading) return
    if (!user) return

    queueMicrotask(() => setLoading(true))
    apiClient.post(`/invites/${token}/claim`).then((res) => {
      setLoading(false)
      if (res.error) {
        setError(res.error.message)
      } else {
        setSuccess(true)
        reauthenticate()
        setTimeout(() => navigate('/dashboard'), 2000)
      }
    })
  }, [token, user, authLoading, reauthenticate, navigate])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#faf9f6] dark:bg-slate-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-socialflow-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#faf9f6] dark:bg-slate-950 flex items-center justify-center px-4">
        <ThemeToggle className="fixed top-4 right-4 z-40 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 bg-white/70 dark:bg-slate-800/70 backdrop-blur shadow-sm" />
        <div className="text-center max-w-sm">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">{t('app.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            Para aceptar la invitación, necesitá iniciar sesión o crear una cuenta.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              to={`/login?invite=${token}`}
              className="rounded-xl bg-socialflow-600 px-6 py-3 text-white font-semibold hover:bg-socialflow-700 transition-colors shadow-lg"
            >
              {t('auth.logIn')}
            </Link>
            <Link
              to={`/register?invite=${token}`}
              className="rounded-xl border-2 border-slate-200 dark:border-slate-700 px-6 py-3 text-slate-700 dark:text-slate-200 font-semibold hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
            >
              {t('auth.register')}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#faf9f6] dark:bg-slate-950 flex items-center justify-center px-4">
      <ThemeToggle className="fixed top-4 right-4 z-40 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 bg-white/70 dark:bg-slate-800/70 backdrop-blur shadow-sm" />
      <div className="text-center max-w-sm">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">{t('app.title')}</h1>

        {loading && (
          <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-socialflow-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-500 dark:text-slate-400 text-sm">Procesando invitación...</p>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300 mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-green-200 dark:border-green-900/60 bg-green-50 dark:bg-green-900/40 px-4 py-3 text-sm text-green-700 dark:text-green-300 mb-4">
            Te uniste al workspace. Redirigiendo al panel...
          </div>
        )}
      </div>
    </div>
  )
}
