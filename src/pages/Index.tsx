import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { useChecks, useTransactions, useProjects } from '@/hooks/useFinance';
import { fmtUSD, fmtDate } from '@/lib/format';
import { ArrowUpRight, FileText, ArrowDownToLine, ArrowUpFromLine, BookOpen, FolderKanban, Users, Search } from 'lucide-react';

export default function Index() {
  const { data: checks = [] } = useChecks();
  const { data: income = [] } = useTransactions('income');
  const { data: expenses = [] } = useTransactions('expense');
  const { data: projects = [] } = useProjects();

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const inMonth = (d: string) => new Date(d) >= monthStart;
    const inflowMTD = income.filter(i => inMonth(i.transaction_date)).reduce((s, i) => s + Number(i.amount), 0);
    const expenseMTD = expenses.filter(i => inMonth(i.transaction_date)).reduce((s, i) => s + Number(i.amount), 0);
    const checksMTD = checks.filter(c => inMonth(c.issue_date) && c.status === 'cleared').reduce((s, c) => s + Number(c.amount), 0);
    const outflowMTD = expenseMTD + checksMTD;
    const totalIn = income.reduce((s, i) => s + Number(i.amount), 0);
    const totalOut = expenses.reduce((s, i) => s + Number(i.amount), 0) + checks.filter(c => c.status === 'cleared').reduce((s, c) => s + Number(c.amount), 0);
    const balance = totalIn - totalOut;
    const pending = checks.filter(c => c.status === 'pending');
    const pendingValue = pending.reduce((s, c) => s + Number(c.amount), 0);
    const exposure = projects.filter(p => p.status === 'active').reduce((s, p) => s + Number(p.budget), 0);
    return { balance, inflowMTD, outflowMTD, pendingCount: pending.length, pendingValue, exposure };
  }, [checks, income, expenses, projects]);

  const recent = useMemo(() => {
    const all = [
      ...checks.map((c: any) => ({ id: c.id, kind: 'Check', label: c.payee_name, amount: -Number(c.amount), date: c.issue_date, project: c.projects?.name, status: c.status })),
      ...income.map((t: any) => ({ id: t.id, kind: 'Income', label: t.source_name || t.vendors?.name || '—', amount: Number(t.amount), date: t.transaction_date, project: t.projects?.name, status: '—' })),
      ...expenses.map((t: any) => ({ id: t.id, kind: 'Expense', label: t.vendors?.name || t.category || '—', amount: -Number(t.amount), date: t.transaction_date, project: t.projects?.name, status: '—' })),
    ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
    return all;
  }, [checks, income, expenses]);

  const tiles = [
    { to: '/checks/new', label: 'Create Check', icon: FileText },
    { to: '/income', label: 'Log Income', icon: ArrowDownToLine },
    { to: '/expenses', label: 'Record Expense', icon: ArrowUpFromLine },
    { to: '/ledger', label: 'View Ledger', icon: BookOpen },
    { to: '/projects', label: 'Manage Projects', icon: FolderKanban },
    { to: '/vendors', label: 'Manage Vendors', icon: Users },
    { to: '/ledger', label: 'Search Transactions', icon: Search },
  ];

  return (
    <AppShell>
      <PageHeader eyebrow="Command Center" title="Account Overview" description="Real-time position across operating capital, project exposure, and pending instruments." />

      {/* Snapshot bar */}
      <div className="border-b border-border bg-secondary/30">
        <div className="px-8 py-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-px bg-border">
          {[
            { label: 'Total Balance', value: fmtUSD(stats.balance), accent: true },
            { label: 'Inflow · MTD', value: fmtUSD(stats.inflowMTD) },
            { label: 'Outflow · MTD', value: fmtUSD(stats.outflowMTD) },
            { label: 'Pending Checks', value: `${stats.pendingCount}`, sub: fmtUSD(stats.pendingValue) },
            { label: 'Project Exposure', value: fmtUSD(stats.exposure) },
          ].map(s => (
            <div key={s.label} className="bg-background px-5 py-4">
              <div className="stat-label">{s.label}</div>
              <div className={`stat-value mt-2 ${s.accent ? 'text-foreground' : ''}`}>{s.value}</div>
              {s.sub && <div className="text-xs text-muted-foreground mt-1 font-mono-tab">{s.sub} held</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Action grid */}
      <div className="px-8 py-8">
        <div className="micro-label mb-4">Primary Actions</div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-px bg-border border border-border">
          {tiles.map(t => (
            <Link key={t.label} to={t.to} className="bg-background p-4 hover:bg-secondary/50 transition-colors group">
              <t.icon className="w-4 h-4 text-muted-foreground mb-3 group-hover:text-accent" strokeWidth={1.5} />
              <div className="text-xs font-medium leading-tight">{t.label}</div>
              <ArrowUpRight className="w-3 h-3 text-muted-foreground/50 mt-2 group-hover:text-foreground" />
            </Link>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div className="px-8 pb-12">
        <div className="flex items-center justify-between mb-3">
          <div className="micro-label">Recent Activity</div>
          <Link to="/ledger" className="text-xs text-muted-foreground hover:text-foreground">View ledger →</Link>
        </div>
        <div className="border border-border">
          <div className="grid grid-cols-12 gap-4 px-4 py-2.5 border-b border-border bg-secondary/40 text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
            <div className="col-span-2">Date</div><div className="col-span-2">Type</div><div className="col-span-3">Counterparty</div><div className="col-span-3">Project</div><div className="col-span-2 text-right">Amount</div>
          </div>
          {recent.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">No activity yet. Create your first check or log income to begin.</div>
          ) : recent.map(r => (
            <div key={r.kind + r.id} className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-border last:border-b-0 text-sm font-mono-tab hover:bg-secondary/30">
              <div className="col-span-2 text-muted-foreground">{fmtDate(r.date)}</div>
              <div className="col-span-2"><span className="text-[10px] uppercase tracking-[0.14em] px-1.5 py-0.5 border border-border">{r.kind}</span></div>
              <div className="col-span-3 truncate">{r.label}</div>
              <div className="col-span-3 truncate text-muted-foreground">{r.project || '—'}</div>
              <div className={`col-span-2 text-right font-semibold ${r.amount >= 0 ? 'text-positive' : 'text-foreground'}`}>{r.amount >= 0 ? '+' : ''}{fmtUSD(Math.abs(r.amount))}</div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
