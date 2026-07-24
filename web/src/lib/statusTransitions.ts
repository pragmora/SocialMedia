/**
 * Canonical status transition map shared by Calendar and ContentDetail.
 * Each key is a current status; the value is the array of allowable next statuses.
 */
const ALL_STATUSES = ['pre_produccion', 'en_espera', 'en_edicion', 'validacion', 'listo_para_subir', 'subido', 'archivado'];
export const NEXT_STATUS: Record<string, string[]> = {};
for (const s of ALL_STATUSES) {
  NEXT_STATUS[s] = ALL_STATUSES.filter((t) => t !== s);
}
