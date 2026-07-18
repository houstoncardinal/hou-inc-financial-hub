import { useMemo, useState } from 'react';
import LocationAutocomplete from '@/components/ui/smart/LocationAutocomplete';
import PhoneInput from '@/components/ui/smart/PhoneInput';
import EmailInput from '@/components/ui/smart/EmailInput';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { useEntity } from '@/contexts/EntityContext';
import { screenHeaderFor } from '@/lib/entityFinance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useChecks, useDelete, useTransactions, useUpsert, useVendors } from '@/hooks/useFinance';
import { fmtUSD } from '@/lib/format';
import {
  Trash2, Download, FileSpreadsheet, Plus, Building2, ShieldCheck,
  AlertTriangle, CircleDollarSign, ClipboardCheck, Search, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { downloadCSV } from '@/lib/reports';
import FinanceDetailDrawer from '@/components/FinanceDetailDrawer';

const blank = {
  name: '',
  legal_name: '',
  dba: '',
  contact_email: '',
  contact_phone: '',
  address: '',
  remittance_address: '',
  notes: '',
  ein: '',
  payment_terms: '',
  license_number: '',
  insurance_expiration: '',
  default_expense_category: '',
  tax_id_status: '',
  is_subcontractor: false,
  w9_on_file: false,
  requires_1099: false,
  lien_waiver_required: false,
};

const VND_CSS = `
.vnd-shell{background:linear-gradient(180deg,hsl(var(--secondary)/0.22),transparent 230px);}
.vnd-panel{background:hsl(var(--background));border:1px solid hsl(var(--border));box-shadow:0 1px 3px rgba(10,10,10,0.05),0 1px 2px rgba(10,10,10,0.03);}
.vnd-intel-card{background:hsl(var(--background));border:1px solid hsl(var(--border));box-shadow:0 1px 3px rgba(10,10,10,0.05),0 1px 0 rgba(255,255,255,0.45) inset;position:relative;overflow:hidden;transition:box-shadow .18s,transform .18s,border-color .18s;}
.vnd-intel-card:hover{box-shadow:0 8px 22px rgba(10,10,10,0.08);transform:translateY(-1px);border-color:hsl(var(--foreground)/0.2);}
.vnd-card{background:hsl(var(--background));border:1px solid hsl(var(--border));box-shadow:0 1px 3px rgba(10,10,10,0.045),0 1px 0 rgba(255,255,255,0.45) inset;transition:transform .16s,border-color .16s,box-shadow .16s;}
.vnd-card:hover{transform:translateY(-1px);border-color:hsl(var(--foreground)/0.22);box-shadow:0 8px 22px rgba(10,10,10,0.08);}
.vnd-chip{font-size:7px;font-weight:900;text-transform:uppercase;letter-spacing:.14em;padding:2px 6px;border:1px solid hsl(var(--border));background:hsl(var(--secondary)/.45);color:hsl(var(--foreground)/.68);}
.vnd-step{border:1px solid hsl(var(--border));background:hsl(var(--secondary)/.24);padding:8px 10px;font-size:9px;text-transform:uppercase;letter-spacing:.14em;font-weight:800;color:hsl(var(--muted-foreground));}
.vnd-step[data-active=true]{background:hsl(var(--foreground));color:hsl(var(--background));border-color:hsl(var(--foreground));}
.vnd-row:hover{background-color:rgba(157,126,63,0.032)!important;}
.dark .vnd-panel,.dark .vnd-intel-card,.dark .vnd-card{background:hsl(var(--card));box-shadow:0 1px 4px rgba(0,0,0,0.28),0 1px 0 rgba(255,255,255,0.05) inset;}
`;

export default function Vendors() {
  const { entity } = useEntity();
  const vendorsHeader = screenHeaderFor(entity?.id, 'vendors', { title: 'Vendors', description: 'Structured registry of payees with linked transaction history and total disbursement.' });
  const { data: vendors = [] } = useVendors();
  const { data: checks = [] } = useChecks();
  const { data: expenses = [] } = useTransactions('expense');
  const upsert = useUpsert('vendors', [['vendors']]);
  const del = useDelete('vendors', [['vendors']]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(blank);
  const [vendorStep, setVendorStep] = useState(1);
  const [q, setQ] = useState('');
  const [detailRow, setDetailRow] = useState<any>(null);

  const enriched = useMemo(() => vendors.filter((v: any) => !q || v.name.toLowerCase().includes(q.toLowerCase())).map((v: any) => {
    const checksTotal = checks.filter((c: any) => c.payee_vendor_id === v.id && c.status !== 'voided').reduce((s: number, c: any) => s + Number(c.amount), 0);
    const expTotal = expenses.filter((t: any) => t.vendor_id === v.id).reduce((s: number, t: any) => s + Number(t.amount), 0);
    const txnCount = checks.filter((c: any) => c.payee_vendor_id === v.id).length + expenses.filter((t: any) => t.vendor_id === v.id).length;
    const needsW9 = Boolean(v.requires_1099 && !v.w9_on_file);
    const insuranceExpired = v.insurance_expiration ? new Date(v.insurance_expiration) < new Date() : false;
    const complianceScore = Math.max(0, 100 - (needsW9 ? 34 : 0) - (insuranceExpired ? 28 : 0) - (!v.contact_email ? 10 : 0) - (!v.ein && v.requires_1099 ? 14 : 0));
    return { ...v, totalPaid: checksTotal + expTotal, txnCount, needsW9, insuranceExpired, complianceScore };
  }), [vendors, checks, expenses, q]);

  const vendorStats = useMemo(() => {
    const totalPaid = enriched.reduce((s: number, v: any) => s + v.totalPaid, 0);
    const needsW9 = enriched.filter((v: any) => v.needsW9).length;
    const subcontractors = enriched.filter((v: any) => v.is_subcontractor).length;
    const avgCompliance = enriched.length ? enriched.reduce((s: number, v: any) => s + v.complianceScore, 0) / enriched.length : 0;
    return { totalPaid, needsW9, subcontractors, avgCompliance, count: enriched.length };
  }, [enriched]);

  const vendorCards = [
    { label: 'Vendor Network', value: vendorStats.count.toLocaleString(), sub: `${vendorStats.subcontractors} subcontractors`, icon: Building2, color: '#111827' },
    { label: 'Total Disbursed', value: fmtUSD(vendorStats.totalPaid), sub: `${enriched.reduce((s: number, v: any) => s + v.txnCount, 0)} linked records`, icon: CircleDollarSign, color: '#9D7E3F' },
    { label: 'Compliance Health', value: `${Math.round(vendorStats.avgCompliance)}%`, sub: `${vendorStats.needsW9} W9 follow-up`, icon: ShieldCheck, color: vendorStats.avgCompliance >= 82 ? '#10b981' : '#f59e0b' },
    { label: 'Tax Readiness', value: String(enriched.filter((v: any) => v.requires_1099).length), sub: '1099 eligible profiles', icon: ClipboardCheck, color: '#2563eb' },
  ];

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
    await upsert.mutateAsync({ ...form, legal_name: form.legal_name || form.name });
    toast.success('Vendor saved');
    setOpen(false); setForm(blank); setVendorStep(1);
  };

  const openEdit = (v: any) => {
    setForm({
      ...blank,
      ...v,
      name: v.name || '',
      legal_name: v.legal_name || v.name || '',
      contact_email: v.contact_email || '',
      contact_phone: v.contact_phone || '',
      address: v.address || '',
      notes: v.notes || '',
      ein: v.ein || '',
      w9_on_file: Boolean(v.w9_on_file),
      requires_1099: Boolean(v.requires_1099),
      lien_waiver_required: Boolean(v.lien_waiver_required),
      is_subcontractor: Boolean(v.is_subcontractor),
    });
    setVendorStep(1);
    setOpen(true);
  };

  return (
    <AppShell>
      <style>{VND_CSS}</style>
      <PageHeader eyebrow="Counterparties" title={vendorsHeader.title} description={vendorsHeader.description}
        actions={
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2">
              <Button variant="outline" size="icon" className="rounded-none h-9 w-9" onClick={export1099} title="Export 1099 Summary"><FileSpreadsheet className="w-4 h-4" /></Button>
              <Button variant="outline" size="icon" className="rounded-none h-9 w-9" onClick={exportCSV}><Download className="w-4 h-4" /></Button>
            </div>
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setForm(blank); setVendorStep(1); } }}>
              <DialogTrigger asChild><Button className="rounded-none"><Plus className="w-3.5 h-3.5 mr-1.5" />New Vendor</Button></DialogTrigger>
              <DialogContent className="rounded-none sm:max-w-2xl w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto p-0">
                <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
                  <DialogTitle className="text-base">{form.id ? 'Edit Vendor Profile' : 'Guided Vendor Profile'}</DialogTitle>
                  <p className="text-xs text-muted-foreground">Collect identity, contact, tax, insurance, and payment controls in one clean flow.</p>
                </DialogHeader>
                <form onSubmit={submit} className="p-5 space-y-4">
                  <div className="grid grid-cols-4 gap-1.5">
                    {['Identity', 'Contact', 'Compliance', 'Operations'].map((label, idx) => (
                      <button key={label} type="button" className="vnd-step" data-active={vendorStep === idx + 1} onClick={() => setVendorStep(idx + 1)}>
                        {idx + 1}. {label}
                      </button>
                    ))}
                  </div>

                  {vendorStep === 1 && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5"><Label className="micro-label">Display Name *</Label><Input className="rounded-none h-10" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value, legal_name: form.legal_name || e.target.value })} /></div>
                        <div className="space-y-1.5"><Label className="micro-label">Legal Name</Label><Input className="rounded-none h-10" value={form.legal_name} onChange={e => setForm({ ...form, legal_name: e.target.value })} /></div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5"><Label className="micro-label">DBA / Trade Name</Label><Input className="rounded-none h-10" value={form.dba} onChange={e => setForm({ ...form, dba: e.target.value })} /></div>
                        <div className="space-y-1.5"><Label className="micro-label">Default Expense Category</Label><Input className="rounded-none h-10" placeholder="Subcontractor, Materials, Equipment..." value={form.default_expense_category} onChange={e => setForm({ ...form, default_expense_category: e.target.value })} /></div>
                      </div>
                      <label className="flex items-center gap-3 border border-border p-3 cursor-pointer">
                        <input type="checkbox" checked={form.is_subcontractor} onChange={e => setForm({ ...form, is_subcontractor: e.target.checked })} className="w-4 h-4 accent-foreground" />
                        <span className="text-sm font-medium">This vendor is a subcontractor</span>
                      </label>
                    </div>
                  )}

                  {vendorStep === 2 && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="micro-label">Email</Label>
                          <EmailInput value={form.contact_email} onChange={v => setForm({ ...form, contact_email: v })} inputClassName="rounded-none h-10 w-full border border-input bg-background text-sm outline-none" focusBorderColor="hsl(var(--ring))" defaultBorderColor="hsl(var(--border))" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="micro-label">Phone</Label>
                          <PhoneInput value={form.contact_phone} onChange={v => setForm({ ...form, contact_phone: v })} inputClassName="rounded-none h-10 w-full border border-input bg-background text-sm outline-none" focusBorderColor="hsl(var(--ring))" defaultBorderColor="hsl(var(--border))" />
                        </div>
                      </div>
                      <div className="space-y-1.5"><Label className="micro-label">Business Address</Label><LocationAutocomplete value={form.address} onChange={v => setForm({ ...form, address: v })} placeholder="Street, City, State ZIP" inputClassName="rounded-none h-10 w-full border border-input bg-background text-sm outline-none" focusBorderColor="hsl(var(--ring))" defaultBorderColor="hsl(var(--border))" /></div>
                      <div className="space-y-1.5"><Label className="micro-label">Remittance Address</Label><LocationAutocomplete value={form.remittance_address} onChange={v => setForm({ ...form, remittance_address: v })} placeholder="Leave blank if same as business address" inputClassName="rounded-none h-10 w-full border border-input bg-background text-sm outline-none" focusBorderColor="hsl(var(--ring))" defaultBorderColor="hsl(var(--border))" /></div>
                    </div>
                  )}

                  {vendorStep === 3 && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5"><Label className="micro-label">EIN / Tax ID</Label><Input className="rounded-none h-10 font-mono-tab" placeholder="XX-XXXXXXX" value={form.ein} onChange={e => setForm({ ...form, ein: e.target.value })} /></div>
                        <div className="space-y-1.5"><Label className="micro-label">Tax ID Status</Label><Input className="rounded-none h-10" placeholder="Verified, Pending, Missing..." value={form.tax_id_status} onChange={e => setForm({ ...form, tax_id_status: e.target.value })} /></div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5"><Label className="micro-label">License Number</Label><Input className="rounded-none h-10" value={form.license_number} onChange={e => setForm({ ...form, license_number: e.target.value })} /></div>
                        <div className="space-y-1.5"><Label className="micro-label">Insurance Expiration</Label><Input type="date" className="rounded-none h-10" value={form.insurance_expiration} onChange={e => setForm({ ...form, insurance_expiration: e.target.value })} /></div>
                      </div>
                      <div className="border border-border p-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {[
                          { key: 'w9_on_file', label: 'W9 on file' },
                          { key: 'requires_1099', label: 'Requires 1099' },
                          { key: 'lien_waiver_required', label: 'Lien waiver required' },
                        ].map(({ key, label }) => (
                          <label key={key} className="flex items-center gap-2 cursor-pointer text-sm">
                            <input type="checkbox" checked={(form as any)[key]} onChange={e => setForm({ ...form, [key]: e.target.checked })} className="accent-foreground w-4 h-4" />
                            {label}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {vendorStep === 4 && (
                    <div className="space-y-4">
                      <div className="space-y-1.5"><Label className="micro-label">Payment Terms</Label><Input className="rounded-none h-10" placeholder="Due on receipt, Net 30, milestone-based..." value={form.payment_terms} onChange={e => setForm({ ...form, payment_terms: e.target.value })} /></div>
                      <div className="space-y-1.5"><Label className="micro-label">Internal Notes</Label><Textarea className="rounded-none" rows={4} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-3 border-t border-border">
                    <Button type="button" variant="outline" className="rounded-none h-10 flex-1" disabled={vendorStep === 1} onClick={() => setVendorStep(s => Math.max(1, s - 1))}>Back</Button>
                    {vendorStep < 4 ? (
                      <Button type="button" className="rounded-none h-10 flex-1 bg-foreground text-background" onClick={() => setVendorStep(s => Math.min(4, s + 1))}>Next</Button>
                    ) : (
                      <Button type="submit" className="rounded-none h-10 flex-1 bg-foreground text-background">Save Vendor</Button>
                    )}
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        } />

      {/* Mobile export bar */}
      <div className="sm:hidden px-4 py-3 border-b border-border">
        <Button variant="outline" size="sm" className="rounded-none text-xs w-full" onClick={exportCSV}><Download className="w-3.5 h-3.5 mr-1.5" />Export CSV</Button>
      </div>

      <div className="vnd-shell border-t border-border/50">
      <div className="px-4 sm:px-8 py-4 border-b border-border/60">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-3">
          <div>
            <div className="text-[9px] uppercase tracking-[0.24em] font-black text-foreground/55">Vendor Intelligence</div>
            <div className="text-sm font-semibold tracking-tight mt-0.5">Compliance, payment exposure, and subcontractor readiness.</div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {vendorCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="vnd-intel-card min-w-0">
                <span className="absolute inset-x-0 bottom-0 h-[2px]" style={{ backgroundColor: card.color }} />
                <div className="relative p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-[8px] uppercase tracking-[0.18em] font-bold text-foreground/60 mb-1">
                        <Icon className="w-3 h-3" /> {card.label}
                      </div>
                      <div className="text-lg font-bold font-mono-tab leading-tight truncate" style={{ color: card.color }}>{card.value}</div>
                      <div className="text-[9px] text-foreground/60 mt-1 truncate">{card.sub}</div>
                    </div>
                    <span className="w-9 h-9 border border-border bg-secondary/35 flex items-center justify-center shrink-0" style={{ color: card.color }}>
                      <Icon className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-4 sm:px-8 py-4 border-b border-border">
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search vendors…" value={q} onChange={e => setQ(e.target.value)} className="rounded-none h-10 w-full pl-8" />
        </div>
      </div>

      <div className="px-4 sm:px-8 py-6">
        {/* Mobile card view */}
        <div className="sm:hidden space-y-3">
          {enriched.length === 0 ? <div className="py-16 text-center text-sm text-muted-foreground">No vendors registered.</div> :
            enriched.map((v: any) => (
              <div key={v.id} className="vnd-card p-3 space-y-2 cursor-pointer" onClick={() => setDetailRow(v)}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{v.name}</span>
                  <span className="text-sm font-semibold font-mono-tab">{fmtUSD(v.totalPaid)}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {v.is_subcontractor && <span className="vnd-chip">Subcontractor</span>}
                  {v.requires_1099 && <span className="vnd-chip">1099</span>}
                  {v.needsW9 && <span className="vnd-chip text-warning border-warning/30 bg-warning/10">W9 Needed</span>}
                  {v.insuranceExpired && <span className="vnd-chip text-destructive border-destructive/30 bg-destructive/10">Insurance</span>}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <span>{v.contact_email || '—'}</span>
                  <span className="text-right">{v.contact_phone || '—'}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/60 pt-2">
                  <span>{v.txnCount} transactions</span>
                  <span>Compliance {Math.round(v.complianceScore)}%</span>
                </div>
                <div className="flex justify-end gap-2 pt-1" onClick={e => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="rounded-none h-7 text-xs" onClick={() => openEdit(v)}>Edit</Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="rounded-none h-7 w-7 text-muted-foreground hover:text-accent"><Trash2 className="w-3.5 h-3.5" /></Button></AlertDialogTrigger>
                    <AlertDialogContent className="rounded-none w-[calc(100%-2rem)]">
                      <AlertDialogHeader><AlertDialogTitle>Remove vendor?</AlertDialogTitle><AlertDialogDescription>Linked transactions will retain their amounts but lose vendor reference.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter className="flex-col sm:flex-row gap-2"><AlertDialogCancel className="rounded-none w-full sm:w-auto">Cancel</AlertDialogCancel><AlertDialogAction className="rounded-none bg-destructive text-destructive-foreground w-full sm:w-auto" onClick={() => del.mutate(v.id)}>Confirm</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block vnd-panel">
          <div className="grid grid-cols-12 gap-4 px-4 py-2.5 border-b border-border bg-secondary/40 text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
            <div className="col-span-3">Vendor</div><div className="col-span-2">Email</div><div className="col-span-1">Phone</div><div className="col-span-2">Compliance</div><div className="col-span-1 text-right">Txns</div><div className="col-span-2 text-right">Total Paid</div><div className="col-span-1 text-right">—</div>
          </div>
          {enriched.length === 0 ? <div className="px-4 py-16 text-center text-sm text-muted-foreground">No vendors registered.</div> :
            enriched.map((v: any) => (
              <div key={v.id} className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-border last:border-b-0 text-sm font-mono-tab vnd-row items-center cursor-pointer" onClick={() => setDetailRow(v)}>
                <div className="col-span-3 font-medium min-w-0">
                  <div className="truncate">{v.name}</div>
                  <div className="text-[9px] text-muted-foreground truncate">{v.legal_name || v.dba || v.default_expense_category || 'Vendor profile'}</div>
                </div>
                <div className="col-span-2 text-muted-foreground truncate">{v.contact_email || '—'}</div>
                <div className="col-span-1 text-muted-foreground truncate">{v.contact_phone || '—'}</div>
                <div className="col-span-2 flex flex-wrap gap-1">
                  {v.is_subcontractor && (
                    <span className="text-[7px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-secondary text-foreground/70 border border-border">Sub</span>
                  )}
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
                  <Button variant="ghost" size="sm" className="h-7 rounded-none text-xs" onClick={() => openEdit(v)}>Edit</Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 rounded-none text-muted-foreground hover:text-accent"><Trash2 className="w-3.5 h-3.5" /></Button></AlertDialogTrigger>
                    <AlertDialogContent className="rounded-none">
                      <AlertDialogHeader><AlertDialogTitle>Remove vendor?</AlertDialogTitle><AlertDialogDescription>Linked transactions will retain their amounts but lose vendor reference.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel className="rounded-none">Cancel</AlertDialogCancel><AlertDialogAction className="rounded-none bg-destructive text-destructive-foreground" onClick={() => del.mutate(v.id)}>Confirm</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
        </div>
      </div>
      </div>
      <FinanceDetailDrawer open={!!detailRow} onClose={() => setDetailRow(null)} kind="vendor" data={detailRow} />
    </AppShell>
  );
}
