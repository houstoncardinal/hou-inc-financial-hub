export function parseMoneyInput(value: string | number | null | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const cleaned = String(value ?? '').replace(/[^0-9.-]/g, '');
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function moneyInputString(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  const parsed = parseMoneyInput(value);
  if (!parsed) return '';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(parsed);
}

export function normalizeMoneyText(value: string): string {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  const normalized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned;
  const [whole, cents] = normalized.split('.');
  const groupedWhole = whole ? Number(whole).toLocaleString('en-US') : '';
  if (normalized.endsWith('.')) return `${groupedWhole}.`;
  return cents !== undefined ? `${groupedWhole}.${cents.slice(0, 2)}` : groupedWhole;
}
