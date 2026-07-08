import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, AlertCircle, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import PortalLayout from '@/components/PortalLayout';
import { usePortal } from '@/hooks/usePortal';

/* ── Tokens ─────────────────────────────────────────────────────────── */
const DARK   = '#1A1410';
const MUTED  = '#7A6E64';
const GOLD   = '#9D7E3F';
const GOLDF  = '#C4A76B';
const BORDER = '#E5E0D9';
const SERIF  = "'Cormorant Garamond', Georgia, serif";
const WHITE  = '#FFFFFF';

/* ── Mock data ───────────────────────────────────────────────────────── */
type InvoiceStatus = 'Paid' | 'Pending' | 'Upcoming';

interface Invoice {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  status: InvoiceStatus;
}

const INVOICES: Invoice[] = [
  { id: 'INV-2024-0001', description: 'Initial Deposit (20%)', amount: 97000,  dueDate: '2024-11-01', status: 'Paid' },
  { id: 'INV-2024-0002', description: 'Foundation Milestone',  amount: 72750,  dueDate: '2025-02-15', status: 'Pending' },
  { id: 'INV-2024-0003', description: 'Framing Milestone',     amount: 72750,  dueDate: '2025-05-01', status: 'Upcoming' },
  { id: 'INV-2024-0004', description: 'Final Payment',         amount: 242500, dueDate: '2025-10-15', status: 'Upcoming' },
];

const STATUS_STYLE: Record<InvoiceStatus, { bg: string; text: string }> = {
  Paid:     { bg: 'rgba(16,185,129,0.1)',   text: '#10b981' },
  Pending:  { bg: 'rgba(157,126,63,0.12)',  text: GOLD },
  Upcoming: { bg: 'rgba(122,110,100,0.1)',  text: MUTED },
};

const TOTAL_CONTRACT = 485000;
const PAID_TO_DATE   = 97000;
const BALANCE        = TOTAL_CONTRACT - PAID_TO_DATE;

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });

/* ── Summary tile definitions ────────────────────────────────────────── */
const SUMMARY_TILES = [
  {
    label:     'Total Contract Value',
    value:     fmt(TOTAL_CONTRACT),
    sub:       null,
    Icon:      DollarSign,
    iconBg:    'rgba(26,20,16,0.06)',
    iconColor: MUTED,
    valueColor: DARK,
  },
  {
    label:     'Paid to Date',
    value:     fmt(PAID_TO_DATE),
    sub:       `${Math.round((PAID_TO_DATE / TOTAL_CONTRACT) * 100)}% of total`,
    Icon:      CheckCircle,
    iconBg:    'rgba(16,185,129,0.1)',
    iconColor: '#10b981',
    valueColor: '#10b981',
  },
  {
    label:     'Balance Remaining',
    value:     fmt(BALANCE),
    sub:       null,
    Icon:      Clock,
    iconBg:    'rgba(157,126,63,0.08)',
    iconColor: GOLDF,
    valueColor: DARK,
  },
] as const;

