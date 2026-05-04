import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useChecks, useDelete, useUpsert } from '@/hooks/useFinance';
import { fmtDate, fmtUSD } from '@/lib/format';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import DigitalCheck from '@/components/DigitalCheck';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Trash2, Eye } from 'lucide-react';

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

  return (
    <AppShell>
      <PageHeader eyebrow="Instruments" title="Check Ledger" description="Issued instruments, payee assignment, and clearance state."
        actions={<Link to="/checks/new"><Button className="rounded-none">Create Check</Button></Link>} />

      <div className="px-8 py-5 border-b border-border flex gap-3 items-center">
        <Input placeholder="Search check #, payee, project…" value={q} onChange={e => setQ(e.target.value)} className="rounded-none max-w-sm h-9" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="rounded-none w-44 h-9"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="cleared">Cleared</SelectItem><SelectItem value="voided">Voided</SelectItem></SelectContent>
        </Select>
        <div className="ml-auto text-xs text-muted-foreground font-mono-tab">{filtered.length} of {checks.length}</div>
      </div>

      <div className="px-8 py-6">
        <div className="border border-border">
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
