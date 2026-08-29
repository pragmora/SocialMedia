import { createContext, useContext } from 'react'

export interface ToastContextValue {
  showToast: (message: string, tone?: 'success' | 'error') => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider')
  return ctx
}
