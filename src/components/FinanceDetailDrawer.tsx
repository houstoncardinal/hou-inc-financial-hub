import { useEffect } from 'react';
import type { ReactNode } from 'react';
import {
  X, Landmark, CalendarDays, Building2, ShieldCheck, ReceiptText, CreditCard,
  FileText, Mail, StickyNote,
} from 'lucide-react';
import { fmtDate, fmtUSD } from '@/lib/format';

export type DrawerKind = 'check' | 'income' | 'expense' | 'vendor' | 'ledger' | 'document';

interface Props {
  open: boolean;
  onClose: () => void;
  kind: DrawerKind;
  data: any;
}

const KIND_META: Record<DrawerKind, { label: string; accent: string }> = {
  check:    { label: 'Check Detail',   accent: '#9D7E3F' },
  income:   { label: 'Income Detail',  accent: '#10b981' },
  expense:  { label: 'Expense Detail', accent: '#ef4444' },
  vendor:   { label: 'Vendor Detail',  accent: '#9D7E3F' },
  ledger:   { label: 'Ledger Entry',   accent: '#9D7E3F' },
  document: { label: 'Document Detail', accent: '#2563eb' },
};

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  pending:      { bg: 'rgba(245,158,11,0.10)', color: '#d97706' },
  cleared:      { bg: 'rgba(16,185,129,0.10)', color: '#059669' },
  voided:       { bg: 'rgba(107,114,128,0.10)', color: '#6b7280' },
  approved:     { bg: 'rgba(16,185,129,0.10)', color: '#059669' },
  rejected:     { bg: 'rgba(239,68,68,0.10)', color: '#dc2626' },
  uploaded:     { bg: 'rgba(59,130,246,0.10)', color: '#2563eb' },
  received:     { bg: 'rgba(16,185,129,0.10)', color: '#059669' },
  not_required: { bg: 'rgba(107,114,128,0.08)', color: '#9ca3af' },
};

