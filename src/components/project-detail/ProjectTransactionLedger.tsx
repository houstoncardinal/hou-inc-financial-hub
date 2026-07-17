import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Plus, X, Pencil, CheckCircle2, Circle, Clock3, ChevronRight,
  Wallet, Link2, Hash, StickyNote, CalendarDays,
} from 'lucide-react';
import { CurrencyInput } from '@/components/ui/currency-input';
import { DateInput } from '@/components/ui/date-input';
import { fmtUSD, fmtDate } from '@/lib/format';
import { useUpsert } from '@/hooks/useFinance';
import { KpiGrid, PanelHeader, EmptyState, GuidedEntryIntro, WorkflowDialog } from '@/components/project-detail/formPrimitives';

/* ── ProjectTransactionLedger ──────────────────────────────────────────────────
   The real, two-way Payments/Expenses system for a project: log a transaction,
   reconcile it, or open a detailed view to edit or reconcile it — writing
   straight into the same `transactions` table the finance dashboard's own
   Income/Expenses/Ledger pages read from (via useUpsert('transactions', ...)),
   so anything logged or reconciled here shows up there immediately, with no
   separate integration step. `kind` parametrizes the same shell for both
   income and expense transactions rather than duplicating the component. ── */

type TxKind = 'income' | 'expense';
type ReconStatus = 'unreconciled' | 'pending' | 'reconciled';

