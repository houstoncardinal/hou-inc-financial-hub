import { useMemo, useState } from 'react';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useChecks, useProjects, useTransactions } from '@/hooks/useFinance';
import { fmtDate, fmtUSD } from '@/lib/format';
import { generateLedgerReport, savePDF, downloadCSV } from '@/lib/reports';
import { FileText, Download } from 'lucide-react';
import { toast } from 'sonner';

export default function Ledger() {
  const { data: checks = [] } = useChecks();
  const { data: income = [] } = useTransactions('income');
  const { data: expenses = [] } = useTransactions('expense');
  const { data: projects = [] } = useProjects();
  const [q, setQ] = useState(''); const [project, setProject] = useState('all'); const [type, setType] = useState('all');

  const rows = useMemo(() => {
    const a = [
      ...checks.map((c: any) => ({ id: 'c' + c.id, date: c.issue_date, type: 'Check', ref: c.check_number, party: c.payee_name, project: c.projects?.name, project_id: c.project_id, amount: -Number(c.amount), status: c.status })),
      ...income.map((t: any) => ({ id: 'i' + t.id, date: t.transaction_date, type: 'Income', ref: '—', party: t.source_name || t.vendors?.name || '—', project: t.projects?.name, project_id: t.project_id, amount: Number(t.amount), status: '—' })),
      ...expenses.map((t: any) => ({ id: 'e' + t.id, date: t.transaction_date, type: 'Expense', ref: t.category || '—', party: t.vendors?.name || '—', project: t.projects?.name, project_id: t.project_id, amount: -Number(t.amount), status: '—' })),
    ];
    return a.filter(r => {
      if (project !== 'all' && r.project_id !== project) return false;
      if (type !== 'all' && r.type.toLowerCase() !== type) return false;
      if (q && !(r.party?.toLowerCase().includes(q.toLowerCase()) || r.ref?.toString().toLowerCase().includes(q.toLowerCase()))) return false;
      return true;
    }).sort((x, y) => y.date.localeCompare(x.date));
  }, [checks, income, expenses, project, type, q]);

  const totals = useMemo(() => {
    const inflow = rows.filter(r => r.amount > 0).reduce((s, r) => s + r.amount, 0);
    const outflow = rows.filter(r => r.amount < 0).reduce((s, r) => s + Math.abs(r.amount), 0);
    return { inflow, outflow, net: inflow - outflow };
  }, [rows]);

  /* ── PDF Export ── */
  const exportPDF = () => {
    const proj = project !== 'all' ? projects.find((p: any) => p.id === project)?.name : undefined;
    const doc = generateLedgerReport(income, expenses, checks, proj, type !== 'all' ? type : undefined);
    savePDF(doc, `hou-general-ledger-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success('Ledger exported as PDF');
  };

  /* ── CSV Export ── */
  const exportCSV = () => {
    downloadCSV(
      rows,
      `hou-ledger-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Date', 'Type', 'Reference', 'Counterparty', 'Project', 'Amount'],
      (r: any) => [r.date?.slice(0, 10), r.type, r.ref, r.party, r.project || '', r.amount]
    );
    toast.success('Ledger exported as CSV');
  };

  return (
    <AppShell>
      <PageHeader eyebrow="Unified Ledger" title="Transaction Ledger" description="Complete chronological record of capital movement across all instruments and entries."
        actions={
          <div className="hidden sm:flex items-center gap-2">
            <Button variant="outline" size="icon" className="rounded-none h-9 w-9" onClick={exportPDF}><FileText className="w-4 h-4" /></Button>
            <Button variant="outline" size="icon" className="rounded-none h-9 w-9" onClick={exportCSV}><Download className="w-4 h-4" /></Button>
          </div>
        } />

      {/* Mobile export bar */}
      <div className="sm:hidden px-4 py-3 border-b border-border flex gap-2">
        <Button variant="outline" size="sm" className="rounded-none text-xs flex-1" onClick={exportPDF}><FileText className="w-3.5 h-3.5 mr-1.5" />PDF</Button>
        <Button variant="outline" size="sm" className="rounded-none text-xs flex-1" onClick={exportCSV}><Download className="w-3.5 h-3.5 mr-1.5" />CSV</Button>
      </div>

      <div className="px-4 sm:px-8 py-5 border-b border-border grid grid-cols-3 gap-px bg-border">
        {[{ l: 'Inflow', v: fmtUSD(totals.inflow), c: 'text-positive' }, { l: 'Outflow', v: fmtUSD(totals.outflow), c: '' }, { l: 'Net Position', v: fmtUSD(totals.net), c: totals.net >= 0 ? 'text-positive' : 'text-accent' }].map(s => (
          <div key={s.l} className="bg-background px-4 sm:px-5 py-3"><div className="micro-label">{s.l}</div><div className={`text-base sm:text-xl font-semibold font-mono-tab mt-1 ${s.c}`}>{s.v}</div></div>
        ))}
      </div>

      <div className="px-4 sm:px-8 py-5 border-b border-border flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
        <Input placeholder="Search reference or counterparty…" value={q} onChange={e => setQ(e.target.value)} className="rounded-none max-w-sm h-9 w-full sm:w-auto" />
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="rounded-none w-full sm:w-36 h-9"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All types</SelectItem><SelectItem value="check">Checks</SelectItem><SelectItem value="income">Income</SelectItem><SelectItem value="expense">Expenses</SelectItem></SelectContent>
        </Select>
        <Select value={project} onValueChange={setProject}>
          <SelectTrigger className="rounded-none w-full sm:w-52 h-9"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All projects</SelectItem>{projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
        </Select>
        <div className="sm:ml-auto text-xs text-muted-foreground font-mono-tab">{rows.length} entries</div>
      </div>

      <div className="px-4 sm:px-8 py-6">
        {/* Mobile card view */}
        <div className="sm:hidden space-y-3">
          {rows.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">No entries match.</div>
          ) : rows.map(r => (
            <div key={r.id} className="border border-border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[0.14em] px-1.5 py-0.5 border border-border">{r.type}</span>
                <span className={`text-sm font-semibold font-mono-tab ${r.amount >= 0 ? 'text-positive' : ''}`}>{r.amount >= 0 ? '+' : '−'}{fmtUSD(Math.abs(r.amount))}</span>
              </div>
              <div className="text-sm font-medium">{r.party}</div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{r.project || '—'}</span>
                <span className="font-mono-tab">{fmtDate(r.date)}</span>
              </div>
              <div className="text-[10px] text-muted-foreground">Ref: {r.ref}</div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block border border-border">
          <div className="grid grid-cols-12 gap-4 px-4 py-2.5 border-b border-border bg-secondary/40 text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
            <div className="col-span-2">Date</div><div className="col-span-1">Type</div><div className="col-span-2">Ref</div><div className="col-span-3">Counterparty</div><div className="col-span-2">Project</div><div className="col-span-2 text-right">Amount</div>
          </div>
          {rows.length === 0 ? <div className="px-4 py-16 text-center text-sm text-muted-foreground">No entries match.</div> :
            rows.map(r => (
              <div key={r.id} className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-border last:border-b-0 text-sm font-mono-tab hover:bg-secondary/20">
                <div className="col-span-2 text-muted-foreground">{fmtDate(r.date)}</div>
                <div className="col-span-1"><span className="text-[10px] uppercase tracking-[0.14em] px-1.5 py-0.5 border border-border">{r.type}</span></div>
                <div className="col-span-2 truncate">{r.ref}</div>
                <div className="col-span-3 truncate">{r.party}</div>
                <div className="col-span-2 truncate text-muted-foreground">{r.project || '—'}</div>
                <div className={`col-span-2 text-right font-semibold ${r.amount >= 0 ? 'text-positive' : ''}`}>{r.amount >= 0 ? '+' : '−'}{fmtUSD(Math.abs(r.amount))}</div>
              </div>
            ))}
        </div>
      </div>
    </AppShell>
  );
}