import { useEffect } from 'react';
import { X } from 'lucide-react';
import { fmtDate, fmtUSD } from '@/lib/format';

export type DrawerKind = 'check' | 'income' | 'expense' | 'vendor' | 'ledger' | 'document';

interface Props {
  open: boolean;
  onClose: () => void;
  kind: DrawerKind;
  data: any;
}

const KIND_LABELS: Record<DrawerKind, string> = {
  check:    'Check Detail',
  income:   'Income Detail',
  expense:  'Expense Detail',
  vendor:   'Vendor Detail',
  ledger:   'Ledger Entry',
  document: 'Document Detail',
};

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  pending:     { bg: 'rgba(245,158,11,0.10)', color: '#d97706' },
  cleared:     { bg: 'rgba(16,185,129,0.10)', color: '#059669' },
  voided:      { bg: 'rgba(107,114,128,0.10)', color: '#6b7280' },
  approved:    { bg: 'rgba(16,185,129,0.10)', color: '#059669' },
  rejected:    { bg: 'rgba(239,68,68,0.10)', color: '#dc2626' },
  uploaded:    { bg: 'rgba(59,130,246,0.10)', color: '#2563eb' },
  received:    { bg: 'rgba(16,185,129,0.10)', color: '#059669' },
  not_required: { bg: 'rgba(107,114,128,0.08)', color: '#9ca3af' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status?.toLowerCase()] ?? { bg: 'rgba(157,126,63,0.10)', color: '#9D7E3F' };
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      borderRadius: 9999,
      backgroundColor: s.bg,
      color: s.color,
    }}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
}

function BoolBadge({ value, trueLabel = 'Yes', falseLabel = 'No' }: { value: boolean; trueLabel?: string; falseLabel?: string }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      borderRadius: 9999,
      backgroundColor: value ? 'rgba(16,185,129,0.10)' : 'rgba(107,114,128,0.08)',
      color: value ? '#059669' : '#9ca3af',
    }}>
      {value ? trueLabel : falseLabel}
    </span>
  );
}

