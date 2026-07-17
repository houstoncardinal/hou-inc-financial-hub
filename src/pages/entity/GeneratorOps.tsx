/* ── Houston Generator Pros · Generator Operations dashboard ─────────────────
   Entity-custom overview replacing the construction dashboard when HGP is the
   selected entity: equipment inventory with unit COGS/margin, model-level
   margin intelligence, maintenance/service agreements with recurring revenue
   and visit scheduling, warranty lifecycle, and revenue split from the shared
   transactions ledger. ── */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useTransactions } from '@/hooks/useFinance';
import {
  useEquipmentUnits, useServiceAgreements, useServiceVisits, useHgpFinanceSummary,
  useEntityOpsUpsert, useEntityOpsSoftDelete, useEntityOpsRealtime,
} from '@/hooks/useEntityOps';
import { fmtDate, fmtUSD } from '@/lib/format';
import { toast } from 'sonner';
import {
  Zap, Package, Wrench, CalendarClock, ShieldCheck, TrendingUp,
  Plus, Pencil, Trash2, AlertTriangle, PhoneCall, BookOpen,
} from 'lucide-react';

const HGP_BLUE = '#1B72B5';

const OPS_CSS = `
.hgp-shell{background:linear-gradient(180deg,rgba(27,114,181,0.05),transparent 180px);}
.hgp-panel{background:hsl(var(--background));border:1px solid hsl(var(--border));box-shadow:0 1px 3px rgba(10,10,10,.05),0 1px 0 rgba(255,255,255,.45) inset;}
.hgp-card{background:hsl(var(--background));border:1px solid hsl(var(--border));box-shadow:0 1px 3px rgba(10,10,10,.045);position:relative;overflow:hidden;}
.hgp-card:before{content:"";position:absolute;inset:0 0 auto 0;height:2px;background:var(--accent,#1B72B5);}
.hgp-k{font-size:8px;text-transform:uppercase;letter-spacing:.18em;font-weight:900;color:hsl(var(--muted-foreground));white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.hgp-v{font-size:17px;line-height:1.05;font-weight:900;margin-top:5px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.hgp-sub{font-size:10px;color:hsl(var(--muted-foreground));margin-top:5px;line-height:1.25;}
.hgp-row{border-bottom:1px solid hsl(var(--border));padding:9px 12px;font-size:12px;}
.hgp-row:hover{background:hsl(var(--secondary)/.35);}
.hgp-primary{height:32px;background:hsl(var(--foreground));color:hsl(var(--background));padding:0 12px;font-size:9px;text-transform:uppercase;letter-spacing:.14em;font-weight:900;display:inline-flex;align-items:center;justify-content:center;gap:6px;}
.hgp-action{height:28px;border:1px solid hsl(var(--border));background:hsl(var(--background));padding:0 8px;font-size:8.5px;text-transform:uppercase;letter-spacing:.12em;font-weight:900;display:inline-flex;align-items:center;gap:5px;}
.hgp-action:hover{background:hsl(var(--secondary)/.55);}
.hgp-field{height:38px;border-radius:0;font-size:12px;}
.dark .hgp-panel,.dark .hgp-card,.dark .hgp-action{background:hsl(var(--card));box-shadow:0 1px 4px rgba(0,0,0,.28),0 1px 0 rgba(255,255,255,.05) inset;}
@media(max-width:767px){.hgp-v{font-size:14px}.hgp-panel{padding:12px!important}}
`;

const UNIT_STATUS: Record<string, { label: string; color: string }> = {
  in_stock:     { label: 'In Stock',     color: '#0891b2' },
  reserved:     { label: 'Reserved',     color: '#d97706' },
  installed:    { label: 'Installed',    color: '#059669' },
  service_only: { label: 'Service Only', color: '#7c3aed' },
  returned:     { label: 'Returned',     color: '#8A8580' },
};

const AGREEMENT_STATUS: Record<string, { label: string; color: string }> = {
  active:    { label: 'Active',    color: '#059669' },
  paused:    { label: 'Paused',    color: '#d97706' },
  cancelled: { label: 'Cancelled', color: '#8A8580' },
  expired:   { label: 'Expired',   color: '#dc2626' },
};

const num = (v: unknown) => Number(v || 0);
const daysUntil = (d: string | null | undefined) =>
  d ? Math.ceil((new Date(d + 'T12:00:00').getTime() - Date.now()) / 86400000) : null;

function Metric({ label, value, sub, icon: Icon, color = HGP_BLUE }: any) {
  return (
    <div className="hgp-card p-3 min-w-0" style={{ '--accent': color } as any}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="hgp-k">{label}</div>
          <div className="hgp-v">{value}</div>
          <div className="hgp-sub">{sub}</div>
        </div>
        <div className="w-8 h-8 border border-border bg-secondary/35 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4" style={{ color }} strokeWidth={1.7} />
        </div>
      </div>
    </div>
  );
}

function StatusPill({ meta }: { meta: { label: string; color: string } }) {
  return (
    <span className="inline-flex px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.16em] whitespace-nowrap"
      style={{ backgroundColor: meta.color + '16', color: meta.color }}>
      {meta.label}
    </span>
  );
}

