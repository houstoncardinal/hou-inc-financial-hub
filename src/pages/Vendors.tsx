import { useMemo, useState } from 'react';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useChecks, useDelete, useTransactions, useUpsert, useVendors } from '@/hooks/useFinance';
import { fmtUSD } from '@/lib/format';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const blank = { name: '', contact_email: '', contact_phone: '', address: '', notes: '' };

export default function Vendors() {
  const { data: vendors = [] } = useVendors();
  const { data: checks = [] } = useChecks();
  const { data: expenses = [] } = useTransactions('expense');
  const upsert = useUpsert('vendors', [['vendors']]);
  const del = useDelete('vendors', [['vendors']]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(blank);
  const [q, setQ] = useState('');

  const enriched = useMemo(() => vendors.filter((v: any) => !q || v.name.toLowerCase().includes(q.toLowerCase())).map((v: any) => {
    const checksTotal = checks.filter((c: any) => c.payee_vendor_id === v.id && c.status !== 'voided').reduce((s: number, c: any) => s + Number(c.amount), 0);
    const expTotal = expenses.filter((t: any) => t.vendor_id === v.id).reduce((s: number, t: any) => s + Number(t.amount), 0);
    const txnCount = checks.filter((c: any) => c.payee_vendor_id === v.id).length + expenses.filter((t: any) => t.vendor_id === v.id).length;
    return { ...v, totalPaid: checksTotal + expTotal, txnCount };
  }), [vendors, checks, expenses, q]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    await upsert.mutateAsync(form);
    toast.success('Vendor saved');
    setOpen(false); setForm(blank);
  };

  return (
    <AppShell>
      <PageHeader eyebrow="Counterparties" title="Vendors" description="Structured registry of payees with linked transaction history and total disbursement."
        actions={
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setForm(blank); }}>
            <DialogTrigger asChild><Button className="rounded-none">New Vendor</Button></DialogTrigger>
            <DialogContent className="rounded-none max-w-lg">
              <DialogHeader><DialogTitle>{form.id ? 'Edit Vendor' : 'New Vendor'}</DialogTitle></DialogHeader>
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-1.5"><Label className="micro-label">Legal Name</Label><Input className="rounded-none" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><Label className="micro-label">Email</Label><Input type="email" className="rounded-none" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label className="micro-label">Phone</Label><Input className="rounded-none" value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} /></div>
                </div>
                <div className="space-y-1.5"><Label className="micro-label">Address</Label><Input className="rounded-none" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
                <div className="space-y-1.5"><Label className="micro-label">Notes</Label><Textarea className="rounded-none" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                <Button type="submit" className="rounded-none w-full">Save</Button>
              </form>
            </DialogContent>
          </Dialog>
        } />

      <div className="px-8 py-5 border-b border-border">
        <Input placeholder="Search vendors…" value={q} onChange={e => setQ(e.target.value)} className="rounded-none max-w-sm h-9" />
      </div>

      <div className="px-8 py-6">
        <div className="border border-border">
          <div className="grid grid-cols-12 gap-4 px-4 py-2.5 border-b border-border bg-secondary/40 text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
            <div className="col-span-3">Vendor</div><div className="col-span-3">Email</div><div className="col-span-2">Phone</div><div className="col-span-1 text-right">Txns</div><div className="col-span-2 text-right">Total Paid</div><div className="col-span-1 text-right">—</div>
          </div>
          {enriched.length === 0 ? <div className="px-4 py-16 text-center text-sm text-muted-foreground">No vendors registered.</div> :
            enriched.map((v: any) => (
              <div key={v.id} className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-border last:border-b-0 text-sm font-mono-tab hover:bg-secondary/20 items-center">
                <div className="col-span-3 font-medium">{v.name}</div>
                <div className="col-span-3 text-muted-foreground truncate">{v.contact_email || '—'}</div>
                <div className="col-span-2 text-muted-foreground truncate">{v.contact_phone || '—'}</div>
                <div className="col-span-1 text-right text-muted-foreground">{v.txnCount}</div>
                <div className="col-span-2 text-right font-semibold">{fmtUSD(v.totalPaid)}</div>
                <div className="col-span-1 flex justify-end gap-1">
                  <Button variant="ghost" size="sm" className="h-7 rounded-none text-xs" onClick={() => { setForm({ id: v.id, name: v.name, contact_email: v.contact_email || '', contact_phone: v.contact_phone || '', address: v.address || '', notes: v.notes || '' }); setOpen(true); }}>Edit</Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 rounded-none text-muted-foreground hover:text-accent"><Trash2 className="w-3.5 h-3.5" /></Button></AlertDialogTrigger>
                    <AlertDialogContent className="rounded-none">
                      <AlertDialogHeader><AlertDialogTitle>Remove vendor?</AlertDialogTitle><AlertDialogDescription>Linked transactions will retain their amounts but lose vendor reference.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel className="rounded-none">Cancel</AlertDialogCancel><AlertDialogAction className="rounded-none bg-accent" onClick={() => del.mutate(v.id)}>Confirm</AlertDialogAction></AlertDialogFooter>
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
