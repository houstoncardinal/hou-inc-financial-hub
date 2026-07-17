/* ── Houston Generator Pros · Install Jobs workspace ─────────────────────────
   Replaces the shared construction Projects screen when HGP is the selected
   entity. Backed entirely by the hgp_jobs table (20260717000003): generator
   install/service/maintenance/emergency/warranty/survey jobs with the full
   pipeline (lead → survey → load calc → permit → equipment → scheduled →
   installing → inspection → commissioned → maintenance enrolled → completed),
   permit/inspection/equipment checklists, per-job economics (quote, deposit,
   equipment/labor/materials/sub/permit costs → gross margin), emergency
   priority, and outage-event links from the Storm Response center. ── */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useVendors } from '@/hooks/useFinance';
import {
  useHgpJobs, useEquipmentUnits,
  useEntityOpsUpsert, useEntityOpsSoftDelete, useEntityOpsRealtime,
} from '@/hooks/useEntityOps';
import { fmtDate, fmtUSD } from '@/lib/format';
import { toast } from 'sonner';
import {
  Zap, Plus, Pencil, Trash2, Search, CalendarClock, FileCheck2,
  PackageCheck, Wallet, Percent, Siren, LayoutGrid, Rows3, CloudLightning,
} from 'lucide-react';

const HGP_BLUE = '#1B72B5';

const JOBS_CSS = `
.hj-shell{background:linear-gradient(180deg,rgba(27,114,181,0.05),transparent 180px);}
.hj-panel{background:hsl(var(--background));border:1px solid hsl(var(--border));box-shadow:0 1px 3px rgba(10,10,10,.05),0 1px 0 rgba(255,255,255,.45) inset;}
.hj-kpi{border:1px solid hsl(var(--border));background:hsl(var(--background));padding:8px 10px;min-width:0;position:relative;overflow:hidden;}
.hj-kpi:before{content:"";position:absolute;inset:0 0 auto 0;height:2px;background:var(--accent,#1B72B5);}
.hj-k{font-size:7.5px;text-transform:uppercase;letter-spacing:.16em;font-weight:900;color:hsl(var(--muted-foreground));white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.hj-v{font-size:15px;font-weight:900;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.hj-card{border:1px solid hsl(var(--border));background:hsl(var(--background));transition:box-shadow .16s,border-color .16s;cursor:pointer;}
.hj-card:hover{box-shadow:0 6px 20px rgba(10,10,10,.08);border-color:hsl(var(--foreground)/.2);}
.hj-row{border-bottom:1px solid hsl(var(--border));padding:9px 12px;font-size:12px;cursor:pointer;}
.hj-row:hover{background:hsl(var(--secondary)/.35);}
.hj-primary{height:32px;background:hsl(var(--foreground));color:hsl(var(--background));padding:0 12px;font-size:9px;text-transform:uppercase;letter-spacing:.14em;font-weight:900;display:inline-flex;align-items:center;gap:6px;}
.hj-action{height:28px;border:1px solid hsl(var(--border));background:hsl(var(--background));padding:0 8px;font-size:8.5px;text-transform:uppercase;letter-spacing:.12em;font-weight:900;display:inline-flex;align-items:center;gap:5px;}
.hj-action:hover{background:hsl(var(--secondary)/.55);}
.hj-stage{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border:1px solid hsl(var(--border));font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:.12em;white-space:nowrap;cursor:pointer;background:hsl(var(--background));}
.hj-stage[data-on="true"]{border-color:rgba(27,114,181,.5);background:rgba(27,114,181,.09);color:#1B72B5;}
.hj-field{height:38px;border-radius:0;font-size:12px;}
.dark .hj-panel,.dark .hj-kpi,.dark .hj-card,.dark .hj-action,.dark .hj-stage{background:hsl(var(--card));}
@media(max-width:767px){.hj-v{font-size:13px}.hj-panel{padding:10px!important}}
`;

