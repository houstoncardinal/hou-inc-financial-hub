import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useChecks, useDelete, useUpsert } from '@/hooks/useFinance';
import { fmtDate, fmtUSD } from '@/lib/format';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { QuickCreateSelect } from '@/components/QuickCreateSelect';
import DigitalCheck from '@/components/DigitalCheck';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Trash2, Eye, Pencil, Table2, FileText, AlertTriangle } from 'lucide-react';
import { generateCheckRegisterReport, savePDF, downloadCheckExcel } from '@/lib/reports';
import { toast } from 'sonner';
import FinanceDetailDrawer from '@/components/FinanceDetailDrawer';

const CHK_CSS = `
.chk-row:hover{background-color:rgba(157,126,63,0.032)!important;}
`;

export default function Checks() {
  const { data: checks = [] } = useChecks();
  const upsert = useUpsert('checks', [['checks']]);
  const del = useDelete('checks', [['checks']]);

  const updateStatus = async (check: any, newStatus: string) => {
    try {
      await upsert.mutateAsync({ ...check, status: newStatus });
      toast.success(`Check #${check.check_number} → ${newStatus}`);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update status');
    }
  };
  const [q, setQ] = useState(''); const [statusFilter, setStatusFilter] = useState('all');
  const [detailRow, setDetailRow] = useState<any>(null);
  const [editCheck, setEditCheck] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});

  const openEdit = (c: any) => {
    setEditCheck(c);
    setEditForm({ amount: c.amount, payee_name: c.payee_name, memo: c.memo || '', retainage_pct: c.retainage_pct ?? 0, lien_waiver_status: c.lien_waiver_status || 'not_required' });
  };

  const saveEdit = async () => {
    if (!editCheck) return;
    try {
      await upsert.mutateAsync({ ...editCheck, ...editForm, amount: parseFloat(editForm.amount) || 0, retainage_pct: parseFloat(editForm.retainage_pct) || 0 });
      toast.success(`Check #${editCheck.check_number} updated`);
      setEditCheck(null);
    } catch (e: any) { toast.error(e?.message || 'Failed to save'); }
  };

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

  /* ── Excel Export ── */
  const exportExcel = () => {
    downloadCheckExcel(checks);
    toast.success('Check register exported as Excel');
  };

  return (
    <AppShell>
      <style>{CHK_CSS}</style>
      <PageHeader eyebrow="Instruments" title="Check Ledger" description="Issued instruments, payee assignment, and clearance state."
        actions={
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2">
              <Button variant="outline" size="icon" className="rounded-none h-9 w-9" onClick={exportPDF}><FileText className="w-4 h-4" /></Button>
              <Button variant="outline" size="icon" className="rounded-none h-9 w-9" onClick={exportExcel}><Table2 className="w-4 h-4" /></Button>
            </div>
            <Link to="/checks/new"><Button className="rounded-none">Create Check</Button></Link>
          </div>
        } />

      {/* Mobile export bar */}
      <div className="sm:hidden px-4 py-3 border-b border-border flex gap-2">
        <Button variant="outline" size="sm" className="rounded-none text-xs flex-1" onClick={exportPDF}><FileText className="w-3.5 h-3.5 mr-1.5" />PDF</Button>
        <Button variant="outline" size="sm" className="rounded-none text-xs flex-1" onClick={exportExcel}><Table2 className="w-3.5 h-3.5 mr-1.5" />Excel</Button>
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
            <div key={c.id} className="border border-border p-4 space-y-2 cursor-pointer" onClick={() => setDetailRow(c)}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">#{c.check_number}</span>
                <div className="flex items-center gap-2">
                  {c.retainage_pct > 0 && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {c.retainage_pct}% retained
                    </span>
                  )}
                  <span className="text-sm font-semibold font-mono-tab">{fmtUSD(c.amount)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                {c.lien_waiver_status === 'pending' && (
                  <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
                )}
                <span>{c.payee_name}</span>
                {c.lien_waiver_status === 'pending' && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-warning/10 text-warning border border-warning/20 ml-auto">
                    Lien Waiver Pending
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{c.projects?.name || '—'}</span>
                <span>{fmtDate(c.issue_date)}</span>
              </div>
              <div className="flex items-center gap-2 pt-1" onClick={e => e.stopPropagation()}>
                <Select value={c.status} onValueChange={v => updateStatus(c, v)}>
                  <SelectTrigger className="rounded-none h-7 text-[10px] uppercase tracking-wider px-2 flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="cleared">Cleared</SelectItem><SelectItem value="voided">Voided</SelectItem></SelectContent>
                </Select>
                <Dialog>
                  <DialogTrigger asChild><Button variant="ghost" size="sm" className="rounded-none h-7 w-7"><Eye className="w-3.5 h-3.5" /></Button></DialogTrigger>
                  <DialogContent className="max-w-2xl rounded-none p-0 border-border w-[calc(100%-2rem)]">
                    <DigitalCheck checkNumber={c.check_number} payee={c.payee_name} amount={Number(c.amount)} date={c.issue_date} memo={c.memo} status={c.status} />
                  </DialogContent>
                </Dialog>
                <Button variant="ghost" size="sm" className="rounded-none h-7 w-7" onClick={() => openEdit(c)}><Pencil className="w-3.5 h-3.5" /></Button>
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
            <div className="col-span-1">Check #</div><div className="col-span-3">Payee</div><div className="col-span-2">Project</div><div className="col-span-1">Date</div><div className="col-span-1 text-center">Lien</div><div className="col-span-2 text-right">Amount</div><div className="col-span-1">Status</div><div className="col-span-1 text-right">—</div>
          </div>
          {filtered.length === 0 ? (
            <div className="px-4 py-16 text-center text-sm text-muted-foreground">No checks issued.</div>
          ) : filtered.map((c: any) => (
            <div key={c.id} className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-border last:border-b-0 text-sm font-mono-tab chk-row items-center cursor-pointer" onClick={() => setDetailRow(c)}>
              <div className="col-span-1 font-semibold">{c.check_number}</div>
              <div className="col-span-3 truncate">{c.payee_name}</div>
              <div className="col-span-2 truncate text-muted-foreground">{c.projects?.name || '—'}</div>
              <div className="col-span-1 text-muted-foreground text-xs">{fmtDate(c.issue_date)}</div>
              <div className="col-span-1 flex justify-center">
                {c.lien_waiver_status === 'pending' && (
                  <span title="Lien waiver pending"><AlertTriangle className="w-3.5 h-3.5 text-warning" /></span>
                )}
                {c.lien_waiver_status === 'received' && (
                  <span className="text-[8px] font-bold text-positive">✓</span>
                )}
              </div>
              <div className="col-span-2 text-right">
                <div className="font-semibold">{fmtUSD(c.amount)}</div>
                {c.retainage_pct > 0 && (
                  <div className="text-[9px] text-muted-foreground">{c.retainage_pct}% retained</div>
                )}
              </div>
              <div className="col-span-1" onClick={e => e.stopPropagation()}>
                <Select value={c.status} onValueChange={v => updateStatus(c, v)}>
                  <SelectTrigger className="rounded-none h-7 text-[10px] uppercase tracking-wider px-2"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="cleared">Cleared</SelectItem><SelectItem value="voided">Voided</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="col-span-1 flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                <Dialog>
                  <DialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 rounded-none"><Eye className="w-3.5 h-3.5" /></Button></DialogTrigger>
                  <DialogContent className="max-w-2xl rounded-none p-0 border-border">
                    <DigitalCheck checkNumber={c.check_number} payee={c.payee_name} amount={Number(c.amount)} date={c.issue_date} memo={c.memo} status={c.status} />
                  </DialogContent>
                </Dialog>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-none" onClick={() => openEdit(c)}><Pencil className="w-3.5 h-3.5" /></Button>
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

      <FinanceDetailDrawer open={!!detailRow} onClose={() => setDetailRow(null)} kind="check" data={detailRow} />

      {/* Edit check dialog */}
      <Dialog open={!!editCheck} onOpenChange={open => { if (!open) setEditCheck(null); }}>
        <DialogContent className="rounded-none max-w-lg w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold tracking-wide">Edit Check #{editCheck?.check_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="micro-label">Payee Name</Label>
                <Input value={editForm.payee_name || ''} onChange={e => setEditForm((f: any) => ({ ...f, payee_name: e.target.value }))} className="rounded-none h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="micro-label">Amount</Label>
                <Input type="number" step="0.01" value={editForm.amount || ''} onChange={e => setEditForm((f: any) => ({ ...f, amount: e.target.value }))} className="rounded-none h-9 text-sm font-mono-tab" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="micro-label">Memo</Label>
              <Input value={editForm.memo || ''} onChange={e => setEditForm((f: any) => ({ ...f, memo: e.target.value }))} className="rounded-none h-9 text-sm" placeholder="Optional memo" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="micro-label">Retainage %</Label>
                <Input type="number" step="0.5" min="0" max="100" value={editForm.retainage_pct || ''} onChange={e => setEditForm((f: any) => ({ ...f, retainage_pct: e.target.value }))} className="rounded-none h-9 text-sm font-mono-tab" placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label className="micro-label">Lien Waiver Status</Label>
                <Select value={editForm.lien_waiver_status || 'not_required'} onValueChange={v => setEditForm((f: any) => ({ ...f, lien_waiver_status: v }))}>
                  <SelectTrigger className="rounded-none h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_required">Not Required</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="received">Received</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild><Button variant="outline" className="rounded-none h-9 text-xs">Cancel</Button></DialogClose>
            <Button onClick={saveEdit} disabled={upsert.isPending} className="rounded-none h-9 text-xs bg-foreground text-background hover:opacity-90">
              {upsert.isPending ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}