/* ── Houston Generator Pros · Install Jobs workspace ─────────────────────────
   Replaces the shared construction Projects screen when HGP is the selected
   entity. Backed entirely by the hgp_jobs table (20260717000003): generator
   install/service/maintenance/emergency/warranty/survey jobs with the full
   pipeline (lead → survey → load calc → permit → equipment → scheduled →
   installing → inspection → commissioned → maintenance enrolled → completed),
   permit/inspection/equipment checklists, per-job economics (quote, deposit,
   equipment/labor/materials/sub/permit costs → gross margin), emergency
   priority, and outage-event links from the Storm Response center. ── */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/hooks/useAuth';
import { useFinanceClientAccounts, useVendors } from '@/hooks/useFinance';
import {
  useHgpJobs, useEquipmentUnits, useHgpJobPayments,
  useEntityOpsUpsert, useEntityOpsSoftDelete, useEntityOpsRealtime,
} from '@/hooks/useEntityOps';
import { fmtDate, fmtUSD, todayLocalDate } from '@/lib/format';
import { toast } from 'sonner';
import {
  Zap, Plus, Pencil, Trash2, Search, CalendarClock, FileCheck2,
  PackageCheck, Wallet, Percent, Siren, LayoutGrid, Rows3, CloudLightning,
  MapPin, StickyNote, UserRound, SlidersHorizontal, ChevronDown,
} from 'lucide-react';

const HGP_BLUE = '#1B72B5';

