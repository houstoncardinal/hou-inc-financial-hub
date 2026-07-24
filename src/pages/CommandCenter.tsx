/* ── Executive Command Center ─────────────────────────────────────────────
   Answers "How is my company doing today?" — a diagnosis layer (insights
   with recommended actions), the full executive KPI grid, and an
   interactive projected cash-flow timeline (30/60/90/180/365 days) built
   from open AR, pending checks, payroll, and recurring obligations. ── */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import {
  Area, Bar, ComposedChart, Line, ReferenceLine, ResponsiveContainer,
  Tooltip, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import {
  AlertTriangle, ArrowRight, Banknote, Building2, CalendarClock, CheckCircle2,
  ClipboardList, Clock, FileWarning, Flame, Landmark, RefreshCw, ShieldAlert,
  TrendingDown, TrendingUp, Wallet,
} from 'lucide-react';
import { fmtUSD } from '@/lib/format';
import {
  useCashFlowForecast, useExecutiveSnapshot, useRecurringObligations,
  useUpsertRecurringObligation, useDeleteRecurringObligation,
  type ExecutiveInsight, type RecurringObligation,
} from '@/hooks/useErp';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const HORIZONS = [
  { days: 30, label: '30D' }, { days: 60, label: '60D' }, { days: 90, label: '90D' },
  { days: 180, label: '180D' }, { days: 365, label: '1Y' },
];

const SEVERITY_STYLE: Record<ExecutiveInsight['severity'], { border: string; bg: string; fg: string; icon: any }> = {
  critical: { border: '#DC262640', bg: '#DC26260A', fg: '#DC2626', icon: ShieldAlert },
  warning:  { border: '#D9770640', bg: '#D977060A', fg: '#D97706', icon: AlertTriangle },
  info:     { border: '#2563EB33', bg: '#2563EB08', fg: '#2563EB', icon: FileWarning },
  good:     { border: '#16A34A33', bg: '#16A34A08', fg: '#16A34A', icon: CheckCircle2 },
};

const OBLIGATION_TYPES = ['loan_payment', 'rent', 'insurance', 'payroll', 'tax', 'subscription', 'utility', 'equipment_lease', 'other'];
const CADENCES = ['weekly', 'biweekly', 'monthly', 'quarterly', 'annual'];

function ForecastTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div className="border border-border bg-background px-3 py-2.5 shadow-xl text-xs min-w-[210px]">
      <div className="micro-label mb-1.5">{label}</div>
      <div className="flex justify-between gap-4 py-0.5"><span className="text-muted-foreground">Inflow</span><span className="font-mono-tab font-semibold text-emerald-600">+{fmtUSD(row.inflow)}</span></div>
      <div className="flex justify-between gap-4 py-0.5"><span className="text-muted-foreground">Outflow</span><span className="font-mono-tab font-semibold text-red-600">-{fmtUSD(row.outflow)}</span></div>
      {row.detail && (
        <div className="mt-1 pt-1 border-t border-border text-[10px] text-muted-foreground space-y-0.5">
          {row.detail.ar > 0 && <div className="flex justify-between gap-3"><span>AR collections</span><span className="font-mono-tab">{fmtUSD(row.detail.ar)}</span></div>}
          {row.detail.checks > 0 && <div className="flex justify-between gap-3"><span>Pending checks</span><span className="font-mono-tab">{fmtUSD(row.detail.checks)}</span></div>}
          {row.detail.payroll > 0 && <div className="flex justify-between gap-3"><span>Payroll</span><span className="font-mono-tab">{fmtUSD(row.detail.payroll)}</span></div>}
          {row.detail.recurring > 0 && <div className="flex justify-between gap-3"><span>Recurring</span><span className="font-mono-tab">{fmtUSD(row.detail.recurring)}</span></div>}
        </div>
      )}
      <div className="flex justify-between gap-4 mt-1 pt-1 border-t border-border">
        <span className="font-semibold">Projected balance</span>
        <span className={`font-mono-tab font-bold ${row.running_balance < 0 ? 'text-red-600' : ''}`}>{fmtUSD(row.running_balance)}</span>
      </div>
    </div>
  );
}

