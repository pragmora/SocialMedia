// Paleta por defecto para clientes sin color definido.
// Espeja la paleta usada en la migración 012_client_color.sql.
const CLIENT_COLOR_PALETTE = [
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
];

export function isValidHexColor(value?: string | null): boolean {
  return !!value && /^#[0-9A-Fa-f]{6}$/.test(value);
}

export { CLIENT_COLOR_PALETTE };
