/**
 * Utilidades para teléfono → WhatsApp.
 *
 * Normalización para números argentinos (best effort):
 *  - Se descartan espacios, guiones, paréntesis y el "+".
 *  - Prefijo internacional "00" → se reemplaza por "+".
 *  - Si el número ya empieza con "54" (código de país), se conserva tal cual
 *    (por eso "+54 221..." o "+549 221..." funcionan directamente).
 *  - Si empieza con "0" (formato nacional), se asume móvil: "549" + resto sin el 0.
 *  - Si no tiene código de país ni el 0 inicial (p. ej. "2215555555"), se asume
 *    móvil argentino: "549" + número.
 *
 * Limitación documentada: no es posible saber con certeza si un número es móvil
 * o línea fija. En Argentina WhatsApp exige el prefijo "9" para móviles
 * (formato wa.me/549...). Se asume móvil salvo que el usuario ya escriba el
 * código de país completo (54/549), en cuyo caso se respeta su formato.
 */

export function normalizePhoneDigits(phone: string): string | null {
  let digits = (phone || '').replace(/\D/g, '')
  if (digits.length < 8) return null
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (!digits.startsWith('54')) {
    if (digits.startsWith('0')) {
      digits = '549' + digits.slice(1)
    } else {
      digits = '549' + digits
    }
  }
  return digits
}

export function buildWhatsAppLink(phone: string, text?: string): string | null {
  const digits = normalizePhoneDigits(phone)
  if (!digits) return null
  const url = `https://wa.me/${digits}`
  return text ? `${url}?text=${encodeURIComponent(text)}` : url
}
