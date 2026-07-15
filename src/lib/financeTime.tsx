import { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { getDateRange } from '@/components/TimeFilter';
import { DateInput } from '@/components/ui/date-input';

export type FinanceBucket = { label: string; start: Date; end: Date };

const CUSTOM_RANGE_PREFIX = 'custom:';
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const parseFinanceDate = (d?: string | null): Date | null => {
  if (!d) return null;
  const [y, m, day] = d.slice(0, 10).split('-').map(Number);
  if (!y || !m || !day) return null;
  return new Date(y, m - 1, day);
};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, days: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
const addMonths = (d: Date, months: number) => new Date(d.getFullYear(), d.getMonth() + months, 1);
const toDateKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const compactDate = (d: Date) => d.toLocaleDateString('en-US', {
  month: 'short',
  day: 'numeric',
  year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
});

const defaultCustomRange = () => {
  const today = startOfDay(new Date());
  return {
    startKey: toDateKey(addDays(today, -30)),
    endKey: toDateKey(today),
  };
};

export function buildCustomFinanceRange(startKey: string, endKey: string) {
  const start = parseFinanceDate(startKey);
  const end = parseFinanceDate(endKey);
  if (!start || !end) return `custom:${startKey}:${endKey}`;
  const first = start <= end ? start : end;
  const last = start <= end ? end : start;
  return `${CUSTOM_RANGE_PREFIX}${toDateKey(first)}:${toDateKey(last)}`;
}

export function parseCustomFinanceRange(period: string): {
  start: Date;
  end: Date;
  startKey: string;
  endKey: string;
  label: string;
} | null {
  if (!period.startsWith(CUSTOM_RANGE_PREFIX)) return null;
  const [, startKey, endKey] = period.split(':');
  if (!DATE_KEY_PATTERN.test(startKey ?? '') || !DATE_KEY_PATTERN.test(endKey ?? '')) return null;
  const start = parseFinanceDate(startKey);
  const end = parseFinanceDate(endKey);
  if (!start || !end) return null;
  const first = startOfDay(start <= end ? start : end);
  const last = startOfDay(start <= end ? end : start);
  const firstKey = toDateKey(first);
  const lastKey = toDateKey(last);
  return {
    start: first,
    end: last,
    startKey: firstKey,
    endKey: lastKey,
    label: `${compactDate(first)} – ${compactDate(last)}`,
  };
}

export function isInFinanceRange(date: string | null | undefined, period: string) {
  const dt = parseFinanceDate(date);
  if (!dt) return false;
  const customRange = parseCustomFinanceRange(period);
  if (customRange) return dt >= customRange.start && dt <= customRange.end;
  const { start, end } = getDateRange(period);
  return dt >= startOfDay(start) && dt <= end;
}

export function financeRangeLabel(period: string) {
  const customRange = parseCustomFinanceRange(period);
  if (customRange) return customRange.label;
  return getDateRange(period).label;
}

export function getFinanceDateRange(period: string): { start: Date; end: Date; label: string } {
  const customRange = parseCustomFinanceRange(period);
  if (customRange) return { start: customRange.start, end: customRange.end, label: customRange.label };
  return getDateRange(period);
}

export function buildFinanceBuckets(period: string, dates: (string | null | undefined)[] = []): FinanceBucket[] {
  const { start, end } = getFinanceDateRange(period);
  const parsedDates = dates
    .map(parseFinanceDate)
    .filter(Boolean)
    .sort((a, b) => a!.getTime() - b!.getTime()) as Date[];
  const rangeEnd = startOfDay(end);
  const rangeStart = period === 'all' && parsedDates[0] && parsedDates[0] > start
    ? startOfDay(parsedDates[0])
    : startOfDay(start);
  const daySpan = Math.max(1, Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / 86400000) + 1);

  if (daySpan <= 45) {
    return Array.from({ length: daySpan }, (_, i) => {
      const s = addDays(rangeStart, i);
      return { label: s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), start: s, end: addDays(s, 1) };
    });
  }

  if (daySpan <= 180) {
    const buckets: FinanceBucket[] = [];
    for (let s = rangeStart; s <= rangeEnd; s = addDays(s, 7)) {
      buckets.push({ label: s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), start: s, end: addDays(s, 7) });
    }
    return buckets;
  }

  const monthStart = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
  const months = Math.max(1, (rangeEnd.getFullYear() - monthStart.getFullYear()) * 12 + rangeEnd.getMonth() - monthStart.getMonth() + 1);
  const visibleMonths = Math.min(months, 18);
  const first = addMonths(monthStart, months - visibleMonths);
  return Array.from({ length: visibleMonths }, (_, i) => {
    const s = addMonths(first, i);
    return { label: s.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), start: s, end: addMonths(s, 1) };
  });
}

const OPTIONS = [
  { id: '1d', label: 'Today', short: 'Today' },
  { id: '1w', label: 'Last 7 days', short: '7D' },
  { id: '1m', label: 'Last 30 days', short: '30D' },
  { id: 'quarter', label: 'This quarter', short: 'QTR' },
  { id: '1y', label: 'This year', short: 'YTD' },
  { id: 'all', label: 'All time', short: 'All' },
];