const VISIT_TYPES: Record<string, { label: string; color: string }> = {
  scheduled:  { label: 'Scheduled',  color: '#059669' },
  emergency:  { label: 'Emergency',  color: '#dc2626' },
  repair:     { label: 'Repair',     color: '#d97706' },
  warranty:   { label: 'Warranty',   color: '#7c3aed' },
  inspection: { label: 'Inspection', color: '#0891b2' },
};

const BLANK_UNIT = {
  id: '', model: '', serial_number: '', kw_rating: '', fuel_type: 'natural_gas',
  status: 'in_stock', unit_cost: '', sale_price: '', customer_name: '',
  purchase_date: '', install_date: '', warranty_end: '', permit_number: '', notes: '',
  deposit_amount: '', install_labor_cost: '', inspection_status: '',
};

const BLANK_VISIT = {
  id: '', agreement_id: '', customer_name: '', visit_date: new Date().toISOString().slice(0, 10),
  visit_type: 'scheduled', technician: '', labor_hours: '', revenue: '', cost: '', summary: '',
};

const BLANK_AGREEMENT = {
  id: '', customer_name: '', customer_email: '', plan: 'annual', status: 'active',
  annual_value: '', visits_per_year: '2', emergency_coverage: false,
  start_date: '', next_visit_date: '', notes: '',
};

