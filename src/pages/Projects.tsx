import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useChecks, useDelete, useProjects, useTransactions, useUpsert } from '@/hooks/useFinance';
import { useRole } from '@/hooks/useAuth';
import { useEntity } from '@/contexts/EntityContext';
import { fmtUSD } from '@/lib/format';
import {
  Trash2, Table2, FileText, ChevronRight, BarChart2,
  Search, Plus, Grid3X3, List, ExternalLink,
  FolderKanban, Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { generateProjectReport, savePDF, downloadProjectExcel } from '@/lib/reports';

/* ── Status metadata ─────────────────────────────────────────────────────── */
const S = {
  active:    { label: 'Active',    color: 'var(--positive)', cls: 'bg-positive/10 text-positive border-positive/30',       hex: '#10b981' },
  on_hold:   { label: 'On Hold',   color: 'var(--warning)',  cls: 'bg-warning/10 text-warning border-warning/30',           hex: '#f59e0b' },
  completed: { label: 'Completed', color: '#3b82f6',         cls: 'bg-blue-500/10 text-blue-500 border-blue-500/30',        hex: '#3b82f6' },
  archived:  { label: 'Archived',  color: 'var(--border)',   cls: 'bg-muted/50 text-muted-foreground border-border',        hex: '#6b7280' },
} as const;
type StatusKey = keyof typeof S;
const getMeta = (status: string) => S[status as StatusKey] ?? S.archived;

const blank = { name: '', code: '', budget: '', status: 'active' as StatusKey, notes: '' };

export default function Projects() {
  const navigate  = useNavigate();
  const role      = useRole();
  const isAdmin   = role === 'admin';
  const { entity } = useEntity();

  const { data: projects  = [] } = useProjects();
  const { data: checks    = [] } = useChecks();
  const { data: income    = [] } = useTransactions('income');
  const { data: expenses  = [] } = useTransactions('expense');

  const upsert = useUpsert('projects', [['projects']]);
  const del    = useDelete('projects', [['projects']]);

  const [open,       setOpen]       = useState(false);
  const [form,       setForm]       = useState<any>(blank);
  const [view,       setView]       = useState<'grid' | 'table' | 'wip'>('grid');
  const [search,     setSearch]     = useState('');
  const [filter,     setFilter]     = useState('all');
  const [sortBy,     setSortBy]     = useState<'name' | 'budget' | 'spent' | 'net' | 'used'>('name');
  const [sortDir,    setSortDir]    = useState<'asc' | 'desc'>('asc');

  /* ── Enriched data ── */
  const enriched = useMemo(() => projects.map((p: any) => {
    const pChecks   = checks.filter((c: any) => c.project_id === p.id);
    const pIn       = income.filter((t: any) => t.project_id === p.id).reduce((s: number, t: any) => s + Number(t.amount), 0);
    const pExp      = expenses.filter((t: any) => t.project_id === p.id).reduce((s: number, t: any) => s + Number(t.amount), 0);
    const cleared   = pChecks.filter((c: any) => c.status === 'cleared').reduce((s: number, c: any) => s + Number(c.amount), 0);
    const outstanding = pChecks.filter((c: any) => c.status === 'pending').reduce((s: number, c: any) => s + Number(c.amount), 0);
    const spent     = pExp + cleared;
    const budget    = Number(p.budget);
    return { ...p, incoming: pIn, spent, outstanding, net: pIn - spent, used: budget > 0 ? Math.min(150, (spent / budget) * 100) : 0 };
  }), [projects, checks, income, expenses]);

  /* ── Portfolio KPIs ── */
  const portfolio = useMemo(() => ({
    total:        enriched.length,
    active:       enriched.filter((p: any) => p.status === 'active').length,
    totalBudget:  enriched.reduce((s: number, p: any) => s + Number(p.budget), 0),
    totalSpent:   enriched.reduce((s: number, p: any) => s + p.spent, 0),
    totalIncoming:enriched.reduce((s: number, p: any) => s + p.incoming, 0),
    totalNet:     enriched.reduce((s: number, p: any) => s + p.net, 0),
  }), [enriched]);

  /* ── Status counts ── */
  const counts = useMemo(() => ({
    all:       enriched.length,
    active:    enriched.filter((p: any) => p.status === 'active').length,
    on_hold:   enriched.filter((p: any) => p.status === 'on_hold').length,
    completed: enriched.filter((p: any) => p.status === 'completed').length,
    archived:  enriched.filter((p: any) => p.status === 'archived').length,
  }), [enriched]);

  /* ── Filtered + sorted ── */
  const displayed = useMemo(() => {
    const q = search.toLowerCase();
    return enriched
      .filter((p: any) => filter === 'all' || p.status === filter)
      .filter((p: any) => !q || p.name.toLowerCase().includes(q) || (p.code || '').toLowerCase().includes(q))
      .sort((a: any, b: any) => {
        const va = sortBy === 'name' ? a.name : sortBy === 'budget' ? Number(a.budget) : sortBy === 'spent' ? a.spent : sortBy === 'net' ? a.net : a.used;
        const vb = sortBy === 'name' ? b.name : sortBy === 'budget' ? Number(b.budget) : sortBy === 'spent' ? b.spent : sortBy === 'net' ? b.net : b.used;
        if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb as string) : (vb as string).localeCompare(va);
        return sortDir === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number);
      });
  }, [enriched, filter, search, sortBy, sortDir]);

  /* ── Exports ── */
  const exportPDF   = () => { const doc = generateProjectReport(enriched); savePDF(doc, `hou-projects-${new Date().toISOString().slice(0, 10)}.pdf`); toast.success('Portfolio exported'); };
  const exportExcel = () => { downloadProjectExcel(enriched); toast.success('Projects exported as Excel'); };

  /* ── Form ── */
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    await upsert.mutateAsync({ ...form, budget: parseFloat(form.budget) || 0 });
    toast.success(form.id ? 'Project updated' : 'Project created');
    setOpen(false); setForm(blank);
  };
  const openEdit = (p: any) => { setForm({ id: p.id, name: p.name, code: p.code || '', budget: p.budget, status: p.status, notes: p.notes || '' }); setOpen(true); };
  const cycleSort = (col: typeof sortBy) => { if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortBy(col); setSortDir('asc'); } };

  /* ── Totals helper for footer ── */
  const tot = (key: string) => displayed.reduce((s: number, p: any) => s + (Number(p[key]) || 0), 0);

  return (
    <AppShell>
      {/* ── Project Form Modal ── */}
      <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) setForm(blank); }}>
        <DialogContent className="rounded-none sm:max-w-lg w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="text-[8px] uppercase tracking-[0.32em] font-bold text-muted-foreground mb-0.5">
              {form.id ? 'Edit Project' : 'New Project'}
            </div>
            <DialogTitle className="text-lg font-semibold tracking-tight">
              {form.id ? form.name : 'Create Project'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4 pt-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label className="micro-label">Project Name</Label>
                <Input className="rounded-none h-10" required value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Heights Renovation" />
              </div>
              <div className="space-y-1.5">
                <Label className="micro-label">Code / ID</Label>
                <Input className="rounded-none h-10 font-mono-tab" value={form.code}
                  onChange={e => setForm({ ...form, code: e.target.value })} placeholder="HOU-001" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="micro-label">Contract Budget (USD)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground z-10 select-none pointer-events-none">$</span>
                  <Input type="number" step="0.01" className="pl-7 rounded-none h-10 font-mono-tab text-right"
                    value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} placeholder="0.00" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="micro-label">Status</Label>
                <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
                  <SelectTrigger className="rounded-none h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="micro-label">Notes / Scope</Label>
              <Textarea className="rounded-none text-sm" rows={3} value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Client name, address, project scope…" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="submit" className="rounded-none h-10 flex-1">
                {form.id ? 'Save Changes' : 'Create Project'}
              </Button>
              <Button type="button" variant="outline" className="rounded-none h-10" onClick={() => { setOpen(false); setForm(blank); }}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Page Header ── */}
      <PageHeader
        eyebrow={entity?.name || 'Capital Containers'}
        title="Project Portfolio"
        description="Budget allocation, capital deployed, and outstanding obligations across all active jobs."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => navigate('/admin')}
                className="hidden sm:flex items-center gap-1.5 h-8 px-3 text-[9px] uppercase tracking-[0.18em] font-bold border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-all"
              >
                <ExternalLink className="w-2.5 h-2.5" /> Admin
              </button>
            )}
            <div className="hidden sm:flex items-center gap-1">
              <button onClick={exportPDF} title="Export PDF"
                className="w-8 h-8 flex items-center justify-center border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-all">
                <FileText className="w-3.5 h-3.5" />
              </button>
              <button onClick={exportExcel} title="Export Excel"
                className="w-8 h-8 flex items-center justify-center border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-all">
                <Table2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <Button onClick={() => { setForm(blank); setOpen(true); }} className="rounded-none h-8 text-[10px] uppercase tracking-wider">
              <Plus className="w-3 h-3 mr-1.5" /> New Project
            </Button>
          </div>
        }
      />

      {/* ── Portfolio KPI Bar ── */}
      <div className="border-b border-border">
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-px bg-border">
          {[
            { label: `${portfolio.active} Active · ${portfolio.total} Total`,  value: portfolio.total === 1 ? '1 Job' : `${portfolio.total} Jobs`, color: '' },
            { label: 'Total Contract Budget',  value: fmtUSD(portfolio.totalBudget),   color: '' },
            { label: 'Total Deployed',         value: fmtUSD(portfolio.totalSpent),    color: '' },
            { label: 'Total Revenue',          value: fmtUSD(portfolio.totalIncoming), color: 'text-positive' },
            { label: 'Portfolio Net',          value: fmtUSD(portfolio.totalNet),      color: portfolio.totalNet >= 0 ? 'text-positive' : 'text-accent' },
          ].map((k, i) => (
            <div key={i} className="bg-background px-4 sm:px-5 py-3.5">
              <div className="text-[8px] uppercase tracking-[0.22em] font-bold text-muted-foreground mb-1 leading-tight">{k.label}</div>
              <div className={`text-base sm:text-[17px] font-bold font-mono-tab leading-tight ${k.color}`}>{k.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Controls Row ── */}
      <div className="px-4 sm:px-8 py-2.5 border-b border-border flex flex-wrap items-center gap-2">
        {/* Status filter tabs */}
        <div className="flex border border-border overflow-hidden shrink-0">
          {(['all', 'active', 'on_hold', 'completed', 'archived'] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-2.5 sm:px-3 py-1.5 text-[8px] sm:text-[9px] uppercase tracking-[0.12em] font-bold border-r border-border last:border-r-0 transition-all whitespace-nowrap ${
                filter === s ? 'bg-foreground text-background' : 'bg-background text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}>
              {s === 'all' ? `All (${counts.all})` : s === 'on_hold' ? `Hold (${counts.on_hold})` : `${S[s].label} (${counts[s]})`}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[140px] max-w-[240px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name or code…"
            className="w-full pl-7 pr-3 h-8 text-xs border border-border bg-background placeholder:text-muted-foreground/60 focus:outline-none focus:border-foreground/30 transition-colors"
          />
        </div>

        {/* View toggle */}
        <div className="ml-auto flex border border-border overflow-hidden">
          {([
            { mode: 'grid'  as const, Icon: Grid3X3, title: 'Card View'  },
            { mode: 'table' as const, Icon: List,    title: 'Table View' },
            { mode: 'wip'   as const, Icon: BarChart2, title: 'WIP Report' },
          ]).map(({ mode, Icon, title }) => (
            <button key={mode} onClick={() => setView(mode)} title={title}
              className={`w-8 h-8 flex items-center justify-center border-r border-border last:border-r-0 transition-all ${
                view === mode ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}>
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>
      </div>

      {/* Mobile export bar */}
      <div className="sm:hidden px-4 py-2 border-b border-border flex gap-2">
        <Button variant="outline" size="sm" className="rounded-none text-[10px] flex-1" onClick={exportPDF}>
          <FileText className="w-3 h-3 mr-1.5" />PDF
        </Button>
        <Button variant="outline" size="sm" className="rounded-none text-[10px] flex-1" onClick={exportExcel}>
          <Download className="w-3 h-3 mr-1.5" />Excel
        </Button>
      </div>

      {/* ── Empty State ── */}
      {displayed.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
          <div className="w-14 h-14 border border-border flex items-center justify-center mb-5">
            <FolderKanban className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <div className="text-sm font-semibold tracking-tight mb-1.5">
            {search || filter !== 'all' ? 'No matching projects' : 'No projects yet'}
          </div>
          <div className="text-xs text-muted-foreground max-w-xs mb-6">
            {search || filter !== 'all'
              ? 'Try adjusting your search or filter criteria.'
              : 'Create your first project to start tracking budgets, costs, and revenue across all active jobs.'}
          </div>
          {!search && filter === 'all' && (
            <Button onClick={() => { setForm(blank); setOpen(true); }} className="rounded-none h-9 text-xs uppercase tracking-wider">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Create First Project
            </Button>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          GRID VIEW
      ══════════════════════════════════════════════════════════ */}
      {view === 'grid' && displayed.length > 0 && (
        <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayed.map((p: any, idx: number) => {
            const meta = getMeta(p.status);
            const overBudget = p.used >= 100;
            const nearLimit  = p.used >= 80 && p.used < 100;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: idx * 0.04 }}
                className="bg-background border border-border flex flex-col group hover:border-foreground/25 hover:shadow-sm transition-all duration-200"
              >
                {/* Status accent bar */}
                <div className="h-[3px] w-full flex-shrink-0" style={{ backgroundColor: meta.color }} />

                <div className="p-5 flex-1 flex flex-col">
                  {/* Header: code + badges */}
                  <div className="flex items-start gap-2 mb-3 flex-wrap">
                    {p.code && (
                      <span className="text-[8px] font-black uppercase tracking-[0.24em] text-muted-foreground font-mono-tab bg-secondary px-1.5 py-0.5">
                        {p.code}
                      </span>
                    )}
                    <span className={`text-[7px] uppercase tracking-[0.24em] font-bold px-1.5 py-0.5 border ${meta.cls}`}>
                      {meta.label}
                    </span>
                    {overBudget && (
                      <span className="text-[7px] uppercase tracking-[0.2em] font-bold px-1.5 py-0.5 border bg-accent/10 text-accent border-accent/30">
                        Over Budget
                      </span>
                    )}
                    {nearLimit && (
                      <span className="text-[7px] uppercase tracking-[0.2em] font-bold px-1.5 py-0.5 border bg-warning/10 text-warning border-warning/30">
                        Near Limit
                      </span>
                    )}
                  </div>

                  {/* Project name */}
                  <h3 className="text-[15px] font-semibold tracking-tight leading-snug mb-4">
                    {p.name}
                  </h3>

                  {/* Budget utilization bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[8px] uppercase tracking-[0.18em] font-bold text-muted-foreground">Budget Used</span>
                      <span className={`text-[11px] font-black font-mono-tab ${overBudget ? 'text-accent' : nearLimit ? 'text-warning' : ''}`}>
                        {Math.min(p.used, 150).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-secondary overflow-hidden">
                      <motion.div
                        className="h-full"
                        style={{ backgroundColor: overBudget ? 'var(--accent)' : nearLimit ? 'var(--warning)' : meta.hex }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(p.used, 100)}%` }}
                        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.05 + idx * 0.03 }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-muted-foreground mt-1.5 font-mono-tab">
                      <span>{fmtUSD(p.spent)} deployed</span>
                      <span>of {fmtUSD(p.budget)}</span>
                    </div>
                  </div>

                  {/* 4-metric grid */}
                  <div className="grid grid-cols-2 gap-px bg-border border border-border mt-auto">
                    {[
                      { label: 'Budget',   value: fmtUSD(p.budget),   cls: '' },
                      { label: 'Deployed', value: fmtUSD(p.spent),    cls: '' },
                      { label: 'Revenue',  value: fmtUSD(p.incoming), cls: 'text-positive' },
                      { label: 'Net',      value: fmtUSD(p.net),      cls: p.net >= 0 ? 'text-positive' : 'text-accent' },
                    ].map(m => (
                      <div key={m.label} className="bg-background px-3 py-2.5">
                        <div className="text-[8px] uppercase tracking-[0.18em] font-bold text-muted-foreground mb-1">{m.label}</div>
                        <div className={`text-[12px] font-bold font-mono-tab leading-tight ${m.cls}`}>{m.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Notes preview */}
                  {p.notes && (
                    <p className="mt-3 text-[10px] text-muted-foreground leading-relaxed line-clamp-2">{p.notes}</p>
                  )}
                </div>

                {/* Card footer — actions */}
                <div className="border-t border-border px-4 py-2.5 flex items-center justify-between bg-secondary/20">
                  <button
                    onClick={() => navigate(`/projects/${p.id}`)}
                    className="text-[9px] uppercase tracking-[0.2em] font-bold text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                  >
                    Details <ChevronRight className="w-3 h-3" />
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(p)}
                      className="h-6 px-2.5 text-[8px] uppercase tracking-wider font-bold text-muted-foreground hover:text-foreground border border-transparent hover:border-border hover:bg-background transition-all"
                    >
                      Edit
                    </button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="h-6 w-6 flex items-center justify-center text-muted-foreground/60 hover:text-accent transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-none w-[calc(100%-2rem)]">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Archive "{p.name}"?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This soft-deletes the project and hides it from active views. All linked transactions and checks are preserved.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                          <AlertDialogCancel className="rounded-none">Cancel</AlertDialogCancel>
                          <AlertDialogAction className="rounded-none bg-accent hover:bg-accent/90" onClick={() => del.mutate(p.id)}>
                            Archive Project
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TABLE VIEW
      ══════════════════════════════════════════════════════════ */}
      {view === 'table' && displayed.length > 0 && (
        <div className="p-4 sm:p-6">
          <div className="border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[820px]">
                <thead>
                  <tr className="border-b border-border bg-secondary/40">
                    {([
                      { label: 'Project',  col: 'name'   },
                      { label: 'Status',   col: null      },
                      { label: 'Budget',   col: 'budget'  },
                      { label: 'Deployed', col: 'spent'   },
                      { label: '% Used',   col: 'used'    },
                      { label: 'Revenue',  col: null      },
                      { label: 'Net',      col: 'net'     },
                      { label: '',         col: null      },
                    ] as const).map(({ label, col }) => (
                      <th
                        key={label || 'actions'}
                        onClick={col ? () => cycleSort(col as typeof sortBy) : undefined}
                        className={`px-4 py-2.5 text-left text-[9px] uppercase tracking-[0.14em] text-muted-foreground font-bold whitespace-nowrap ${col ? 'cursor-pointer hover:text-foreground select-none' : ''}`}
                      >
                        <span className="flex items-center gap-1">
                          {label}
                          {col && sortBy === col && <span className="opacity-70">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((p: any) => {
                    const meta = getMeta(p.status);
                    return (
                      <tr key={p.id} className="border-b border-border last:border-b-0 hover:bg-secondary/20 group">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-0.5 h-8 flex-shrink-0" style={{ backgroundColor: meta.color }} />
                            <div>
                              <button onClick={() => navigate(`/projects/${p.id}`)}
                                className="font-semibold hover:text-accent transition-colors text-left block text-[13px] leading-tight">
                                {p.name}
                              </button>
                              {p.code && <div className="text-[9px] text-muted-foreground font-mono-tab mt-0.5">{p.code}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[7px] uppercase tracking-[0.22em] font-bold px-1.5 py-0.5 border ${meta.cls}`}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono-tab font-semibold text-right text-[12px]">{fmtUSD(p.budget)}</td>
                        <td className="px-4 py-3 font-mono-tab text-right text-[12px]">{fmtUSD(p.spent)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-14 h-1 bg-secondary flex-shrink-0 overflow-hidden">
                              <div className="h-full" style={{ width: `${Math.min(p.used, 100)}%`, backgroundColor: p.used >= 100 ? 'var(--accent)' : p.used >= 80 ? 'var(--warning)' : meta.hex }} />
                            </div>
                            <span className={`font-mono-tab text-[11px] font-bold whitespace-nowrap ${p.used >= 100 ? 'text-accent' : p.used >= 80 ? 'text-warning' : ''}`}>
                              {Math.min(p.used, 150).toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono-tab text-right text-positive font-semibold text-[12px]">{fmtUSD(p.incoming)}</td>
                        <td className={`px-4 py-3 font-mono-tab font-bold text-right text-[12px] ${p.net >= 0 ? 'text-positive' : 'text-accent'}`}>{fmtUSD(p.net)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => navigate(`/projects/${p.id}`)}
                              className="h-6 px-2 text-[8px] uppercase tracking-wider font-bold text-muted-foreground hover:text-foreground border border-border hover:border-foreground/30 transition-all">
                              Details
                            </button>
                            <button onClick={() => openEdit(p)}
                              className="h-6 px-2 text-[8px] uppercase tracking-wider font-bold text-muted-foreground hover:text-foreground border border-border hover:border-foreground/30 transition-all">
                              Edit
                            </button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-accent border border-border hover:border-accent/30 transition-all">
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="rounded-none w-[calc(100%-2rem)]">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Archive "{p.name}"?</AlertDialogTitle>
                                  <AlertDialogDescription>Linked transactions and checks are preserved.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                                  <AlertDialogCancel className="rounded-none">Cancel</AlertDialogCancel>
                                  <AlertDialogAction className="rounded-none bg-accent hover:bg-accent/90" onClick={() => del.mutate(p.id)}>Archive</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-secondary/40">
                    <td className="px-4 py-3 font-bold text-[9px] uppercase tracking-wider" colSpan={2}>
                      Portfolio Total · {displayed.length} project{displayed.length !== 1 ? 's' : ''}
                    </td>
                    <td className="px-4 py-3 font-bold font-mono-tab text-right text-[12px]">{fmtUSD(tot('budget'))}</td>
                    <td className="px-4 py-3 font-bold font-mono-tab text-right text-[12px]">{fmtUSD(tot('spent'))}</td>
                    <td className="px-4 py-3 text-muted-foreground text-[10px]">—</td>
                    <td className="px-4 py-3 font-bold font-mono-tab text-right text-positive text-[12px]">{fmtUSD(tot('incoming'))}</td>
                    <td className={`px-4 py-3 font-bold font-mono-tab text-right text-[12px] ${tot('net') >= 0 ? 'text-positive' : 'text-accent'}`}>{fmtUSD(tot('net'))}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          WIP SCHEDULE VIEW
      ══════════════════════════════════════════════════════════ */}
      {view === 'wip' && displayed.length > 0 && (
        <div className="p-4 sm:p-6">
          <div className="border border-border">
            <div className="px-5 py-3 border-b border-border bg-secondary/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
                <span className="text-[9px] uppercase tracking-[0.22em] font-bold text-muted-foreground">
                  WIP Schedule — Work in Progress Report
                </span>
              </div>
              <div className="text-[9px] text-muted-foreground">
                As of {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[760px]">
                <thead>
                  <tr className="border-b border-border">
                    {['Project', 'Contract Value', 'Costs Incurred', '% Complete', 'Revenue Earned', 'Billed to Date', 'Over / Under'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[9px] uppercase tracking-[0.14em] text-muted-foreground font-bold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((p: any) => {
                    const meta        = getMeta(p.status);
                    const pct         = p.budget > 0 ? Math.min(100, (p.spent / p.budget) * 100) : 0;
                    const revEarned   = p.budget > 0 ? p.incoming * (pct / 100) : p.incoming;
                    const billed      = p.incoming;
                    const delta       = billed - revEarned;
                    return (
                      <tr key={p.id} className="border-b border-border last:border-b-0 hover:bg-secondary/20">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-0.5 h-7" style={{ backgroundColor: meta.color }} />
                            <div>
                              <button onClick={() => navigate(`/projects/${p.id}`)}
                                className="font-semibold hover:text-accent transition-colors text-left block">
                                {p.name}
                              </button>
                              <div className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">{p.code || meta.label}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono-tab font-semibold">{fmtUSD(p.budget)}</td>
                        <td className="px-4 py-3 font-mono-tab">{fmtUSD(p.spent)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-secondary overflow-hidden">
                              <div className="h-full" style={{ width: `${pct}%`, backgroundColor: meta.hex }} />
                            </div>
                            <span className="font-mono-tab text-xs font-bold">{pct.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono-tab text-positive font-semibold">{fmtUSD(revEarned)}</td>
                        <td className="px-4 py-3 font-mono-tab">{fmtUSD(billed)}</td>
                        <td className={`px-4 py-3 font-mono-tab font-bold ${delta > 0 ? 'text-positive' : delta < 0 ? 'text-accent' : ''}`}>
                          {delta > 0 ? '+' : ''}{fmtUSD(delta)}
                          <div className="text-[8px] font-normal text-muted-foreground mt-0.5">
                            {delta > 0 ? 'Overbilled' : delta < 0 ? 'Underbilled' : 'On track'}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-secondary/40">
                    <td className="px-4 py-3 font-bold text-[9px] uppercase tracking-wider">Portfolio Totals</td>
                    <td className="px-4 py-3 font-bold font-mono-tab">{fmtUSD(tot('budget'))}</td>
                    <td className="px-4 py-3 font-bold font-mono-tab">{fmtUSD(tot('spent'))}</td>
                    <td className="px-4 py-3 text-muted-foreground text-[10px]">—</td>
                    <td className="px-4 py-3 font-bold font-mono-tab text-positive">{fmtUSD(tot('incoming'))}</td>
                    <td className="px-4 py-3 font-bold font-mono-tab">{fmtUSD(tot('incoming'))}</td>
                    <td className="px-4 py-3 text-muted-foreground text-[10px]">—</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
