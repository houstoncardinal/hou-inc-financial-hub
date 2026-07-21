import { useMemo, useState } from 'react';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProjects, useFixedAssets, useUpsert, useDelete } from '@/hooks/useFinance';
import { useCapitalActivity, useConsolidatedEntityTotals, useHoldingsBalanceSheet, useHoldingsNotes } from '@/hooks/useEntityOps';
import { useAuth } from '@/hooks/useAuth';
import { ENTITIES } from '@/contexts/EntityContext';
import { fmtDate, fmtUSD } from '@/lib/format';
import { usePagination } from '@/hooks/usePagination';
import { PaginationBar } from '@/components/PaginationBar';
import { toast } from 'sonner';
import {
  ArrowLeftRight, BarChart3, Building2, CircleDollarSign, Landmark,
  Layers3, Pencil, Plus, Scale, ShieldCheck, Trash2,
} from 'lucide-react';

const HEH = '#2C5F8A';

const ASSET_CSS = `
.asset-shell{background:linear-gradient(180deg,rgba(44,95,138,.055),transparent 210px);}
.asset-panel{background:hsl(var(--background));border:1px solid hsl(var(--border));box-shadow:0 1px 3px rgba(10,10,10,.05),0 1px 0 rgba(255,255,255,.45) inset;}
.asset-card{background:hsl(var(--background));border:1px solid hsl(var(--border));box-shadow:0 1px 3px rgba(10,10,10,.045);position:relative;overflow:hidden;}
.asset-card:before{content:"";position:absolute;inset:0 0 auto 0;height:2px;background:var(--accent,#2C5F8A);}
.asset-k{font-size:8px;text-transform:uppercase;letter-spacing:.18em;font-weight:900;color:hsl(var(--muted-foreground));white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.asset-v{font-size:18px;line-height:1.05;font-weight:950;margin-top:6px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.asset-sub{font-size:10px;color:hsl(var(--muted-foreground));margin-top:5px;line-height:1.25;}
.asset-row{border-bottom:1px solid hsl(var(--border));padding:10px 12px;font-size:12px;}
.asset-row:hover{background:hsl(var(--secondary)/.35);}
.asset-action{height:30px;border:1px solid hsl(var(--border));background:hsl(var(--background));padding:0 9px;font-size:8.5px;text-transform:uppercase;letter-spacing:.12em;font-weight:900;display:inline-flex;align-items:center;gap:5px;}
.asset-primary{height:34px;background:hsl(var(--foreground));color:hsl(var(--background));padding:0 13px;font-size:9px;text-transform:uppercase;letter-spacing:.14em;font-weight:900;display:inline-flex;align-items:center;justify-content:center;gap:6px;}
.asset-pill{font-size:8px;text-transform:uppercase;letter-spacing:.14em;font-weight:900;border:1px solid hsl(var(--border));background:hsl(var(--secondary)/.35);padding:3px 6px;white-space:nowrap;}
@media(max-width:767px){.asset-v{font-size:15px}.asset-panel{padding:12px!important}.asset-row{padding:9px 10px}}
.dark .asset-panel,.dark .asset-card,.dark .asset-action{background:hsl(var(--card));box-shadow:0 1px 4px rgba(0,0,0,.28),0 1px 0 rgba(255,255,255,.05) inset;}
`;

const num = (v: unknown) => Number(v || 0);
const entityName = (id?: string | null) => ENTITIES.find(e => e.id === id)?.shortName ?? id ?? 'External';

function Metric({ label, value, sub, icon: Icon, color = HEH }: any) {
  return (
    <div className="asset-card p-3 min-w-0" style={{ '--accent': color } as any}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="asset-k">{label}</div>
          <div className="asset-v">{value}</div>
          <div className="asset-sub">{sub}</div>
        </div>
        <div className="w-8 h-8 border border-border bg-secondary/35 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4" style={{ color }} strokeWidth={1.7} />
        </div>
      </div>
    </div>
  );
}

const blankDeal = {
  id: '',
  name: '',
  code: '',
  budget: '',
  department: 'Portfolio Asset',
  status: 'active',
  notes: '',
};

