import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, ArrowUpRight, TrendingUp, TrendingDown,
  Wallet, FileText, BookOpen, FolderKanban, Receipt, Users, DollarSign,
} from 'lucide-react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { StatCard } from '@/components/project-detail/StatCard';
import { DonutChart } from '@/components/project-detail/DonutChart';
import { fmtUSD } from '@/lib/format';

/* The admin dashboard reports on Houston Enterprise exclusively. */
const ENTITY = {
  id: 'houston-enterprise', name: 'Houston Enterprise', short: 'HE',
  color: '#9D7E3F', Icon: Building2, tagline: 'General Contractor · Est. 1998',
} as const;

/* 12 calendar-month inflow/outflow/net buckets from real transaction dates */
function monthlyBuckets(txns: any[], months = 12) {
  const now = new Date();
  const arr = Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, name: d.toLocaleDateString('en-US', { month: 'short' }), Inflow: 0, Outflow: 0, Net: 0 };
  });
  const idx = new Map(arr.map((b, i) => [b.key, i]));
  txns.forEach((t: any) => {
    const ds = t.transaction_date ?? t.created_at;
    if (!ds) return;
    const d = new Date(ds);
    const i = idx.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (i === undefined) return;
    const amt = Number(t.amount) || 0;
    if (t.type === 'income') arr[i].Inflow += amt;
    else if (t.type === 'expense') arr[i].Outflow += amt;
  });
  arr.forEach(b => { b.Net = b.Inflow - b.Outflow; });
  return arr;
}

