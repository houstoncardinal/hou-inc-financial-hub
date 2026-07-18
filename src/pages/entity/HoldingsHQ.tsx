/* ── Houston Enterprise Holdings · Holdings HQ dashboard ─────────────────────
   Entity-custom overview for the holding company: consolidated cash position
   across all three entities, entity performance comparison, intercompany
   loans + external debt schedules with interest exposure, and a capital
   activity log (contributions, distributions, dividends, management fees,
   tax reserves, intercompany transfers). ── */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { ENTITIES } from '@/contexts/EntityContext';
import {
  useHoldingsNotes, useCapitalActivity, useConsolidatedEntityTotals, useNotePayments, useHoldingsCovenants,
  useEntityOpsUpsert, useEntityOpsSoftDelete, useEntityOpsRealtime,
} from '@/hooks/useEntityOps';
import { fmtDate, fmtUSD } from '@/lib/format';
import { toast } from 'sonner';
import {
  Landmark, Banknote, Scale, PiggyBank, ArrowLeftRight, Percent,
  Plus, Pencil, Trash2, Building2, TrendingUp, FileText, ShieldCheck,
  CalendarRange, Loader2, ShieldAlert, Download, AlarmClock,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const HEH_BLUE = '#2C5F8A';

const HQ_CSS = `
.heh-shell{background:linear-gradient(180deg,rgba(44,95,138,0.05),transparent 180px);}
.heh-panel{background:hsl(var(--background));border:1px solid hsl(var(--border));box-shadow:0 1px 3px rgba(10,10,10,.05),0 1px 0 rgba(255,255,255,.45) inset;}
.heh-card{background:hsl(var(--background));border:1px solid hsl(var(--border));box-shadow:0 1px 3px rgba(10,10,10,.045);position:relative;overflow:hidden;}
.heh-card:before{content:"";position:absolute;inset:0 0 auto 0;height:2px;background:var(--accent,#2C5F8A);}
.heh-k{font-size:8px;text-transform:uppercase;letter-spacing:.18em;font-weight:900;color:hsl(var(--muted-foreground));white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.heh-v{font-size:17px;line-height:1.05;font-weight:900;margin-top:5px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.heh-sub{font-size:10px;color:hsl(var(--muted-foreground));margin-top:5px;line-height:1.25;}
.heh-row{border-bottom:1px solid hsl(var(--border));padding:9px 12px;font-size:12px;}
.heh-row:hover{background:hsl(var(--secondary)/.35);}
.heh-primary{height:32px;background:hsl(var(--foreground));color:hsl(var(--background));padding:0 12px;font-size:9px;text-transform:uppercase;letter-spacing:.14em;font-weight:900;display:inline-flex;align-items:center;justify-content:center;gap:6px;}
.heh-action{height:28px;border:1px solid hsl(var(--border));background:hsl(var(--background));padding:0 8px;font-size:8.5px;text-transform:uppercase;letter-spacing:.12em;font-weight:900;display:inline-flex;align-items:center;gap:5px;}
.heh-action:hover{background:hsl(var(--secondary)/.55);}
.heh-field{height:38px;border-radius:0;font-size:12px;}
.dark .heh-panel,.dark .heh-card,.dark .heh-action{background:hsl(var(--card));box-shadow:0 1px 4px rgba(0,0,0,.28),0 1px 0 rgba(255,255,255,.05) inset;}
@media(max-width:767px){.heh-v{font-size:14px}.heh-panel{padding:12px!important}}
`;

const NOTE_TYPES: Record<string, string> = {
  intercompany_loan: 'Intercompany Loan',
  bank_loan: 'Bank Loan',
  line_of_credit: 'Line of Credit',
  mortgage: 'Mortgage',
  other: 'Other',
};

const ACTIVITY_TYPES: Record<string, { label: string; color: string; sign: 1 | -1 }> = {
  capital_contribution: { label: 'Capital Contribution', color: '#059669', sign: 1 },
  distribution:         { label: 'Distribution',         color: '#dc2626', sign: -1 },
  dividend:             { label: 'Dividend',             color: '#d97706', sign: -1 },
  management_fee:       { label: 'Management Fee',       color: '#0891b2', sign: 1 },
  tax_reserve:          { label: 'Tax Reserve',          color: '#7c3aed', sign: -1 },
  intercompany_transfer:{ label: 'Intercompany Transfer',color: '#2C5F8A', sign: -1 },
};

const num = (v: unknown) => Number(v || 0);
const entityName = (id: string | null | undefined) =>
  ENTITIES.find(e => e.id === id)?.shortName ?? (id ? id : 'External');

function Metric({ label, value, sub, icon: Icon, color = HEH_BLUE }: any) {
  return (
    <div className="heh-card p-3 min-w-0" style={{ '--accent': color } as any}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="heh-k">{label}</div>
          <div className="heh-v">{value}</div>
          <div className="heh-sub">{sub}</div>
        </div>
        <div className="w-8 h-8 border border-border bg-secondary/35 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4" style={{ color }} strokeWidth={1.7} />
        </div>
      </div>
    </div>
  );
}

const BLANK_NOTE = {
  id: '', direction: 'receivable', note_type: 'intercompany_loan', counterparty_name: '',
  counterparty_entity_id: '', principal: '', outstanding_balance: '', interest_rate: '',
  payment_amount: '', payment_frequency: 'monthly', status: 'active',
  origination_date: '', maturity_date: '', collateral: '', notes: '',
};

const BLANK_ACTIVITY = {
  id: '', activity_type: 'distribution', related_entity_id: '', amount: '',
  activity_date: new Date().toISOString().slice(0, 10), memo: '', approval_status: 'approved',
};

const BLANK_PAYMENT = {
  note_id: '', payment_date: new Date().toISOString().slice(0, 10),
  amount: '', principal_portion: '', interest_portion: '', memo: '',
};

/* Suggested interest for one period at the note's APR: monthly = balance ×
   rate/12, quarterly ÷4, annual/interest-only/balloon = full year. */
function suggestedInterest(note: any): number {
  const balance = Number(note?.outstanding_balance || 0);
  const rate = Number(note?.interest_rate || 0) / 100;
  if (balance <= 0 || rate <= 0) return 0;
  const perYear = note?.payment_frequency === 'monthly' ? 12
    : note?.payment_frequency === 'quarterly' ? 4
    : 1;
  return Math.round((balance * rate / perYear) * 100) / 100;
}

export default function HoldingsHQ() {
  const { user } = useAuth();
  useEntityOpsRealtime();

  const { data: notes = [], isLoading: notesLoading } = useHoldingsNotes();
  const { data: activity = [], isLoading: activityLoading } = useCapitalActivity();
  const { data: payments = [] } = useNotePayments();
  const { data: consolidated = {} } = useConsolidatedEntityTotals();

  const upsertNote = useEntityOpsUpsert('holdings_notes');
  const deleteNote = useEntityOpsSoftDelete('holdings_notes');
  const upsertActivity = useEntityOpsUpsert('holdings_capital_activity');
  const deleteActivity = useEntityOpsSoftDelete('holdings_capital_activity');
  const upsertPayment = useEntityOpsUpsert('holdings_note_payments');
  const deletePayment = useEntityOpsSoftDelete('holdings_note_payments');

  const [noteDialog, setNoteDialog] = useState(false);
  const [noteForm, setNoteForm] = useState({ ...BLANK_NOTE });
  const [activityDialog, setActivityDialog] = useState(false);
  const [activityForm, setActivityForm] = useState({ ...BLANK_ACTIVITY });
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ ...BLANK_PAYMENT });
  const [amortNote, setAmortNote] = useState<any | null>(null);
  const [amortRows, setAmortRows] = useState<any[]>([]);
  const [amortLoading, setAmortLoading] = useState(false);

  const { data: covenants = [] } = useHoldingsCovenants();
  const upsertCovenant = useEntityOpsUpsert('holdings_covenants');
  const deleteCovenant = useEntityOpsSoftDelete('holdings_covenants');
  const [covenantDialog, setCovenantDialog] = useState(false);
  const [covenantForm, setCovenantForm] = useState({
    id: '', name: '', covenant_type: 'financial', requirement: '', status: 'compliant',
    note_id: '', next_review_date: '', notes: '',
  });

  const covenantStats = useMemo(() => {
    const live = covenants as any[];
    const breached = live.filter(c => c.status === 'breached').length;
    const warning = live.filter(c => c.status === 'warning').length;
    const dueSoon = live.filter(c => {
      if (!c.next_review_date || ['waived'].includes(c.status)) return false;
      const d = Math.ceil((new Date(c.next_review_date + 'T12:00:00').getTime() - Date.now()) / 86400000);
      return d <= 30;
    }).length;
    return { total: live.length, breached, warning, dueSoon };
  }, [covenants]);

  /* Notes maturing within 12 months — refinance/payoff runway. */
  const maturityRisk = useMemo(() => {
    const horizon = Date.now() + 365 * 86400000;
    return (notes as any[])
      .filter(n => n.status === 'active' && n.maturity_date)
      .map(n => ({ ...n, daysToMaturity: Math.ceil((new Date(n.maturity_date + 'T12:00:00').getTime() - Date.now()) / 86400000) }))
      .filter(n => new Date(n.maturity_date + 'T12:00:00').getTime() <= horizon)
      .sort((a, b) => a.daysToMaturity - b.daysToMaturity);
  }, [notes]);

  const openCovenant = (c?: any) => {
    setCovenantForm(c ? {
      id: c.id, name: c.name ?? '', covenant_type: c.covenant_type ?? 'financial',
      requirement: c.requirement ?? '', status: c.status ?? 'compliant',
      note_id: c.note_id ?? '', next_review_date: c.next_review_date ?? '', notes: c.notes ?? '',
    } : { id: '', name: '', covenant_type: 'financial', requirement: '', status: 'compliant', note_id: '', next_review_date: '', notes: '' });
    setCovenantDialog(true);
  };

  const saveCovenant = async () => {
    if (!user?.id) return toast.error('Sign in required');
    if (!covenantForm.name.trim()) return toast.error('Covenant name is required');
    try {
      await upsertCovenant.mutateAsync({
        ...(covenantForm.id ? { id: covenantForm.id } : {}),
        user_id: user.id,
        entity_id: 'houston-enterprise-holdings',
        name: covenantForm.name.trim(),
        covenant_type: covenantForm.covenant_type,
        requirement: covenantForm.requirement.trim() || null,
        status: covenantForm.status,
        note_id: covenantForm.note_id || null,
        next_review_date: covenantForm.next_review_date || null,
        last_reviewed_date: covenantForm.id ? new Date().toISOString().slice(0, 10) : null,
        notes: covenantForm.notes.trim() || null,
      });
      toast.success(covenantForm.id ? 'Covenant updated' : 'Covenant added');
      setCovenantDialog(false);
    } catch (e: any) {
      toast.error(e.message?.includes('holdings_covenants') ? 'Run migration 20260717000005 to enable covenant tracking' : e.message);
    }
  };

  const exportAmortizationCsv = () => {
    if (!amortNote || !amortRows.length) return;
    const header = 'Period,Due Date,Payment,Interest,Principal,Ending Balance';
    const lines = amortRows.map((r: any) =>
      [r.period, r.due_date, num(r.payment).toFixed(2), num(r.interest).toFixed(2), num(r.principal).toFixed(2), num(r.ending_balance).toFixed(2)].join(','));
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `amortization-${amortNote.counterparty_name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const openAmortization = async (note: any) => {
    setAmortNote(note);
    setAmortRows([]);
    setAmortLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc('get_holdings_note_amortization', { p_note_id: note.id, p_max_periods: 60 });
      if (error) throw error;
      setAmortRows(data ?? []);
    } catch (e: any) {
      toast.error(e.message?.includes('function') ? 'Run migration 20260717000004 to enable amortization schedules' : e.message);
    } finally {
      setAmortLoading(false);
    }
  };

  /* Scheduled debt service over the next 12 months, from each active note's
     stated payment amount and frequency. */
  const debtService = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(new Date().getFullYear(), new Date().getMonth() + i + 1, 1);
      return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('en-US', { month: 'short' }), inflow: 0, outflow: 0 };
    });
    const hits = (freq: string, monthIdx: number) =>
      freq === 'monthly' ? 1 : freq === 'quarterly' ? (monthIdx % 3 === 0 ? 1 : 0) : freq === 'annual' ? (monthIdx === 0 ? 1 : 0) : 0;
    for (const n of notes as any[]) {
      if (n.status !== 'active' || !num(n.payment_amount)) continue;
      months.forEach((m, idx) => {
        const count = hits(n.payment_frequency, idx);
        if (!count) return;
        if (n.direction === 'receivable') m.inflow += num(n.payment_amount) * count;
        else m.outflow += num(n.payment_amount) * count;
      });
    }
    const totalIn = months.reduce((s, m) => s + m.inflow, 0);
    const totalOut = months.reduce((s, m) => s + m.outflow, 0);
    const max = Math.max(1, ...months.map(m => Math.max(m.inflow, m.outflow)));
    return { months, totalIn, totalOut, max, any: totalIn + totalOut > 0 };
  }, [notes]);

  const stats = useMemo(() => {
    const live = (notes as any[]).filter(n => n.status === 'active');
    const receivable = live.filter(n => n.direction === 'receivable');
    const payable = live.filter(n => n.direction === 'payable');
    const notesReceivable = receivable.reduce((s, n) => s + num(n.outstanding_balance), 0);
    const notesPayable = payable.reduce((s, n) => s + num(n.outstanding_balance), 0);
    const annualInterestIn = receivable.reduce((s, n) => s + num(n.outstanding_balance) * num(n.interest_rate) / 100, 0);
    const annualInterestOut = payable.reduce((s, n) => s + num(n.outstanding_balance) * num(n.interest_rate) / 100, 0);

    const year = new Date().getFullYear();
    const isApproved = (a: any) => !a.approval_status || a.approval_status === 'approved';
    const ytd = (activity as any[]).filter(a => isApproved(a) && new Date(a.activity_date + 'T12:00:00').getFullYear() === year);
    const ytdBy = (type: string) => ytd.filter(a => a.activity_type === type).reduce((s, a) => s + num(a.amount), 0);

    const consolidatedNet = Object.values(consolidated as Record<string, { income: number; expense: number; clearedChecks: number }>)
      .reduce((s, e) => s + e.income - e.expense - e.clearedChecks, 0);

    return {
      notesReceivable, notesPayable, netNotes: notesReceivable - notesPayable,
      annualInterestIn, annualInterestOut,
      ytdContributions: ytdBy('capital_contribution'),
      ytdDistributions: ytdBy('distribution') + ytdBy('dividend'),
      ytdManagementFees: ytdBy('management_fee'),
      ytdTaxReserves: ytdBy('tax_reserve'),
      consolidatedNet,
    };
  }, [notes, activity, consolidated]);

  const entityRows = useMemo(() =>
    ENTITIES.map(e => {
      const t = (consolidated as Record<string, { income: number; expense: number; clearedChecks: number }>)[e.id]
        ?? { income: 0, expense: 0, clearedChecks: 0 };
      const outflow = t.expense + t.clearedChecks;
      return { ...e, income: t.income, outflow, net: t.income - outflow };
    }), [consolidated]);

  const openNote = (n?: any) => {
    setNoteForm(n ? {
      id: n.id, direction: n.direction, note_type: n.note_type,
      counterparty_name: n.counterparty_name ?? '', counterparty_entity_id: n.counterparty_entity_id ?? '',
      principal: n.principal != null ? String(n.principal) : '',
      outstanding_balance: n.outstanding_balance != null ? String(n.outstanding_balance) : '',
      interest_rate: n.interest_rate != null ? String(n.interest_rate) : '',
      payment_amount: n.payment_amount != null ? String(n.payment_amount) : '',
      payment_frequency: n.payment_frequency ?? 'monthly', status: n.status ?? 'active',
      origination_date: n.origination_date ?? '', maturity_date: n.maturity_date ?? '',
      collateral: n.collateral ?? '', notes: n.notes ?? '',
    } : { ...BLANK_NOTE });
    setNoteDialog(true);
  };

  const saveNote = async () => {
    if (!user?.id) return toast.error('Sign in required');
    if (!noteForm.counterparty_name.trim()) return toast.error('Counterparty is required');
    const row: any = {
      ...(noteForm.id ? { id: noteForm.id } : {}),
      user_id: user.id,
      entity_id: 'houston-enterprise-holdings',
      direction: noteForm.direction,
      note_type: noteForm.note_type,
      counterparty_name: noteForm.counterparty_name.trim(),
      counterparty_entity_id: noteForm.counterparty_entity_id || null,
      principal: Number(noteForm.principal) || 0,
      outstanding_balance: Number(noteForm.outstanding_balance || noteForm.principal) || 0,
      interest_rate: Number(noteForm.interest_rate) || 0,
      payment_amount: noteForm.payment_amount ? Number(noteForm.payment_amount) : null,
      payment_frequency: noteForm.payment_frequency,
      status: noteForm.status,
      origination_date: noteForm.origination_date || null,
      maturity_date: noteForm.maturity_date || null,
      collateral: noteForm.collateral.trim() || null,
      notes: noteForm.notes.trim() || null,
    };
    try {
      await upsertNote.mutateAsync(row);
      toast.success(noteForm.id ? 'Note updated' : 'Note recorded');
      setNoteDialog(false);
    } catch (e: any) { toast.error(e.message); }
  };

  const openPayment = (note: any) => {
    const interest = suggestedInterest(note);
    const paymentAmt = Number(note.payment_amount || 0);
    const principal = paymentAmt > interest ? Math.round((paymentAmt - interest) * 100) / 100 : 0;
    setPaymentForm({
      note_id: note.id,
      payment_date: new Date().toISOString().slice(0, 10),
      amount: paymentAmt ? String(paymentAmt) : '',
      principal_portion: principal ? String(principal) : '',
      interest_portion: interest ? String(interest) : '',
      memo: '',
    });
    setPaymentDialog(true);
  };

  const savePayment = async () => {
    if (!user?.id) return toast.error('Sign in required');
    if (!paymentForm.note_id) return toast.error('No note selected');
    const amount = Number(paymentForm.amount);
    if (!amount || amount <= 0) return toast.error('Enter a positive payment amount');
    const principal = Number(paymentForm.principal_portion) || 0;
    const interest = Number(paymentForm.interest_portion) || 0;
    if (principal + interest > amount + 0.01) {
      return toast.error('Principal + interest cannot exceed the payment amount');
    }
    try {
      await upsertPayment.mutateAsync({
        user_id: user.id,
        entity_id: 'houston-enterprise-holdings',
        note_id: paymentForm.note_id,
        payment_date: paymentForm.payment_date,
        amount,
        principal_portion: principal,
        interest_portion: interest,
        memo: paymentForm.memo.trim() || null,
      });
      toast.success(interest > 0
        ? 'Payment logged — balance updated, interest posted to the ledger'
        : 'Payment logged — balance updated');
      setPaymentDialog(false);
    } catch (e: any) { toast.error(e.message); }
  };

  const pendingApprovals = (activity as any[]).filter(a => a.approval_status === 'pending');

  const decideApproval = async (a: any, decision: 'approved' | 'rejected') => {
    try {
      await upsertActivity.mutateAsync({
        id: a.id, user_id: a.user_id, entity_id: a.entity_id,
        activity_type: a.activity_type, amount: a.amount, activity_date: a.activity_date,
        approval_status: decision,
        approved_by: user?.email ?? null,
        approved_at: new Date().toISOString(),
      });
      toast.success(decision === 'approved' ? 'Capital activity approved' : 'Capital activity rejected');
    } catch (e: any) {
      toast.error(e.message?.includes('approval_status') ? 'Run migration 20260717000006 to enable approvals' : e.message);
    }
  };

  const paymentNote = (notes as any[]).find(n => n.id === paymentForm.note_id) ?? null;

  const saveActivity = async () => {
    if (!user?.id) return toast.error('Sign in required');
    const amount = Number(activityForm.amount);
    if (!amount || amount <= 0) return toast.error('Enter a positive amount');
    const row: any = {
      ...(activityForm.id ? { id: activityForm.id } : {}),
      user_id: user.id,
      entity_id: 'houston-enterprise-holdings',
      activity_type: activityForm.activity_type,
      related_entity_id: activityForm.related_entity_id || null,
      amount,
      activity_date: activityForm.activity_date,
      memo: activityForm.memo.trim() || null,
    };
    try {
      await upsertActivity.mutateAsync(row);
      toast.success('Capital activity logged');
      setActivityDialog(false);
      setActivityForm({ ...BLANK_ACTIVITY });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <AppShell>
      <style>{HQ_CSS}</style>
      <PageHeader
        eyebrow="Houston Enterprise Holdings"
        title="Holdings HQ"
        description="Consolidated portfolio, intercompany capital, debt schedules, and owner activity."
        actions={
          <div className="flex items-center gap-2">
            <button className="heh-action" onClick={() => { setActivityForm({ ...BLANK_ACTIVITY }); setActivityDialog(true); }}>
              <ArrowLeftRight className="w-3 h-3" /> Log Capital
            </button>
            <button className="heh-primary" onClick={() => openNote()}><Plus className="w-3.5 h-3.5" /> New Note</button>
          </div>
        }
      />

      <div className="heh-shell border-t border-border/50">
        <div className="px-4 sm:px-8 py-4 space-y-4">
          {/* ── KPI rail ── */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5">
            <Metric label="Consolidated Net" value={fmtUSD(stats.consolidatedNet)} sub="Income − outflow across all entities" icon={Landmark} color={stats.consolidatedNet >= 0 ? '#059669' : '#dc2626'} />
            <Metric label="Notes Receivable" value={fmtUSD(stats.notesReceivable)} sub={`${fmtUSD(stats.annualInterestIn)} est. annual interest in`} icon={Banknote} color="#059669" />
            <Metric label="Notes Payable" value={fmtUSD(stats.notesPayable)} sub={`${fmtUSD(stats.annualInterestOut)} est. annual interest out`} icon={Scale} color="#dc2626" />
            <Metric label="Net Note Position" value={fmtUSD(stats.netNotes)} sub="Receivable minus payable balances" icon={Percent} />
          </div>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5">
            <Metric label="Contributions YTD" value={fmtUSD(stats.ytdContributions)} sub="Capital into subsidiaries" icon={PiggyBank} color="#059669" />
            <Metric label="Distributions YTD" value={fmtUSD(stats.ytdDistributions)} sub="Distributions + dividends out" icon={ArrowLeftRight} color="#dc2626" />
            <Metric label="Mgmt Fees YTD" value={fmtUSD(stats.ytdManagementFees)} sub="Fees charged to subsidiaries" icon={FileText} color="#0891b2" />
            <Metric label="Tax Reserves YTD" value={fmtUSD(stats.ytdTaxReserves)} sub="Set aside for tax obligations" icon={ShieldCheck} color="#7c3aed" />
          </div>

          {/* ── Debt service — next 12 months ── */}
          {debtService.any && (
            <section className="heh-panel p-3 sm:p-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="heh-k">Debt Service · Next 12 Months</div>
                <div className="text-[9px] font-mono-tab text-muted-foreground">
                  <span className="text-positive font-bold">{fmtUSD(debtService.totalIn)} in</span>
                  {' · '}
                  <span className="text-destructive font-bold">{fmtUSD(debtService.totalOut)} out</span>
                </div>
              </div>
              <div className="grid grid-cols-12 gap-1">
                {debtService.months.map(m => (
                  <div key={m.key} className="min-w-0" title={`${m.label}: ${fmtUSD(m.inflow)} in · ${fmtUSD(m.outflow)} out`}>
                    <div className="h-14 flex items-end gap-[2px] justify-center">
                      <div className="w-2 bg-[#059669]/75" style={{ height: `${(m.inflow / debtService.max) * 100}%` }} />
                      <div className="w-2 bg-[#dc2626]/70" style={{ height: `${(m.outflow / debtService.max) * 100}%` }} />
                    </div>
                    <div className="text-[7px] font-bold text-center text-muted-foreground uppercase mt-0.5">{m.label}</div>
                  </div>
                ))}
              </div>
              <div className="text-[8.5px] text-muted-foreground mt-1.5">
                Scheduled from each active note's stated payment and frequency — green receivable collections, red payable obligations.
              </div>
            </section>
          )}

          {/* ── Covenant compliance + maturity risk ── */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5">
            <section className="heh-panel p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="heh-k">Covenant Compliance</div>
                <div className="flex items-center gap-2">
                  {covenantStats.breached > 0 && <span className="text-[9px] font-black uppercase text-destructive">{covenantStats.breached} breached</span>}
                  {covenantStats.warning > 0 && <span className="text-[9px] font-black uppercase text-warning">{covenantStats.warning} at risk</span>}
                  {covenantStats.dueSoon > 0 && <span className="text-[9px] font-mono-tab text-muted-foreground">{covenantStats.dueSoon} reviews ≤30d</span>}
                  <button className="heh-action" onClick={() => openCovenant()}><Plus className="w-3 h-3" /> Add</button>
                </div>
              </div>
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {(covenants as any[]).map(c => {
                  const color = c.status === 'breached' ? '#dc2626' : c.status === 'warning' ? '#d97706' : c.status === 'waived' ? '#8A8580' : '#059669';
                  const note = (notes as any[]).find(n => n.id === c.note_id);
                  return (
                    <div key={c.id} className="border border-border px-2.5 py-2 text-xs flex items-center justify-between gap-2 cursor-pointer hover:bg-secondary/30" onClick={() => openCovenant(c)}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[8px] font-black uppercase tracking-[0.14em] px-1.5 py-0.5" style={{ backgroundColor: color + '16', color }}>{c.status}</span>
                          <span className="font-bold truncate">{c.name}</span>
                          <span className="text-[9px] text-muted-foreground capitalize">{c.covenant_type}</span>
                        </div>
                        <div className="text-[9px] text-muted-foreground mt-0.5 truncate">
                          {note ? `${note.counterparty_name} · ` : ''}{c.requirement || 'No requirement text'}
                          {c.next_review_date ? ` · review ${fmtDate(c.next_review_date)}` : ''}
                        </div>
                      </div>
                      <button className="p-1 text-muted-foreground hover:text-destructive shrink-0" title="Remove covenant"
                        onClick={e => { e.stopPropagation(); if (confirm('Remove this covenant?')) deleteCovenant.mutate(c.id, { onSuccess: () => toast.success('Covenant removed') }); }}>
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
                {!(covenants as any[]).length && (
                  <div className="text-xs text-muted-foreground border border-border p-3 flex items-start gap-2">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: HEH_BLUE }} />
                    Track lender covenants — DSCR minimums, reporting deadlines, insurance requirements — with status and review dates. Requires migration 20260717000005.
                  </div>
                )}
              </div>
            </section>

            <section className="heh-panel p-3 sm:p-4">
              <div className="heh-k mb-2">Maturity Risk · Next 12 Months</div>
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {maturityRisk.map((n: any) => (
                  <div key={n.id} className="border border-border px-2.5 py-2 text-xs flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold truncate">{n.counterparty_name}</div>
                      <div className="text-[9px] text-muted-foreground">{fmtUSD(num(n.outstanding_balance))} · {n.direction === 'receivable' ? 'we hold' : 'we owe'} · matures {fmtDate(n.maturity_date)}</div>
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-[0.1em] whitespace-nowrap flex items-center gap-1 ${n.daysToMaturity <= 90 ? 'text-destructive' : 'text-warning'}`}>
                      <AlarmClock className="w-3 h-3" />{n.daysToMaturity <= 0 ? 'Matured' : `${n.daysToMaturity}d`}
                    </span>
                  </div>
                ))}
                {!maturityRisk.length && (
                  <div className="text-xs text-muted-foreground border border-border p-3">No active notes mature within 12 months.</div>
                )}
              </div>
            </section>
          </div>

          {/* ── Entity performance comparison ── */}
          <section className="heh-panel p-3 sm:p-4">
            <div className="heh-k mb-2">Entity Portfolio</div>
            <div className="overflow-x-auto">
              <div className="min-w-[560px]">
                <div className="heh-row grid grid-cols-[1.5fr_.9fr_.9fr_.9fr] gap-2 bg-secondary/45 heh-k items-center">
                  <div>Entity</div><div>Income</div><div>Outflow</div><div>Net</div>
                </div>
                {entityRows.map(e => (
                  <div key={e.id} className="heh-row grid grid-cols-[1.5fr_.9fr_.9fr_.9fr] gap-2 items-center">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-6 h-6 flex items-center justify-center shrink-0 border" style={{ borderColor: `${e.color}40`, backgroundColor: `${e.color}0d` }}>
                        <Building2 className="w-3 h-3" style={{ color: e.color }} strokeWidth={1.7} />
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold truncate">{e.name}</div>
                        <div className="text-[9px] text-muted-foreground uppercase tracking-[0.12em]">{e.category}</div>
                      </div>
                    </div>
                    <div className="font-mono-tab">{fmtUSD(e.income)}</div>
                    <div className="font-mono-tab">{fmtUSD(e.outflow)}</div>
                    <div className={`font-mono-tab font-bold ${e.net >= 0 ? 'text-positive' : 'text-destructive'}`}>{fmtUSD(e.net)}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground mt-2">
              Outflow = expenses + cleared checks per entity. Open an entity from the sidebar switcher for its full dashboard.
            </div>
          </section>

          {/* ── Notes / debt schedule ── */}
          <section className="heh-panel p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div>
                <div className="heh-k">Debt & Intercompany</div>
                <h2 className="text-base font-bold mt-0.5">Note Schedule</h2>
              </div>
              <button className="heh-action" onClick={() => openNote()}><Plus className="w-3 h-3" /> New Note</button>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[880px]">
                <div className="heh-row grid grid-cols-[1.3fr_.9fr_.7fr_.9fr_.9fr_.6fr_.8fr_.9fr_.5fr] gap-2 bg-secondary/45 heh-k items-center">
                  <div>Counterparty</div><div>Type</div><div>Direction</div><div>Principal</div><div>Outstanding</div><div>Rate</div><div>Payment</div><div>Maturity</div><div></div>
                </div>
                {(notes as any[]).map(n => (
                  <div key={n.id} className="heh-row grid grid-cols-[1.3fr_.9fr_.7fr_.9fr_.9fr_.6fr_.8fr_.9fr_.5fr] gap-2 items-center">
                    <div className="min-w-0">
                      <div className="font-bold truncate">{n.counterparty_name}</div>
                      {n.counterparty_entity_id && (
                        <div className="text-[9px] text-muted-foreground uppercase tracking-[0.12em]">{entityName(n.counterparty_entity_id)}</div>
                      )}
                    </div>
                    <div className="text-[11px]">{NOTE_TYPES[n.note_type] ?? n.note_type}</div>
                    <div>
                      <span className={`text-[8px] font-black uppercase tracking-[0.14em] px-1.5 py-0.5 ${n.direction === 'receivable' ? 'bg-positive/10 text-positive' : 'bg-destructive/10 text-destructive'}`}>
                        {n.direction === 'receivable' ? 'We Hold' : 'We Owe'}
                      </span>
                    </div>
                    <div className="font-mono-tab">{fmtUSD(num(n.principal))}</div>
                    <div className="font-mono-tab font-bold">{fmtUSD(num(n.outstanding_balance))}</div>
                    <div className="font-mono-tab">{num(n.interest_rate).toFixed(2)}%</div>
                    <div className="text-[11px] whitespace-nowrap">
                      {n.payment_amount ? `${fmtUSD(num(n.payment_amount))} / ${String(n.payment_frequency).replace('_', ' ')}` : String(n.payment_frequency).replace('_', ' ')}
                    </div>
                    <div className="text-[11px] whitespace-nowrap">{n.maturity_date ? fmtDate(n.maturity_date) : '—'}</div>
                    <div className="flex items-center gap-1 justify-end">
                      {n.status === 'active' && (
                        <button className="p-1 text-positive hover:opacity-70" onClick={() => openPayment(n)} title="Log a payment on this note">
                          <Banknote className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button className="p-1 text-muted-foreground hover:text-foreground" onClick={() => openAmortization(n)} title="Projected amortization schedule">
                        <CalendarRange className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-1 text-muted-foreground hover:text-foreground" onClick={() => openNote(n)} title="Edit note"><Pencil className="w-3 h-3" /></button>
                      <button className="p-1 text-muted-foreground hover:text-destructive" title="Remove note"
                        onClick={() => { if (confirm('Remove this note?')) deleteNote.mutate(n.id, { onSuccess: () => toast.success('Note removed') }); }}>
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
                {!notesLoading && !(notes as any[]).length && (
                  <div className="py-10 text-center text-xs text-muted-foreground">No notes yet — record intercompany loans and bank debt to track exposure and interest.</div>
                )}
              </div>
            </div>

            {(payments as any[]).length > 0 && (
              <>
                <div className="heh-k mt-4 mb-2">Recent Note Payments</div>
                <div className="space-y-1.5 max-h-52 overflow-y-auto">
                  {(payments as any[]).slice(0, 8).map(p => {
                    const note = (notes as any[]).find(n => n.id === p.note_id);
                    return (
                      <div key={p.id} className="border border-border px-2.5 py-2 text-xs flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-bold truncate">{note?.counterparty_name ?? 'Note payment'}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {fmtDate(p.payment_date)} · principal {fmtUSD(num(p.principal_portion))} · interest {fmtUSD(num(p.interest_portion))}
                          </div>
                        </div>
                        <span className="font-mono-tab font-bold whitespace-nowrap">{fmtUSD(num(p.amount))}</span>
                        <button className="p-1 text-muted-foreground hover:text-destructive shrink-0" title="Remove payment (restores balance, voids interest entry)"
                          onClick={() => { if (confirm('Remove this payment? The note balance will be restored and any interest ledger entry voided.')) deletePayment.mutate(p.id, { onSuccess: () => toast.success('Payment removed') }); }}>
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </section>

          {/* ── Capital activity ── */}
          <section className="heh-panel p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div>
                <div className="heh-k">Owner & Intercompany Capital</div>
                <h2 className="text-base font-bold mt-0.5">Capital Activity</h2>
              </div>
              <button className="heh-action" onClick={() => { setActivityForm({ ...BLANK_ACTIVITY }); setActivityDialog(true); }}>
                <Plus className="w-3 h-3" /> Log Activity
              </button>
            </div>
            {pendingApprovals.length > 0 && (
              <div className="mb-3 border border-warning/40 bg-warning/5 p-2.5">
                <div className="heh-k mb-1.5" style={{ color: '#d97706' }}>Pending Approval ({pendingApprovals.length})</div>
                <div className="space-y-1.5">
                  {pendingApprovals.map(a => {
                    const meta = ACTIVITY_TYPES[a.activity_type] ?? ACTIVITY_TYPES.distribution;
                    return (
                      <div key={a.id} className="flex items-center justify-between gap-2 text-xs">
                        <div className="min-w-0 flex-1 truncate">
                          <span className="font-bold">{meta.label}</span>
                          {a.related_entity_id ? <span className="text-muted-foreground"> → {entityName(a.related_entity_id)}</span> : null}
                          <span className="font-mono-tab font-bold ml-1.5">{fmtUSD(num(a.amount))}</span>
                          {a.memo ? <span className="text-muted-foreground"> · {a.memo}</span> : null}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button className="heh-action !text-positive" onClick={() => decideApproval(a, 'approved')}>Approve</button>
                          <button className="heh-action !text-destructive" onClick={() => decideApproval(a, 'rejected')}>Reject</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {(activity as any[]).filter(a => a.approval_status !== 'pending').map(a => {
                const meta = ACTIVITY_TYPES[a.activity_type] ?? ACTIVITY_TYPES.distribution;
                return (
                  <div key={a.id} className="border border-border px-2.5 py-2 text-xs flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[8px] font-black uppercase tracking-[0.14em] px-1.5 py-0.5" style={{ backgroundColor: meta.color + '16', color: meta.color }}>
                          {meta.label}
                        </span>
                        {a.related_entity_id && (
                          <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-[0.1em]">→ {entityName(a.related_entity_id)}</span>
                        )}
                        {a.approval_status === 'rejected' && (
                          <span className="text-[8px] font-black uppercase tracking-[0.14em] px-1.5 py-0.5 bg-destructive/10 text-destructive">Rejected</span>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1 truncate">{fmtDate(a.activity_date)}{a.memo ? ` · ${a.memo}` : ''}</div>
                    </div>
                    <div className={`font-mono-tab font-bold whitespace-nowrap ${meta.sign > 0 ? 'text-positive' : 'text-destructive'}`}>
                      {meta.sign > 0 ? '+' : '−'}{fmtUSD(num(a.amount))}
                    </div>
                    <button className="p-1 text-muted-foreground hover:text-destructive shrink-0" title="Remove entry"
                      onClick={() => { if (confirm('Remove this capital entry?')) deleteActivity.mutate(a.id, { onSuccess: () => toast.success('Entry removed') }); }}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
              {!activityLoading && !(activity as any[]).length && (
                <div className="text-xs text-muted-foreground border border-border p-3">
                  No capital activity yet — log contributions, distributions, dividends, management fees, and tax reserves for board-ready records.
                </div>
              )}
            </div>
          </section>

          {/* ── Reporting note ── */}
          <section className="heh-panel p-3 sm:p-4">
            <div className="heh-k mb-2">Board Reporting</div>
            <div className="flex items-start gap-2 text-[11px] text-muted-foreground leading-relaxed">
              <TrendingUp className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: HEH_BLUE }} />
              <span>
                Corporate overhead runs through <Link to="/expenses" className="font-bold" style={{ color: HEH_BLUE }}>Corporate Expenses</Link> and
                interest/fee income through <Link to="/income" className="font-bold" style={{ color: HEH_BLUE }}>Inflows</Link> for this entity.
                The <Link to="/charts" className="font-bold" style={{ color: HEH_BLUE }}>Charts</Link> screen provides period analytics, and the entity
                switcher gives each subsidiary's full dashboard for drill-down.
              </span>
            </div>
          </section>
        </div>
      </div>

      {/* ── Note dialog ── */}
      <Dialog open={noteDialog} onOpenChange={setNoteDialog}>
        <DialogContent className="max-w-lg rounded-none max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-base">{noteForm.id ? 'Edit Note' : 'New Note'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <div className="heh-k mb-1">Direction</div>
              <Select value={noteForm.direction} onValueChange={v => setNoteForm(f => ({ ...f, direction: v }))}>
                <SelectTrigger className="heh-field"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="receivable">Receivable — we hold the note</SelectItem>
                  <SelectItem value="payable">Payable — we owe</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="heh-k mb-1">Type</div>
              <Select value={noteForm.note_type} onValueChange={v => setNoteForm(f => ({ ...f, note_type: v }))}>
                <SelectTrigger className="heh-field"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(NOTE_TYPES).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <div className="heh-k mb-1">Counterparty *</div>
              <Input className="heh-field" placeholder="Bank, lender, or entity name" value={noteForm.counterparty_name} onChange={e => setNoteForm(f => ({ ...f, counterparty_name: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <div className="heh-k mb-1">Related HOU Entity (if intercompany)</div>
              <Select value={noteForm.counterparty_entity_id || '__none__'} onValueChange={v => setNoteForm(f => ({ ...f, counterparty_entity_id: v === '__none__' ? '' : v }))}>
                <SelectTrigger className="heh-field"><SelectValue placeholder="External counterparty" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">External counterparty</SelectItem>
                  {ENTITIES.filter(e => e.id !== 'houston-enterprise-holdings').map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="heh-k mb-1">Principal</div>
              <Input className="heh-field" type="number" inputMode="decimal" value={noteForm.principal} onChange={e => setNoteForm(f => ({ ...f, principal: e.target.value }))} />
            </div>
            <div>
              <div className="heh-k mb-1">Outstanding Balance</div>
              <Input className="heh-field" type="number" inputMode="decimal" placeholder="Defaults to principal" value={noteForm.outstanding_balance} onChange={e => setNoteForm(f => ({ ...f, outstanding_balance: e.target.value }))} />
            </div>
            <div>
              <div className="heh-k mb-1">Interest Rate % (APR)</div>
              <Input className="heh-field" type="number" inputMode="decimal" step="0.01" value={noteForm.interest_rate} onChange={e => setNoteForm(f => ({ ...f, interest_rate: e.target.value }))} />
            </div>
            <div>
              <div className="heh-k mb-1">Status</div>
              <Select value={noteForm.status} onValueChange={v => setNoteForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="heh-field"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid_off">Paid Off</SelectItem>
                  <SelectItem value="defaulted">Defaulted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="heh-k mb-1">Payment Amount</div>
              <Input className="heh-field" type="number" inputMode="decimal" value={noteForm.payment_amount} onChange={e => setNoteForm(f => ({ ...f, payment_amount: e.target.value }))} />
            </div>
            <div>
              <div className="heh-k mb-1">Frequency</div>
              <Select value={noteForm.payment_frequency} onValueChange={v => setNoteForm(f => ({ ...f, payment_frequency: v }))}>
                <SelectTrigger className="heh-field"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="interest_only">Interest Only</SelectItem>
                  <SelectItem value="balloon">Balloon</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="heh-k mb-1">Origination</div>
              <Input className="heh-field" type="date" value={noteForm.origination_date} onChange={e => setNoteForm(f => ({ ...f, origination_date: e.target.value }))} />
            </div>
            <div>
              <div className="heh-k mb-1">Maturity</div>
              <Input className="heh-field" type="date" value={noteForm.maturity_date} onChange={e => setNoteForm(f => ({ ...f, maturity_date: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <div className="heh-k mb-1">Collateral</div>
              <Input className="heh-field" value={noteForm.collateral} onChange={e => setNoteForm(f => ({ ...f, collateral: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <div className="heh-k mb-1">Notes</div>
              <Textarea className="rounded-none text-xs" rows={2} value={noteForm.notes} onChange={e => setNoteForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <button className="heh-primary w-full mt-2" onClick={saveNote} disabled={upsertNote.isPending}>
            {noteForm.id ? 'Save Note' : 'Record Note'}
          </button>
        </DialogContent>
      </Dialog>

      {/* ── Capital activity dialog ── */}
      <Dialog open={activityDialog} onOpenChange={setActivityDialog}>
        <DialogContent className="max-w-md rounded-none">
          <DialogHeader><DialogTitle className="text-base">Log Capital Activity</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="col-span-2">
              <div className="heh-k mb-1">Type</div>
              <Select value={activityForm.activity_type} onValueChange={v => setActivityForm(f => ({ ...f, activity_type: v }))}>
                <SelectTrigger className="heh-field"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ACTIVITY_TYPES).map(([k, m]) => <SelectItem key={k} value={k}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <div className="heh-k mb-1">Related Entity</div>
              <Select value={activityForm.related_entity_id || '__none__'} onValueChange={v => setActivityForm(f => ({ ...f, related_entity_id: v === '__none__' ? '' : v }))}>
                <SelectTrigger className="heh-field"><SelectValue placeholder="None / external" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None / external</SelectItem>
                  {ENTITIES.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="heh-k mb-1">Amount *</div>
              <Input className="heh-field" type="number" inputMode="decimal" value={activityForm.amount} onChange={e => setActivityForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <div className="heh-k mb-1">Date</div>
              <Input className="heh-field" type="date" value={activityForm.activity_date} onChange={e => setActivityForm(f => ({ ...f, activity_date: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <div className="heh-k mb-1">Approval</div>
              <Select value={activityForm.approval_status} onValueChange={v => setActivityForm(f => ({ ...f, approval_status: v }))}>
                <SelectTrigger className="heh-field"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Approved — post immediately</SelectItem>
                  <SelectItem value="pending">Pending — route for approval</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <div className="heh-k mb-1">Memo</div>
              <Input className="heh-field" placeholder="e.g. Q3 distribution to owners" value={activityForm.memo} onChange={e => setActivityForm(f => ({ ...f, memo: e.target.value }))} />
            </div>
          </div>
          <button className="heh-primary w-full mt-2" onClick={saveActivity} disabled={upsertActivity.isPending}>
            Log Activity
          </button>
        </DialogContent>
      </Dialog>

      {/* ── Note payment dialog ── */}
      <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
        <DialogContent className="max-w-md rounded-none">
          <DialogHeader>
            <DialogTitle className="text-base">
              Log Payment{paymentNote ? ` — ${paymentNote.counterparty_name}` : ''}
            </DialogTitle>
          </DialogHeader>
          {paymentNote && (
            <div className="text-[10px] text-muted-foreground -mt-1 mb-1">
              {paymentNote.direction === 'receivable' ? 'Receivable — payment coming in' : 'Payable — payment going out'} ·
              balance {fmtUSD(num(paymentNote.outstanding_balance))} at {num(paymentNote.interest_rate).toFixed(2)}%
            </div>
          )}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <div className="heh-k mb-1">Payment Date</div>
              <Input className="heh-field" type="date" value={paymentForm.payment_date} onChange={e => setPaymentForm(f => ({ ...f, payment_date: e.target.value }))} />
            </div>
            <div>
              <div className="heh-k mb-1">Total Amount *</div>
              <Input className="heh-field" type="number" inputMode="decimal" value={paymentForm.amount} onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <div className="heh-k mb-1">Principal Portion</div>
              <Input className="heh-field" type="number" inputMode="decimal" value={paymentForm.principal_portion} onChange={e => setPaymentForm(f => ({ ...f, principal_portion: e.target.value }))} />
            </div>
            <div>
              <div className="heh-k mb-1">Interest Portion</div>
              <Input className="heh-field" type="number" inputMode="decimal" value={paymentForm.interest_portion} onChange={e => setPaymentForm(f => ({ ...f, interest_portion: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <div className="heh-k mb-1">Memo</div>
              <Input className="heh-field" placeholder="e.g. July installment" value={paymentForm.memo} onChange={e => setPaymentForm(f => ({ ...f, memo: e.target.value }))} />
            </div>
            <div className="col-span-2 text-[10px] text-muted-foreground leading-relaxed">
              The principal portion reduces the note's outstanding balance automatically. The interest portion posts to the
              ledger as {paymentNote?.direction === 'receivable' ? 'Interest Income' : 'Interest Expense'} — principal
              movement is a balance-sheet event and is intentionally not booked as income or expense.
            </div>
          </div>
          <button className="heh-primary w-full mt-2" onClick={savePayment} disabled={upsertPayment.isPending}>
            Log Payment
          </button>
        </DialogContent>
      </Dialog>

      {/* ── Amortization schedule dialog ── */}
      <Dialog open={!!amortNote} onOpenChange={open => { if (!open) setAmortNote(null); }}>
        <DialogContent className="max-w-lg rounded-none max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Amortization — {amortNote?.counterparty_name}</DialogTitle>
          </DialogHeader>
          {amortNote && (
            <div className="text-[10px] text-muted-foreground -mt-1 mb-1">
              {fmtUSD(num(amortNote.outstanding_balance))} at {num(amortNote.interest_rate).toFixed(2)}% ·
              {' '}{String(amortNote.payment_frequency).replace('_', ' ')}
              {amortNote.maturity_date ? ` · matures ${fmtDate(amortNote.maturity_date)}` : ''}
            </div>
          )}
          {amortLoading ? (
            <div className="py-10 flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Projecting schedule…
            </div>
          ) : amortRows.length ? (
            <div className="overflow-x-auto border border-border">
              <div className="min-w-[440px]">
                <div className="grid grid-cols-[.4fr_.9fr_.9fr_.9fr_.9fr_1fr] gap-2 px-2.5 py-1.5 bg-secondary/45 heh-k">
                  <div>#</div><div>Due</div><div>Payment</div><div>Interest</div><div>Principal</div><div>Balance</div>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {amortRows.map((r: any) => (
                    <div key={r.period} className="grid grid-cols-[.4fr_.9fr_.9fr_.9fr_.9fr_1fr] gap-2 px-2.5 py-1 border-t border-border/60 text-[10.5px] font-mono-tab">
                      <div className="text-muted-foreground">{r.period}</div>
                      <div>{fmtDate(r.due_date)}</div>
                      <div>{fmtUSD(num(r.payment))}</div>
                      <div className="text-warning">{fmtUSD(num(r.interest))}</div>
                      <div className="text-positive">{fmtUSD(num(r.principal))}</div>
                      <div className="font-bold">{fmtUSD(num(r.ending_balance))}</div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-[.4fr_.9fr_.9fr_.9fr_.9fr_1fr] gap-2 px-2.5 py-1.5 bg-secondary/30 border-t border-border text-[10.5px] font-mono-tab font-bold">
                  <div /><div>Total</div>
                  <div>{fmtUSD(amortRows.reduce((s: number, r: any) => s + num(r.payment), 0))}</div>
                  <div className="text-warning">{fmtUSD(amortRows.reduce((s: number, r: any) => s + num(r.interest), 0))}</div>
                  <div className="text-positive">{fmtUSD(amortRows.reduce((s: number, r: any) => s + num(r.principal), 0))}</div>
                  <div />
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground border border-border p-4">
              No schedule could be projected — set a payment amount (or a maturity date for a derived level payment) on this note.
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <div className="text-[9px] text-muted-foreground flex-1">
              Projection from the current balance, APR, and payment terms. Logged payments (principal/interest split) remain the source of truth for the actual balance.
            </div>
            {amortRows.length > 0 && (
              <button className="heh-action shrink-0" onClick={exportAmortizationCsv}>
                <Download className="w-3 h-3" /> CSV
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Covenant dialog ── */}
      <Dialog open={covenantDialog} onOpenChange={setCovenantDialog}>
        <DialogContent className="max-w-md rounded-none max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-base">{covenantForm.id ? 'Edit Covenant' : 'Add Covenant'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="col-span-2">
              <div className="heh-k mb-1">Name *</div>
              <Input className="heh-field" placeholder="e.g. Minimum DSCR 1.25x" value={covenantForm.name} onChange={e => setCovenantForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <div className="heh-k mb-1">Type</div>
              <Select value={covenantForm.covenant_type} onValueChange={v => setCovenantForm(f => ({ ...f, covenant_type: v }))}>
                <SelectTrigger className="heh-field"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['financial', 'reporting', 'insurance', 'operational', 'other'].map(t => (
                    <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="heh-k mb-1">Status</div>
              <Select value={covenantForm.status} onValueChange={v => setCovenantForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="heh-field"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['compliant', 'warning', 'breached', 'waived'].map(s => (
                    <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <div className="heh-k mb-1">Linked Note</div>
              <Select value={covenantForm.note_id || '__none__'} onValueChange={v => setCovenantForm(f => ({ ...f, note_id: v === '__none__' ? '' : v }))}>
                <SelectTrigger className="heh-field"><SelectValue placeholder="Standalone" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Standalone</SelectItem>
                  {(notes as any[]).map(n => <SelectItem key={n.id} value={n.id}>{n.counterparty_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <div className="heh-k mb-1">Requirement</div>
              <Input className="heh-field" placeholder="What the lender requires" value={covenantForm.requirement} onChange={e => setCovenantForm(f => ({ ...f, requirement: e.target.value }))} />
            </div>
            <div>
              <div className="heh-k mb-1">Next Review</div>
              <Input className="heh-field" type="date" value={covenantForm.next_review_date} onChange={e => setCovenantForm(f => ({ ...f, next_review_date: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <div className="heh-k mb-1">Notes</div>
              <Textarea className="rounded-none text-xs" rows={2} value={covenantForm.notes} onChange={e => setCovenantForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <button className="heh-primary w-full mt-2" onClick={saveCovenant} disabled={upsertCovenant.isPending}>
            {covenantForm.id ? 'Save Covenant' : 'Add Covenant'}
          </button>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
