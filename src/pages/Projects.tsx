import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AnimatePresence } from 'framer-motion';
import FinanceProjectWizard from '@/components/FinanceProjectWizard';
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
  FolderKanban, Download, Home, Building2, BriefcaseBusiness,
  Activity, CircleDollarSign, ShieldCheck, Settings2, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { generateProjectReport, savePDF, downloadProjectExcel } from '@/lib/reports';
import {
  Area, AreaChart, Bar, BarChart, Cell, ResponsiveContainer,
  Tooltip as RechartsTooltip, XAxis, YAxis,
} from 'recharts';
import { useFinanceChangelog } from '@/hooks/useFinanceChangelog';
import { FinanceRangePicker, financeRangeLabel, isInFinanceRange } from '@/lib/financeTime';

/* ── Status metadata ─────────────────────────────────────────────────────── */
const S = {
  active:    { label: 'Active',    color: 'var(--positive)', cls: 'bg-positive/10 text-positive border-positive/30',       hex: '#10b981' },
  on_hold:   { label: 'On Hold',   color: 'var(--warning)',  cls: 'bg-warning/10 text-warning border-warning/30',           hex: '#f59e0b' },
  completed: { label: 'Completed', color: '#3b82f6',         cls: 'bg-blue-500/10 text-blue-500 border-blue-500/30',        hex: '#3b82f6' },
  archived:  { label: 'Archived',  color: 'var(--border)',   cls: 'bg-muted/50 text-muted-foreground border-border',        hex: '#6b7280' },
} as const;
type StatusKey = keyof typeof S;
const getMeta = (status: string) => S[status as StatusKey] ?? S.archived;

const PROJECT_CATEGORIES = [
  { id: 'all', label: 'All Work', short: 'All', icon: FolderKanban, color: '#9D7E3F' },
  { id: 'residential', label: 'Residential Construction', short: 'Residential', icon: Home, color: '#0f766e' },
  { id: 'commercial', label: 'Commercial Construction', short: 'Commercial', icon: Building2, color: '#2563eb' },
  { id: 'management', label: 'Project Management', short: 'Management', icon: BriefcaseBusiness, color: '#7c3aed' },
] as const;
type ProjectCategory = typeof PROJECT_CATEGORIES[number]['id'];
type WorkCategory = Exclude<ProjectCategory, 'all'>;

const categoryById = (id: ProjectCategory) => PROJECT_CATEGORIES.find(c => c.id === id) ?? PROJECT_CATEGORIES[0];

