import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight, FileText, MessageSquare, Calendar, CheckCircle,
  Circle, FolderOpen, Clock, AlertCircle, ChevronRight,
  Building2, Phone, Mail, GitBranch, Star, Camera, Wallet,
  MapPin, Ruler, Palette, PiggyBank,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Area, ComposedChart, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts';
import PortalLayout from '@/components/PortalLayout';
import { usePortal, BUILDER } from '@/hooks/usePortal';
import { supabase } from '@/integrations/supabase/client';

/* ── Tokens — admin's light, cool-neutral card system, with a black signature
   portal's one signature accent instead of admin's monochrome black ── */
const DARK   = '#111827';
const MUTED  = '#6B7280';
const ACCENT      = '#000000';
const ACCENT_SOFT = '#404040';
const BORDER = '#E5E7EB';
const SERIF  = "'Cormorant Garamond', Georgia, serif";
const WHITE  = '#FFFFFF';

/* Bento card recipe — mirrors the admin dashboard's .ov-card (20px radius,
   layered shadow, hover lift). */
const PF_CSS = `
.pf-card{position:relative;background:#fff;border-radius:20px;border:1px solid ${BORDER};box-shadow:0 1px 3px rgba(17,24,39,.04),0 8px 24px rgba(17,24,39,.05);transition:box-shadow .3s cubic-bezier(.16,1,.3,1),border-color .2s ease;}
.pf-card:hover{border-color:rgba(0,0,0,.35);box-shadow:0 6px 18px rgba(17,24,39,.05),0 18px 44px rgba(17,24,39,.08);}
.pf-tile{position:relative;border-radius:16px;background:#fff;border:1px solid ${BORDER};box-shadow:0 1px 3px rgba(17,24,39,.04);transition:all .25s cubic-bezier(.16,1,.3,1);}
.pf-tile:hover{transform:translateY(-2px);box-shadow:0 6px 22px rgba(17,24,39,.08);border-color:rgba(0,0,0,.32);}
.pf-tile.accent{background:rgba(0,0,0,.06);border-color:rgba(0,0,0,.24);}
.pf-tile.accent:hover{border-color:${ACCENT};}
`;

const STATUS_STEPS = [
  { key: 'registered',             label: 'Account Created',         detail: "You're in our system" },
  { key: 'brief_submitted',        label: 'Project Brief Submitted', detail: 'Builder reviews your vision' },
  { key: 'consultation_scheduled', label: 'Consultation Scheduled',  detail: 'First call with your team' },
  { key: 'proposal_sent',          label: 'Proposal Delivered',      detail: 'Review scope & pricing' },
  { key: 'in_progress',            label: 'Build Underway',          detail: 'Construction has begun' },
];

function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function getStepIndex(brief: ReturnType<ReturnType<typeof usePortal>['getBrief']>) {
  if (!brief) return 0;
  if (brief.status === 'in_progress') return 4;
  if (brief.status === 'consultation_scheduled') return 2;
  if (brief.status === 'reviewing' || brief.status === 'submitted') return 1;
  return 0;
}

/* ── SVG progress ring ──────────────────────────────────────────────── */
function ProgressRing({ pct, size = 80 }: { pct: number; size?: number }) {
  const sw  = 5;
  const r   = (size - sw * 2) / 2;
  const c   = 2 * Math.PI * r;
  const arc = Math.min(pct, 100) / 100 * c;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ display: 'block', transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="rgba(0,0,0,0.14)" strokeWidth={sw} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={ACCENT} strokeWidth={sw} strokeLinecap="butt"
          strokeDasharray={`${arc} ${c - arc}`}
          initial={{ strokeDasharray: `0 ${c}` }}
          animate={{ strokeDasharray: `${arc} ${c - arc}` }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontFamily: SERIF, fontSize: size * 0.22, fontWeight: 700, color: ACCENT, lineHeight: 1 }}>
          {pct}%
        </div>
        <div style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.16em', color: MUTED, fontWeight: 700, marginTop: 3 }}>
          done
        </div>
      </div>
    </div>
  );
}

/* ── Motion variants ─────────────────────────────────────────────────── */
const fade    = { hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.03, delayChildren: 0.01 } } };

/* ── Investment Progress — real invoice data, same query shape as PortalPayments ── */
interface Invoice {
  id: string;
  amount: number;
  due_date: string;
  status: 'paid' | 'pending' | 'upcoming';
  line_items?: { qty?: number; rate?: number }[];
  tax_rate?: number;
}
interface ProjectPhoto {
  id: string;
  url: string;
  caption?: string;
  phase_label?: string;
  taken_at?: string;
}

const fmtCurrency = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });

