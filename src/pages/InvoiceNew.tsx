import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { DateInput } from '@/components/ui/date-input';
import LocationAutocomplete from '@/components/ui/smart/LocationAutocomplete';
import EmailInput from '@/components/ui/smart/EmailInput';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useInvoices, invoiceSubtotal, invoiceTax, invoiceTotal, nextInvoiceNumber, LineItem, Invoice } from '@/hooks/useInvoices';
import { fmtUSD, fmtDate, todayLocalDate } from '@/lib/format';
import { generateInvoicePDF, savePDF } from '@/lib/invoicePDF';
import { toast } from 'sonner';
import { Plus, Trash2, Download, ExternalLink, Send, FileText, Copy, CheckCheck, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useEntity } from '@/contexts/EntityContext';
import { useHgpJobs } from '@/hooks/useEntityOps';
import { useFinanceClientAccounts } from '@/hooks/useFinance';


function newLineItem(): LineItem {
  return { id: crypto.randomUUID(), description: '', qty: 1, rate: 0 };
}

function detectProvider(url: string) {
  const u = url.toLowerCase();
  if (u.includes('stripe.com') || u.includes('stripe')) return 'stripe';
  if (u.includes('quickbooks') || u.includes('intuit.com')) return 'quickbooks';
  if (u.includes('square') || u.includes('squareup.com')) return 'square';
  return 'other';
}

function providerLabel(provider?: string) {
  switch (provider) {
    case 'stripe': return 'Stripe';
    case 'quickbooks': return 'QuickBooks';
    case 'square': return 'Square';
    case 'other': return 'Other';
    default: return 'External';
  }
}