function Field({ label, value, mono = false }: { label: string; value?: React.ReactNode; mono?: boolean }) {
  if (value === undefined || value === null || value === '' || value === '—') return null;
  return (
    <div className="flex items-start justify-between gap-4 py-2.5" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', flexShrink: 0, paddingTop: 1 }}>
        {label}
      </span>
      <span style={{ fontSize: 12, fontWeight: mono ? 500 : 600, fontFamily: mono ? 'var(--font-mono, monospace)' : undefined, textAlign: 'right', wordBreak: 'break-word' }}>
        {value}
      </span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.42em', textTransform: 'uppercase', color: '#9D7E3F', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid rgba(157,126,63,0.2)' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function CheckContent({ d }: { d: any }) {
  const net = d.retainage_pct > 0 ? Number(d.amount) * (1 - d.retainage_pct / 100) : null;
  return (
    <>
      <Section title="Instrument">
        <Field label="Check Number" value={d.check_number} mono />
        <Field label="Payee" value={d.payee_name} />
        <Field label="Amount" value={<span style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace' }}>{fmtUSD(d.amount)}</span>} />
        {d.retainage_pct > 0 && <Field label="Retainage" value={`${d.retainage_pct}% — Net: ${fmtUSD(net!)}`} mono />}
        <Field label="Issue Date" value={fmtDate(d.issue_date)} />
        <Field label="Status" value={<StatusBadge status={d.status} />} />
      </Section>
      {(d.memo || d.projects?.name) && (
        <Section title="Details">
          <Field label="Project" value={d.projects?.name} />
          <Field label="Memo" value={d.memo} />
        </Section>
      )}
      <Section title="Compliance">
        <Field label="Lien Waiver" value={<StatusBadge status={d.lien_waiver_status || 'not_required'} />} />
        {d.bank_account && <Field label="Bank Account" value={d.bank_account} mono />}
      </Section>
    </>
  );
}

function IncomeContent({ d }: { d: any }) {
  return (
    <>
      <Section title="Receipt">
        <Field label="Amount" value={<span style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace', color: '#059669' }}>{fmtUSD(d.amount)}</span>} />
        <Field label="Date" value={fmtDate(d.transaction_date)} />
        <Field label="Source" value={d.source_name || d.vendors?.name} />
        <Field label="Category" value={d.category} />
        <Field label="Payment Method" value={d.payment_method?.replace(/_/g, ' ')} />
      </Section>
      {(d.projects?.name || d.notes || d.invoice_number) && (
        <Section title="Context">
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
      <Section title="Expenditure">
        <Field label="Amount" value={<span style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace', color: '#dc2626' }}>{fmtUSD(d.amount)}</span>} />
        <Field label="Date" value={fmtDate(d.transaction_date)} />
        <Field label="Vendor" value={d.vendors?.name || d.payee_name} />
        <Field label="Category" value={d.category} />
        <Field label="Payment Method" value={d.payment_method?.replace(/_/g, ' ')} />
      </Section>
      {(d.projects?.name || d.notes) && (
        <Section title="Context">
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
      <Section title="Vendor Profile">
        <Field label="Legal Name" value={d.name} />
        <Field label="Total Paid" value={<span style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace' }}>{fmtUSD(d.totalPaid ?? 0)}</span>} />
        <Field label="Transactions" value={d.txnCount ?? '—'} />
      </Section>
      <Section title="Contact">
        <Field label="Email" value={d.contact_email} />
        <Field label="Phone" value={d.contact_phone} />
        <Field label="Address" value={d.address} />
      </Section>
      <Section title="IRS Compliance">
        <Field label="EIN" value={d.ein} mono />
        <Field label="W9 on File" value={<BoolBadge value={d.w9_on_file} />} />
        <Field label="1099 Required" value={<BoolBadge value={d.requires_1099} />} />
        <Field label="Lien Waiver Req." value={<BoolBadge value={d.lien_waiver_required} />} />
      </Section>
      {d.notes && (
        <Section title="Notes">
          <p style={{ fontSize: 12, lineHeight: 1.65, color: 'hsl(var(--muted-foreground))' }}>{d.notes}</p>
        </Section>
      )}
    </>
  );
}

function LedgerContent({ d }: { d: any }) {
  const isCredit = d.amount >= 0;
  return (
    <>
      <Section title="Entry">
        <Field label="Type" value={d.type} />
        <Field label="Amount" value={
          <span style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace', color: isCredit ? '#059669' : '#dc2626' }}>
            {isCredit ? '+' : '−'}{fmtUSD(Math.abs(d.amount))}
          </span>
        } />
        <Field label="Date" value={fmtDate(d.date || d.transaction_date || d.issue_date)} />
        <Field label="Counterparty" value={d.party || d.payee_name || d.vendors?.name} />
      </Section>
      {(d.project || d.projects?.name || d.ref || d.reference || d.category) && (
        <Section title="Details">
          <Field label="Project" value={d.project || d.projects?.name} />
          <Field label="Reference" value={d.ref || d.reference} mono />
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
      <Section title="Document">
        <Field label="Name" value={d.name} />
        <Field label="Type" value={d.file_type} />
        <Field label="Category" value={d.category} />
        <Field label="Status" value={<StatusBadge status={d.status || 'pending'} />} />
      </Section>
      <Section title="History">
        <Field label="Requested By" value={d.requested_by} />
        <Field label="Uploaded" value={d.uploaded_at ? fmtDate(d.uploaded_at) : undefined} />
        <Field label="Reviewed" value={d.reviewed_at ? fmtDate(d.reviewed_at) : undefined} />
        <Field label="Reviewed By" value={d.reviewed_by} />
      </Section>
      {d.description && (
        <Section title="Description">
          <p style={{ fontSize: 12, lineHeight: 1.65, color: 'hsl(var(--muted-foreground))' }}>{d.description}</p>
        </Section>
      )}
      {d.url && (
        <div style={{ paddingTop: 8 }}>
          <a
            href={d.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'block', width: '100%', padding: '10px 0', textAlign: 'center', fontSize: 10, fontWeight: 700, letterSpacing: '0.24em', textTransform: 'uppercase', backgroundColor: '#9D7E3F', color: '#fff', textDecoration: 'none' }}
          >
            Open Document →
          </a>
        </div>
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

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 49,
          backgroundColor: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
          animation: 'fade-in 0.18s ease',
        }}
      />

      {/* Panel — right side on sm+, bottom sheet on mobile */}
      <div
        role="dialog"
        aria-label={KIND_LABELS[kind]}
        style={{
          position: 'fixed', zIndex: 50,
          backgroundColor: 'hsl(var(--background))',
          overflowY: 'auto',
          /* Mobile: bottom sheet */
          bottom: 0, left: 0, right: 0,
          maxHeight: '82vh',
          borderTop: '3px solid #9D7E3F',
          animation: 'slide-up 0.22s cubic-bezier(0.22,1,0.36,1)',
        }}
        className="sm:!bottom-0 sm:!left-auto sm:!right-0 sm:!top-0 sm:!max-h-none sm:!h-full sm:!w-96 sm:!border-t-0 sm:!border-l-4 sm:!border-l-[#9D7E3F] sm:!border-t-0"
      >
        <style>{`
          @keyframes slide-up { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
          @keyframes slide-in-right { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
          @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
          @media (min-width: 640px) {
            [role="dialog"] { animation: slide-in-right 0.22s cubic-bezier(0.22,1,0.36,1) !important; }
          }
        `}</style>

        {/* Header */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px',
          backgroundColor: 'hsl(var(--background))',
          borderBottom: '1px solid hsl(var(--border))',
        }}>
          <div>
            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.4em', textTransform: 'uppercase', color: '#9D7E3F', marginBottom: 3 }}>
              {kind.toUpperCase()}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'hsl(var(--foreground))' }}>
              {KIND_LABELS[kind]}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid hsl(var(--border))', color: 'hsl(var(--muted-foreground))', background: 'transparent', cursor: 'pointer' }}
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '18px 18px 40px' }}>
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
