import { useEffect, useRef } from 'react';
import type { ComponentType, KeyboardEvent } from 'react';
import { motion } from 'framer-motion';

/* ── FlushTabs — professional underline navigation ────────────────────────────
   A horizontal tab strip whose only "selected" indicator is a sliding accent
   underline sitting flush on a full-width border, not a boxed/pill button.
   Used at two levels in the project detail view (the outer Overview/
   Reconciliation/Documents/Photos/Activity strip and the inner reconciliation
   sub-tab strip) — pass a distinct `layoutId` per mounted instance so the two
   strips' sliding underlines never try to animate into each other, and a
   `size` of 'sm' for the second-level nav.

   Scrolls horizontally at any width instead of falling back to a <select> —
   the active tab auto-scrolls into view and receives focus on change, and
   arrow-key roving tabindex + ARIA tablist roles keep it keyboard-accessible
   since plain <button> elements no longer get that behavior for free. ── */

export interface FlushTabItem {
  key: string;
  label: string;
  icon: ComponentType<any>;
  count?: number;
}

const SIZES = {
  default: { text: 'text-[11px]', icon: 'w-4 h-4', pad: 'px-3 pb-3 pt-2', gap: 'gap-2' },
  sm:      { text: 'text-[9.5px]', icon: 'w-3.5 h-3.5', pad: 'px-2.5 pb-2.5 pt-1.5', gap: 'gap-1.5' },
} as const;

export function FlushTabs({
  items, activeKey, onChange, size = 'default', layoutId,
}: {
  items: FlushTabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  size?: 'default' | 'sm';
  layoutId: string;
}) {
  const s = SIZES[size];
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [activeKey]);

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    const next = items[(idx + dir + items.length) % items.length];
    onChange(next.key);
    requestAnimationFrame(() => activeRef.current?.focus());
  };

  return (
    <div className="relative">
      <div role="tablist" className="flex overflow-x-auto scrollbar-none border-b border-border">
        {items.map((item, idx) => {
          const Icon = item.icon;
          const active = item.key === activeKey;
          return (
            <button
              key={item.key}
              ref={active ? activeRef : undefined}
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(item.key)}
              onKeyDown={e => handleKeyDown(e, idx)}
              className={`relative flex items-center ${s.gap} ${s.pad} ${s.text} font-bold uppercase tracking-[0.1em] whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none ${
                active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80'
              }`}
            >
              <Icon className={s.icon} strokeWidth={active ? 2.1 : 1.7} />
              {item.label}
              {!!item.count && (
                <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-black leading-none ${active ? 'bg-accent/15 text-accent' : 'bg-secondary text-muted-foreground'}`}>
                  {item.count}
                </span>
              )}
              {active && (
                <motion.span
                  layoutId={layoutId}
                  className="absolute inset-x-2 -bottom-px h-[2.5px] rounded-full bg-accent"
                  transition={{ type: 'spring', stiffness: 480, damping: 38 }}
                />
              )}
            </button>
          );
        })}
      </div>
      <div className="pointer-events-none absolute left-0 top-0 bottom-px w-8 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-px w-8 bg-gradient-to-l from-background to-transparent" />
    </div>
  );
}
