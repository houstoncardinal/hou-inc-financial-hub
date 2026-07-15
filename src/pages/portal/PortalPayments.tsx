import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, DollarSign, Phone, Mail, TrendingUp, ExternalLink } from 'lucide-react';
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
  line_items?: { qty?: number; rate?: number }[];
  tax_rate?: number;
  stripe_payment_link?: string;
  external_invoice_url?: string;
  external_invoice_provider?: string;
  external_invoice_number?: string;
}

interface ChangeOrder {
  id: string;
  title?: string;
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

const invoiceAmount = (inv: Invoice) => {
  if (Number.isFinite(Number(inv.amount))) return Number(inv.amount);
  const subtotal = (inv.line_items ?? []).reduce((s, item) => s + Number(item.qty ?? 0) * Number(item.rate ?? 0), 0);
  return subtotal * (1 + Number(inv.tax_rate ?? 0) / 100);
};

const invoicePayUrl = (inv: Invoice) => inv.external_invoice_url || inv.stripe_payment_link;

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
      // Fetch by portal_client_id FK first, fall back to email match
      const { data: byId } = await (supabase as any)
        .from('invoices')
        .select('*')
        .eq('portal_client_id', client.id)
        .order('due_date', { ascending: true });
      if (byId && byId.length > 0) {
        setInvoices(byId);
      } else {
        const { data: byEmail } = await (supabase as any)
          .from('invoices')
          .select('*')
          .eq('client_email', client.email)
          .order('due_date', { ascending: true });
        setInvoices(byEmail ?? []);
      }

      // Change orders — graceful fallback if table doesn't exist yet
      try {
        const { data: coData } = await (supabase as any)
          .from('change_orders')
          .select('id, title, description, amount, status, created_at')
          .eq('client_id', client.id)
          .order('created_at', { ascending: false });
        setChangeOrders(coData ?? []);
      } catch { /* table not yet created */ }

      setLoading(false);
    })();
  }, [client?.id, client?.email]);

  if (!client) return null;

  const totalContract = invoices.reduce((s, inv) => s + invoiceAmount(inv), 0);
  const paidToDate    = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + invoiceAmount(i), 0);
  const balance       = totalContract - paidToDate;
  const paidPct       = totalContract > 0 ? Math.round((paidToDate / totalContract) * 100) : 0;

  const hasInvoices = invoices.length > 0;

  const SBG = '#0D0A06';

  return (
    <PortalLayout>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* ── Hero header ── */}
        <div style={{ backgroundColor: SBG, borderBottom: '1px solid rgba(157,126,63,0.1)', position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: 'radial-gradient(rgba(157,126,63,0.05) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }} />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: GOLD }} />
          <div className="px-5 sm:px-8 md:px-10 pt-7 pb-6">
            <div className="text-[7px] uppercase tracking-[0.48em] font-bold mb-4" style={{ color: GOLD }}>Finance</div>
            <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(30px, 5vw, 48px)', color: WHITE, lineHeight: 1.03 }}>
              Payments & Invoices
            </div>
            {hasInvoices && !loading && (
              <div className="mt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 18 }}>
                {/* Payment progress bar */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[7px] uppercase tracking-[0.3em] font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    Payment Progress
                  </span>
                  <span className="text-[10px] font-bold" style={{ color: GOLDF }}>{paidPct}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}>
                  <motion.div className="h-full" style={{ backgroundColor: GOLD }}
                    initial={{ width: 0 }}
                    animate={{ width: `${paidPct}%` }}
                    transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
                  />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <TrendingUp className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.2)' }} strokeWidth={1.5} />
                  <span className="text-[9px] font-light" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    {fmt(paidToDate)} paid of {fmt(totalContract)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-5 sm:px-8 md:px-10 py-6 sm:py-8 max-w-5xl">

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
                style={{ gridTemplateColumns: '1fr 2fr 1fr 1fr 160px', gap: '1rem', borderBottom: `1px solid ${BORDER}` }}
              >
                {['Invoice', 'Description', 'Amount', 'Due Date', 'Status'].map(h => (
                  <div key={h} className="text-[9px] uppercase tracking-[0.24em] font-bold" style={{ color: MUTED }}>{h}</div>
                ))}
              </div>

              {invoices.map((inv, i) => {
                const rawStatus = (inv.status ?? 'upcoming').toLowerCase() as InvoiceStatus;
                const sc = STATUS_STYLE[rawStatus] ?? STATUS_STYLE.upcoming;
                const invLabel = inv.external_invoice_number || inv.invoice_number || inv.id.slice(0, 8).toUpperCase();
                const payUrl = invoicePayUrl(inv);
                const amount = invoiceAmount(inv);
                return (
                  <div
                    key={inv.id}
                    className="px-7 py-4"
                    style={{ borderBottom: i < invoices.length - 1 ? `1px solid ${BORDER}` : 'none' }}
                  >
                    {/* Desktop grid */}
                    <div className="hidden md:grid items-center" style={{ gridTemplateColumns: '1fr 2fr 1fr 1fr 160px', gap: '1rem' }}>
                      <div className="text-[11px] font-bold" style={{ color: DARK }}>{invLabel}</div>
                      <div className="text-[12px] font-light" style={{ color: DARK }}>{inv.description}</div>
                      <div className="text-[12px] font-bold" style={{ color: DARK }}>{fmt(amount)}</div>
                      <div className="text-[11px] font-light" style={{ color: MUTED }}>{fmtDate(inv.due_date)}</div>
                      <div className="flex items-center gap-2 justify-between">
                        <span
                          className="text-[7px] uppercase tracking-[0.24em] font-bold px-2.5 py-1"
                          style={{ backgroundColor: sc.bg, color: sc.text }}
                        >
                          {sc.label}
                        </span>
                        {payUrl && rawStatus !== 'paid' && (
                          <a href={payUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[7px] uppercase tracking-[0.2em] font-bold px-2.5 py-1 transition-opacity hover:opacity-75" style={{ backgroundColor: DARK, color: WHITE }}>
                            Pay <ExternalLink className="w-2.5 h-2.5" strokeWidth={2} />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Mobile stacked */}
                    <div className="md:hidden flex items-start justify-between gap-4">
                      <div>
                        <div className="text-[11px] font-bold mb-0.5" style={{ color: DARK }}>{inv.description}</div>
                        <div className="text-[9px]" style={{ color: MUTED }}>{invLabel} · Due {fmtDate(inv.due_date)}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className="text-[13px] font-bold" style={{ color: DARK }}>{fmt(amount)}</div>
                        <span
                          className="text-[7px] uppercase tracking-[0.24em] font-bold px-2 py-0.5"
                          style={{ backgroundColor: sc.bg, color: sc.text }}
                        >
                          {sc.label}
                        </span>
                        {payUrl && rawStatus !== 'paid' && (
                          <a href={payUrl} target="_blank" rel="noreferrer" className="text-[7px] uppercase tracking-[0.2em] font-bold px-2 py-1 mt-1" style={{ backgroundColor: DARK, color: WHITE }}>
                            Pay Invoice
                          </a>
                        )}
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
                            {co.title && (
                              <span className="text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: MUTED }}>{co.title}</span>
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
                              Contact {BUILDER.name} to approve
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
            className="mt-8 flex items-start gap-3 px-5 py-4"
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
        </div>
      </motion.div>
    </PortalLayout>
  );
}
