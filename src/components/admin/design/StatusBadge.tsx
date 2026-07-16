export type StatusTone = 'positive' | 'warning' | 'destructive' | 'info' | 'violet' | 'accent' | 'neutral';

const TONE_CLASSES: Record<StatusTone, string> = {
  positive: 'bg-positive/10 text-positive',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
  info: 'bg-blue-500/10 text-blue-500',
  violet: 'bg-violet-500/10 text-violet-500',
  accent: 'bg-accent/10 text-accent',
  neutral: 'bg-secondary text-muted-foreground',
};

export function StatusBadge({ label, tone = 'neutral' }: { label: string; tone?: StatusTone }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] ${TONE_CLASSES[tone]}`}>
      {label.replace(/_/g, ' ')}
    </span>
  );
}