export const HGP_STAGES: { key: string; label: string }[] = [
  { key: 'lead',                label: 'Lead' },
  { key: 'survey',              label: 'Site Survey' },
  { key: 'load_calc',           label: 'Load Calc' },
  { key: 'permit',              label: 'Permit' },
  { key: 'equipment_ordered',   label: 'Equipment' },
  { key: 'scheduled',           label: 'Scheduled' },
  { key: 'installing',          label: 'Installing' },
  { key: 'inspection',          label: 'Inspection' },
  { key: 'commissioned',        label: 'Commissioned' },
  { key: 'maintenance_enrolled', label: 'Maint. Enrolled' },
  { key: 'completed',           label: 'Completed' },
  { key: 'lost',                label: 'Lost' },
];

const JOB_TYPES: Record<string, { label: string; color: string }> = {
  install:     { label: 'Install',     color: '#1B72B5' },
  service:     { label: 'Service',     color: '#0891b2' },
  maintenance: { label: 'Maintenance', color: '#059669' },
  emergency:   { label: 'Emergency',   color: '#dc2626' },
  warranty:    { label: 'Warranty',    color: '#7c3aed' },
  survey:      { label: 'Survey',      color: '#d97706' },
};

const PERMIT_STATUSES = ['none', 'pending', 'submitted', 'approved', 'failed'];
const INSPECTION_STATUSES = ['none', 'pending', 'scheduled', 'passed', 'failed'];
const EQUIPMENT_STATUSES = ['not_ordered', 'ordered', 'delivered', 'installed'];

const num = (v: unknown) => Number(v || 0);
const jobCosts = (j: any) =>
  num(j.equipment_cost) + num(j.labor_cost) + num(j.materials_cost) + num(j.subcontractor_cost) + num(j.permit_cost);
const jobMargin = (j: any) => num(j.quoted_amount) - jobCosts(j);
const jobBalance = (j: any) => Math.max(num(j.quoted_amount) - num(j.deposit_amount), 0);
const titleCase = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const BLANK_JOB = {
  id: '', job_type: 'install', stage: 'lead',
  customer_name: '', customer_email: '', customer_phone: '',
  site_address: '', city: '', county: '', zip: '', utility_provider: '',
  generator_model: '', serial_number: '', transfer_switch: '', kw_rating: '', fuel_type: 'natural_gas',
  permit_status: 'none', inspection_status: 'none', equipment_status: 'not_ordered',
  vendor_id: '', equipment_unit_id: '',
  quoted_amount: '', deposit_amount: '', equipment_cost: '', labor_cost: '',
  materials_cost: '', subcontractor_cost: '', permit_cost: '',
  emergency: false, maintenance_enrolled: false, warranty_status: '',
  target_install_date: '', completed_date: '', notes: '',
};

function StagePill({ stage }: { stage: string }) {
  const meta = HGP_STAGES.find(s => s.key === stage);
  return (
    <span className="inline-flex px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] whitespace-nowrap"
      style={{ backgroundColor: HGP_BLUE + '14', color: HGP_BLUE }}>
      {meta?.label ?? stage}
    </span>
  );
}

