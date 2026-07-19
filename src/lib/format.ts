export const fmtUSD = (n: number | string | null | undefined) => {
  const v = typeof n === 'string' ? parseFloat(n) : (n ?? 0);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(v || 0);
};

// `new Date().toISOString().slice(0, 10)` gives the UTC calendar date, which
// runs ahead of local date for the evening hours in any UTC-negative zone
// (e.g. all of the US) — a check/transaction logged at 8pm Houston time gets
// stamped "tomorrow", then vanishes from range filters that compare against
// local "now" until the browser's clock actually reaches that date. Use this
// wherever a date field should default to "today".
export const todayLocalDate = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const fmtDate = (d: string | Date | null | undefined) => {
  if (!d) return '—';
  // Bare "YYYY-MM-DD" (what Postgres DATE columns come back as) has no
  // timezone, so `new Date(...)` parses it as UTC midnight — then
  // `toLocaleDateString` renders it in the browser's local zone, which
  // rolls it back a day anywhere behind UTC. Anchoring to local midnight
  // avoids that shift; datetime strings (already timezone-aware) pass through.
  const date = typeof d === 'string'
    ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T00:00:00` : d)
    : d;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
};

export const fmtBytes = (bytes: number | null | undefined) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

export const amountToWords = (amount: number): string => {
  if (amount === 0) return 'Zero and 00/100';
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  const scales = ['','Thousand','Million','Billion'];
  const dollars = Math.floor(amount);
  const cents = Math.round((amount - dollars) * 100);
  const chunk = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n/10)] + (n%10 ? '-' + ones[n%10] : '');
    return ones[Math.floor(n/100)] + ' Hundred' + (n%100 ? ' ' + chunk(n%100) : '');
  };
  let n = dollars; let i = 0; let words = '';
  if (n === 0) words = 'Zero';
  while (n > 0) {
    const c = n % 1000;
    if (c) words = chunk(c) + (scales[i] ? ' ' + scales[i] : '') + (words ? ' ' + words : '');
    n = Math.floor(n / 1000); i++;
  }
  return `${words} and ${cents.toString().padStart(2,'0')}/100`;
};
