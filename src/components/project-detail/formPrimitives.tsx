import type { ReactNode } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/* ── Shared reconciliation-tool primitives ────────────────────────────────────
   Extracted from ProjectBreakdown.tsx so new sub-tab components (payments,
   expenses, and future additions) can reuse the same guided-entry look
   without reaching into a page-scoped file's internals. Relies on the
   pb-workflow-dialog/-head/-body CSS classes, which live in ProjectBreakdown's
   PB_CSS and are injected unconditionally whenever the reconciliation view is
   mounted — no CSS needs to move alongside this. ── */

export function KpiGrid({ items }: { items: { label: string; value: string; sub?: string; accent?: boolean }[] }) {
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-${items.length <= 4 ? items.length : 4} gap-px bg-border`}>
      {items.map(item => (
        <div key={item.label} className="bg-background px-4 sm:px-5 py-3">
          <div className="text-[9px] uppercase tracking-[0.18em] font-bold text-muted-foreground mb-1 leading-tight">{item.label}</div>
          <div className={`text-base font-bold font-mono-tab leading-tight ${item.accent ? 'text-accent' : 'text-foreground'}`}>{item.value}</div>
          {item.sub && <div className="text-[10px] text-muted-foreground mt-0.5">{item.sub}</div>}
        </div>
      ))}
    </div>
  );
}

export function PanelHeader({ label, action }: { label: string; action?: ReactNode }) {
  return (
    <div className="px-4 py-2.5 border-b border-border bg-secondary/40 flex items-center justify-between">
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium">{label}</div>
      {action}
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return <div className="px-4 py-12 text-center text-sm text-muted-foreground">{text}</div>;
}

export function GuidedEntryIntro({ title, intent, steps }: { title: string; intent: string; steps: string[] }) {
  return (
    <div className="border border-border bg-background px-3 py-2.5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.16em] text-[#9D7E3F] font-bold">{title}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug max-w-2xl">{intent}</p>
        </div>
        <div className="grid grid-cols-3 gap-1.5 sm:min-w-[280px]">
          {steps.map((step, index) => (
            <div key={step} className="border border-border bg-secondary/30 px-2 py-1.5">
              <div className="text-[8px] uppercase tracking-[0.14em] text-muted-foreground font-bold">Step {index + 1}</div>
              <div className="text-[10px] font-semibold text-foreground leading-snug mt-0.5">{step}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function WorkflowDialog({
  open,
  onOpenChange,
  kicker,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kicker: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="pb-workflow-dialog rounded-none">
        <DialogHeader className="pb-workflow-head text-left">
          <div className="text-[8px] uppercase tracking-[0.28em] font-black text-[#9D7E3F]">{kicker}</div>
          <DialogTitle className="text-lg sm:text-xl font-semibold tracking-tight text-foreground">{title}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed max-w-3xl">
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="pb-workflow-body">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
