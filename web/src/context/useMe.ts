import { useContext } from 'react'
import MeContext, { type CurrentUser } from './MeContext'

export function useMe() {
  const ctx = useContext(MeContext)
  if (!ctx) {
    throw new Error('useMe must be used within a MeProvider')
  }
  return ctx
}

/**
 * Lee el usuario actual sin exigir MeProvider. Fuera de un provider
 * devuelve null (útil para gateos de UI que nunca deben romper la app).
 */
export function useOptionalUser(): CurrentUser | null {
  const ctx = useContext(MeContext)
  return ctx?.user ?? null
}
