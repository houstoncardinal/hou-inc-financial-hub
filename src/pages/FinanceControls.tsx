import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth, ROLE_LABELS, type AppRole } from '@/hooks/useAuth';
import { useEntity } from '@/contexts/EntityContext';
import {
  useBankMatchSuggestions,
  useFinanceAgingSummary,
  useFinanceCommitments,
  useFinanceControlSummary,
  useProjects,
  useVendors,
} from '@/hooks/useFinance';
import { supabase } from '@/integrations/supabase/client';
import { fmtDate, fmtUSD, todayLocalDate } from '@/lib/format';
import { toast } from 'sonner';
import {
  BadgeDollarSign,
  Banknote,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  FileSpreadsheet,
  Landmark,
  ShieldCheck,
  TrendingUp,
  Upload,
  Users,
} from 'lucide-react';

const ROLES: AppRole[] = ['admin', 'finance_manager', 'finance', 'project_manager', 'read_only_auditor', 'viewer', 'client'];

const CONTROL_CSS = `
.fc-shell{background:linear-gradient(180deg,hsl(var(--secondary)/0.2),transparent 180px);}
.fc-panel{background:hsl(var(--background));border:1px solid hsl(var(--border));box-shadow:0 1px 3px rgba(10,10,10,.05),0 1px 0 rgba(255,255,255,.45) inset;}
.fc-card{background:hsl(var(--background));border:1px solid hsl(var(--border));box-shadow:0 1px 3px rgba(10,10,10,.045);position:relative;overflow:hidden;}
.fc-card:before{content:"";position:absolute;inset:0 0 auto 0;height:2px;background:var(--accent,#9D7E3F);}
.fc-k{font-size:8px;text-transform:uppercase;letter-spacing:.18em;font-weight:900;color:hsl(var(--muted-foreground));white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.fc-v{font-size:18px;line-height:1.05;font-weight:900;margin-top:5px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.fc-sub{font-size:10px;color:hsl(var(--muted-foreground));margin-top:5px;line-height:1.25;}
.fc-table{min-width:980px;display:grid;grid-template-columns:1.4fr .8fr .8fr .8fr .8fr .8fr .8fr .8fr;gap:10px;align-items:center;}
.fc-row{border-bottom:1px solid hsl(var(--border));padding:10px 12px;font-size:12px;}
.fc-row:hover{background:hsl(var(--secondary)/.35);}
.fc-mobile-control{border:1px solid hsl(var(--border));background:hsl(var(--background));box-shadow:0 1px 3px rgba(10,10,10,.045);padding:11px;min-width:0;}
.fc-mobile-stat{border:1px solid hsl(var(--border));background:hsl(var(--secondary)/.24);padding:8px;min-width:0;}
.fc-action{height:34px;border:1px solid hsl(var(--border));background:hsl(var(--background));padding:0 10px;font-size:9px;text-transform:uppercase;letter-spacing:.14em;font-weight:900;display:inline-flex;align-items:center;justify-content:center;gap:6px;}
.fc-action:hover{background:hsl(var(--secondary)/.55);border-color:hsl(var(--foreground)/.2);}
.fc-primary{height:34px;background:hsl(var(--foreground));color:hsl(var(--background));padding:0 12px;font-size:9px;text-transform:uppercase;letter-spacing:.14em;font-weight:900;display:inline-flex;align-items:center;justify-content:center;gap:6px;}
.fc-field{height:38px;border-radius:0;font-size:12px;}
.dark .fc-panel,.dark .fc-card,.dark .fc-mobile-control,.dark .fc-action{background:hsl(var(--card));box-shadow:0 1px 4px rgba(0,0,0,.28),0 1px 0 rgba(255,255,255,.05) inset;}
@media(max-width:767px){.fc-v{font-size:15px}.fc-panel{padding:12px!important}.fc-card{padding:10px!important}}
`;

const num = (v: unknown) => Number(v || 0);

function Metric({ label, value, sub, icon: Icon, color = '#9D7E3F' }: any) {
  return (
    <div className="fc-card p-3 min-w-0" style={{ '--accent': color } as any}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="fc-k">{label}</div>
          <div className="fc-v">{value}</div>
          <div className="fc-sub">{sub}</div>
        </div>
        <div className="w-8 h-8 border border-border bg-secondary/35 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4" style={{ color }} strokeWidth={1.7} />
        </div>
      </div>
    </div>
  );
}