const RECON_META: Record<ReconStatus, { label: string; bg: string; text: string; Icon: typeof Circle }> = {
  unreconciled: { label: 'Unreconciled', bg: 'bg-secondary', text: 'text-muted-foreground', Icon: Circle },
  pending:      { label: 'Pending',      bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', Icon: Clock3 },
  reconciled:   { label: 'Reconciled',   bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', Icon: CheckCircle2 },
};

const statusOf = (row: any): ReconStatus => {
  const s = row.reconciliation_status as ReconStatus | undefined;
  if (s === 'reconciled' || s === 'pending' || s === 'unreconciled') return s;
  return row.reconciled ? 'reconciled' : 'unreconciled';
};

const blankLogForm = () => ({
  amount: '', date: new Date().toISOString().slice(0, 10), source_name: '', category: '',
  scope_item_id: '', check_reference: '', notes: '', budget_category: '',
});

function ReconPill({ status }: { status: ReconStatus }) {
  const m = RECON_META[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.1em] ${m.bg} ${m.text}`}>
      <m.Icon className="w-2.5 h-2.5" strokeWidth={2.4} />
      {m.label}
    </span>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: typeof Hash; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" strokeWidth={1.7} />
      <div className="min-w-0">
        <div className="text-[8px] uppercase tracking-[0.18em] font-bold text-muted-foreground">{label}</div>
        <div className="text-[12.5px] font-medium text-foreground break-words">{value || '—'}</div>
      </div>
    </div>
  );
}

/* ── Slide-in detail view — reconcile or edit a single transaction ─────────── */
function TransactionInspector({
  row, kind, scopeItems, onClose, onSave,
}: {
  row: any;
  kind: TxKind;
  scopeItems: { id: string; name: string }[];
  onClose: () => void;
  onSave: (patch: Record<string, any>) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => ({
    amount: String(row.amount ?? ''),
    date: (row.transaction_date ?? '').slice(0, 10),
    source_name: row.source_name ?? '',
    category: row.category ?? '',
    scope_item_id: row.scope_item_id ?? '',
    check_reference: row.check_reference ?? '',
    notes: row.notes ?? '',
    budget_category: row.budget_category ?? '',
    reconciliation_status: statusOf(row) as ReconStatus,
  }));
  const status = editing ? form.reconciliation_status : statusOf(row);
  const scopeName = scopeItems.find(s => s.id === row.scope_item_id)?.name;
  const F = 'w-full h-9 rounded-none border border-border bg-background text-foreground text-sm px-3 focus:outline-none focus:border-foreground/40 placeholder:text-muted-foreground';
  const TA = 'w-full rounded-none border border-border bg-background text-foreground text-sm px-3 py-2 resize-none focus:outline-none focus:border-foreground/40 placeholder:text-muted-foreground';

  const commit = async (patch: Record<string, any>) => {
    setSaving(true);
    try {
      await onSave({ id: row.id, ...patch });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const quickReconcile = (next: ReconStatus) => {
    const now = new Date().toISOString();
    commit({
      reconciliation_status: next,
      reconciled: next === 'reconciled',
      reconciled_at: next === 'reconciled' ? now : null,
      cleared_date: next === 'reconciled' ? now.slice(0, 10) : next === 'pending' ? row.cleared_date : null,
    });
  };

  const saveEdit = () => {
    const now = new Date().toISOString();
    const next = form.reconciliation_status;
    commit({
      amount: parseFloat(form.amount) || 0,
      transaction_date: form.date || null,
      posting_date: form.date || null,
      source_name: form.source_name.trim() || null,
      category: form.category.trim() || null,
      scope_item_id: form.scope_item_id || null,
      check_reference: form.check_reference.trim() || null,
      notes: form.notes.trim() || null,
      description: form.notes.trim() || null,
      ...(kind === 'expense' ? { budget_category: form.budget_category.trim() || null } : {}),
      reconciliation_status: next,
      reconciled: next === 'reconciled',
      reconciled_at: next === 'reconciled' ? now : (row.reconciled_at ?? null),
      cleared_date: next === 'reconciled' ? now.slice(0, 10) : next === 'pending' ? row.cleared_date : null,
    });
  };

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[1px]" onClick={onClose} />
      <aside
        className="fixed z-[61] inset-x-0 bottom-0 sm:inset-y-0 sm:right-0 sm:left-auto sm:w-[min(480px,92vw)] bg-background border-t sm:border-t-0 sm:border-l border-border shadow-2xl max-h-[88vh] sm:max-h-none overflow-y-auto"
        role="dialog" aria-label="Transaction detail"
      >
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur px-4 sm:px-5 pt-5 pb-4 border-b border-border">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[8px] uppercase tracking-[0.24em] font-black text-accent">
                {kind === 'income' ? 'Payment Detail' : 'Expense Detail'}
              </div>
              <h2 className="text-lg font-bold tracking-tight mt-1 truncate">{row.source_name || (kind === 'income' ? 'Unattributed payment' : 'Unattributed expense')}</h2>
              <p className="text-[11px] text-muted-foreground mt-1">{fmtDate(row.transaction_date)}{scopeName ? ` · ${scopeName}` : ''}</p>
            </div>
            <button className="h-9 w-9 border border-border bg-background flex items-center justify-center shrink-0" onClick={onClose} aria-label="Close">
              <X className="w-4 h-4" strokeWidth={1.7} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="border border-border bg-secondary/20 px-3 py-2">
              <div className="text-[8px] uppercase tracking-[0.18em] font-bold text-muted-foreground">Amount</div>
              <div className={`text-base font-black font-mono-tab mt-1 ${kind === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                {kind === 'income' ? '+' : '−'}{fmtUSD(Number(row.amount) || 0)}
              </div>
            </div>
            <div className="border border-border bg-secondary/20 px-3 py-2">
              <div className="text-[8px] uppercase tracking-[0.18em] font-bold text-muted-foreground">Reconciliation</div>
              <div className="mt-1.5"><ReconPill status={status} /></div>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-5">
          {!editing ? (
            <>
              <section className="space-y-3">
                <DetailRow icon={Wallet} label={kind === 'income' ? 'Payer / Source' : 'Paid To'} value={row.source_name} />
                <DetailRow icon={Hash} label="Category" value={row.category} />
                <DetailRow icon={Link2} label="Scope / SOV Line" value={scopeName ?? ''} />
                <DetailRow icon={CalendarDays} label="Reference" value={row.check_reference} />
                {kind === 'expense' && <DetailRow icon={Hash} label="Budget Category" value={row.budget_category} />}
                <DetailRow icon={StickyNote} label="Notes" value={row.notes} />
              </section>

              <div className="border-t border-border pt-4">
                <div className="text-[8px] uppercase tracking-[0.2em] font-bold text-muted-foreground mb-2">Quick Reconcile</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['unreconciled', 'pending', 'reconciled'] as ReconStatus[]).map(s => (
                    <button key={s} disabled={saving} onClick={() => quickReconcile(s)}
                      className={`h-9 border text-[9px] font-bold uppercase tracking-[0.1em] transition-colors ${
                        status === s ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground hover:bg-secondary/50'
                      }`}>
                      {RECON_META[s].label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[8px] uppercase tracking-[0.18em] font-bold text-muted-foreground mb-1">Amount</div>
                  <CurrencyInput value={form.amount} onValueChange={v => setForm(f => ({ ...f, amount: v }))} className="rounded-none h-9 text-sm" />
                </div>
                <div>
                  <div className="text-[8px] uppercase tracking-[0.18em] font-bold text-muted-foreground mb-1">Date</div>
                  <DateInput value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="rounded-none h-9 text-sm" />
                </div>
              </div>
              <div>
                <div className="text-[8px] uppercase tracking-[0.18em] font-bold text-muted-foreground mb-1">{kind === 'income' ? 'Payer / Source' : 'Paid To'}</div>
                <input className={F} value={form.source_name} onChange={e => setForm(f => ({ ...f, source_name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[8px] uppercase tracking-[0.18em] font-bold text-muted-foreground mb-1">Category</div>
                  <input className={F} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
                </div>
                <div>
                  <div className="text-[8px] uppercase tracking-[0.18em] font-bold text-muted-foreground mb-1">Scope / SOV Line</div>
                  <select className={F} value={form.scope_item_id} onChange={e => setForm(f => ({ ...f, scope_item_id: e.target.value }))}>
                    <option value="">— None —</option>
                    {scopeItems.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              {kind === 'expense' && (
                <div>
                  <div className="text-[8px] uppercase tracking-[0.18em] font-bold text-muted-foreground mb-1">Budget Category</div>
                  <input className={F} value={form.budget_category} onChange={e => setForm(f => ({ ...f, budget_category: e.target.value }))} />
                </div>
              )}
              <div>
                <div className="text-[8px] uppercase tracking-[0.18em] font-bold text-muted-foreground mb-1">Reference / Check #</div>
                <input className={F} value={form.check_reference} onChange={e => setForm(f => ({ ...f, check_reference: e.target.value }))} />
              </div>
              <div>
                <div className="text-[8px] uppercase tracking-[0.18em] font-bold text-muted-foreground mb-1">Notes</div>
                <textarea className={TA} rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div>
                <div className="text-[8px] uppercase tracking-[0.18em] font-bold text-muted-foreground mb-1.5">Reconciliation</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['unreconciled', 'pending', 'reconciled'] as ReconStatus[]).map(s => (
                    <button key={s} type="button" onClick={() => setForm(f => ({ ...f, reconciliation_status: s }))}
                      className={`h-9 border text-[9px] font-bold uppercase tracking-[0.1em] transition-colors ${
                        form.reconciliation_status === s ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground hover:bg-secondary/50'
                      }`}>
                      {RECON_META[s].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 border-t border-border bg-background/95 backdrop-blur px-4 sm:px-5 py-3">
          {!editing ? (
            <div className="grid grid-cols-2 gap-2">
              <button className="h-10 border border-foreground bg-foreground text-background text-[10px] font-bold uppercase tracking-[0.14em] flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity"
                onClick={() => setEditing(true)}>
                <Pencil className="w-3.5 h-3.5" strokeWidth={1.8} /> Edit
              </button>
              <button className="h-10 border border-border text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors" onClick={onClose}>
                Done
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button disabled={saving} className="h-10 border border-foreground bg-foreground text-background text-[10px] font-bold uppercase tracking-[0.14em] hover:opacity-90 transition-opacity disabled:opacity-50"
                onClick={saveEdit}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
              <button className="h-10 border border-border text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

/* ── Main ledger ─────────────────────────────────────────────────────────── */
export function ProjectTransactionLedger({
  kind, projectId, transactions, scopeItems, autoOpenLog, onAutoOpenLogHandled,
}: {
  kind: TxKind;
  projectId: string;
  transactions: any[];
  scopeItems: { id: string; name: string }[];
  /** Lets a parent (e.g. the Overview tab's "Record Payment" quick action) open
   *  the log dialog immediately after switching to this tab, instead of
   *  navigating away to a separate page. */
  autoOpenLog?: boolean;
  onAutoOpenLogHandled?: () => void;
}) {
  const upsert = useUpsert('transactions', []);
  const [showLog, setShowLog] = useState(false);
  const [logForm, setLogForm] = useState(blankLogForm());
  const [saving, setSaving] = useState(false);
  const [detailRow, setDetailRow] = useState<any>(null);

  useEffect(() => {
    if (autoOpenLog) { setShowLog(true); onAutoOpenLogHandled?.(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenLog]);

  const isIncome = kind === 'income';
  const noun = isIncome ? 'Payment' : 'Expense';
  const F = 'w-full h-9 rounded-none border border-border bg-background text-foreground text-sm px-3 focus:outline-none focus:border-foreground/40 placeholder:text-muted-foreground';
  const TA = 'w-full rounded-none border border-border bg-background text-foreground text-sm px-3 py-2 resize-none focus:outline-none focus:border-foreground/40 placeholder:text-muted-foreground';

  const sorted = useMemo(
    () => [...transactions].sort((a, b) => (b.transaction_date ?? '').localeCompare(a.transaction_date ?? '')),
    [transactions],
  );

  const stats = useMemo(() => {
    const total = transactions.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const reconciled = transactions.filter(t => statusOf(t) === 'reconciled');
    const reconciledAmt = reconciled.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const pct = transactions.length ? Math.round((reconciled.length / transactions.length) * 100) : 0;
    return { total, count: transactions.length, reconciledCount: reconciled.length, reconciledAmt, unreconciledAmt: total - reconciledAmt, pct };
  }, [transactions]);

  const scopeName = (id: string | null | undefined) => scopeItems.find(s => s.id === id)?.name;

  const handleSave = async (patch: Record<string, any>) => {
    try {
      await upsert.mutateAsync(patch as any);
      toast.success('Saved');
    } catch (err: any) {
      toast.error('Save failed', { description: err?.message });
      throw err;
    }
  };

  const quickReconcileToggle = async (row: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = statusOf(row) === 'reconciled' ? 'unreconciled' : 'reconciled';
    const now = new Date().toISOString();
    try {
      await upsert.mutateAsync({
        id: row.id,
        reconciliation_status: next,
        reconciled: next === 'reconciled',
        reconciled_at: next === 'reconciled' ? now : null,
        cleared_date: next === 'reconciled' ? now.slice(0, 10) : null,
      } as any);
      toast.success(next === 'reconciled' ? 'Marked reconciled' : 'Marked unreconciled');
    } catch (err: any) {
      toast.error('Failed to update', { description: err?.message });
    }
  };

  const submitLog = async () => {
    if (!logForm.amount || parseFloat(logForm.amount) <= 0) { toast.error('Enter an amount greater than zero'); return; }
    setSaving(true);
    try {
      await upsert.mutateAsync({
        type: kind,
        project_id: projectId,
        scope_item_id: logForm.scope_item_id || null,
        amount: parseFloat(logForm.amount) || 0,
        transaction_date: logForm.date,
        posting_date: logForm.date,
        source_name: logForm.source_name.trim() || null,
        category: logForm.category.trim() || null,
        check_reference: logForm.check_reference.trim() || null,
        notes: logForm.notes.trim() || null,
        description: logForm.notes.trim() || null,
        status: 'posted',
        approval_status: 'approved',
        payment_status: 'paid',
        reconciliation_status: 'unreconciled',
        reconciled: false,
        ...(kind === 'expense' ? { budget_category: logForm.budget_category.trim() || null } : {}),
      } as any);
      toast.success(`${noun} logged`, { description: `Now visible on the ${isIncome ? 'Income' : 'Expenses'} tab for this entity.` });
      setLogForm(blankLogForm());
      setShowLog(false);
    } catch (err: any) {
      toast.error(`Failed to log ${noun.toLowerCase()}`, { description: err?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="border border-border">
        <KpiGrid items={[
          { label: isIncome ? 'Total Received' : 'Total Paid Out', value: fmtUSD(stats.total), sub: `${stats.count} transaction${stats.count !== 1 ? 's' : ''}`, accent: true },
          { label: 'Reconciled', value: `${stats.pct}%`, sub: `${stats.reconciledCount} of ${stats.count}` },
          { label: 'Unreconciled', value: fmtUSD(stats.unreconciledAmt), sub: stats.unreconciledAmt > 0 ? 'awaiting reconciliation' : 'all caught up' },
        ]} />
      </div>

      <div className="border border-border">
        <PanelHeader
          label={`${isIncome ? 'Client Payments' : 'Project Expenses'} — ${stats.count} Record${stats.count !== 1 ? 's' : ''}`}
          action={
            <button onClick={() => setShowLog(true)} className="h-9 px-3 border border-foreground bg-foreground text-background hover:opacity-90 text-[9px] uppercase tracking-[0.14em] font-bold transition-opacity">
              <Plus className="inline w-3 h-3 mr-1" /> Log {noun}
            </button>
          }
        />

        {sorted.length === 0 ? (
          <EmptyState text={`No ${isIncome ? 'payments' : 'expenses'} recorded yet — log the first one above.`} />
        ) : (
          <>
            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-border">
              {sorted.map(t => (
                <button key={t.id} onClick={() => setDetailRow(t)} className="w-full text-left px-4 py-3.5 space-y-2 hover:bg-secondary/30 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-foreground truncate">{t.source_name || '—'}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{fmtDate(t.transaction_date)}{scopeName(t.scope_item_id) ? ` · ${scopeName(t.scope_item_id)}` : ''}</div>
                    </div>
                    <div className={`font-mono-tab font-bold text-[13px] shrink-0 ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                      {isIncome ? '+' : '−'}{fmtUSD(Number(t.amount) || 0)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <ReconPill status={statusOf(t)} />
                    <button onClick={e => quickReconcileToggle(t, e)} className="text-[9px] font-bold uppercase tracking-[0.1em] text-accent">
                      {statusOf(t) === 'reconciled' ? 'Unreconcile' : 'Reconcile'}
                    </button>
                  </div>
                </button>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['Date', isIncome ? 'Source / Reference' : 'Paid To', 'Scope / SOV', 'Status', 'Amount', ''].map(h => (
                      <th key={h} className={`px-4 py-2.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium ${h === 'Amount' ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(t => (
                    <tr key={t.id} onClick={() => setDetailRow(t)} className="border-b border-border pd-row cursor-pointer">
                      <td className="px-4 py-3 text-muted-foreground font-mono-tab whitespace-nowrap">{fmtDate(t.transaction_date)}</td>
                      <td className="px-4 py-3 text-foreground">{t.source_name || t.description || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{scopeName(t.scope_item_id) ?? '—'}</td>
                      <td className="px-4 py-3">
                        <button onClick={e => quickReconcileToggle(t, e)} title="Click to toggle reconciled">
                          <ReconPill status={statusOf(t)} />
                        </button>
                      </td>
                      <td className={`px-4 py-3 text-right font-mono-tab font-semibold whitespace-nowrap ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                        {isIncome ? '+' : '−'}{fmtUSD(Number(t.amount) || 0)}
                      </td>
                      <td className="px-4 py-3"><ChevronRight className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.7} /></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border">
                    <td colSpan={4} className="px-4 py-3 text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-bold">Total {isIncome ? 'Received' : 'Paid Out'}</td>
                    <td className="px-4 py-3 text-right font-mono-tab font-bold text-foreground">{fmtUSD(stats.total)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ── Log dialog ── */}
      <WorkflowDialog
        open={showLog}
        onOpenChange={o => { setShowLog(o); if (!o) setLogForm(blankLogForm()); }}
        kicker={isIncome ? 'Client Payments' : 'Project Expenses'}
        title={`Log a New ${noun}`}
        description={`Record a ${isIncome ? 'client payment' : 'project expense'} directly against this project — it posts immediately to the ${isIncome ? 'Income' : 'Expenses'} tab for this entity and can be reconciled here at any time.`}
      >
        <div className="pb-entry-panel space-y-3 border border-border bg-background">
          <GuidedEntryIntro
            title={`${noun} Details`}
            intent={`Capture the amount, date, and who it's ${isIncome ? 'from' : 'paid to'} — everything else is optional and can be filled in or changed later.`}
            steps={['Amount & date', isIncome ? 'Source' : 'Payee', 'Optional detail']}
          />
          <div className="pb-entry-grid">
            <div className="space-y-1">
              <div className="micro-label">Amount ($) *</div>
              <CurrencyInput value={logForm.amount} onValueChange={v => setLogForm(f => ({ ...f, amount: v }))} placeholder="0.00" className={F} />
            </div>
            <div className="space-y-1">
              <div className="micro-label">Date *</div>
              <DateInput value={logForm.date} onChange={e => setLogForm(f => ({ ...f, date: e.target.value }))} className={F} />
            </div>
            <div className="pb-span-2 space-y-1">
              <div className="micro-label">{isIncome ? 'Payer / Source' : 'Paid To'}</div>
              <input className={F} value={logForm.source_name} onChange={e => setLogForm(f => ({ ...f, source_name: e.target.value }))}
                placeholder={isIncome ? 'e.g. Client name or bank reference' : 'e.g. Vendor or subcontractor name'} />
            </div>
            <div className="space-y-1">
              <div className="micro-label">Category</div>
              <input className={F} value={logForm.category} onChange={e => setLogForm(f => ({ ...f, category: e.target.value }))} placeholder="Optional" />
            </div>
            <div className="space-y-1">
              <div className="micro-label">Scope / SOV Line</div>
              <select className={F} value={logForm.scope_item_id} onChange={e => setLogForm(f => ({ ...f, scope_item_id: e.target.value }))}>
                <option value="">— None —</option>
                {scopeItems.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            {!isIncome && (
              <div className="space-y-1">
                <div className="micro-label">Budget Category</div>
                <input className={F} value={logForm.budget_category} onChange={e => setLogForm(f => ({ ...f, budget_category: e.target.value }))} placeholder="Optional" />
              </div>
            )}
            <div className="space-y-1">
              <div className="micro-label">Reference / Check #</div>
              <input className={F} value={logForm.check_reference} onChange={e => setLogForm(f => ({ ...f, check_reference: e.target.value }))} placeholder="Optional" />
            </div>
            <div className="pb-span-4 space-y-1">
              <div className="micro-label">Notes</div>
              <textarea className={TA} rows={2} value={logForm.notes} onChange={e => setLogForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={submitLog} disabled={saving} className="h-9 px-5 rounded-none bg-foreground text-background text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-40">
              {saving ? 'Saving…' : `Log ${noun}`}
            </button>
            <button onClick={() => setShowLog(false)} className="h-9 px-4 rounded-none border border-border text-xs text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </WorkflowDialog>

      {/* ── Detail / reconcile / edit drawer ── */}
      {detailRow && (
        <TransactionInspector
          row={detailRow}
          kind={kind}
          scopeItems={scopeItems}
          onClose={() => setDetailRow(null)}
          onSave={async patch => { await handleSave(patch); setDetailRow((prev: any) => prev ? { ...prev, ...patch } : prev); }}
        />
      )}
    </div>
  );
}
