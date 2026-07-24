/* ── Estimating ───────────────────────────────────────────────────────────
   Full estimate builder: trade line items (with per-trade quick templates),
   material/labor/equipment unit costs, waste %, then the pricing waterfall —
   direct cost → overhead → contingency → permits → markup → tax → sell
   price with live margin. Accepted estimates convert to delivery projects
   with contract value + budget seeded automatically. ── */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ArrowUpRight, Calculator, FileText, Plus, Trash2 } from 'lucide-react';
import { fmtUSD } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';
import {
  estimateLineDirectCost, estimateTotals,
  useConvertEstimateToProject, useDeleteEstimate, useDeleteEstimateLine,
  useEstimates, useUpsertEstimate, useUpsertEstimateLine,
  type Estimate, type EstimateLine,
} from '@/hooks/useErp';

const PROJECT_TYPES = [
  ['residential', 'Residential'], ['commercial', 'Commercial'], ['remodel', 'Remodel'],
  ['ground_up', 'Ground-Up'], ['tenant_finish', 'Tenant Finish'],
  ['insurance_restoration', 'Insurance Restoration'], ['government', 'Government'],
] as const;

const TRADES = [
  'general', 'sitework', 'demolition', 'utilities', 'concrete', 'framing',
  'roofing', 'electrical', 'plumbing', 'hvac', 'drywall', 'painting',
  'millwork', 'finish_carpentry',
];

const STATUS_STYLE: Record<Estimate['status'], { fg: string; bg: string }> = {
  draft:     { fg: '#6B7280', bg: '#6B728014' },
  sent:      { fg: '#2563EB', bg: '#2563EB12' },
  accepted:  { fg: '#16A34A', bg: '#16A34A12' },
  rejected:  { fg: '#DC2626', bg: '#DC262612' },
  expired:   { fg: '#D97706', bg: '#D9770612' },
  converted: { fg: '#7C3AED', bg: '#7C3AED12' },
};

/* Per-trade starter lines — typical scope skeletons the estimator then
   quantifies with real takeoff numbers. */
