import { useTranslation } from 'react-i18next'

export default function Loading() {
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-center gap-2 py-12">
      <div className="w-6 h-6 border-2 border-socialflow-600 border-t-transparent rounded-full animate-spin" />
      <span className="text-sm text-slate-500 dark:text-slate-400">{t('common.loading')}</span>
    </div>
  )
}