const JOBS_CSS = `
.hj-shell{background:linear-gradient(180deg,rgba(27,114,181,0.05),transparent 180px);}
.hj-panel{background:hsl(var(--background));border:1px solid hsl(var(--border));box-shadow:0 1px 3px rgba(10,10,10,.05),0 1px 0 rgba(255,255,255,.45) inset;}
.hj-kpi{border:1px solid hsl(var(--border));background:hsl(var(--background));padding:8px 10px;min-width:0;position:relative;overflow:hidden;}
.hj-kpi:before{content:"";position:absolute;inset:0 0 auto 0;height:2px;background:var(--accent,#1B72B5);}
.hj-k{font-size:7.5px;text-transform:uppercase;letter-spacing:.16em;font-weight:900;color:hsl(var(--muted-foreground));white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.hj-v{font-size:15px;font-weight:900;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.hj-card{border:1px solid hsl(var(--border));border-radius:16px;background:hsl(var(--background));transition:box-shadow .2s cubic-bezier(.16,1,.3,1),border-color .2s ease,transform .2s cubic-bezier(.16,1,.3,1);cursor:pointer;position:relative;overflow:hidden;}
.hj-card:before{content:"";position:absolute;inset:0 0 auto 0;height:2px;background:var(--accent,#1B72B5);}
.hj-card:hover{box-shadow:0 10px 28px rgba(10,10,10,.09);border-color:hsl(var(--foreground)/.2);transform:translateY(-2px);}
.hj-client-band{border:1px solid hsl(var(--border));background:hsl(var(--secondary)/.25);padding:7px 8px;min-width:0;}
.hj-mini-chip{display:inline-flex;align-items:center;gap:4px;border:1px solid hsl(var(--border));background:hsl(var(--background));padding:3px 6px;font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:.1em;white-space:nowrap;}
.hj-note{border-left:2px solid rgba(27,114,181,.5);background:rgba(27,114,181,.055);padding:6px 8px;font-size:10px;line-height:1.35;color:hsl(var(--foreground)/.78);}
.hj-row{border-bottom:1px solid hsl(var(--border));padding:9px 12px;font-size:12px;cursor:pointer;}
.hj-row:hover{background:hsl(var(--secondary)/.35);}
.hj-primary{height:32px;background:hsl(var(--foreground));color:hsl(var(--background));padding:0 12px;font-size:9px;text-transform:uppercase;letter-spacing:.14em;font-weight:900;display:inline-flex;align-items:center;gap:6px;}
.hj-action{height:28px;border:1px solid hsl(var(--border));background:hsl(var(--background));padding:0 8px;font-size:8.5px;text-transform:uppercase;letter-spacing:.12em;font-weight:900;display:inline-flex;align-items:center;gap:5px;}
.hj-action:hover{background:hsl(var(--secondary)/.55);}
.hj-stage{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border:1px solid hsl(var(--border));font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:.12em;white-space:nowrap;cursor:pointer;background:hsl(var(--background));}
.hj-stage[data-on="true"]{border-color:rgba(27,114,181,.5);background:rgba(27,114,181,.09);color:#1B72B5;}
.hj-field{height:38px;border-radius:0;font-size:12px;}
.hj-page-btn{height:32px;min-width:32px;border:1px solid hsl(var(--border));background:hsl(var(--background));font-size:10px;font-weight:900;}
.hj-page-btn:hover:not(:disabled){background:hsl(var(--secondary)/.6);border-color:hsl(var(--foreground)/.22);}
.hj-page-btn:disabled{opacity:.38;cursor:not-allowed;}
.dark .hj-panel,.dark .hj-kpi,.dark .hj-card,.dark .hj-action,.dark .hj-stage{background:hsl(var(--card));}
@media(max-width:767px){.hj-v{font-size:13px}.hj-panel{padding:10px!important}.hj-stage{min-height:32px;padding:5px 8px;font-size:8.5px}.hj-action{min-height:36px}.hj-primary{min-height:38px}.hj-mini-chip{min-height:26px}.hj-page-btn{min-height:36px;min-width:42px}}
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
  id: '', finance_client_id: '', job_type: 'install', stage: 'lead',
  customer_name: '', customer_email: '', customer_phone: '',
  site_address: '', city: '', county: '', zip: '', utility_provider: '',
  generator_model: '', serial_number: '', transfer_switch: '', kw_rating: '', fuel_type: 'natural_gas',
  permit_status: 'none', inspection_status: 'none', equipment_status: 'not_ordered',
  vendor_id: '', equipment_unit_id: '',
  quoted_amount: '', deposit_amount: '', equipment_cost: '', labor_cost: '',
  materials_cost: '', subcontractor_cost: '', permit_cost: '',
  emergency: false, maintenance_enrolled: false, warranty_status: '',
  technician: '', dispatch_status: 'unassigned',
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
  const { data: financeClients = [] } = useFinanceClientAccounts();
  const upsertJob = useEntityOpsUpsert('hgp_jobs');
  const deleteJob = useEntityOpsSoftDelete('hgp_jobs');
  const { data: allPayments = [] } = useHgpJobPayments();
  const insertPayment = useEntityOpsUpsert('hgp_job_payments');
  const voidPayment = useEntityOpsSoftDelete('hgp_job_payments');

  const [view, setView] = useState<'cards' | 'table' | 'schedule'>('cards');
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [stageFilterOpen, setStageFilterOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');
  const [queue, setQueue] = useState<'none' | 'emergency' | 'unpaid' | 'permits' | 'inspections' | 'equipment' | 'unscheduled'>('none');
  const [jobsPage, setJobsPage] = useState(1);
  const [formStep, setFormStep] = useState(0);
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({ ...BLANK_JOB });
  const BLANK_PAY = { payment_type: 'progress', amount: '', payment_date: todayLocalDate(), method: 'other', reference: '' };
  const [payForm, setPayForm] = useState({ ...BLANK_PAY });

  const live = jobs as any[];
  const clientById = useMemo(() => {
    const map = new Map<string, any>();
    (financeClients as any[]).forEach(c => map.set(c.id, c));
    return map;
  }, [financeClients]);

  const clientForJob = (j: any) => {
    if (j.finance_client_id && clientById.has(j.finance_client_id)) return clientById.get(j.finance_client_id);
    const email = String(j.customer_email || '').toLowerCase();
    const name = String(j.customer_name || '').toLowerCase().trim();
    return (financeClients as any[]).find(c =>
      (email && String(c.email || '').toLowerCase() === email)
      || (name && String(c.name || '').toLowerCase().trim() === name)
    );
  };

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
    const unpaidCount = live.filter(j => jobBalance(j) > 0).length;
    const unscheduled = active.filter(j => !j.target_install_date).length;
    return { openInstalls: openInstalls.length, scheduledThisWeek, permitsPending, inspectionsPending, awaitingDelivery, depositsHeld, balanceDue, marginPct, emergencyOpen, unpaidCount, unscheduled };
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
    const activeJob = !['completed', 'lost'].includes(j.stage);
    if (queue === 'emergency' && !(j.emergency && activeJob)) return false;
    if (queue === 'unpaid' && jobBalance(j) <= 0) return false;
    if (queue === 'permits' && !(activeJob && ['pending', 'submitted'].includes(j.permit_status))) return false;
    if (queue === 'inspections' && !(activeJob && ['pending', 'scheduled'].includes(j.inspection_status))) return false;
    if (queue === 'equipment' && !(activeJob && j.equipment_status === 'ordered')) return false;
    if (queue === 'unscheduled' && !(activeJob && !j.target_install_date)) return false;
    if (search) {
      const client = clientForJob(j);
      const hay = [j.customer_name, client?.name, client?.company, client?.email, client?.phone, j.site_address, j.city, j.zip, j.generator_model, j.serial_number, j.utility_provider, j.notes]
        .filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(search.toLowerCase())) return false;
    }
    return true;
  }).sort((a, b) => Number(b.emergency) - Number(a.emergency) || String(b.created_at).localeCompare(String(a.created_at))),
  [live, stageFilter, typeFilter, queue, search, financeClients, clientById]);

  // Shared pagination for cards + table views (mobile-friendly footer below).
  const JOBS_PAGE_SIZE = 12;
  const jobsPageCount = Math.max(1, Math.ceil(filtered.length / JOBS_PAGE_SIZE));
  const safeJobsPage = Math.min(jobsPage, jobsPageCount);
  const pagedJobs = filtered.slice((safeJobsPage - 1) * JOBS_PAGE_SIZE, safeJobsPage * JOBS_PAGE_SIZE);
  useEffect(() => { setJobsPage(1); }, [stageFilter, typeFilter, queue, search, view]);

  const openJob = (j?: any) => {
    setForm(j ? {
      id: j.id, finance_client_id: j.finance_client_id ?? '', job_type: j.job_type, stage: j.stage,
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
      technician: j.technician ?? '', dispatch_status: j.dispatch_status ?? 'unassigned',
      warranty_status: j.warranty_status ?? '',
      target_install_date: j.target_install_date ?? '', completed_date: j.completed_date ?? '',
      notes: j.notes ?? '',
    } : { ...BLANK_JOB });
    setFormStep(0);
    setDialog(true);
  };

  const saveJob = async () => {
    if (!user?.id) return toast.error('Sign in required');
    if (!form.customer_name.trim()) return toast.error('Customer name is required');
    const row: any = {
      ...(form.id ? { id: form.id } : {}),
      user_id: user.id,
      entity_id: 'houston-generator-pros',
      finance_client_id: form.finance_client_id || null,
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
      ...(form.technician.trim() || form.dispatch_status !== 'unassigned'
        ? { technician: form.technician.trim() || null, dispatch_status: form.dispatch_status }
        : {}),
      warranty_status: form.warranty_status.trim() || null,
      target_install_date: form.target_install_date || null,
      completed_date: form.completed_date || null,
      notes: form.notes.trim() || null,
    };
    try {
      const saved: any = await upsertJob.mutateAsync(row);
      // A deposit entered on a NEW job becomes its first logged payment,
      // which the database mirrors straight into HGP income.
      if (!form.id && Number(form.deposit_amount) > 0 && saved?.id) {
        try {
          await insertPayment.mutateAsync({
            user_id: user.id,
            entity_id: 'houston-generator-pros',
            job_id: saved.id,
            payment_type: 'deposit',
            amount: Number(form.deposit_amount),
            payment_date: todayLocalDate(),
            method: 'other',
          });
          toast.success('Job created — deposit posted to HGP income');
        } catch {
          toast.info('Job created. Run migration 20260718000001 so deposits post to income automatically.');
        }
      } else {
        toast.success(form.id ? 'Job updated' : 'Job created');
      }
      setDialog(false);
    } catch (e: any) { toast.error(e.message); }
  };

  /* 8-week install planner: filtered jobs grouped into week buckets by
     target_install_date, with unscheduled active jobs called out. */
  const schedule = useMemo(() => {
    const startOfWeek = (d: Date) => {
      const x = new Date(d);
      x.setHours(0, 0, 0, 0);
      x.setDate(x.getDate() - x.getDay());
      return x;
    };
    const week0 = startOfWeek(new Date());
    const weeks = Array.from({ length: 8 }, (_, i) => {
      const start = new Date(week0.getTime() + i * 7 * 86400000);
      const end = new Date(start.getTime() + 6 * 86400000);
      return {
        key: start.toISOString().slice(0, 10),
        label: `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        isCurrent: i === 0,
        jobs: [] as any[],
      };
    });
    const unscheduled: any[] = [];
    const overdue: any[] = [];
    for (const j of filtered) {
      if (['completed', 'lost'].includes(j.stage)) continue;
      if (!j.target_install_date) { unscheduled.push(j); continue; }
      const t = new Date(j.target_install_date + 'T12:00:00');
      if (t < week0) { overdue.push(j); continue; }
      const idx = Math.floor((startOfWeek(t).getTime() - week0.getTime()) / (7 * 86400000));
      if (idx >= 0 && idx < 8) weeks[idx].jobs.push(j);
    }
    for (const w of weeks) w.jobs.sort((a, b) => String(a.target_install_date).localeCompare(String(b.target_install_date)) || Number(b.emergency) - Number(a.emergency));
    return { weeks, unscheduled, overdue };
  }, [filtered]);

  /* Model profitability from delivered work: jobs at commissioned or later
     with a quote and a model, grouped by generator model. */
  const modelProfitability = useMemo(() => {
    const groups: Record<string, { model: string; units: number; revenue: number; costs: number }> = {};
    for (const j of live) {
      if (!['commissioned', 'maintenance_enrolled', 'completed'].includes(j.stage)) continue;
      if (!j.generator_model || num(j.quoted_amount) <= 0) continue;
      const g = groups[j.generator_model] ?? (groups[j.generator_model] = { model: j.generator_model, units: 0, revenue: 0, costs: 0 });
      g.units += 1;
      g.revenue += num(j.quoted_amount);
      g.costs += jobCosts(j);
    }
    return Object.values(groups)
      .map(g => ({ ...g, margin: g.revenue - g.costs, marginPct: g.revenue > 0 ? ((g.revenue - g.costs) / g.revenue) * 100 : 0 }))
      .sort((a, b) => b.margin - a.margin);
  }, [live]);

  const jobPayments = useMemo(
    () => form.id ? (allPayments as any[]).filter(pm => pm.job_id === form.id) : [],
    [allPayments, form.id],
  );
  const paymentsTotal = jobPayments.reduce((sum, pm) => sum + num(pm.amount), 0);
  const collectedTotal = form.id && jobPayments.length ? paymentsTotal : num(form.deposit_amount);

  const logPayment = async () => {
    if (!user?.id || !form.id) return;
    const amount = Number(payForm.amount);
    if (!amount || amount <= 0) return toast.error('Enter a positive amount');
    try {
      await insertPayment.mutateAsync({
        user_id: user.id,
        entity_id: 'houston-generator-pros',
        job_id: form.id,
        payment_type: payForm.payment_type,
        amount,
        payment_date: payForm.payment_date,
        method: payForm.method,
        reference: payForm.reference.trim() || null,
      });
      toast.success(`${fmtUSD(amount)} logged — income entry created in HGP financials`);
      setPayForm({ ...BLANK_PAY });
    } catch (e: any) {
      toast.error(e.message?.includes('hgp_job_payments') ? 'Run migration 20260718000001 to enable job payments' : e.message);
    }
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
          {/* ── Metrics (facts) — queues (work) live in the row below ── */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
            {[
              ['Open Installs', String(kpis.openInstalls), `${kpis.scheduledThisWeek} scheduled next 7 days`, Zap, HGP_BLUE],
              ['Deposits Held', fmtUSD(kpis.depositsHeld), 'Collected on active jobs', Wallet, '#059669'],
              ['Balance Due', fmtUSD(kpis.balanceDue), 'Open receivable across jobs', Wallet, '#d97706'],
              ['Avg Job Margin', `${kpis.marginPct.toFixed(1)}%`, 'Quoted vs full job cost', Percent, HGP_BLUE],
            ].map(([label, value, sub, Icon, color]: any) => (
              <div key={label} className="hj-kpi !p-3" style={{ '--accent': color } as any}>
                <div className="flex items-center justify-between gap-1">
                  <div className="hj-k">{label}</div>
                  <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} strokeWidth={1.8} />
                </div>
                <div className="hj-v !text-[17px]">{value}</div>
                <div className="text-[8.5px] text-muted-foreground mt-0.5 truncate">{sub}</div>
              </div>
            ))}
          </div>

          {/* ── Action queues — click to work the list ── */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:overflow-x-auto scrollbar-none pb-0.5">
            <span className="hj-k w-full sm:w-auto shrink-0 mr-1">Queues</span>
            {[
              ['emergency', 'Emergency', kpis.emergencyOpen, Siren, '#dc2626'],
              ['unpaid', 'Unpaid Balance', kpis.unpaidCount, Wallet, '#d97706'],
              ['permits', 'Permits', kpis.permitsPending, FileCheck2, '#d97706'],
              ['inspections', 'Inspections', kpis.inspectionsPending, FileCheck2, '#0891b2'],
              ['equipment', 'Awaiting Equipment', kpis.awaitingDelivery, PackageCheck, '#7c3aed'],
              ['unscheduled', 'Needs Scheduling', kpis.unscheduled, CalendarClock, '#64748b'],
            ].map(([key, label, count, Icon, color]: any) => {
              const on = queue === key;
              return (
                <button key={key} className="hj-stage sm:shrink-0"
                  style={on ? { borderColor: color + '80', color, background: color + '10' } : count > 0 ? { color: 'hsl(var(--foreground))' } : undefined}
                  onClick={() => setQueue(q => q === key ? 'none' : key)}>
                  <Icon className="w-3 h-3" style={{ color: on || count > 0 ? color : undefined }} />
                  {label} <span className="font-mono-tab">{count}</span>
                </button>
              );
            })}
          </div>

          {/* ── Filters + view toggle — pipeline stage consolidated into one
              popover button instead of a 13-chip row, saving significant
              vertical space (was 2-3 wrapped rows on every screen size). ── */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px] max-w-[300px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Customer, address, model, serial…"
                className="w-full h-9 pl-7 pr-2.5 text-[16px] sm:text-[12px] border border-border bg-background outline-none focus:border-foreground/30" />
            </div>
            <Popover open={stageFilterOpen} onOpenChange={setStageFilterOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="hj-action gap-1.5"
                  style={stageFilter !== 'all' ? { borderColor: HGP_BLUE + '80', color: HGP_BLUE, background: HGP_BLUE + '0F' } : undefined}
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  Stage: {stageFilter === 'all' ? 'All' : (HGP_STAGES.find(s => s.key === stageFilter)?.label ?? stageFilter)}
                  <span className="font-mono-tab">{stageCounts[stageFilter] ?? stageCounts.all}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${stageFilterOpen ? 'rotate-180' : ''}`} />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[min(94vw,30rem)] p-3 rounded-none border-border z-[70]" align="start">
                <div className="hj-k mb-2 px-0.5">Filter by Pipeline Stage</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-[60vh] overflow-y-auto">
                  <button className="hj-stage justify-center" data-on={stageFilter === 'all'} onClick={() => { setStageFilter('all'); setStageFilterOpen(false); }}>
                    All <span className="font-mono-tab">{stageCounts.all}</span>
                  </button>
                  {HGP_STAGES.map(s => (
                    <button key={s.key} className="hj-stage justify-center" data-on={stageFilter === s.key} onClick={() => { setStageFilter(stageFilter === s.key ? 'all' : s.key); setStageFilterOpen(false); }}>
                      {s.label} <span className="font-mono-tab">{stageCounts[s.key] ?? 0}</span>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="rounded-none h-9 w-[130px] text-[11px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(JOB_TYPES).map(([k, m]) => <SelectItem key={k} value={k}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="ml-auto flex items-center gap-1">
              <button className="hj-action" style={view === 'cards' ? { borderColor: HGP_BLUE + '80', color: HGP_BLUE } : undefined} onClick={() => setView('cards')} title="Card view">
                <LayoutGrid className="w-3 h-3" />
              </button>
              <button className="hj-action" style={view === 'table' ? { borderColor: HGP_BLUE + '80', color: HGP_BLUE } : undefined} onClick={() => setView('table')} title="Table view">
                <Rows3 className="w-3 h-3" />
              </button>
              <button className="hj-action" style={view === 'schedule' ? { borderColor: HGP_BLUE + '80', color: HGP_BLUE } : undefined} onClick={() => setView('schedule')} title="8-week install schedule">
                <CalendarClock className="w-3 h-3" />
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
          ) : view === 'schedule' ? (
            <div className="space-y-2.5">
              {(schedule.overdue.length > 0 || schedule.unscheduled.length > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {schedule.overdue.length > 0 && (
                    <div className="hj-panel p-3 border-l-2" style={{ borderLeftColor: '#dc2626' }}>
                      <div className="hj-k mb-1.5" style={{ color: '#dc2626' }}>Past Target Date ({schedule.overdue.length})</div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {schedule.overdue.map(j => (
                          <button key={j.id} className="w-full text-left text-[11px] flex items-center justify-between gap-2 hover:bg-secondary/40 px-1.5 py-1" onClick={() => openJob(j)}>
                            <span className="font-bold truncate">{j.customer_name}</span>
                            <span className="text-[9px] text-destructive font-mono-tab shrink-0">{fmtDate(j.target_install_date)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {schedule.unscheduled.length > 0 && (
                    <div className="hj-panel p-3 border-l-2" style={{ borderLeftColor: '#d97706' }}>
                      <div className="hj-k mb-1.5" style={{ color: '#d97706' }}>Needs Scheduling ({schedule.unscheduled.length})</div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {schedule.unscheduled.map(j => (
                          <button key={j.id} className="w-full text-left text-[11px] flex items-center justify-between gap-2 hover:bg-secondary/40 px-1.5 py-1" onClick={() => openJob(j)}>
                            <span className="font-bold truncate">{j.customer_name}</span>
                            <StagePill stage={j.stage} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
                {schedule.weeks.map(w => (
                  <div key={w.key} className="hj-panel p-2.5 min-w-0" style={w.isCurrent ? { borderColor: HGP_BLUE + '66' } : undefined}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="hj-k" style={w.isCurrent ? { color: HGP_BLUE } : undefined}>{w.isCurrent ? 'This Week' : w.label}</div>
                      <span className="text-[9px] font-mono-tab text-muted-foreground">{w.jobs.length}</span>
                    </div>
                    <div className="space-y-1 min-h-[40px]">
                      {w.jobs.map(j => (
                        <button key={j.id} className="w-full text-left border border-border/70 px-1.5 py-1 hover:bg-secondary/40" onClick={() => openJob(j)}>
                          <div className="flex items-center gap-1 text-[10.5px] font-bold truncate">
                            {j.emergency && <Siren className="w-3 h-3 text-destructive shrink-0" />}
                            {j.customer_name}
                          </div>
                          <div className="text-[8.5px] text-muted-foreground truncate">
                            {new Date(j.target_install_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}
                            {j.generator_model ? ` · ${j.generator_model}` : ''}{j.city ? ` · ${j.city}` : ''}
                          </div>
                        </button>
                      ))}
                      {!w.jobs.length && <div className="text-[9px] text-muted-foreground/60 px-1 py-2">Open capacity</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : view === 'cards' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
              {pagedJobs.map(j => {
                const type = JOB_TYPES[j.job_type] ?? JOB_TYPES.install;
                const margin = jobMargin(j);
                const client = clientForJob(j);
                const clientLabel = client ? `${client.name}${client.company ? ` · ${client.company}` : ''}` : j.customer_name;
                const siteLine = [j.site_address || client?.site_address, j.city || client?.city, j.zip || client?.zip].filter(Boolean).join(', ');
                const contactLine = [client?.email || j.customer_email, client?.phone || j.customer_phone].filter(Boolean).join(' · ');
                return (
                  <div key={j.id} className="hj-card p-3 min-w-0" style={{ '--accent': type.color } as any} onClick={() => openJob(j)}>
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
                    <div className="hj-client-band mb-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <UserRound className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: HGP_BLUE }} />
                        <div className="min-w-0">
                          <div className="text-[10.5px] font-black truncate">{clientLabel}</div>
                          <div className="text-[9px] text-muted-foreground truncate">{contactLine || 'No linked client contact yet'}</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap mb-2">
                      <StagePill stage={j.stage} />
                      {j.generator_model && (
                        <span className="text-[9px] text-muted-foreground font-mono-tab truncate">
                          {j.generator_model}{j.kw_rating ? ` · ${num(j.kw_rating)}kW` : ''}{j.serial_number ? ` · SN ${j.serial_number}` : ''}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-2 min-w-0">
                      {siteLine && (
                        <span className="hj-mini-chip max-w-full normal-case tracking-normal text-[9px]">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{siteLine}</span>
                        </span>
                      )}
                      {(j.utility_provider || client?.utility_provider) && (
                        <span className="hj-mini-chip">{j.utility_provider || client.utility_provider}</span>
                      )}
                      {j.technician && <span className="hj-mini-chip">Tech: {j.technician}</span>}
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
                        {j.dispatch_status && j.dispatch_status !== 'unassigned' ? ` · ${titleCase(j.dispatch_status)}` : ''}
                      </span>
                      {j.target_install_date && <span className="font-mono-tab shrink-0">{fmtDate(j.target_install_date)}</span>}
                    </div>
                    {j.notes && (
                      <div className="hj-note mt-2 line-clamp-2">
                        <StickyNote className="w-3 h-3 inline mr-1 align-[-2px]" />
                        {j.notes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="hj-panel overflow-x-auto">
              <div className="min-w-[1020px]">
                <div className="hj-row grid grid-cols-[1.4fr_.8fr_.9fr_1fr_.8fr_.8fr_.8fr_.8fr_.7fr_.4fr] gap-2 bg-secondary/45 hj-k items-center cursor-default">
                  <div>Customer / Client</div><div>Type</div><div>Stage</div><div>Generator</div><div>Permit</div><div>Quoted</div><div>Balance</div><div>Margin</div><div>Install</div><div></div>
                </div>
                {pagedJobs.map(j => {
                  const type = JOB_TYPES[j.job_type] ?? JOB_TYPES.install;
                  const margin = jobMargin(j);
                  const client = clientForJob(j);
                  return (
                    <div key={j.id} className="hj-row grid grid-cols-[1.4fr_.8fr_.9fr_1fr_.8fr_.8fr_.8fr_.8fr_.7fr_.4fr] gap-2 items-center" onClick={() => openJob(j)}>
                      <div className="min-w-0">
                        <div className="font-bold truncate flex items-center gap-1">
                          {j.emergency && <Siren className="w-3 h-3 text-destructive shrink-0" />}{j.customer_name}
                        </div>
                        <div className="text-[9px] text-muted-foreground truncate">
                          {client ? `Client: ${client.name}${client.company ? ` · ${client.company}` : ''}` : [j.city, j.zip, j.utility_provider].filter(Boolean).join(' · ')}
                        </div>
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
          {filtered.length > 0 && view !== 'schedule' && filtered.length > JOBS_PAGE_SIZE && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
              <div className="text-[10px] text-muted-foreground font-mono-tab">
                Showing {(safeJobsPage - 1) * JOBS_PAGE_SIZE + 1}-{Math.min(safeJobsPage * JOBS_PAGE_SIZE, filtered.length)} of {filtered.length} jobs
              </div>
              <div className="flex items-center gap-1.5">
                <button className="hj-page-btn" onClick={() => setJobsPage(1)} disabled={safeJobsPage === 1}>First</button>
                <button className="hj-page-btn" onClick={() => setJobsPage(p => Math.max(1, p - 1))} disabled={safeJobsPage === 1}>Prev</button>
                <span className="px-2 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Page {safeJobsPage}/{jobsPageCount}</span>
                <button className="hj-page-btn" onClick={() => setJobsPage(p => Math.min(jobsPageCount, p + 1))} disabled={safeJobsPage === jobsPageCount}>Next</button>
                <button className="hj-page-btn" onClick={() => setJobsPage(jobsPageCount)} disabled={safeJobsPage === jobsPageCount}>Last</button>
              </div>
            </div>
          )}
          {/* ── Model profitability from delivered jobs ── */}
          {modelProfitability.length > 0 && (
            <div className="hj-panel p-3">
              <div className="hj-k mb-2">Model Profitability · Delivered Jobs</div>
              <div className="overflow-x-auto">
                <div className="min-w-[560px]">
                  <div className="hj-row grid grid-cols-[1.5fr_.5fr_.9fr_.9fr_.9fr_.6fr] gap-2 bg-secondary/45 hj-k items-center cursor-default">
                    <div>Model</div><div>Units</div><div>Revenue</div><div>Job Costs</div><div>Margin</div><div>%</div>
                  </div>
                  {modelProfitability.map(m => (
                    <div key={m.model} className="hj-row grid grid-cols-[1.5fr_.5fr_.9fr_.9fr_.9fr_.6fr] gap-2 items-center cursor-default">
                      <div className="font-bold truncate">{m.model}</div>
                      <div className="font-mono-tab">{m.units}</div>
                      <div className="font-mono-tab">{fmtUSD(m.revenue)}</div>
                      <div className="font-mono-tab">{fmtUSD(m.costs)}</div>
                      <div className={`font-mono-tab font-bold ${m.margin >= 0 ? 'text-positive' : 'text-destructive'}`}>{fmtUSD(m.margin)}</div>
                      <div className="font-mono-tab">{m.marginPct.toFixed(1)}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Job dialog — guided four-section flow ── */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-xl rounded-none max-h-[92vh] overflow-y-auto p-0">
          <div className="px-5 pt-4 pb-3 border-b border-border">
            <DialogHeader>
              <DialogTitle className="text-base">{form.id ? `Edit Job — ${form.customer_name || 'Untitled'}` : 'New Generator Job'}</DialogTitle>
            </DialogHeader>
            <div className="flex gap-1 mt-3">
              {['Customer & Site', 'Equipment', 'Status & Schedule', 'Financials'].map((label, i) => (
                <button key={label} type="button" onClick={() => setFormStep(i)}
                  className="flex-1 min-w-0 text-left group">
                  <div className="h-[3px] mb-1.5 transition-colors" style={{ backgroundColor: i <= formStep ? HGP_BLUE : 'hsl(var(--border))' }} />
                  <div className={`text-[8px] uppercase tracking-[0.12em] font-black truncate transition-colors ${i === formStep ? '' : 'text-muted-foreground group-hover:text-foreground/70'}`}
                    style={i === formStep ? { color: HGP_BLUE } : undefined}>
                    {label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="px-5 py-4 min-h-[280px]">
            {formStep === 0 && (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <div className="hj-k mb-1">Linked HGP Client Account</div>
                  <Select value={form.finance_client_id || '__none__'} onValueChange={v => {
                    const client = (financeClients as any[]).find(c => c.id === v);
                    setForm(f => ({
                      ...f,
                      finance_client_id: v === '__none__' ? '' : v,
                      ...(client ? {
                        customer_name: client.name ?? f.customer_name,
                        customer_email: client.email ?? f.customer_email,
                        customer_phone: client.phone ?? f.customer_phone,
                        site_address: client.site_address ?? f.site_address,
                        city: client.city ?? f.city,
                        county: client.county ?? f.county,
                        zip: client.zip ?? f.zip,
                        utility_provider: client.utility_provider ?? f.utility_provider,
                        generator_model: client.generator_model ?? f.generator_model,
                        serial_number: client.generator_serial ?? f.serial_number,
                        kw_rating: client.kw_rating != null ? String(client.kw_rating) : f.kw_rating,
                        fuel_type: client.fuel_type ?? f.fuel_type,
                      } : {}),
                    }));
                  }}>
                    <SelectTrigger className="hj-field !h-11"><SelectValue placeholder="No linked client" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No linked client</SelectItem>
                      {(financeClients as any[]).map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}{c.company ? ` · ${c.company}` : ''}{c.zip ? ` · ${c.zip}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="text-[9px] text-muted-foreground mt-1">
                    Selecting a client fills known contact, site, utility, and generator details.
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="hj-k mb-1">Customer *</div>
                  <Input autoFocus className="hj-field !h-11" placeholder="Full name" value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} />
                </div>
                <div>
                  <div className="hj-k mb-1">Phone</div>
                  <Input className="hj-field" value={form.customer_phone} onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))} />
                </div>
                <div>
                  <div className="hj-k mb-1">Email</div>
                  <Input className="hj-field" type="email" value={form.customer_email} onChange={e => setForm(f => ({ ...f, customer_email: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <div className="hj-k mb-1">Site Address</div>
                  <Input className="hj-field" value={form.site_address} onChange={e => setForm(f => ({ ...f, site_address: e.target.value }))} />
                </div>
                <div>
                  <div className="hj-k mb-1">City</div>
                  <Input className="hj-field" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="hj-k mb-1">ZIP</div>
                    <Input className="hj-field" inputMode="numeric" value={form.zip} onChange={e => setForm(f => ({ ...f, zip: e.target.value }))} />
                  </div>
                  <div>
                    <div className="hj-k mb-1">County</div>
                    <Input className="hj-field" value={form.county} onChange={e => setForm(f => ({ ...f, county: e.target.value }))} />
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="hj-k mb-1">Utility Provider</div>
                  <Input className="hj-field" placeholder="CenterPoint, Oncor, Entergy…" value={form.utility_provider} onChange={e => setForm(f => ({ ...f, utility_provider: e.target.value }))} />
                </div>
                <div>
                  <div className="hj-k mb-1">Job Type</div>
                  <Select value={form.job_type} onValueChange={v => setForm(f => ({ ...f, job_type: v, emergency: v === 'emergency' ? true : f.emergency }))}>
                    <SelectTrigger className="hj-field"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(JOB_TYPES).map(([k, m]) => <SelectItem key={k} value={k}>{m.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <label className="flex items-end gap-2 pb-2.5 text-xs font-semibold cursor-pointer select-none">
                  <input type="checkbox" className="w-4 h-4" checked={form.emergency} onChange={e => setForm(f => ({ ...f, emergency: e.target.checked }))} />
                  Emergency priority
                </label>
              </div>
            )}

            {formStep === 1 && (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <div className="hj-k mb-1">Assign From Inventory</div>
                  <Select value={form.equipment_unit_id || '__none__'} onValueChange={v => {
                    const u = (units as any[]).find(x => x.id === v);
                    setForm(f => ({
                      ...f,
                      equipment_unit_id: v === '__none__' ? '' : v,
                      // Pulling a unit from stock carries its identity onto the job.
                      ...(u ? {
                        generator_model: u.model ?? f.generator_model,
                        serial_number: u.serial_number ?? f.serial_number,
                        kw_rating: u.kw_rating != null ? String(u.kw_rating) : f.kw_rating,
                        fuel_type: u.fuel_type ?? f.fuel_type,
                        equipment_cost: num(u.unit_cost) ? String(u.unit_cost) : f.equipment_cost,
                      } : {}),
                    }));
                  }}>
                    <SelectTrigger className="hj-field"><SelectValue placeholder="No inventory unit — enter manually" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No inventory unit — enter manually</SelectItem>
                      {(units as any[]).filter(u => ['in_stock', 'reserved'].includes(u.status) || u.id === form.equipment_unit_id).map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.model}{u.serial_number ? ` · SN ${u.serial_number}` : ''} · {u.status.replace('_', ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="text-[9px] text-muted-foreground mt-1">
                    Selecting a stock unit fills the model, serial, kW, fuel, and equipment cost below.
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="hj-k mb-1">Generator Model</div>
                  <Input className="hj-field" placeholder="e.g. Generac Guardian 24kW" value={form.generator_model} onChange={e => setForm(f => ({ ...f, generator_model: e.target.value }))} />
                </div>
                <div>
                  <div className="hj-k mb-1">Serial #</div>
                  <Input className="hj-field font-mono-tab" value={form.serial_number} onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="hj-k mb-1">kW</div>
                    <Input className="hj-field" type="number" inputMode="decimal" value={form.kw_rating} onChange={e => setForm(f => ({ ...f, kw_rating: e.target.value }))} />
                  </div>
                  <div>
                    <div className="hj-k mb-1">Fuel</div>
                    <Select value={form.fuel_type} onValueChange={v => setForm(f => ({ ...f, fuel_type: v }))}>
                      <SelectTrigger className="hj-field"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="natural_gas">Nat. Gas</SelectItem>
                        <SelectItem value="propane">Propane</SelectItem>
                        <SelectItem value="diesel">Diesel</SelectItem>
                        <SelectItem value="bi_fuel">Bi-Fuel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <div className="hj-k mb-1">Transfer Switch</div>
                  <Input className="hj-field" value={form.transfer_switch} onChange={e => setForm(f => ({ ...f, transfer_switch: e.target.value }))} />
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
              </div>
            )}

            {formStep === 2 && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="hj-k mb-1">Pipeline Stage</div>
                  <Select value={form.stage} onValueChange={v => setForm(f => ({ ...f, stage: v }))}>
                    <SelectTrigger className="hj-field"><SelectValue /></SelectTrigger>
                    <SelectContent>{HGP_STAGES.map(st => <SelectItem key={st.key} value={st.key}>{st.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="hj-k mb-1">Target Install</div>
                  <Input className="hj-field" type="date" value={form.target_install_date} onChange={e => setForm(f => ({ ...f, target_install_date: e.target.value }))} />
                </div>
                <div>
                  <div className="hj-k mb-1">Permit</div>
                  <Select value={form.permit_status} onValueChange={v => setForm(f => ({ ...f, permit_status: v }))}>
                    <SelectTrigger className="hj-field"><SelectValue /></SelectTrigger>
                    <SelectContent>{PERMIT_STATUSES.map(st => <SelectItem key={st} value={st}>{titleCase(st)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="hj-k mb-1">Inspection</div>
                  <Select value={form.inspection_status} onValueChange={v => setForm(f => ({ ...f, inspection_status: v }))}>
                    <SelectTrigger className="hj-field"><SelectValue /></SelectTrigger>
                    <SelectContent>{INSPECTION_STATUSES.map(st => <SelectItem key={st} value={st}>{titleCase(st)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="hj-k mb-1">Equipment</div>
                  <Select value={form.equipment_status} onValueChange={v => setForm(f => ({ ...f, equipment_status: v }))}>
                    <SelectTrigger className="hj-field"><SelectValue /></SelectTrigger>
                    <SelectContent>{EQUIPMENT_STATUSES.map(st => <SelectItem key={st} value={st}>{titleCase(st)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="hj-k mb-1">Dispatch</div>
                  <Select value={form.dispatch_status} onValueChange={v => setForm(f => ({ ...f, dispatch_status: v }))}>
                    <SelectTrigger className="hj-field"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['unassigned', 'assigned', 'en_route', 'on_site', 'done'].map(st => (
                        <SelectItem key={st} value={st}>{titleCase(st)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="hj-k mb-1">Technician</div>
                  <Input className="hj-field" placeholder="Assigned tech" value={form.technician} onChange={e => setForm(f => ({ ...f, technician: e.target.value }))} />
                </div>
                <div>
                  <div className="hj-k mb-1">Completed Date</div>
                  <Input className="hj-field" type="date" value={form.completed_date} onChange={e => setForm(f => ({ ...f, completed_date: e.target.value }))} />
                </div>
                <label className="col-span-2 flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
                  <input type="checkbox" className="w-4 h-4" checked={form.maintenance_enrolled} onChange={e => setForm(f => ({ ...f, maintenance_enrolled: e.target.checked }))} />
                  Enrolled in maintenance plan
                </label>
                <div className="col-span-2">
                  <div className="hj-k mb-1">Notes</div>
                  <Textarea className="rounded-none text-xs" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
            )}

            {formStep === 3 && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="hj-k mb-1">Quoted Amount</div>
                    <Input className="hj-field !h-11 !text-[14px] font-mono-tab" type="number" inputMode="decimal" value={form.quoted_amount} onChange={e => setForm(f => ({ ...f, quoted_amount: e.target.value }))} />
                  </div>
                  {!form.id ? (
                    <div>
                      <div className="hj-k mb-1">Deposit Collected</div>
                      <Input className="hj-field !h-11 !text-[14px] font-mono-tab" type="number" inputMode="decimal" value={form.deposit_amount} onChange={e => setForm(f => ({ ...f, deposit_amount: e.target.value }))} />
                      <div className="text-[9px] text-muted-foreground mt-1">
                        Posts to HGP income as a Generator Deposit the moment the job is created.
                      </div>
                    </div>
                  ) : (
                    <div className="border border-border bg-secondary/25 px-3 flex flex-col justify-center py-2">
                      <div className="hj-k">Collected to Date</div>
                      <div className="font-mono-tab font-black text-[16px] text-positive">{fmtUSD(collectedTotal)}</div>
                      <div className="text-[9px] text-muted-foreground">{jobPayments.length} payment{jobPayments.length === 1 ? '' : 's'} logged below</div>
                    </div>
                  )}
                </div>

                {form.id && (
                  <div className="border border-border">
                    <div className="px-3 py-2 bg-secondary/30 border-b border-border flex items-center justify-between">
                      <div className="hj-k">Payments Received</div>
                      <div className="text-[9px] text-muted-foreground">Each payment posts to HGP income automatically</div>
                    </div>
                    {jobPayments.length > 0 && (
                      <div className="divide-y divide-border/60 max-h-36 overflow-y-auto">
                        {jobPayments.map(pm => (
                          <div key={pm.id} className="px-3 py-1.5 flex items-center gap-2 text-[11px]">
                            <span className="text-[8px] font-black uppercase tracking-[0.12em] px-1.5 py-0.5 shrink-0"
                              style={{ backgroundColor: HGP_BLUE + '14', color: HGP_BLUE }}>
                              {pm.payment_type}
                            </span>
                            <span className="text-muted-foreground shrink-0">{fmtDate(pm.payment_date)}</span>
                            <span className="text-muted-foreground truncate flex-1 capitalize">{String(pm.method).replace('_', ' ')}{pm.reference ? ` · ${pm.reference}` : ''}</span>
                            <span className="font-mono-tab font-bold shrink-0">{fmtUSD(num(pm.amount))}</span>
                            <button className="p-1 text-muted-foreground hover:text-destructive shrink-0" title="Void payment (voids its income entry)"
                              onClick={() => { if (confirm('Void this payment? Its income entry will be voided too.')) voidPayment.mutate(pm.id, { onSuccess: () => toast.success('Payment voided — income entry voided') }); }}>
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="p-3 border-t border-border/60 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <Select value={payForm.payment_type} onValueChange={v => setPayForm(f => ({ ...f, payment_type: v }))}>
                        <SelectTrigger className="hj-field !h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['deposit', 'progress', 'final', 'financing', 'other'].map(t => (
                            <SelectItem key={t} value={t}>{titleCase(t)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input className="hj-field !h-10 font-mono-tab" type="number" inputMode="decimal" placeholder="Amount"
                        value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') logPayment(); }} />
                      <Input className="hj-field !h-10" type="date" value={payForm.payment_date} onChange={e => setPayForm(f => ({ ...f, payment_date: e.target.value }))} />
                      <Select value={payForm.method} onValueChange={v => setPayForm(f => ({ ...f, method: v }))}>
                        <SelectTrigger className="hj-field !h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[['check', 'Check'], ['ach_wire', 'ACH / Wire'], ['credit_card', 'Card'], ['cash', 'Cash'], ['financing', 'Financing'], ['other', 'Other']].map(([v, l]) => (
                            <SelectItem key={v} value={v}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input className="hj-field !h-10 col-span-2 sm:col-span-3" placeholder="Reference / check # (optional)"
                        value={payForm.reference} onChange={e => setPayForm(f => ({ ...f, reference: e.target.value }))} />
                      <button className="hj-primary !h-10 col-span-2 sm:col-span-1" onClick={logPayment} disabled={insertPayment.isPending}>
                        Log Payment
                      </button>
                    </div>
                  </div>
                )}
                <div>
                  <div className="hj-k mb-2">Job Costs</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[['equipment_cost', 'Equipment'], ['labor_cost', 'Labor'], ['materials_cost', 'Materials'],
                      ['subcontractor_cost', 'Subcontractor'], ['permit_cost', 'Permit / Inspection']].map(([k, label]) => (
                      <div key={k}>
                        <div className="hj-k mb-1">{label}</div>
                        <Input className="hj-field font-mono-tab" type="number" inputMode="decimal" value={(form as any)[k]}
                          onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
                      </div>
                    ))}
                  </div>
                  <div className="text-[9px] text-muted-foreground mt-1.5">
                    Parts consumed from Inventory add to Materials automatically.
                  </div>
                </div>
                <div className="grid grid-cols-3 divide-x divide-border border border-border bg-secondary/25">
                  {[
                    ['Balance Due', fmtUSD(Math.max(num(form.quoted_amount) - collectedTotal, 0)), num(form.quoted_amount) - collectedTotal > 0 ? 'text-warning' : 'text-positive'],
                    ['Gross Margin', fmtUSD(formMargin), formMargin >= 0 ? 'text-positive' : 'text-destructive'],
                    ['Margin %', num(form.quoted_amount) > 0 ? `${((formMargin / num(form.quoted_amount)) * 100).toFixed(1)}%` : '—', formMargin >= 0 ? 'text-positive' : 'text-destructive'],
                  ].map(([label, value, cls]: any) => (
                    <div key={label} className="px-3 py-2 text-center">
                      <div className="hj-k">{label}</div>
                      <div className={`font-mono-tab font-black text-[15px] mt-0.5 ${cls}`}>{value}</div>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="hj-k mb-1">Warranty Status</div>
                  <Input className="hj-field" placeholder="e.g. 5-year Generac registered" value={form.warranty_status} onChange={e => setForm(f => ({ ...f, warranty_status: e.target.value }))} />
                </div>
              </div>
            )}
          </div>

          <div className="px-5 py-3.5 border-t border-border bg-background sticky bottom-0 flex items-center gap-2">
            {form.id && (
              <button className="hj-action !h-9 px-3 !text-destructive" onClick={() => {
                if (confirm('Remove this job?')) deleteJob.mutate(form.id, { onSuccess: () => { toast.success('Job removed'); setDialog(false); } });
              }}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <div className="flex-1" />
            {formStep > 0 && (
              <button className="hj-action !h-9 px-4" onClick={() => setFormStep(v => v - 1)}>Back</button>
            )}
            {formStep < 3 ? (
              <>
                <button className="hj-action !h-9 px-4" onClick={saveJob} disabled={upsertJob.isPending}>
                  {form.id ? 'Save' : 'Save Draft'}
                </button>
                <button className="hj-primary !h-9 px-5" onClick={() => setFormStep(v => v + 1)}>Continue</button>
              </>
            ) : (
              <button className="hj-primary !h-9 px-5" onClick={saveJob} disabled={upsertJob.isPending}>
                {form.id ? 'Save Job' : 'Create Job'}
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