const compactUSD = (v: number) =>
  Math.abs(v) >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M`
    : Math.abs(v) >= 1_000 ? `$${(v / 1_000).toFixed(0)}k`
    : `$${v.toFixed(0)}`;

export default function FinanceDataPanel({ txns, checks, projects, vendors }: {
  txns: any[]; checks: any[]; projects: any[]; vendors: any[];
}) {
  const entityId = ENTITY.id;
  const entity = ENTITY;

  const d = useMemo(() => {
    const eTxns   = txns.filter((t: any) => t.entity_id === entityId);
    const eChecks = checks.filter((c: any) => c.entity_id === entityId);
    const income  = eTxns.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);
    const expense = eTxns.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);

    const buckets = monthlyBuckets(eTxns, 12);
    const inflowTrend  = buckets.slice(-8).map(b => b.Inflow);
    const outflowTrend = buckets.slice(-8).map(b => b.Outflow);
    let run = 0;
    const netCumTrend = buckets.slice(-8).map(b => (run += b.Net));

    const openChecks = eChecks.filter((c: any) => !c.cleared_date);
    const openCheckValue = openChecks.reduce((s: number, c: any) => s + (Number(c.amount) || 0), 0);

    const byCategory = new Map<string, number>();
    eTxns.filter((t: any) => t.type === 'expense').forEach((t: any) => {
      const cat = (t.category ?? t.budget_category ?? 'Uncategorized') || 'Uncategorized';
      byCategory.set(cat, (byCategory.get(cat) ?? 0) + (Number(t.amount) || 0));
    });
    const categories = [...byCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

    const recent = [...eTxns].sort((a: any, b: any) =>
      new Date(b.transaction_date ?? b.created_at ?? 0).getTime() - new Date(a.transaction_date ?? a.created_at ?? 0).getTime()
    ).slice(0, 8);

    return {
      income, expense, net: income - expense,
      buckets, inflowTrend, outflowTrend, netCumTrend,
      openChecks: openChecks.length, openCheckValue,
      categories, recent,
      projectCount: projects.filter((p: any) => p.entity_id === entityId).length,
      vendorCount:  vendors.filter((v: any) => v.entity_id === entityId).length,
      checkCount:   eChecks.length,
      txnCount:     eTxns.length,
    };
  }, [txns, checks, projects, vendors, entityId]);

  const hasHistory = d.buckets.some(b => b.Inflow > 0 || b.Outflow > 0);
  const tooltipStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 10, fontSize: 11, boxShadow: '0 8px 24px rgba(10,10,10,.08)' };
  const CATEGORY_COLORS = [entity.color, '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

  const QUICK_LINKS = [
    { label: 'Overview', to: `/finance/dashboard?entity=${entityId}`, Icon: Wallet },
    { label: 'Ledger',   to: `/ledger?entity=${entityId}`,   Icon: BookOpen },
    { label: 'Projects', to: `/projects?entity=${entityId}`, Icon: FolderKanban },
    { label: 'Checks',   to: `/checks?entity=${entityId}`,   Icon: FileText },
    { label: 'Invoices', to: `/invoices?entity=${entityId}`, Icon: Receipt },
    { label: 'Vendors',  to: `/vendors?entity=${entityId}`,  Icon: Users },
  ];

  return (
    <div className="space-y-5">

      {/* ── Header: entity identity + switcher ── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border"
            style={{ backgroundColor: `${entity.color}14`, borderColor: `${entity.color}35` }}>
            <entity.Icon className="w-5 h-5" style={{ color: entity.color }} strokeWidth={1.6} />
          </span>
          <div className="min-w-0">
            <div className="text-[8px] font-black tracking-[0.4em] uppercase" style={{ color: entity.color }}>
              Finance Intelligence · Live
            </div>
            <div className="text-[20px] sm:text-[24px] font-bold text-foreground leading-tight truncate">{entity.name}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-[0.18em]">{entity.tagline}</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-[10px] border border-border bg-background px-3 py-2 text-[9px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
            Entity Scoped · {ENTITY.short} <span className="w-1.5 h-1.5 rounded-full bg-positive animate-pulse" />
          </span>
          <Link to={`/finance/dashboard?entity=${entityId}`}
            className="inline-flex items-center gap-1.5 rounded-[10px] px-4 py-2.5 text-[11px] font-bold text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: entity.color }}>
            Open Finance Dashboard <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.4} />
          </Link>
        </div>
      </div>

      {/* ── KPI rail with real monthly trends ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Income" value={fmtUSD(d.income)} sub="All-time revenue"
          trend={hasHistory ? d.inflowTrend : undefined} trendColor="#10b981" icon={TrendingUp} deltaTone="neutral" />
        <StatCard label="Total Expenses" value={fmtUSD(d.expense)} sub="All-time spend"
          trend={hasHistory ? d.outflowTrend : undefined} trendColor="#ef4444" icon={TrendingDown} deltaTone="neutral" />
        <StatCard label="Net Position" value={`${d.net < 0 ? '−' : ''}${fmtUSD(Math.abs(d.net))}`}
          sub={d.net >= 0 ? 'Cash positive' : 'Cash negative'}
          subColor={d.net >= 0 ? 'text-positive font-semibold' : 'text-destructive font-semibold'}
          trend={hasHistory ? d.netCumTrend : undefined} trendColor={d.net >= 0 ? entity.color : '#ef4444'} icon={DollarSign} />
        <StatCard label="Open Checks" value={fmtUSD(d.openCheckValue)}
          sub={`${d.openChecks} awaiting clearance`} icon={FileText}
          trendColor={d.openChecks > 0 ? '#f59e0b' : '#10b981'} />
      </div>

      {/* ── Cash flow + expense mix ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-stretch">
        <div className="pdv2-card overflow-hidden xl:col-span-2 flex flex-col">
          <div className="pdv2-card-header flex items-center justify-between">
            <div className="text-[11px] font-bold uppercase tracking-wide">Cash Flow — Last 12 Months</div>
            <span className="text-[9px] font-black uppercase tracking-[0.16em] px-2 py-0.5 rounded"
              style={{ backgroundColor: `${entity.color}14`, color: entity.color }}>{entity.short}</span>
          </div>
          {hasHistory ? (
            <>
              <div className="px-2 pt-4 flex-1 min-h-[230px]">
                <ResponsiveContainer width="100%" height={240}>
                  <ComposedChart data={d.buckets} margin={{ top: 4, right: 14, left: -6, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 9.5, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9.5, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={52} tickFormatter={compactUSD} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => fmtUSD(Number(v))}
                      labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 700, marginBottom: 4 }} isAnimationActive={false} />
                    <Bar dataKey="Inflow" fill={entity.color} radius={[3, 3, 0, 0]} maxBarSize={20} />
                    <Bar dataKey="Outflow" fill="hsl(var(--muted-foreground) / 0.35)" radius={[3, 3, 0, 0]} maxBarSize={20} />
                    <Line type="monotone" dataKey="Net" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2.4, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 px-4 py-3 border-t border-border">
                {[['Inflow', entity.color], ['Outflow', 'hsl(var(--muted-foreground) / 0.5)'], ['Net Cash Flow', '#3b82f6']].map(([l, c]) => (
                  <span key={l} className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} /> {l}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-center px-6">
              <Wallet className="w-9 h-9 text-muted-foreground/35 mb-3" strokeWidth={1} />
              <div className="text-[13px] font-semibold text-foreground mb-1">No transactions in the last 12 months</div>
              <p className="text-[11px] text-muted-foreground">Log income or expenses for {entity.name} in the finance hub and this chart fills in live.</p>
            </div>
          )}
        </div>

        <div className="pdv2-card overflow-hidden flex flex-col">
          <div className="pdv2-card-header"><div className="text-[11px] font-bold uppercase tracking-wide">Expenses by Category</div></div>
          <div className="p-4 flex-1">
            {d.categories.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center text-[12px] text-muted-foreground py-10">
                No expenses recorded yet.
              </div>
            ) : (
              <DonutChart
                centerValue={compactUSD(d.expense)}
                centerLabel="Total Spend"
                slices={d.categories.map(([label, value], i) => ({ label, value, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }))}
              />
            )}
          </div>
          <div className="px-4 py-3 border-t border-border">
            <Link to={`/charts?entity=${entityId}`} className="pdv2-link" style={{ color: entity.color }}>View full analytics →</Link>
          </div>
        </div>
      </div>

      {/* ── Recent transactions + quick access ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
        <div className="pdv2-card overflow-hidden xl:col-span-2">
          <div className="pdv2-card-header flex items-center justify-between">
            <div className="text-[11px] font-bold uppercase tracking-wide">Recent Transactions</div>
            <Link to={`/ledger?entity=${entityId}`} className="pdv2-link" style={{ color: entity.color }}>
              View ledger <ArrowUpRight className="w-2.5 h-2.5 inline" strokeWidth={2.5} />
            </Link>
          </div>
          {d.recent.length === 0 ? (
            <div className="py-12 px-6 text-center">
              <DollarSign className="w-8 h-8 mx-auto mb-2.5 text-muted-foreground/35" strokeWidth={1} />
              <div className="text-[12px] text-muted-foreground">No transactions for {entity.name} yet.</div>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead className="bg-secondary/45">
                    <tr className="border-b border-border">
                      {['Type', 'Description', 'Category', 'Amount', 'Date'].map(h => (
                        <th key={h} className={`px-4 py-3 text-[8px] uppercase tracking-[0.24em] text-muted-foreground font-black whitespace-nowrap ${h === 'Amount' ? 'text-right' : 'text-left'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {d.recent.map((t: any) => {
                      const isInc = t.type === 'income';
                      return (
                        <tr key={t.id} className="border-b border-border last:border-b-0 pdv2-row-hover transition-colors">
                          <td className="px-4 py-3">
                            <span className="text-[8px] font-extrabold tracking-[0.16em] uppercase px-2 py-1 rounded"
                              style={{ backgroundColor: isInc ? `${entity.color}12` : 'hsl(var(--secondary))', color: isInc ? entity.color : 'hsl(var(--muted-foreground))' }}>
                              {t.type || '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3 max-w-[240px]"><div className="truncate text-foreground">{t.notes || t.source_name || t.description || '—'}</div></td>
                          <td className="px-4 py-3 text-[10.5px] text-muted-foreground whitespace-nowrap">{t.category || '—'}</td>
                          <td className="px-4 py-3 text-right font-mono-tab font-bold whitespace-nowrap" style={{ color: isInc ? entity.color : 'hsl(var(--foreground))' }}>
                            {isInc ? '+' : '−'}{fmtUSD(Number(t.amount) || 0)}
                          </td>
                          <td className="px-4 py-3 text-[10.5px] text-muted-foreground whitespace-nowrap">
                            {t.transaction_date ? new Date(t.transaction_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Mobile cards */}
              <div className="sm:hidden divide-y divide-border">
                {d.recent.map((t: any) => {
                  const isInc = t.type === 'income';
                  return (
                    <div key={t.id} className="px-4 py-3.5 flex items-center gap-2.5">
                      <div className="w-[3px] self-stretch shrink-0 rounded-full" style={{ backgroundColor: isInc ? entity.color : 'hsl(var(--border))' }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[12.5px] font-medium text-foreground truncate">{t.notes || t.source_name || '—'}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {t.category ? `${t.category} · ` : ''}{t.transaction_date ? new Date(t.transaction_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                        </div>
                      </div>
                      <div className="font-mono-tab font-bold shrink-0 text-[13px]" style={{ color: isInc ? entity.color : 'hsl(var(--foreground))' }}>
                        {isInc ? '+' : '−'}{fmtUSD(Number(t.amount) || 0)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="space-y-4">
          {/* Quick access */}
          <div className="pdv2-card overflow-hidden">
            <div className="pdv2-card-header"><div className="text-[11px] font-bold uppercase tracking-wide">Quick Access</div></div>
            <div className="p-3 grid grid-cols-2 gap-1.5">
              {QUICK_LINKS.map(({ label, to, Icon }) => (
                <Link key={label} to={to}
                  className="flex items-center gap-2 rounded-md border border-border px-3 py-2.5 text-[11.5px] text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors group">
                  <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.6} />
                  <span className="flex-1 truncate">{label}</span>
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" strokeWidth={2} />
                </Link>
              ))}
            </div>
          </div>

          {/* Entity snapshot */}
          <div className="pdv2-card overflow-hidden">
            <div className="pdv2-card-header"><div className="text-[11px] font-bold uppercase tracking-wide">Entity Snapshot</div></div>
            <div className="divide-y divide-border">
              {([
                ['Transactions', d.txnCount, `/ledger?entity=${entityId}`],
                ['Projects', d.projectCount, `/projects?entity=${entityId}`],
                ['Checks Issued', d.checkCount, `/checks?entity=${entityId}`],
                ['Vendors', d.vendorCount, `/vendors?entity=${entityId}`],
              ] as [string, number, string][]).map(([label, count, to]) => (
                <Link key={label} to={to} className="flex items-center justify-between px-4 py-3 hover:bg-secondary/40 transition-colors">
                  <span className="text-[12px] text-muted-foreground">{label}</span>
                  <span className="font-mono-tab font-bold text-[13px] text-foreground">{count.toLocaleString()}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
