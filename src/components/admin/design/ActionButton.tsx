import type { ReactNode, CSSProperties } from 'react';

type Variant = 'positive' | 'negative' | 'neutral' | 'primary';

const VARIANT_CLASSES: Record<Variant, string> = {
  positive: 'border border-positive/30 bg-positive/5 text-positive hover:bg-positive/10',
  negative: 'border border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10',
  neutral: 'border border-border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground hover:border-foreground/20',
  primary: 'border border-accent bg-accent text-accent-foreground shadow-sm hover:opacity-90',
};

export function ActionButton({ children, variant = 'neutral', onClick, icon: Icon, disabled, type = 'button', className = '', style }: {
  children: ReactNode;
  variant?: Variant;
  onClick?: () => void;
  icon?: any;
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={style}
      className={`inline-flex min-h-8 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {Icon && <Icon className="w-3 h-3 shrink-0" strokeWidth={2} />}
      {children}
    </button>
  );
}
