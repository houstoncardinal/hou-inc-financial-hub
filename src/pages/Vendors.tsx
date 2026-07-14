import { useMemo, useState } from 'react';
import LocationAutocomplete from '@/components/ui/smart/LocationAutocomplete';
import PhoneInput from '@/components/ui/smart/PhoneInput';
import EmailInput from '@/components/ui/smart/EmailInput';
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
import { Trash2, Download, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { downloadCSV } from '@/lib/reports';
import FinanceDetailDrawer from '@/components/FinanceDetailDrawer';

const blank = { name: '', contact_email: '', contact_phone: '', address: '', notes: '', ein: '', w9_on_file: false, requires_1099: false, lien_waiver_required: false };

const VND_CSS = `
.vnd-row:hover{background-color:rgba(157,126,63,0.032)!important;}
`;

export default function Vendors() {
  const { data: vendors = [] } = useVendors();
  const { data: checks = [] } = useChecks();
  const { data: expenses = [] } = useTransactions('expense');
  const upsert = useUpsert('vendors', [['vendors']]);
  const del = useDelete('vendors', [['vendors']]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(blank);
  const [q, setQ] = useState('');
  const [detailRow, setDetailRow] = useState<any>(null);

  const enriched = useMemo(() => vendors.filter((v: any) => !q || v.name.toLowerCase().includes(q.toLowerCase())).map((v: any) => {
    const checksTotal = checks.filter((c: any) => c.payee_vendor_id === v.id && c.status !== 'voided').reduce((s: number, c: any) => s + Number(c.amount), 0);
    const expTotal = expenses.filter((t: any) => t.vendor_id === v.id).reduce((s: number, t: any) => s + Number(t.amount), 0);
    const txnCount = checks.filter((c: any) => c.payee_vendor_id === v.id).length + expenses.filter((t: any) => t.vendor_id === v.id).length;
    return { ...v, totalPaid: checksTotal + expTotal, txnCount };
  }), [vendors, checks, expenses, q]);

  /* ── CSV Export ── */
  const exportCSV = () => {
    downloadCSV(
      enriched,
      `hou-vendors-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Name', 'EIN', 'Email', 'Phone', 'W9 On File', '1099 Required', 'Lien Waiver Req', 'Total Paid', 'Transactions', 'Notes'],
      (v: any) => [v.name, v.ein || '', v.contact_email || '', v.contact_phone || '', v.w9_on_file ? 'Yes' : 'No', v.requires_1099 ? 'Yes' : 'No', v.lien_waiver_required ? 'Yes' : 'No', v.totalPaid, v.txnCount, v.notes || '']
    );
    toast.success('Vendors exported as CSV');
  };

  /* ── 1099 Summary Export ── */
  const export1099 = () => {
    const eligible = enriched.filter((v: any) => v.requires_1099);
    if (!eligible.length) { toast.error('No 1099-eligible vendors found'); return; }
    downloadCSV(
      eligible,
      `hou-1099-summary-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Vendor Name', 'EIN', 'Email', 'Phone', 'Total Paid (YTD)', 'W9 On File'],
      (v: any) => [v.name, v.ein || 'MISSING', v.contact_email || '', v.contact_phone || '', v.totalPaid, v.w9_on_file ? 'Yes' : 'No — COLLECT W9']
    );
    toast.success(`1099 summary: ${eligible.length} vendors exported`);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    await upsert.mutateAsync(form);
    toast.success('Vendor saved');
    setOpen(false); setForm(blank);
  };

  return (
    <AppShell>
      <style>{VND_CSS}</style>
      <PageHeader eyebrow="Counterparties" title="Vendors" description="Structured registry of payees with linked transaction history and total disbursement."
        actions={
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2">
              <Button variant="outline" size="icon" className="rounded-none h-9 w-9" onClick={export1099} title="Export 1099 Summary"><FileSpreadsheet className="w-4 h-4" /></Button>
              <Button variant="outline" size="icon" className="rounded-none h-9 w-9" onClick={exportCSV}><Download className="w-4 h-4" /></Button>
            </div>
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setForm(blank); }}>
              <DialogTrigger asChild><Button className="rounded-none">New Vendor</Button></DialogTrigger>
              <DialogContent className="rounded-none sm:max-w-lg w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>{form.id ? 'Edit Vendor' : 'New Vendor'}</DialogTitle></DialogHeader>
                <form onSubmit={submit} className="space-y-4">
                  <div className="space-y-1.5"><Label className="micro-label">Legal Name</Label><Input className="rounded-none h-10" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="micro-label">Email</Label>
                      <EmailInput
                        value={form.contact_email}
                        onChange={v => setForm({ ...form, contact_email: v })}
                        inputClassName="rounded-none h-10 w-full border border-input bg-background text-sm outline-none"
                        focusBorderColor="hsl(var(--ring))"
                        defaultBorderColor="hsl(var(--border))"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="micro-label">Phone</Label>
                      <PhoneInput
                        value={form.contact_phone}
                        onChange={v => setForm({ ...form, contact_phone: v })}
                        inputClassName="rounded-none h-10 w-full border border-input bg-background text-sm outline-none"
                        focusBorderColor="hsl(var(--ring))"
                        defaultBorderColor="hsl(var(--border))"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="micro-label">Address</Label>
                    <LocationAutocomplete
                      value={form.address}
                      onChange={v => setForm({ ...form, address: v })}
                      placeholder="Street, City, State ZIP"
                      inputClassName="rounded-none h-10 w-full border border-input bg-background text-sm outline-none"
                      focusBorderColor="hsl(var(--ring))"
                      defaultBorderColor="hsl(var(--border))"
                    />
                  </div>
                  <div className="space-y-1.5"><Label className="micro-label">EIN (Tax ID)</Label><Input className="rounded-none h-10 font-mono-tab" placeholder="XX-XXXXXXX" value={form.ein} onChange={e => setForm({ ...form, ein: e.target.value })} /></div>
                  <div className="border border-border p-4 space-y-3">
                    <div className="micro-label text-muted-foreground">IRS Compliance</div>
                    {[
                      { key: 'w9_on_file', label: 'W9 on file' },
                      { key: 'requires_1099', label: 'Requires 1099-NEC' },
                      { key: 'lien_waiver_required', label: 'Lien waiver required on payments' },
                    ].map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(form as any)[key]}
                          onChange={e => setForm({ ...form, [key]: e.target.checked })}
                          className="rounded-none accent-accent w-4 h-4"
                        />
                        <span className="text-sm">{label}</span>
                      </label>
                    ))}
                  </div>
                  <div className="space-y-1.5"><Label className="micro-label">Notes</Label><Textarea className="rounded-none" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                  <Button type="submit" className="rounded-none w-full h-10">Save</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        } />

      {/* Mobile export bar */}
      <div className="sm:hidden px-4 py-3 border-b border-border">
        <Button variant="outline" size="sm" className="rounded-none text-xs w-full" onClick={exportCSV}><Download className="w-3.5 h-3.5 mr-1.5" />Export CSV</Button>
      </div>

      <div className="px-4 sm:px-8 py-5 border-b border-border">
        <Input placeholder="Search vendors…" value={q} onChange={e => setQ(e.target.value)} className="rounded-none max-w-sm h-9 w-full sm:w-auto" />
      </div>

      <div className="px-4 sm:px-8 py-6">
        {/* Mobile card view */}
        <div className="sm:hidden space-y-3">
          {enriched.length === 0 ? <div className="py-16 text-center text-sm text-muted-foreground">No vendors registered.</div> :
            enriched.map((v: any) => (
              <div key={v.id} className="border border-border p-4 space-y-2 cursor-pointer" onClick={() => setDetailRow(v)}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{v.name}</span>
                  <span className="text-sm font-semibold font-mono-tab">{fmtUSD(v.totalPaid)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{v.contact_email || '—'}</span>
                  <span>{v.contact_phone || '—'}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{v.txnCount} transactions</span>
                  <span>{v.address || '—'}</span>
                </div>
                <div className="flex justify-end gap-2 pt-1" onClick={e => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="rounded-none h-7 text-xs" onClick={() => { setForm({ id: v.id, name: v.name, contact_email: v.contact_email || '', contact_phone: v.contact_phone || '', address: v.address || '', notes: v.notes || '', ein: v.ein || '', w9_on_file: v.w9_on_file || false, requires_1099: v.requires_1099 || false, lien_waiver_required: v.lien_waiver_required || false }); setOpen(true); }}>Edit</Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="rounded-none h-7 w-7 text-muted-foreground hover:text-accent"><Trash2 className="w-3.5 h-3.5" /></Button></AlertDialogTrigger>
                    <AlertDialogContent className="rounded-none w-[calc(100%-2rem)]">
                      <AlertDialogHeader><AlertDialogTitle>Remove vendor?</AlertDialogTitle><AlertDialogDescription>Linked transactions will retain their amounts but lose vendor reference.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter className="flex-col sm:flex-row gap-2"><AlertDialogCancel className="rounded-none w-full sm:w-auto">Cancel</AlertDialogCancel><AlertDialogAction className="rounded-none bg-accent w-full sm:w-auto" onClick={() => del.mutate(v.id)}>Confirm</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block border border-border">
          <div className="grid grid-cols-12 gap-4 px-4 py-2.5 border-b border-border bg-secondary/40 text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
            <div className="col-span-3">Vendor</div><div className="col-span-2">Email</div><div className="col-span-1">Phone</div><div className="col-span-2">Compliance</div><div className="col-span-1 text-right">Txns</div><div className="col-span-2 text-right">Total Paid</div><div className="col-span-1 text-right">—</div>
          </div>
          {enriched.length === 0 ? <div className="px-4 py-16 text-center text-sm text-muted-foreground">No vendors registered.</div> :
            enriched.map((v: any) => (
              <div key={v.id} className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-border last:border-b-0 text-sm font-mono-tab vnd-row items-center cursor-pointer" onClick={() => setDetailRow(v)}>
                <div className="col-span-3 font-medium">{v.name}</div>
                <div className="col-span-2 text-muted-foreground truncate">{v.contact_email || '—'}</div>
                <div className="col-span-1 text-muted-foreground truncate">{v.contact_phone || '—'}</div>
                <div className="col-span-2 flex flex-wrap gap-1">
                  {v.requires_1099 && (
                    <span className="text-[7px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-accent/10 text-accent border border-accent/20">1099</span>
                  )}
                  {v.w9_on_file && (
                    <span className="text-[7px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-positive/10 text-positive border border-positive/20">W9 ✓</span>
                  )}
                  {v.requires_1099 && !v.w9_on_file && (
                    <span className="text-[7px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-warning/10 text-warning border border-warning/20">W9 !</span>
                  )}
                </div>
                <div className="col-span-1 text-right text-muted-foreground">{v.txnCount}</div>
                <div className="col-span-2 text-right font-semibold">{fmtUSD(v.totalPaid)}</div>
                <div className="col-span-1 flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="h-7 rounded-none text-xs" onClick={() => { setForm({ id: v.id, name: v.name, contact_email: v.contact_email || '', contact_phone: v.contact_phone || '', address: v.address || '', notes: v.notes || '', ein: v.ein || '', w9_on_file: v.w9_on_file || false, requires_1099: v.requires_1099 || false, lien_waiver_required: v.lien_waiver_required || false }); setOpen(true); }}>Edit</Button>
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
      <FinanceDetailDrawer open={!!detailRow} onClose={() => setDetailRow(null)} kind="vendor" data={detailRow} />
    </AppShell>
  );
}