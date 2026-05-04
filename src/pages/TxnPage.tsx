import { useState } from 'react';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useDelete, useProjects, useTransactions, useUpsert, useVendors } from '@/hooks/useFinance';
import { fmtDate, fmtUSD } from '@/lib/format';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function TxnPage({ kind }: { kind: 'income' | 'expense' }) {
  const { data: txns = [] } = useTransactions(kind);
  const { data: projects = [] } = useProjects();
  const { data: vendors = [] } = useVendors();
  const upsert = useUpsert('transactions', [['transactions']]);
  const del = useDelete('transactions', [['transactions']]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ amount: '', transaction_date: new Date().toISOString().slice(0, 10), vendor_id: '', source_name: '', project_id: '', category: '', notes: '' });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount) { toast.error('Amount required'); return; }
    await upsert.mutateAsync({
      type: kind, amount: parseFloat(form.amount), transaction_date: form.transaction_date,
      vendor_id: form.vendor_id || null, source_name: form.source_name || null,
      project_id: form.project_id || null, category: form.category || null, notes: form.notes || null,
    } as any);
    toast.success(kind === 'income' ? 'Income logged' : 'Expense recorded');
    setOpen(false);
    setForm({ amount: '', transaction_date: new Date().toISOString().slice(0, 10), vendor_id: '', source_name: '', project_id: '', category: '', notes: '' });
  };

  const total = txns.reduce((s: number, t: any) => s + Number(t.amount), 0);
  const isIncome = kind === 'income';

  return (
    <AppShell>
      <PageHeader eyebrow={isIncome ? 'Capital Inflow' : 'Capital Outflow'} title={isIncome ? 'Income' : 'Expenses'} description={isIncome ? 'Recorded receipts from clients and project funding sources.' : 'Non-check expenditures by vendor and category.'}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="rounded-none">{isIncome ? 'Log Income' : 'Record Expense'}</Button></DialogTrigger>
            <DialogContent className="rounded-none max-w-lg">
              <DialogHeader><DialogTitle>{isIncome ? 'Log Income' : 'Record Expense'}</DialogTitle></DialogHeader>
              <form onSubmit={submit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><Label className="micro-label">Amount</Label>
                    <Input type="number" step="0.01" required className="rounded-none font-mono-tab text-right" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label className="micro-label">Date</Label>
                    <Input type="date" className="rounded-none" value={form.transaction_date} onChange={e => setForm({ ...form, transaction_date: e.target.value })} /></div>
                </div>
                {isIncome ? (
                  <div className="space-y-1.5"><Label className="micro-label">Source</Label>
                    <Input placeholder="Client / source name" className="rounded-none" value={form.source_name} onChange={e => setForm({ ...form, source_name: e.target.value })} /></div>
                ) : (
                  <>
                    <div className="space-y-1.5"><Label className="micro-label">Vendor</Label>
                      <Select value={form.vendor_id} onValueChange={v => setForm({ ...form, vendor_id: v })}>
                        <SelectTrigger className="rounded-none"><SelectValue placeholder="Select vendor" /></SelectTrigger>
                        <SelectContent>{vendors.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5"><Label className="micro-label">Category</Label>
                      <Input placeholder="e.g. Materials, Labor, Permits" className="rounded-none" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /></div>
                  </>
                )}
                <div className="space-y-1.5"><Label className="micro-label">Project</Label>
                  <Select value={form.project_id} onValueChange={v => setForm({ ...form, project_id: v })}>
                    <SelectTrigger className="rounded-none"><SelectValue placeholder="Assign to project" /></SelectTrigger>
                    <SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label className="micro-label">Notes</Label>
                  <Textarea className="rounded-none" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                <Button type="submit" className="rounded-none w-full">Save</Button>
              </form>
            </DialogContent>
          </Dialog>
        } />

      <div className="px-8 py-5 border-b border-border flex items-center gap-6">
        <div><div className="micro-label">Total</div><div className="stat-value mt-1">{fmtUSD(total)}</div></div>
        <div><div className="micro-label">Records</div><div className="stat-value mt-1">{txns.length}</div></div>
      </div>

      <div className="px-8 py-6">
        <div className="border border-border">
          <div className="grid grid-cols-12 gap-4 px-4 py-2.5 border-b border-border bg-secondary/40 text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
            <div className="col-span-2">Date</div>
            <div className="col-span-3">{isIncome ? 'Source' : 'Vendor'}</div>
            <div className="col-span-3">Project</div>
            <div className="col-span-2">{isIncome ? 'Notes' : 'Category'}</div>
            <div className="col-span-1 text-right">Amount</div>
            <div className="col-span-1 text-right">—</div>
          </div>
          {txns.length === 0 ? (
            <div className="px-4 py-16 text-center text-sm text-muted-foreground">No records.</div>
          ) : txns.map((t: any) => (
            <div key={t.id} className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-border last:border-b-0 text-sm font-mono-tab hover:bg-secondary/20 items-center">
              <div className="col-span-2 text-muted-foreground">{fmtDate(t.transaction_date)}</div>
              <div className="col-span-3 truncate">{isIncome ? (t.source_name || t.vendors?.name || '—') : (t.vendors?.name || '—')}</div>
              <div className="col-span-3 truncate text-muted-foreground">{t.projects?.name || '—'}</div>
              <div className="col-span-2 truncate text-muted-foreground">{isIncome ? (t.notes || '—') : (t.category || '—')}</div>
              <div className={`col-span-1 text-right font-semibold ${isIncome ? 'text-positive' : ''}`}>{isIncome ? '+' : '−'}{fmtUSD(t.amount)}</div>
              <div className="col-span-1 flex justify-end">
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 rounded-none text-muted-foreground hover:text-accent"><Trash2 className="w-3.5 h-3.5" /></Button></AlertDialogTrigger>
                  <AlertDialogContent className="rounded-none">
                    <AlertDialogHeader><AlertDialogTitle>Delete record?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel className="rounded-none">Cancel</AlertDialogCancel><AlertDialogAction className="rounded-none bg-accent" onClick={() => del.mutate(t.id)}>Confirm</AlertDialogAction></AlertDialogFooter>
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