const TRADE_TEMPLATES: Record<string, Omit<EstimateLine, 'id' | 'estimate_id' | 'cost_code_id' | 'sort_order'>[]> = {
  concrete: [
    { trade: 'concrete', description: 'Foundation slab — 4" 3000psi w/ rebar', quantity: 0, unit: 'sf', unit_material_cost: 3.25, unit_labor_cost: 2.75, unit_equipment_cost: 0.5, waste_pct: 8 },
    { trade: 'concrete', description: 'Flatwork — driveway / walkways', quantity: 0, unit: 'sf', unit_material_cost: 2.9, unit_labor_cost: 2.4, unit_equipment_cost: 0.35, waste_pct: 8 },
  ],
  framing: [
    { trade: 'framing', description: 'Wall framing — 2x4 @16" OC incl. plates', quantity: 0, unit: 'lf', unit_material_cost: 6.5, unit_labor_cost: 5.5, unit_equipment_cost: 0, waste_pct: 10 },
    { trade: 'framing', description: 'Roof framing / trusses set', quantity: 0, unit: 'sf', unit_material_cost: 4.75, unit_labor_cost: 3.25, unit_equipment_cost: 0.6, waste_pct: 7 },
  ],
  roofing: [
    { trade: 'roofing', description: 'Architectural shingles incl. underlayment', quantity: 0, unit: 'sq', unit_material_cost: 145, unit_labor_cost: 95, unit_equipment_cost: 10, waste_pct: 12 },
    { trade: 'roofing', description: 'Flashing, drip edge & ridge vent', quantity: 0, unit: 'lf', unit_material_cost: 3.5, unit_labor_cost: 2.75, unit_equipment_cost: 0, waste_pct: 5 },
  ],
  electrical: [
    { trade: 'electrical', description: 'Rough-in wiring per opening', quantity: 0, unit: 'ea', unit_material_cost: 38, unit_labor_cost: 62, unit_equipment_cost: 0, waste_pct: 5 },
    { trade: 'electrical', description: 'Panel — 200A service upgrade', quantity: 0, unit: 'ea', unit_material_cost: 850, unit_labor_cost: 1100, unit_equipment_cost: 0, waste_pct: 0 },
  ],
  plumbing: [
    { trade: 'plumbing', description: 'Rough-in per fixture', quantity: 0, unit: 'ea', unit_material_cost: 210, unit_labor_cost: 340, unit_equipment_cost: 0, waste_pct: 5 },
    { trade: 'plumbing', description: 'Water heater — 50gal install', quantity: 0, unit: 'ea', unit_material_cost: 780, unit_labor_cost: 420, unit_equipment_cost: 0, waste_pct: 0 },
  ],
  hvac: [
    { trade: 'hvac', description: 'Ducted split system per ton', quantity: 0, unit: 'ton', unit_material_cost: 1150, unit_labor_cost: 850, unit_equipment_cost: 60, waste_pct: 3 },
  ],
  drywall: [
    { trade: 'drywall', description: 'Hang, tape & finish — level 4', quantity: 0, unit: 'sf', unit_material_cost: 0.65, unit_labor_cost: 1.15, unit_equipment_cost: 0, waste_pct: 10 },
  ],
  painting: [
    { trade: 'painting', description: 'Interior — walls & ceilings, 2 coats', quantity: 0, unit: 'sf', unit_material_cost: 0.38, unit_labor_cost: 0.95, unit_equipment_cost: 0, waste_pct: 8 },
    { trade: 'painting', description: 'Exterior — body & trim', quantity: 0, unit: 'sf', unit_material_cost: 0.55, unit_labor_cost: 1.35, unit_equipment_cost: 0.1, waste_pct: 8 },
  ],
  demolition: [
    { trade: 'demolition', description: 'Interior demo incl. haul-off', quantity: 0, unit: 'sf', unit_material_cost: 0.15, unit_labor_cost: 1.9, unit_equipment_cost: 0.55, waste_pct: 0 },
  ],
  sitework: [
    { trade: 'sitework', description: 'Clear, grub & rough grade', quantity: 0, unit: 'sf', unit_material_cost: 0.1, unit_labor_cost: 0.45, unit_equipment_cost: 0.65, waste_pct: 0 },
  ],
  utilities: [
    { trade: 'utilities', description: 'Water/sewer tap & trench', quantity: 0, unit: 'lf', unit_material_cost: 12, unit_labor_cost: 18, unit_equipment_cost: 9, waste_pct: 5 },
  ],
  millwork: [
    { trade: 'millwork', description: 'Cabinetry — supply & install', quantity: 0, unit: 'lf', unit_material_cost: 185, unit_labor_cost: 65, unit_equipment_cost: 0, waste_pct: 3 },
  ],
  finish_carpentry: [
    { trade: 'finish_carpentry', description: 'Base, casing & door hang', quantity: 0, unit: 'lf', unit_material_cost: 3.4, unit_labor_cost: 4.1, unit_equipment_cost: 0, waste_pct: 10 },
  ],
};

function nextEstimateNumber(existing: Estimate[]): string {
  const year = new Date().getFullYear();
  const seq = existing.filter(e => e.estimate_number?.includes(String(year))).length + 1;
  return `EST-${year}-${String(seq).padStart(3, '0')}`;
}