const fmtShortDate = (d: string) => {
  try { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
  catch { return d; }
};

function timeAgo(ts: string | null | undefined): string {
  if (!ts) return '—';
  const t = new Date(ts).getTime();
  if (isNaN(t)) return '—';
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d ago`;
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const invoiceAmount = (inv: Invoice) => {
  if (Number.isFinite(Number(inv.amount))) return Number(inv.amount);
  const subtotal = (inv.line_items ?? []).reduce((s, item) => s + Number(item.qty ?? 0) * Number(item.rate ?? 0), 0);
  return subtotal * (1 + Number(inv.tax_rate ?? 0) / 100);
};

/* Light, portal‑themed tooltip — matches the white‑card aesthetic (not a dark floating panel) */
function PaymentTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const paid = payload.find((p: any) => p.dataKey === 'paid')?.value ?? 0;
  return (
    <div className="px-3 py-2 rounded-xl shadow-2xl" style={{ background: 'rgba(255,255,255,.97)', backdropFilter: 'blur(10px)', border: `1px solid ${BORDER}` }}>
      <div className="text-[7px] uppercase tracking-[0.16em] font-bold mb-1" style={{ color: MUTED }}>{label}</div>
      <div className="text-[12px] font-bold tabular-nums" style={{ color: ACCENT, fontFamily: SERIF }}>{fmtCurrency(paid)} paid to date</div>
    </div>
  );
}

/* Magnetic glow crosshair — same "scrub the timeline" feel as the admin dashboard's chart,
   rendered in black to match this card's palette. */
function AccentMagneticCursor(props: any) {
  const { points, height } = props;
  const x = points?.[0]?.x;
  if (x == null || !height) return null;
  return (
    <g pointerEvents="none">
      <line x1={x} y1={0} x2={x} y2={height} stroke="url(#accent-glow-line)" strokeWidth={10} />
      <line x1={x} y1={0} x2={x} y2={height} stroke={ACCENT} strokeOpacity={0.22} strokeWidth={1} strokeDasharray="2 3" />
    </g>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   PORTAL DASHBOARD
════════════════════════════════════════════════════════════════════════ */
export default function PortalDashboard() {
  const { client, loaded, getBrief, getMessages, getDocuments, getMeetings } = usePortal();
  const navigate = useNavigate();

  /* ── Milestone progress — must be before the early return (Rules of Hooks) ── */
  const [milestonePct, setMilestonePct]       = useState<number | null>(null);
  const [activeMilestone, setActiveMilestone] = useState<string | null>(null);

  useEffect(() => {
    if (!loaded) return;
    if (!client) navigate('/portal', { replace: true });
    else if (client.status === 'pending_approval' || client.status === 'rejected') navigate('/portal', { replace: true });
  }, [client, loaded, navigate]);

  useEffect(() => {
    if (!client?.id) return;
    const si = getStepIndex(getBrief());
    (supabase as any)
      .from('project_milestones')
      .select('id, phase_name, completed_date, is_active')
      .eq('client_id', client.id)
      .order('sort_order', { ascending: true })
      .then(({ data }: any) => {
        if (!data || data.length === 0) {
          setMilestonePct(Math.round((si / (STATUS_STEPS.length - 1)) * 100));
          return;
        }
        const total     = data.length;
        const completed = data.filter((r: any) => r.completed_date).length;
        const active    = data.find((r: any) => r.is_active);
        setMilestonePct(Math.round(((completed + (active ? 0.5 : 0)) / total) * 100));
        if (active) setActiveMilestone(active.phase_name || null);
      });
  }, [client?.id]);

  /* ── Investment progress — invoices via the get_portal_invoices RPC, same
     shape as PortalPayments so the two screens always agree. ── */
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  useEffect(() => {
    if (!client) return;
    (async () => {
      const { data } = await (supabase as any)
        .rpc('get_portal_invoices');
      setInvoices(data ?? []);
    })();
  }, [client?.id, client?.email]);

  /* ── Progress photos — most recent uploads, live‑synced from the admin side ── */
  const [photos, setPhotos] = useState<ProjectPhoto[]>([]);
  useEffect(() => {
    if (!client?.id) return;
    const load = () => (supabase as any)
      .from('project_photos').select('id, url, caption, phase_label, taken_at')
      .eq('client_id', client.id).order('taken_at', { ascending: false })
      .then(({ data }: any) => setPhotos(data ?? []));
    load();
    const channel = supabase
      .channel(`portal-dashboard-photos-${client.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_photos', filter: `client_id=eq.${client.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [client?.id]);

  const totalContract = useMemo(() => invoices.reduce((s, inv) => s + invoiceAmount(inv), 0), [invoices]);
  const paidToDate = useMemo(() => invoices.filter(i => i.status === 'paid').reduce((s, inv) => s + invoiceAmount(inv), 0), [invoices]);
  const paymentChartData = useMemo(() => {
    const paid = [...invoices].filter(i => i.status === 'paid').sort((a, b) => a.due_date.localeCompare(b.due_date));
    let running = 0;
    return paid.map(inv => { running += invoiceAmount(inv); return { label: fmtShortDate(inv.due_date), paid: running }; });
  }, [invoices]);

  if (!loaded || !client || (client.status && client.status !== 'approved')) return null;

  const brief       = getBrief();
  const messages    = getMessages();
  const docs        = getDocuments();
  const meetings    = getMeetings();
  const stepIdx     = getStepIndex(brief);
  const recentMsgs  = messages.slice(-3).reverse();
  const pendingDocs = docs.filter(d => d.status === 'pending').length;
  const nextMeeting = meetings.find(m => m.status === 'confirmed' || m.status === 'requested');
  const builderMsgs = messages.filter(m => m.sender === 'builder');
  const unreadCount = builderMsgs.length;
  const balance     = totalContract - paidToDate;
  const paidPct     = totalContract > 0 ? Math.round((paidToDate / totalContract) * 100) : 0;

  const ringPct = milestonePct ?? Math.round((stepIdx / (STATUS_STEPS.length - 1)) * 100);

  /* ── Notices & Updates — one unified, chronological feed instead of
     three separate "did something change" checks the client has to make ── */
  type Notice = { id: string; icon: typeof MessageSquare; color: string; title: string; sub: string; ts: string; to: string };
  const notices: Notice[] = [
    ...builderMsgs.map((m): Notice => ({
      id: `msg-${m.id}`, icon: MessageSquare, color: '#3b82f6',
      title: `${m.senderName} sent a message`, sub: m.text, ts: m.timestamp, to: '/portal/messages',
    })),
    ...docs.filter(d => d.status === 'pending').map((d): Notice => ({
      id: `doc-${d.id}`, icon: AlertCircle, color: '#f59e0b',
      title: 'Document requested', sub: d.name, ts: d.uploadedAt ?? new Date().toISOString(), to: '/portal/documents',
    })),
    ...photos.slice(0, 3).map((p): Notice => ({
      id: `photo-${p.id}`, icon: Camera, color: ACCENT,
      title: 'New progress photo', sub: p.phase_label ?? p.caption ?? 'Job site update', ts: p.taken_at ?? new Date().toISOString(), to: '/portal/gallery',
    })),
    ...(nextMeeting ? [{
      id: `meet-${nextMeeting.id}`, icon: Calendar, color: '#8b5cf6',
      title: nextMeeting.status === 'confirmed' ? 'Meeting confirmed' : 'Meeting requested',
      sub: `${nextMeeting.type} · ${nextMeeting.date}`, ts: nextMeeting.createdAt, to: '/portal/meetings',
    } as Notice] : []),
  ].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()).slice(0, 6);

  const QUICK_ACTIONS = [
    {
      to: '/portal/project',    Icon: FileText,
      label: brief ? 'Project Brief' : 'Complete Brief',
      sub:   brief ? `Status: ${brief.status}` : '5 min · Unlock next steps',
      accent: !brief,
    },
    {
      to: '/portal/milestones', Icon: GitBranch,
      label: 'Timeline',
      sub:   activeMilestone ? `Active: ${activeMilestone}` : 'View project milestones',
      accent: false,
    },
    {
      to: '/portal/messages',   Icon: MessageSquare,
      label: 'Messages',
      sub:   messages.length > 0 ? `${messages.length} messages` : 'Contact your consultant',
      accent: false,
    },
    {
      to: '/portal/documents',  Icon: FolderOpen,
      label: 'Documents',
      sub:   pendingDocs > 0 ? `${pendingDocs} awaiting upload` : 'Manage your files',
      accent: pendingDocs > 0,
    },
  ];

  return (
    <PortalLayout>
      <style>{PF_CSS}</style>
      <motion.div variants={stagger} initial="hidden" animate="show">

        {/* Main content */}
        <div className="px-4 sm:px-6 md:px-10 py-5 sm:py-6">

          {/* ══════════════════════════════════════════════════
              HERO — contained bento card, matching admin's grid-of-cards
          ══════════════════════════════════════════════════ */}
          <motion.div variants={fade} className="pf-card mb-5" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${ACCENT} 0%, ${ACCENT_SOFT} 100%)`, borderRadius: '20px 20px 0 0' }} />
            <div className="px-5 sm:px-8 pt-6 pb-0">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="text-[7px] uppercase tracking-[0.44em] font-bold mb-1.5" style={{ color: ACCENT }}>
                    {getGreeting()}
                  </div>
                  <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(28px,6vw,46px)', color: DARK, lineHeight: 1.05 }}>
                    {client.name.split(' ')[0]}.
                  </div>
                  <span className="inline-block mt-2 text-[7px] uppercase tracking-[0.24em] font-bold px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: 'rgba(0,0,0,0.1)', color: ACCENT, border: '1px solid rgba(0,0,0,0.22)' }}>
                    {STATUS_STEPS[stepIdx]?.label} · Phase {stepIdx + 1}/{STATUS_STEPS.length}
                  </span>
                </div>
                <ProgressRing pct={ringPct} size={72} />
              </div>

              {/* Stats strip */}
              <div className="flex items-center mt-4" style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12, paddingBottom: 14 }}>
                {[
                  { n: messages.length, label: 'Messages',  to: '/portal/messages',  color: '#3b82f6' },
                  { n: docs.length,     label: 'Documents', to: '/portal/documents', color: pendingDocs > 0 ? '#f59e0b' : '#10b981' },
                  { n: meetings.length, label: 'Meetings',  to: '/portal/meetings',  color: '#8b5cf6' },
                ].map(({ n, label, to, color }, i) => (
                  <Link key={label} to={to} className="flex items-center transition-opacity hover:opacity-75">
                    {i > 0 && <div className="w-px h-6 mx-4 sm:mx-5" style={{ backgroundColor: BORDER }} />}
                    <div>
                      <div style={{ fontFamily: SERIF, fontSize: 'clamp(18px,3.5vw,22px)', fontWeight: 700, color, lineHeight: 1 }}>{n}</div>
                      <div style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.22em', color: MUTED, fontWeight: 600, marginTop: 2 }}>{label}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>

          {/* ── Account Snapshot — real KPI tiles, not just navigation shortcuts ── */}
          <motion.div variants={fade} className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
            {[
              {
                label: 'Project Progress', value: `${ringPct}%`, to: '/portal/milestones',
                icon: GitBranch, color: ACCENT,
                sub: activeMilestone ? activeMilestone : STATUS_STEPS[stepIdx]?.label,
              },
              {
                label: 'Balance Due', value: totalContract > 0 ? fmtCurrency(balance) : '—', to: '/portal/payments',
                icon: Wallet, color: balance > 0 ? ACCENT : '#10b981',
                sub: totalContract > 0 ? `${paidPct}% funded` : 'No invoices yet',
              },
              {
                label: 'Next Meeting', value: nextMeeting ? fmtShortDate(nextMeeting.date) : '—', to: '/portal/meetings',
                icon: Calendar, color: '#8b5cf6',
                sub: nextMeeting ? nextMeeting.type : 'None scheduled',
              },
              {
                label: 'Needs Attention', value: String(pendingDocs + unreadCount), to: pendingDocs >= unreadCount ? '/portal/documents' : '/portal/messages',
                icon: AlertCircle, color: (pendingDocs + unreadCount) > 0 ? '#f59e0b' : '#10b981',
                sub: (pendingDocs + unreadCount) > 0 ? 'Open items' : 'All caught up',
              },
            ].map(kpi => (
              <Link key={kpi.label} to={kpi.to} className="pf-tile p-3.5 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[6.5px] uppercase tracking-[0.16em] font-bold truncate" style={{ color: MUTED }}>{kpi.label}</span>
                  <kpi.icon className="w-3 h-3 shrink-0" style={{ color: kpi.color }} strokeWidth={1.75} />
                </div>
                <div style={{ fontFamily: SERIF, fontSize: 'clamp(18px,3vw,22px)', fontWeight: 700, color: DARK, lineHeight: 1 }}>{kpi.value}</div>
                <div className="text-[8px] font-light truncate" style={{ color: MUTED }}>{kpi.sub}</div>
              </Link>
            ))}
          </motion.div>

          {/* ── Your Project — the actual brief specifics (type, location, size,
              budget, timeline, style), fetched but never surfaced anywhere else
              on the dashboard until now. ── */}
          {brief && (
            <motion.div variants={fade} className="mb-3">
              <div className="pf-card p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3 mb-3.5">
                  <div className="text-[7px] uppercase tracking-[0.36em] font-bold" style={{ color: ACCENT }}>Your Project</div>
                  <Link to="/portal/project" className="flex items-center gap-1 text-[8px] uppercase tracking-[0.16em] font-bold hover:opacity-70 transition-opacity shrink-0" style={{ color: ACCENT }}>
                    Edit Brief <ArrowUpRight className="w-3 h-3" strokeWidth={2} />
                  </Link>
                </div>
                <div style={{ fontFamily: SERIF, fontSize: 'clamp(16px,2.6vw,19px)', fontWeight: 700, color: DARK, lineHeight: 1.2 }} className="mb-3.5">
                  {brief.type || 'Custom Project'}{brief.location ? ` — ${brief.location}` : ''}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { Icon: MapPin, label: 'Location', value: brief.location || '—' },
                    { Icon: Ruler, label: 'Size', value: brief.sqft || '—' },
                    { Icon: PiggyBank, label: 'Budget', value: brief.budget || '—' },
                    { Icon: Clock, label: 'Timeline', value: brief.timeline || '—' },
                  ].map(({ Icon, label, value }) => (
                    <div key={label} className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Icon className="w-2.5 h-2.5 shrink-0" style={{ color: MUTED }} strokeWidth={1.75} />
                        <span className="text-[6.5px] uppercase tracking-[0.14em] font-bold truncate" style={{ color: MUTED }}>{label}</span>
                      </div>
                      <div className="text-[11px] font-semibold truncate" style={{ color: DARK }}>{value}</div>
                    </div>
                  ))}
                </div>
                {(brief.bedrooms || brief.bathrooms || (brief.style?.length ?? 0) > 0) && (
                  <div className="mt-3.5 pt-3.5 flex flex-wrap items-center gap-x-4 gap-y-2" style={{ borderTop: `1px solid ${BORDER}` }}>
                    {brief.bedrooms && (
                      <span className="text-[9px] font-medium" style={{ color: MUTED }}>
                        <strong style={{ color: DARK }}>{brief.bedrooms}</strong> bed
                      </span>
                    )}
                    {brief.bathrooms && (
                      <span className="text-[9px] font-medium" style={{ color: MUTED }}>
                        <strong style={{ color: DARK }}>{brief.bathrooms}</strong> bath
                      </span>
                    )}
                    {brief.style?.length > 0 && (
                      <span className="flex items-center gap-1.5 text-[9px] font-medium" style={{ color: MUTED }}>
                        <Palette className="w-2.5 h-2.5" style={{ color: MUTED }} strokeWidth={1.75} />
                        {brief.style.join(', ')}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── Unread alert + active milestone (collapsed into one row when both exist) ── */}
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.div key="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-3 overflow-hidden">
                <Link to="/portal/messages"
                  className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl transition-opacity hover:opacity-90 active:opacity-75"
                  style={{ backgroundColor: 'rgba(0,0,0,0.07)', border: '1px solid rgba(0,0,0,0.24)' }}>
                  <div className="flex items-center gap-2.5">
                    <div className="relative shrink-0">
                      <MessageSquare className="w-3.5 h-3.5" style={{ color: ACCENT }} strokeWidth={1.5} />
                      <span className="absolute -top-1.5 -right-2 w-3.5 h-3.5 flex items-center justify-center text-[7px] font-black"
                        style={{ backgroundColor: ACCENT, color: WHITE }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                    </div>
                    <span className="text-[11px] font-semibold" style={{ color: DARK }}>{unreadCount === 1 ? '1 message' : `${unreadCount} messages`} from {BUILDER.name}</span>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 shrink-0" style={{ color: ACCENT_SOFT }} strokeWidth={2} />
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          {activeMilestone && (
            <motion.div variants={fade} className="mb-3">
              <Link to="/portal/milestones"
                className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl transition-all hover:shadow-sm"
                style={{ backgroundColor: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.18)' }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ backgroundColor: ACCENT }} />
                  <div>
                    <div className="text-[7px] uppercase tracking-[0.26em] font-bold" style={{ color: ACCENT }}>Current Milestone</div>
                    <div className="text-[11px] font-semibold" style={{ color: DARK }}>{activeMilestone}</div>
                  </div>
                </div>
                <span className="text-[8px] uppercase tracking-[0.18em] font-bold shrink-0" style={{ color: ACCENT_SOFT }}>Timeline →</span>
              </Link>
            </motion.div>
          )}

          {/* ── Notices & Updates — one unified activity feed ── */}
          {notices.length > 0 && (
            <motion.div variants={fade} className="mb-5">
              <div className="flex items-center justify-between mb-2.5">
                <div className="text-[7px] uppercase tracking-[0.36em] font-bold" style={{ color: ACCENT }}>Notices &amp; Updates</div>
              </div>
              <div className="pf-card" style={{ overflow: 'hidden' }}>
                {notices.map((n, i) => (
                  <Link key={n.id} to={n.to}
                    className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-stone-50"
                    style={{ borderBottom: i < notices.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${n.color}18` }}>
                      <n.icon className="w-3.5 h-3.5" style={{ color: n.color }} strokeWidth={1.75} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[10.5px] font-bold truncate" style={{ color: DARK }}>{n.title}</span>
                        <span className="text-[8px] shrink-0" style={{ color: 'rgba(17,24,39,0.32)' }}>{timeAgo(n.ts)}</span>
                      </div>
                      <p className="text-[10px] font-light line-clamp-1 mt-0.5" style={{ color: MUTED }}>{n.sub}</p>
                    </div>
                    <ChevronRight className="w-3 h-3 shrink-0 mt-1.5" style={{ color: 'rgba(17,24,39,0.15)' }} strokeWidth={2} />
                  </Link>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Quick actions (2-col mobile, 4-col desktop) ── */}
          <motion.div variants={fade} className="mb-5">
            <div className="text-[7px] uppercase tracking-[0.36em] font-bold mb-2.5" style={{ color: ACCENT }}>Quick Access</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {QUICK_ACTIONS.map(({ to, Icon, label, sub, accent }) => (
                <Link key={to + label} to={to}
                  className={`pf-tile group p-3.5 flex flex-col gap-2.5 active:scale-[0.97] ${accent ? 'accent' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ backgroundColor: accent ? 'rgba(0,0,0,0.14)' : 'rgba(17,24,39,0.04)' }}>
                      <Icon className="w-3.5 h-3.5" style={{ color: accent ? ACCENT : MUTED }} strokeWidth={1.5} />
                    </div>
                    <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" style={{ color: DARK }} strokeWidth={2} />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold leading-tight mb-0.5" style={{ color: DARK, fontFamily: SERIF }}>{label}</div>
                    <div className="text-[9px] font-light" style={{ color: MUTED }}>{sub}</div>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>

          {/* ── Investment Progress — real payment data, glass area chart ── */}
          {totalContract > 0 && (
            <motion.div variants={fade} className="mb-5">
              <div className="pf-card" style={{ overflow: 'hidden' }}>
                <div style={{ height: 3, background: `linear-gradient(90deg, ${ACCENT} 0%, ${ACCENT_SOFT} 100%)` }} />
                <div className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                    <div>
                      <div className="text-[7px] uppercase tracking-[0.36em] font-bold mb-1.5" style={{ color: ACCENT }}>Investment Progress</div>
                      <div style={{ fontFamily: SERIF, fontSize: 'clamp(24px,4vw,30px)', fontWeight: 700, color: DARK, lineHeight: 1 }}>{fmtCurrency(paidToDate)}</div>
                      <div className="text-[9px] font-light mt-1.5" style={{ color: MUTED }}>paid of {fmtCurrency(totalContract)} contract value</div>
                    </div>
                    <div className="text-left sm:text-right shrink-0">
                      <div style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 700, color: ACCENT, lineHeight: 1 }}>{paidPct}%</div>
                      <div className="text-[7px] uppercase tracking-[0.2em] font-bold mt-1" style={{ color: MUTED }}>funded</div>
                    </div>
                  </div>

                  {/* Click‑through stat row — mirrors the admin dashboard's Revenue/Expenses buttons */}
                  <div className="grid grid-cols-3 gap-3 pb-3.5 mb-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {[
                      { label: 'Contract Value', value: fmtCurrency(totalContract), color: DARK },
                      { label: 'Paid to Date', value: fmtCurrency(paidToDate), color: '#10b981' },
                      { label: 'Balance Due', value: fmtCurrency(balance), color: balance > 0 ? ACCENT : DARK },
                    ].map(stat => (
                      <Link key={stat.label} to="/portal/payments" className="group block">
                        <div className="flex items-center gap-1 mb-0.5">
                          <span className="text-[7px] uppercase tracking-[0.14em] font-bold" style={{ color: MUTED }}>{stat.label}</span>
                          <ArrowUpRight className="w-2 h-2 opacity-0 -translate-x-0.5 transition-all duration-200 group-hover:opacity-60 group-hover:translate-x-0" style={{ color: ACCENT }} strokeWidth={2.5} />
                        </div>
                        <div className="text-[12px] sm:text-[13px] font-bold tabular-nums truncate" style={{ color: stat.color }}>{stat.value}</div>
                      </Link>
                    ))}
                  </div>

                  {paymentChartData.length >= 2 ? (
                    <>
                      <div style={{ height: 130 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={paymentChartData} margin={{ top: 6, right: 8, left: 2, bottom: 2 }}>
                            <defs>
                              <linearGradient id="accent-fill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={ACCENT} stopOpacity={0.4} />
                                <stop offset="100%" stopColor={ACCENT} stopOpacity={0.02} />
                              </linearGradient>
                              <linearGradient id="accent-glow-line" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={ACCENT} stopOpacity={0} />
                                <stop offset="50%" stopColor={ACCENT} stopOpacity={0.16} />
                                <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
                              </linearGradient>
                              <filter id="accent-glow" x="-60%" y="-60%" width="220%" height="220%">
                                <feGaussianBlur stdDeviation="3" result="blur" />
                                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                              </filter>
                            </defs>
                            <CartesianGrid vertical={false} stroke={BORDER} strokeDasharray="3 3" strokeOpacity={0.6} />
                            <XAxis dataKey="label" tick={{ fontSize: 8.5, fill: MUTED, fontWeight: 600 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                            <YAxis hide domain={[0, totalContract * 1.06]} />
                            <Tooltip content={<PaymentTooltip />} cursor={<AccentMagneticCursor />} />
                            <ReferenceLine y={totalContract} stroke={ACCENT} strokeOpacity={0.45} strokeDasharray="4 3" />
                            <Area type="monotone" dataKey="paid" stroke={ACCENT} strokeWidth={2.5} fill="url(#accent-fill)"
                              style={{ filter: 'url(#accent-glow)' }}
                              dot={{ r: 2.5, strokeWidth: 0, fill: ACCENT }} isAnimationActive animationDuration={900} animationEasing="ease-out"
                              activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex items-center justify-center gap-4 mt-1">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-[2.5px] rounded-full" style={{ backgroundColor: ACCENT }} /><span className="text-[8px] font-semibold uppercase tracking-[0.06em]" style={{ color: MUTED }}>Paid</span></span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-[2px]" style={{ borderTop: `2px dashed ${ACCENT}`, opacity: 0.6 }} /><span className="text-[8px] font-semibold uppercase tracking-[0.06em]" style={{ color: MUTED }}>Contract Total</span></span>
                      </div>
                    </>
                  ) : (
                    <div className="py-6 text-center text-[10px] font-light" style={{ color: MUTED }}>
                      Your payment history will appear here as invoices are settled.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Two-column: Timeline + Consultant card ── */}
          <motion.div variants={fade} className="grid md:grid-cols-3 gap-4 mb-5">

            {/* Timeline */}
            <div className="pf-card md:col-span-2" style={{ overflow: 'hidden' }}>
              <div className="px-5 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[7px] uppercase tracking-[0.36em] font-bold mb-0.5" style={{ color: ACCENT }}>Project Journey</div>
                    <div className="text-[10px] font-light" style={{ color: MUTED }}>From first brief to handover</div>
                  </div>
                  <span className="text-[7px] uppercase tracking-[0.16em] font-bold px-2 py-1 shrink-0"
                    style={{ backgroundColor: 'rgba(0,0,0,0.08)', color: ACCENT }}>{stepIdx + 1}/{STATUS_STEPS.length}</span>
                </div>
                <div className="mt-3 h-0.5 overflow-hidden" style={{ backgroundColor: 'rgba(17,24,39,0.07)' }}>
                  <motion.div className="h-full" style={{ backgroundColor: ACCENT }}
                    initial={{ width: 0 }} animate={{ width: `${(stepIdx / (STATUS_STEPS.length - 1)) * 100}%` }}
                    transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.3 }} />
                </div>
              </div>

              <div className="px-5 py-4">
                <div className="relative">
                  <div className="absolute left-[7px] top-3 bottom-3 w-px" style={{ backgroundColor: BORDER }} />
                  <motion.div className="absolute left-[7px] top-3 w-px" style={{ backgroundColor: ACCENT }}
                    initial={{ height: 0 }}
                    animate={{ height: stepIdx === 0 ? 0 : `${Math.min((stepIdx / (STATUS_STEPS.length - 1)) * 100, 90)}%` }}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.35 }} />
                  <div className="space-y-3">
                    {STATUS_STEPS.map((step, i) => {
                      const done = i < stepIdx, current = i === stepIdx;
                      return (
                        <div key={step.key} className="flex items-start gap-3.5 relative">
                          <div className="shrink-0 mt-0.5 z-10 bg-white" style={{ width: 15, height: 15 }}>
                            {done ? (
                              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 22, delay: i * 0.07 }}>
                                <CheckCircle className="w-[15px] h-[15px]" style={{ color: ACCENT }} strokeWidth={2} />
                              </motion.div>
                            ) : current ? (
                              <motion.div className="w-[15px] h-[15px] rounded-full border-2 flex items-center justify-center"
                                style={{ borderColor: ACCENT, backgroundColor: 'rgba(0,0,0,0.1)' }}
                                initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                                <motion.div className="w-2 h-2 rounded-full" style={{ backgroundColor: ACCENT }}
                                  animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 2, repeat: Infinity }} />
                              </motion.div>
                            ) : (
                              <Circle className="w-[15px] h-[15px]" style={{ color: BORDER }} strokeWidth={1.5} />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2" style={{ color: done || current ? DARK : 'rgba(17,24,39,0.22)' }}>
                              <span className="text-[11px] font-bold">{step.label}</span>
                              {current && <span className="text-[7px] uppercase tracking-[0.2em] font-bold px-1.5 py-0.5" style={{ backgroundColor: 'rgba(0,0,0,0.1)', color: ACCENT }}>Current</span>}
                            </div>
                            <div className="text-[9px] font-light" style={{ color: done || current ? MUTED : 'rgba(17,24,39,0.14)' }}>{step.detail}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {!brief && (
                  <div className="mt-4 pt-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5" style={{ borderTop: `1px solid ${BORDER}` }}>
                    <p className="text-[10px] font-light" style={{ color: MUTED }}>Complete your brief to unlock the next step (~5 min)</p>
                    <Link to="/portal/project"
                      className="inline-flex items-center justify-center gap-2 text-[9px] uppercase tracking-[0.2em] font-black px-4 py-2.5 shrink-0 transition-opacity hover:opacity-85"
                      style={{ backgroundColor: ACCENT, color: '#FAF7F2' }}>
                      Start Brief <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} />
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* ── Luxury light consultant card ── */}
            <div className="pf-card" style={{ overflow: 'hidden' }}>
              {/* Accent top rail */}
              <div style={{ height: 3, background: `linear-gradient(90deg, ${ACCENT} 0%, ${ACCENT_SOFT} 100%)` }} />
              {/* Subtle pattern */}
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'radial-gradient(rgba(0,0,0,0.045) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

              <div className="p-5 relative">
                {/* Eyebrow */}
                <div className="flex items-center justify-between mb-4">
                  <div className="text-[7px] uppercase tracking-[0.4em] font-bold" style={{ color: ACCENT }}>Your Consultant</div>
                  <div className="flex items-center gap-1.5">
                    <motion.div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#22c55e' }}
                      animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 2.5, repeat: Infinity }} />
                    <span className="text-[7px] font-semibold uppercase tracking-[0.18em]" style={{ color: '#22c55e' }}>Available</span>
                  </div>
                </div>

                {/* Avatar + name */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-[13px] font-black shrink-0"
                    style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_SOFT} 100%)`, color: WHITE, fontFamily: SERIF, letterSpacing: '0.05em' }}>
                    {BUILDER.initials}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[14px] font-bold leading-tight" style={{ color: DARK, fontFamily: SERIF }}>{BUILDER.name}</div>
                    <div className="text-[9px] font-light mt-0.5 leading-snug" style={{ color: MUTED }}>{BUILDER.title}</div>
                  </div>
                </div>

                {/* Stars */}
                <div className="flex items-center gap-0.5 mb-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-2.5 h-2.5" style={{ color: ACCENT, fill: ACCENT }} />
                  ))}
                  <span className="ml-1.5 text-[8px] font-semibold" style={{ color: MUTED }}>25+ Years · Houston</span>
                </div>

                <div className="h-px mb-3.5" style={{ backgroundColor: BORDER }} />

                <p className="text-[10px] leading-relaxed font-light mb-4" style={{ color: MUTED }}>{BUILDER.bio}</p>

                {/* Contact */}
                <div className="flex flex-col gap-1.5 mb-0">
                  <a href={`tel:${BUILDER.phone}`}
                    className="flex items-center gap-2.5 text-[10px] font-medium py-1.5 transition-colors"
                    style={{ color: DARK }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = ACCENT; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = DARK; }}>
                    <Phone className="w-3.5 h-3.5 shrink-0" style={{ color: ACCENT }} strokeWidth={1.5} />
                    {BUILDER.phone}
                  </a>
                  <a href={`mailto:${BUILDER.email}`}
                    className="flex items-center gap-2.5 text-[10px] font-medium py-1.5 transition-colors"
                    style={{ color: DARK }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = ACCENT; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = DARK; }}>
                    <Mail className="w-3.5 h-3.5 shrink-0" style={{ color: ACCENT }} strokeWidth={1.5} />
                    {BUILDER.email}
                  </a>
                </div>
              </div>

              {/* CTA buttons */}
              <div className="px-5 pb-5 flex flex-col gap-2" style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 14 }}>
                <Link to="/portal/messages"
                  className="w-full flex items-center justify-center gap-2 text-[9px] uppercase tracking-[0.22em] font-black min-h-[44px] transition-opacity hover:opacity-85 active:opacity-70"
                  style={{ backgroundColor: ACCENT, color: WHITE }}>
                  <MessageSquare className="w-3.5 h-3.5" strokeWidth={2} /> Send Message
                </Link>
                <Link to="/portal/meetings"
                  className="w-full flex items-center justify-center gap-2 text-[9px] uppercase tracking-[0.2em] font-bold min-h-[40px] transition-all"
                  style={{ border: `1px solid ${BORDER}`, color: DARK }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = ACCENT; el.style.color = ACCENT; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = BORDER; el.style.color = DARK; }}>
                  <Calendar className="w-3.5 h-3.5" strokeWidth={1.5} /> Schedule Call
                </Link>
              </div>
            </div>
          </motion.div>

          {/* ── Progress Photos — horizontal preview strip, live‑synced from the admin side ── */}
          {photos.length > 0 && (
            <motion.div variants={fade} className="mb-5">
              <div className="pf-card" style={{ overflow: 'hidden' }}>
                <div className="px-5 py-4 flex items-center justify-between gap-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <div className="flex items-center gap-2">
                    <Camera className="w-3.5 h-3.5" style={{ color: ACCENT }} strokeWidth={1.75} />
                    <div>
                      <div className="text-[7px] uppercase tracking-[0.36em] font-bold mb-0.5" style={{ color: ACCENT }}>Progress Photos</div>
                      <div className="text-[10px] font-light" style={{ color: MUTED }}>Latest updates from your job site</div>
                    </div>
                  </div>
                  <Link to="/portal/gallery"
                    className="inline-flex items-center gap-1 text-[8px] uppercase tracking-[0.16em] font-bold shrink-0 transition-opacity hover:opacity-70"
                    style={{ color: ACCENT }}>
                    View All <ChevronRight className="w-3 h-3" strokeWidth={2.5} />
                  </Link>
                </div>
                <div className="p-4 flex gap-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                  {photos.slice(0, 8).map(photo => (
                    <Link key={photo.id} to="/portal/gallery"
                      className="group relative shrink-0 overflow-hidden"
                      style={{ width: 120, height: 90, border: `1px solid ${BORDER}` }}>
                      <img src={photo.url} alt={photo.caption ?? 'Project photo'} loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      {photo.phase_label && (
                        <span className="absolute bottom-1 left-1 text-[6.5px] uppercase tracking-[0.1em] font-bold px-1.5 py-0.5"
                          style={{ backgroundColor: 'rgba(13,10,6,0.72)', color: '#FAF7F2' }}>
                          {photo.phase_label}
                        </span>
                      )}
                    </Link>
                  ))}
                  {photos.length > 8 && (
                    <Link to="/portal/gallery"
                      className="group shrink-0 flex flex-col items-center justify-center gap-1.5 transition-colors"
                      style={{ width: 120, height: 90, border: `1px dashed ${BORDER}`, color: MUTED }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = ACCENT; el.style.color = ACCENT; }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = BORDER; el.style.color = MUTED; }}>
                      <ArrowUpRight className="w-4 h-4" strokeWidth={2} />
                      <span className="text-[8px] uppercase tracking-[0.14em] font-bold">+{photos.length - 8} More</span>
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Recent messages + Documents in a compact two-panel row ── */}
          {(recentMsgs.length > 0 || docs.length > 0) && (
            <motion.div variants={fade} className="grid md:grid-cols-2 gap-4 mb-5">

              {/* Messages */}
              {recentMsgs.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="text-[7px] uppercase tracking-[0.36em] font-bold" style={{ color: ACCENT }}>Recent Messages</div>
                    <Link to="/portal/messages" className="flex items-center gap-1 text-[9px] uppercase tracking-[0.18em] font-bold hover:opacity-70 transition-opacity" style={{ color: ACCENT }}>All <ArrowUpRight className="w-3 h-3" strokeWidth={2} /></Link>
                  </div>
                  <div className="pf-card" style={{ overflow: 'hidden' }}>
                    {recentMsgs.map((m, i) => (
                      <Link key={m.id} to="/portal/messages"
                        className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-stone-50 active:bg-stone-100"
                        style={{ borderBottom: i < recentMsgs.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                        <div className="w-7 h-7 rounded-xl flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5"
                          style={{ backgroundColor: m.sender === 'builder' ? 'rgba(0,0,0,0.1)' : 'rgba(17,24,39,0.05)', color: m.sender === 'builder' ? ACCENT : 'rgba(17,24,39,0.4)', fontFamily: SERIF }}>
                          {m.senderName.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 mb-0.5 flex-wrap">
                            <span className="text-[10px] font-bold" style={{ color: DARK }}>{m.senderName}</span>
                            {m.sender === 'builder' && <span className="text-[6px] uppercase tracking-[0.16em] font-bold px-1.5 py-0.5" style={{ backgroundColor: 'rgba(0,0,0,0.08)', color: ACCENT }}>HOU INC</span>}
                            <span className="text-[8px] ml-auto" style={{ color: 'rgba(17,24,39,0.26)' }}>{new Date(m.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          </div>
                          <p className="text-[10px] font-light line-clamp-1" style={{ color: MUTED }}>{m.text}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Documents */}
              {docs.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="text-[7px] uppercase tracking-[0.36em] font-bold" style={{ color: ACCENT }}>Documents</div>
                    <Link to="/portal/documents" className="flex items-center gap-1 text-[9px] uppercase tracking-[0.18em] font-bold hover:opacity-70 transition-opacity" style={{ color: ACCENT }}>Manage <ArrowUpRight className="w-3 h-3" strokeWidth={2} /></Link>
                  </div>
                  <div className="pf-card" style={{ overflow: 'hidden' }}>
                    {docs.slice(0, 3).map((doc, i) => (
                      <Link key={doc.id} to="/portal/documents"
                        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-stone-50"
                        style={{ borderBottom: i < Math.min(docs.length, 3) - 1 ? `1px solid ${BORDER}` : 'none' }}>
                        <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: doc.status === 'uploaded' ? 'rgba(16,185,129,0.09)' : doc.status === 'pending' ? 'rgba(245,158,11,0.09)' : 'rgba(17,24,39,0.05)' }}>
                          {doc.status === 'uploaded' ? <CheckCircle className="w-3.5 h-3.5" style={{ color: '#10b981' }} strokeWidth={1.5} />
                            : doc.status === 'pending' ? <AlertCircle className="w-3.5 h-3.5" style={{ color: '#f59e0b' }} strokeWidth={1.5} />
                            : <Clock className="w-3.5 h-3.5" style={{ color: MUTED }} strokeWidth={1.5} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-bold truncate" style={{ color: DARK }}>{doc.name}</div>
                          <div className="text-[8px] uppercase tracking-[0.16em] mt-0.5 font-semibold"
                            style={{ color: doc.status === 'uploaded' ? '#10b981' : doc.status === 'pending' ? '#f59e0b' : MUTED }}>
                            {doc.status === 'pending' ? 'Upload Required' : doc.status === 'uploaded' ? 'Uploaded' : doc.status}
                          </div>
                        </div>
                        <ChevronRight className="w-3 h-3 shrink-0" style={{ color: 'rgba(17,24,39,0.15)' }} strokeWidth={2} />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ── Upcoming meeting ── */}
          {nextMeeting && (
            <motion.div variants={fade} className="mb-5">
              <Link to="/portal/meetings"
                className="pf-card flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(139,92,246,0.09)' }}>
                    <Calendar className="w-4 h-4" style={{ color: '#8b5cf6' }} strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[7px] uppercase tracking-[0.24em] font-bold mb-0.5" style={{ color: '#8b5cf6' }}>
                      Upcoming · {nextMeeting.status === 'confirmed' ? 'Confirmed' : 'Requested'}
                    </div>
                    <div className="text-[13px] font-bold truncate" style={{ color: DARK, fontFamily: SERIF }}>{nextMeeting.type}</div>
                    <div className="text-[9px] font-light mt-0.5" style={{ color: MUTED }}>{nextMeeting.date} · {nextMeeting.time} · {nextMeeting.format}</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'rgba(17,24,39,0.18)' }} strokeWidth={2} />
              </Link>
            </motion.div>
          )}

          {/* ── Projects shortcut (mobile only) ── */}
          <motion.div variants={fade} className="mb-4 md:hidden">
            <Link to="/portal/projects"
              className="pf-card flex items-center gap-3 p-4 active:bg-stone-50">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(17,24,39,0.04)' }}>
                <Building2 className="w-3.5 h-3.5" style={{ color: MUTED }} strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold" style={{ color: DARK }}>My Projects</div>
                <div className="text-[9px] font-light" style={{ color: MUTED }}>View all projects</div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: 'rgba(17,24,39,0.18)' }} strokeWidth={2} />
            </Link>
          </motion.div>

        </div>
      </motion.div>
    </PortalLayout>
  );
}
