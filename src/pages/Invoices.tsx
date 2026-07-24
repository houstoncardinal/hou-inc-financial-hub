import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { useEntity } from '@/contexts/EntityContext';
import { screenHeaderFor } from '@/lib/entityFinance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useInvoices, invoiceTotal, invoiceSubtotal, invoiceTax, Invoice } from '@/hooks/useInvoices';
import { fmtUSD, fmtDate, todayLocalDate } from '@/lib/format';
import { Plus, Trash2, Eye, FileText, Table2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { generateInvoicesReport, savePDF, downloadInvoiceExcel } from '@/lib/reports';
import { usePagination } from '@/hooks/usePagination';
import { PaginationBar } from '@/components/PaginationBar';

const STATUS_STYLES: Record<string, string> = {
  draft:   'bg-muted text-muted-foreground border-border',
  sent:    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
  paid:    'bg-positive/10 text-positive border-positive/30',
  overdue: 'bg-accent/10 text-accent border-accent/30',
};

const INV_CSS = `
.inv-row:hover{background-color:rgba(157,126,63,0.032)!important;}
`;

export default function Invoices() {
  const navigate = useNavigate();
  const { entity } = useEntity();
  const invoicesHeader = screenHeaderFor(entity?.id, 'invoices', { title: 'Invoices', description: 'Create, track, and export professional invoices with one-click integrations.' });
  const { invoices, remove, update } = useInvoices();
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = invoices.filter(inv => {
    if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
    if (q) {
      const s = q.toLowerCase();
      if (!(inv.client_name.toLowerCase().includes(s) || inv.invoice_number.toLowerCase().includes(s) || inv.client_company?.toLowerCase().includes(s))) return false;
    }
    return true;
  });
  const INVOICES_PAGE_SIZE = 20;
  const { page: invoicesPage, setPage: setInvoicesPage, pageCount: invoicesPageCount, paged: pagedInvoices } =
    usePagination(filtered, INVOICES_PAGE_SIZE, `${q}|${statusFilter}`);

  const exportPDF = () => {
    const doc = generateInvoicesReport(invoices.map(inv => ({
      invoice_number: inv.invoice_number,
      client_name: inv.client_name,
      client_company: inv.client_company,
      issue_date: inv.issue_date,
      due_date: inv.due_date,
      status: inv.status,
      subtotal: invoiceSubtotal(inv),
      tax: invoiceTax(inv),
      total: invoiceTotal(inv),
    })), entity?.name);
    savePDF(doc, `hou-invoices-${todayLocalDate()}.pdf`);
    toast.success('Invoice register exported as PDF');
  };

  const exportExcel = () => {
    downloadInvoiceExcel(invoices.map(inv => ({
      invoice_number: inv.invoice_number,
      client_name: inv.client_name,
      client_company: inv.client_company,
      issue_date: inv.issue_date,
      due_date: inv.due_date,
      status: inv.status,
      subtotal: invoiceSubtotal(inv),
      tax: invoiceTax(inv),
      total: invoiceTotal(inv),
    })));
    toast.success('Invoices exported as Excel');
  };

  const stats = {
    total: invoices.reduce((s, i) => s + invoiceTotal(i), 0),
    paid: invoices.filter(i => i.status === 'paid').reduce((s, i) => s + invoiceTotal(i), 0),
    outstanding: invoices.filter(i => i.status === 'sent' || i.status === 'overdue').reduce((s, i) => s + invoiceTotal(i), 0),
    overdue: invoices.filter(i => i.status === 'overdue').length,
  };

  return (
    <AppShell>
      <style>{INV_CSS}</style>
      <PageHeader
        eyebrow="Billing"
        title={invoicesHeader.title}
        description={invoicesHeader.description}
        actions={
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2">
              <Button variant="outline" size="sm" className="rounded-none h-9 text-xs" onClick={exportPDF}>
                <FileText className="w-3.5 h-3.5 mr-1.5" />PDF
              </Button>
              <Button variant="outline" size="sm" className="rounded-none h-9 text-xs" onClick={exportExcel}>
                <Table2 className="w-3.5 h-3.5 mr-1.5" />Excel
              </Button>
            </div>
            <Button onClick={() => navigate('/invoices/new')} className="rounded-none h-9 text-xs bg-foreground text-background hover:opacity-90">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> New Invoice
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="px-4 sm:px-8 py-4 border-b border-border grid grid-cols-2 sm:grid-cols-4 gap-px bg-border">
        {[
          { l: 'Total Invoiced', v: fmtUSD(stats.total), c: '' },
          { l: 'Collected', v: fmtUSD(stats.paid), c: 'text-positive' },
          { l: 'Outstanding', v: fmtUSD(stats.outstanding), c: '' },
          { l: 'Overdue', v: String(stats.overdue), c: stats.overdue > 0 ? 'text-accent' : '' },
        ].map(s => (
          <div key={s.l} className="bg-background px-4 sm:px-5 py-3">
            <div className="micro-label">{s.l}</div>
            <div className={`text-base sm:text-xl font-semibold font-mono-tab mt-1 ${s.c}`}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Mobile export bar */}
      <div className="sm:hidden px-4 py-3 border-b border-border flex gap-2">
        <Button variant="outline" size="sm" className="rounded-none text-xs flex-1" onClick={exportPDF}><FileText className="w-3.5 h-3.5 mr-1.5" />PDF</Button>
        <Button variant="outline" size="sm" className="rounded-none text-xs flex-1" onClick={exportExcel}><Table2 className="w-3.5 h-3.5 mr-1.5" />Excel</Button>
      </div>

      {/* Filters */}
      <div className="px-4 sm:px-8 py-3 border-b border-border flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <Input
          placeholder="Search client or invoice #…"
          value={q}
          onChange={e => setQ(e.target.value)}
          className="rounded-none max-w-xs h-9 w-full sm:w-auto text-sm"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="rounded-none w-full sm:w-36 h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
        <div className="sm:ml-auto text-[10px] text-muted-foreground font-mono-tab">{filtered.length} invoices</div>
      </div>

      <div className="px-4 sm:px-8 py-6">
        {/* Mobile cards */}
        <div className="sm:hidden space-y-3">
          {filtered.length === 0 ? (
            <div className="py-20 text-center">
              <div className="text-sm text-muted-foreground mb-4">No invoices yet.</div>
              <Button onClick={() => navigate('/invoices/new')} className="rounded-none text-xs h-9 bg-foreground text-background">
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Create Your First Invoice
              </Button>
            </div>
          ) : pagedInvoices.map(inv => (
            <InvoiceCard key={inv.id} inv={inv} onEdit={() => navigate(`/invoices/${inv.id}`)} onDelete={() => remove(inv.id)} onStatusChange={s => update(inv.id, { status: s })} />
          ))}
        </div>
        <PaginationBar page={invoicesPage} pageCount={invoicesPageCount} total={filtered.length} pageSize={INVOICES_PAGE_SIZE}
          onPageChange={setInvoicesPage} itemLabel="invoices" className="sm:hidden mt-3" />

        {/* Desktop table */}
        <div className="hidden sm:block border border-border">
          <div className="grid grid-cols-[1.2fr_2fr_1.5fr_1fr_1.5fr_1fr_auto] gap-3 px-4 py-2.5 border-b border-border bg-secondary/40 text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium items-center">
            <div>Invoice #</div><div>Client</div><div>Issued</div><div>Due</div><div className="text-right">Amount</div><div>Status</div><div />
          </div>
          {filtered.length === 0 ? (
            <div className="px-4 py-20 text-center">
              <div className="text-sm text-muted-foreground mb-4">No invoices yet — create your first to get started.</div>
              <Button onClick={() => navigate('/invoices/new')} className="rounded-none text-xs h-9 bg-foreground text-background">
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Create Invoice
              </Button>
            </div>
          ) : pagedInvoices.map(inv => (
            <div key={inv.id} className="grid grid-cols-[1.2fr_2fr_1.5fr_1fr_1.5fr_1fr_auto] gap-3 px-4 py-3 border-b border-border last:border-b-0 text-sm font-mono-tab inv-row items-center group">
              <div className="font-semibold text-foreground">{inv.invoice_number}</div>
              <div>
                <div className="font-medium truncate">{inv.client_name}</div>
                {inv.client_company && <div className="text-[10px] text-muted-foreground truncate">{inv.client_company}</div>}
              </div>
              <div className="text-muted-foreground">{fmtDate(inv.issue_date)}</div>
              <div className={`text-muted-foreground ${inv.status === 'overdue' ? 'text-accent font-semibold' : ''}`}>{fmtDate(inv.due_date)}</div>
              <div className="text-right font-semibold">{fmtUSD(invoiceTotal(inv))}</div>
              <div>
                <Select value={inv.status} onValueChange={s => update(inv.id, { status: s as Invoice['status'] })}>
                  <SelectTrigger className={`rounded-none h-6 text-[10px] border px-1.5 py-0 w-auto ${STATUS_STYLES[inv.status]}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {inv.stripe_payment_link && (
                  <a href={inv.stripe_payment_link} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" title="Open Stripe payment link">
                    <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </a>
                )}
                <button onClick={() => navigate(`/invoices/${inv.id}`)} className="text-muted-foreground hover:text-foreground transition-colors" title="View / Edit">
                  <Eye className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="text-muted-foreground hover:text-accent transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} /></button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-none">
                    <AlertDialogHeader><AlertDialogTitle>Delete {inv.invoice_number}?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-none">Cancel</AlertDialogCancel>
                      <AlertDialogAction className="rounded-none bg-destructive text-destructive-foreground" onClick={() => { remove(inv.id); toast.success('Invoice deleted'); }}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
          {filtered.length > INVOICES_PAGE_SIZE && (
            <div className="px-4 py-3 border-t border-border">
              <PaginationBar page={invoicesPage} pageCount={invoicesPageCount} total={filtered.length} pageSize={INVOICES_PAGE_SIZE}
                onPageChange={setInvoicesPage} itemLabel="invoices" />
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function InvoiceCard({ inv, onEdit, onDelete, onStatusChange }: { inv: Invoice; onEdit: () => void; onDelete: () => void; onStatusChange: (s: Invoice['status']) => void }) {
  return (
    <div className="border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm font-mono-tab">{inv.invoice_number}</span>
        <Select value={inv.status} onValueChange={s => onStatusChange(s as Invoice['status'])}>
          <SelectTrigger className={`rounded-none h-6 text-[9px] border px-1.5 py-0 w-auto ${STATUS_STYLES[inv.status]}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <div className="text-sm font-medium">{inv.client_name}</div>
        {inv.client_company && <div className="text-xs text-muted-foreground">{inv.client_company}</div>}
      </div>
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground font-mono-tab">Due {fmtDate(inv.due_date)}</div>
        <div className="text-base font-semibold font-mono-tab">{fmtUSD(invoiceTotal(inv))}</div>
      </div>
      <div className="flex items-center gap-2 pt-1 border-t border-border">
        <button onClick={onEdit} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
          <Eye className="w-3 h-3" /> View
        </button>
        {inv.stripe_payment_link && (
          <a href={inv.stripe_payment_link} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
            <ExternalLink className="w-3 h-3" /> Pay Link
          </a>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="flex items-center justify-center gap-1.5 py-1.5 px-3 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-accent transition-colors">
              <Trash2 className="w-3 h-3" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-none w-[calc(100%-2rem)]">
            <AlertDialogHeader><AlertDialogTitle>Delete {inv.invoice_number}?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel className="rounded-none w-full">Cancel</AlertDialogCancel>
              <AlertDialogAction className="rounded-none bg-destructive text-destructive-foreground w-full" onClick={onDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