export default function PortalPayments() {
  const { client } = usePortal();
  const navigate = useNavigate();

  useEffect(() => { if (!client) navigate('/portal', { replace: true }); }, [client, navigate]);
  if (!client) return null;

  return (
    <PortalLayout>
      <motion.div
        className="px-6 md:px-10 py-8 md:py-12 max-w-6xl"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* ── Header ── */}
        <div className="mb-10">
          <div className="text-[8px] uppercase tracking-[0.44em] font-bold mb-2" style={{ color: GOLD }}>
            Finance
          </div>
          <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(26px, 4vw, 44px)', color: DARK, lineHeight: 1.05 }}>
            Payments & Approvals
          </div>
        </div>

        {/* ── Summary tiles ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {SUMMARY_TILES.map(tile => {
            const Icon = tile.Icon;
            return (
              <div key={tile.label} className="p-6" style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}` }}>
                <div className="flex items-start justify-between mb-4">
                  <div className="text-[9px] uppercase tracking-[0.32em] font-bold" style={{ color: MUTED }}>
                    {tile.label}
                  </div>
                  <div
                    className="w-7 h-7 flex items-center justify-center shrink-0"
                    style={{ backgroundColor: tile.iconBg }}
                  >
                    <Icon className="w-3 h-3" style={{ color: tile.iconColor }} strokeWidth={1.5} />
                  </div>
                </div>
                <div className="text-[22px] font-bold leading-tight" style={{ color: tile.valueColor }}>
                  {tile.value}
                </div>
                {tile.sub && (
                  <div className="text-[10px] font-light mt-1" style={{ color: MUTED }}>{tile.sub}</div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Invoice table ── */}
        <div className="mb-8" style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}` }}>
          <div className="px-7 py-5" style={{ borderBottom: `1px solid ${BORDER}` }}>
            <div className="text-[9px] uppercase tracking-[0.44em] font-bold" style={{ color: GOLD }}>
              Invoices
            </div>
          </div>

          {/* Table header */}
          <div
            className="hidden md:grid px-7 py-3"
            style={{
              gridTemplateColumns: '1fr 2fr 1fr 1fr 100px',
              gap: '1rem',
              borderBottom: `1px solid ${BORDER}`,
            }}
          >
            {['Invoice', 'Description', 'Amount', 'Due Date', 'Status'].map(h => (
              <div key={h} className="text-[9px] uppercase tracking-[0.24em] font-bold" style={{ color: MUTED }}>
                {h}
              </div>
            ))}
          </div>

          {/* Table rows */}
          {INVOICES.map((inv, i) => {
            const sc = STATUS_STYLE[inv.status];
            return (
              <div
                key={inv.id}
                className="px-7 py-4"
                style={{ borderBottom: i < INVOICES.length - 1 ? `1px solid ${BORDER}` : 'none' }}
              >
                {/* Desktop grid */}
                <div
                  className="hidden md:grid items-center"
                  style={{ gridTemplateColumns: '1fr 2fr 1fr 1fr 100px', gap: '1rem' }}
                >
                  <div className="text-[11px] font-bold" style={{ color: DARK }}>{inv.id}</div>
                  <div className="text-[12px] font-light" style={{ color: DARK }}>{inv.description}</div>
                  <div className="text-[12px] font-bold" style={{ color: DARK }}>{fmt(inv.amount)}</div>
                  <div className="text-[11px] font-light" style={{ color: MUTED }}>{inv.dueDate}</div>
                  <div>
                    <span
                      className="text-[7px] uppercase tracking-[0.24em] font-bold px-2.5 py-1"
                      style={{ backgroundColor: sc.bg, color: sc.text }}
                    >
                      {inv.status}
                    </span>
                  </div>
                </div>

                {/* Mobile stacked */}
                <div className="md:hidden flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-bold mb-0.5" style={{ color: DARK }}>{inv.description}</div>
                    <div className="text-[9px]" style={{ color: MUTED }}>{inv.id} · Due {inv.dueDate}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <div className="text-[13px] font-bold" style={{ color: DARK }}>{fmt(inv.amount)}</div>
                    <span
                      className="text-[7px] uppercase tracking-[0.24em] font-bold px-2 py-0.5"
                      style={{ backgroundColor: sc.bg, color: sc.text }}
                    >
                      {inv.status}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Change Orders & Approvals ── */}
        <div className="mb-8" style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}` }}>
          <div className="px-7 py-5" style={{ borderBottom: `1px solid ${BORDER}` }}>
            <div className="text-[9px] uppercase tracking-[0.44em] font-bold" style={{ color: GOLD }}>
              Change Orders & Approvals
            </div>
          </div>

          <div className="p-7">
            <div
              className="flex flex-col md:flex-row md:items-start md:justify-between gap-5"
              style={{
                padding: '20px 24px',
                border: `1px solid rgba(157,126,63,0.25)`,
                backgroundColor: 'rgba(157,126,63,0.025)',
              }}
            >
              {/* Change order info */}
              <div className="flex items-start gap-4">
                <div
                  className="w-8 h-8 flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'rgba(245,158,11,0.1)' }}
                >
                  <AlertCircle className="w-3.5 h-3.5" style={{ color: '#f59e0b' }} strokeWidth={1.5} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[12px] font-bold" style={{ color: DARK }}>CO-001</span>
                    <span
                      className="text-[7px] uppercase tracking-[0.24em] font-bold px-2 py-0.5"
                      style={{ backgroundColor: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}
                    >
                      Awaiting Your Approval
                    </span>
                  </div>
                  <p className="text-[12px] font-light mb-1.5" style={{ color: DARK }}>
                    Added recessed lighting package — Master Suite & Living Room
                  </p>
                  <div className="text-[13px] font-bold" style={{ color: GOLD }}>+$8,400</div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  className="text-[9px] uppercase tracking-[0.22em] font-black px-6 py-2.5 transition-opacity hover:opacity-90"
                  style={{ backgroundColor: GOLD, color: '#FAF7F2' }}
                >
                  Approve
                </button>
                <button
                  className="text-[9px] uppercase tracking-[0.22em] font-bold px-5 py-2.5 transition-all"
                  style={{ border: `1px solid ${BORDER}`, color: MUTED, backgroundColor: 'transparent' }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = GOLD;
                    (e.currentTarget as HTMLElement).style.color = GOLD;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = BORDER;
                    (e.currentTarget as HTMLElement).style.color = MUTED;
                  }}
                >
                  Request Review
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer note ── */}
        <div
          className="flex items-start gap-3 px-5 py-4"
          style={{ backgroundColor: 'rgba(26,20,16,0.025)', border: `1px solid ${BORDER}` }}
        >
          <div className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: GOLD }} />
          <p className="text-[11px] font-light leading-relaxed" style={{ color: MUTED }}>
            All payments processed via secure bank transfer.{' '}
            <span style={{ color: DARK, fontWeight: 500 }}>Contact Jeff Ali</span> for payment
            instructions —{' '}
            <a
              href="tel:+12819159595"
              className="transition-opacity hover:opacity-70"
              style={{ color: GOLD }}
            >
              (281) 915-9595
            </a>{' '}
            or{' '}
            <a
              href="mailto:jeff@houinc.com"
              className="transition-opacity hover:opacity-70"
              style={{ color: GOLD }}
            >
              jeff@houinc.com
            </a>
          </p>
        </div>
      </motion.div>
    </PortalLayout>
  );
}
