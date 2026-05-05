import { useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { useProjects, useChecks, useTransactions } from '@/hooks/useFinance';
import { fmtUSD, fmtDate } from '@/lib/format';
import { generateProjectReport, savePDF, downloadCSV } from '@/lib/reports';
import { ArrowLeft, Download, FileText, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: projects = [] } = useProjects();
  const { data: checks = [] } = useChecks();
  const { data: income = [] } = useTransactions('income');
  const { data: expenses = [] } = useTransactions('expense');

  const project = useMemo(() => projects.find((p: any) => p.id === id), [projects, id]);

  const enriched = useMemo(() => {
    if (!project) return null;
    const pChecks = checks.filter((c: any) => c.project_id === project.id);
    const pIn = income.filter((t: any) => t.project_id === project.id);
    const pExp = expenses.filter((t: any) => t.project_id === project.id);
    const pInTotal = pIn.reduce((s: number, t: any) => s + Number(t.amount), 0);
    const pExpTotal = pExp.reduce((s: number, t: any) => s + Number(t.amount), 0);
    const cleared = pChecks.filter((c: any) => c.status === 'cleared').reduce((s: number, c: any) => s + Number(c.amount), 0);
    const outstanding = pChecks.filter((c: any) => c.status === 'pending').reduce((s: number, c: any) => s + Number(c.amount), 0);
    const spent = pExpTotal + cleared;
    const budget = Number(project.budget);
    return {
      ...project,
      incoming: pInTotal,
      spent,
      outstanding,
      net: pInTotal - spent,
      used: budget > 0 ? Math.min(100, (spent / budget) * 100) : 0,
      checkCount: pChecks.length,
      txnCount: pIn.length + pExp.length,
      incomeList: pIn,
      expenseList: pExp,
      checksList: pChecks,
    };
  }, [project, checks, income, expenses]);

  const sortedActivity = useMemo(() => {
    if (!enriched) return [];
    const all = [
      ...enriched.incomeList.map((t: any) => ({ id: t.id, date: t.transaction_date, type: 'Income', ref: t.source_name || '—', amount: Number(t.amount) })),
      ...enriched.expenseList.map((t: any) => ({ id: t.id, date: t.transaction_date, type: 'Expense', ref: t.vendors?.name || t.category || '—', amount: -Number(t.amount) })),
      ...enriched.checksList.map((c: any) => ({ id: c.id, date: c.issue_date, type: 'Check', ref: `#${c.check_number} · ${c.payee_name}`, amount: -Number(c.amount) })),
    ].sort((a, b) => b.date.localeCompare(a.date));
    return all;
  }, [enriched]);

  /* ── Export ── */
  const exportPDF = () => {
    if (!enriched) return;
    const doc = generateProjectReport([enriched]);
    savePDF(doc, `hou-project-${enriched.name.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success('Project report exported');
  };

  const exportCSV = () => {
    if (!sortedActivity) return;
    downloadCSV(
      sortedActivity,
      `hou-project-activity-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Date', 'Type', 'Reference', 'Amount'],
      (r: any) => [r.date?.slice(0, 10), r.type, r.ref, r.amount]
    );
    toast.success('Activity exported');
  };

  if (!project) {
    return (
      <AppShell>
        <div className="p-8 text-center text-muted-foreground">Project not found.</div>
      </AppShell>
    );
  }

  if (!enriched) return null;

  return (
    <AppShell>
      <PageHeader
        eyebrow={
          <button onClick={() => navigate('/projects')} className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-3 h-3" /> Back to Projects
          </button>
        }
        title={enriched.name}
        description={`${enriched.code || '—'} · ${enriched.status}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="rounded-none h-9 w-9 hidden sm:flex" onClick={exportPDF}><FileText className="w-4 h-4" /></Button>
            <Button variant="outline" size="icon" className="rounded-none h-9 w-9 hidden sm:flex" onClick={exportCSV}><Download className="w-4 h-4" /></Button>
          </div>
        }
      />

      {/* Mobile export */}
      <div className="sm:hidden px-4 py-3 border-b border-border flex gap-2">
        <Button variant="outline" size="sm" className="rounded-none text-xs flex-1" onClick={exportPDF}><FileText className="w-3.5 h-3.5 mr-1.5" />PDF</Button>
        <Button variant="outline" size="sm" className="rounded-none text-xs flex-1" onClick={exportCSV}><Download className="w-3.5 h-3.5 mr-1.5" />CSV</Button>
      </div>

      {/* Snapshot stats */}
      <div className="border-b border-border bg-secondary/30">
        <div className="px-4 sm:px-8 py-5 grid grid-cols-2 sm:grid-cols-4 gap-px bg-border">
          {[
            { label: 'Budget', value: fmtUSD(enriched.budget) },
            { label: 'Spent', value: fmtUSD(enriched.spent) },
            { label: 'Incoming', value: fmtUSD(enriched.incoming), c: 'text-positive' },
            { label: 'Outstanding', value: fmtUSD(enriched.outstanding) },
          ].map(s => (
            <div key={s.label} className="bg-background px-4 py-3">
              <div className="micro-label">{s.label}</div>
              <div className={`stat-value text-lg sm:text-xl mt-1 ${s.c || ''}`}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 sm:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main metrics */}
        <div className="lg:col-span-2 space-y-6">
          {/* Budget utilization */}
          <div className="border border-border p-5">
            <div className="micro-label mb-3">Budget Utilization</div>
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span>{fmtUSD(enriched.spent)} spent of {fmtUSD(enriched.budget)}</span>
              <span className="font-mono-tab">{enriched.used.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-secondary">
              <div
                className={`h-full transition-all ${enriched.used >= 100 ? 'bg-accent' : 'bg-foreground'}`}
                style={{ width: `${Math.min(enriched.used, 100)}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-5 font-mono-tab">
              <div><div className="micro-label">Net Position</div><div className={`text-xl font-semibold mt-1 ${enriched.net >= 0 ? 'text-positive' : 'text-accent'}`}>{fmtUSD(enriched.net)}</div></div>
              <div><div className="micro-label">Activity Count</div><div className="text-xl font-semibold mt-1">{sortedActivity.length} entries</div></div>
            </div>
            {enriched.notes && (
              <div className="mt-5 pt-4 border-t border-border">
                <div className="micro-label mb-1.5">Notes</div>
                <p className="text-sm text-muted-foreground">{enriched.notes}</p>
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="border border-border">
            <div className="px-4 py-2.5 border-b border-border bg-secondary/40 text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
              Activity History
            </div>
            {sortedActivity.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-muted-foreground">No activity recorded for this project.</div>
            ) : (
              sortedActivity.map((a: any) => (
                <div key={a.id} className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-border last:border-b-0 text-sm font-mono-tab hover:bg-secondary/20 items-center">
                  <div className="col-span-3 text-muted-foreground">{fmtDate(a.date)}</div>
                  <div className="col-span-2"><span className="text-[10px] uppercase tracking-[0.14em] px-1.5 py-0.5 border border-border">{a.type}</span></div>
                  <div className="col-span-5 truncate">{a.ref}</div>
                  <div className={`col-span-2 text-right font-semibold ${a.amount >= 0 ? 'text-positive' : ''}`}>{a.amount >= 0 ? '+' : '−'}{fmtUSD(Math.abs(a.amount))}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="border border-border p-5">
            <div className="micro-label mb-3">Details</div>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Status</dt><dd className="font-medium uppercase tracking-wider text-[10px]">{enriched.status}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Code</dt><dd className="font-semibold font-mono-tab">{enriched.code || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Created</dt><dd className="font-mono-tab text-muted-foreground">{fmtDate(enriched.created_at)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Checks</dt><dd className="font-semibold">{enriched.checkCount}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Transactions</dt><dd className="font-semibold">{enriched.txnCount}</dd></div>
            </dl>
          </div>

          {/* Quick links */}
          <div className="border border-border p-5">
            <div className="micro-label mb-3">Quick Links</div>
            <div className="space-y-2">
              <button onClick={() => navigate('/checks/new')} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors border border-border">
                <FileText className="w-3.5 h-3.5" /> Create Check <ArrowUpRight className="w-3 h-3 ml-auto" />
              </button>
              <button onClick={() => navigate('/expenses')} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors border border-border">
                <Download className="w-3.5 h-3.5" /> Record Expense <ArrowUpRight className="w-3 h-3 ml-auto" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}