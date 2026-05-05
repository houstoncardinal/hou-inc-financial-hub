import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useChecks, useDelete, useUpsert, useQuickCreate } from '@/hooks/useFinance';
import { fmtDate, fmtUSD } from '@/lib/format';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { QuickCreateSelect } from '@/components/QuickCreateSelect';
import DigitalCheck from '@/components/DigitalCheck';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Trash2, Eye, Download, FileText } from 'lucide-react';
import { generateCheckRegisterReport, savePDF, downloadCSV } from '@/lib/reports';
import { toast } from 'sonner';

export default function Checks() {
  const { data: checks = [] } = useChecks();
  const upsert = useUpsert('checks', [['checks']]);
  const del = useDelete('checks', [['checks']]);
  const [q, setQ] = useState(''); const [statusFilter, setStatusFilter] = useState('all');

  const filtered = useMemo(() => checks.filter((c: any) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return c.check_number?.toLowerCase().includes(s) || c.payee_name?.toLowerCase().includes(s) || c.projects?.name?.toLowerCase().includes(s);
  }), [checks, q, statusFilter]);

  /* ── PDF Export ── */
  const exportPDF = () => {
    const doc = generateCheckRegisterReport(checks, statusFilter !== 'all' ? statusFilter : undefined);
    savePDF(doc, `hou-check-register-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success('Check register exported as PDF');
  };

  /* ── CSV Export ── */
  const exportCSV = () => {
    downloadCSV(
      filtered,
      `hou-checks-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Check #', 'Payee', 'Amount', 'Issue Date', 'Status', 'Project', 'Memo'],
      (c: any) => [c.check_number, c.payee_name, c.amount, c.issue_date, c.status, c.projects?.name || '', c.memo || '']
    );
    toast.success('Check register exported as CSV');
  };

  return (
    <AppShell>
      <PageHeader eyebrow="Instruments" title="Check Ledger" description="Issued instruments, payee assignment, and clearance state."
        actions={
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2">
              <Button variant="outline" size="icon" className="rounded-none h-9 w-9" onClick={exportPDF}><FileText className="w-4 h-4" /></Button>
              <Button variant="outline" size="icon" className="rounded-none h-9 w-9" onClick={exportCSV}><Download className="w-4 h-4" /></Button>
            </div>
            <Link to="/checks/new"><Button className="rounded-none">Create Check</Button></Link>
          </div>
        } />

      {/* Mobile export bar */}
      <div className="sm:hidden px-4 py-3 border-b border-border flex gap-2">
        <Button variant="outline" size="sm" className="rounded-none text-xs flex-1" onClick={exportPDF}><FileText className="w-3.5 h-3.5 mr-1.5" />PDF</Button>
        <Button variant="outline" size="sm" className="rounded-none text-xs flex-1" onClick={exportCSV}><Download className="w-3.5 h-3.5 mr-1.5" />CSV</Button>
      </div>

      <div className="px-4 sm:px-8 py-5 border-b border-border flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <Input placeholder="Search check #, payee, project…" value={q} onChange={e => setQ(e.target.value)} className="rounded-none max-w-sm h-9 w-full sm:w-auto" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="rounded-none w-full sm:w-44 h-9"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="cleared">Cleared</SelectItem><SelectItem value="voided">Voided</SelectItem></SelectContent>
        </Select>
        <div className="sm:ml-auto text-xs text-muted-foreground font-mono-tab">{filtered.length} of {checks.length}</div>
      </div>

      <div className="px-4 sm:px-8 py-6">
        {/* Mobile card view */}
        <div className="sm:hidden space-y-3">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">No checks issued.</div>
          ) : filtered.map((c: any) => (
            <div key={c.id} className="border border-border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">#{c.check_number}</span>
                <span className="text-sm font-semibold font-mono-tab">{fmtUSD(c.amount)}</span>
              </div>
              <div className="text-sm">{c.payee_name}</div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{c.projects?.name || '—'}</span>
                <span>{fmtDate(c.issue_date)}</span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Select value={c.status} onValueChange={v => upsert.mutate({ ...c, status: v })}>
                  <SelectTrigger className="rounded-none h-7 text-[10px] uppercase tracking-wider px-2 flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="cleared">Cleared</SelectItem><SelectItem value="voided">Voided</SelectItem></SelectContent>
                </Select>
                <Dialog>
                  <DialogTrigger asChild><Button variant="ghost" size="sm" className="rounded-none h-7 w-7"><Eye className="w-3.5 h-3.5" /></Button></DialogTrigger>
                  <DialogContent className="max-w-2xl rounded-none p-0 border-border w-[calc(100%-2rem)]">
                    <DigitalCheck checkNumber={c.check_number} payee={c.payee_name} amount={Number(c.amount)} date={c.issue_date} memo={c.memo} status={c.status} />
                  </DialogContent>
                </Dialog>
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="rounded-none h-7 w-7 text-muted-foreground hover:text-accent"><Trash2 className="w-3.5 h-3.5" /></Button></AlertDialogTrigger>
                  <AlertDialogContent className="rounded-none w-[calc(100%-2rem)]">
                    <AlertDialogHeader><AlertDialogTitle>Void this check?</AlertDialogTitle><AlertDialogDescription>This permanently removes check #{c.check_number} from the ledger.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2"><AlertDialogCancel className="rounded-none w-full sm:w-auto">Cancel</AlertDialogCancel><AlertDialogAction className="rounded-none bg-accent w-full sm:w-auto" onClick={() => del.mutate(c.id)}>Confirm</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block border border-border">
          <div className="grid grid-cols-12 gap-4 px-4 py-2.5 border-b border-border bg-secondary/40 text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
            <div className="col-span-1">Check #</div><div className="col-span-3">Payee</div><div className="col-span-2">Project</div><div className="col-span-2">Date</div><div className="col-span-2 text-right">Amount</div><div className="col-span-1">Status</div><div className="col-span-1 text-right">—</div>
          </div>
          {filtered.length === 0 ? (
            <div className="px-4 py-16 text-center text-sm text-muted-foreground">No checks issued.</div>
          ) : filtered.map((c: any) => (
            <div key={c.id} className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-border last:border-b-0 text-sm font-mono-tab hover:bg-secondary/20 items-center">
              <div className="col-span-1 font-semibold">{c.check_number}</div>
              <div className="col-span-3 truncate">{c.payee_name}</div>
              <div className="col-span-2 truncate text-muted-foreground">{c.projects?.name || '—'}</div>
              <div className="col-span-2 text-muted-foreground">{fmtDate(c.issue_date)}</div>
              <div className="col-span-2 text-right font-semibold">{fmtUSD(c.amount)}</div>
              <div className="col-span-1">
                <Select value={c.status} onValueChange={v => upsert.mutate({ ...c, status: v })}>
                  <SelectTrigger className="rounded-none h-7 text-[10px] uppercase tracking-wider px-2"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="cleared">Cleared</SelectItem><SelectItem value="voided">Voided</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="col-span-1 flex justify-end gap-1">
                <Dialog>
                  <DialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 rounded-none"><Eye className="w-3.5 h-3.5" /></Button></DialogTrigger>
                  <DialogContent className="max-w-2xl rounded-none p-0 border-border">
                    <DigitalCheck checkNumber={c.check_number} payee={c.payee_name} amount={Number(c.amount)} date={c.issue_date} memo={c.memo} status={c.status} />
                  </DialogContent>
                </Dialog>
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 rounded-none text-muted-foreground hover:text-accent"><Trash2 className="w-3.5 h-3.5" /></Button></AlertDialogTrigger>
                  <AlertDialogContent className="rounded-none">
                    <AlertDialogHeader><AlertDialogTitle>Void this check?</AlertDialogTitle><AlertDialogDescription>This permanently removes check #{c.check_number} from the ledger.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel className="rounded-none">Cancel</AlertDialogCancel><AlertDialogAction className="rounded-none bg-accent" onClick={() => del.mutate(c.id)}>Confirm</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}