export default function Estimates() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: estimates = [], isLoading } = useEstimates();
  const upsertEstimate = useUpsertEstimate();
  const deleteEstimate = useDeleteEstimate();
  const upsertLine = useUpsertEstimateLine();
  const deleteLine = useDeleteEstimateLine();
  const convert = useConvertEstimateToProject();

  const [openId, setOpenId] = useState<string | null>(null);
  const [templateTrade, setTemplateTrade] = useState('concrete');

  const open = useMemo(() => estimates.find(e => e.id === openId) ?? null, [estimates, openId]);
  const lines = useMemo(
    () => [...(open?.finance_estimate_lines ?? [])].sort((a, b) => a.sort_order - b.sort_order || a.description.localeCompare(b.description)),
    [open],
  );
  const totals = useMemo(() => open ? estimateTotals(open, lines) : null, [open, lines]);

  const patchEstimate = (patch: Partial<Estimate>) => {
    if (!open) return;
    upsertEstimate.mutate({ id: open.id, ...patch });
  };

  const patchLine = (line: EstimateLine, patch: Partial<EstimateLine>) => {
    upsertLine.mutate({ ...line, ...patch });
  };

  const addBlankLine = () => {
    if (!open) return;
    upsertLine.mutate({
      estimate_id: open.id, trade: 'general', description: 'New line item',
      quantity: 1, unit: 'ls', unit_material_cost: 0, unit_labor_cost: 0,
      unit_equipment_cost: 0, waste_pct: 0, sort_order: lines.length,
    });
  };

  const applyTemplate = async () => {
    if (!open) return;
    const tpl = TRADE_TEMPLATES[templateTrade] ?? [];
    for (const [i, t] of tpl.entries()) {
      await upsertLine.mutateAsync({ estimate_id: open.id, ...t, sort_order: lines.length + i });
    }
    toast({ title: `Added ${tpl.length} ${templateTrade.replace(/_/g, ' ')} template line${tpl.length === 1 ? '' : 's'}` });
  };

  const createEstimate = async () => {
    const created: any = await upsertEstimate.mutateAsync({
      estimate_number: nextEstimateNumber(estimates),
      title: 'Untitled Estimate',
      project_type: 'residential',
      status: 'draft',
      markup_pct: 15, overhead_pct: 8, contingency_pct: 5, tax_pct: 0, permit_allowance: 0,
    });
    if (created?.id) setOpenId(created.id);
  };

  const handleConvert = async () => {
    if (!open) return;
    const project: any = await convert.mutateAsync(open);
    toast({ title: 'Project created from estimate', description: `${open.title} → contract ${fmtUSD(estimateTotals(open, lines).total)}` });
    if (project?.id) navigate(`/projects/${project.id}`);
  };

  /* ── Builder view ── */
  if (open && totals) {
    const cellCls = 'rounded-none h-8 text-xs font-mono-tab px-2';
    return (
      <AppShell>
        <PageHeader
          eyebrow={open.estimate_number}
          title={open.title}
          description="Line-item takeoff with the full pricing waterfall — every field saves as you leave it."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" className="rounded-none" onClick={() => setOpenId(null)}>
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> All Estimates
              </Button>
              {open.status !== 'converted' && (
                <Button className="rounded-none" onClick={handleConvert} disabled={convert.isPending || totals.total <= 0}>
                  Convert to Project <ArrowUpRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              )}
            </div>
          }
        />

        {/* Header fields */}
        <div className="border border-border bg-background p-4 mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="col-span-2 space-y-1"><Label className="micro-label">Title</Label>
            <Input className="rounded-none h-9 text-sm" defaultValue={open.title} onBlur={e => e.target.value !== open.title && patchEstimate({ title: e.target.value })} /></div>
          <div className="space-y-1"><Label className="micro-label">Project Type</Label>
            <Select value={open.project_type} onValueChange={v => patchEstimate({ project_type: v })}>
              <SelectTrigger className="rounded-none h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{PROJECT_TYPES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
            </Select></div>
          <div className="space-y-1"><Label className="micro-label">Status</Label>
            <Select value={open.status} onValueChange={v => patchEstimate({ status: v as Estimate['status'] })}>
              <SelectTrigger className="rounded-none h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.keys(STATUS_STYLE).map(s => <SelectItem key={s} value={s} disabled={s === 'converted'}>{s}</SelectItem>)}</SelectContent>
            </Select></div>
          <div className="space-y-1"><Label className="micro-label">Client</Label>
            <Input className="rounded-none h-9 text-sm" defaultValue={open.client_name ?? ''} onBlur={e => patchEstimate({ client_name: e.target.value })} /></div>
          <div className="space-y-1"><Label className="micro-label">Client Email</Label>
            <Input className="rounded-none h-9 text-sm" defaultValue={open.client_email ?? ''} onBlur={e => patchEstimate({ client_email: e.target.value })} /></div>
          <div className="col-span-2 space-y-1"><Label className="micro-label">Property Address</Label>
            <Input className="rounded-none h-9 text-sm" defaultValue={open.property_address ?? ''} onBlur={e => patchEstimate({ property_address: e.target.value })} /></div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 mb-8 items-start">
          {/* Lines */}
          <div className="xl:col-span-8 border border-border bg-background">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-border">
              <span className="text-sm font-bold">Line Items ({lines.length})</span>
              <div className="flex items-center gap-2">
                <Select value={templateTrade} onValueChange={setTemplateTrade}>
                  <SelectTrigger className="rounded-none h-8 text-xs w-[150px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.keys(TRADE_TEMPLATES).map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                </Select>
                <Button size="sm" variant="outline" className="rounded-none h-8 text-[11px]" onClick={applyTemplate}>+ Template</Button>
                <Button size="sm" className="rounded-none h-8 text-[11px]" onClick={addBlankLine}><Plus className="w-3 h-3 mr-1" /> Line</Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[860px]">
                <div className="grid grid-cols-[1.1fr_2.2fr_.6fr_.5fr_.8fr_.8fr_.8fr_.55fr_.9fr_36px] gap-1.5 px-3 py-2 border-b border-border micro-label">
                  <span>Trade</span><span>Description</span><span>Qty</span><span>Unit</span>
                  <span>Material</span><span>Labor</span><span>Equip</span><span>Waste%</span>
                  <span className="text-right">Line Total</span><span />
                </div>
                {lines.map(l => (
                  <div key={l.id} className="grid grid-cols-[1.1fr_2.2fr_.6fr_.5fr_.8fr_.8fr_.8fr_.55fr_.9fr_36px] gap-1.5 px-3 py-1.5 border-b border-border last:border-b-0 items-center">
                    <Select value={l.trade} onValueChange={v => patchLine(l, { trade: v })}>
                      <SelectTrigger className="rounded-none h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{TRADES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input className="rounded-none h-8 text-xs" defaultValue={l.description} onBlur={e => e.target.value !== l.description && patchLine(l, { description: e.target.value })} />
                    <Input type="number" className={cellCls} defaultValue={l.quantity} onBlur={e => patchLine(l, { quantity: Number(e.target.value) })} />
                    <Input className={cellCls} defaultValue={l.unit} onBlur={e => patchLine(l, { unit: e.target.value })} />
                    <Input type="number" className={cellCls} defaultValue={l.unit_material_cost} onBlur={e => patchLine(l, { unit_material_cost: Number(e.target.value) })} />
                    <Input type="number" className={cellCls} defaultValue={l.unit_labor_cost} onBlur={e => patchLine(l, { unit_labor_cost: Number(e.target.value) })} />
                    <Input type="number" className={cellCls} defaultValue={l.unit_equipment_cost} onBlur={e => patchLine(l, { unit_equipment_cost: Number(e.target.value) })} />
                    <Input type="number" className={cellCls} defaultValue={l.waste_pct} onBlur={e => patchLine(l, { waste_pct: Number(e.target.value) })} />
                    <span className="text-xs font-bold font-mono-tab text-right">{fmtUSD(estimateLineDirectCost(l))}</span>
                    <button onClick={() => deleteLine.mutate(l.id)} className="flex items-center justify-center w-7 h-7 text-muted-foreground hover:text-red-600" aria-label="Delete line">
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />
                    </button>
                  </div>
                ))}
                {lines.length === 0 && (
                  <div className="px-4 py-10 text-center text-xs text-muted-foreground">
                    No line items yet — add a trade template or a blank line.
                  </div>
                )}
              </div>
            </div>
            <div className="px-4 py-3 border-t border-border">
              <Label className="micro-label mb-1 block">Scope Notes</Label>
              <Textarea className="rounded-none text-xs min-h-[64px]" defaultValue={open.notes ?? ''} onBlur={e => patchEstimate({ notes: e.target.value })}
                placeholder="Inclusions, exclusions, allowances, alternates…" />
            </div>
          </div>

          {/* Pricing waterfall */}
          <div className="xl:col-span-4 border border-border bg-background sticky top-4">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <Calculator className="w-4 h-4 text-muted-foreground" strokeWidth={1.8} />
              <span className="text-sm font-bold">Pricing Waterfall</span>
            </div>
            <div className="p-4 space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Direct cost (incl. waste)</span><span className="font-mono-tab font-semibold">{fmtUSD(totals.direct)}</span></div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground shrink-0">Overhead</span>
                <span className="flex items-center gap-1.5">
                  <Input type="number" className="rounded-none h-7 w-14 text-xs font-mono-tab px-1.5" defaultValue={open.overhead_pct} onBlur={e => patchEstimate({ overhead_pct: Number(e.target.value) })} />%
                  <span className="font-mono-tab font-semibold w-20 text-right">{fmtUSD(totals.overhead)}</span>
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground shrink-0">Contingency</span>
                <span className="flex items-center gap-1.5">
                  <Input type="number" className="rounded-none h-7 w-14 text-xs font-mono-tab px-1.5" defaultValue={open.contingency_pct} onBlur={e => patchEstimate({ contingency_pct: Number(e.target.value) })} />%
                  <span className="font-mono-tab font-semibold w-20 text-right">{fmtUSD(totals.contingency)}</span>
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground shrink-0">Permit allowance</span>
                <Input type="number" className="rounded-none h-7 w-24 text-xs font-mono-tab px-1.5 text-right" defaultValue={open.permit_allowance} onBlur={e => patchEstimate({ permit_allowance: Number(e.target.value) })} />
              </div>
              <div className="flex justify-between pt-2 border-t border-border"><span className="font-semibold">Total cost basis</span><span className="font-mono-tab font-bold">{fmtUSD(totals.subtotalCost)}</span></div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground shrink-0">Markup / profit</span>
                <span className="flex items-center gap-1.5">
                  <Input type="number" className="rounded-none h-7 w-14 text-xs font-mono-tab px-1.5" defaultValue={open.markup_pct} onBlur={e => patchEstimate({ markup_pct: Number(e.target.value) })} />%
                  <span className="font-mono-tab font-semibold w-20 text-right text-emerald-600">{fmtUSD(totals.markup)}</span>
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground shrink-0">Sales tax</span>
                <span className="flex items-center gap-1.5">
                  <Input type="number" className="rounded-none h-7 w-14 text-xs font-mono-tab px-1.5" defaultValue={open.tax_pct} onBlur={e => patchEstimate({ tax_pct: Number(e.target.value) })} />%
                  <span className="font-mono-tab font-semibold w-20 text-right">{fmtUSD(totals.tax)}</span>
                </span>
              </div>
              <div className="flex justify-between items-baseline pt-3 mt-1 border-t-2 border-foreground">
                <span className="text-sm font-black uppercase tracking-wide">Sell Price</span>
                <span className="text-xl font-black font-mono-tab">{fmtUSD(totals.total)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Blended margin</span>
                <span className={`font-bold font-mono-tab ${totals.margin < 8 ? 'text-red-600' : totals.margin < 12 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {totals.margin.toFixed(1)}%
                </span>
              </div>
              {totals.margin > 0 && totals.margin < 8 && (
                <div className="text-[10px] text-red-600 bg-red-50 border border-red-200 px-2.5 py-1.5">
                  Margin below 8% — raise markup or trim scope before sending.
                </div>
              )}
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  /* ── List view ── */
  return (
    <AppShell>
      <PageHeader
        eyebrow="Preconstruction"
        title="Estimates"
        description="Build priced proposals from trade templates, track them through acceptance, and convert wins straight into delivery projects."
        actions={<Button className="rounded-none" onClick={createEstimate} disabled={upsertEstimate.isPending}><Plus className="w-3.5 h-3.5 mr-1.5" /> New Estimate</Button>}
      />
      <div className="border border-border bg-background mb-8">
        <div className="hidden md:grid grid-cols-[1fr_2fr_1fr_1fr_1fr_1fr_90px] gap-3 px-4 py-2.5 border-b border-border micro-label">
          <span>Number</span><span>Title / Client</span><span>Type</span><span>Status</span>
          <span className="text-right">Sell Price</span><span className="text-right">Margin</span><span />
        </div>
        {isLoading && <div className="px-4 py-10 text-center text-xs text-muted-foreground">Loading estimates…</div>}
        {!isLoading && estimates.length === 0 && (
          <div className="px-4 py-14 text-center">
            <FileText className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" strokeWidth={1.2} />
            <div className="text-sm font-semibold mb-1">No estimates yet</div>
            <div className="text-xs text-muted-foreground">Create your first estimate and start from a trade template.</div>
          </div>
        )}
        {estimates.map(e => {
          const t = estimateTotals(e, e.finance_estimate_lines ?? []);
          const st = STATUS_STYLE[e.status];
          return (
            <div key={e.id} className="grid grid-cols-2 md:grid-cols-[1fr_2fr_1fr_1fr_1fr_1fr_90px] gap-2 md:gap-3 px-4 py-3 border-b border-border last:border-b-0 items-center cursor-pointer hover:bg-secondary/40 transition-colors"
              onClick={() => setOpenId(e.id)}>
              <span className="text-xs font-bold font-mono-tab">{e.estimate_number}</span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold truncate">{e.title}</span>
                <span className="block text-[10px] text-muted-foreground truncate">{e.client_name || 'No client'} {e.property_address ? `· ${e.property_address}` : ''}</span>
              </span>
              <span className="text-xs text-muted-foreground capitalize hidden md:block">{e.project_type.replace(/_/g, ' ')}</span>
              <span><span className="inline-block px-2 py-0.5 text-[9px] font-black uppercase tracking-wide" style={{ color: st.fg, backgroundColor: st.bg }}>{e.status}</span></span>
              <span className="text-sm font-bold font-mono-tab text-right">{fmtUSD(t.total)}</span>
              <span className="text-xs font-mono-tab text-right hidden md:block">{t.margin.toFixed(1)}%</span>
              <span className="flex justify-end">
                <button onClick={ev => { ev.stopPropagation(); if (window.confirm(`Delete ${e.estimate_number}?`)) deleteEstimate.mutate(e.id); }}
                  className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-red-600" aria-label="Delete estimate">
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />
                </button>
              </span>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