export default function GeneratorOps() {
  const { user } = useAuth();
  useEntityOpsRealtime();

  const { data: units = [], isLoading: unitsLoading } = useEquipmentUnits();
  const { data: agreements = [], isLoading: agreementsLoading } = useServiceAgreements();
  const { data: visits = [] } = useServiceVisits();
  const { data: rpcSummary } = useHgpFinanceSummary();
  const { data: income = [] } = useTransactions('income');
  const { data: expenses = [] } = useTransactions('expense');

  const upsertUnit = useEntityOpsUpsert('hgp_equipment_units');
  const deleteUnit = useEntityOpsSoftDelete('hgp_equipment_units');
  const upsertAgreement = useEntityOpsUpsert('hgp_service_agreements');
  const deleteAgreement = useEntityOpsSoftDelete('hgp_service_agreements');
  const upsertVisit = useEntityOpsUpsert('hgp_service_visits');
  const deleteVisit = useEntityOpsSoftDelete('hgp_service_visits');

  const [unitDialog, setUnitDialog] = useState(false);
  const [unitForm, setUnitForm] = useState({ ...BLANK_UNIT });
  const [agreementDialog, setAgreementDialog] = useState(false);
  const [agreementForm, setAgreementForm] = useState({ ...BLANK_AGREEMENT });
  const [visitDialog, setVisitDialog] = useState(false);
  const [visitForm, setVisitForm] = useState({ ...BLANK_VISIT });

  const stats = useMemo(() => {
    const live = units as any[];
    const onHand = live.filter(u => u.status === 'in_stock' || u.status === 'reserved');
    const installed = live.filter(u => u.status === 'installed');
    const inventoryValue = onHand.reduce((s, u) => s + num(u.unit_cost), 0);
    const depositsHeld = onHand.reduce((s, u) => s + num(u.deposit_amount), 0);
    const sold = installed.filter(u => num(u.sale_price) > 0);
    const soldRevenue = sold.reduce((s, u) => s + num(u.sale_price), 0);
    // True job COGS: equipment cost + install labor, not equipment alone.
    const soldCogs = sold.reduce((s, u) => s + num(u.unit_cost) + num(u.install_labor_cost), 0);
    const avgMarginPct = soldRevenue > 0 ? ((soldRevenue - soldCogs) / soldRevenue) * 100 : 0;

    const active = (agreements as any[]).filter(a => a.status === 'active');
    const arr = active.reduce((s, a) => s + num(a.annual_value), 0);
    const upcoming = active.filter(a => {
      const d = daysUntil(a.next_visit_date);
      return d !== null && d >= 0 && d <= 30;
    });
    const overdueVisits = active.filter(a => {
      const d = daysUntil(a.next_visit_date);
      return d !== null && d < 0;
    });
    const warrantyExpiring = installed.filter(u => {
      const d = daysUntil(u.warranty_end);
      return d !== null && d >= 0 && d <= 90;
    });

    /* Prefer the server-side rollup (get_hgp_finance_summary, migration
       20260717000001); fall back to client-side math over the fetched
       transactions when the RPC isn't deployed yet. */
    const isService = (t: any) => /service|maintenance|plan/i.test(t.category ?? '');
    const isEmergency = (t: any) => /emergency|after.?hours/i.test(`${t.category ?? ''} ${t.description ?? ''}`);
    const totalIncome = rpcSummary?.totalIncome
      ?? (income as any[]).filter(t => (t.status ?? '') !== 'voided')
        .reduce((s, t) => s + num(t.total_amount ?? t.amount), 0);
    const totalExpense = rpcSummary?.totalExpense
      ?? (expenses as any[]).filter(t => (t.status ?? '') !== 'voided')
        .reduce((s, t) => s + num(t.total_amount ?? t.amount), 0);
    const serviceRevenue = rpcSummary?.serviceRevenue
      ?? (income as any[]).filter(t => (t.status ?? '') !== 'voided' && isService(t))
        .reduce((s, t) => s + num(t.total_amount ?? t.amount), 0);
    const emergencyRevenue = rpcSummary?.emergencyRevenue
      ?? (income as any[]).filter(t => (t.status ?? '') !== 'voided' && isEmergency(t))
        .reduce((s, t) => s + num(t.total_amount ?? t.amount), 0);

    return {
      onHandCount: onHand.length, installedCount: installed.length, inventoryValue, depositsHeld,
      soldRevenue, soldCogs, avgMarginPct, activeCount: active.length, arr,
      upcoming, overdueVisits, warrantyExpiring,
      totalIncome, totalExpense, serviceRevenue, emergencyRevenue,
    };
  }, [units, agreements, income, expenses, rpcSummary]);

  const marginByModel = useMemo(() => {
    const groups: Record<string, { model: string; count: number; cost: number; revenue: number }> = {};
    for (const u of units as any[]) {
      if (u.status !== 'installed' || num(u.sale_price) <= 0) continue;
      const g = groups[u.model] ?? (groups[u.model] = { model: u.model, count: 0, cost: 0, revenue: 0 });
      g.count += 1;
      g.cost += num(u.unit_cost) + num(u.install_labor_cost);
      g.revenue += num(u.sale_price);
    }
    return Object.values(groups)
      .map(g => ({ ...g, margin: g.revenue - g.cost, marginPct: g.revenue > 0 ? ((g.revenue - g.cost) / g.revenue) * 100 : 0 }))
      .sort((a, b) => b.margin - a.margin);
  }, [units]);

  const openUnit = (u?: any) => {
    setUnitForm(u ? {
      id: u.id, model: u.model ?? '', serial_number: u.serial_number ?? '',
      kw_rating: u.kw_rating != null ? String(u.kw_rating) : '', fuel_type: u.fuel_type ?? 'natural_gas',
      status: u.status ?? 'in_stock', unit_cost: u.unit_cost != null ? String(u.unit_cost) : '',
      sale_price: u.sale_price != null ? String(u.sale_price) : '', customer_name: u.customer_name ?? '',
      purchase_date: u.purchase_date ?? '', install_date: u.install_date ?? '',
      warranty_end: u.warranty_end ?? '', permit_number: u.permit_number ?? '', notes: u.notes ?? '',
      deposit_amount: u.deposit_amount != null && num(u.deposit_amount) !== 0 ? String(u.deposit_amount) : '',
      install_labor_cost: u.install_labor_cost != null && num(u.install_labor_cost) !== 0 ? String(u.install_labor_cost) : '',
      inspection_status: u.inspection_status ?? '',
    } : { ...BLANK_UNIT });
    setUnitDialog(true);
  };

  const saveUnit = async () => {
    if (!user?.id) return toast.error('Sign in required');
    if (!unitForm.model.trim()) return toast.error('Generator model is required');
    const row: any = {
      ...(unitForm.id ? { id: unitForm.id } : {}),
      user_id: user.id,
      entity_id: 'houston-generator-pros',
      model: unitForm.model.trim(),
      serial_number: unitForm.serial_number.trim() || null,
      kw_rating: unitForm.kw_rating ? Number(unitForm.kw_rating) : null,
      fuel_type: unitForm.fuel_type,
      status: unitForm.status,
      unit_cost: Number(unitForm.unit_cost) || 0,
      sale_price: unitForm.sale_price ? Number(unitForm.sale_price) : null,
      customer_name: unitForm.customer_name.trim() || null,
      purchase_date: unitForm.purchase_date || null,
      install_date: unitForm.install_date || null,
      warranty_end: unitForm.warranty_end || null,
      permit_number: unitForm.permit_number.trim() || null,
      notes: unitForm.notes.trim() || null,
      deposit_amount: Number(unitForm.deposit_amount) || 0,
      install_labor_cost: Number(unitForm.install_labor_cost) || 0,
      inspection_status: unitForm.inspection_status.trim() || null,
    };
    try {
      await upsertUnit.mutateAsync(row);
      toast.success(unitForm.id ? 'Unit updated' : 'Unit added to inventory');
      setUnitDialog(false);
    } catch (e: any) { toast.error(e.message); }
  };

  const openVisit = (presetAgreement?: any) => {
    setVisitForm({
      ...BLANK_VISIT,
      agreement_id: presetAgreement?.id ?? '',
      customer_name: presetAgreement?.customer_name ?? '',
    });
    setVisitDialog(true);
  };

  const saveVisit = async () => {
    if (!user?.id) return toast.error('Sign in required');
    if (!visitForm.customer_name.trim()) return toast.error('Customer name is required');
    const row: any = {
      ...(visitForm.id ? { id: visitForm.id } : {}),
      user_id: user.id,
      entity_id: 'houston-generator-pros',
      agreement_id: visitForm.agreement_id || null,
      customer_name: visitForm.customer_name.trim(),
      visit_date: visitForm.visit_date,
      visit_type: visitForm.visit_type,
      technician: visitForm.technician.trim() || null,
      labor_hours: Number(visitForm.labor_hours) || 0,
      revenue: Number(visitForm.revenue) || 0,
      cost: Number(visitForm.cost) || 0,
      summary: visitForm.summary.trim() || null,
    };
    try {
      await upsertVisit.mutateAsync(row);
      toast.success(Number(visitForm.revenue) > 0 ? 'Visit logged — income posted to the ledger' : 'Visit logged');
      setVisitDialog(false);
    } catch (e: any) { toast.error(e.message); }
  };

  const openAgreement = (a?: any) => {
    setAgreementForm(a ? {
      id: a.id, customer_name: a.customer_name ?? '', customer_email: a.customer_email ?? '',
      plan: a.plan ?? 'annual', status: a.status ?? 'active',
      annual_value: a.annual_value != null ? String(a.annual_value) : '',
      visits_per_year: String(a.visits_per_year ?? 2), emergency_coverage: !!a.emergency_coverage,
      start_date: a.start_date ?? '', next_visit_date: a.next_visit_date ?? '', notes: a.notes ?? '',
    } : { ...BLANK_AGREEMENT });
    setAgreementDialog(true);
  };

  const saveAgreement = async () => {
    if (!user?.id) return toast.error('Sign in required');
    if (!agreementForm.customer_name.trim()) return toast.error('Customer name is required');
    const row: any = {
      ...(agreementForm.id ? { id: agreementForm.id } : {}),
      user_id: user.id,
      entity_id: 'houston-generator-pros',
      customer_name: agreementForm.customer_name.trim(),
      customer_email: agreementForm.customer_email.trim() || null,
      plan: agreementForm.plan,
      status: agreementForm.status,
      annual_value: Number(agreementForm.annual_value) || 0,
      visits_per_year: Number(agreementForm.visits_per_year) || 2,
      emergency_coverage: agreementForm.emergency_coverage,
      start_date: agreementForm.start_date || null,
      next_visit_date: agreementForm.next_visit_date || null,
      notes: agreementForm.notes.trim() || null,
    };
    try {
      await upsertAgreement.mutateAsync(row);
      toast.success(agreementForm.id ? 'Agreement updated' : 'Service agreement created');
      setAgreementDialog(false);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <AppShell>
      <style>{OPS_CSS}</style>
      <PageHeader
        eyebrow="Houston Generator Pros"
        title="Generator Operations"
        description="Sales, inventory COGS, install margin, maintenance plans, and service revenue."
        actions={
          <div className="flex items-center gap-2">
            <button className="hgp-action" onClick={() => openVisit()}><CalendarClock className="w-3 h-3" /> Log Visit</button>
            <button className="hgp-action" onClick={() => openAgreement()}><Wrench className="w-3 h-3" /> New Plan</button>
            <button className="hgp-primary" onClick={() => openUnit()}><Plus className="w-3.5 h-3.5" /> Add Unit</button>
          </div>
        }
      />

      <div className="hgp-shell border-t border-border/50">
        <div className="px-4 sm:px-8 py-4 space-y-4">
          {/* ── KPI rail ── */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5">
            <Metric label="Revenue (Entity)" value={fmtUSD(stats.totalIncome)} sub={`${fmtUSD(stats.totalExpense)} costs recorded`} icon={TrendingUp} color="#059669" />
            <Metric label="Recurring Service" value={fmtUSD(stats.arr)} sub={`${stats.activeCount} active agreement${stats.activeCount === 1 ? '' : 's'} / yr`} icon={Wrench} />
            <Metric label="Inventory On Hand" value={String(stats.onHandCount)} sub={`${fmtUSD(stats.inventoryValue)} at cost · ${fmtUSD(stats.depositsHeld)} deposits held`} icon={Package} color="#7c3aed" />
            <Metric label="Install Margin" value={`${stats.avgMarginPct.toFixed(1)}%`} sub={`${fmtUSD(stats.soldRevenue - stats.soldCogs)} on ${stats.installedCount} installs`} icon={Zap} color="#d97706" />
          </div>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5">
            <Metric label="Service Revenue" value={fmtUSD(stats.serviceRevenue)} sub="Income tagged service / maintenance" icon={BookOpen} color="#0891b2" />
            <Metric label="Emergency Revenue" value={fmtUSD(stats.emergencyRevenue)} sub="After-hours & emergency calls" icon={PhoneCall} color="#dc2626" />
            <Metric label="Visits · Next 30d" value={String(stats.upcoming.length)} sub={stats.overdueVisits.length ? `${stats.overdueVisits.length} overdue — schedule now` : 'No overdue visits'} icon={CalendarClock} color={stats.overdueVisits.length ? '#dc2626' : '#059669'} />
            <Metric label="Warranty · 90d" value={String(stats.warrantyExpiring.length)} sub="Installed units nearing warranty end" icon={ShieldCheck} color="#9D7E3F" />
          </div>

          {/* ── Margin by model + upcoming visits ── */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_.85fr] gap-4">
            <section className="hgp-panel p-3 sm:p-4">
              <div className="hgp-k mb-2">Unit Margin by Model</div>
              <div className="overflow-x-auto">
                <div className="min-w-[520px]">
                  <div className="hgp-row grid grid-cols-[1.4fr_.5fr_.8fr_.8fr_.8fr_.6fr] gap-2 bg-secondary/45 hgp-k items-center">
                    <div>Model</div><div>Units</div><div>Revenue</div><div>COGS</div><div>Margin</div><div>%</div>
                  </div>
                  {marginByModel.map(m => (
                    <div key={m.model} className="hgp-row grid grid-cols-[1.4fr_.5fr_.8fr_.8fr_.8fr_.6fr] gap-2 items-center">
                      <div className="font-bold truncate">{m.model}</div>
                      <div className="font-mono-tab">{m.count}</div>
                      <div className="font-mono-tab">{fmtUSD(m.revenue)}</div>
                      <div className="font-mono-tab">{fmtUSD(m.cost)}</div>
                      <div className={`font-mono-tab font-bold ${m.margin >= 0 ? 'text-positive' : 'text-destructive'}`}>{fmtUSD(m.margin)}</div>
                      <div className="font-mono-tab">{m.marginPct.toFixed(1)}%</div>
                    </div>
                  ))}
                  {!marginByModel.length && (
                    <div className="py-8 text-center text-xs text-muted-foreground">
                      Mark units as installed with a sale price to see model-level margin.
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="hgp-panel p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="hgp-k">Maintenance Schedule</div>
                <Link to="/ledger" className="text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: HGP_BLUE }}>Open Ledger</Link>
              </div>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {[...stats.overdueVisits, ...stats.upcoming].map((a: any) => {
                  const d = daysUntil(a.next_visit_date);
                  const overdue = d !== null && d < 0;
                  return (
                    <div key={a.id} className="border border-border px-2.5 py-2 text-xs flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-bold truncate">{a.customer_name}</div>
                        <div className="text-[10px] text-muted-foreground">{fmtDate(a.next_visit_date)} · {a.plan.replace('_', '-')} plan</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[9px] font-black uppercase tracking-[0.12em] whitespace-nowrap ${overdue ? 'text-destructive' : 'text-positive'}`}>
                          {overdue ? `${Math.abs(d!)}d overdue` : d === 0 ? 'Today' : `in ${d}d`}
                        </span>
                        <button className="hgp-action" onClick={() => openVisit(a)} title="Log this visit as completed">Log</button>
                      </div>
                    </div>
                  );
                })}
                {!stats.overdueVisits.length && !stats.upcoming.length && (
                  <div className="text-xs text-muted-foreground border border-border p-3">No visits scheduled in the next 30 days.</div>
                )}
              </div>

              <div className="hgp-k mt-4 mb-2">Recent Service Calls</div>
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {(visits as any[]).slice(0, 10).map(v => {
                  const meta = VISIT_TYPES[v.visit_type] ?? VISIT_TYPES.scheduled;
                  return (
                    <div key={v.id} className="border border-border px-2.5 py-2 text-xs flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[8px] font-black uppercase tracking-[0.14em] px-1.5 py-0.5" style={{ backgroundColor: meta.color + '16', color: meta.color }}>
                            {meta.label}
                          </span>
                          <span className="font-bold truncate">{v.customer_name}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                          {fmtDate(v.visit_date)}{v.technician ? ` · ${v.technician}` : ''}{num(v.labor_hours) > 0 ? ` · ${num(v.labor_hours)}h` : ''}
                        </div>
                      </div>
                      {num(v.revenue) > 0 && (
                        <span className="font-mono-tab font-bold text-positive whitespace-nowrap">{fmtUSD(num(v.revenue))}</span>
                      )}
                      <button className="p-1 text-muted-foreground hover:text-destructive shrink-0" title="Remove visit (voids linked income)"
                        onClick={() => { if (confirm('Remove this visit? Linked income will be voided.')) deleteVisit.mutate(v.id, { onSuccess: () => toast.success('Visit removed, linked income voided') }); }}>
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
                {!(visits as any[]).length && (
                  <div className="text-xs text-muted-foreground border border-border p-3">
                    No service calls logged yet — visit revenue posts straight to the income ledger.
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* ── Equipment inventory ── */}
          <section className="hgp-panel p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div>
                <div className="hgp-k">Equipment Inventory</div>
                <h2 className="text-base font-bold mt-0.5">Generator Units</h2>
              </div>
              <button className="hgp-action" onClick={() => openUnit()}><Plus className="w-3 h-3" /> Add Unit</button>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[860px]">
                <div className="hgp-row grid grid-cols-[1.3fr_.9fr_.5fr_.7fr_.7fr_.7fr_.9fr_.9fr_.5fr] gap-2 bg-secondary/45 hgp-k items-center">
                  <div>Model</div><div>Serial</div><div>kW</div><div>Status</div><div>Cost</div><div>Price</div><div>Customer</div><div>Warranty</div><div></div>
                </div>
                {(units as any[]).map(u => {
                  const wd = daysUntil(u.warranty_end);
                  return (
                    <div key={u.id} className="hgp-row grid grid-cols-[1.3fr_.9fr_.5fr_.7fr_.7fr_.7fr_.9fr_.9fr_.5fr] gap-2 items-center">
                      <div className="font-bold truncate">{u.model}</div>
                      <div className="font-mono-tab text-[10px] truncate">{u.serial_number || '—'}</div>
                      <div className="font-mono-tab">{u.kw_rating ? Number(u.kw_rating) : '—'}</div>
                      <div><StatusPill meta={UNIT_STATUS[u.status] ?? UNIT_STATUS.in_stock} /></div>
                      <div className="font-mono-tab">{fmtUSD(num(u.unit_cost))}</div>
                      <div className="font-mono-tab">{u.sale_price != null ? fmtUSD(num(u.sale_price)) : '—'}</div>
                      <div className="truncate text-[11px]">{u.customer_name || '—'}</div>
                      <div className={`text-[10px] whitespace-nowrap ${wd !== null && wd <= 90 && wd >= 0 ? 'text-warning font-bold' : 'text-muted-foreground'}`}>
                        {u.warranty_end ? fmtDate(u.warranty_end) : '—'}
                      </div>
                      <div className="flex items-center gap-1 justify-end">
                        <button className="p-1 text-muted-foreground hover:text-foreground" onClick={() => openUnit(u)} title="Edit unit"><Pencil className="w-3 h-3" /></button>
                        <button className="p-1 text-muted-foreground hover:text-destructive" title="Remove unit"
                          onClick={() => { if (confirm('Remove this unit from inventory?')) deleteUnit.mutate(u.id, { onSuccess: () => toast.success('Unit removed') }); }}>
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {!unitsLoading && !(units as any[]).length && (
                  <div className="py-10 text-center text-xs text-muted-foreground">No generator units yet — add your first unit to start tracking inventory and COGS.</div>
                )}
              </div>
            </div>
          </section>

          {/* ── Service agreements ── */}
          <section className="hgp-panel p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div>
                <div className="hgp-k">Service Contracts</div>
                <h2 className="text-base font-bold mt-0.5">Maintenance Plans</h2>
              </div>
              <button className="hgp-action" onClick={() => openAgreement()}><Plus className="w-3 h-3" /> New Plan</button>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[760px]">
                <div className="hgp-row grid grid-cols-[1.3fr_.8fr_.7fr_.8fr_.6fr_.9fr_.7fr_.5fr] gap-2 bg-secondary/45 hgp-k items-center">
                  <div>Customer</div><div>Plan</div><div>Status</div><div>Annual Value</div><div>Visits/yr</div><div>Next Visit</div><div>Emergency</div><div></div>
                </div>
                {(agreements as any[]).map(a => (
                  <div key={a.id} className="hgp-row grid grid-cols-[1.3fr_.8fr_.7fr_.8fr_.6fr_.9fr_.7fr_.5fr] gap-2 items-center">
                    <div className="font-bold truncate">{a.customer_name}</div>
                    <div className="capitalize text-[11px]">{String(a.plan).replace('_', '-')}</div>
                    <div><StatusPill meta={AGREEMENT_STATUS[a.status] ?? AGREEMENT_STATUS.active} /></div>
                    <div className="font-mono-tab font-bold">{fmtUSD(num(a.annual_value))}</div>
                    <div className="font-mono-tab">{a.visits_per_year}</div>
                    <div className="text-[11px] whitespace-nowrap">{a.next_visit_date ? fmtDate(a.next_visit_date) : '—'}</div>
                    <div>{a.emergency_coverage
                      ? <span className="text-[9px] font-black uppercase text-positive">24/7</span>
                      : <span className="text-[9px] text-muted-foreground">—</span>}</div>
                    <div className="flex items-center gap-1 justify-end">
                      <button className="p-1 text-muted-foreground hover:text-foreground" onClick={() => openAgreement(a)} title="Edit plan"><Pencil className="w-3 h-3" /></button>
                      <button className="p-1 text-muted-foreground hover:text-destructive" title="Remove plan"
                        onClick={() => { if (confirm('Remove this service agreement?')) deleteAgreement.mutate(a.id, { onSuccess: () => toast.success('Agreement removed') }); }}>
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
                {!agreementsLoading && !(agreements as any[]).length && (
                  <div className="py-10 text-center text-xs text-muted-foreground">No maintenance plans yet — recurring service revenue starts here.</div>
                )}
              </div>
            </div>
          </section>

          {/* ── Bookkeeping guidance ── */}
          <section className="hgp-panel p-3 sm:p-4">
            <div className="hgp-k mb-2">Revenue Tagging</div>
            <div className="flex items-start gap-2 text-[11px] text-muted-foreground leading-relaxed">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: HGP_BLUE }} />
              <span>
                Log generator income under <Link to="/income" className="font-bold" style={{ color: HGP_BLUE }}>Income</Link> with
                categories containing <b>Service</b>/<b>Maintenance</b> for plan revenue and <b>Emergency</b> for after-hours
                calls — the split above reads those tags. Equipment purchases logged under Expenses with the supplier vendor
                keep entity COGS aligned with unit costs recorded here.
              </span>
            </div>
          </section>
        </div>
      </div>

      {/* ── Unit dialog ── */}
      <Dialog open={unitDialog} onOpenChange={setUnitDialog}>
        <DialogContent className="max-w-lg rounded-none max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-base">{unitForm.id ? 'Edit Generator Unit' : 'Add Generator Unit'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="col-span-2">
              <div className="hgp-k mb-1">Model *</div>
              <Input className="hgp-field" placeholder="e.g. Generac Guardian 24kW" value={unitForm.model} onChange={e => setUnitForm(f => ({ ...f, model: e.target.value }))} />
            </div>
            <div>
              <div className="hgp-k mb-1">Serial Number</div>
              <Input className="hgp-field font-mono-tab" value={unitForm.serial_number} onChange={e => setUnitForm(f => ({ ...f, serial_number: e.target.value }))} />
            </div>
            <div>
              <div className="hgp-k mb-1">kW Rating</div>
              <Input className="hgp-field" type="number" inputMode="decimal" value={unitForm.kw_rating} onChange={e => setUnitForm(f => ({ ...f, kw_rating: e.target.value }))} />
            </div>
            <div>
              <div className="hgp-k mb-1">Fuel</div>
              <Select value={unitForm.fuel_type} onValueChange={v => setUnitForm(f => ({ ...f, fuel_type: v }))}>
                <SelectTrigger className="hgp-field"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="natural_gas">Natural Gas</SelectItem>
                  <SelectItem value="propane">Propane</SelectItem>
                  <SelectItem value="diesel">Diesel</SelectItem>
                  <SelectItem value="bi_fuel">Bi-Fuel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="hgp-k mb-1">Status</div>
              <Select value={unitForm.status} onValueChange={v => setUnitForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="hgp-field"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(UNIT_STATUS).map(([k, m]) => <SelectItem key={k} value={k}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="hgp-k mb-1">Unit Cost (COGS)</div>
              <Input className="hgp-field" type="number" inputMode="decimal" value={unitForm.unit_cost} onChange={e => setUnitForm(f => ({ ...f, unit_cost: e.target.value }))} />
            </div>
            <div>
              <div className="hgp-k mb-1">Sale Price</div>
              <Input className="hgp-field" type="number" inputMode="decimal" value={unitForm.sale_price} onChange={e => setUnitForm(f => ({ ...f, sale_price: e.target.value }))} />
            </div>
            <div>
              <div className="hgp-k mb-1">Install Labor Cost</div>
              <Input className="hgp-field" type="number" inputMode="decimal" value={unitForm.install_labor_cost} onChange={e => setUnitForm(f => ({ ...f, install_labor_cost: e.target.value }))} />
            </div>
            <div>
              <div className="hgp-k mb-1">Deposit Received</div>
              <Input className="hgp-field" type="number" inputMode="decimal" value={unitForm.deposit_amount} onChange={e => setUnitForm(f => ({ ...f, deposit_amount: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <div className="hgp-k mb-1">Customer</div>
              <Input className="hgp-field" value={unitForm.customer_name} onChange={e => setUnitForm(f => ({ ...f, customer_name: e.target.value }))} />
            </div>
            <div>
              <div className="hgp-k mb-1">Purchase Date</div>
              <Input className="hgp-field" type="date" value={unitForm.purchase_date} onChange={e => setUnitForm(f => ({ ...f, purchase_date: e.target.value }))} />
            </div>
            <div>
              <div className="hgp-k mb-1">Install Date</div>
              <Input className="hgp-field" type="date" value={unitForm.install_date} onChange={e => setUnitForm(f => ({ ...f, install_date: e.target.value }))} />
            </div>
            <div>
              <div className="hgp-k mb-1">Warranty End</div>
              <Input className="hgp-field" type="date" value={unitForm.warranty_end} onChange={e => setUnitForm(f => ({ ...f, warranty_end: e.target.value }))} />
            </div>
            <div>
              <div className="hgp-k mb-1">Permit #</div>
              <Input className="hgp-field" value={unitForm.permit_number} onChange={e => setUnitForm(f => ({ ...f, permit_number: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <div className="hgp-k mb-1">Inspection Status</div>
              <Input className="hgp-field" placeholder="e.g. Passed final 6/12, awaiting city sign-off…" value={unitForm.inspection_status} onChange={e => setUnitForm(f => ({ ...f, inspection_status: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <div className="hgp-k mb-1">Notes</div>
              <Textarea className="rounded-none text-xs" rows={2} value={unitForm.notes} onChange={e => setUnitForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <button className="hgp-primary w-full mt-2" onClick={saveUnit} disabled={upsertUnit.isPending}>
            {unitForm.id ? 'Save Unit' : 'Add to Inventory'}
          </button>
        </DialogContent>
      </Dialog>

      {/* ── Agreement dialog ── */}
      <Dialog open={agreementDialog} onOpenChange={setAgreementDialog}>
        <DialogContent className="max-w-lg rounded-none max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-base">{agreementForm.id ? 'Edit Maintenance Plan' : 'New Maintenance Plan'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="col-span-2">
              <div className="hgp-k mb-1">Customer *</div>
              <Input className="hgp-field" value={agreementForm.customer_name} onChange={e => setAgreementForm(f => ({ ...f, customer_name: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <div className="hgp-k mb-1">Customer Email</div>
              <Input className="hgp-field" type="email" value={agreementForm.customer_email} onChange={e => setAgreementForm(f => ({ ...f, customer_email: e.target.value }))} />
            </div>
            <div>
              <div className="hgp-k mb-1">Plan</div>
              <Select value={agreementForm.plan} onValueChange={v => setAgreementForm(f => ({ ...f, plan: v }))}>
                <SelectTrigger className="hgp-field"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="semi_annual">Semi-Annual</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="hgp-k mb-1">Status</div>
              <Select value={agreementForm.status} onValueChange={v => setAgreementForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="hgp-field"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(AGREEMENT_STATUS).map(([k, m]) => <SelectItem key={k} value={k}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="hgp-k mb-1">Annual Value</div>
              <Input className="hgp-field" type="number" inputMode="decimal" value={agreementForm.annual_value} onChange={e => setAgreementForm(f => ({ ...f, annual_value: e.target.value }))} />
            </div>
            <div>
              <div className="hgp-k mb-1">Visits / Year</div>
              <Input className="hgp-field" type="number" inputMode="numeric" value={agreementForm.visits_per_year} onChange={e => setAgreementForm(f => ({ ...f, visits_per_year: e.target.value }))} />
            </div>
            <div>
              <div className="hgp-k mb-1">Start Date</div>
              <Input className="hgp-field" type="date" value={agreementForm.start_date} onChange={e => setAgreementForm(f => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div>
              <div className="hgp-k mb-1">Next Visit</div>
              <Input className="hgp-field" type="date" value={agreementForm.next_visit_date} onChange={e => setAgreementForm(f => ({ ...f, next_visit_date: e.target.value }))} />
            </div>
            <label className="col-span-2 flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
              <input type="checkbox" className="w-4 h-4" checked={agreementForm.emergency_coverage}
                onChange={e => setAgreementForm(f => ({ ...f, emergency_coverage: e.target.checked }))} />
              Includes 24/7 emergency coverage
            </label>
            <div className="col-span-2">
              <div className="hgp-k mb-1">Notes</div>
              <Textarea className="rounded-none text-xs" rows={2} value={agreementForm.notes} onChange={e => setAgreementForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <button className="hgp-primary w-full mt-2" onClick={saveAgreement} disabled={upsertAgreement.isPending}>
            {agreementForm.id ? 'Save Plan' : 'Create Plan'}
          </button>
        </DialogContent>
      </Dialog>

      {/* ── Service visit dialog ── */}
      <Dialog open={visitDialog} onOpenChange={setVisitDialog}>
        <DialogContent className="max-w-lg rounded-none max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-base">Log Service Visit</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="col-span-2">
              <div className="hgp-k mb-1">Maintenance Plan (optional)</div>
              <Select value={visitForm.agreement_id || '__none__'}
                onValueChange={v => {
                  const a = (agreements as any[]).find(x => x.id === v);
                  setVisitForm(f => ({
                    ...f,
                    agreement_id: v === '__none__' ? '' : v,
                    customer_name: a ? a.customer_name : f.customer_name,
                  }));
                }}>
                <SelectTrigger className="hgp-field"><SelectValue placeholder="One-off service call" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">One-off service call</SelectItem>
                  {(agreements as any[]).filter(a => a.status === 'active').map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.customer_name} — {String(a.plan).replace('_', '-')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <div className="hgp-k mb-1">Customer *</div>
              <Input className="hgp-field" value={visitForm.customer_name} onChange={e => setVisitForm(f => ({ ...f, customer_name: e.target.value }))} />
            </div>
            <div>
              <div className="hgp-k mb-1">Visit Date</div>
              <Input className="hgp-field" type="date" value={visitForm.visit_date} onChange={e => setVisitForm(f => ({ ...f, visit_date: e.target.value }))} />
            </div>
            <div>
              <div className="hgp-k mb-1">Type</div>
              <Select value={visitForm.visit_type} onValueChange={v => setVisitForm(f => ({ ...f, visit_type: v }))}>
                <SelectTrigger className="hgp-field"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(VISIT_TYPES).map(([k, m]) => <SelectItem key={k} value={k}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="hgp-k mb-1">Technician</div>
              <Input className="hgp-field" value={visitForm.technician} onChange={e => setVisitForm(f => ({ ...f, technician: e.target.value }))} />
            </div>
            <div>
              <div className="hgp-k mb-1">Labor Hours</div>
              <Input className="hgp-field" type="number" inputMode="decimal" value={visitForm.labor_hours} onChange={e => setVisitForm(f => ({ ...f, labor_hours: e.target.value }))} />
            </div>
            <div>
              <div className="hgp-k mb-1">Revenue Billed</div>
              <Input className="hgp-field" type="number" inputMode="decimal" value={visitForm.revenue} onChange={e => setVisitForm(f => ({ ...f, revenue: e.target.value }))} />
            </div>
            <div>
              <div className="hgp-k mb-1">Visit Cost</div>
              <Input className="hgp-field" type="number" inputMode="decimal" value={visitForm.cost} onChange={e => setVisitForm(f => ({ ...f, cost: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <div className="hgp-k mb-1">Summary</div>
              <Textarea className="rounded-none text-xs" rows={2} placeholder="Work performed, parts used…" value={visitForm.summary} onChange={e => setVisitForm(f => ({ ...f, summary: e.target.value }))} />
            </div>
            <div className="col-span-2 text-[10px] text-muted-foreground leading-relaxed">
              Revenue entered here posts automatically to the income ledger
              (category {visitForm.visit_type === 'emergency' ? '"Emergency Service"' : '"Service Maintenance"'}) and updates the plan's last-visit date.
            </div>
          </div>
          <button className="hgp-primary w-full mt-2" onClick={saveVisit} disabled={upsertVisit.isPending}>
            Log Visit
          </button>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
