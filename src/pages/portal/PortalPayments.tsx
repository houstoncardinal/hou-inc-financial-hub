import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, DollarSign, Phone, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import PortalLayout from '@/components/PortalLayout';
import { usePortal, BUILDER } from '@/hooks/usePortal';
import { supabase } from '@/integrations/supabase/client';

/* ── Tokens ─────────────────────────────────────────────────────────── */
const DARK   = '#1A1410';
const MUTED  = '#7A6E64';
const GOLD   = '#9D7E3F';
const GOLDF  = '#C4A76B';
const BORDER = '#E5E0D9';
const CREAM  = '#FAF7F2';
const SERIF  = "'Cormorant Garamond', Georgia, serif";
const WHITE  = '#FFFFFF';

/* ── Types ───────────────────────────────────────────────────────────── */
type InvoiceStatus = 'paid' | 'pending' | 'upcoming';

interface Invoice {
  id: string;
  invoice_number?: string;
  description: string;
  amount: number;
  due_date: string;
  status: InvoiceStatus;
}

interface ChangeOrder {
  id: string;
  number?: string;
  description: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

const STATUS_STYLE: Record<InvoiceStatus, { bg: string; text: string; label: string }> = {
  paid:     { bg: 'rgba(16,185,129,0.1)',   text: '#10b981', label: 'Paid' },
  pending:  { bg: 'rgba(157,126,63,0.12)',  text: GOLD,      label: 'Pending' },
  upcoming: { bg: 'rgba(122,110,100,0.1)',  text: MUTED,     label: 'Upcoming' },
};

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });

const fmtDate = (d: string) => {
  try {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return d; }
};

