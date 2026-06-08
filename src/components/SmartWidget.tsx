import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap, X, Search, FileText, ArrowDownToLine, ArrowUpFromLine,
  LayoutGrid, BookOpen, FolderKanban, Users, Download,
  AlertTriangle, CheckCircle2, TrendingUp, ChevronRight,
  Activity, Calendar, Clock, PieChart, BarChart3,
  DollarSign, Target, Shield, TrendingDown,
  GitCompare, Eye, Lightbulb, ArrowRight,
  Printer, Siren,
} from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useChecks, useTransactions, useVendors, useProjects } from '@/hooks/useFinance';
import { fmtUSD, fmtDate } from '@/lib/format';
import { toast } from 'sonner';
import {
  generateTransactionReport, generateCheckRegisterReport,
  generateLedgerReport, generateProjectReport,
  savePDF, downloadCSV,
} from '@/lib/reports';

/* ── Section wrapper ─────────────────────────────────── */
function Section({ label, children, icon }: { label: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="px-4 py-3 border-b border-border last:border-b-0">
      <div className="flex items-center gap-1.5 mb-2.5">
        {icon && <span className="text-muted-foreground w-3 h-3">{icon}</span>}
        <div className="micro-label">{label}</div>
      </div>
      {children}
    </div>
  );
}

/* ── Type color ── */
const typeColor: Record<string, string> = {
  Check: 'text-foreground',
  Income: 'text-positive',
  Expense: 'text-accent',
  Vendor: 'text-muted-foreground',
  Project: 'text-muted-foreground',
};

