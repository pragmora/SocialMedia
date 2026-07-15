/**
 * Canonical status transition map shared by Calendar and ContentDetail.
 * Each key is a current status; the value is the array of allowable next statuses.
 */
const ALL_STATUSES = ['draft', 'review', 'approved', 'published', 'archived'];
export const NEXT_STATUS: Record<string, string[]> = {};
for (const s of ALL_STATUSES) {
  NEXT_STATUS[s] = ALL_STATUSES.filter((t) => t !== s);
}
