import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface TimeFilterProps {
  value: string;
  onChange: (value: string) => void;
  customStart?: string;
  customEnd?: string;
  onCustomChange?: (start: string, end: string) => void;
  className?: string;
  label?: string;
}

const periods = [
  { value: '1d', label: '1D' },
  { value: '1w', label: '1W' },
  { value: '1m', label: '1M' },
  { value: 'quarter', label: 'QTR' },
  { value: '1y', label: '1Y' },
  { value: 'all', label: 'ALL' },
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

export default function TimeFilter({ value, onChange, customStart, customEnd, onCustomChange, className = '', label }: TimeFilterProps) {
  const [customOpen, setCustomOpen] = useState(false);
  const [tempStart, setTempStart] = useState<Date | undefined>(customStart ? new Date(customStart) : undefined);
  const [tempEnd, setTempEnd] = useState<Date | undefined>(customEnd ? new Date(customEnd) : undefined);

  const isCustom = value === 'custom';

  const handleApplyCustom = () => {
    if (tempStart && tempEnd && onCustomChange) {
      onCustomChange(tempStart.toISOString().slice(0, 10), tempEnd.toISOString().slice(0, 10));
      onChange('custom');
      setCustomOpen(false);
    }
  };

  const dateLabel = isCustom && customStart && customEnd
    ? `${format(new Date(customStart), 'MMM d')} – ${format(new Date(customEnd), 'MMM d')}`
    : 'Custom Range';

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {label && <span className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground font-medium mr-1">{label}</span>}
      <div className="inline-flex border border-border rounded-sm overflow-hidden">
        {periods.map(p => (
          <button
            key={p.value}
            onClick={() => onChange(p.value)}
            className={`px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] font-medium transition-all duration-150 ${
              value === p.value && !isCustom
                ? 'bg-foreground text-background shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
            } ${p.value === 'all' ? '' : 'border-r border-border'}`}
          >
            {p.label}
          </button>
        ))}
        <Popover open={customOpen} onOpenChange={setCustomOpen}>
          <PopoverTrigger asChild>
            <button
              className={`px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] font-medium transition-all duration-150 flex items-center gap-1
                ${isCustom
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                }`}
            >
              <CalendarIcon className="w-2.5 h-2.5" strokeWidth={2} />
              <span>Custom</span>
              <ChevronDown className={`w-2.5 h-2.5 transition-transform ${customOpen ? 'rotate-180' : ''}`} />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 rounded-sm border-border" align="end" sideOffset={4}>
            <div className="p-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground font-medium mb-1.5 text-center">Start Date</div>
                  <Calendar
                    mode="single"
                    selected={tempStart}
                    onSelect={setTempStart}
                    fromYear={2020}
                    toYear={new Date().getFullYear()}
                    className="rounded-sm border border-border"
                    classNames={{
                      day_selected: 'bg-foreground text-background hover:bg-foreground hover:text-background',
                      day_today: 'bg-secondary text-foreground',
                    }}
                  />
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground font-medium mb-1.5 text-center">End Date</div>
                  <Calendar
                    mode="single"
                    selected={tempEnd}
                    onSelect={setTempEnd}
                    fromYear={2020}
                    toYear={new Date().getFullYear()}
                    className="rounded-sm border border-border"
                    classNames={{
                      day_selected: 'bg-foreground text-background hover:bg-foreground hover:text-background',
                      day_today: 'bg-secondary text-foreground',
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-border">
                <div className="text-[10px] text-muted-foreground font-mono-tab">
                  {tempStart && tempEnd ? `${format(tempStart, 'MMM d, yyyy')} – ${format(tempEnd, 'MMM d, yyyy')}` : 'Select start & end'}
                </div>
                <Button
                  size="sm"
                  className="rounded-none h-7 text-[10px]"
                  disabled={!tempStart || !tempEnd}
                  onClick={handleApplyCustom}
                >
                  Apply
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}