export function FinanceRangePicker({
  value,
  onChange,
  accentColor = '#9D7E3F',
  className = '',
}: {
  value: string;
  onChange: (value: string) => void;
  accentColor?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const customRange = parseCustomFinanceRange(value);
  const defaults = defaultCustomRange();
  const [customStart, setCustomStart] = useState(customRange?.startKey ?? defaults.startKey);
  const [customEnd, setCustomEnd] = useState(customRange?.endKey ?? defaults.endKey);
  const current = OPTIONS.find(o => o.id === value);
  const currentLabel = customRange?.label ?? current?.label ?? OPTIONS[5].label;

  useEffect(() => {
    const nextCustomRange = parseCustomFinanceRange(value);
    if (!nextCustomRange) return;
    setCustomStart(nextCustomRange.startKey);
    setCustomEnd(nextCustomRange.endKey);
  }, [value]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const updateCustomRange = (startKey: string, endKey: string) => {
    setCustomStart(startKey);
    setCustomEnd(endKey);
    if (DATE_KEY_PATTERN.test(startKey) && DATE_KEY_PATTERN.test(endKey)) {
      onChange(buildCustomFinanceRange(startKey, endKey));
    }
  };

  const activateCustomRange = () => {
    const active = parseCustomFinanceRange(value);
    const startKey = active?.startKey ?? customStart ?? defaults.startKey;
    const endKey = active?.endKey ?? customEnd ?? defaults.endKey;
    setCustomStart(startKey);
    setCustomEnd(endKey);
    onChange(buildCustomFinanceRange(startKey, endKey));
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`group flex w-full items-center justify-center gap-2 min-w-[10.75rem] sm:min-w-[12rem] px-3.5 py-2 border text-[11px] font-semibold transition-all duration-150 whitespace-nowrap shadow-[0_1px_0_rgba(255,255,255,0.45)_inset] dark:shadow-[0_1px_0_rgba(255,255,255,0.05)_inset] ${
          open
            ? 'border-foreground/30 bg-secondary text-foreground'
            : 'border-border bg-background hover:border-foreground/25 hover:bg-secondary/60 text-foreground/80'
        }`}
      >
        <span className="w-5 h-5 flex items-center justify-center" style={{ backgroundColor: `${accentColor}14`, color: accentColor }}>
          <Calendar className="w-3 h-3" strokeWidth={1.5} />
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block text-[7px] uppercase tracking-[0.22em] text-muted-foreground leading-none mb-0.5">Range</span>
          <span className="block truncate">{currentLabel}</span>
        </span>
        <ChevronDown className={`w-3 h-3 opacity-60 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} strokeWidth={2} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.11, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-full mt-2 w-[min(92vw,28rem)] border border-border bg-background shadow-[0_22px_70px_rgba(0,0,0,0.18)] dark:shadow-[0_22px_70px_rgba(0,0,0,0.55)] z-50 overflow-hidden"
          >
            <div className="px-3.5 pt-3 pb-2 border-b border-border/50" style={{ background: `linear-gradient(135deg, ${accentColor}12, transparent 70%)` }}>
              <div className="text-[8px] uppercase tracking-[0.24em] text-muted-foreground font-bold">Time Range</div>
              <div className="text-[10px] text-muted-foreground mt-1">Filters visible records, totals, exports, and card charts.</div>
            </div>
            <div className="p-1.5">
              {OPTIONS.map(option => {
                const active = option.id === value;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => { onChange(option.id); setOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-left text-[11px] transition-colors border ${
                      active
                        ? 'bg-secondary/60 font-semibold text-foreground border-border'
                        : 'hover:bg-secondary/40 text-muted-foreground hover:text-foreground border-transparent'
                    }`}
                  >
                    <span>
                      <span className="block">{option.label}</span>
                      <span className="block text-[8px] uppercase tracking-[0.16em] text-muted-foreground/70 mt-0.5">{option.short}</span>
                    </span>
                    {active && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: accentColor }} />}
                  </button>
                );
              })}
              <div className="mt-1.5 border-t border-border/60 pt-1.5">
                <button
                  type="button"
                  onClick={activateCustomRange}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left text-[11px] transition-colors border ${
                    customRange
                      ? 'bg-secondary/60 font-semibold text-foreground border-border'
                      : 'hover:bg-secondary/40 text-muted-foreground hover:text-foreground border-transparent'
                  }`}
                >
                  <span>
                    <span className="block">Custom range</span>
                    <span className="block text-[8px] uppercase tracking-[0.16em] text-muted-foreground/70 mt-0.5">
                      Start and end date
                    </span>
                  </span>
                  {customRange && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: accentColor }} />}
                </button>

                {customRange && (
                  <div className="mx-1 mt-2 border border-border/70 bg-secondary/20 p-3 shadow-[0_1px_0_rgba(255,255,255,0.55)_inset]">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="space-y-1">
                        <span className="block text-[8px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Start</span>
                        <DateInput
                          value={customStart}
                          max={customEnd || undefined}
                          onChange={e => updateCustomRange(e.target.value, customEnd)}
                          className="h-10 min-w-0 text-[13px]"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="block text-[8px] font-bold uppercase tracking-[0.18em] text-muted-foreground">End</span>
                        <DateInput
                          value={customEnd}
                          min={customStart || undefined}
                          onChange={e => updateCustomRange(customStart, e.target.value)}
                          className="h-10 min-w-0 text-[13px]"
                        />
                      </label>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-[10px] text-muted-foreground">{financeRangeLabel(value)}</span>
                      <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="shrink-0 border border-border bg-background px-2.5 py-1 text-[10px] font-semibold text-foreground transition-colors hover:bg-foreground hover:text-background"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