/* ── Main widget ─────────────────────────────────────────── */
export default function SmartWidget() {
  const [open, setOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'export' | 'insights' | 'audit'>('overview');
  const navigate = useNavigate();

  const { data: checks = [] } = useChecks();
  const { data: income = [] } = useTransactions('income');
  const { data: expenses = [] } = useTransactions('expense');
  const { data: vendors = [] } = useVendors();
  const { data: projects = [] } = useProjects();

  /* ── Global keyboard shortcut ── */
  const handleKey = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setOpen(prev => !prev);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  /* ── Unified search corpus ── */
  const allEntries = useMemo(() => [
    ...checks.map((c: any) => ({
      type: 'Check', label: `#${c.check_number} · ${c.payee_name}`,
      sub: c.projects?.name, amount: -Number(c.amount),
      date: c.issue_date, status: c.status,
    })),
    ...income.map((t: any) => ({
      type: 'Income', label: t.source_name || t.vendors?.name || '—',
      sub: t.projects?.name, amount: Number(t.amount),
      date: t.transaction_date, status: null,
    })),
    ...expenses.map((t: any) => ({
      type: 'Expense', label: t.vendors?.name || t.category || '—',
      sub: t.projects?.name, amount: -Number(t.amount),
      date: t.transaction_date, status: null,
    })),
    ...vendors.map((v: any) => ({
      type: 'Vendor', label: v.name, sub: v.contact_email,
      amount: null, date: v.created_at?.slice(0, 10), status: null,
    })),
    ...projects.map((p: any) => ({
      type: 'Project', label: p.name, sub: p.code,
      amount: null, date: p.created_at?.slice(0, 10), status: p.status,
    })),
  ].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')), [checks, income, expenses, vendors, projects]);

  const searchResults = useMemo(() => {
    if (!searchQ.trim()) return [];
    const q = searchQ.toLowerCase();
    return allEntries.filter(e =>
      e.label.toLowerCase().includes(q) ||
      (e.sub ?? '').toLowerCase().includes(q) ||
      e.type.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [searchQ, allEntries]);

  const recentEntries = useMemo(() => allEntries.slice(0, 4), [allEntries]);

  /* ── MTD stats ── */
  const mtd = useMemo(() => {
    const start = new Date();
    start.setDate(1); start.setHours(0, 0, 0, 0);
    const inMonth = (d: string) => new Date(d) >= start;
    const inflowMTD = income.filter((t: any) => inMonth(t.transaction_date)).reduce((s: number, t: any) => s + Number(t.amount), 0);
    const expMTD = expenses.filter((t: any) => inMonth(t.transaction_date)).reduce((s: number, t: any) => s + Number(t.amount), 0);
    const checkMTD = checks.filter((c: any) => inMonth(c.issue_date) && c.status === 'cleared').reduce((s: number, c: any) => s + Number(c.amount), 0);
    const outflowMTD = expMTD + checkMTD;
    const totalIn = income.reduce((s: number, t: any) => s + Number(t.amount), 0);
    const totalOut = expenses.reduce((s: number, t: any) => s + Number(t.amount), 0) + checks.filter((c: any) => c.status === 'cleared').reduce((s: number, c: any) => s + Number(c.amount), 0);
    return { inflowMTD, outflowMTD, netMTD: inflowMTD - outflowMTD, balance: totalIn - totalOut };
  }, [checks, income, expenses]);

  /* ── Cash flow trends (last 6 months) ── */
  const cashFlowTrend = useMemo(() => {
    const months: { label: string; inflow: number; outflow: number; net: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const y = d.getFullYear();
      const m = d.getMonth();
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 1);
      const inRange = (dt: string) => {
        const d2 = new Date(dt);
        return d2 >= start && d2 < end;
      };
      const inflow = income.filter((t: any) => inRange(t.transaction_date)).reduce((s: number, t: any) => s + Number(t.amount), 0);
      const exp = expenses.filter((t: any) => inRange(t.transaction_date)).reduce((s: number, t: any) => s + Number(t.amount), 0);
      const chk = checks.filter((c: any) => inRange(c.issue_date) && c.status === 'cleared').reduce((s: number, c: any) => s + Number(c.amount), 0);
      const outflow = exp + chk;
      months.push({
        label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        inflow, outflow, net: inflow - outflow,
      });
    }
    return months;
  }, [income, expenses, checks]);

  /* ── Insights ── */
  const insights = useMemo(() => {
    const list: { icon: any; text: string; type: 'positive' | 'warning' | 'info' }[] = [];

    // Top vendor by spend
    const vendorSpend: Record<string, number> = {};
    expenses.forEach((t: any) => {
      const name = t.vendors?.name || 'Unlinked';
      vendorSpend[name] = (vendorSpend[name] || 0) + Number(t.amount);
    });
    const topVendor = Object.entries(vendorSpend).sort(([, a], [, b]) => b - a)[0];
    if (topVendor) {
      list.push({ icon: TrendingUp, text: `Top vendor: ${topVendor[0]} (${fmtUSD(topVendor[1])})`, type: 'info' });
    }

    // Burn rate
    const avgMonthlyOutflow = cashFlowTrend.reduce((s, m) => s + m.outflow, 0) / Math.max(cashFlowTrend.length, 1);
    if (avgMonthlyOutflow > 0) {
      const monthsOfRunway = mtd.balance > 0 ? (mtd.balance / avgMonthlyOutflow).toFixed(1) : '0';
      list.push({ icon: Shield, text: `${monthsOfRunway} months of operating runway at current burn rate`, type: monthsOfRunway === '0' ? 'warning' : 'positive' });
    }

    // Income trend
    const recentInflow = cashFlowTrend.slice(-3).reduce((s, m) => s + m.inflow, 0);
    const priorInflow = cashFlowTrend.slice(-6, -3).reduce((s, m) => s + m.inflow, 0);
    if (priorInflow > 0) {
      const pct = ((recentInflow - priorInflow) / priorInflow * 100).toFixed(1);
      list.push({
        icon: Number(pct) >= 0 ? TrendingUp : TrendingDown,
        text: `Income ${Number(pct) >= 0 ? 'up' : 'down'} ${Math.abs(Number(pct)).toFixed(1)}% (last 3mo vs prior 3mo)`,
        type: Number(pct) >= 0 ? 'positive' : 'warning',
      });
    }

    // Active projects
    const active = projects.filter((p: any) => p.status === 'active');
    list.push({ icon: FolderKanban, text: `${active.length} active project${active.length !== 1 ? 's' : ''}`, type: 'info' });

    // Aging checks
    const now = new Date();
    const thirtyAgo = new Date(now.getTime() - 30 * 86400000);
    const agingChecks = checks.filter((c: any) => c.status === 'pending' && new Date(c.issue_date) < thirtyAgo);
    if (agingChecks.length > 0) {
      list.push({ icon: AlertTriangle, text: `${agingChecks.length} check${agingChecks.length > 1 ? 's' : ''} pending 30+ days`, type: 'warning' });
    }

    // Unlinked transactions
    const unlinked = expenses.filter((t: any) => !t.project_id).length;
    if (unlinked > 0) {
      list.push({ icon: AlertTriangle, text: `${unlinked} expense${unlinked > 1 ? 's' : ''} not linked to a project`, type: 'warning' });
    }

    // Expense concentration
    const totalExp = expenses.reduce((s: number, t: any) => s + Number(t.amount), 0);
    if (totalExp > 0 && topVendor) {
      const concentration = ((topVendor[1] / totalExp) * 100).toFixed(0);
      if (Number(concentration) > 40) {
        list.push({ icon: Target, text: `High vendor concentration: ${topVendor[0]} is ${concentration}% of expenses`, type: 'warning' });
      }
    }

    // Check clearance rate
    const totalChecks = checks.length;
    if (totalChecks > 0) {
      const clearedChecks = checks.filter((c: any) => c.status === 'cleared').length;
      const rate = ((clearedChecks / totalChecks) * 100).toFixed(0);
      list.push({ icon: Activity, text: `Check clearance rate: ${rate}%`, type: Number(rate) < 50 ? 'warning' : 'positive' });
    }

    return list;
  }, [expenses, checks, projects, income, cashFlowTrend, mtd]);

  /* ── Financial Safeguard: Balance/Exposure Ratio ── */
  const safeguard = useMemo(() => {
    const totalExposure = projects
      .filter((p: any) => p.status === 'active')
      .reduce((s: number, p: any) => s + Number(p.budget), 0);
    const ratio = totalExposure > 0 ? (mtd.balance / totalExposure) * 100 : 100;
    return {
      ratio,
      balance: mtd.balance,
      exposure: totalExposure,
      isCritical: totalExposure > 0 && ratio < 5,
      isWarning: totalExposure > 0 && ratio < 15 && ratio >= 5,
      isHealthy: totalExposure === 0 || ratio >= 15,
    };
  }, [projects, mtd.balance]);

  /* ── Audit items ── */
  const audit = useMemo(() => {
    const now = new Date();
    const thirtyAgo = new Date(now.getTime() - 30 * 86400000);
    const agingChecks = checks.filter((c: any) => c.status === 'pending' && new Date(c.issue_date) < thirtyAgo);
    const pendingTotal = checks.filter((c: any) => c.status === 'pending').reduce((s: number, c: any) => s + Number(c.amount), 0);
    const activeProjects = projects.filter((p: any) => p.status === 'active');
    const unlinkedExpenses = expenses.filter((t: any) => !t.project_id).length;

    return [
      {
        ok: mtd.balance >= 0,
        icon: mtd.balance >= 0 ? CheckCircle2 : AlertTriangle,
        text: `Net balance: ${fmtUSD(mtd.balance)}`,
      },
      {
        ok: agingChecks.length === 0,
        icon: agingChecks.length === 0 ? CheckCircle2 : AlertTriangle,
        text: agingChecks.length === 0
          ? 'No aging checks (30d+)'
          : `${agingChecks.length} check${agingChecks.length > 1 ? 's' : ''} pending 30+ days`,
      },
      {
        ok: pendingTotal < 100000,
        icon: pendingTotal < 100000 ? CheckCircle2 : AlertTriangle,
        text: `${fmtUSD(pendingTotal)} in pending instruments`,
      },
      {
        ok: unlinkedExpenses === 0,
        icon: unlinkedExpenses === 0 ? CheckCircle2 : AlertTriangle,
        text: unlinkedExpenses === 0
          ? 'All expenses linked to projects'
          : `${unlinkedExpenses} expense${unlinkedExpenses > 1 ? 's' : ''} unlinked`,
      },
      {
        ok: true,
        icon: CheckCircle2,
        text: `${vendors.length} vendor${vendors.length !== 1 ? 's' : ''} · ${activeProjects.length} active project${activeProjects.length !== 1 ? 's' : ''}`,
      },
    ];
  }, [checks, expenses, vendors, projects, mtd]);

  /* ── Navigation ── */
  const quickNav = [
    { to: '/finance', label: 'Overview', icon: LayoutGrid },
    { to: '/checks', label: 'Checks', icon: FileText },
    { to: '/income', label: 'Income', icon: ArrowDownToLine },
    { to: '/expenses', label: 'Expenses', icon: ArrowUpFromLine },
    { to: '/ledger', label: 'Ledger', icon: BookOpen },
    { to: '/projects', label: 'Projects', icon: FolderKanban },
    { to: '/vendors', label: 'Vendors', icon: Users },
  ];

  const go = (to: string) => { navigate(to); setOpen(false); };

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: LayoutGrid },
    { id: 'export' as const, label: 'Export', icon: Download },
    { id: 'insights' as const, label: 'Insights', icon: Lightbulb },
    { id: 'audit' as const, label: 'Audit', icon: Shield },
  ];

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        title="Command Center (⌘K)"
        aria-label="Open command center"
        className="fixed bottom-[4.5rem] md:bottom-6 right-4 md:right-6 z-50 w-12 h-12 bg-foreground text-background flex items-center justify-center shadow-2xl hover:opacity-90 active:scale-95 transition-all duration-150 group"
      >
        <Zap className="w-5 h-5 transition-transform duration-150 group-hover:rotate-12" />
      </button>

      <Sheet open={open} onOpenChange={o => { setOpen(o); if (!o) { setSearchQ(''); setActiveTab('overview'); } }}>
        <SheetContent
          side="right"
          className="w-full sm:w-[420px] p-0 rounded-none border-l border-border flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" strokeWidth={2} />
              <span className="text-sm font-semibold tracking-tight">Command Center</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground border border-border px-1.5 py-0.5 font-mono-tab">
                ⌘K
              </span>
              <button
                onClick={() => { setOpen(false); setSearchQ(''); }}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex border-b border-border shrink-0">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] uppercase tracking-[0.12em] font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-foreground border-b-2 border-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <tab.icon className="w-3 h-3" strokeWidth={1.5} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">

            {/* ── SEARCH BAR (always visible) ── */}
            <div className="px-4 py-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  placeholder="Search transactions, vendors, projects…"
                  className="rounded-none pl-8 h-9 text-sm"
                />
              </div>

              {searchQ.trim() ? (
                <div className="mt-2">
                  {searchResults.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-1 py-2">No matches found</p>
                  ) : (
                    <div className="divide-y divide-border border border-border max-h-64 overflow-y-auto">
                      {searchResults.map((r, i) => (
                        <div key={i} className="flex items-center gap-3 px-3 py-2.5 hover:bg-secondary/40 transition-colors">
                          <span className={`text-[9px] uppercase tracking-[0.14em] border border-border px-1.5 py-0.5 shrink-0 ${typeColor[r.type] ?? ''}`}>
                            {r.type}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm truncate">{r.label}</div>
                            {r.sub && <div className="text-[10px] text-muted-foreground truncate">{r.sub}</div>}
                          </div>
                          {r.amount !== null && (
                            <span className={`text-xs font-semibold font-mono-tab shrink-0 ${r.amount >= 0 ? 'text-positive' : ''}`}>
                              {r.amount >= 0 ? '+' : '−'}{fmtUSD(Math.abs(r.amount))}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : recentEntries.length > 0 && activeTab === 'overview' ? (
                <div className="mt-2">
                  <div className="micro-label mb-1.5">Recent</div>
                  <div className="divide-y divide-border border border-border">
                    {recentEntries.map((r, i) => (
                      <div key={i} className="flex items-center gap-3 px-3 py-2 hover:bg-secondary/40 transition-colors">
                        <span className={`text-[9px] uppercase tracking-[0.12em] border border-border px-1 py-0.5 shrink-0 ${typeColor[r.type] ?? ''}`}>
                          {r.type}
                        </span>
                        <span className="text-xs truncate flex-1">{r.label}</span>
                        {r.amount !== null && (
                          <span className={`text-xs font-semibold font-mono-tab shrink-0 ${r.amount >= 0 ? 'text-positive' : ''}`}>
                            {r.amount >= 0 ? '+' : '−'}{fmtUSD(Math.abs(r.amount))}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            {/* ── OVERVIEW TAB ── */}
            {activeTab === 'overview' && (
              <>
                {/* MTD Summary */}
                <Section label="Month to Date" icon={<Calendar className="w-3 h-3" />}>
                  <div className="grid grid-cols-3 gap-px bg-border border border-border">
                    {[
                      { l: 'Inflow', v: fmtUSD(mtd.inflowMTD), c: 'text-positive' },
                      { l: 'Outflow', v: fmtUSD(mtd.outflowMTD), c: '' },
                      { l: 'Net', v: fmtUSD(mtd.netMTD), c: mtd.netMTD >= 0 ? 'text-positive' : 'text-accent' },
                    ].map(s => (
                      <div key={s.l} className="bg-background px-3 py-2.5">
                        <div className="micro-label">{s.l}</div>
                        <div className={`text-sm font-semibold font-mono-tab mt-1 ${s.c}`}>{s.v}</div>
                      </div>
                    ))}
                  </div>
                </Section>

                {/* Cash Flow Trend (mini chart) */}
                <Section label="6-Month Cash Flow Trend" icon={<BarChart3 className="w-3 h-3" />}>
                  <div className="space-y-2">
                    {cashFlowTrend.map((m, i) => {
                      const maxVal = Math.max(...cashFlowTrend.map(x => Math.max(x.inflow, x.outflow, 1)));
                      const inPct = (m.inflow / maxVal) * 100;
                      const outPct = (m.outflow / maxVal) * 100;
                      return (
                        <div key={i} className="space-y-0.5">
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span className="font-medium">{m.label}</span>
                            <span className={`font-mono-tab ${m.net >= 0 ? 'text-positive' : 'text-accent'}`}>
                              {m.net >= 0 ? '+' : ''}{fmtUSD(m.net)}
                            </span>
                          </div>
                          <div className="flex gap-0.5 h-3">
                            <div className="flex-1 bg-secondary/50 relative">
                              <div
                                className="absolute bottom-0 left-0 w-full bg-positive/60 transition-all"
                                style={{ height: `${Math.max(inPct, 2)}%` }}
                              />
                            </div>
                            <div className="flex-1 bg-secondary/50 relative">
                              <div
                                className="absolute bottom-0 left-0 w-full bg-accent/60 transition-all"
                                style={{ height: `${Math.max(outPct, 2)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex gap-4 text-[9px] text-muted-foreground uppercase tracking-wider pt-1">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 bg-positive/60" /> Inflow</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 bg-accent/60" /> Outflow</span>
                    </div>
                  </div>
                </Section>

                {/* Quick Actions */}
                <Section label="Quick Actions" icon={<Activity className="w-3 h-3" />}>
                  <div className="grid grid-cols-3 gap-px bg-border border border-border">
                    {[
                      { label: 'Create Check', icon: FileText, to: '/checks/new' },
                      { label: 'Log Income', icon: ArrowDownToLine, to: '/income' },
                      { label: 'Record Expense', icon: ArrowUpFromLine, to: '/expenses' },
                    ].map(a => (
                      <button
                        key={a.label}
                        onClick={() => go(a.to)}
                        className="bg-background flex flex-col items-center gap-2 py-3.5 px-2 hover:bg-secondary/60 active:bg-secondary transition-colors text-center group"
                      >
                        <a.icon className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" strokeWidth={1.5} />
                        <span className="text-[9px] uppercase tracking-[0.12em] font-medium leading-tight text-muted-foreground group-hover:text-foreground transition-colors">
                          {a.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </Section>

                {/* Navigate */}
                <Section label="Navigate" icon={<Eye className="w-3 h-3" />}>
                  <div className="divide-y divide-border border border-border">
                    {quickNav.map(n => (
                      <button
                        key={n.to}
                        onClick={() => go(n.to)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 active:bg-secondary transition-colors group"
                      >
                        <n.icon className="w-3.5 h-3.5 shrink-0 group-hover:text-foreground" strokeWidth={1.5} />
                        <span className="flex-1 text-left">{n.label}</span>
                        <ChevronRight className="w-3 h-3 opacity-30 group-hover:opacity-60 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </Section>
              </>
            )}

            {/* ── EXPORT TAB ── */}
            {activeTab === 'export' && (
              <Section label="Export Reports">
                <div className="space-y-2">
                  <div className="micro-label mb-1">PDF Reports</div>
                  {[
                    {
                      label: 'Income Report PDF',
                      icon: ArrowDownToLine,
                      action: () => {
                        const doc = generateTransactionReport(income, 'income');
                        savePDF(doc, `hou-income-${new Date().toISOString().slice(0, 10)}.pdf`);
                        toast.success('Income report exported');
                      },
                    },
                    {
                      label: 'Expense Report PDF',
                      icon: ArrowUpFromLine,
                      action: () => {
                        const doc = generateTransactionReport(expenses, 'expense');
                        savePDF(doc, `hou-expenses-${new Date().toISOString().slice(0, 10)}.pdf`);
                        toast.success('Expense report exported');
                      },
                    },
                    {
                      label: 'Check Register PDF',
                      icon: FileText,
                      action: () => {
                        const doc = generateCheckRegisterReport(checks);
                        savePDF(doc, `hou-checks-${new Date().toISOString().slice(0, 10)}.pdf`);
                        toast.success('Check register exported');
                      },
                    },
                    {
                      label: 'General Ledger PDF',
                      icon: BookOpen,
                      action: () => {
                        const doc = generateLedgerReport(income, expenses, checks);
                        savePDF(doc, `hou-ledger-${new Date().toISOString().slice(0, 10)}.pdf`);
                        toast.success('Ledger exported');
                      },
                    },
                    {
                      label: 'Project Portfolio PDF',
                      icon: FolderKanban,
                      action: () => {
                        const doc = generateProjectReport(projects.map((p: any) => ({
                          ...p,
                          spent: 0, incoming: 0, used: 0,
                        })));
                        savePDF(doc, `hou-projects-${new Date().toISOString().slice(0, 10)}.pdf`);
                        toast.success('Project report exported');
                      },
                    },
                  ].map(item => (
                    <button
                      key={item.label}
                      onClick={item.action}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 active:bg-secondary transition-colors border border-border group"
                    >
                      <Printer className="w-3.5 h-3.5 shrink-0 group-hover:text-foreground" />
                      <item.icon className="w-3 h-3 shrink-0 opacity-50" />
                      <span>{item.label}</span>
                      <Download className="w-3 h-3 ml-auto opacity-30 group-hover:opacity-60" />
                    </button>
                  ))}
                </div>

                <div className="space-y-2 mt-4">
                  <div className="micro-label mb-1">CSV / Data Export</div>
                  {[
                    {
                      label: 'Transactions CSV',
                      icon: Activity,
                      action: () => {
                        const all = [
                          ...income.map((t: any) => ({ ...t, _type: 'income' })),
                          ...expenses.map((t: any) => ({ ...t, _type: 'expense' })),
                        ];
                        downloadCSV(
                          all, `hou-transactions-${new Date().toISOString().slice(0, 10)}.csv`,
                          ['Date', 'Type', 'Source / Vendor', 'Project', 'Category', 'Amount', 'Notes'],
                          t => [t.transaction_date, t._type, t.source_name || t.vendors?.name || '', t.projects?.name || '', t.category || '', t.amount, t.notes || '']
                        );
                        toast.success('Transactions exported');
                      },
                    },
                    {
                      label: 'Check Register CSV',
                      icon: FileText,
                      action: () => {
                        downloadCSV(
                          checks, `hou-checks-${new Date().toISOString().slice(0, 10)}.csv`,
                          ['Check #', 'Payee', 'Amount', 'Issue Date', 'Status', 'Project', 'Memo'],
                          c => [c.check_number, c.payee_name, c.amount, c.issue_date, c.status, c.projects?.name || '', c.memo || '']
                        );
                        toast.success('Check register exported');
                      },
                    },
                    {
                      label: 'Vendor Directory CSV',
                      icon: Users,
                      action: () => {
                        downloadCSV(
                          vendors, `hou-vendors-${new Date().toISOString().slice(0, 10)}.csv`,
                          ['Name', 'Email', 'Phone', 'Address', 'Notes'],
                          v => [v.name, v.contact_email || '', v.contact_phone || '', v.address || '', v.notes || '']
                        );
                        toast.success('Vendors exported');
                      },
                    },
                    {
                      label: 'Full Data Export JSON',
                      icon: Calendar,
                      action: () => {
                        const payload = {
                          exported_at: new Date().toISOString(),
                          checks, income, expenses, vendors, projects,
                        };
                        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `hou-full-export-${new Date().toISOString().slice(0, 10)}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                        toast.success('Full data exported');
                      },
                    },
                  ].map(item => (
                    <button
                      key={item.label}
                      onClick={item.action}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 active:bg-secondary transition-colors border border-border group"
                    >
                      <Download className="w-3.5 h-3.5 shrink-0 group-hover:text-foreground" />
                      <item.icon className="w-3 h-3 shrink-0 opacity-50" />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </Section>
            )}

            {/* ── INSIGHTS TAB ── */}
            {activeTab === 'insights' && (
              <Section label="Financial Intelligence">
                <div className="space-y-2">
                  {insights.length === 0 ? (
                    <p className="text-sm text-muted-foreground px-1 py-4">Not enough data to generate insights yet.</p>
                  ) : insights.map((insight, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-2.5 px-3 py-2.5 border border-border ${
                        insight.type === 'positive' ? 'border-positive/20 bg-positive/[0.03]' :
                        insight.type === 'warning' ? 'border-accent/20 bg-accent/[0.03]' : ''
                      }`}
                    >
                      <insight.icon
                        className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                          insight.type === 'positive' ? 'text-positive' :
                          insight.type === 'warning' ? 'text-accent' : 'text-muted-foreground'
                        }`}
                        strokeWidth={1.5}
                      />
                      <span className="text-sm">{insight.text}</span>
                    </div>
                  ))}
                </div>

                {/* Cash flow snapshot */}
                <div className="mt-4">
                  <div className="micro-label mb-2">Cash Flow History</div>
                  <div className="border border-border divide-y divide-border">
                    {cashFlowTrend.map((m, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 text-xs font-mono-tab">
                        <span className="text-muted-foreground">{m.label}</span>
                        <span className="text-positive">+{fmtUSD(m.inflow)}</span>
                        <span>−{fmtUSD(m.outflow)}</span>
                        <span className={m.net >= 0 ? 'text-positive' : 'text-accent'}>
                          {m.net >= 0 ? '+' : ''}{fmtUSD(m.net)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                <div className="mt-4 px-1 py-2">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{checks.length} checks · {income.length + expenses.length} transactions · {vendors.length} vendors · {projects.length} projects</span>
                  </div>
                </div>
              </Section>
            )}

            {/* ── AUDIT TAB ── */}
            {activeTab === 'audit' && (
              <Section label="Financial Health Audit">
                {/* ══ Financial Safeguard Alert ══ */}
                {safeguard.isCritical && (
                  <div className="bg-accent/[0.08] border border-accent/30 p-4 mb-3 flex items-start gap-3">
                    <Siren className="w-5 h-5 text-accent shrink-0 mt-0.5 animate-pulse" />
                    <div>
                      <div className="text-sm font-semibold text-accent">Critical: Exposure/Balance Ratio</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Your total project exposure ({fmtUSD(safeguard.exposure)}) is {safeguard.ratio.toFixed(1)}% of your balance ({fmtUSD(safeguard.balance)}). This is below the 5% safety threshold.
                      </div>
                      <button
                        onClick={() => { navigate('/projects'); setOpen(false); }}
                        className="text-xs text-accent hover:underline mt-2 flex items-center gap-1"
                      >
                        Review projects <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
                {safeguard.isWarning && (
                  <div className="border border-accent/20 bg-accent/[0.03] p-3 mb-3 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-accent">Exposure Warning</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Exposure ratio is {safeguard.ratio.toFixed(1)}% — keep this above 15% for healthy coverage.
                      </div>
                    </div>
                  </div>
                )}
                {safeguard.isHealthy && safeguard.exposure > 0 && (
                  <div className="border border-positive/20 bg-positive/[0.03] p-3 mb-3 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-positive shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-positive">Healthy Coverage</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Balance covers {safeguard.ratio.toFixed(1)}% of project exposure — well above the 15% threshold.
                      </div>
                    </div>
                  </div>
                )}

                <div className="divide-y divide-border border border-border">
                  {audit.map((a, i) => (
                    <div key={i} className="flex items-start gap-2.5 px-3 py-2.5">
                      <a.icon
                        className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${a.ok ? 'text-positive' : 'text-accent'}`}
                        strokeWidth={1.5}
                      />
                      <span className={`text-sm ${a.ok ? 'text-foreground' : 'text-accent'}`}>{a.text}</span>
                    </div>
                  ))}
                </div>

                {/* Summary card */}
                <div className="mt-4 border border-border p-4 bg-secondary/20">
                  <div className="micro-label mb-2">Audit Summary</div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between"><span className="text-muted-foreground">Passing checks</span><span className="font-semibold">{audit.filter(a => a.ok).length}/{audit.length}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Overall status</span>
                      <span className={`font-semibold ${audit.every(a => a.ok) ? 'text-positive' : 'text-accent'}`}>
                        {audit.every(a => a.ok) ? 'Healthy' : 'Needs attention'}
                      </span>
                    </div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Total balance</span><span className="font-semibold font-mono-tab">{fmtUSD(mtd.balance)}</span></div>
                  </div>
                </div>
              </Section>
            )}

            {/* Footer spacer */}
            <div className="h-4" />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}