const inferProjectCategory = (p: any): WorkCategory => {
  const haystack = [
    p.department, p.project_type, p.service_type, p.category, p.type, p.name, p.notes, p.location,
  ].filter(Boolean).join(' ').toLowerCase();

  if (/management|owner rep|owner's rep|project management|consult|coordination|\bpm\b/.test(haystack)) return 'management';
  if (/commercial|tenant|retail|restaurant|office|industrial|warehouse|medical|buildout|build-out/.test(haystack)) return 'commercial';
  return 'residential';
};

const healthTone = (score: number) => (
  score >= 82 ? { label: 'Strong', color: '#10b981' }
    : score >= 64 ? { label: 'Stable', color: '#9D7E3F' }
      : score >= 45 ? { label: 'Watch', color: '#f59e0b' }
        : { label: 'At Risk', color: '#ef4444' }
);

const blank = {
  name: '',
  code: '',
  budget: '',
  department: 'Residential Construction',
  status: 'active' as StatusKey,
  notes: '',
};

const PROJ_CSS = `
.proj-shell{background:linear-gradient(180deg,hsl(var(--secondary)/0.18),transparent 170px);}
.proj-panel{background:hsl(var(--background));border:1px solid hsl(var(--border));box-shadow:0 1px 3px rgba(10,10,10,0.05),0 1px 2px rgba(10,10,10,0.03);}
.proj-card{background:hsl(var(--background));border:1px solid hsl(var(--border));box-shadow:0 1px 3px rgba(10,10,10,0.05),0 1px 2px rgba(10,10,10,0.03),0 1px 0 rgba(255,255,255,0.45) inset;transition:box-shadow .18s,transform .18s,border-color .18s;background-image:linear-gradient(145deg,rgba(157,126,63,0.045),transparent 42%);}
.proj-card:hover{box-shadow:0 7px 22px rgba(10,10,10,0.085),0 2px 6px rgba(10,10,10,0.04),0 1px 0 rgba(255,255,255,0.45) inset;transform:translateY(-1px);border-color:hsl(var(--foreground)/0.2);}
.proj-kpi{background:hsl(var(--background));border:1px solid hsl(var(--border));box-shadow:0 1px 3px rgba(10,10,10,0.05);position:relative;overflow:hidden;}
.proj-kpi:before{content:"";position:absolute;inset:0;background:linear-gradient(135deg,rgba(157,126,63,0.08),transparent 42%);pointer-events:none;}
.proj-intel-card{background:hsl(var(--background));border:1px solid hsl(var(--border));box-shadow:0 1px 3px rgba(10,10,10,0.05),0 1px 0 rgba(255,255,255,0.45) inset;transition:box-shadow .18s,transform .18s,border-color .18s;position:relative;overflow:visible;}
.proj-intel-card:hover{box-shadow:0 8px 22px rgba(10,10,10,0.08);transform:translateY(-1px);border-color:hsl(var(--foreground)/0.2);z-index:30;}
.proj-intel-card:before{content:"";position:absolute;inset:0;background:linear-gradient(145deg,rgba(157,126,63,0.07),transparent 44%);pointer-events:none;}
.proj-card-foot{border-top:1px solid hsl(var(--border)/0.65);background:hsl(var(--secondary)/0.24);}
.proj-spark{height:40px;min-width:92px;}
.proj-category{background:hsl(var(--background));border:1px solid hsl(var(--border));box-shadow:0 1px 3px rgba(10,10,10,0.045),0 1px 0 rgba(255,255,255,0.45) inset;transition:transform .16s,border-color .16s,box-shadow .16s,background .16s;}
.proj-category:hover{transform:translateY(-1px);border-color:hsl(var(--foreground)/0.22);box-shadow:0 8px 22px rgba(10,10,10,0.08);}
.proj-category-active{border-color:rgba(157,126,63,0.52);background:linear-gradient(180deg,rgba(157,126,63,0.105),hsl(var(--background)));}
.proj-health-card{background:hsl(var(--secondary)/0.18);border:1px solid hsl(var(--border));}
.proj-meter{height:3px;background:hsl(var(--secondary));overflow:hidden;}
.proj-meter>span{display:block;height:100%;border-radius:999px;}
.proj-table-shell{background:hsl(var(--background));border:1px solid hsl(var(--border));box-shadow:0 1px 3px rgba(10,10,10,0.05),0 1px 2px rgba(10,10,10,0.03);}
.proj-export{border:1px solid hsl(var(--border));background:hsl(var(--background));box-shadow:0 1px 0 rgba(255,255,255,0.45) inset;transition:background .16s,border-color .16s,transform .16s;}
.proj-export:hover{background:hsl(var(--secondary)/0.62);border-color:hsl(var(--foreground)/0.24);transform:translateY(-1px);}
.proj-row:hover td{background-color:rgba(157,126,63,0.032)!important;}
.proj-row:hover{background-color:rgba(157,126,63,0.032)!important;}
@media(max-width:639px){.proj-spark{height:34px}.proj-intel-card{min-height:auto}.proj-card{box-shadow:0 1px 2px rgba(10,10,10,0.045)}}
.dark .proj-card,.dark .proj-panel,.dark .proj-kpi,.dark .proj-export,.dark .proj-category,.dark .proj-table-shell,.dark .proj-intel-card{background:hsl(var(--card));box-shadow:0 1px 4px rgba(0,0,0,0.28),0 1px 0 rgba(255,255,255,0.05) inset;}
`;

const PROJECT_CARD_STORAGE_KEY = 'hou-finance-project-card-selection';
const DEFAULT_PROJECT_CARDS = ['health', 'contract', 'deployed', 'cash'] as const;

export default function Projects() {
  const navigate  = useNavigate();
  const role      = useRole();
  const isAdmin   = role === 'admin';
  const { entity } = useEntity();
  const logFinanceChange = useFinanceChangelog();

  const { data: projects  = [] } = useProjects();
  const { data: checks    = [] } = useChecks();
  const { data: income    = [] } = useTransactions('income');
  const { data: expenses  = [] } = useTransactions('expense');

  const upsert = useUpsert('projects', [['projects']]);
  const del    = useDelete('projects', [['projects']]);

  const [showWizard, setShowWizard] = useState(false);
  const [open,       setOpen]       = useState(false);
  const [form,       setForm]       = useState<any>(blank);
  const [view,       setView]       = useState<'grid' | 'table' | 'wip'>('grid');
  const [search,     setSearch]     = useState('');
  const [filter,     setFilter]     = useState('all');
  const [categoryFilter, setCategoryFilter] = useState<ProjectCategory>('all');
  const [sortBy,     setSortBy]     = useState<'name' | 'budget' | 'spent' | 'net' | 'used'>('name');
  const [sortDir,    setSortDir]    = useState<'asc' | 'desc'>('asc');
  const [timePeriod, setTimePeriod] = useState('all');
  const [projectCardPickerOpen, setProjectCardPickerOpen] = useState(false);
  const [selectedProjectCardIds, setSelectedProjectCardIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [...DEFAULT_PROJECT_CARDS];
    const saved = window.localStorage.getItem(PROJECT_CARD_STORAGE_KEY);
    if (!saved) return [...DEFAULT_PROJECT_CARDS];
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) && parsed.length ? parsed : [...DEFAULT_PROJECT_CARDS];
    } catch {
      return [...DEFAULT_PROJECT_CARDS];
    }
  });

  useEffect(() => {
    window.localStorage.setItem(PROJECT_CARD_STORAGE_KEY, JSON.stringify(selectedProjectCardIds));
  }, [selectedProjectCardIds]);

  const selectedRangeLabel = financeRangeLabel(timePeriod);
  const rangedChecks = useMemo(
    () => checks.filter((c: any) => isInFinanceRange(c.issue_date || c.posting_date || c.created_at, timePeriod)),
    [checks, timePeriod],
  );
  const rangedIncome = useMemo(
    () => income.filter((t: any) => isInFinanceRange(t.transaction_date || t.posting_date || t.created_at, timePeriod)),
    [income, timePeriod],
  );
  const rangedExpenses = useMemo(
    () => expenses.filter((t: any) => isInFinanceRange(t.transaction_date || t.posting_date || t.created_at, timePeriod)),
    [expenses, timePeriod],
  );

  /* ── Enriched data ── */
  const enriched = useMemo(() => projects.map((p: any) => {
    const pChecks   = rangedChecks.filter((c: any) => c.project_id === p.id);
    const pIn       = rangedIncome.filter((t: any) => t.project_id === p.id).reduce((s: number, t: any) => s + Number(t.total_amount ?? t.amount ?? 0), 0);
    const pExp      = rangedExpenses.filter((t: any) => t.project_id === p.id).reduce((s: number, t: any) => s + Number(t.total_amount ?? t.amount ?? 0), 0);
    const cleared   = pChecks.filter((c: any) => c.status === 'cleared').reduce((s: number, c: any) => s + Number(c.amount), 0);
    const outstanding = pChecks.filter((c: any) => c.status === 'pending').reduce((s: number, c: any) => s + Number(c.amount), 0);
    const spent     = pExp + cleared;
    const budget    = Number(p.budget);
    const used      = budget > 0 ? Math.min(150, (spent / budget) * 100) : 0;
    const collectionPct = budget > 0 ? Math.min(150, (pIn / budget) * 100) : 0;
    const outstandingRatio = budget > 0 ? outstanding / budget : 0;
    const cashRatio = pIn > 0 ? (pIn - spent) / Math.max(pIn, 1) : 0;
    const statusPenalty = p.status === 'on_hold' ? 12 : p.status === 'archived' ? 22 : 0;
    const healthScore = Math.max(0, Math.min(100,
      92
      - Math.max(0, (spent / Math.max(budget, 1)) - 0.78) * 95
      - outstandingRatio * 28
      - statusPenalty
      + (cashRatio > 0.12 ? 5 : 0)
    ));
    const category = inferProjectCategory(p);
    return {
      ...p,
      projectCategory: category,
      projectCategoryLabel: categoryById(category).label,
      incoming: pIn,
      spent,
      outstanding,
      net: pIn - spent,
      used,
      collectionPct,
      healthScore,
      healthLabel: healthTone(healthScore).label,
    };
  }), [projects, rangedChecks, rangedIncome, rangedExpenses]);

  /* ── Portfolio KPIs ── */
  const portfolio = useMemo(() => ({
    total:        enriched.length,
    active:       enriched.filter((p: any) => p.status === 'active').length,
    totalBudget:  enriched.reduce((s: number, p: any) => s + Number(p.budget), 0),
    totalSpent:   enriched.reduce((s: number, p: any) => s + p.spent, 0),
    totalIncoming:enriched.reduce((s: number, p: any) => s + p.incoming, 0),
    totalNet:     enriched.reduce((s: number, p: any) => s + p.net, 0),
    avgHealth:    enriched.length ? enriched.reduce((s: number, p: any) => s + p.healthScore, 0) / enriched.length : 0,
    atRisk:       enriched.filter((p: any) => p.healthScore < 64).length,
    overBudget:   enriched.filter((p: any) => p.used >= 100).length,
    outstanding:  enriched.reduce((s: number, p: any) => s + p.outstanding, 0),
  }), [enriched]);

  const categoryStats = useMemo(() => PROJECT_CATEGORIES.map(category => {
    const list = category.id === 'all' ? enriched : enriched.filter((p: any) => p.projectCategory === category.id);
    return {
      ...category,
      count: list.length,
      budget: list.reduce((s: number, p: any) => s + Number(p.budget || 0), 0),
      net: list.reduce((s: number, p: any) => s + p.net, 0),
      health: list.length ? list.reduce((s: number, p: any) => s + p.healthScore, 0) / list.length : 0,
    };
  }), [enriched]);

  const portfolioTrend = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, idx) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
      const month = d.getMonth();
      const year = d.getFullYear();
      const label = d.toLocaleDateString('en-US', { month: 'short' });
      const revenue = rangedIncome
        .filter((t: any) => {
          const td = new Date(t.transaction_date || t.date || t.created_at);
          return td.getMonth() === month && td.getFullYear() === year;
        })
        .reduce((s: number, t: any) => s + Number(t.total_amount ?? t.amount ?? 0), 0);
      const cost = rangedExpenses
        .filter((t: any) => {
          const td = new Date(t.transaction_date || t.date || t.created_at);
          return td.getMonth() === month && td.getFullYear() === year;
        })
        .reduce((s: number, t: any) => s + Number(t.total_amount ?? t.amount ?? 0), 0);
      return { label, revenue, cost, net: revenue - cost };
    });
  }, [rangedIncome, rangedExpenses]);

  const categoryChart = useMemo(
    () => categoryStats.filter(c => c.id !== 'all').map(c => ({ name: c.short, value: c.count, budget: c.budget, color: c.color })),
    [categoryStats],
  );

  const projectCardCatalog = useMemo(() => {
    const activeCategory = (id: ProjectCategory) => categoryStats.find(c => c.id === id);
    const collectionCoverage = portfolio.totalBudget > 0 ? (portfolio.totalIncoming / portfolio.totalBudget) * 100 : 0;
    const deployedPct = portfolio.totalBudget > 0 ? (portfolio.totalSpent / portfolio.totalBudget) * 100 : 0;
    const healthBars = enriched.slice(0, 8).map((p: any) => ({ name: p.code || p.name, health: p.healthScore, color: healthTone(p.healthScore).color }));

    return [
      {
        id: 'health',
        label: 'Portfolio Health',
        value: Math.round(portfolio.avgHealth).toString(),
        sub: `${portfolio.active} active · ${portfolio.atRisk} watch-list`,
        aux: `${portfolio.overBudget} over budget`,
        icon: FolderKanban,
        color: '#9D7E3F',
        chartLabel: 'Health',
        chart: (
          <BarChart data={healthBars}>
            <RechartsTooltip allowEscapeViewBox={{ x: true, y: true }} wrapperStyle={{ zIndex: 90, pointerEvents: 'none' }} cursor={{ fill: 'rgba(157,126,63,0.08)' }} formatter={(value: number) => [`${Math.round(value)}`, 'Health']} labelStyle={{ color: '#111827', fontSize: 11, fontWeight: 700 }} />
            <Bar dataKey="health" radius={[3, 3, 0, 0]}>
              {healthBars.map((p: any) => <Cell key={p.name} fill={p.color} />)}
            </Bar>
          </BarChart>
        ),
      },
      {
        id: 'contract',
        label: 'Contract Value',
        value: fmtUSD(portfolio.totalBudget),
        sub: `${portfolio.total} total projects under management`,
        aux: `${fmtUSD(portfolio.totalIncoming)} collected`,
        icon: CircleDollarSign,
        color: '#2563eb',
        chartLabel: 'Budget',
        chart: (
          <BarChart data={categoryChart}>
            <RechartsTooltip allowEscapeViewBox={{ x: true, y: true }} wrapperStyle={{ zIndex: 90, pointerEvents: 'none' }} cursor={{ fill: 'rgba(37,99,235,0.08)' }} formatter={(value: number) => [fmtUSD(value), 'Budget']} labelStyle={{ color: '#111827', fontSize: 11, fontWeight: 700 }} />
            <Bar dataKey="budget" radius={[3, 3, 0, 0]}>
              {categoryChart.map((c) => <Cell key={c.name} fill={c.color} />)}
            </Bar>
          </BarChart>
        ),
      },
      {
        id: 'deployed',
        label: 'Capital Deployed',
        value: fmtUSD(portfolio.totalSpent),
        sub: `${deployedPct.toFixed(1)}% of approved budgets`,
        aux: `${fmtUSD(portfolio.totalBudget - portfolio.totalSpent)} remaining`,
        icon: Activity,
        color: '#ef4444',
        chartLabel: 'Costs',
        chart: (
          <AreaChart data={portfolioTrend}>
            <defs><linearGradient id="projectCostCustom" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.32} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} /></linearGradient></defs>
            <XAxis dataKey="label" hide /><YAxis hide />
            <RechartsTooltip allowEscapeViewBox={{ x: true, y: true }} wrapperStyle={{ zIndex: 90, pointerEvents: 'none' }} formatter={(value: number) => [fmtUSD(value), 'Costs']} labelStyle={{ color: '#111827', fontSize: 11, fontWeight: 700 }} />
            <Area type="monotone" dataKey="cost" stroke="#ef4444" fill="url(#projectCostCustom)" strokeWidth={2} />
          </AreaChart>
        ),
      },
      {
        id: 'cash',
        label: 'Cash Position',
        value: fmtUSD(portfolio.totalNet),
        sub: `${fmtUSD(portfolio.outstanding)} outstanding checks`,
        aux: portfolio.totalNet >= 0 ? 'Positive portfolio cash' : 'Cash pressure visible',
        icon: ShieldCheck,
        color: portfolio.totalNet >= 0 ? '#10b981' : '#ef4444',
        chartLabel: 'Net',
        chart: (
          <AreaChart data={portfolioTrend}>
            <defs><linearGradient id="projectNetCustom" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0.02} /></linearGradient></defs>
            <XAxis dataKey="label" hide /><YAxis hide />
            <RechartsTooltip allowEscapeViewBox={{ x: true, y: true }} wrapperStyle={{ zIndex: 90, pointerEvents: 'none' }} formatter={(value: number) => [fmtUSD(value), 'Net']} labelStyle={{ color: '#111827', fontSize: 11, fontWeight: 700 }} />
            <Area type="monotone" dataKey="net" stroke="#10b981" fill="url(#projectNetCustom)" strokeWidth={2} />
          </AreaChart>
        ),
      },
      {
        id: 'active',
        label: 'Active Work',
        value: String(portfolio.active),
        sub: `${portfolio.total - portfolio.active} inactive or complete`,
        aux: `${portfolio.total} total records`,
        icon: Grid3X3,
        color: '#111827',
        chartLabel: 'Projects',
        chart: (
          <BarChart data={categoryChart}>
            <RechartsTooltip allowEscapeViewBox={{ x: true, y: true }} wrapperStyle={{ zIndex: 90, pointerEvents: 'none' }} formatter={(value: number) => [value, 'Projects']} labelStyle={{ color: '#111827', fontSize: 11, fontWeight: 700 }} />
            <Bar dataKey="value" radius={[3, 3, 0, 0]} fill="#111827" />
          </BarChart>
        ),
      },
      {
        id: 'risk',
        label: 'Watch List',
        value: String(portfolio.atRisk),
        sub: 'Projects under health threshold',
        aux: `${portfolio.overBudget} over budget`,
        icon: AlertTriangle,
        color: '#f59e0b',
        chartLabel: 'Risk',
        chart: (
          <BarChart data={healthBars}>
            <RechartsTooltip allowEscapeViewBox={{ x: true, y: true }} wrapperStyle={{ zIndex: 90, pointerEvents: 'none' }} formatter={(value: number) => [`${Math.round(value)}`, 'Health']} labelStyle={{ color: '#111827', fontSize: 11, fontWeight: 700 }} />
            <Bar dataKey="health" radius={[3, 3, 0, 0]} fill="#f59e0b" />
          </BarChart>
        ),
      },
      {
        id: 'open-checks',
        label: 'Open Checks',
        value: fmtUSD(portfolio.outstanding),
        sub: 'Pending project obligations',
        aux: `${portfolio.overBudget} budget alerts`,
        icon: FileText,
        color: '#7c3aed',
        chartLabel: 'Open checks',
        chart: (
          <BarChart data={enriched.slice(0, 8).map((p: any) => ({ name: p.code || p.name, outstanding: p.outstanding }))}>
            <RechartsTooltip allowEscapeViewBox={{ x: true, y: true }} wrapperStyle={{ zIndex: 90, pointerEvents: 'none' }} formatter={(value: number) => [fmtUSD(value), 'Open checks']} labelStyle={{ color: '#111827', fontSize: 11, fontWeight: 700 }} />
            <Bar dataKey="outstanding" radius={[3, 3, 0, 0]} fill="#7c3aed" />
          </BarChart>
        ),
      },
      {
        id: 'collections',
        label: 'Collection Coverage',
        value: `${collectionCoverage.toFixed(1)}%`,
        sub: `${fmtUSD(portfolio.totalIncoming)} collected`,
        aux: `${fmtUSD(Math.max(portfolio.totalBudget - portfolio.totalIncoming, 0))} uncollected`,
        icon: Download,
        color: '#0f766e',
        chartLabel: 'Revenue',
        chart: (
          <AreaChart data={portfolioTrend}>
            <defs><linearGradient id="projectRevenueCustom" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0f766e" stopOpacity={0.3} /><stop offset="95%" stopColor="#0f766e" stopOpacity={0.02} /></linearGradient></defs>
            <XAxis dataKey="label" hide /><YAxis hide />
            <RechartsTooltip allowEscapeViewBox={{ x: true, y: true }} wrapperStyle={{ zIndex: 90, pointerEvents: 'none' }} formatter={(value: number) => [fmtUSD(value), 'Revenue']} labelStyle={{ color: '#111827', fontSize: 11, fontWeight: 700 }} />
            <Area type="monotone" dataKey="revenue" stroke="#0f766e" fill="url(#projectRevenueCustom)" strokeWidth={2} />
          </AreaChart>
        ),
      },
      ...(['residential', 'commercial', 'management'] as ProjectCategory[]).map((id) => {
        const category = activeCategory(id)!;
        return {
          id,
          label: category.label,
          value: String(category.count),
          sub: `${fmtUSD(category.budget)} contract value`,
          aux: `${Math.round(category.health || 0)} avg health`,
          icon: category.icon,
          color: category.color,
          chartLabel: category.short,
          chart: (
            <BarChart data={[category]}>
              <RechartsTooltip allowEscapeViewBox={{ x: true, y: true }} wrapperStyle={{ zIndex: 90, pointerEvents: 'none' }} formatter={(value: number) => [fmtUSD(value), 'Budget']} labelStyle={{ color: '#111827', fontSize: 11, fontWeight: 700 }} />
              <Bar dataKey="budget" radius={[3, 3, 0, 0]} fill={category.color} />
            </BarChart>
          ),
        };
      }),
    ];
  }, [categoryChart, categoryStats, enriched, portfolio, portfolioTrend]);

  const visibleProjectCards = selectedProjectCardIds
    .map(id => projectCardCatalog.find(card => card.id === id))
    .filter(Boolean);

  const updateSelectedProjectCards = (nextIds: string[], reason: string) => {
    if (!nextIds.length) {
      toast.error('Keep at least one project card visible.');
      return;
    }
    const previous = selectedProjectCardIds;
    setSelectedProjectCardIds(nextIds);
    void logFinanceChange({
      action: 'preference_updated',
      entity: 'projects_dashboard',
      entityId: 'projects_metric_cards',
      entityLabel: 'Projects dashboard metric cards',
      details: { reason, previous, current: nextIds },
    });
  };

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
      .filter((p: any) => categoryFilter === 'all' || p.projectCategory === categoryFilter)
      .filter((p: any) => !q || p.name.toLowerCase().includes(q) || (p.code || '').toLowerCase().includes(q))
      .sort((a: any, b: any) => {
        const va = sortBy === 'name' ? a.name : sortBy === 'budget' ? Number(a.budget) : sortBy === 'spent' ? a.spent : sortBy === 'net' ? a.net : a.used;
        const vb = sortBy === 'name' ? b.name : sortBy === 'budget' ? Number(b.budget) : sortBy === 'spent' ? b.spent : sortBy === 'net' ? b.net : b.used;
        if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb as string) : (vb as string).localeCompare(va);
        return sortDir === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number);
      });
  }, [enriched, filter, categoryFilter, search, sortBy, sortDir]);

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
  const openEdit = (p: any) => {
    setForm({
      id: p.id,
      name: p.name,
      code: p.code || '',
      budget: p.budget,
      department: p.department || p.projectCategoryLabel || categoryById(inferProjectCategory(p)).label,
      status: p.status,
      notes: p.notes || '',
    });
    setOpen(true);
  };
  const cycleSort = (col: typeof sortBy) => { if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortBy(col); setSortDir('asc'); } };

  /* ── Totals helper for footer ── */
  const tot = (key: string) => displayed.reduce((s: number, p: any) => s + (Number(p[key]) || 0), 0);

  return (
    <AppShell>
      <style>{PROJ_CSS}</style>

      {/* ── New Project Wizard ── */}
      <AnimatePresence>
        {showWizard && (
          <FinanceProjectWizard
            open={showWizard}
            onClose={() => setShowWizard(false)}
            existingCount={projects.length}
          />
        )}
      </AnimatePresence>

      {/* ── Edit Project Dialog ── */}
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
                <CurrencyInput value={form.budget} onValueChange={v => setForm({ ...form, budget: v })} placeholder="0.00" />
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
              <Label className="micro-label">Project Category</Label>
              <Select value={form.department || 'Residential Construction'} onValueChange={(v: any) => setForm({ ...form, department: v })}>
                <SelectTrigger className="rounded-none h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Residential Construction">Residential Construction</SelectItem>
                  <SelectItem value="Commercial Construction">Commercial Construction</SelectItem>
                  <SelectItem value="Project Management">Project Management</SelectItem>
                </SelectContent>
              </Select>
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
            <div className="hidden sm:block">
              <FinanceRangePicker value={timePeriod} onChange={setTimePeriod} accentColor={entity?.color} />
            </div>
            <div className="hidden sm:flex items-center gap-1">
              <button onClick={exportPDF} title="Export PDF"
                className="proj-export h-9 px-3 flex items-center gap-2 text-[9px] uppercase tracking-[0.16em] font-bold text-foreground transition-all">
                <FileText className="w-3.5 h-3.5" />
                PDF
              </button>
              <button onClick={exportExcel} title="Export Excel"
                className="proj-export h-9 px-3 flex items-center gap-2 text-[9px] uppercase tracking-[0.16em] font-bold text-foreground transition-all">
                <Table2 className="w-3.5 h-3.5" />
                Excel
              </button>
            </div>
            <Button onClick={() => setShowWizard(true)} className="rounded-none h-8 text-[10px] uppercase tracking-wider">
              <Plus className="w-3 h-3 mr-1.5" /> New Project
            </Button>
          </div>
        }
      />

      <div className="proj-shell border-t border-border/50">
      <div className="sm:hidden px-4 py-3 border-b border-border">
        <FinanceRangePicker value={timePeriod} onChange={setTimePeriod} accentColor={entity?.color} />
      </div>
      {/* ── Portfolio Intelligence ── */}
      <div className="px-4 sm:px-8 py-3">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-3">
          <div>
            <div className="text-[9px] uppercase tracking-[0.24em] font-black text-foreground/55">Portfolio Intelligence · {selectedRangeLabel}</div>
            <div className="text-sm font-semibold tracking-tight mt-0.5">Choose the project signals that keep operations focused.</div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-none h-8 text-[10px] uppercase tracking-[0.16em] font-bold self-start sm:self-auto"
            onClick={() => setProjectCardPickerOpen(open => !open)}
          >
            <Settings2 className="w-3.5 h-3.5 mr-1.5" />
            Customize
          </Button>
        </div>

        {projectCardPickerOpen && (
          <div className="proj-panel p-2.5 mb-3">
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-2">
              {projectCardCatalog.map((card: any) => {
                const active = selectedProjectCardIds.includes(card.id);
                const Icon = card.icon;
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => {
                      const next = active
                        ? selectedProjectCardIds.filter(id => id !== card.id)
                        : [...selectedProjectCardIds, card.id];
                      updateSelectedProjectCards(next, active ? `hid ${card.label}` : `showed ${card.label}`);
                    }}
                    className={`proj-export p-2 text-left min-w-0 ${active ? 'proj-category-active' : ''}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-7 h-7 border border-border bg-secondary/40 flex items-center justify-center shrink-0" style={{ color: card.color }}>
                        <Icon className="w-3.5 h-3.5" strokeWidth={1.7} />
                      </span>
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold truncate text-foreground">{card.label}</div>
                        <div className="text-[8px] uppercase tracking-[0.16em] font-bold text-foreground/55">{active ? 'Visible' : 'Hidden'}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end mt-2">
              <Button variant="ghost" size="sm" className="rounded-none h-7 text-[10px]" onClick={() => updateSelectedProjectCards([...DEFAULT_PROJECT_CARDS], 'reset project card selection')}>
                Reset cards
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {visibleProjectCards.map((card: any) => {
            const Icon = card.icon;
            return (
              <div key={card.id} className="proj-intel-card min-w-0">
                <span className="absolute inset-x-0 bottom-0 h-[2px]" style={{ backgroundColor: card.color }} />
                <div className="relative flex items-start justify-between gap-3 p-2.5 sm:p-3 pb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[8px] uppercase tracking-[0.18em] font-bold text-foreground/60 mb-1">
                      <Icon className="w-3 h-3" /> {card.label}
                    </div>
                    <div className="text-lg font-bold font-mono-tab leading-tight truncate" style={{ color: card.id === 'cash' ? card.color : undefined }}>{card.value}</div>
                    <div className="text-[9px] text-foreground/60 mt-1 truncate">{card.sub}</div>
                  </div>
                  <div className="proj-spark">
                    <ResponsiveContainer width="100%" height="100%">
                      {card.chart}
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="proj-card-foot relative px-2.5 sm:px-3 py-1.5 flex items-center justify-between gap-2">
                  <span className="text-[8px] uppercase tracking-[0.16em] font-bold text-foreground/48 truncate">{card.chartLabel}</span>
                  <span className="text-[9px] font-mono-tab font-semibold text-foreground/68 truncate">{card.aux}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Category Intelligence ── */}
      <div className="px-4 sm:px-8 pb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
          {categoryStats.map((category) => {
            const Icon = category.icon;
            const active = categoryFilter === category.id;
            return (
              <button
                key={category.id}
                onClick={() => setCategoryFilter(category.id)}
                className={`proj-intel-card ${active ? 'proj-category-active' : ''} p-2.5 text-left min-w-0`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="w-7 h-7 border border-border bg-secondary/40 flex items-center justify-center shrink-0" style={{ color: category.color }}>
                        <Icon className="w-3.5 h-3.5" strokeWidth={1.7} />
                      </span>
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold tracking-tight truncate text-foreground">{category.label}</div>
                        <div className="text-[8px] uppercase tracking-[0.18em] font-bold text-foreground/55">{category.count} project{category.count === 1 ? '' : 's'}</div>
                      </div>
                    </div>
                    <div className="text-[13px] font-mono-tab font-bold truncate">{fmtUSD(category.budget)}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[9px] uppercase tracking-[0.16em] font-bold text-foreground/55">Health</div>
                    <div className="text-sm font-mono-tab font-black" style={{ color: healthTone(category.health).color }}>{Math.round(category.health || 0)}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Controls Row ── */}
      <div className="px-4 sm:px-8 pb-4 space-y-2 sm:space-y-0 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
        {/* Top row on mobile: search + view toggle */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 sm:flex-none sm:min-w-[220px] sm:max-w-[300px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search projects…"
              className="w-full pl-7 pr-3 h-10 text-xs border border-border bg-background placeholder:text-muted-foreground/60 focus:outline-none focus:border-foreground/30 transition-colors"
            />
          </div>
          {/* View toggle */}
          <div className="ml-auto sm:ml-0 flex border border-border overflow-hidden shrink-0">
            {([
              { mode: 'grid'  as const, Icon: Grid3X3,  title: 'Card View'  },
              { mode: 'table' as const, Icon: List,      title: 'Table View' },
              { mode: 'wip'   as const, Icon: BarChart2, title: 'WIP Report' },
            ]).map(({ mode, Icon, title }) => (
              <button key={mode} onClick={() => setView(mode)} title={title}
                className={`w-10 h-10 flex items-center justify-center border-r border-border last:border-r-0 transition-all ${
                  view === mode ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                }`}>
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
        </div>

        {/* Status filter tabs — scrollable on mobile */}
        <div className="flex overflow-x-auto gap-0 border border-border shrink-0 sm:ml-auto scrollbar-none">
          {(['all', 'active', 'on_hold', 'completed', 'archived'] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-2.5 text-[9px] uppercase tracking-[0.12em] font-bold border-r border-border last:border-r-0 transition-all whitespace-nowrap ${
                filter === s ? 'bg-foreground text-background' : 'bg-background text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}>
              {s === 'all' ? `All (${counts.all})` : s === 'on_hold' ? `Hold (${counts.on_hold})` : `${S[s].label} (${counts[s]})`}
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
            {search || filter !== 'all' || categoryFilter !== 'all' ? 'No matching projects' : 'No projects yet'}
          </div>
          <div className="text-xs text-muted-foreground max-w-xs mb-6">
            {search || filter !== 'all' || categoryFilter !== 'all'
              ? 'Try adjusting your search or filter criteria.'
              : 'Create your first project to start tracking budgets, costs, and revenue across all active jobs.'}
          </div>
          {!search && filter === 'all' && categoryFilter === 'all' && (
            <Button onClick={() => setShowWizard(true)} className="rounded-none h-9 text-xs uppercase tracking-wider">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Create First Project
            </Button>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          GRID VIEW
      ══════════════════════════════════════════════════════════ */}
      {view === 'grid' && displayed.length > 0 && (
        <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
          {displayed.map((p: any, idx: number) => {
            const meta = getMeta(p.status);
            const category = categoryById(p.projectCategory);
            const CategoryIcon = category.icon;
            const health = healthTone(p.healthScore);
            const overBudget = p.used >= 100;
            const nearLimit  = p.used >= 80 && p.used < 100;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24, delay: idx * 0.04 }}
                className="proj-card flex flex-col group cursor-pointer overflow-hidden"
                onClick={() => navigate(`/projects/${p.id}`)}
              >
                {/* Status accent bar */}
                <div className="h-[3px] w-full flex-shrink-0" style={{ backgroundColor: meta.color }} />

                <div className="p-3 flex-1 flex flex-col">
                  {/* Header: badges row */}
                  <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                    {p.code && (
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground font-mono-tab bg-secondary px-2 py-0.5">
                        {p.code}
                      </span>
                    )}
                    <span className={`text-[8px] uppercase tracking-[0.2em] font-bold px-2 py-0.5 border ${meta.cls}`}>
                      {meta.label}
                    </span>
                    <span className="text-[8px] uppercase tracking-[0.16em] font-bold px-2 py-0.5 border border-border bg-secondary/45 text-foreground/70 inline-flex items-center gap-1">
                      <CategoryIcon className="w-2.5 h-2.5" style={{ color: category.color }} />
                      {category.short}
                    </span>
                    {overBudget && (
                      <span className="text-[8px] uppercase tracking-[0.16em] font-bold px-2 py-0.5 border bg-accent/10 text-accent border-accent/30">
                        Over Budget
                      </span>
                    )}
                    {nearLimit && (
                      <span className="text-[8px] uppercase tracking-[0.16em] font-bold px-2 py-0.5 border bg-warning/10 text-warning border-warning/30">
                        Near Limit
                      </span>
                    )}
                  </div>

                  {/* Project name — large and prominent */}
                  <h3 className="text-[15px] font-bold tracking-tight leading-tight mb-1 group-hover:text-accent transition-colors line-clamp-1">
                    {p.name}
                  </h3>
                  {(p.client_name_snapshot || p.location) && (
                    <div className="text-[9px] text-foreground/55 font-mono-tab truncate mb-1.5">
                      {[p.client_name_snapshot, p.location].filter(Boolean).join(' · ')}
                    </div>
                  )}
                  {p.notes && (
                    <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2 mb-2">{p.notes}</p>
                  )}
                  {!p.notes && <div className="mb-2" />}

                  <div className="proj-health-card p-2 mb-2.5">
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <div>
                        <div className="text-[8px] uppercase tracking-[0.18em] font-bold text-foreground/55">Project Health</div>
                        <div className="text-[15px] font-black font-mono-tab leading-tight" style={{ color: health.color }}>{Math.round(p.healthScore)}</div>
                      </div>
                      <div className="text-right min-w-[86px]">
                        <div className="text-[8px] uppercase tracking-[0.18em] font-bold text-foreground/55">Signal</div>
                        <div className="text-[11px] font-bold text-foreground">{health.label}</div>
                        <div className="text-[9px] text-foreground/55">{p.outstanding > 0 ? `${fmtUSD(p.outstanding)} open` : 'No open checks'}</div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {[
                        { label: 'Budget Used', value: p.used, color: overBudget ? '#ef4444' : nearLimit ? '#f59e0b' : category.color },
                        { label: 'Collections', value: p.collectionPct, color: '#10b981' },
                        { label: 'Health', value: p.healthScore, color: health.color },
                      ].map((m) => (
                        <div key={m.label}>
                          <div className="flex items-center justify-between text-[8px] font-bold uppercase tracking-[0.13em] text-foreground/55 mb-1">
                            <span>{m.label}</span>
                            <span className="font-mono-tab text-foreground">{Math.min(m.value, 150).toFixed(0)}%</span>
                          </div>
                          <div className="proj-meter">
                            <motion.span
                              style={{ backgroundColor: m.color }}
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(m.value, 100)}%` }}
                              transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1], delay: 0.04 + idx * 0.025 }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* project financial grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-border border border-border mt-auto">
                    {[
                      { label: 'Contract',  value: fmtUSD(p.budget),   cls: '' },
                      { label: 'Deployed',  value: fmtUSD(p.spent),    cls: '' },
                      { label: 'Revenue',   value: fmtUSD(p.incoming), cls: 'text-positive' },
                      { label: 'Net Cash',  value: fmtUSD(p.net),      cls: p.net >= 0 ? 'text-positive' : 'text-accent' },
                      { label: 'Open Checks', value: fmtUSD(p.outstanding), cls: p.outstanding > 0 ? 'text-warning' : '' },
                      { label: 'Category', value: category.short, cls: '' },
                    ].map(m => (
                      <div key={m.label} className="bg-background/95 px-2 py-1.5 min-w-0">
                        <div className="text-[7px] uppercase tracking-[0.15em] font-bold text-foreground/55 mb-0.5">{m.label}</div>
                        <div className={`text-[11px] font-bold font-mono-tab leading-tight truncate ${m.cls}`}>{m.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card footer */}
                <div
                  className="border-t border-border px-3 py-2 flex items-center justify-between bg-secondary/20"
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    onClick={() => navigate(`/projects/${p.id}`)}
                    className="text-[9px] uppercase tracking-[0.2em] font-bold text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
                  >
                    Open Project <ChevronRight className="w-3 h-3" />
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(p)}
                      className="h-7 px-3 text-[9px] uppercase tracking-wider font-bold text-muted-foreground hover:text-foreground border border-transparent hover:border-border hover:bg-background transition-all"
                    >
                      Edit
                    </button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="h-7 w-7 flex items-center justify-center text-muted-foreground/50 hover:text-accent transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
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
                          <AlertDialogAction className="rounded-none bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => del.mutate(p.id)}>
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
          <div className="proj-panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[1120px]">
                <thead>
                  <tr className="border-b border-border bg-secondary/40">
                    {([
                      { label: 'Project',  col: 'name'   },
                      { label: 'Category', col: null      },
                      { label: 'Status',   col: null      },
                      { label: 'Budget',   col: 'budget'  },
                      { label: 'Deployed', col: 'spent'   },
                      { label: '% Used',   col: 'used'    },
                      { label: 'Health',   col: null      },
                      { label: 'Revenue',  col: null      },
                      { label: 'Open Checks', col: null   },
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
                    const category = categoryById(p.projectCategory);
                    const CategoryIcon = category.icon;
                    const health = healthTone(p.healthScore);
                    return (
                      <tr key={p.id} className="border-b border-border last:border-b-0 proj-row group">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-0.5 h-8 flex-shrink-0" style={{ backgroundColor: meta.color }} />
                            <div>
                              <button onClick={() => navigate(`/projects/${p.id}`)}
                                className="font-semibold hover:text-accent transition-colors text-left block text-[13px] leading-tight">
                                {p.name}
                              </button>
                              <div className="text-[9px] text-muted-foreground font-mono-tab mt-0.5 truncate max-w-[210px]">
                                {[p.code, p.client_name_snapshot || p.location].filter(Boolean).join(' · ') || 'No project code'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-[8px] uppercase tracking-[0.16em] font-bold text-foreground/70">
                            <CategoryIcon className="w-3 h-3" style={{ color: category.color }} />
                            {category.short}
                          </span>
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
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-14 h-1 bg-secondary flex-shrink-0 overflow-hidden">
                              <div className="h-full" style={{ width: `${Math.min(p.healthScore, 100)}%`, backgroundColor: health.color }} />
                            </div>
                            <span className="font-mono-tab text-[11px] font-bold whitespace-nowrap" style={{ color: health.color }}>
                              {Math.round(p.healthScore)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono-tab text-right text-positive font-semibold text-[12px]">{fmtUSD(p.incoming)}</td>
                        <td className={`px-4 py-3 font-mono-tab text-right font-semibold text-[12px] ${p.outstanding > 0 ? 'text-warning' : 'text-muted-foreground'}`}>{fmtUSD(p.outstanding)}</td>
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
                                  <AlertDialogAction className="rounded-none bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => del.mutate(p.id)}>Archive</AlertDialogAction>
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
                    <td className="px-4 py-3 font-bold text-[9px] uppercase tracking-wider" colSpan={3}>
                      Portfolio Total · {displayed.length} project{displayed.length !== 1 ? 's' : ''}
                    </td>
                    <td className="px-4 py-3 font-bold font-mono-tab text-right text-[12px]">{fmtUSD(tot('budget'))}</td>
                    <td className="px-4 py-3 font-bold font-mono-tab text-right text-[12px]">{fmtUSD(tot('spent'))}</td>
                    <td className="px-4 py-3 text-muted-foreground text-[10px]">—</td>
                    <td className="px-4 py-3 text-muted-foreground text-[10px]">—</td>
                    <td className="px-4 py-3 font-bold font-mono-tab text-right text-positive text-[12px]">{fmtUSD(tot('incoming'))}</td>
                    <td className="px-4 py-3 font-bold font-mono-tab text-right text-[12px]">{fmtUSD(tot('outstanding'))}</td>
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
          <div className="proj-panel">
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
              <table className="w-full text-sm min-w-[1080px]">
                <thead>
                  <tr className="border-b border-border">
                    {['Project', 'Category', 'Contract Value', 'Costs Incurred', '% Complete', 'Health', 'Open Checks', 'Revenue Earned', 'Billed to Date', 'Over / Under'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[9px] uppercase tracking-[0.14em] text-muted-foreground font-bold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((p: any) => {
                    const meta        = getMeta(p.status);
                    const category    = categoryById(p.projectCategory);
                    const CategoryIcon = category.icon;
                    const health      = healthTone(p.healthScore);
                    const pct         = p.budget > 0 ? Math.min(100, (p.spent / p.budget) * 100) : 0;
                    const revEarned   = p.budget > 0 ? p.incoming * (pct / 100) : p.incoming;
                    const billed      = p.incoming;
                    const delta       = billed - revEarned;
                    return (
                      <tr key={p.id} className="border-b border-border last:border-b-0 proj-row">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-0.5 h-7" style={{ backgroundColor: meta.color }} />
                            <div>
                              <button onClick={() => navigate(`/projects/${p.id}`)}
                                className="font-semibold hover:text-accent transition-colors text-left block">
                                {p.name}
                              </button>
                              <div className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5 truncate max-w-[220px]">
                                {[p.code || meta.label, p.client_name_snapshot || p.location].filter(Boolean).join(' · ')}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-[8px] uppercase tracking-[0.16em] font-bold text-foreground/70">
                            <CategoryIcon className="w-3 h-3" style={{ color: category.color }} />
                            {category.short}
                          </span>
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
                        <td className="px-4 py-3">
                          <div className="font-mono-tab text-xs font-black" style={{ color: health.color }}>{Math.round(p.healthScore)}</div>
                          <div className="text-[8px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{health.label}</div>
                        </td>
                        <td className={`px-4 py-3 font-mono-tab font-semibold ${p.outstanding > 0 ? 'text-warning' : 'text-muted-foreground'}`}>{fmtUSD(p.outstanding)}</td>
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
                    <td className="px-4 py-3 font-bold text-[9px] uppercase tracking-wider" colSpan={2}>Portfolio Totals</td>
                    <td className="px-4 py-3 font-bold font-mono-tab">{fmtUSD(tot('budget'))}</td>
                    <td className="px-4 py-3 font-bold font-mono-tab">{fmtUSD(tot('spent'))}</td>
                    <td className="px-4 py-3 text-muted-foreground text-[10px]">—</td>
                    <td className="px-4 py-3 text-muted-foreground text-[10px]">—</td>
                    <td className="px-4 py-3 font-bold font-mono-tab">{fmtUSD(tot('outstanding'))}</td>
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
      </div>
    </AppShell>
  );
}
