import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '@/lib/apiClient'
import { useMe } from '@/context/MeContext'

export default function Register() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { reauthenticate } = useMe()
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

    // After registration, reauthenticate to sync MeContext via cookie-based session
    const ok = await reauthenticate()

    setLoading(false)

    if (!ok) {
      setError(t('auth.accountCreatedButSessionFailed'))
      return
    }

    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('auth.registerTitle')}</h1>
        <p className="text-sm text-gray-500 mb-8">
          {t('auth.registerSubtitle')}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">{t('auth.name')}</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-socialflow-500 focus:outline-none focus:ring-1 focus:ring-socialflow-500"
              placeholder={t('auth.namePlaceholder')}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">{t('auth.email')}</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-socialflow-500 focus:outline-none focus:ring-1 focus:ring-socialflow-500"
              placeholder={t('auth.emailPlaceholder')}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">{t('auth.password')}</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-socialflow-500 focus:outline-none focus:ring-1 focus:ring-socialflow-500"
              placeholder={t('auth.passwordMinLength')}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-socialflow-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-socialflow-700 transition-colors disabled:opacity-50"
          >
            {loading ? t('auth.creatingAccount') : t('auth.register')}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          {t('auth.hasAccount')}{' '}
          <Link to="/login" className="text-socialflow-600 hover:text-socialflow-700 font-medium">
            {t('auth.logIn')}
          </Link>
        </p>
      </div>
    </div>
  )
}