function normalizeHttpsUrl(raw?: string) {
  const value = (raw ?? '').trim();
  if (!value) return '';
  if (/^https:\/\//i.test(value)) return value;
  if (/^http:\/\//i.test(value)) return value.replace(/^http:\/\//i, 'https://');
  return `https://${value}`;
}

export default function InvoiceNew() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { state: routeState } = useLocation();
  const { invoices, create, update } = useInvoices();
  const { entity } = useEntity();
  const isHgp = entity?.id === 'houston-generator-pros';
  const { data: hgpJobs = [] } = useHgpJobs();
  const { data: financeClients = [] } = useFinanceClientAccounts();

  const existing = id ? invoices.find(inv => inv.id === id) : undefined;

  const today = todayLocalDate();
  const due30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);

  const [form, setForm] = useState<Omit<Invoice, 'id' | 'created_at' | 'updated_at'>>(() => existing ?? {
    invoice_number: nextInvoiceNumber(invoices),
    status: 'draft',
    client_name: '',
    client_email: '',
    client_company: '',
    client_address: '',
    issue_date: today,
    due_date: due30,
    line_items: [newLineItem()],
    tax_rate: 0,
    notes: '',
    terms: 'Net 30 — Payment is due within 30 days of invoice date.',
    stripe_payment_link: existing?.stripe_payment_link,
    external_invoice_url: existing?.external_invoice_url,
    external_invoice_provider: existing?.external_invoice_provider,
    external_invoice_number: existing?.external_invoice_number,
    external_invoice_label: existing?.external_invoice_label,
    hgp_job_id: existing?.hgp_job_id,
    finance_client_id: existing?.finance_client_id,
  });

  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Pre-fill from Admin "Create Invoice" deep-link (route state)
  useEffect(() => {
    if (!routeState) return;
    const { clientName, clientEmail } = routeState as Record<string, string>;
    if (clientName) setField('client_name', clientName);
    if (clientEmail) setField('client_email', clientEmail);
  }, []);

  const applyFinanceClient = (clientId: string) => {
    const client = (financeClients as any[]).find(c => c.id === clientId);
    setField('finance_client_id', clientId || undefined);
    if (!client) return;
    setForm(f => ({
      ...f,
      finance_client_id: client.id,
      client_name: client.name || f.client_name,
      client_email: client.email || f.client_email,
      client_company: client.company || f.client_company,
      client_address: client.billing_address || client.site_address || f.client_address,
    }));
    toast.success(`Invoice linked to ${client.name}`);
  };

  const setField = <K extends keyof typeof form>(k: K, v: typeof form[K]) => setForm(f => ({ ...f, [k]: v }));

  const setLineItem = (idx: number, patch: Partial<LineItem>) => {
    setForm(f => {
      const items = [...f.line_items];
      items[idx] = { ...items[idx], ...patch };
      return { ...f, line_items: items };
    });
  };

  const addLine = () => setForm(f => ({ ...f, line_items: [...f.line_items, newLineItem()] }));
  const removeLine = (idx: number) => setForm(f => ({ ...f, line_items: f.line_items.filter((_, i) => i !== idx) }));

  const subtotal = invoiceSubtotal(form);
  const tax = invoiceTax(form);
  const total = invoiceTotal(form);
  const paymentUrl = form.external_invoice_url || form.stripe_payment_link;

  const applyHgpJob = (jobId: string) => {
    const job = (hgpJobs as any[]).find(j => j.id === jobId);
    setField('hgp_job_id', jobId || undefined);
    if (!job) return;
    setForm(f => ({
      ...f,
      hgp_job_id: job.id,
      client_name: job.customer_name ?? f.client_name,
      client_email: job.customer_email ?? f.client_email,
      client_company: f.client_company || 'Houston Generator Pros Customer',
      client_address: [job.site_address, job.city, job.zip].filter(Boolean).join(', ') || f.client_address,
      line_items: [{
        id: crypto.randomUUID(),
        description: `${job.generator_model || 'Generator'} ${String(job.job_type || 'install').replace(/_/g, ' ')}${job.serial_number ? ` · SN ${job.serial_number}` : ''}`,
        qty: 1,
        rate: Number(job.quoted_amount || 0),
      }],
      notes: f.notes || [
        job.utility_provider ? `Utility provider: ${job.utility_provider}` : null,
        job.target_install_date ? `Target install: ${fmtDate(job.target_install_date)}` : null,
      ].filter(Boolean).join('\n'),
    }));
    toast.success(`Invoice linked to ${job.customer_name}'s HGP job`);
  };

  const handleSave = async () => {
    if (!form.client_name) { toast.error('Client name is required'); return; }
    if (form.line_items.length === 0) { toast.error('Add at least one line item'); return; }
    const normalizedExternalUrl = normalizeHttpsUrl(form.external_invoice_url);
    if (normalizedExternalUrl && !/^https:\/\//i.test(normalizedExternalUrl)) {
      toast.error('External invoice/payment links must use HTTPS');
      return;
    }
    const payload = {
      ...form,
      external_invoice_url: normalizedExternalUrl || undefined,
      external_invoice_provider: normalizedExternalUrl ? (form.external_invoice_provider || detectProvider(normalizedExternalUrl)) : undefined,
      external_invoice_label: normalizedExternalUrl
        ? (form.external_invoice_label || `${providerLabel(form.external_invoice_provider || detectProvider(normalizedExternalUrl))} invoice/payment link`)
        : undefined,
      stripe_payment_link: form.stripe_payment_link || (form.external_invoice_provider === 'stripe' ? normalizedExternalUrl : undefined),
    };
    setSaving(true);
    try {
      if (existing) {
        await update(existing.id, payload);
        toast.success('Invoice updated');
      } else {
        await create(payload);
        toast.success('Invoice saved');
        navigate('/invoices');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save invoice');
    } finally { setSaving(false); }
  };

  const handlePDF = () => {
    const inv = existing ? { ...existing, ...form } : { ...form, id: 'preview', created_at: today, updated_at: today };
    const doc = generateInvoicePDF(inv as Invoice);
    savePDF(doc, `${form.invoice_number}.pdf`);
    toast.success('Invoice PDF downloaded');
  };

  const handleQBO = () => {
    const lines = form.line_items.map(l => [
      form.invoice_number, form.client_name, form.client_company, form.issue_date, form.due_date,
      l.description, l.qty, l.rate.toFixed(2), lineItemTotal(l).toFixed(2),
      subtotal.toFixed(2), tax.toFixed(2), total.toFixed(2), form.notes,
    ].join(','));
    const header = 'InvoiceNo,CustomerName,Company,Date,DueDate,Description,Qty,Rate,LineAmount,Subtotal,Tax,Total,Memo';
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${form.invoice_number}-quickbooks.csv`;
    a.click();
    toast.success('QuickBooks CSV downloaded — import via Sales → Invoices → Import');
  };

  const handleSquare = () => {
    const lines = form.line_items.map(l => [
      form.client_name, form.client_email, form.invoice_number,
      form.issue_date, form.due_date, l.description,
      l.qty, l.rate.toFixed(2), (l.qty * l.rate).toFixed(2),
    ].join(','));
    const header = 'Customer Name,Email,Invoice Number,Invoice Date,Due Date,Item Description,Quantity,Unit Price,Line Total';
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${form.invoice_number}-square.csv`;
    a.click();
    toast.success('Square CSV downloaded — import via Invoices → Import');
  };

  const handleStripe = async () => {
    if (total <= 0) { toast.error('Invoice total must be greater than $0'); return; }
    setStripeLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-payment-link', {
        body: {
          amount_cents: Math.round(total * 100),
          invoice_number: form.invoice_number,
          client_name: form.client_name,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setField('stripe_payment_link', data.url);
      setField('external_invoice_url', data.url);
      setField('external_invoice_provider', 'stripe');
      setField('external_invoice_label', 'Stripe payment link');
      if (existing) await update(existing.id, {
        stripe_payment_link: data.url,
        external_invoice_url: data.url,
        external_invoice_provider: 'stripe',
        external_invoice_label: 'Stripe payment link',
      });
      toast.success('Stripe payment link created!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create payment link — deploy the edge function first');
    } finally { setStripeLoading(false); }
  };

  const copyStripeLink = () => {
    if (!paymentUrl) return;
    navigator.clipboard.writeText(paymentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Payment link copied');
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow={existing ? `Edit · ${existing.invoice_number}` : 'New Invoice'}
        title={existing ? existing.invoice_number : 'Create Invoice'}
        description="Build a professional invoice and export or send in one click."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/invoices')} className="rounded-none h-9 text-xs">← Invoices</Button>
            <Button onClick={handleSave} disabled={saving} className="rounded-none h-9 text-xs bg-foreground text-background hover:opacity-90">
              {saving ? 'Saving…' : existing ? 'Save Changes' : 'Save Invoice'}
            </Button>
          </div>
        }
      />

      <div className="px-4 sm:px-8 py-6 grid grid-cols-1 xl:grid-cols-[1fr_440px] gap-8 max-w-[1400px]">
        {/* ── LEFT: Form ── */}
        <div className="space-y-6">
          {/* Header row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="micro-label">Invoice Number</Label>
              <Input value={form.invoice_number} onChange={e => setField('invoice_number', e.target.value)} className="rounded-none h-10 font-mono-tab font-semibold" />
            </div>
            <div className="space-y-1.5">
              <Label className="micro-label">Issue Date</Label>
              <DateInput value={form.issue_date} onChange={e => setField('issue_date', e.target.value)} className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="micro-label">Due Date</Label>
              <DateInput value={form.due_date} onChange={e => setField('due_date', e.target.value)} className="h-10" />
            </div>
          </div>

          {/* Status */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="micro-label">Status</Label>
              <Select value={form.status} onValueChange={v => setField('status', v as Invoice['status'])}>
                <SelectTrigger className="rounded-none h-10 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isHgp && (
            <div className="border border-border p-4 space-y-3 bg-secondary/15">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="micro-label">Houston Generator Pros Job Link</div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    Build a customer-facing invoice or receipt directly from an install, service, maintenance, or emergency job.
                  </div>
                </div>
                <Zap className="w-4 h-4 text-muted-foreground shrink-0" />
              </div>
              <Select value={form.hgp_job_id || '__none__'} onValueChange={v => v === '__none__' ? setField('hgp_job_id', undefined) : applyHgpJob(v)}>
                <SelectTrigger className="rounded-none h-10 text-sm"><SelectValue placeholder="Select HGP job…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No job link</SelectItem>
                  {(hgpJobs as any[]).map(job => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.customer_name} · {String(job.job_type).replace(/_/g, ' ')}
                      {job.generator_model ? ` · ${job.generator_model}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Client info */}
          <div className="border border-border p-4 space-y-4">
            <div className="micro-label">Bill To</div>
            <div className="space-y-1.5">
              <Label className="micro-label">Finance Client Account</Label>
              <Select value={form.finance_client_id || ''} onValueChange={applyFinanceClient}>
                <SelectTrigger className="rounded-none h-10">
                  <SelectValue placeholder={isHgp ? 'Select HGP client account' : 'Select construction client account'} />
                </SelectTrigger>
                <SelectContent>
                  {(financeClients as any[]).map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {[c.name, c.company, c.projects?.name].filter(Boolean).join(' · ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="micro-label">Client Name *</Label>
                <Input value={form.client_name} onChange={e => setField('client_name', e.target.value)} placeholder="John Smith" className="rounded-none h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="micro-label">Company</Label>
                <Input value={form.client_company} onChange={e => setField('client_company', e.target.value)} placeholder="Acme Corp" className="rounded-none h-10" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="micro-label">Email</Label>
                <EmailInput
                  value={form.client_email}
                  onChange={v => setField('client_email', v)}
                  placeholder="client@email.com"
                  inputClassName="rounded-none h-10 w-full border border-input bg-background text-sm outline-none focus:ring-0"
                  inputStyle={{ paddingRight: undefined }}
                  focusBorderColor="hsl(var(--ring))"
                  defaultBorderColor="hsl(var(--border))"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="micro-label">Address</Label>
                <LocationAutocomplete
                  value={form.client_address}
                  onChange={v => setField('client_address', v)}
                  placeholder="123 Main St, City, ST 00000"
                  inputClassName="rounded-none h-10 w-full border border-input bg-background text-sm outline-none"
                  focusBorderColor="hsl(var(--ring))"
                  defaultBorderColor="hsl(var(--border))"
                />
              </div>
            </div>
          </div>

          {/* Line items */}
          <div className="border border-border">
            <div className="grid grid-cols-[1fr_80px_110px_36px] gap-3 px-4 py-2.5 border-b border-border bg-secondary/40 text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
              <div>Description</div><div className="text-center">Qty</div><div className="text-right">Rate</div><div />
            </div>
            <div className="divide-y divide-border">
              {form.line_items.map((item, idx) => (
                <div key={item.id} className="grid grid-cols-[1fr_80px_110px_36px] gap-3 px-4 py-2.5 items-center">
                  <Input
                    value={item.description}
                    onChange={e => setLineItem(idx, { description: e.target.value })}
                    placeholder="Service or item description"
                    className="rounded-none h-9 text-sm border-0 shadow-none px-0 focus-visible:ring-0 bg-transparent"
                  />
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={item.qty === 0 ? '' : String(item.qty)}
                    onChange={e => {
                      const v = parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0;
                      setLineItem(idx, { qty: v });
                    }}
                    className="rounded-none h-9 text-sm text-center border-0 shadow-none px-0 focus-visible:ring-0 bg-transparent"
                  />
                  <CurrencyInput value={item.rate} onValueChange={() => undefined} onNumberChange={v => setLineItem(idx, { rate: v })} className="h-9 text-sm" />
                  <button
                    onClick={() => removeLine(idx)}
                    className="text-muted-foreground/40 hover:text-accent transition-colors flex items-center justify-center"
                    disabled={form.line_items.length === 1}
                  >
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </button>
                </div>
              ))}
            </div>
            <div className="px-4 py-2.5 border-t border-border border-dashed">
              <button onClick={addLine} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add Line Item
              </button>
            </div>
          </div>

          {/* Totals + Tax */}
          <div className="flex justify-end">
            <div className="w-full sm:w-72 space-y-2 border border-border p-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono-tab">{fmtUSD(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Tax</span>
                  <div className="relative w-20">
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={form.tax_rate === 0 ? '' : String(form.tax_rate)}
                      onChange={e => {
                        const v = parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0;
                        setField('tax_rate', Math.min(v, 100));
                      }}
                      placeholder="0"
                      className="rounded-none h-7 text-xs pr-5 font-mono-tab"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">%</span>
                  </div>
                </div>
                <span className="font-mono-tab text-sm">{fmtUSD(tax)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold border-t border-border pt-2 font-mono-tab">
                <span>Total</span>
                <span>{fmtUSD(total)}</span>
              </div>
            </div>
          </div>

          {/* Notes + Terms */}
          <div className="border border-border p-4 space-y-4 bg-secondary/10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="micro-label">External Invoice / Payment Link</div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  Paste a Stripe, QuickBooks, Square, or secure external invoice URL. The downloaded PDF embeds it as a clickable link.
                </div>
              </div>
              {paymentUrl && (
                <a href={paymentUrl} target="_blank" rel="noreferrer" className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                  Open <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[150px_1fr] gap-4">
              <div className="space-y-1.5">
                <Label className="micro-label">Provider</Label>
                <Select value={form.external_invoice_provider || 'other'} onValueChange={v => setField('external_invoice_provider', v)}>
                  <SelectTrigger className="rounded-none h-10 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stripe">Stripe</SelectItem>
                    <SelectItem value="quickbooks">QuickBooks</SelectItem>
                    <SelectItem value="square">Square</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="micro-label">Secure URL</Label>
                <Input
                  value={form.external_invoice_url || ''}
                  onChange={e => {
                    const raw = e.target.value;
                    setField('external_invoice_url', raw);
                    if (raw && (!form.external_invoice_provider || form.external_invoice_provider === 'other')) {
                      setField('external_invoice_provider', detectProvider(raw));
                    }
                  }}
                  onBlur={e => setField('external_invoice_url', normalizeHttpsUrl(e.target.value) || undefined)}
                  placeholder="https://invoice.stripe.com/..."
                  className="rounded-none h-10"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="micro-label">Link Label</Label>
                <Input
                  value={form.external_invoice_label || ''}
                  onChange={e => setField('external_invoice_label', e.target.value)}
                  placeholder="Stripe payment link, QuickBooks invoice #1042…"
                  className="rounded-none h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="micro-label">External Invoice #</Label>
                <Input
                  value={form.external_invoice_number || ''}
                  onChange={e => setField('external_invoice_number', e.target.value)}
                  placeholder="QB-1042, SQ-88, payment request ID…"
                  className="rounded-none h-10"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="micro-label">Notes</Label>
              <Textarea value={form.notes} onChange={e => setField('notes', e.target.value)} placeholder="Thank you for your business." className="rounded-none text-sm" rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label className="micro-label">Payment Terms</Label>
              <Textarea value={form.terms} onChange={e => setField('terms', e.target.value)} className="rounded-none text-sm" rows={3} />
            </div>
          </div>
        </div>

        {/* ── RIGHT: Export + Integrations Panel ── */}
        <div className="space-y-4">
          {/* Live totals preview */}
          <div className="border border-border p-4 bg-secondary/20">
            <div className="micro-label mb-3">Invoice Summary</div>
            <div className="text-2xl font-bold font-mono-tab mb-1">{fmtUSD(total)}</div>
            <div className="text-xs text-muted-foreground">Due {fmtDate(form.due_date)} · {form.line_items.length} line item{form.line_items.length !== 1 ? 's' : ''}</div>
            {form.client_name && (
              <div className="mt-2 text-xs">
                <span className="text-muted-foreground">To: </span>
                <span className="font-medium">{form.client_name}</span>
                {form.client_company && <span className="text-muted-foreground"> · {form.client_company}</span>}
              </div>
            )}
          </div>

          {/* Export section */}
          <div className="border border-border p-4 space-y-3">
            <div className="micro-label">Export & Download</div>
            <button onClick={handlePDF} className="w-full flex items-center gap-3 p-3 border border-border hover:border-foreground/30 hover:bg-secondary/30 transition-all text-left">
              <div className="w-8 h-8 bg-secondary flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <div>
                <div className="text-xs font-semibold">PDF Invoice</div>
                <div className="text-[10px] text-muted-foreground">Professional branded invoice</div>
              </div>
              <Download className="w-3.5 h-3.5 text-muted-foreground ml-auto" strokeWidth={1.5} />
            </button>
          </div>

          {/* Integrations */}
          <div className="border border-border p-4 space-y-3">
            <div className="micro-label">Send via Integration</div>
            <div className="text-[10px] text-muted-foreground leading-relaxed">One-click export to your platform. Configure API keys in Settings → Integrations.</div>

            {/* Stripe */}
            <div className="border border-border p-3 space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-[#635BFF] flex items-center justify-center shrink-0">
                  <span className="text-white text-[10px] font-bold">S</span>
                </div>
                <div className="flex-1">
                  <div className="text-xs font-semibold">Stripe</div>
                  <div className="text-[10px] text-muted-foreground">Create a payment link</div>
                </div>
              </div>
              {paymentUrl ? (
                <div className="space-y-1.5">
                  <div className="text-[10px] text-positive font-medium">✓ Payment link ready</div>
                  <div className="flex gap-1.5">
                    <button onClick={copyStripeLink} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 border border-border hover:bg-secondary/50 transition-colors text-[10px] text-muted-foreground hover:text-foreground">
                      {copied ? <CheckCheck className="w-3 h-3 text-positive" /> : <Copy className="w-3 h-3" />}
                      {copied ? 'Copied!' : 'Copy Link'}
                    </button>
                    <a href={paymentUrl} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-1.5 py-1.5 border border-border hover:bg-secondary/50 transition-colors text-[10px] text-muted-foreground hover:text-foreground">
                      <ExternalLink className="w-3 h-3" /> Open
                    </a>
                  </div>
                  <button onClick={handleStripe} disabled={stripeLoading} className="w-full text-[10px] text-muted-foreground hover:text-foreground transition-colors py-1">
                    {stripeLoading ? 'Regenerating…' : '↺ Regenerate link'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleStripe}
                  disabled={stripeLoading}
                  className="w-full flex items-center justify-center gap-2 py-2 border border-[#635BFF]/30 bg-[#635BFF]/5 hover:bg-[#635BFF]/10 transition-colors text-[10px] text-[#635BFF] font-medium disabled:opacity-50"
                >
                  <Zap className="w-3 h-3" />
                  {stripeLoading ? 'Creating payment link…' : 'Create Stripe Payment Link'}
                </button>
              )}
            </div>

            {/* QuickBooks */}
            <button
              onClick={handleQBO}
              className="w-full flex items-center gap-3 p-3 border border-border hover:border-foreground/30 hover:bg-secondary/30 transition-all text-left"
            >
              <div className="w-7 h-7 bg-[#2CA01C] flex items-center justify-center shrink-0">
                <span className="text-white text-[9px] font-bold">QB</span>
              </div>
              <div className="flex-1">
                <div className="text-xs font-semibold">QuickBooks</div>
                <div className="text-[10px] text-muted-foreground">Export CSV for QBO import</div>
              </div>
              <Download className="w-3.5 h-3.5 text-muted-foreground shrink-0" strokeWidth={1.5} />
            </button>

            {/* Square */}
            <button
              onClick={handleSquare}
              className="w-full flex items-center gap-3 p-3 border border-border hover:border-foreground/30 hover:bg-secondary/30 transition-all text-left"
            >
              <div className="w-7 h-7 bg-[#3E4348] flex items-center justify-center shrink-0">
                <span className="text-white text-[10px] font-bold">■</span>
              </div>
              <div className="flex-1">
                <div className="text-xs font-semibold">Square</div>
                <div className="text-[10px] text-muted-foreground">Export CSV for Square import</div>
              </div>
              <Download className="w-3.5 h-3.5 text-muted-foreground shrink-0" strokeWidth={1.5} />
            </button>

            {/* Generic JSON */}
            <button
              onClick={() => {
                const data = { ...form, subtotal, tax, total };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `${form.invoice_number}.json`;
                a.click();
                toast.success('JSON exported — paste into any system');
              }}
              className="w-full flex items-center gap-3 p-3 border border-border hover:border-foreground/30 hover:bg-secondary/30 transition-all text-left"
            >
              <div className="w-7 h-7 bg-secondary flex items-center justify-center shrink-0 text-muted-foreground text-[9px] font-bold">{ }</div>
              <div className="flex-1">
                <div className="text-xs font-semibold">Generic JSON / API</div>
                <div className="text-[10px] text-muted-foreground">Structured data for any system</div>
              </div>
              <Download className="w-3.5 h-3.5 text-muted-foreground shrink-0" strokeWidth={1.5} />
            </button>
          </div>

          {/* Mini invoice preview */}
          <div className="border border-border p-4 space-y-3 bg-background">
            <div className="micro-label">Preview</div>
            <div className="border border-dashed border-border p-4 space-y-3 text-xs font-mono-tab">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[10px] font-bold tracking-[0.15em] uppercase">HOU INC</div>
                  <div className="text-[9px] text-muted-foreground">Private Bookkeeping System</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-sm">{form.invoice_number}</div>
                  <div className="text-[9px] text-muted-foreground">Issued {form.issue_date}</div>
                </div>
              </div>
              <div className="h-px bg-border" />
              {form.client_name ? (
                <div>
                  <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Bill To</div>
                  <div className="font-medium text-[11px]">{form.client_name}</div>
                  {form.client_company && <div className="text-[9px] text-muted-foreground">{form.client_company}</div>}
                  {form.client_email && <div className="text-[9px] text-muted-foreground">{form.client_email}</div>}
                </div>
              ) : (
                <div className="text-[9px] text-muted-foreground italic">Client info will appear here</div>
              )}
              <div className="h-px bg-border" />
              <div className="space-y-1">
                {form.line_items.filter(l => l.description).map(l => (
                  <div key={l.id} className="flex justify-between text-[10px]">
                    <span className="truncate mr-2">{l.description}</span>
                    <span className="shrink-0">{fmtUSD(l.qty * l.rate)}</span>
                  </div>
                ))}
                {form.line_items.every(l => !l.description) && (
                  <div className="text-[9px] text-muted-foreground italic">Line items will appear here</div>
                )}
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between font-bold text-sm">
                <span>Total Due</span>
                <span>{fmtUSD(total)}</span>
              </div>
              {paymentUrl && (
                <div className="text-[8px] text-[#1B72B5] truncate">
                  {form.external_invoice_label || providerLabel(form.external_invoice_provider)}: {paymentUrl}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function lineItemTotal(item: LineItem) { return item.qty * item.rate; }
