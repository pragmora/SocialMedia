import { useCallback, useState, type ReactNode } from 'react'
import { ToastContext } from './useToast'

interface Toast {
  id: number
  message: string
  tone: 'success' | 'error'
}

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback((message: string, tone: 'success' | 'error' = 'success') => {
    const id = nextId++
    setToasts((prev) => [...prev.slice(-2), { id, message, tone }])
    window.setTimeout(() => removeToast(id), 3500)
  }, [removeToast])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2" aria-live="polite">
          {toasts.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => removeToast(t.id)}
              className={`animate-scale-in rounded-xl px-4 py-2.5 text-sm font-medium shadow-lg transition-all hover:brightness-105 ${
                t.tone === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
              }`}
            >
              {t.message}
            </button>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  )
}