export default function CommandCenter() {
  const navigate = useNavigate();
  const [horizon, setHorizon] = useState(90);
  const { data: snap, isLoading, refetch, isFetching } = useExecutiveSnapshot();
  const { data: forecast = [] } = useCashFlowForecast(horizon);
  const { data: obligations = [] } = useRecurringObligations();
  const upsertObligation = useUpsertRecurringObligation();
  const deleteObligation = useDeleteRecurringObligation();

  const [obForm, setObForm] = useState<Partial<RecurringObligation> | null>(null);

  /* Weekly buckets keep the chart readable at long horizons */
  const chartData = useMemo(() => {
    if (!forecast.length) return [];
    const step = horizon <= 60 ? 1 : horizon <= 180 ? 7 : 14;
    const out: { label: string; inflow: number; outflow: number; running_balance: number; detail: any }[] = [];
    for (let i = 0; i < forecast.length; i += step) {
      const slice = forecast.slice(i, i + step);
      const last = slice[slice.length - 1];
      out.push({
        label: new Date(slice[0].day + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        inflow: slice.reduce((s, r) => s + Number(r.inflow), 0),
        outflow: slice.reduce((s, r) => s + Number(r.outflow), 0),
        running_balance: Number(last.running_balance),
        detail: {
          ar: slice.reduce((s, r) => s + Number(r.detail?.ar ?? 0), 0),
          checks: slice.reduce((s, r) => s + Number(r.detail?.checks ?? 0), 0),
          payroll: slice.reduce((s, r) => s + Number(r.detail?.payroll ?? 0), 0),
          recurring: slice.reduce((s, r) => s + Number(r.detail?.recurring ?? 0), 0),
        },
      });
    }
    return out;
  }, [forecast, horizon]);

  const lowPoint = useMemo(() => {
    if (!forecast.length) return null;
    return forecast.reduce((min, r) => Number(r.running_balance) < Number(min.running_balance) ? r : min, forecast[0]);
  }, [forecast]);

  const kpis = useMemo(() => {
    if (!snap) return [];
    return [
      { label: 'Cash on Hand', value: fmtUSD(snap.cash_on_hand), icon: Wallet, color: snap.cash_on_hand >= 0 ? '#16A34A' : '#DC2626', sub: snap.runway_months != null ? `${snap.runway_months} mo runway` : 'No burn history' },
      { label: 'Revenue Today', value: fmtUSD(snap.revenue_today), icon: TrendingUp, color: '#16A34A', sub: 'Received today' },
      { label: 'Revenue This Week', value: fmtUSD(snap.revenue_wtd), icon: TrendingUp, color: '#16A34A', sub: 'Week to date' },
      { label: 'Revenue This Month', value: fmtUSD(snap.revenue_mtd), icon: TrendingUp, color: '#16A34A', sub: `Net ${fmtUSD(snap.net_mtd)} MTD` },
      { label: 'Accounts Receivable', value: fmtUSD(snap.ar_open), icon: Banknote, color: '#2563EB', sub: snap.ar_overdue > 0 ? `${fmtUSD(snap.ar_overdue)} overdue` : 'Nothing overdue', urgent: snap.ar_overdue > 0 },
      { label: 'Accounts Payable', value: fmtUSD(snap.ap_open), icon: Landmark, color: '#D97706', sub: 'Pending checks' },
      { label: 'Payroll Due', value: fmtUSD(snap.payroll_due), icon: Clock, color: snap.payroll_due > 0 ? '#DC2626' : '#6B7280', sub: snap.next_payroll_date ? `Next: ${snap.next_payroll_date}` : 'No open runs' },
      { label: 'Backlog Value', value: fmtUSD(snap.backlog_value), icon: Building2, color: '#7C3AED', sub: 'Contracted, unearned' },
      { label: 'Active Projects', value: String(snap.active_projects), icon: ClipboardList, color: '#0A0A0A', sub: snap.delayed_projects > 0 ? `${snap.delayed_projects} delayed` : 'None delayed', urgent: snap.delayed_projects > 0 },
      { label: 'Pending Change Orders', value: fmtUSD(snap.pending_change_order_value), icon: FileWarning, color: '#D97706', sub: `${snap.pending_change_orders} awaiting approval` },
      { label: 'Pending Estimates', value: fmtUSD(snap.pending_estimate_value), icon: ClipboardList, color: '#2563EB', sub: `${snap.pending_estimates} in pipeline (cost basis)` },
      { label: 'Retainage Receivable', value: fmtUSD(snap.retainage_receivable), icon: Banknote, color: '#0891B2', sub: `Held on subs: ${fmtUSD(snap.retainage_held)}` },
      { label: 'Burn Rate', value: fmtUSD(snap.burn_rate_monthly), icon: Flame, color: '#DC2626', sub: 'Avg monthly, last 90d' },
      { label: 'Open RFIs', value: String(snap.open_rfis), icon: FileWarning, color: '#2563EB', sub: `${snap.overdue_workflow_items} workflow items overdue`, urgent: snap.overdue_workflow_items > 0 },
      { label: 'Open Punch Items', value: String(snap.open_punch_items), icon: ClipboardList, color: '#D97706', sub: `${snap.failed_inspections} failed inspections`, urgent: snap.failed_inspections > 0 },
      { label: 'Expenses MTD', value: fmtUSD(snap.expenses_mtd), icon: TrendingDown, color: '#DC2626', sub: 'Month to date' },
    ];
  }, [snap]);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Executive Command Center"
        title="How is my company doing today?"
        description={snap ? `Live diagnosis as of ${new Date(snap.as_of).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} — KPIs, generated insights with recommended actions, and the projected cash timeline.` : 'Loading live company diagnosis…'}
        actions={
          <Button variant="outline" className="rounded-none" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        }
      />

      {/* ── Diagnosis: insights with recommended actions ── */}
      {snap && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mb-6">
          {snap.insights.map((ins, i) => {
            const st = SEVERITY_STYLE[ins.severity] ?? SEVERITY_STYLE.info;
            const Icon = st.icon;
            return (
              <div key={i} className="border p-4 flex flex-col gap-2" style={{ borderColor: st.border, backgroundColor: st.bg }}>
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 shrink-0" style={{ color: st.fg }} strokeWidth={2} />
                  <span className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: st.fg }}>{ins.severity}</span>
                </div>
                <div className="text-sm font-bold leading-snug">{ins.title}</div>
                <div className="text-xs text-muted-foreground leading-relaxed">{ins.detail}</div>
                <div className="flex items-start gap-1.5 mt-auto pt-1.5 border-t border-border/60">
                  <ArrowRight className="w-3 h-3 mt-0.5 shrink-0" style={{ color: st.fg }} strokeWidth={2.5} />
                  <span className="text-xs font-semibold leading-snug">{ins.action}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Executive KPI grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 mb-6">
        {isLoading && Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border border-border bg-background p-4 h-[92px] animate-pulse" />
        ))}
        {kpis.map(k => (
          <div key={k.label} className={`border bg-background p-4 ${k.urgent ? 'border-red-300' : 'border-border'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="micro-label">{k.label}</span>
              <k.icon className="w-3.5 h-3.5" style={{ color: k.color }} strokeWidth={1.8} />
            </div>
            <div className="text-lg md:text-xl font-bold font-mono-tab leading-tight" style={{ color: k.urgent ? '#DC2626' : undefined }}>{k.value}</div>
            <div className="text-[10px] text-muted-foreground mt-1 truncate">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Projected cash-flow timeline ── */}
      <div className="border border-border bg-background mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-border">
          <div>
            <div className="text-sm font-bold">Projected Cash Flow</div>
            <div className="text-[11px] text-muted-foreground">Open AR at due date · pending checks · payroll · recurring obligations</div>
          </div>
          <div className="flex items-center gap-1">
            {HORIZONS.map(h => (
              <button key={h.days} onClick={() => setHorizon(h.days)}
                className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] border transition-colors ${
                  horizon === h.days ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:border-foreground/40'
                }`}>
                {h.label}
              </button>
            ))}
          </div>
        </div>
        {lowPoint && Number(lowPoint.running_balance) < 0 && (
          <div className="px-4 py-2 border-b border-red-200 bg-red-50 text-xs text-red-700 font-semibold flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
            Projected balance goes negative around {new Date(lowPoint.day + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} ({fmtUSD(lowPoint.running_balance)}). Accelerate collections or defer outflows before then.
          </div>
        )}
        <div className="p-4">
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 4 }}>
              <defs>
                <linearGradient id="cc-balance-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#E5E7EB" strokeDasharray="3 3" strokeOpacity={0.6} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${Math.round(v / 1000)}k`} width={52} />
              <Tooltip content={<ForecastTooltip />} />
              <ReferenceLine y={0} stroke="#DC2626" strokeOpacity={0.5} strokeDasharray="4 3" />
              <Bar dataKey="inflow" fill="#16A34A" fillOpacity={0.75} maxBarSize={18} />
              <Bar dataKey="outflow" fill="#DC2626" fillOpacity={0.6} maxBarSize={18} />
              <Area type="monotone" dataKey="running_balance" stroke="none" fill="url(#cc-balance-fill)" />
              <Line type="monotone" dataKey="running_balance" stroke="#2563EB" strokeWidth={2.5} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-5 mt-2 pt-2 border-t border-border">
            {[['Inflows', '#16A34A'], ['Outflows', '#DC2626'], ['Projected balance', '#2563EB']].map(([l, c]) => (
              <div key={l} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5" style={{ backgroundColor: c }} />
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-8">
        {/* ── Upcoming milestones ── */}
        <div className="border border-border bg-background">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-muted-foreground" strokeWidth={1.8} />
              <span className="text-sm font-bold">Upcoming Milestones · 30 days</span>
            </div>
            <button onClick={() => navigate('/projects')} className="text-[11px] font-semibold text-muted-foreground hover:text-foreground">All projects →</button>
          </div>
          <div className="divide-y divide-border max-h-[300px] overflow-y-auto">
            {(!snap || snap.upcoming_milestones.length === 0) && (
              <div className="px-4 py-8 text-center text-xs text-muted-foreground">No milestones due in the next 30 days.</div>
            )}
            {snap?.upcoming_milestones.map((m, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                <span className="text-[10px] font-black font-mono-tab w-14 shrink-0 text-muted-foreground">
                  {m.target_date ? new Date(m.target_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                </span>
                <span className="flex-1 min-w-0 text-xs font-semibold truncate">{m.title}</span>
                <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">{m.project}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Recurring obligations feed (drives the forecast) ── */}
        <div className="border border-border bg-background">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div>
              <span className="text-sm font-bold">Recurring Obligations</span>
              <div className="text-[10px] text-muted-foreground">Loans, rent, insurance, taxes — feeds the forecast outflows</div>
            </div>
            <Button size="sm" variant="outline" className="rounded-none h-7 text-[11px]"
              onClick={() => setObForm({ obligation_type: 'loan_payment', cadence: 'monthly', amount: 0, next_due_date: new Date().toISOString().slice(0, 10), is_active: true })}>
              + Add
            </Button>
          </div>
          {obForm && (
            <div className="px-4 py-3 border-b border-border bg-secondary/30 grid grid-cols-2 md:grid-cols-3 gap-2.5">
              <div className="col-span-2 md:col-span-1 space-y-1"><Label className="micro-label">Name</Label>
                <Input className="rounded-none h-8 text-xs" value={obForm.name ?? ''} onChange={e => setObForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Truck loan" /></div>
              <div className="space-y-1"><Label className="micro-label">Type</Label>
                <Select value={obForm.obligation_type} onValueChange={v => setObForm(f => ({ ...f, obligation_type: v }))}>
                  <SelectTrigger className="rounded-none h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{OBLIGATION_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                </Select></div>
              <div className="space-y-1"><Label className="micro-label">Amount</Label>
                <Input type="number" className="rounded-none h-8 text-xs font-mono-tab" value={obForm.amount ?? 0} onChange={e => setObForm(f => ({ ...f, amount: Number(e.target.value) }))} /></div>
              <div className="space-y-1"><Label className="micro-label">Cadence</Label>
                <Select value={obForm.cadence} onValueChange={v => setObForm(f => ({ ...f, cadence: v }))}>
                  <SelectTrigger className="rounded-none h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{CADENCES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select></div>
              <div className="space-y-1"><Label className="micro-label">Next due</Label>
                <Input type="date" className="rounded-none h-8 text-xs" value={obForm.next_due_date ?? ''} onChange={e => setObForm(f => ({ ...f, next_due_date: e.target.value }))} /></div>
              <div className="flex items-end gap-2">
                <Button size="sm" className="rounded-none h-8 text-[11px]"
                  disabled={!obForm.name || !obForm.amount || upsertObligation.isPending}
                  onClick={async () => { await upsertObligation.mutateAsync(obForm as any); setObForm(null); }}>
                  Save
                </Button>
                <Button size="sm" variant="outline" className="rounded-none h-8 text-[11px]" onClick={() => setObForm(null)}>Cancel</Button>
              </div>
            </div>
          )}
          <div className="divide-y divide-border max-h-[240px] overflow-y-auto">
            {obligations.length === 0 && !obForm && (
              <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                No recurring obligations yet — add loans, rent, and insurance so the forecast reflects them.
              </div>
            )}
            {obligations.map(o => (
              <div key={o.id} className="flex items-center gap-3 px-4 py-2.5 group">
                <span className="flex-1 min-w-0">
                  <span className="block text-xs font-semibold truncate">{o.name}</span>
                  <span className="block text-[10px] text-muted-foreground">{o.obligation_type.replace(/_/g, ' ')} · {o.cadence} · next {o.next_due_date}</span>
                </span>
                <span className="text-xs font-bold font-mono-tab shrink-0">{fmtUSD(o.amount)}</span>
                <button onClick={() => setObForm(o)} className="text-[10px] font-semibold text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">Edit</button>
                <button onClick={() => deleteObligation.mutate(o.id)} className="text-[10px] font-semibold text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity">Delete</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
