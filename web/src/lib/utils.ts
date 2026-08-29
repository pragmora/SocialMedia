import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// cn — merge Tailwind classes safely (shadcn/ui convention)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Currency formatting ────────────────────────────────────────

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
})

export function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) return currencyFormatter.format(0)
  return currencyFormatter.format(value)
}