export default function PortalPayments() {
  const { client, loaded } = usePortal();
  const navigate = useNavigate();

  const [invoices, setInvoices]       = useState<Invoice[]>([]);
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => { if (!loaded) return; if (!client) navigate('/portal', { replace: true }); }, [client, loaded, navigate]);

  useEffect(() => {
    if (!client) return;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from('invoices')
        .select('*')
        .eq('client_email', client.email)
        .order('due_date', { ascending: true });
      setInvoices(data ?? []);

      // Change orders — graceful fallback if table doesn't exist yet
      try {
        const { data: coData } = await (supabase as any)
          .from('change_orders')
          .select('id, number, description, amount, status, created_at')
          .eq('client_id', client.id)
          .order('created_at', { ascending: false });
        setChangeOrders(coData ?? []);
      } catch { /* table not yet created */ }

      setLoading(false);
    })();
  }, [client?.id, client?.email]);

  if (!client) return null;

  const totalContract = invoices.reduce((s, inv) => s + (inv.amount ?? 0), 0);
  const paidToDate    = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.amount ?? 0), 0);
  const balance       = totalContract - paidToDate;
  const paidPct       = totalContract > 0 ? Math.round((paidToDate / totalContract) * 100) : 0;

  const hasInvoices = invoices.length > 0;

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
            Payments & Invoices
          </div>
        </div>

        {loading ? (
          /* ── Loading ── */
          <div className="flex items-center justify-center py-24">
            <div className="text-[11px] font-light" style={{ color: MUTED }}>Loading your financial summary…</div>
          </div>
        ) : !hasInvoices ? (
          /* ── Empty State ── */
          <>
            <div
              className="mb-8 p-8 flex flex-col items-center text-center gap-3"
              style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}` }}
            >
              <div
                className="w-14 h-14 flex items-center justify-center mb-2"
                style={{ backgroundColor: 'rgba(157,126,63,0.06)', border: `1px solid rgba(157,126,63,0.18)` }}
              >
                <DollarSign className="w-6 h-6" style={{ color: GOLDF }} strokeWidth={1} />
              </div>
              <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 22, color: DARK }}>
                No invoices issued yet.
              </div>
              <p className="text-[12px] font-light max-w-sm" style={{ color: MUTED }}>
                Your payment schedule will appear here once your project contract is signed. Invoices are also sent directly to your email.
              </p>
            </div>

            {/* Contact card */}
            <div
              className="p-7 flex flex-col md:flex-row md:items-center gap-6"
              style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}` }}
            >
              <div className="flex-1">
                <div className="text-[9px] uppercase tracking-[0.44em] font-bold mb-2" style={{ color: GOLD }}>
                  Questions About Payments?
                </div>
                <p className="text-[13px] font-light" style={{ color: MUTED }}>
                  Contact <span className="font-semibold" style={{ color: DARK }}>{BUILDER.name}</span> directly for payment instructions, financing options, or to discuss your project budget.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                <a
                  href={`tel:${BUILDER.phone.replace(/\D/g,'')}`}
                  className="flex items-center gap-2 text-[9px] uppercase tracking-[0.22em] font-bold px-5 py-3 transition-opacity hover:opacity-80"
                  style={{ backgroundColor: GOLD, color: CREAM }}
                >
                  <Phone className="w-3 h-3" strokeWidth={2} />
                  {BUILDER.phone}
                </a>
                <a
                  href={`mailto:${BUILDER.email}`}
                  className="flex items-center gap-2 text-[9px] uppercase tracking-[0.22em] font-bold px-5 py-3 transition-all"
                  style={{ border: `1px solid ${BORDER}`, color: MUTED }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = GOLD; (e.currentTarget as HTMLElement).style.color = GOLD; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = BORDER; (e.currentTarget as HTMLElement).style.color = MUTED; }}
                >
                  <Mail className="w-3 h-3" strokeWidth={2} />
                  {BUILDER.email}
                </a>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* ── Summary tiles ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {[
                {
                  label: 'Total Contract Value', value: fmt(totalContract), sub: null,
                  Icon: DollarSign, iconBg: 'rgba(26,20,16,0.06)', iconColor: MUTED, valueColor: DARK,
                },
                {
                  label: 'Paid to Date', value: fmt(paidToDate), sub: `${paidPct}% of total`,
                  Icon: CheckCircle, iconBg: 'rgba(16,185,129,0.1)', iconColor: '#10b981', valueColor: '#10b981',
                },
                {
                  label: 'Balance Remaining', value: fmt(balance), sub: null,
                  Icon: Clock, iconBg: 'rgba(157,126,63,0.08)', iconColor: GOLDF, valueColor: DARK,
                },
              ].map(tile => {
                const Icon = tile.Icon;
                return (
                  <div key={tile.label} className="p-6" style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}` }}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="text-[9px] uppercase tracking-[0.32em] font-bold" style={{ color: MUTED }}>
                        {tile.label}
                      </div>
                      <div className="w-7 h-7 flex items-center justify-center shrink-0" style={{ backgroundColor: tile.iconBg }}>
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
                style={{ gridTemplateColumns: '1fr 2fr 1fr 1fr 100px', gap: '1rem', borderBottom: `1px solid ${BORDER}` }}
              >
                {['Invoice', 'Description', 'Amount', 'Due Date', 'Status'].map(h => (
                  <div key={h} className="text-[9px] uppercase tracking-[0.24em] font-bold" style={{ color: MUTED }}>{h}</div>
                ))}
              </div>

              {invoices.map((inv, i) => {
                const rawStatus = (inv.status ?? 'upcoming').toLowerCase() as InvoiceStatus;
                const sc = STATUS_STYLE[rawStatus] ?? STATUS_STYLE.upcoming;
                const invLabel = inv.invoice_number ?? inv.id.slice(0, 8).toUpperCase();
                return (
                  <div
                    key={inv.id}
                    className="px-7 py-4"
                    style={{ borderBottom: i < invoices.length - 1 ? `1px solid ${BORDER}` : 'none' }}
                  >
                    {/* Desktop grid */}
                    <div className="hidden md:grid items-center" style={{ gridTemplateColumns: '1fr 2fr 1fr 1fr 100px', gap: '1rem' }}>
                      <div className="text-[11px] font-bold" style={{ color: DARK }}>{invLabel}</div>
                      <div className="text-[12px] font-light" style={{ color: DARK }}>{inv.description}</div>
                      <div className="text-[12px] font-bold" style={{ color: DARK }}>{fmt(inv.amount)}</div>
                      <div className="text-[11px] font-light" style={{ color: MUTED }}>{fmtDate(inv.due_date)}</div>
                      <div>
                        <span
                          className="text-[7px] uppercase tracking-[0.24em] font-bold px-2.5 py-1"
                          style={{ backgroundColor: sc.bg, color: sc.text }}
                        >
                          {sc.label}
                        </span>
                      </div>
                    </div>

                    {/* Mobile stacked */}
                    <div className="md:hidden flex items-start justify-between gap-4">
                      <div>
                        <div className="text-[11px] font-bold mb-0.5" style={{ color: DARK }}>{inv.description}</div>
                        <div className="text-[9px]" style={{ color: MUTED }}>{invLabel} · Due {fmtDate(inv.due_date)}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className="text-[13px] font-bold" style={{ color: DARK }}>{fmt(inv.amount)}</div>
                        <span
                          className="text-[7px] uppercase tracking-[0.24em] font-bold px-2 py-0.5"
                          style={{ backgroundColor: sc.bg, color: sc.text }}
                        >
                          {sc.label}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* ── Change Orders ── */}
            {changeOrders.length > 0 && (
              <div className="mb-8" style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}` }}>
                <div className="px-7 py-5 flex items-center justify-between" style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <div className="text-[9px] uppercase tracking-[0.44em] font-bold" style={{ color: GOLD }}>Change Orders</div>
                  {changeOrders.some(co => co.status === 'pending') && (
                    <span className="text-[7px] uppercase tracking-[0.2em] font-bold px-2 py-1"
                      style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
                      Action Required
                    </span>
                  )}
                </div>
                {changeOrders.map((co, i) => {
                  const coStatus = {
                    pending:  { bg: 'rgba(245,158,11,0.1)',  text: '#f59e0b', label: 'Awaiting Approval' },
                    approved: { bg: 'rgba(16,185,129,0.1)',  text: '#10b981', label: 'Approved' },
                    rejected: { bg: 'rgba(239,68,68,0.1)',   text: '#ef4444', label: 'Declined' },
                  }[co.status] ?? { bg: 'rgba(26,20,16,0.06)', text: MUTED, label: co.status };
                  return (
                    <div key={co.id} className="px-7 py-5"
                      style={{ borderBottom: i < changeOrders.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {co.number && (
                              <span className="text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: MUTED }}>{co.number}</span>
                            )}
                            <span
                              className="text-[7px] uppercase tracking-[0.2em] font-bold px-2 py-0.5"
                              style={{ backgroundColor: coStatus.bg, color: coStatus.text }}
                            >
                              {coStatus.label}
                            </span>
                          </div>
                          <div className="text-[13px] font-light" style={{ color: DARK }}>{co.description}</div>
                          <div className="text-[9px] mt-1 font-light" style={{ color: MUTED }}>
                            Issued {new Date(co.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-[16px] font-bold" style={{ color: co.amount >= 0 ? DARK : '#ef4444' }}>
                            {co.amount >= 0 ? '+' : ''}{fmt(co.amount)}
                          </div>
                          {co.status === 'pending' && (
                            <p className="text-[9px] font-light mt-1" style={{ color: MUTED }}>
                              Contact Jeff Ali to approve
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── Footer note ── */}
        <div
          className="flex items-start gap-3 px-5 py-4"
          style={{ backgroundColor: 'rgba(26,20,16,0.025)', border: `1px solid ${BORDER}` }}
        >
          <div className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: GOLD }} />
          <p className="text-[11px] font-light leading-relaxed" style={{ color: MUTED }}>
            All payments processed via secure bank transfer.{' '}
            <span style={{ color: DARK, fontWeight: 500 }}>Contact {BUILDER.name}</span> for payment
            instructions —{' '}
            <a href={`tel:${BUILDER.phone.replace(/\D/g,'')}`} className="transition-opacity hover:opacity-70" style={{ color: GOLD }}>
              {BUILDER.phone}
            </a>{' '}
            or{' '}
            <a href={`mailto:${BUILDER.email}`} className="transition-opacity hover:opacity-70" style={{ color: GOLD }}>
              {BUILDER.email}
            </a>
          </p>
        </div>
      </motion.div>
    </PortalLayout>
  );
}