function parseBankCsv(text: string) {
  return text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => line.split(',').map(cell => cell.trim().replace(/^"|"$/g, '')))
    .filter(cols => cols.length >= 3)
    .map(([activity_date, amount, description, reference, counterparty]) => ({
      activity_date,
      amount: Number(String(amount).replace(/[$,]/g, '')),
      description: description || null,
      reference: reference || null,
      counterparty: counterparty || description || null,
    }))
    .filter(row => row.activity_date && Number.isFinite(row.amount));
}

export default function FinanceControls() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { entity } = useEntity();
  const entityId = entity?.id ?? 'houston-enterprise';
  const { data: controls = [] } = useFinanceControlSummary();
  const { data: aging = [] } = useFinanceAgingSummary();
  const { data: commitments = [] } = useFinanceCommitments();
  const { data: suggestions = [] } = useBankMatchSuggestions();
  const { data: projects = [] } = useProjects();
  const { data: vendors = [] } = useVendors();
  const { data: roles = [] } = useQuery({
    queryKey: ['app-user-roles', entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_user_roles' as any)
        .select('*')
        .eq('entity_id', entityId)
        .order('assigned_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const [commitment, setCommitment] = useState({
    project_id: '', vendor_id: '', title: '', commitment_number: '', commitment_type: 'subcontract',
    original_amount: '', approved_change_amount: '', retainage_percent: '', notes: '',
  });
  const [roleForm, setRoleForm] = useState({ user_id: '', role: 'viewer' as AppRole, notes: '' });
  const [bankCsv, setBankCsv] = useState('');

  const totals = useMemo(() => {
    const budget = controls.reduce((s: number, r: any) => s + num(r.revised_contract_value), 0);
    const earned = controls.reduce((s: number, r: any) => s + num(r.earned_revenue), 0);
    const cost = controls.reduce((s: number, r: any) => s + num(r.actual_cost), 0);
    const pendingCo = controls.reduce((s: number, r: any) => s + num(r.pending_change_orders), 0);
    const ar = controls.reduce((s: number, r: any) => s + num(r.ar_open), 0);
    const apRetainage = controls.reduce((s: number, r: any) => s + num(r.ap_retainage_held), 0);
    const arRetainage = controls.reduce((s: number, r: any) => s + num(r.ar_retainage_held), 0);
    const committed = controls.reduce((s: number, r: any) => s + num(r.committed_cost), 0);
    return { budget, earned, cost, pendingCo, ar, arRetainage, apRetainage, committed, margin: earned - cost };
  }, [controls]);

  const agingMap = useMemo(() => {
    const out: Record<string, number> = {};
    (aging as any[]).forEach(row => { out[`${row.aging_type}:${row.bucket}`] = num(row.open_amount); });
    return out;
  }, [aging]);

  const createCommitment = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Sign in required');
      if (!commitment.title.trim()) throw new Error('Commitment title required');
      const original = num(commitment.original_amount);
      const pct = num(commitment.retainage_percent);
      const { error } = await supabase.from('finance_commitments' as any).insert({
        user_id: user.id,
        entity_id: entityId,
        project_id: commitment.project_id || null,
        vendor_id: commitment.vendor_id || null,
        title: commitment.title.trim(),
        commitment_number: commitment.commitment_number || null,
        commitment_type: commitment.commitment_type,
        original_amount: original,
        approved_change_amount: num(commitment.approved_change_amount),
        retainage_percent: pct,
        retainage_held: original * pct / 100,
        notes: commitment.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setCommitment({ project_id: '', vendor_id: '', title: '', commitment_number: '', commitment_type: 'subcontract', original_amount: '', approved_change_amount: '', retainage_percent: '', notes: '' });
      qc.invalidateQueries({ queryKey: ['finance-commitments'] });
      qc.invalidateQueries({ queryKey: ['finance-control-summary'] });
      toast.success('Commitment saved');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const assignRole = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Sign in required');
      if (!roleForm.user_id.trim()) throw new Error('User UUID required');
      const { error } = await supabase.from('app_user_roles' as any).upsert({
        user_id: roleForm.user_id.trim(),
        entity_id: entityId,
        role: roleForm.role,
        is_active: true,
        assigned_by: user.id,
        notes: roleForm.notes || null,
      }, { onConflict: 'user_id,entity_id,role' });
      if (error) throw error;
    },
    onSuccess: () => {
      setRoleForm({ user_id: '', role: 'viewer', notes: '' });
      qc.invalidateQueries({ queryKey: ['app-user-roles'] });
      toast.success('Role assignment saved');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const importBankRows = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Sign in required');
      const rows = parseBankCsv(bankCsv);
      if (!rows.length) throw new Error('Paste CSV rows as date, amount, description, reference, counterparty');
      const { data: imp, error: importError } = await supabase.from('finance_bank_imports' as any).insert({
        user_id: user.id,
        entity_id: entityId,
        file_name: `manual-import-${todayLocalDate()}.csv`,
        source: 'manual_csv',
        row_count: rows.length,
      }).select('*').single();
      if (importError) throw importError;
      const { data: activity, error: activityError } = await supabase.from('finance_bank_activity' as any).insert(rows.map(row => ({
        ...row,
        import_id: imp.id,
        user_id: user.id,
        entity_id: entityId,
      }))).select('id');
      if (activityError) throw activityError;
      for (const row of activity ?? []) await supabase.rpc('generate_bank_match_suggestions' as any, { p_bank_activity_id: row.id });
      return rows.length;
    },
    onSuccess: count => {
      setBankCsv('');
      qc.invalidateQueries({ queryKey: ['finance-bank-activity'] });
      qc.invalidateQueries({ queryKey: ['finance-bank-match-suggestions'] });
      toast.success(`Imported ${count} bank activity rows`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const acceptSuggestion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('accept_bank_match_suggestion' as any, { p_suggestion_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance-bank-match-suggestions'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['checks'] });
      qc.invalidateQueries({ queryKey: ['ledger-page'] });
      toast.success('Bank match accepted and reconciled');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const verifyMigrations = async () => {
    const { data, error } = await supabase.rpc('verify_finance_launch_migrations' as any);
    if (error) {
      toast.error(error.message);
      return;
    }
    const failed = (data ?? []).filter((r: any) => !r.ok);
    if (failed.length) toast.error(`${failed.length} launch migration checks failed`);
    else toast.success('All finance launch migration checks passed');
    console.table(data);
  };

  return (
    <AppShell>
      <style>{CONTROL_CSS}</style>
      <PageHeader
        eyebrow="Finance Launch Controls"
        title="Construction Finance Command Center"
        description="WIP, retainage, aging, commitments, bank matching, and role controls for launch operations."
        actions={<button className="fc-primary" onClick={verifyMigrations}><ShieldCheck className="w-3.5 h-3.5" /> Verify Migrations</button>}
      />

      <div className="fc-shell border-t border-border/50">
        <div className="px-4 sm:px-8 py-4 space-y-4">
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5">
            <Metric label="Revised Contract" value={fmtUSD(totals.budget)} sub={`${controls.length} active project controls`} icon={BriefcaseBusiness} color="#111827" />
            <Metric label="Earned Revenue" value={fmtUSD(totals.earned)} sub={`Margin ${fmtUSD(totals.margin)}`} icon={TrendingUp} color="#059669" />
            <Metric label="Retainage Net" value={fmtUSD(totals.arRetainage - totals.apRetainage)} sub={`AR ${fmtUSD(totals.arRetainage)} · AP ${fmtUSD(totals.apRetainage)}`} icon={BadgeDollarSign} color="#9D7E3F" />
            <Metric label="Pending CO Exposure" value={fmtUSD(totals.pendingCo)} sub={`Committed costs ${fmtUSD(totals.committed)}`} icon={Clock3} color="#d97706" />
          </div>

          <section className="fc-panel p-3 sm:p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <div className="fc-k">WIP / Percentage Complete</div>
                <h2 className="text-base font-bold mt-1">Project Control Summary</h2>
              </div>
              <div className="text-[10px] text-muted-foreground font-mono-tab hidden sm:block">{controls.length} projects</div>
            </div>
            <div className="sm:hidden space-y-2">
              {(controls as any[]).map(row => (
                <div key={row.project_id} className="fc-mobile-control">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-black truncate">{row.project_name}</div>
                      <div className="text-[10px] text-muted-foreground capitalize mt-0.5">{row.project_status || 'active'}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="fc-k">Complete</div>
                      <div className="font-mono-tab font-black">{num(row.percent_complete_cost).toFixed(1)}%</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 mt-3">
                    {[
                      ['Revenue', fmtUSD(num(row.earned_revenue)), 'text-positive'],
                      ['Actual Cost', fmtUSD(num(row.actual_cost)), 'text-foreground'],
                      ['Margin', fmtUSD(num(row.gross_margin)), num(row.gross_margin) >= 0 ? 'text-positive' : 'text-destructive'],
                      ['AR Open', fmtUSD(num(row.ar_open)), 'text-foreground'],
                      ['Pending CO', fmtUSD(num(row.pending_change_orders)), 'text-warning'],
                      ['Over/Under', fmtUSD(num(row.over_under_billed)), num(row.over_under_billed) >= 0 ? 'text-positive' : 'text-warning'],
                    ].map(([label, value, cls]: any) => (
                      <div key={label} className="fc-mobile-stat">
                        <div className="fc-k">{label}</div>
                        <div className={`font-mono-tab font-bold text-[12px] mt-1 ${cls}`}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {!controls.length && <div className="py-12 text-center text-sm text-muted-foreground">No project control data yet.</div>}
            </div>
            <div className="hidden sm:block overflow-x-auto">
              <div className="fc-table fc-row bg-secondary/45 fc-k">
                <div>Project</div><div>% Complete</div><div>Revenue</div><div>Actual Cost</div><div>Margin</div><div>AR Open</div><div>Pending CO</div><div>Over/Under</div>
              </div>
              {(controls as any[]).map(row => (
                <div key={row.project_id} className="fc-table fc-row">
                  <div className="min-w-0">
                    <div className="font-bold truncate">{row.project_name}</div>
                    <div className="text-[10px] text-muted-foreground capitalize">{row.project_status}</div>
                  </div>
                  <div className="font-mono-tab font-bold">{num(row.percent_complete_cost).toFixed(1)}%</div>
                  <div className="font-mono-tab">{fmtUSD(num(row.earned_revenue))}</div>
                  <div className="font-mono-tab">{fmtUSD(num(row.actual_cost))}</div>
                  <div className={`font-mono-tab font-bold ${num(row.gross_margin) >= 0 ? 'text-positive' : 'text-destructive'}`}>{fmtUSD(num(row.gross_margin))}</div>
                  <div className="font-mono-tab">{fmtUSD(num(row.ar_open))}</div>
                  <div className="font-mono-tab">{fmtUSD(num(row.pending_change_orders))}</div>
                  <div className={`font-mono-tab font-bold ${num(row.over_under_billed) >= 0 ? 'text-positive' : 'text-warning'}`}>{fmtUSD(num(row.over_under_billed))}</div>
                </div>
              ))}
              {!controls.length && <div className="py-12 text-center text-sm text-muted-foreground">No project control data yet.</div>}
            </div>
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_.9fr] gap-4">
            <section className="fc-panel p-3 sm:p-4">
              <div className="fc-k mb-2">AR / AP Aging</div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {['current', '1-30', '31-60', '61-90', '90+'].map(bucket => (
                  <div key={bucket} className="fc-card p-3" style={{ '--accent': bucket === '90+' ? '#dc2626' : '#0891b2' } as any}>
                    <div className="fc-k">{bucket}</div>
                    <div className="text-[10px] text-muted-foreground mt-2">AR</div>
                    <div className="font-mono-tab font-bold">{fmtUSD(agingMap[`ar:${bucket}`] ?? 0)}</div>
                    <div className="text-[10px] text-muted-foreground mt-2">AP</div>
                    <div className="font-mono-tab font-bold">{fmtUSD(agingMap[`ap:${bucket}`] ?? 0)}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="fc-panel p-3 sm:p-4">
              <div className="fc-k mb-2">Role Management</div>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px] gap-2">
                <Input className="fc-field" placeholder="User UUID" value={roleForm.user_id} onChange={e => setRoleForm(f => ({ ...f, user_id: e.target.value }))} />
                <Select value={roleForm.role} onValueChange={(v: AppRole) => setRoleForm(f => ({ ...f, role: v }))}>
                  <SelectTrigger className="fc-field"><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLES.map(role => <SelectItem key={role} value={role}>{ROLE_LABELS[role]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Input className="fc-field mt-2" placeholder="Assignment notes" value={roleForm.notes} onChange={e => setRoleForm(f => ({ ...f, notes: e.target.value }))} />
              <button className="fc-primary mt-2" onClick={() => assignRole.mutate()}><Users className="w-3.5 h-3.5" /> Assign Role</button>
              <div className="mt-3 space-y-1.5 max-h-44 overflow-y-auto">
                {(roles as any[]).slice(0, 8).map(role => (
                  <div key={role.id} className="border border-border px-2 py-1.5 text-[11px] flex items-center justify-between gap-2">
                    <span className="truncate font-mono-tab">{role.user_id}</span>
                    <span className="font-bold">{ROLE_LABELS[role.role as AppRole] ?? role.role}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <section className="fc-panel p-3 sm:p-4">
              <div className="fc-k mb-2">Committed Costs</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input className="fc-field" placeholder="Commitment title" value={commitment.title} onChange={e => setCommitment(f => ({ ...f, title: e.target.value }))} />
                <Input className="fc-field" placeholder="Commitment #" value={commitment.commitment_number} onChange={e => setCommitment(f => ({ ...f, commitment_number: e.target.value }))} />
                <Select value={commitment.project_id} onValueChange={v => setCommitment(f => ({ ...f, project_id: v }))}>
                  <SelectTrigger className="fc-field"><SelectValue placeholder="Project" /></SelectTrigger>
                  <SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={commitment.vendor_id} onValueChange={v => setCommitment(f => ({ ...f, vendor_id: v }))}>
                  <SelectTrigger className="fc-field"><SelectValue placeholder="Vendor" /></SelectTrigger>
                  <SelectContent>{vendors.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
                </Select>
                <Input className="fc-field" placeholder="Original amount" value={commitment.original_amount} onChange={e => setCommitment(f => ({ ...f, original_amount: e.target.value }))} />
                <Input className="fc-field" placeholder="Retainage %" value={commitment.retainage_percent} onChange={e => setCommitment(f => ({ ...f, retainage_percent: e.target.value }))} />
              </div>
              <Textarea className="rounded-none mt-2 text-xs" rows={2} placeholder="Notes" value={commitment.notes} onChange={e => setCommitment(f => ({ ...f, notes: e.target.value }))} />
              <button className="fc-primary mt-2" onClick={() => createCommitment.mutate()}><BriefcaseBusiness className="w-3.5 h-3.5" /> Save Commitment</button>
              <div className="mt-3 space-y-1.5 max-h-48 overflow-y-auto">
                {(commitments as any[]).slice(0, 8).map(c => (
                  <div key={c.id} className="border border-border px-2 py-2 text-xs flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-bold truncate">{c.title}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{c.projects?.name || 'Unassigned'} · {c.vendors?.name || 'No vendor'}</div>
                    </div>
                    <div className="font-mono-tab font-bold">{fmtUSD(num(c.revised_amount))}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="fc-panel p-3 sm:p-4">
              <div className="fc-k mb-2">Bank Feed Matching</div>
              <div className="text-[11px] text-muted-foreground mb-2">Paste CSV rows: date, amount, description, reference, counterparty.</div>
              <Textarea className="rounded-none text-xs font-mono-tab" rows={5} value={bankCsv} onChange={e => setBankCsv(e.target.value)} placeholder={'2026-07-16, 12500.00, Client ACH, ACH-123, Houston Client\n2026-07-16, -2750.00, Vendor Payment, CHK-1042, ABC Supply'} />
              <button className="fc-primary mt-2" onClick={() => importBankRows.mutate()}><Upload className="w-3.5 h-3.5" /> Import + Match</button>
              <div className="mt-3 space-y-1.5 max-h-56 overflow-y-auto">
                {(suggestions as any[]).map(s => {
                  const activity = s.finance_bank_activity;
                  return (
                    <div key={s.id} className="border border-border p-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-bold truncate">{activity?.counterparty || activity?.description || 'Bank activity'}</div>
                        <div className="font-mono-tab font-bold">{Number(s.confidence).toFixed(0)}%</div>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1">{fmtDate(activity?.activity_date)} · {fmtUSD(num(activity?.amount))} · {s.source_table}</div>
                      <button className="fc-action mt-2" onClick={() => acceptSuggestion.mutate(s.id)}><CheckCircle2 className="w-3.5 h-3.5" /> Accept Match</button>
                    </div>
                  );
                })}
                {!suggestions.length && <div className="text-xs text-muted-foreground border border-border p-3">No suggested bank matches waiting.</div>}
              </div>
            </section>
          </div>

          <section className="fc-panel p-3 sm:p-4">
            <div className="fc-k mb-2">Launch Readiness Notes</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {[
                ['WIP discipline', 'Keep project budgets, funded draws, paid invoices, and actual costs current so over/under billing is trustworthy.', Landmark],
                ['Aging hygiene', 'Set invoice due dates and expense due dates for true AR/AP aging by client, vendor, and project.', FileSpreadsheet],
                ['Bank matching', 'Import bank activity frequently and accept high-confidence matches to keep reconciliation live.', Banknote],
              ].map(([title, body, Icon]: any) => (
                <div key={title} className="fc-card p-3">
                  <Icon className="w-4 h-4 text-muted-foreground mb-2" />
                  <div className="text-sm font-bold">{title}</div>
                  <div className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{body}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
