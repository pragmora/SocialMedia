/**
 * Utilidades de color para clientes.
 * Espeja la paleta de la migración 012_client_color.sql y del backend.
 */

export const CLIENT_COLOR_PALETTE = [
  '#4F46E5', // índigo
  '#059669', // esmeralda
  '#7C3AED', // violeta
  '#EA580C', // naranja
  '#0EA5E9', // cielo
  '#E11D48', // rosa
  '#2563EB', // azul
  '#16A34A', // verde
  '#9333EA', // púrpura
  '#DC2626', // rojo
  '#0891B2', // cian
  '#D97706', // ámbar
]

export function isValidHexColor(value?: string | null): boolean {
  return !!value && /^#[0-9A-Fa-f]{6}$/.test(value)
}

/** Color neutro para clientes sin color definido (nada se asigna automáticamente). */
export const NEUTRAL_CLIENT_COLOR = '#64748b'

/** Normaliza un color de cliente: hex válido o neutro si no tiene color. */
export function resolveClientColor(color?: string | null): string {
  return isValidHexColor(color) ? color! : NEUTRAL_CLIENT_COLOR
}

/** Convierte #RRGGBB a rgba() con alpha dado (0..1). */
export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** Estilos suaves (fondo + texto + borde) derivados del color del cliente. */
export function softColorStyles(hex: string): { background: string; color: string; borderColor: string } {
  return {
    background: hexToRgba(hex, 0.12),
    color: hex,
    borderColor: hexToRgba(hex, 0.35),
  }
}