export default function HgpJobs() {
  const { user } = useAuth();
  useEntityOpsRealtime();
  const { data: jobs = [], isLoading } = useHgpJobs();
  const { data: units = [] } = useEquipmentUnits();
  const { data: vendors = [] } = useVendors();
  const upsertJob = useEntityOpsUpsert('hgp_jobs');
  const deleteJob = useEntityOpsSoftDelete('hgp_jobs');

  const [view, setView] = useState<'cards' | 'table'>('cards');
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [unpaidOnly, setUnpaidOnly] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({ ...BLANK_JOB });

  const live = jobs as any[];

  const kpis = useMemo(() => {
    const openInstalls = live.filter(j => j.job_type === 'install' && !['completed', 'lost'].includes(j.stage));
    const weekEnd = Date.now() + 7 * 86400000;
    const scheduledThisWeek = live.filter(j => {
      if (!j.target_install_date || ['completed', 'lost'].includes(j.stage)) return false;
      const t = new Date(j.target_install_date + 'T12:00:00').getTime();
      return t >= Date.now() - 86400000 && t <= weekEnd;
    }).length;
    const permitsPending = live.filter(j => ['pending', 'submitted'].includes(j.permit_status) && !['completed', 'lost'].includes(j.stage)).length;
    const inspectionsPending = live.filter(j => ['pending', 'scheduled'].includes(j.inspection_status) && !['completed', 'lost'].includes(j.stage)).length;
    const awaitingDelivery = live.filter(j => j.equipment_status === 'ordered' && !['completed', 'lost'].includes(j.stage)).length;
    const active = live.filter(j => !['completed', 'lost'].includes(j.stage));
    const depositsHeld = active.reduce((s, j) => s + num(j.deposit_amount), 0);
    const balanceDue = active.reduce((s, j) => s + jobBalance(j), 0);
    const quoted = live.filter(j => num(j.quoted_amount) > 0 && j.stage !== 'lost');
    const marginPct = quoted.length
      ? (quoted.reduce((s, j) => s + jobMargin(j), 0) / quoted.reduce((s, j) => s + num(j.quoted_amount), 0)) * 100
      : 0;
    const emergencyOpen = live.filter(j => j.emergency && !['completed', 'lost'].includes(j.stage)).length;
    return { openInstalls: openInstalls.length, scheduledThisWeek, permitsPending, inspectionsPending, awaitingDelivery, depositsHeld, balanceDue, marginPct, emergencyOpen };
  }, [live]);

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = { all: live.length };
    for (const s of HGP_STAGES) counts[s.key] = 0;
    for (const j of live) counts[j.stage] = (counts[j.stage] ?? 0) + 1;
    return counts;
  }, [live]);

  const filtered = useMemo(() => live.filter(j => {
    if (stageFilter !== 'all' && j.stage !== stageFilter) return false;
    if (typeFilter !== 'all' && j.job_type !== typeFilter) return false;
    if (emergencyOnly && !j.emergency) return false;
    if (unpaidOnly && jobBalance(j) <= 0) return false;
    if (search) {
      const hay = [j.customer_name, j.site_address, j.city, j.zip, j.generator_model, j.serial_number, j.utility_provider]
        .filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(search.toLowerCase())) return false;
    }
    return true;
  }).sort((a, b) => Number(b.emergency) - Number(a.emergency) || String(b.created_at).localeCompare(String(a.created_at))),
  [live, stageFilter, typeFilter, emergencyOnly, unpaidOnly, search]);

  const openJob = (j?: any) => {
    setForm(j ? {
      id: j.id, job_type: j.job_type, stage: j.stage,
      customer_name: j.customer_name ?? '', customer_email: j.customer_email ?? '', customer_phone: j.customer_phone ?? '',
      site_address: j.site_address ?? '', city: j.city ?? '', county: j.county ?? '', zip: j.zip ?? '',
      utility_provider: j.utility_provider ?? '',
      generator_model: j.generator_model ?? '', serial_number: j.serial_number ?? '',
      transfer_switch: j.transfer_switch ?? '', kw_rating: j.kw_rating != null ? String(j.kw_rating) : '',
      fuel_type: j.fuel_type ?? 'natural_gas',
      permit_status: j.permit_status ?? 'none', inspection_status: j.inspection_status ?? 'none',
      equipment_status: j.equipment_status ?? 'not_ordered',
      vendor_id: j.vendor_id ?? '', equipment_unit_id: j.equipment_unit_id ?? '',
      quoted_amount: num(j.quoted_amount) ? String(j.quoted_amount) : '',
      deposit_amount: num(j.deposit_amount) ? String(j.deposit_amount) : '',
      equipment_cost: num(j.equipment_cost) ? String(j.equipment_cost) : '',
      labor_cost: num(j.labor_cost) ? String(j.labor_cost) : '',
      materials_cost: num(j.materials_cost) ? String(j.materials_cost) : '',
      subcontractor_cost: num(j.subcontractor_cost) ? String(j.subcontractor_cost) : '',
      permit_cost: num(j.permit_cost) ? String(j.permit_cost) : '',
      emergency: !!j.emergency, maintenance_enrolled: !!j.maintenance_enrolled,
      warranty_status: j.warranty_status ?? '',
      target_install_date: j.target_install_date ?? '', completed_date: j.completed_date ?? '',
      notes: j.notes ?? '',
    } : { ...BLANK_JOB });
    setDialog(true);
  };

  const saveJob = async () => {
    if (!user?.id) return toast.error('Sign in required');
    if (!form.customer_name.trim()) return toast.error('Customer name is required');
    const row: any = {
      ...(form.id ? { id: form.id } : {}),
      user_id: user.id,
      entity_id: 'houston-generator-pros',
      job_type: form.job_type, stage: form.stage,
      customer_name: form.customer_name.trim(),
      customer_email: form.customer_email.trim() || null,
      customer_phone: form.customer_phone.trim() || null,
      site_address: form.site_address.trim() || null,
      city: form.city.trim() || null, county: form.county.trim() || null, zip: form.zip.trim() || null,
      utility_provider: form.utility_provider.trim() || null,
      generator_model: form.generator_model.trim() || null,
      serial_number: form.serial_number.trim() || null,
      transfer_switch: form.transfer_switch.trim() || null,
      kw_rating: form.kw_rating ? Number(form.kw_rating) : null,
      fuel_type: form.fuel_type,
      permit_status: form.permit_status, inspection_status: form.inspection_status,
      equipment_status: form.equipment_status,
      vendor_id: form.vendor_id || null,
      equipment_unit_id: form.equipment_unit_id || null,
      quoted_amount: Number(form.quoted_amount) || 0,
      deposit_amount: Number(form.deposit_amount) || 0,
      equipment_cost: Number(form.equipment_cost) || 0,
      labor_cost: Number(form.labor_cost) || 0,
      materials_cost: Number(form.materials_cost) || 0,
      subcontractor_cost: Number(form.subcontractor_cost) || 0,
      permit_cost: Number(form.permit_cost) || 0,
      emergency: form.emergency,
      maintenance_enrolled: form.maintenance_enrolled,
      warranty_status: form.warranty_status.trim() || null,
      target_install_date: form.target_install_date || null,
      completed_date: form.completed_date || null,
      notes: form.notes.trim() || null,
    };
    try {
      await upsertJob.mutateAsync(row);
      toast.success(form.id ? 'Job updated' : 'Job created');
      setDialog(false);
    } catch (e: any) { toast.error(e.message); }
  };

  const formMargin = num(form.quoted_amount)
    - (num(form.equipment_cost) + num(form.labor_cost) + num(form.materials_cost) + num(form.subcontractor_cost) + num(form.permit_cost));

  return (
    <AppShell>
      <style>{JOBS_CSS}</style>
      <PageHeader
        eyebrow="Houston Generator Pros"
        title="Install Jobs"
        description="Generator installs, service, maintenance, warranty, and emergency dispatch — pipeline, checklists, and job margin."
        actions={
          <div className="flex items-center gap-2">
            <Link to="/storm" className="hj-action"><CloudLightning className="w-3 h-3" /> Storm Response</Link>
            <button className="hj-primary" onClick={() => openJob()}><Plus className="w-3.5 h-3.5" /> New Job</button>
          </div>
        }
      />

      <div className="hj-shell border-t border-border/50">
        <div className="px-4 sm:px-8 py-4 space-y-3.5">
          {/* ── KPI strip ── */}
          <div className="grid grid-cols-3 sm:grid-cols-5 xl:grid-cols-9 gap-1.5">
            {[
              ['Open Installs', String(kpis.openInstalls), Zap, HGP_BLUE],
              ['Sched. 7d', String(kpis.scheduledThisWeek), CalendarClock, '#059669'],
              ['Permits Pend.', String(kpis.permitsPending), FileCheck2, '#d97706'],
              ['Inspections', String(kpis.inspectionsPending), FileCheck2, '#0891b2'],
              ['Awaiting Equip.', String(kpis.awaitingDelivery), PackageCheck, '#7c3aed'],
              ['Deposits Held', fmtUSD(kpis.depositsHeld), Wallet, '#059669'],
              ['Balance Due', fmtUSD(kpis.balanceDue), Wallet, '#d97706'],
              ['Avg Margin', `${kpis.marginPct.toFixed(1)}%`, Percent, HGP_BLUE],
              ['Emergency', String(kpis.emergencyOpen), Siren, kpis.emergencyOpen ? '#dc2626' : '#64748b'],
            ].map(([label, value, Icon, color]: any) => (
              <div key={label} className="hj-kpi" style={{ '--accent': color } as any}>
                <div className="flex items-center justify-between gap-1">
                  <div className="hj-k">{label}</div>
                  <Icon className="w-3 h-3 shrink-0" style={{ color }} strokeWidth={1.8} />
                </div>
                <div className="hj-v">{value}</div>
              </div>
            ))}
          </div>

          {/* ── Pipeline ── */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
            <button className="hj-stage" data-on={stageFilter === 'all'} onClick={() => setStageFilter('all')}>
              All <span className="font-mono-tab">{stageCounts.all}</span>
            </button>
            {HGP_STAGES.map(s => (
              <button key={s.key} className="hj-stage" data-on={stageFilter === s.key} onClick={() => setStageFilter(stageFilter === s.key ? 'all' : s.key)}>
                {s.label} <span className="font-mono-tab">{stageCounts[s.key] ?? 0}</span>
              </button>
            ))}
          </div>

          {/* ── Filters + view toggle ── */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px] max-w-[300px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Customer, address, model, serial…"
                className="w-full h-9 pl-7 pr-2.5 text-[16px] sm:text-[12px] border border-border bg-background outline-none focus:border-foreground/30" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="rounded-none h-9 w-[130px] text-[11px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(JOB_TYPES).map(([k, m]) => <SelectItem key={k} value={k}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <button className="hj-action" data-on={emergencyOnly} style={emergencyOnly ? { borderColor: '#dc262680', color: '#dc2626', background: '#dc262610' } : undefined}
              onClick={() => setEmergencyOnly(v => !v)}>
              <Siren className="w-3 h-3" /> Emergency Queue
            </button>
            <button className="hj-action" style={unpaidOnly ? { borderColor: '#d9770680', color: '#d97706', background: '#d9770610' } : undefined}
              onClick={() => setUnpaidOnly(v => !v)}>
              <Wallet className="w-3 h-3" /> Unpaid Balance
            </button>
            <div className="ml-auto flex items-center gap-1">
              <button className="hj-action" style={view === 'cards' ? { borderColor: HGP_BLUE + '80', color: HGP_BLUE } : undefined} onClick={() => setView('cards')} title="Card view">
                <LayoutGrid className="w-3 h-3" />
              </button>
              <button className="hj-action" style={view === 'table' ? { borderColor: HGP_BLUE + '80', color: HGP_BLUE } : undefined} onClick={() => setView('table')} title="Table view">
                <Rows3 className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* ── Jobs ── */}
          {isLoading ? (
            <div className="hj-panel p-10 text-center text-xs text-muted-foreground">Loading jobs…</div>
          ) : !filtered.length ? (
            <div className="hj-panel p-10 text-center">
              <Zap className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" strokeWidth={1.2} />
              <div className="text-sm font-bold">{live.length ? 'No jobs match these filters' : 'No generator jobs yet'}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {live.length ? 'Adjust the pipeline stage or filters above.' : 'Create your first install, service, or survey job to start the pipeline.'}
              </div>
              {!live.length && <button className="hj-primary mt-4" onClick={() => openJob()}><Plus className="w-3.5 h-3.5" /> Create First Job</button>}
            </div>
          ) : view === 'cards' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
              {filtered.map(j => {
                const type = JOB_TYPES[j.job_type] ?? JOB_TYPES.install;
                const margin = jobMargin(j);
                return (
                  <div key={j.id} className="hj-card p-3 min-w-0" onClick={() => openJob(j)}>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {j.emergency && <Siren className="w-3.5 h-3.5 text-destructive shrink-0" />}
                          <span className="text-[13px] font-bold truncate">{j.customer_name}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                          {[j.site_address, j.city, j.zip].filter(Boolean).join(', ') || 'No site address'}
                        </div>
                      </div>
                      <span className="text-[8px] font-black uppercase tracking-[0.14em] px-1.5 py-0.5 shrink-0"
                        style={{ backgroundColor: type.color + '14', color: type.color }}>{type.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap mb-2">
                      <StagePill stage={j.stage} />
                      {j.generator_model && (
                        <span className="text-[9px] text-muted-foreground font-mono-tab truncate">
                          {j.generator_model}{j.kw_rating ? ` · ${num(j.kw_rating)}kW` : ''}{j.serial_number ? ` · SN ${j.serial_number}` : ''}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                      <div className="border border-border/70 bg-secondary/25 px-1.5 py-1">
                        <div className="hj-k">Quoted</div>
                        <div className="font-mono-tab font-bold">{fmtUSD(num(j.quoted_amount))}</div>
                      </div>
                      <div className="border border-border/70 bg-secondary/25 px-1.5 py-1">
                        <div className="hj-k">Balance</div>
                        <div className={`font-mono-tab font-bold ${jobBalance(j) > 0 ? 'text-warning' : 'text-positive'}`}>{fmtUSD(jobBalance(j))}</div>
                      </div>
                      <div className="border border-border/70 bg-secondary/25 px-1.5 py-1">
                        <div className="hj-k">Margin</div>
                        <div className={`font-mono-tab font-bold ${margin >= 0 ? 'text-positive' : 'text-destructive'}`}>{fmtUSD(margin)}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-[9px] text-muted-foreground">
                      <span className="truncate">
                        Permit {titleCase(j.permit_status)} · Insp. {titleCase(j.inspection_status)} · Equip. {titleCase(j.equipment_status)}
                      </span>
                      {j.target_install_date && <span className="font-mono-tab shrink-0">{fmtDate(j.target_install_date)}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="hj-panel overflow-x-auto">
              <div className="min-w-[1020px]">
                <div className="hj-row grid grid-cols-[1.4fr_.8fr_.9fr_1fr_.8fr_.8fr_.8fr_.8fr_.7fr_.4fr] gap-2 bg-secondary/45 hj-k items-center cursor-default">
                  <div>Customer / Site</div><div>Type</div><div>Stage</div><div>Generator</div><div>Permit</div><div>Quoted</div><div>Balance</div><div>Margin</div><div>Install</div><div></div>
                </div>
                {filtered.map(j => {
                  const type = JOB_TYPES[j.job_type] ?? JOB_TYPES.install;
                  const margin = jobMargin(j);
                  return (
                    <div key={j.id} className="hj-row grid grid-cols-[1.4fr_.8fr_.9fr_1fr_.8fr_.8fr_.8fr_.8fr_.7fr_.4fr] gap-2 items-center" onClick={() => openJob(j)}>
                      <div className="min-w-0">
                        <div className="font-bold truncate flex items-center gap-1">
                          {j.emergency && <Siren className="w-3 h-3 text-destructive shrink-0" />}{j.customer_name}
                        </div>
                        <div className="text-[9px] text-muted-foreground truncate">{[j.city, j.zip, j.utility_provider].filter(Boolean).join(' · ')}</div>
                      </div>
                      <div><span className="text-[8px] font-black uppercase tracking-[0.12em] px-1.5 py-0.5" style={{ backgroundColor: type.color + '14', color: type.color }}>{type.label}</span></div>
                      <div><StagePill stage={j.stage} /></div>
                      <div className="text-[10px] font-mono-tab truncate">{j.generator_model ? `${j.generator_model}${j.kw_rating ? ` ${num(j.kw_rating)}kW` : ''}` : '—'}</div>
                      <div className="text-[10px] capitalize">{titleCase(j.permit_status)}</div>
                      <div className="font-mono-tab">{fmtUSD(num(j.quoted_amount))}</div>
                      <div className={`font-mono-tab ${jobBalance(j) > 0 ? 'text-warning font-bold' : 'text-positive'}`}>{fmtUSD(jobBalance(j))}</div>
                      <div className={`font-mono-tab font-bold ${margin >= 0 ? 'text-positive' : 'text-destructive'}`}>{fmtUSD(margin)}</div>
                      <div className="text-[10px] whitespace-nowrap">{j.target_install_date ? fmtDate(j.target_install_date) : '—'}</div>
                      <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                        <button className="p-1 text-muted-foreground hover:text-foreground" onClick={() => openJob(j)} title="Edit"><Pencil className="w-3 h-3" /></button>
                        <button className="p-1 text-muted-foreground hover:text-destructive" title="Remove"
                          onClick={() => { if (confirm('Remove this job?')) deleteJob.mutate(j.id, { onSuccess: () => toast.success('Job removed') }); }}>
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Job dialog ── */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-2xl rounded-none max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-base">{form.id ? 'Edit Job' : 'New Generator Job'}</DialogTitle></DialogHeader>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="col-span-2">
              <div className="hj-k mb-1">Customer *</div>
              <Input className="hj-field" value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} />
            </div>
            <div>
              <div className="hj-k mb-1">Job Type</div>
              <Select value={form.job_type} onValueChange={v => setForm(f => ({ ...f, job_type: v, emergency: v === 'emergency' ? true : f.emergency }))}>
                <SelectTrigger className="hj-field"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(JOB_TYPES).map(([k, m]) => <SelectItem key={k} value={k}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <div className="hj-k mb-1">Pipeline Stage</div>
              <Select value={form.stage} onValueChange={v => setForm(f => ({ ...f, stage: v }))}>
                <SelectTrigger className="hj-field"><SelectValue /></SelectTrigger>
                <SelectContent>{HGP_STAGES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <div className="hj-k mb-1">Site Address</div>
              <Input className="hj-field" value={form.site_address} onChange={e => setForm(f => ({ ...f, site_address: e.target.value }))} />
            </div>
            <div>
              <div className="hj-k mb-1">City</div>
              <Input className="hj-field" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
            </div>
            <div>
              <div className="hj-k mb-1">ZIP</div>
              <Input className="hj-field" inputMode="numeric" value={form.zip} onChange={e => setForm(f => ({ ...f, zip: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <div className="hj-k mb-1">Utility Provider</div>
              <Input className="hj-field" placeholder="CenterPoint, Oncor, Entergy…" value={form.utility_provider} onChange={e => setForm(f => ({ ...f, utility_provider: e.target.value }))} />
            </div>
            <div>
              <div className="hj-k mb-1">County</div>
              <Input className="hj-field" value={form.county} onChange={e => setForm(f => ({ ...f, county: e.target.value }))} />
            </div>
            <div>
              <div className="hj-k mb-1">Phone</div>
              <Input className="hj-field" value={form.customer_phone} onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))} />
            </div>

            <div className="col-span-2">
              <div className="hj-k mb-1">Generator Model</div>
              <Input className="hj-field" placeholder="e.g. Generac Guardian 24kW" value={form.generator_model} onChange={e => setForm(f => ({ ...f, generator_model: e.target.value }))} />
            </div>
            <div>
              <div className="hj-k mb-1">Serial #</div>
              <Input className="hj-field font-mono-tab" value={form.serial_number} onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))} />
            </div>
            <div>
              <div className="hj-k mb-1">kW</div>
              <Input className="hj-field" type="number" inputMode="decimal" value={form.kw_rating} onChange={e => setForm(f => ({ ...f, kw_rating: e.target.value }))} />
            </div>
            <div>
              <div className="hj-k mb-1">Transfer Switch</div>
              <Input className="hj-field" value={form.transfer_switch} onChange={e => setForm(f => ({ ...f, transfer_switch: e.target.value }))} />
            </div>
            <div>
              <div className="hj-k mb-1">Fuel</div>
              <Select value={form.fuel_type} onValueChange={v => setForm(f => ({ ...f, fuel_type: v }))}>
                <SelectTrigger className="hj-field"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="natural_gas">Natural Gas</SelectItem>
                  <SelectItem value="propane">Propane</SelectItem>
                  <SelectItem value="diesel">Diesel</SelectItem>
                  <SelectItem value="bi_fuel">Bi-Fuel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="hj-k mb-1">Inventory Unit</div>
              <Select value={form.equipment_unit_id || '__none__'} onValueChange={v => setForm(f => ({ ...f, equipment_unit_id: v === '__none__' ? '' : v }))}>
                <SelectTrigger className="hj-field"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Unassigned</SelectItem>
                  {(units as any[]).map(u => <SelectItem key={u.id} value={u.id}>{u.model}{u.serial_number ? ` · ${u.serial_number}` : ''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="hj-k mb-1">Distributor</div>
              <Select value={form.vendor_id || '__none__'} onValueChange={v => setForm(f => ({ ...f, vendor_id: v === '__none__' ? '' : v }))}>
                <SelectTrigger className="hj-field"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {(vendors as any[]).map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="hj-k mb-1">Permit</div>
              <Select value={form.permit_status} onValueChange={v => setForm(f => ({ ...f, permit_status: v }))}>
                <SelectTrigger className="hj-field"><SelectValue /></SelectTrigger>
                <SelectContent>{PERMIT_STATUSES.map(s => <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <div className="hj-k mb-1">Inspection</div>
              <Select value={form.inspection_status} onValueChange={v => setForm(f => ({ ...f, inspection_status: v }))}>
                <SelectTrigger className="hj-field"><SelectValue /></SelectTrigger>
                <SelectContent>{INSPECTION_STATUSES.map(s => <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <div className="hj-k mb-1">Equipment</div>
              <Select value={form.equipment_status} onValueChange={v => setForm(f => ({ ...f, equipment_status: v }))}>
                <SelectTrigger className="hj-field"><SelectValue /></SelectTrigger>
                <SelectContent>{EQUIPMENT_STATUSES.map(s => <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <div className="hj-k mb-1">Target Install</div>
              <Input className="hj-field" type="date" value={form.target_install_date} onChange={e => setForm(f => ({ ...f, target_install_date: e.target.value }))} />
            </div>

            {[['quoted_amount', 'Quoted'], ['deposit_amount', 'Deposit'], ['equipment_cost', 'Equipment Cost'], ['labor_cost', 'Labor Cost'],
              ['materials_cost', 'Materials'], ['subcontractor_cost', 'Subcontractor'], ['permit_cost', 'Permit/Inspection']].map(([k, label]) => (
              <div key={k}>
                <div className="hj-k mb-1">{label}</div>
                <Input className="hj-field" type="number" inputMode="decimal" value={(form as any)[k]}
                  onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
              </div>
            ))}
            <div className="border border-border bg-secondary/25 px-2 flex flex-col justify-center">
              <div className="hj-k">Gross Margin</div>
              <div className={`font-mono-tab font-black text-sm ${formMargin >= 0 ? 'text-positive' : 'text-destructive'}`}>{fmtUSD(formMargin)}</div>
            </div>

            <label className="col-span-2 flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
              <input type="checkbox" className="w-4 h-4" checked={form.emergency} onChange={e => setForm(f => ({ ...f, emergency: e.target.checked }))} />
              Emergency priority
            </label>
            <label className="col-span-2 flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
              <input type="checkbox" className="w-4 h-4" checked={form.maintenance_enrolled} onChange={e => setForm(f => ({ ...f, maintenance_enrolled: e.target.checked }))} />
              Enrolled in maintenance plan
            </label>
            <div className="col-span-2 sm:col-span-4">
              <div className="hj-k mb-1">Notes</div>
              <Textarea className="rounded-none text-xs" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>

          <div className="flex gap-2 mt-2">
            {form.id && (
              <button className="hj-action !h-10 px-4 !text-destructive" onClick={() => {
                if (confirm('Remove this job?')) deleteJob.mutate(form.id, { onSuccess: () => { toast.success('Job removed'); setDialog(false); } });
              }}>
                <Trash2 className="w-3.5 h-3.5" /> Remove
              </button>
            )}
            <button className="hj-primary flex-1 !h-10" onClick={saveJob} disabled={upsertJob.isPending}>
              {form.id ? 'Save Job' : 'Create Job'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