function StatusPill({ status }: { status: string }) {
  const s = STATUS_STYLES[status?.toLowerCase()] ?? { bg: 'rgba(157,126,63,0.10)', color: '#9D7E3F' };
  return (
    <span className="fdd-pill" style={{ backgroundColor: s.bg, color: s.color }}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
}

function BoolPill({ value, trueLabel = 'Yes', falseLabel = 'No' }: { value: boolean; trueLabel?: string; falseLabel?: string }) {
  return (
    <span className="fdd-pill" style={{
      backgroundColor: value ? 'rgba(16,185,129,0.10)' : 'rgba(107,114,128,0.08)',
      color: value ? '#059669' : '#9ca3af',
    }}>
      {value ? trueLabel : falseLabel}
    </span>
  );
}

/** Top summary tile — mirrors the amount/status stat row already used in the Checks inspector. */
function StatTile({ label, value, accent }: { label: string; value: ReactNode; accent?: string }) {
  return (
    <div className="fdd-stat">
      <div className="fdd-stat-label">{label}</div>
      <div className="fdd-stat-value" style={accent ? { color: accent } : undefined}>{value}</div>
    </div>
  );
}

function Field({ label, value, mono = false }: { label: string; value?: ReactNode; mono?: boolean }) {
  if (value === undefined || value === null || value === '' || value === '—') return null;
  return (
    <div className="min-w-0">
      <div className="fdd-field-label">{label}</div>
      <div className={`fdd-field-value ${mono ? 'font-mono-tab font-medium' : 'font-semibold'}`} title={typeof value === 'string' ? value : undefined}>
        {value}
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: ReactNode }) {
  return (
    <section className="fdd-section">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-3.5 h-3.5" style={{ color: 'var(--fdd-accent, #9D7E3F)' }} strokeWidth={1.7} />
        <div className="fdd-section-title">{title}</div>
      </div>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </section>
  );
}

function CheckContent({ d }: { d: any }) {
  const net = d.retainage_pct > 0 ? Number(d.amount) * (1 - d.retainage_pct / 100) : Number(d.amount || 0);
  return (
    <>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <StatTile label="Amount" value={fmtUSD(d.amount)} />
        <StatTile label="Status" value={<StatusPill status={d.status || 'pending'} />} />
        <StatTile label="Net" value={fmtUSD(net)} />
      </div>
      <Section title="Instrument" icon={Landmark}>
        <Field label="Check Number" value={d.check_number} mono />
        <Field label="Payee" value={d.payee_name} />
        <Field label="Issue Date" value={fmtDate(d.issue_date)} />
        {d.retainage_pct > 0 && <Field label="Retainage" value={`${d.retainage_pct}%`} mono />}
      </Section>
      {(d.memo || d.projects?.name) && (
        <Section title="Details" icon={FileText}>
          <Field label="Project" value={d.projects?.name} />
          <Field label="Memo" value={d.memo} />
        </Section>
      )}
      <Section title="Compliance" icon={ShieldCheck}>
        <Field label="Lien Waiver" value={<StatusPill status={d.lien_waiver_status || 'not_required'} />} />
        {d.bank_account && <Field label="Bank Account" value={d.bank_account} mono />}
      </Section>
    </>
  );
}

function IncomeContent({ d }: { d: any }) {
  return (
    <>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <StatTile label="Amount" value={fmtUSD(d.amount)} accent="#059669" />
        <StatTile label="Date" value={fmtDate(d.transaction_date)} />
        <StatTile label="Method" value={(d.payment_method || '—').replace(/_/g, ' ')} />
      </div>
      <Section title="Receipt" icon={ReceiptText}>
        <Field label="Source" value={d.source_name || d.vendors?.name} />
        <Field label="Category" value={d.category} />
      </Section>
      {(d.projects?.name || d.notes || d.invoice_number) && (
        <Section title="Context" icon={FileText}>
          <Field label="Project" value={d.projects?.name} />
          <Field label="Invoice #" value={d.invoice_number} mono />
          <Field label="Notes" value={d.notes} />
        </Section>
      )}
    </>
  );
}

function ExpenseContent({ d }: { d: any }) {
  return (
    <>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <StatTile label="Amount" value={fmtUSD(d.amount)} accent="#dc2626" />
        <StatTile label="Date" value={fmtDate(d.transaction_date)} />
        <StatTile label="Method" value={(d.payment_method || '—').replace(/_/g, ' ')} />
      </div>
      <Section title="Expenditure" icon={CreditCard}>
        <Field label="Vendor" value={d.vendors?.name || d.payee_name} />
        <Field label="Category" value={d.category} />
      </Section>
      {(d.projects?.name || d.notes) && (
        <Section title="Context" icon={FileText}>
          <Field label="Project" value={d.projects?.name} />
          <Field label="Notes" value={d.notes} />
        </Section>
      )}
    </>
  );
}

function VendorContent({ d }: { d: any }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <StatTile label="Total Paid" value={fmtUSD(d.totalPaid ?? 0)} />
        <StatTile label="Transactions" value={d.txnCount ?? '—'} />
      </div>
      <Section title="Vendor Profile" icon={Building2}>
        <Field label="Legal Name" value={d.name} />
        <Field label="EIN" value={d.ein} mono />
      </Section>
      <Section title="Contact" icon={Mail}>
        <Field label="Email" value={d.contact_email} />
        <Field label="Phone" value={d.contact_phone} />
        <Field label="Address" value={d.address} />
      </Section>
      <Section title="IRS Compliance" icon={ShieldCheck}>
        <Field label="W9 on File" value={<BoolPill value={d.w9_on_file} />} />
        <Field label="1099 Required" value={<BoolPill value={d.requires_1099} />} />
        <Field label="Lien Waiver Req." value={<BoolPill value={d.lien_waiver_required} />} />
      </Section>
      {d.notes && (
        <Section title="Notes" icon={StickyNote}>
          <p className="col-span-2 text-[12px] leading-relaxed text-muted-foreground">{d.notes}</p>
        </Section>
      )}
    </>
  );
}

function LedgerContent({ d }: { d: any }) {
  const isCredit = d.amount >= 0;
  return (
    <>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <StatTile label="Amount" value={`${isCredit ? '+' : '−'}${fmtUSD(Math.abs(d.amount))}`} accent={isCredit ? '#059669' : '#dc2626'} />
        <StatTile label="Type" value={d.type} />
        <StatTile label="Date" value={fmtDate(d.date || d.transaction_date || d.issue_date)} />
      </div>
      <Section title="Entry" icon={Landmark}>
        <Field label="Counterparty" value={d.party || d.payee_name || d.vendors?.name} />
        <Field label="Reference" value={d.ref || d.reference} mono />
      </Section>
      {(d.project || d.projects?.name || d.category || d.notes || d.memo) && (
        <Section title="Details" icon={FileText}>
          <Field label="Project" value={d.project || d.projects?.name} />
          <Field label="Category" value={d.category} />
          <Field label="Notes / Memo" value={d.notes || d.memo} />
        </Section>
      )}
    </>
  );
}

