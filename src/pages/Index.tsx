import { useMemo, useState, useRef } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { useChecks, useTransactions, useProjects, useVendors } from '@/hooks/useFinance';
import { useInvoices, invoiceTotal } from '@/hooks/useInvoices';
import { useEntity } from '@/contexts/EntityContext';
import { fmtUSD, fmtDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import {
  FileText, ArrowDownToLine, ArrowUpFromLine, Download, Plus, Zap,
  ConciergeBell, BarChart3, FolderKanban, Users, Receipt, AlertTriangle,
  X, RefreshCw, Camera, BookOpen, Grid3X3, BookMarked, FolderOpen,
  Upload, ChevronRight, Layers,
} from 'lucide-react';
import { generateLedgerReport, savePDF } from '@/lib/reports';
import { toast } from 'sonner';
import TimeFilter, { getDateRange } from '@/components/TimeFilter';
import { CashFlowChart } from '@/components/FinancialChartPanel';
import { BalanceTrendChart, InflowChart, OutflowChart, PendingAgingChart } from '@/components/StatChartPanel';
import { AnimatePresence, motion } from 'framer-motion';

/* ── Mobile Finance Menu ──────────────────────────────────────────────────── */
const FINANCE_SECTIONS = [
  {
    group: 'Daily',
    items: [
      { to: '/finance/dashboard', label: 'Overview', icon: Grid3X3, desc: 'Balance, stats & charts' },
      { to: '/ledger', label: 'Ledger', icon: BookOpen, desc: 'Full transaction log' },
      { to: '/checks', label: 'Checks', icon: FileText, desc: 'Issue & track checks' },
      { to: '/income', label: 'Income', icon: ArrowDownToLine, desc: 'Log revenue' },
      { to: '/expenses', label: 'Expenses', icon: ArrowUpFromLine, desc: 'Record payments' },
    ],
  },
  {
    group: 'Management',
    items: [
      { to: '/projects', label: 'Projects', icon: FolderKanban, desc: 'Active & archived jobs' },
      { to: '/vendors', label: 'Vendors', icon: Users, desc: 'Vendor directory' },
      { to: '/invoices', label: 'Invoices', icon: Receipt, desc: 'Billing & collections' },
    ],
  },
  {
    group: 'Tools',
    items: [
      { to: '/charts', label: 'Charts', icon: BarChart3, desc: 'Visual analytics' },
      { to: '/concierge', label: 'Concierge', icon: ConciergeBell, desc: 'Guided assistant' },
      { to: '/documents', label: 'Documents', icon: FolderOpen, desc: 'Receipts & files' },
      { to: '/glossary', label: 'Glossary', icon: BookMarked, desc: 'Terms & definitions' },
      { to: '/finance', label: 'Switch Entity', icon: Layers, desc: 'Change active entity' },
    ],
  },
];

function MobileFinanceMenu({
  open, onClose, entityColor,
}: { open: boolean; onClose: () => void; entityColor?: string }) {
  const navigate = useNavigate();
  const color = entityColor || '#9D7E3F';

  const go = (to: string) => {
    onClose();
    navigate(to);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          {/* Sheet */}
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 bg-background border-t border-border"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            style={{ maxHeight: '85vh', overflowY: 'auto', paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {/* Handle + header */}
            <div className="sticky top-0 bg-background border-b border-border z-10">
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>
              <div className="px-5 pb-3 flex items-center justify-between">
                <div>
                  <div className="text-[8px] uppercase tracking-[0.3em] text-muted-foreground">Finance Hub</div>
                  <div className="text-sm font-semibold tracking-tight">All Sections</div>
                </div>
                <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>

            <div className="px-4 py-3 space-y-4">
              {FINANCE_SECTIONS.map(section => (
                <div key={section.group}>
                  <div className="text-[8px] uppercase tracking-[0.28em] font-bold text-muted-foreground/60 mb-2 px-1">
                    {section.group}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {section.items.map(item => (
                      <button
                        key={item.to}
                        onClick={() => go(item.to)}
                        className="flex items-center gap-2.5 p-3 border border-border bg-background hover:bg-secondary/40 active:bg-secondary transition-colors text-left"
                      >
                        <div
                          className="w-8 h-8 flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${color}14` }}
                        >
                          <item.icon className="w-3.5 h-3.5" style={{ color }} strokeWidth={1.5} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate">{item.label}</div>
                          <div className="text-[9px] text-muted-foreground truncate">{item.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="h-4" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status || status === '—') return null;
  const colors: Record<string, string> = {
    pending: 'bg-accent/10 text-accent border-accent/30',
    cleared: 'bg-positive/10 text-positive border-positive/30',
    voided: 'bg-muted text-muted-foreground border-border',
  };
  return (
    <span className={`text-[9px] uppercase tracking-[0.14em] px-1.5 py-0.5 border font-medium ${colors[status] || 'border-border text-muted-foreground'}`}>
      {status}
    </span>
  );
}

export default function Index() {
  const navigate = useNavigate();
  const { entity, ready } = useEntity();

  // All hooks must be called unconditionally (Rules of Hooks)
  const { data: checks = [] } = useChecks();
  const { data: income = [] } = useTransactions('income');
  const { data: expenses = [] } = useTransactions('expense');
  const { data: projects = [] } = useProjects();
  const { data: vendors = [] } = useVendors();
  const { invoices } = useInvoices();
  const [timePeriod, setTimePeriod] = useState('all');
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const { start, end } = getDateRange(timePeriod);
    const inRange = (d: string) => { const dt = new Date(d); return dt >= start && dt <= end; };
    return {
      checks: checks.filter((c: any) => inRange(c.issue_date)),
      income: income.filter((t: any) => inRange(t.transaction_date)),
      expenses: expenses.filter((t: any) => inRange(t.transaction_date)),
    };
  }, [checks, income, expenses, timePeriod]);

  const stats = useMemo(() => {
    const inflowMTD = filtered.income.reduce((s, i) => s + Number(i.amount), 0);
    const expenseMTD = filtered.expenses.reduce((s, i) => s + Number(i.amount), 0);
    const checksMTD = filtered.checks.filter(c => c.status === 'cleared').reduce((s, c) => s + Number(c.amount), 0);
    const outflowMTD = expenseMTD + checksMTD;
    const totalIn = filtered.income.reduce((s, i) => s + Number(i.amount), 0);
    const totalOut = filtered.expenses.reduce((s, i) => s + Number(i.amount), 0) + filtered.checks.filter(c => c.status === 'cleared').reduce((s, c) => s + Number(c.amount), 0);
    const balance = totalIn - totalOut;
    const pending = filtered.checks.filter(c => c.status === 'pending');
    const pendingValue = pending.reduce((s, c) => s + Number(c.amount), 0);
    return { balance, inflowMTD, outflowMTD, pendingCount: pending.length, pendingValue };
  }, [filtered]);

  const cashFlowData = useMemo(() => {
    const months: { label: string; inflow: number; outflow: number; net: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const inR = (dt: string) => { const d2 = new Date(dt); return d2 >= start && d2 < end; };
      const inflow = income.filter((t: any) => inR(t.transaction_date)).reduce((s: number, t: any) => s + Number(t.amount), 0);
      const exp = expenses.filter((t: any) => inR(t.transaction_date)).reduce((s: number, t: any) => s + Number(t.amount), 0);
      const chk = checks.filter((c: any) => inR(c.issue_date) && c.status === 'cleared').reduce((s: number, c: any) => s + Number(c.amount), 0);
      months.push({ label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), inflow, outflow: exp + chk, net: inflow - (exp + chk) });
    }
    return months;
  }, [income, expenses, checks]);

  const recent = useMemo(() => {
    const all = [
      ...filtered.checks.map((c: any) => ({ id: c.id, kind: 'Check', label: c.payee_name, amount: -Number(c.amount), date: c.issue_date, project: c.projects?.name, status: c.status, vendorId: c.payee_vendor_id })),
      ...filtered.income.map((t: any) => ({ id: t.id, kind: 'Income', label: t.source_name || t.vendors?.name || '—', amount: Number(t.amount), date: t.transaction_date, project: t.projects?.name, status: null, vendorId: null })),
      ...filtered.expenses.map((t: any) => ({ id: t.id, kind: 'Expense', label: t.vendors?.name || t.category || '—', amount: -Number(t.amount), date: t.transaction_date, project: t.projects?.name, status: null, vendorId: t.vendor_id })),
    ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
    return all;
  }, [filtered]);

  const exportPDF = () => {
    const doc = generateLedgerReport(filtered.income, filtered.expenses, filtered.checks);
    savePDF(doc, `hou-ledger-${timePeriod}-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success('Ledger exported as PDF');
  };

  /* ── Rich chart data for stat cards ── */
  const balanceTrendData = useMemo(() => {
    const months = 'JanFebMarAprMayJunJulAugSepOctNovDec'.match(/.{3}/g) || [];
    const data: { month: string; balance: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const inR = (dt: string) => { const d2 = new Date(dt); return d2 >= start && d2 < end; };
      const inflow = income.filter((t: any) => inR(t.transaction_date)).reduce((s: number, t: any) => s + Number(t.amount), 0);
      const exp = expenses.filter((t: any) => inR(t.transaction_date)).reduce((s: number, t: any) => s + Number(t.amount), 0);
      const chk = checks.filter((c: any) => inR(c.issue_date) && c.status === 'cleared').reduce((s: number, c: any) => s + Number(c.amount), 0);
      data.push({ month: months[d.getMonth()] || '', balance: inflow - (exp + chk) });
    }
    return data;
  }, [income, expenses, checks]);

  const inflowMonthlyData = useMemo(() => {
    const months = 'JanFebMarAprMayJunJulAugSepOctNovDec'.match(/.{3}/g) || [];
    const data: { month: string; inflow: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const inR = (dt: string) => { const d2 = new Date(dt); return d2 >= start && d2 < end; };
      data.push({ month: months[d.getMonth()] || '', inflow: income.filter((t: any) => inR(t.transaction_date)).reduce((s: number, t: any) => s + Number(t.amount), 0) });
    }
    return data;
  }, [income]);

  const inflowCategoryData = useMemo(() => {
    const catMap: Record<string, number> = {};
    filtered.income.forEach((t: any) => {
      const cat = t.source_name || t.category || 'Other';
      catMap[cat] = (catMap[cat] || 0) + Number(t.amount);
    });
    return Object.entries(catMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [filtered.income]);

  const outflowMonthlyData = useMemo(() => {
    const months = 'JanFebMarAprMayJunJulAugSepOctNovDec'.match(/.{3}/g) || [];
    const data: { month: string; outflow: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const inR = (dt: string) => { const d2 = new Date(dt); return d2 >= start && d2 < end; };
      const exp = expenses.filter((t: any) => inR(t.transaction_date)).reduce((s: number, t: any) => s + Number(t.amount), 0);
      const chk = checks.filter((c: any) => inR(c.issue_date) && c.status === 'cleared').reduce((s: number, c: any) => s + Number(c.amount), 0);
      data.push({ month: months[(d.getMonth() + i) % 12] || '', outflow: exp + chk });
    }
    return data;
  }, [expenses, checks]);

  const outflowCategoryData = useMemo(() => {
    const catMap: Record<string, number> = {};
    filtered.expenses.forEach((t: any) => {
      const cat = t.vendors?.name || t.category || 'Other';
      catMap[cat] = (catMap[cat] || 0) + Number(t.amount);
    });
    return Object.entries(catMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [filtered.expenses]);

  const pendingAgingData = useMemo(() => {
    const now = new Date();
    const pending = filtered.checks.filter((c: any) => c.status === 'pending');
    const buckets = [
      { label: '0-7d', min: 0, max: 7, color: '#f59e0b' },
      { label: '8-14d', min: 8, max: 14, color: '#d97706' },
      { label: '15-30d', min: 15, max: 30, color: '#b45309' },
      { label: '30d+', min: 30, max: Infinity, color: '#92400e' },
    ];
    return buckets.map(b => {
      const items = pending.filter((c: any) => {
        const days = Math.floor((now.getTime() - new Date(c.issue_date).getTime()) / (1000 * 60 * 60 * 24));
        return days >= b.min && days < b.max;
      });
      return { ...b, count: items.length, value: items.reduce((s: number, c: any) => s + Number(c.amount), 0) };
    });
  }, [filtered.checks]);

  /* ── Invoice alert data ── */
  const invoiceAlerts = useMemo(() => {
    const overdue = invoices.filter(i => i.status === 'overdue');
    const overdueTotal = overdue.reduce((s, i) => s + invoiceTotal(i), 0);
    const outstanding = invoices.filter(i => i.status === 'sent' || i.status === 'overdue').reduce((s, i) => s + invoiceTotal(i), 0);
    return { overdueCount: overdue.length, overdueTotal, outstanding };
  }, [invoices]);

  const stalePendingCount = pendingAgingData[3]?.count ?? 0;
  const stalePendingValue = pendingAgingData[3]?.value ?? 0;

  // Early returns AFTER all hooks (Rules of Hooks requires hooks to be unconditional)
  if (!ready) return null;
  if (!entity) return <Navigate to="/finance" replace />;

  /* ── 4 stat cards with soft color accents and glass bokeh ── */
  const statCards = [
    {
      label: 'Total Balance',
      value: fmtUSD(stats.balance),
      accent: true,
      cardId: 'balance',
      color: stats.balance >= 0 ? 'var(--positive)' : 'var(--accent)',
      badge: stats.balance >= 0 ? 'Positive' : 'Negative',
      badgeColor: stats.balance >= 0 ? 'bg-positive/10 text-positive border-positive/30' : 'bg-accent/10 text-accent border-accent/30',
      bg: 'from-blue-50/80 to-blue-100/50',
      borderAccent: 'border-blue-200/50',
      bokeh: 'from-white/60 via-white/30 to-transparent',
      chart: <BalanceTrendChart data={balanceTrendData} color={stats.balance >= 0 ? 'var(--positive)' : 'var(--accent)'} />,
      onClick: () => navigate('/ledger'),
    },
    {
      label: 'Inflow · MTD',
      value: fmtUSD(stats.inflowMTD),
      cardId: 'inflow',
      color: 'var(--positive)',
      badge: 'Revenue',
      badgeColor: 'bg-positive/10 text-positive border-positive/30',
      bg: 'from-emerald-50/80 to-emerald-100/50',
      borderAccent: 'border-emerald-200/50',
      bokeh: 'from-white/60 via-white/30 to-transparent',
      chart: <InflowChart monthlyData={inflowMonthlyData} categoryData={inflowCategoryData} />,
      onClick: () => navigate('/income'),
    },
    {
      label: 'Outflow · MTD',
      value: fmtUSD(stats.outflowMTD),
      cardId: 'outflow',
      color: 'var(--accent)',
      badge: 'Spend',
      badgeColor: 'bg-accent/10 text-accent border-accent/30',
      bg: 'from-rose-50/80 to-rose-100/50',
      borderAccent: 'border-rose-200/50',
      bokeh: 'from-white/60 via-white/30 to-transparent',
      chart: <OutflowChart monthlyData={outflowMonthlyData} categoryData={outflowCategoryData} />,
      onClick: () => navigate('/expenses'),
    },
    {
      label: 'Pending Checks',
      value: `${stats.pendingCount}`,
      sub: `${fmtUSD(stats.pendingValue)} held`,
      cardId: 'pending',
      color: 'var(--warning)',
      badge: 'Awaiting',
      badgeColor: 'bg-warning/10 text-warning border-warning/30',
      bg: 'from-amber-50/80 to-amber-100/50',
      borderAccent: 'border-amber-200/50',
      bokeh: 'from-white/60 via-white/30 to-transparent',
      chart: <PendingAgingChart agingBuckets={pendingAgingData} totalValue={stats.pendingValue} />,
      onClick: () => navigate('/checks'),
    },
  ];

  const quickActions: Array<{ label: string; icon: any; description: string; accent?: boolean; onClick: () => void }> = [
    { label: 'Log Income', icon: ArrowDownToLine, description: 'Record new revenue', accent: true, onClick: () => navigate('/income') },
    { label: 'Record Expense', icon: ArrowUpFromLine, description: 'Log outgoing payment', onClick: () => navigate('/expenses') },
    { label: 'Scan Receipt', icon: Camera, description: 'Capture with camera', onClick: () => cameraRef.current?.click() },
    { label: 'Upload Doc', icon: Upload, description: 'Store any document', onClick: () => navigate('/documents') },
    { label: 'New Check', icon: FileText, description: 'Issue a new check', onClick: () => navigate('/checks/new') },
    { label: 'Concierge', icon: ConciergeBell, description: 'Guided assistant', onClick: () => navigate('/concierge') },
  ];

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    navigate('/documents', { state: { capturedFile: file } });
    toast.info('Processing captured image…');
  };

  return (
    <AppShell>
      {/* Hidden camera input — triggers native camera on mobile */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCameraCapture}
      />

      <MobileFinanceMenu
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        entityColor={entity?.color}
      />

      <PageHeader
        eyebrow={entity ? entity.category : 'Command Center'}
        title={entity ? entity.name : 'Account Overview'}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Entity badge */}
            {entity && (
              <button
                onClick={() => navigate('/finance')}
                className="hidden sm:flex items-center gap-1.5 text-[9px] uppercase tracking-[0.18em] font-semibold px-2.5 py-1.5 border transition-opacity hover:opacity-70"
                style={{ borderColor: entity.color, color: entity.color, backgroundColor: entity.colorMuted }}
              >
                <RefreshCw className="w-2.5 h-2.5" strokeWidth={2} />
                {entity.shortName}
              </button>
            )}
            <TimeFilter value={timePeriod} onChange={setTimePeriod} className="hidden sm:flex" />
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="rounded-none h-8 text-[10px]" onClick={() => navigate('/charts')}>
                <BarChart3 className="w-3 h-3 mr-1" />Charts
              </Button>
              <Button variant="outline" size="sm" className="rounded-none h-8 text-[10px]" onClick={exportPDF}>
                <Download className="w-3 h-3 mr-1" />PDF
              </Button>
              <Button size="sm" className="rounded-none h-8 text-[10px] bg-foreground text-background hover:opacity-90" onClick={() => navigate('/concierge')}>
                <Zap className="w-3 h-3 mr-1" />Concierge
              </Button>
            </div>
          </div>
        } />

      {/* ── Alert banners ── */}
      {(invoiceAlerts.overdueCount > 0 && !dismissedAlerts.includes('overdue')) && (
        <div className="px-4 sm:px-8 py-2.5 flex items-center justify-between gap-3 border-b border-accent/20 bg-accent/5">
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertTriangle className="w-3.5 h-3.5 text-accent shrink-0" strokeWidth={2} />
            <span className="text-xs text-accent font-medium">
              {invoiceAlerts.overdueCount} overdue invoice{invoiceAlerts.overdueCount > 1 ? 's' : ''} totalling <span className="font-mono-tab font-semibold">{fmtUSD(invoiceAlerts.overdueTotal)}</span> — immediate follow-up required.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => navigate('/invoices')} className="text-[10px] uppercase tracking-[0.18em] font-bold text-accent hover:opacity-70 transition-opacity">
              View →
            </button>
            <button onClick={() => setDismissedAlerts(a => [...a, 'overdue'])} className="text-accent/60 hover:text-accent transition-colors">
              <X className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
          </div>
        </div>
      )}
      {(stalePendingCount > 0 && !dismissedAlerts.includes('stale')) && (
        <div className="px-4 sm:px-8 py-2.5 flex items-center justify-between gap-3 border-b border-warning/20 bg-warning/5">
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" strokeWidth={2} />
            <span className="text-xs text-warning font-medium">
              {stalePendingCount} check{stalePendingCount > 1 ? 's' : ''} pending for 30+ days · <span className="font-mono-tab font-semibold">{fmtUSD(stalePendingValue)}</span> at risk. Consider voiding or following up.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => navigate('/checks')} className="text-[10px] uppercase tracking-[0.18em] font-bold text-warning hover:opacity-70 transition-opacity">
              View →
            </button>
            <button onClick={() => setDismissedAlerts(a => [...a, 'stale'])} className="text-warning/60 hover:text-warning transition-colors">
              <X className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
          </div>
        </div>
      )}

      {/* ── 4 Stats + Quick Actions ── */}
      <div className="border-b border-border">
        <div className="px-4 sm:px-8 py-3 sm:py-4">
          {/* Stats row first — health overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {statCards.map((s, idx) => (
              <button key={s.label} onClick={s.onClick}
                className={`stat-card group relative bg-gradient-to-br ${s.bg} backdrop-blur-sm border hover:shadow-sm transition-all duration-300 text-left overflow-hidden hover:-translate-y-0.5 ${s.borderAccent}`}
                data-card={s.cardId}
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                {/* Glass bokeh overlay - white highlight in top-right */}
                <div className={`absolute -top-6 -right-6 w-28 h-28 rounded-full bg-gradient-to-br ${s.bokeh} blur-2xl pointer-events-none`} />
                <div className={`absolute -top-3 -right-3 w-16 h-16 rounded-full bg-gradient-to-br ${s.bokeh} blur-xl pointer-events-none`} />

                {/* Color accent top bar */}
                <div className="relative h-1 w-full" style={{ backgroundColor: s.color }} />

                <div className="relative px-4 py-3.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="stat-label text-[9px] sm:text-[10px]">{s.label}</div>
                    {s.badge && (
                      <span className={`text-[7px] uppercase tracking-[0.14em] px-1.5 py-0.5 border font-medium ${s.badgeColor}`}>
                        {s.badge}
                      </span>
                    )}
                  </div>
                  <div className={`text-base sm:text-xl font-bold tracking-tight font-mono-tab ${s.accent ? 'text-foreground' : ''}`}>
                    {s.value}
                  </div>
                  {s.sub && (
                    <div className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5 font-mono-tab">{s.sub}</div>
                  )}
                  {s.chart && (
                    <div className="mt-2.5 w-full">
                      {s.chart}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
          {/* Action tiles below */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-px bg-border border border-border">
            {quickActions.map(a => (
              <button key={a.label} onClick={a.onClick}
                className={`flex flex-col items-center justify-center gap-1.5 py-3.5 px-2 bg-background hover:bg-secondary/30 active:bg-secondary transition-all duration-200 group ${a.accent ? 'ring-1 ring-inset ring-foreground/10 bg-foreground/[0.02]' : ''}`}
              >
                <div className={`w-9 h-9 flex items-center justify-center transition-all duration-200 group-hover:scale-110 ${a.accent ? 'bg-foreground text-background' : 'bg-secondary text-muted-foreground group-hover:text-foreground'}`}>
                  <a.icon className="w-4 h-4" strokeWidth={1.5} />
                </div>
                <span className="text-[10px] sm:text-xs font-semibold tracking-tight text-center leading-tight">{a.label}</span>
                <span className="text-[8px] text-muted-foreground uppercase tracking-[0.1em] hidden sm:block">{a.description}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile time filter + export */}
      <div className="sm:hidden px-4 py-2 border-b border-border flex items-center justify-between">
        <TimeFilter value={timePeriod} onChange={setTimePeriod} />
        <div className="flex items-center gap-3">
          <div className="text-[10px] text-muted-foreground font-mono-tab">{getDateRange(timePeriod).label}</div>
          <Button variant="outline" size="sm" className="rounded-none h-7 text-[10px]" onClick={exportPDF}>
            <Download className="w-3 h-3 mr-1" />PDF
          </Button>
        </div>
      </div>

      {/* ── Quick-access widgets: Projects & Vendors ── */}
      <div className="px-4 sm:px-8 py-3 border-b border-border">
        <div className="flex items-center gap-3 overflow-x-auto pb-1">
          <button onClick={() => navigate('/projects')}
            className="flex items-center gap-2.5 px-3.5 py-2.5 border border-border hover:border-foreground/20 hover:bg-secondary/20 transition-all shrink-0">
            <div className="w-7 h-7 flex items-center justify-center bg-amber-600/10 text-amber-600">
              <FolderKanban className="w-3.5 h-3.5" strokeWidth={1.5} />
            </div>
            <div className="text-left">
              <div className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">Projects</div>
              <div className="text-xs font-semibold font-mono-tab">{projects.length} active</div>
            </div>
          </button>
          <button onClick={() => navigate('/vendors')}
            className="flex items-center gap-2.5 px-3.5 py-2.5 border border-border hover:border-foreground/20 hover:bg-secondary/20 transition-all shrink-0">
            <div className="w-7 h-7 flex items-center justify-center bg-blue-600/10 text-blue-600">
              <Users className="w-3.5 h-3.5" strokeWidth={1.5} />
            </div>
            <div className="text-left">
              <div className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">Vendors</div>
              <div className="text-xs font-semibold font-mono-tab">{vendors.length} on file</div>
            </div>
          </button>
          <button onClick={() => navigate('/invoices')}
            className="flex items-center gap-2.5 px-3.5 py-2.5 border border-border hover:border-foreground/20 hover:bg-secondary/20 transition-all shrink-0">
            <div className={`w-7 h-7 flex items-center justify-center ${invoiceAlerts.overdueCount > 0 ? 'bg-accent/10 text-accent' : 'bg-violet-600/10 text-violet-600'}`}>
              <Receipt className="w-3.5 h-3.5" strokeWidth={1.5} />
            </div>
            <div className="text-left">
              <div className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">Invoices</div>
              <div className={`text-xs font-semibold font-mono-tab ${invoiceAlerts.overdueCount > 0 ? 'text-accent' : ''}`}>
                {invoiceAlerts.overdueCount > 0
                  ? `${invoiceAlerts.overdueCount} overdue`
                  : `${fmtUSD(invoiceAlerts.outstanding)} out`}
              </div>
            </div>
          </button>
          <div className="flex-1 min-w-4" />
        </div>
      </div>

      {/* ── Charts + Recent Activity ── */}
      <div className="px-4 sm:px-8 py-4 flex-1">
        <div className="lg:grid lg:grid-cols-5 lg:gap-4">
          {/* Charts - 3 cols - only BurnRate now */}
          <div className="lg:col-span-3 space-y-4 mb-4 lg:mb-0">
            <CashFlowChart data={cashFlowData} />
          </div>

          {/* Recent Activity - 2 cols */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <div className="micro-label">Recent Activity</div>
              <Link to="/ledger" className="text-[10px] text-muted-foreground hover:text-foreground">View all →</Link>
            </div>

            <div className="sm:hidden space-y-2">
              {recent.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">No activity yet.</div>
              ) : recent.slice(0, 4).map(r => (
                <div key={r.kind + r.id} className="border border-border p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] uppercase tracking-[0.14em] px-1 py-0.5 border border-border">{r.kind}</span>
                    <span className={`text-xs font-semibold font-mono-tab ${r.amount >= 0 ? 'text-positive' : ''}`}>{r.amount >= 0 ? '+' : ''}{fmtUSD(Math.abs(r.amount))}</span>
                  </div>
                  <div className="text-sm">{r.label}</div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{r.project || '—'}</span>
                    <span className="font-mono-tab">{fmtDate(r.date)}</span>
                  </div>
                  {r.status && <StatusBadge status={r.status} />}
                </div>
              ))}
            </div>

            <div className="hidden sm:block border border-border">
              <div className="grid grid-cols-7 gap-2 px-3 py-1.5 border-b border-border bg-secondary/40 text-[9px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
                <div className="col-span-2">Date</div>
                <div className="col-span-2">Counterparty</div>
                <div className="col-span-2 text-right">Amount</div>
                <div className="col-span-1" />
              </div>
              {recent.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-muted-foreground">No activity yet.</div>
              ) : (
                <div className="divide-y divide-border max-h-[340px] overflow-y-auto">
                  {recent.map(r => (
                    <div key={r.kind + r.id} className="grid grid-cols-7 gap-2 px-3 py-2 text-xs font-mono-tab hover:bg-secondary/20 items-center">
                      <div className="col-span-2 text-muted-foreground">{fmtDate(r.date)}</div>
                      <div className="col-span-2 flex items-center gap-1.5 truncate">
                        <span className="text-[8px] uppercase tracking-[0.14em] px-1 py-0.5 border border-border shrink-0">{r.kind}</span>
                        <span className="truncate">{r.label}</span>
                      </div>
                      <div className={`col-span-2 text-right font-semibold ${r.amount >= 0 ? 'text-positive' : ''}`}>
                        {r.amount >= 0 ? '+' : ''}{fmtUSD(Math.abs(r.amount))}
                      </div>
                      <div className="col-span-1 flex justify-end">
                        {r.kind === 'Check' ? (
                          <button onClick={() => navigate('/checks')} className="text-[8px] uppercase tracking-wider text-muted-foreground hover:text-foreground">View</button>
                        ) : (
                          <button onClick={() => navigate(r.kind === 'Expense' ? '/expenses' : '/income')} className="text-[8px] uppercase tracking-wider text-muted-foreground hover:text-foreground flex items-center gap-0.5"><Plus className="w-2 h-2" /> Log</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: floating "All Sections" button — above bottom nav */}
      <div className="md:hidden pb-8" />
      <div className="md:hidden fixed bottom-16 right-4 z-30">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 shadow-lg border border-border text-xs font-bold uppercase tracking-[0.14em] transition-all active:scale-95"
          style={{
            backgroundColor: entity?.color ?? '#9D7E3F',
            color: '#fff',
          }}
        >
          <Grid3X3 className="w-3.5 h-3.5" strokeWidth={2} />
          All Sections
        </button>
      </div>
    </AppShell>
  );
}