export default function HoldingsAssets() {
  const { user } = useAuth();
  const { data: deals = [] } = useProjects();
  const { data: fixedAssets = [] } = useFixedAssets();
  const { data: notes = [] } = useHoldingsNotes();

  const REGISTER_PAGE_SIZE = 12;
  const { page: dealsPage, setPage: setDealsPage, pageCount: dealsPageCount, paged: pagedDeals } =
    usePagination(deals as any[], REGISTER_PAGE_SIZE);
  const { page: assetsPage, setPage: setAssetsPage, pageCount: assetsPageCount, paged: pagedAssets } =
    usePagination(fixedAssets as any[], REGISTER_PAGE_SIZE);
  const { page: notesPage, setPage: setNotesPage, pageCount: notesPageCount, paged: pagedNotesReg } =
    usePagination(notes as any[], REGISTER_PAGE_SIZE);
  const { data: capital = [] } = useCapitalActivity();
  const { data: balance } = useHoldingsBalanceSheet();
  const { data: consolidated = {} } = useConsolidatedEntityTotals();
  const upsertDeal = useUpsert('projects', [['projects']]);
  const deleteDeal = useDelete('projects', [['projects']]);
  const [tab, setTab] = useState<'overview' | 'deals' | 'assets' | 'notes' | 'capital'>('overview');
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({ ...blankDeal });

  const entityRows = useMemo(() => ENTITIES.map(e => {
    const t = (consolidated as Record<string, { income: number; expense: number; clearedChecks: number }>)[e.id]
      ?? { income: 0, expense: 0, clearedChecks: 0 };
    const outflow = num(t.expense) + num(t.clearedChecks);
    return { ...e, income: num(t.income), outflow, net: num(t.income) - outflow };
  }), [consolidated]);

  const stats = useMemo(() => {
    const assetCost = (fixedAssets as any[]).reduce((s, a) => s + num(a.cost_basis), 0);
    const nbv = (fixedAssets as any[]).reduce((s, a) => s + num(a.net_book_value), 0);
    const receivable = (notes as any[]).filter(n => n.status === 'active' && n.direction === 'receivable').reduce((s, n) => s + num(n.outstanding_balance), 0);
    const payable = (notes as any[]).filter(n => n.status === 'active' && n.direction === 'payable').reduce((s, n) => s + num(n.outstanding_balance), 0);
    const approvedCapital = (capital as any[]).filter(a => !a.approval_status || a.approval_status === 'approved').reduce((s, a) => s + num(a.amount), 0);
    const portfolioNet = entityRows.reduce((s, e) => s + e.net, 0);
    return { assetCost, nbv, receivable, payable, approvedCapital, portfolioNet };
  }, [fixedAssets, notes, capital, entityRows]);

  const openDeal = (deal?: any) => {
    setForm(deal ? {
      id: deal.id,
      name: deal.name ?? '',
      code: deal.code ?? '',
      budget: deal.budget != null ? String(deal.budget) : '',
      department: deal.department ?? 'Portfolio Asset',
      status: deal.status ?? 'active',
      notes: deal.notes ?? '',
    } : { ...blankDeal });
    setDialog(true);
  };

  const saveDeal = async () => {
    if (!user?.id) return toast.error('Sign in required');
    if (!form.name.trim()) return toast.error('Asset or deal name is required');
    try {
      await upsertDeal.mutateAsync({
        ...(form.id ? { id: form.id } : {}),
        name: form.name.trim(),
        code: form.code.trim() || null,
        budget: Number(form.budget) || 0,
        department: form.department,
        status: form.status,
        notes: form.notes.trim() || null,
      } as any);
      toast.success(form.id ? 'Asset/deal updated' : 'Asset/deal added');
      setDialog(false);
    } catch (e: any) {
      toast.error(e.message || 'Could not save asset/deal');
    }
  };

  const visibleTabs = [
    ['overview', 'Overview'],
    ['deals', 'Strategic Deals'],
    ['assets', 'Fixed Assets'],
    ['notes', 'Notes'],
    ['capital', 'Capital'],
  ] as const;

  return (
    <AppShell>
      <style>{ASSET_CSS}</style>
      <PageHeader
        eyebrow="Houston Enterprise Holdings"
        title="Assets & Deals"
        description="Holding-company register for strategic assets, entity exposure, notes, fixed assets, and capital movement."
        actions={<Button className="rounded-none bg-foreground text-background hover:bg-foreground/90" onClick={() => openDeal()}><Plus className="w-4 h-4 mr-1.5" /> New Deal</Button>}
      />
      <div className="asset-shell border-t border-border/50">
        <div className="px-4 sm:px-8 py-4 space-y-4">
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5">
            <Metric label="Management Assets" value={fmtUSD(num(balance?.total_assets) || stats.portfolioNet + stats.receivable + stats.nbv)} sub="Cash basis + notes + fixed assets context" icon={Landmark} />
            <Metric label="Fixed Asset NBV" value={fmtUSD(stats.nbv)} sub={`${fmtUSD(stats.assetCost)} original cost basis`} icon={Layers3} color="#0891b2" />
            <Metric label="Notes Receivable" value={fmtUSD(stats.receivable)} sub="Outstanding balances owed to Holdings" icon={CircleDollarSign} color="#059669" />
            <Metric label="Notes Payable" value={fmtUSD(stats.payable)} sub="Debt and obligations owed by Holdings" icon={Scale} color="#dc2626" />
          </div>

          {/* Equal-width grid on mobile so all 5 sections are visible and
              tappable with no horizontal scrolling; natural row on desktop. */}
          <div className="asset-panel p-2">
            <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-1.5">
              {visibleTabs.map(([id, label]) => (
                <button key={id} className={`asset-action justify-center sm:justify-start truncate ${tab === id ? '!bg-foreground !text-background' : ''}`} onClick={() => setTab(id)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {(tab === 'overview' || tab === 'deals') && (
            <section className="asset-panel p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div>
                  <div className="asset-k">Strategic Asset Portfolio</div>
                  <h2 className="text-lg font-black mt-0.5">Deals, Assets & Initiatives</h2>
                </div>
                <button className="asset-primary" onClick={() => openDeal()}><Plus className="w-3.5 h-3.5" /> Add</button>
              </div>
              <div className="overflow-x-auto">
                <div className="min-w-[720px]">
                  <div className="asset-row grid grid-cols-[1.4fr_.8fr_.9fr_.9fr_1.3fr_.4fr] gap-2 bg-secondary/45 asset-k">
                    <div>Asset / Deal</div><div>Type</div><div>Status</div><div>Value Basis</div><div>Notes</div><div></div>
                  </div>
                  {(tab === 'overview' ? (deals as any[]).slice(0, 6) : pagedDeals).map(d => (
                    <div key={d.id} className="asset-row grid grid-cols-[1.4fr_.8fr_.9fr_.9fr_1.3fr_.4fr] gap-2 items-center">
                      <div className="min-w-0">
                        <div className="font-bold truncate">{d.name}</div>
                        <div className="text-[9px] text-muted-foreground uppercase tracking-[0.12em]">{d.code || 'No code'}</div>
                      </div>
                      <div className="truncate">{d.department || 'Portfolio Asset'}</div>
                      <div><span className="asset-pill">{String(d.status || 'active').replace(/_/g, ' ')}</span></div>
                      <div className="font-mono-tab font-bold">{fmtUSD(num(d.budget))}</div>
                      <div className="truncate text-muted-foreground">{d.notes || 'No memo'}</div>
                      <div className="flex justify-end gap-1">
                        <button className="p-1 text-muted-foreground hover:text-foreground" onClick={() => openDeal(d)}><Pencil className="w-3.5 h-3.5" /></button>
                        <button className="p-1 text-muted-foreground hover:text-destructive" onClick={() => { if (confirm('Archive this asset/deal?')) deleteDeal.mutate(d.id); }}><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))}
                  {!(deals as any[]).length && <div className="py-12 text-center text-sm text-muted-foreground">No Holdings assets or deals yet.</div>}
                </div>
              </div>
              {tab === 'deals' && (deals as any[]).length > REGISTER_PAGE_SIZE && (
                <div className="pt-2.5 mt-1 border-t border-border/60">
                  <PaginationBar page={dealsPage} pageCount={dealsPageCount} total={(deals as any[]).length} pageSize={REGISTER_PAGE_SIZE}
                    onPageChange={setDealsPage} itemLabel="assets & deals" />
                </div>
              )}
            </section>
          )}

          {(tab === 'overview' || tab === 'assets') && (
            <section className="asset-panel p-3 sm:p-4">
              <div className="asset-k mb-3">Fixed Asset Register</div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
                {(tab === 'assets' ? pagedAssets : (fixedAssets as any[]).slice(0, 6)).map(a => (
                  <div key={a.id} className="border border-border p-3 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-bold truncate">{a.asset_name}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] mt-0.5">{String(a.asset_category || 'asset').replace(/_/g, ' ')}</div>
                      </div>
                      <span className="asset-pill">{a.status}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-3 text-[11px]">
                      <div><div className="asset-k">Cost</div><div className="font-mono-tab font-bold">{fmtUSD(num(a.cost_basis))}</div></div>
                      <div><div className="asset-k">Accum Dep.</div><div className="font-mono-tab font-bold">{fmtUSD(num(a.accumulated_depreciation))}</div></div>
                      <div><div className="asset-k">NBV</div><div className="font-mono-tab font-bold">{fmtUSD(num(a.net_book_value))}</div></div>
                    </div>
                  </div>
                ))}
                {!(fixedAssets as any[]).length && <div className="text-sm text-muted-foreground border border-border p-4">No fixed assets registered yet.</div>}
              </div>
              {tab === 'assets' && (fixedAssets as any[]).length > REGISTER_PAGE_SIZE && (
                <div className="pt-2.5 mt-2 border-t border-border/60">
                  <PaginationBar page={assetsPage} pageCount={assetsPageCount} total={(fixedAssets as any[]).length} pageSize={REGISTER_PAGE_SIZE}
                    onPageChange={setAssetsPage} itemLabel="fixed assets" />
                </div>
              )}
            </section>
          )}

          {(tab === 'overview' || tab === 'notes') && (
            <section className="asset-panel p-3 sm:p-4">
              <div className="asset-k mb-3">Debt, Notes & Capital Structure</div>
              <div className="space-y-1.5">
                {(tab === 'overview' ? (notes as any[]).slice(0, 6) : pagedNotesReg).map(n => (
                  <div key={n.id} className="asset-row grid grid-cols-[1.3fr_.7fr_.8fr_.8fr_.8fr] gap-2 items-center">
                    <div className="min-w-0"><div className="font-bold truncate">{n.counterparty_name}</div><div className="text-[9px] text-muted-foreground">{entityName(n.counterparty_entity_id)}</div></div>
                    <div><span className={`asset-pill ${n.direction === 'receivable' ? 'text-positive' : 'text-destructive'}`}>{n.direction}</span></div>
                    <div className="font-mono-tab">{fmtUSD(num(n.outstanding_balance))}</div>
                    <div className="font-mono-tab">{num(n.interest_rate).toFixed(2)}%</div>
                    <div className="text-muted-foreground">{n.maturity_date ? fmtDate(n.maturity_date) : 'No maturity'}</div>
                  </div>
                ))}
                {!(notes as any[]).length && <div className="text-sm text-muted-foreground border border-border p-4">No notes recorded yet.</div>}
              </div>
              {tab === 'notes' && (notes as any[]).length > REGISTER_PAGE_SIZE && (
                <div className="pt-2.5 mt-2 border-t border-border/60">
                  <PaginationBar page={notesPage} pageCount={notesPageCount} total={(notes as any[]).length} pageSize={REGISTER_PAGE_SIZE}
                    onPageChange={setNotesPage} itemLabel="notes" />
                </div>
              )}
            </section>
          )}

          {(tab === 'overview' || tab === 'capital') && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5">
              <section className="asset-panel p-3 sm:p-4">
                <div className="asset-k mb-3">Operating Entity Exposure</div>
                {entityRows.map(e => (
                  <div key={e.id} className="asset-row flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-7 h-7 border flex items-center justify-center shrink-0" style={{ borderColor: `${e.color}40`, backgroundColor: `${e.color}10` }}>
                        <Building2 className="w-3.5 h-3.5" style={{ color: e.color }} />
                      </span>
                      <div className="min-w-0"><div className="font-bold truncate">{e.name}</div><div className="text-[9px] text-muted-foreground">{fmtUSD(e.income)} in · {fmtUSD(e.outflow)} out</div></div>
                    </div>
                    <div className={`font-mono-tab font-black ${e.net >= 0 ? 'text-positive' : 'text-destructive'}`}>{fmtUSD(e.net)}</div>
                  </div>
                ))}
              </section>
              <section className="asset-panel p-3 sm:p-4">
                <div className="asset-k mb-3">Capital Movement</div>
                {(capital as any[]).slice(0, 10).map(a => (
                  <div key={a.id} className="asset-row flex items-center justify-between gap-3">
                    <div className="min-w-0"><div className="font-bold truncate">{String(a.activity_type || '').replace(/_/g, ' ')}</div><div className="text-[9px] text-muted-foreground">{fmtDate(a.activity_date)} · {entityName(a.related_entity_id)}</div></div>
                    <div className="font-mono-tab font-bold">{fmtUSD(num(a.amount))}</div>
                  </div>
                ))}
                {!(capital as any[]).length && <div className="text-sm text-muted-foreground border border-border p-4">No capital activity recorded yet.</div>}
              </section>
            </div>
          )}

          <section className="asset-panel p-3 sm:p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="flex items-start gap-2">
                <BarChart3 className="w-4 h-4 mt-0.5" style={{ color: HEH }} />
                <div><div className="font-bold text-sm">Board visibility</div><p className="text-xs text-muted-foreground mt-1">Portfolio exposure stays separated by entity, so management can review the corporation without mixing operating-company detail.</p></div>
              </div>
              <div className="flex items-start gap-2">
                <ArrowLeftRight className="w-4 h-4 mt-0.5" style={{ color: HEH }} />
                <div><div className="font-bold text-sm">Capital context</div><p className="text-xs text-muted-foreground mt-1">Notes, intercompany activity, and strategic assets sit together for cleaner owner and lender conversations.</p></div>
              </div>
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 mt-0.5" style={{ color: HEH }} />
                <div><div className="font-bold text-sm">Management basis</div><p className="text-xs text-muted-foreground mt-1">Financial-position values are clearly management-basis and align with the Holdings balance sheet RPC.</p></div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg rounded-none max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-base">{form.id ? 'Edit Asset / Deal' : 'New Asset / Deal'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <div className="asset-k mb-1">Name *</div>
              <Input className="rounded-none h-10" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. West Houston Land Position" />
            </div>
            <div>
              <div className="asset-k mb-1">Code</div>
              <Input className="rounded-none h-10" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
            </div>
            <div>
              <div className="asset-k mb-1">Value Basis</div>
              <Input className="rounded-none h-10" type="number" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} />
            </div>
            <div>
              <div className="asset-k mb-1">Deal Type</div>
              <Select value={form.department} onValueChange={v => setForm(f => ({ ...f, department: v }))}>
                <SelectTrigger className="rounded-none h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Portfolio Asset">Portfolio Asset</SelectItem>
                  <SelectItem value="Real Estate Deal">Real Estate Deal</SelectItem>
                  <SelectItem value="Development Opportunity">Development Opportunity</SelectItem>
                  <SelectItem value="Intercompany Initiative">Intercompany Initiative</SelectItem>
                  <SelectItem value="Strategic Investment">Strategic Investment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="asset-k mb-1">Status</div>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="rounded-none h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <div className="asset-k mb-1">Investment Memo</div>
              <Textarea className="rounded-none text-sm" rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <button className="asset-primary w-full mt-2" onClick={saveDeal}>{form.id ? 'Save Asset / Deal' : 'Create Asset / Deal'}</button>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