function DocumentContent({ d }: { d: any }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <StatTile label="Status" value={<StatusPill status={d.status || 'pending'} />} />
        <StatTile label="Type" value={d.file_type || '—'} />
      </div>
      <Section title="Document" icon={FileText}>
        <Field label="Name" value={d.name} />
        <Field label="Category" value={d.category} />
      </Section>
      <Section title="History" icon={CalendarDays}>
        <Field label="Requested By" value={d.requested_by} />
        <Field label="Uploaded" value={d.uploaded_at ? fmtDate(d.uploaded_at) : undefined} />
        <Field label="Reviewed" value={d.reviewed_at ? fmtDate(d.reviewed_at) : undefined} />
        <Field label="Reviewed By" value={d.reviewed_by} />
      </Section>
      {d.description && (
        <Section title="Description" icon={StickyNote}>
          <p className="col-span-2 text-[12px] leading-relaxed text-muted-foreground">{d.description}</p>
        </Section>
      )}
      {d.url && (
        <a href={d.url} target="_blank" rel="noopener noreferrer" className="fdd-open-doc">
          Open Document →
        </a>
      )}
    </>
  );
}

export default function FinanceDetailDrawer({ open, onClose, kind, data }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !data) return null;
  const meta = KIND_META[kind];

  return (
    <>
      <style>{`
        .fdd-backdrop{position:fixed;inset:0;z-index:49;background:rgba(15,15,15,0.42);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);animation:fdd-fade .18s ease;}
        .fdd-panel{position:fixed;z-index:50;background:hsl(var(--background));overflow-y:auto;bottom:0;left:0;right:0;max-height:88vh;border-top:3px solid var(--fdd-accent);box-shadow:0 -22px 60px rgba(15,23,42,0.18);animation:fdd-slide-up .24s cubic-bezier(0.22,1,0.36,1);}
        @media(min-width:640px){.fdd-panel{bottom:0!important;left:auto!important;right:0!important;top:0!important;max-height:none!important;height:100%;width:26rem;border-top:0!important;border-left:3px solid var(--fdd-accent);box-shadow:-22px 0 60px rgba(15,23,42,0.14);animation:fdd-slide-in .24s cubic-bezier(0.22,1,0.36,1);}}
        @keyframes fdd-slide-up{from{transform:translateY(100%);opacity:0;}to{transform:translateY(0);opacity:1;}}
        @keyframes fdd-slide-in{from{transform:translateX(100%);opacity:0;}to{transform:translateX(0);opacity:1;}}
        @keyframes fdd-fade{from{opacity:0;}to{opacity:1;}}
        .fdd-pill{display:inline-block;padding:3px 10px;font-size:9px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;}
        .fdd-stat{border:1px solid hsl(var(--border));background:hsl(var(--secondary)/.35);padding:8px 10px;}
        .fdd-stat-label{font-size:8px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:hsl(var(--muted-foreground));}
        .fdd-stat-value{font-size:15px;font-weight:800;font-family:var(--font-mono,monospace);margin-top:3px;line-height:1.15;}
        .fdd-section{border:1px solid hsl(var(--border));background:hsl(var(--secondary)/.2);padding:12px;margin-bottom:12px;}
        .fdd-section-title{font-size:9px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:var(--fdd-accent,#9D7E3F);}
        .fdd-field-label{font-size:8px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:hsl(var(--muted-foreground));}
        .fdd-field-value{font-size:12.5px;margin-top:3px;line-height:1.35;word-break:break-word;}
        .fdd-open-doc{display:block;width:100%;padding:10px 0;text-align:center;font-size:10px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;background:var(--fdd-accent);color:#fff;text-decoration:none;}
      `}</style>

      <div className="fdd-backdrop" onClick={onClose} />

      <div role="dialog" aria-label={meta.label} className="fdd-panel" style={{ '--fdd-accent': meta.accent } as any}>
        <div className="sticky top-0 z-[1] flex items-center justify-between gap-3 px-5 py-4 border-b border-border bg-background">
          <div className="min-w-0">
            <div className="text-[8px] font-black uppercase tracking-[0.32em]" style={{ color: meta.accent }}>{kind.toUpperCase()}</div>
            <div className="text-sm font-bold mt-0.5 truncate">{meta.label}</div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors shrink-0">
            <X className="w-4 h-4" strokeWidth={1.6} />
          </button>
        </div>

        <div className="px-5 py-4 pb-10">
          {kind === 'check'    && <CheckContent    d={data} />}
          {kind === 'income'   && <IncomeContent   d={data} />}
          {kind === 'expense'  && <ExpenseContent  d={data} />}
          {kind === 'vendor'   && <VendorContent   d={data} />}
          {kind === 'ledger'   && <LedgerContent   d={data} />}
          {kind === 'document' && <DocumentContent d={data} />}
        </div>
      </div>
    </>
  );
}
