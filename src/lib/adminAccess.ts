/* ── Shared /admin-perimeter access constants ──────────────────────────────
   Admin.tsx owns the canonical PIN screen; any other page that lives in the
   /admin security perimeter (e.g. the CTC forecasting worksheet) reuses
   these same constants via AdminPinGate.tsx rather than duplicating them. ── */
export const ADMIN_PIN = '011491';
export const ADMIN_KEY = 'hou-admin-unlocked';
