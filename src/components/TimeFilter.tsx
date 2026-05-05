import { useMemo } from 'react';

interface TimeFilterProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const periods = [
  { value: '1d', label: '1D' },
  { value: '1w', label: '1W' },
  { value: '1m', label: '1M' },
  { value: 'quarter', label: 'Qtr' },
  { value: '1y', label: '1Y' },
  { value: 'all', label: 'All' },
];

export function getDateRange(period: string): { start: Date; end: Date; label: string } {
  const now = new Date();
  let start: Date;
  const end = new Date(now);
  let label: string;

  switch (period) {
    case '1d':
      start = new Date(now);
      start.setHours(0, 0, 0, 0);
      label = 'Today';
      break;
    case '1w':
      start = new Date(now);
      start.setDate(start.getDate() - 7);
      label = 'Past 7 Days';
      break;
    case '1m':
      start = new Date(now);
      start.setMonth(start.getMonth() - 1);
      label = 'Past 30 Days';
      break;
    case 'quarter':
      start = new Date(now);
      start.setMonth(start.getMonth() - 3);
      label = 'Past Quarter';
      break;
    case '1y':
      start = new Date(now);
      start.setFullYear(start.getFullYear() - 1);
      label = 'Past Year';
      break;
    case 'all':
    default:
      start = new Date(2020, 0, 1);
      label = 'All Time';
      break;
  }

  return { start, end, label };
}

export default function TimeFilter({ value, onChange, className = '' }: TimeFilterProps) {
  return (
    <div className={`inline-flex border border-border ${className}`}>
      {periods.map(p => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          className={`px-2.5 py-1.5 text-[10px] uppercase tracking-[0.12em] font-medium transition-colors ${
            value === p.value
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}