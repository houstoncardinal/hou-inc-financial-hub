import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEntity, ENTITIES, Entity } from '@/contexts/EntityContext';
import { fmtUSD } from '@/lib/format';
import {
  Building2, Zap, Landmark, FileText, ArrowDownToLine,
  ArrowUpFromLine, BookOpen, Receipt, BarChart3, ConciergeBell,
  FolderOpen, Users, FolderKanban, Settings, Shield,
  AlertTriangle, CheckCircle2, TrendingUp, Clock, Calendar,
  ArrowRight, LogOut, Activity, ChevronLeft, LayoutDashboard,
  Check, ChevronRight,
} from 'lucide-react';

/* ── Design tokens ───────────────────────────────────────────────── */
const INK   = '#0D0D0D';
const MU    = '#78716C';
const MU2   = '#A8A29E';
const GOLD  = '#9D7E3F';
const SERIF = "'Cormorant Garamond', Georgia, serif";
const GREEN = '#16a34a';
const AMBER = '#d97706';
const RED   = '#dc2626';

/* ── Page background (matches EntitySelect) ─────────────────────── */
const PAGE_BG: React.CSSProperties = {
  backgroundImage: [
    'linear-gradient(160deg, #FAF9F7 0%, #EDE9E3 52%, #F5F4F1 100%)',
    'radial-gradient(circle, rgba(0,0,0,0.048) 1px, transparent 1px)',
  ].join(', '),
  backgroundSize: 'cover, 22px 22px',
};

/* ── Entity icon map ─────────────────────────────────────────────── */
const E_ICONS: Record<string, React.ComponentType<any>> = {
  'houston-enterprise':           Building2,
  'houston-generator-pros':       Zap,
  'houston-enterprise-holdings':  Landmark,
};

/* ── Dashboards per entity ──────────────────────────────────────── */
type DB = { label: string; sub: string; Icon: React.ComponentType<any>; to: string; isAdmin?: boolean };
const ADMIN_DB: DB = { label: 'Admin Dashboard', sub: 'Client portal management, document approvals, milestone tracking, meeting scheduling & website oversight.', Icon: Shield, to: '/admin', isAdmin: true };

const DASHBOARDS: Record<string, DB[]> = {
  'houston-enterprise': [
    { label: 'Finance Dashboard', sub: 'P&L overview, ledger, income, expenses, checks, invoices & full financial reporting for Houston Enterprise.', Icon: LayoutDashboard, to: '/finance/dashboard' },
    ADMIN_DB,
  ],
  'houston-generator-pros': [
    { label: 'Finance Dashboard', sub: 'P&L overview, ledger, income, expenses, checks, invoices & full financial reporting for Houston Generator Pros.', Icon: LayoutDashboard, to: '/finance/dashboard' },
    ADMIN_DB,
  ],
  'houston-enterprise-holdings': [
    { label: 'Finance Dashboard', sub: 'P&L overview, ledger, income, expenses, checks, invoices & full financial reporting for Houston Enterprise Holdings.', Icon: LayoutDashboard, to: '/finance/dashboard' },
    ADMIN_DB,
  ],
};

/* ── Quick-action groups per entity ─────────────────────────────── */
type ActionItem = { label: string; Icon: React.ComponentType<any>; to: string; color: string };
type ActionGroup = { label: string; items: ActionItem[] };

const FIN: ActionItem[] = [
  { label: 'Add Income',  Icon: ArrowDownToLine, to: '/income',       color: GREEN },
  { label: 'Add Expense', Icon: ArrowUpFromLine, to: '/expenses',     color: RED },
  { label: 'New Check',   Icon: FileText,        to: '/checks/new',   color: GOLD },
  { label: 'New Invoice', Icon: Receipt,         to: '/invoices/new', color: '#6366f1' },
];
const REC: ActionItem[] = [
  { label: 'Ledger',   Icon: BookOpen,     to: '/ledger',   color: '#14b8a6' },
  { label: 'Checks',   Icon: FileText,     to: '/checks',   color: AMBER },
  { label: 'Projects', Icon: FolderKanban, to: '/projects', color: '#0ea5e9' },
  { label: 'Vendors',  Icon: Users,        to: '/vendors',  color: '#f97316' },
];
const TOOLS: ActionItem[] = [
  { label: 'Charts',    Icon: BarChart3,     to: '/charts',    color: '#8b5cf6' },
  { label: 'Documents', Icon: FolderOpen,    to: '/documents', color: '#78716c' },
  { label: 'Concierge', Icon: ConciergeBell, to: '/concierge', color: '#ec4899' },
  { label: 'Settings',  Icon: Settings,      to: '/settings',  color: '#64748b' },
];
const ADM: ActionItem[] = [
  { label: 'Admin Panel', Icon: Shield,        to: '/admin',     color: GOLD },
  { label: 'Documents',   Icon: FolderOpen,    to: '/documents', color: '#78716c' },
  { label: 'Concierge',   Icon: ConciergeBell, to: '/concierge', color: '#ec4899' },
  { label: 'Settings',    Icon: Settings,      to: '/settings',  color: '#64748b' },
];

const ALL_GROUPS: ActionGroup[] = [
  { label: 'Finance', items: FIN },
  { label: 'Records', items: REC },
  { label: 'Admin',   items: ADM },
];

const ENTITY_GROUPS: Record<string, ActionGroup[]> = {
  'houston-enterprise':          ALL_GROUPS,
  'houston-generator-pros':      ALL_GROUPS,
  'houston-enterprise-holdings': ALL_GROUPS,
};

/* ── Snapshot types ──────────────────────────────────────────────── */
interface EStat { income: number; expense: number; pendingChecks: number; pendingChecksValue: number }
interface Snap {
  entityStats: Record<string, EStat>;
  overdueInvoices: { count: number; value: number };
  portalPending: number;
  totalChecks: number; totalChecksVal: number;
  lastIncomeDays: Record<string, number>;
  loading: boolean;
}

/* ── Intelligence ────────────────────────────────────────────────── */
interface Sug { priority: 'critical' | 'high' | 'medium' | 'low'; Icon: React.ComponentType<any>; label: string; sub: string; action: string; entity?: string }

function buildSugs(snap: Snap): Sug[] {
  const now = new Date(); const h = now.getHours(); const d = now.getDay(); const dt = now.getDate();
  const out: Sug[] = [];
  if (snap.overdueInvoices.count > 0)
    out.push({ priority: 'critical', Icon: AlertTriangle, label: `${snap.overdueInvoices.count} overdue invoice${snap.overdueInvoices.count > 1 ? 's' : ''} — ${fmtUSD(snap.overdueInvoices.value)} uncollected`, sub: 'Past-due receivables require immediate follow-up', action: '/invoices' });
  if (snap.totalChecks > 0)
    out.push({ priority: 'high', Icon: FileText, label: `${snap.totalChecks} pending check${snap.totalChecks > 1 ? 's' : ''} — ${fmtUSD(snap.totalChecksVal)} outstanding`, sub: 'Update check statuses to keep books accurate', action: '/checks' });
  if (snap.portalPending > 0)
    out.push({ priority: 'high', Icon: FolderOpen, label: `${snap.portalPending} client document${snap.portalPending > 1 ? 's' : ''} uploaded — awaiting review`, sub: 'Clients have submitted files that need admin approval', action: '/admin', entity: 'houston-enterprise' });
  for (const [eid, days] of Object.entries(snap.lastIncomeDays)) {
    if (days > 30) {
      const ent = ENTITIES.find(e => e.id === eid);
      if (ent) out.push({ priority: 'medium', Icon: TrendingUp, label: `No income logged for ${ent.shortName} in ${days === 9999 ? 'an extended period' : `${days} days`}`, sub: 'Ensure revenue is being captured and reconciled', action: '/income', entity: eid });
    }
  }
  if (d === 1)             out.push({ priority: 'medium', Icon: Calendar,    label: 'Monday — start the week with a P&L review',       sub: 'Compare last 7 days of activity', action: '/charts' });
  if (d === 5)             out.push({ priority: 'medium', Icon: CheckCircle2, label: 'Friday — reconcile this week before close',        sub: 'Confirm all transactions are logged', action: '/ledger' });
  if (dt >= 25 && dt <= 31) out.push({ priority: 'medium', Icon: Activity,   label: `Month-end in ${31-dt+1} day${31-dt+1!==1?'s':''} — prepare monthly close`, sub: 'Review outstanding balances and pending invoices', action: '/ledger' });
  if (h < 9)               out.push({ priority: 'low', Icon: Clock, label: 'Morning — review overnight position',            sub: 'Scan cash flow and flag items for today', action: '/finance/dashboard' });
  else if (h >= 16)        out.push({ priority: 'low', Icon: Clock, label: 'End-of-day — confirm all transactions are logged', sub: "Ensure today's activity is captured before close", action: '/ledger' });
  return out.slice(0, 6);
}

const PRI: Record<string, { color: string; bg: string; bd: string; badge: string }> = {
  critical: { color: RED,   bg: 'rgba(220,38,38,0.06)',   bd: 'rgba(220,38,38,0.14)',   badge: 'URGENT' },
  high:     { color: AMBER, bg: 'rgba(217,119,6,0.06)',   bd: 'rgba(217,119,6,0.14)',   badge: 'HIGH' },
  medium:   { color: GOLD,  bg: 'rgba(157,126,63,0.06)',  bd: 'rgba(157,126,63,0.16)',  badge: 'REVIEW' },
  low:      { color: MU2,   bg: 'rgba(107,114,128,0.04)', bd: 'rgba(107,114,128,0.1)',  badge: 'INFO' },
};

/* ── EntityCard (Phase 1) ────────────────────────────────────────── */
function EntityCard({ entity, selected, onSelect, index }: {
  entity: Entity; selected: boolean; onSelect: () => void; index: number;
}) {
  const [hov, setHov] = useState(false);
  const Icon = E_ICONS[entity.id] ?? Building2;
  const on = hov || selected;

  return (
    <motion.button
      onClick={onSelect}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.48, delay: 0.06 + index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      className="relative w-full text-left flex flex-col overflow-hidden h-full"
      style={{
        background: selected ? `linear-gradient(160deg,#fff 55%,${entity.colorMuted} 130%)` : on ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.88)',
        border: `1px solid ${selected ? entity.color : on ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.07)'}`,
        boxShadow: selected ? `0 12px 40px ${entity.color}28,0 3px 10px rgba(0,0,0,0.07)` : on ? '0 6px 28px rgba(0,0,0,0.09)' : '0 1px 4px rgba(0,0,0,0.04)',
        transition: 'border-color 0.22s,box-shadow 0.28s,background 0.28s',
        cursor: 'pointer', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {/* Accent top bar */}
      <motion.div style={{ height: 3, backgroundColor: entity.color }} animate={{ opacity: on ? 1 : 0.35 }} transition={{ duration: 0.2 }} />

      {/* Shimmer sweep */}
      <motion.div
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `linear-gradient(105deg,transparent 38%,${entity.colorMuted} 50%,transparent 62%)`, zIndex: 0 }}
        initial={{ x: '-110%', opacity: 0 }}
        animate={hov ? { x: '110%', opacity: 1 } : { x: '-110%', opacity: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      />

      <div className="relative flex flex-col flex-1 p-5 z-10">
        {/* Icon + category */}
        <div className="flex items-center justify-between mb-4">
          <motion.div
            animate={{ backgroundColor: on ? entity.colorMuted : 'rgba(0,0,0,0.03)', borderColor: on ? entity.color : 'rgba(0,0,0,0.09)' }}
            transition={{ duration: 0.2 }}
            style={{ width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid', flexShrink: 0 }}
          >
            <Icon style={{ width: 18, height: 18, color: on ? entity.color : MU, transition: 'color 0.2s', strokeWidth: 1.5 }} />
          </motion.div>
          <div style={{ fontSize: 7, fontWeight: 800, letterSpacing: '0.36em', textTransform: 'uppercase', color: on ? entity.color : MU2, backgroundColor: on ? entity.colorMuted : 'rgba(0,0,0,0.03)', padding: '3px 8px', transition: 'color 0.2s,background-color 0.2s' }}>
            {entity.category}
          </div>
        </div>

        {/* Name */}
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(20px,2.4vw,32px)', color: on ? INK : '#2C2825', lineHeight: 1.05, letterSpacing: '-0.01em', transition: 'color 0.2s', marginBottom: 6 }}>
          {entity.name}
        </div>

        {/* Tagline */}
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase', color: on ? entity.color : MU2, transition: 'color 0.2s', marginBottom: 10 }}>
          {entity.tagline}
        </div>

        {/* Description */}
        <p style={{ fontSize: 11, color: MU, lineHeight: 1.6, fontWeight: 300, flex: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as any}>
          {entity.description}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-3.5" style={{ borderTop: `1px solid ${on ? entity.color+'28' : 'rgba(0,0,0,0.06)'}`, transition: 'border-color 0.2s' }}>
          <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.3em', color: on ? entity.color : MU2, transition: 'color 0.2s' }}>
            EST. {entity.since}
          </div>
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div key="chk" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: entity.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Check style={{ width: 10, height: 10, color: '#fff', strokeWidth: 2.5 }} />
              </motion.div>
            ) : (
              <motion.div key="arr" initial={{ opacity: 0 }} animate={{ opacity: on ? 0.85 : 0.18 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                <ChevronRight style={{ width: 14, height: 14, color: entity.color, strokeWidth: 2 }} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.button>
  );
}

/* ── DestCard (Phase 2) ──────────────────────────────────────────── */
function DestCard({ db, entity, onOpen }: { db: DB; entity: Entity; onOpen: () => void }) {
  const [hov, setHov] = useState(false);
  const DI = db.Icon;
  const accent = db.isAdmin ? GOLD : entity.color;
  const muted  = db.isAdmin ? 'rgba(157,126,63,0.1)' : entity.colorMuted;
  const bd     = db.isAdmin ? 'rgba(157,126,63,0.22)' : entity.color + '30';

  return (
    <motion.button
      onClick={onOpen}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.985 }}
      className="relative w-full text-left overflow-hidden"
      style={{
        background: hov ? `linear-gradient(160deg,#fff 55%,${muted} 130%)` : `linear-gradient(160deg,rgba(255,255,255,0.96) 60%,${muted} 140%)`,
        border: `1px solid ${hov ? accent+'55' : 'rgba(0,0,0,0.07)'}`,
        padding: '26px 26px 22px',
        cursor: 'pointer',
        boxShadow: hov ? '0 14px 44px rgba(0,0,0,0.12)' : '0 2px 10px rgba(0,0,0,0.05)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        transition: 'border-color 0.22s,box-shadow 0.28s,background 0.28s',
      }}
    >
      {/* Top accent */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: accent }} />

      {/* Shimmer */}
      <motion.div
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `linear-gradient(105deg,transparent 38%,${muted} 50%,transparent 62%)`, zIndex: 0 }}
        initial={{ x: '-110%', opacity: 0 }}
        animate={hov ? { x: '110%', opacity: 1 } : { x: '-110%', opacity: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      />

      <div className="relative z-10">
        {/* Icon + badge */}
        <div className="flex items-start justify-between mb-5">
          <div style={{ width: 50, height: 50, background: muted, border: `1px solid ${bd}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <DI style={{ width: 22, height: 22, color: accent, strokeWidth: 1.5 }} />
          </div>
          {db.isAdmin && (
            <div style={{ fontSize: 7, fontWeight: 800, letterSpacing: '0.3em', textTransform: 'uppercase', padding: '3px 9px', background: 'rgba(157,126,63,0.09)', border: '1px solid rgba(157,126,63,0.22)', color: GOLD }}>
              Admin
            </div>
          )}
        </div>

        {/* Label */}
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(20px,2.4vw,30px)', color: INK, lineHeight: 1.05, letterSpacing: '-0.01em', marginBottom: 8 }}>
          {db.label}
        </div>

        {/* Sub */}
        <p style={{ fontSize: 11, color: MU, lineHeight: 1.7, marginBottom: 22, fontWeight: 300 }}>
          {db.sub}
        </p>

        {/* CTA row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, fontWeight: 700, letterSpacing: '0.24em', textTransform: 'uppercase', color: hov ? accent : MU }}>
          Open Dashboard
          <motion.span animate={{ x: hov ? 3 : 0 }} transition={{ duration: 0.18 }}>
            <ArrowRight style={{ width: 12, height: 12 }} strokeWidth={2.5} />
          </motion.span>
        </div>
      </div>
    </motion.button>
  );
}

/* ── ActionTile ──────────────────────────────────────────────────── */
function ActionTile({ a, onGo }: { a: ActionItem; onGo: () => void }) {
  const [hov, setHov] = useState(false);
  const AI = a.Icon;
  return (
    <button
      onClick={onGo}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '13px 14px',
        background: hov ? `${a.color}09` : 'rgba(255,255,255,0.82)',
        border: `1px solid ${hov ? a.color+'50' : 'rgba(0,0,0,0.07)'}`,
        cursor: 'pointer', textAlign: 'left',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        boxShadow: hov ? '0 4px 16px rgba(0,0,0,0.07)' : '0 1px 3px rgba(0,0,0,0.04)',
        transition: 'all 0.15s ease',
      }}
    >
      <div style={{ width: 34, height: 34, background: `${a.color}12`, border: `1px solid ${a.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <AI style={{ width: 14, height: 14, color: a.color }} strokeWidth={1.5} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: hov ? INK : MU, transition: 'color 0.15s' }}>{a.label}</span>
    </button>
  );
}

/* ── Section header ──────────────────────────────────────────────── */
function SH({ label, sub, color }: { label: string; sub?: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <div style={{ width: 3, height: 14, backgroundColor: color, flexShrink: 0 }} />
      <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color }}>{label}</span>
      {sub && <span style={{ fontSize: 10, color: MU2 }}>— {sub}</span>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN
═══════════════════════════════════════════════════════════════════ */
export default function OpsCenter() {
  const navigate                    = useNavigate();
  const { user, signOut }           = useAuth();
  const { entity: ctx, setEntity }  = useEntity();

  const [phase, setPhase]       = useState<'select' | 'hub'>('select');
  const [selected, setSelected] = useState<Entity | null>(ctx);
  const [active, setActive]     = useState<Entity | null>(ctx);
  const [entering, setEntering] = useState(false);
  const [snap, setSnap] = useState<Snap>({
    entityStats: {}, overdueInvoices: { count: 0, value: 0 },
    portalPending: 0, totalChecks: 0, totalChecksVal: 0,
    lastIncomeDays: {}, loading: true,
  });

  /* ── Data load ── */
  const load = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const [txRes, ckRes, invRes, porRes] = await Promise.all([
      supabase.from('transactions').select('entity_id,type,amount,transaction_date').is('deleted_at', null),
      supabase.from('checks').select('entity_id,amount,status').is('deleted_at', null),
      supabase.from('invoices').select('entity_id,status,line_items,tax_rate,due_date'),
      supabase.from('portal_documents').select('id,status').eq('status', 'uploaded'),
    ]);
    const es: Record<string, EStat> = {};
    ENTITIES.forEach(e => { es[e.id] = { income: 0, expense: 0, pendingChecks: 0, pendingChecksValue: 0 }; });
    for (const t of txRes.data ?? []) {
      if (!es[t.entity_id]) continue;
      if (t.type === 'income')  es[t.entity_id].income  += Number(t.amount);
      if (t.type === 'expense') es[t.entity_id].expense += Number(t.amount);
    }
    let tc = 0, tv = 0;
    for (const c of ckRes.data ?? []) {
      if (!es[c.entity_id] || c.status !== 'pending') continue;
      es[c.entity_id].pendingChecks++; es[c.entity_id].pendingChecksValue += Number(c.amount); tc++; tv += Number(c.amount);
    }
    let oc = 0, ov = 0;
    for (const inv of invRes.data ?? []) {
      if (inv.status === 'overdue' || (inv.status === 'sent' && inv.due_date < today)) {
        oc++;
        const items: any[] = inv.line_items ?? [];
        ov += items.reduce((s: number, i: any) => s + (i.qty ?? 0) * (i.rate ?? 0), 0) * (1 + (inv.tax_rate ?? 0) / 100);
      }
    }
    const lid: Record<string, number> = {};
    for (const e of ENTITIES) {
      const rows = (txRes.data ?? []).filter(t => t.entity_id === e.id && t.type === 'income');
      if (!rows.length) { lid[e.id] = 9999; continue; }
      const latest = rows.reduce((m, t) => t.transaction_date > m ? t.transaction_date : m, '');
      lid[e.id] = Math.floor((Date.now() - new Date(latest).getTime()) / 86400000);
    }
    setSnap({ entityStats: es, overdueInvoices: { count: oc, value: ov }, portalPending: porRes.data?.length ?? 0, totalChecks: tc, totalChecksVal: tv, lastIncomeDays: lid, loading: false });
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── Realtime subscription — updates KPIs live ── */
  useEffect(() => {
    const ch = supabase.channel('ops-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' },     () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checks' },           () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' },         () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'portal_documents' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const sugs  = useMemo(() => buildSugs(snap), [snap]);
  const name  = user?.user_metadata?.full_name?.split(' ')[0] || 'Admin';

  /* ── Handlers ── */
  const enterHub = () => {
    if (!selected) return;
    setEntering(true);
    setActive(selected);
    setEntity(selected);
    setTimeout(() => { setPhase('hub'); setEntering(false); }, 280);
  };

  const goTo      = (path: string) => { if (active) setEntity(active); navigate(path); };
  const goSignOut = () => { signOut(); navigate('/auth'); };

  /* ── Derived (phase 2) ── */
  const ent  = active;
  const s    = ent ? snap.entityStats[ent.id] : null;
  const net  = s ? s.income - s.expense : 0;
  const dbs  = ent ? (DASHBOARDS[ent.id] ?? []) : [];
  const grps = ent ? (ENTITY_GROUPS[ent.id] ?? []) : [];

  const entitySugs = useMemo(
    () => sugs.filter(sg => !sg.entity || sg.entity === ent?.id),
    [sugs, ent],
  );

  /* ═══════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen" style={PAGE_BG}>

      {/* Gold top rule — always visible */}
      <motion.div
        style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 2, backgroundColor: GOLD, zIndex: 50 }}
        initial={{ scaleX: 0, transformOrigin: 'left' }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      />

      <AnimatePresence mode="wait">

        {/* ══════════════ PHASE 1 — ENTITY SELECT ══════════════ */}
        {phase === 'select' && (
          <motion.div key="select"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center justify-center px-4 py-12"
            style={{ minHeight: '100vh' }}
          >
            <div className="w-full max-w-5xl">

              {/* Header row */}
              <motion.div
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-end justify-between gap-6 mb-6"
              >
                <div className="flex items-center gap-3">
                  <motion.div style={{ width: 2, backgroundColor: GOLD }}
                    initial={{ height: 0 }} animate={{ height: 40 }}
                    transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }} />
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.46em', textTransform: 'uppercase', color: INK, fontFamily: SERIF }}>HOU INC</div>
                    <div style={{ fontSize: 6.5, textTransform: 'uppercase', letterSpacing: '0.52em', fontWeight: 700, color: GOLD, marginTop: 2 }}>Operations Center</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden md:block" style={{ fontSize: 11, color: MU2, fontStyle: 'italic', fontFamily: SERIF }}>
                    {selected ? `${selected.name} selected — continue below.` : 'Select an entity to continue.'}
                  </div>
                  <button onClick={goSignOut}
                    className="flex items-center gap-1.5"
                    style={{ fontSize: 10, fontWeight: 500, color: MU2, background: 'transparent', border: '1px solid rgba(0,0,0,0.1)', cursor: 'pointer', padding: '6px 12px', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.color = RED; e.currentTarget.style.borderColor = 'rgba(220,38,38,0.3)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = MU2; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'; }}>
                    <LogOut style={{ width: 10, height: 10 }} strokeWidth={1.8} /> Sign Out
                  </button>
                </div>
              </motion.div>

              {/* Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="mb-5"
                style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(24px,3.8vw,46px)', color: INK, lineHeight: 1.0, letterSpacing: '-0.01em' }}
              >
                Which entity are you{' '}
                <em style={{ color: GOLD }}>managing today?</em>
              </motion.h1>

              {/* Entity cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6" style={{ alignItems: 'stretch' }}>
                {ENTITIES.map((e, i) => (
                  <EntityCard key={e.id} entity={e} selected={selected?.id === e.id} onSelect={() => setSelected(e)} index={i} />
                ))}
              </div>

              {/* CTA row */}
              <motion.div
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.32 }}
                className="flex items-center justify-between gap-3 pt-4"
                style={{ borderTop: '1px solid rgba(0,0,0,0.07)' }}
              >
                <AnimatePresence mode="wait">
                  {selected ? (
                    <motion.div key="info" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      style={{ fontSize: 11, color: MU, fontStyle: 'italic', fontFamily: SERIF }}>
                      {selected.shortName} · {selected.category}
                    </motion.div>
                  ) : (
                    <motion.div key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      style={{ fontSize: 11, color: MU2, fontStyle: 'italic', fontFamily: SERIF }}>
                      Select an entity above to continue.
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                  {selected ? (
                    <motion.button key="enter"
                      initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                      onClick={enterHub}
                      disabled={entering}
                      whileHover={{ scale: 1.022 }} whileTap={{ scale: 0.97 }}
                      className="relative flex items-center gap-2.5 text-[9px] uppercase tracking-[0.28em] font-black disabled:opacity-50 overflow-hidden shrink-0"
                      style={{ backgroundColor: selected.color, color: '#fff', padding: '14px 24px', boxShadow: `0 4px 20px ${selected.color}44` }}
                    >
                      <motion.div
                        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(105deg,transparent 35%,rgba(255,255,255,0.22) 50%,transparent 65%)' }}
                        initial={{ x: '-100%' }} animate={{ x: '200%' }}
                        transition={{ duration: 0.65, delay: 0.05, ease: 'easeOut' }}
                      />
                      <span>{entering ? 'Opening…' : `Enter ${selected.shortName}`}</span>
                      <ArrowRight className="w-3 h-3" strokeWidth={2.5} />
                    </motion.button>
                  ) : (
                    <motion.div key="ph" initial={{ opacity: 0 }} animate={{ opacity: 0.28 }} exit={{ opacity: 0 }}
                      className="flex items-center gap-2.5 text-[9px] uppercase tracking-[0.28em] font-black"
                      style={{ color: MU2, padding: '14px 24px', border: '1px solid rgba(0,0,0,0.08)' }}>
                      Select Entity <ArrowRight className="w-3 h-3" strokeWidth={2.5} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

            </div>
          </motion.div>
        )}

        {/* ══════════════ PHASE 2 — HUB ══════════════ */}
        {phase === 'hub' && ent && (
          <motion.div key="hub"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="px-4 py-10"
            style={{ minHeight: '100vh', paddingTop: 40 }}
          >
            <div className="w-full max-w-5xl mx-auto">

              {/* ── Nav bar ── */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <button onClick={() => setPhase('select')}
                    className="flex items-center gap-1.5"
                    style={{ fontSize: 11, fontWeight: 600, color: MU, background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(0,0,0,0.1)', cursor: 'pointer', padding: '7px 12px', backdropFilter: 'blur(8px)', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.color = INK; e.currentTarget.style.background = '#fff'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = MU; e.currentTarget.style.background = 'rgba(255,255,255,0.75)'; }}>
                    <ChevronLeft style={{ width: 11, height: 11 }} strokeWidth={2.5} /> Entities
                  </button>
                  <div style={{ width: 1, height: 16, background: 'rgba(0,0,0,0.1)' }} />
                  <div className="flex items-center gap-2">
                    <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: ent.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: INK }}>{ent.shortName}</span>
                    <span className="hidden sm:inline" style={{ fontSize: 11, color: MU }}>{ent.name}</span>
                  </div>
                </div>
                <button onClick={goSignOut}
                  className="flex items-center gap-1.5"
                  style={{ fontSize: 10, fontWeight: 500, color: MU2, background: 'transparent', border: '1px solid rgba(0,0,0,0.1)', cursor: 'pointer', padding: '6px 12px', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.color = RED; e.currentTarget.style.borderColor = 'rgba(220,38,38,0.3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = MU2; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'; }}>
                  <LogOut style={{ width: 10, height: 10 }} strokeWidth={1.8} /> Sign Out
                </button>
              </div>

              {/* ── Heading ── */}
              <h2 style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(22px,3.4vw,42px)', color: INK, lineHeight: 1.0, letterSpacing: '-0.01em', marginBottom: 20 }}>
                Where would you like to{' '}
                <em style={{ color: ent.color }}>go?</em>
              </h2>

              {/* ── Destination cards ── */}
              <div className={dbs.length > 1 ? 'ops-dest-2' : ''} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginBottom: 28, maxWidth: dbs.length === 1 ? 520 : undefined }}>
                {dbs.map(db => (
                  <DestCard key={db.to} db={db} entity={ent} onOpen={() => goTo(db.to)} />
                ))}
              </div>

              {/* ── KPI snapshot ── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginBottom: 28 }} className="ops-kpi">
                {[
                  { label: 'Revenue',        val: snap.loading ? '—' : fmtUSD(s?.income ?? 0),   color: GREEN },
                  { label: 'Expenses',       val: snap.loading ? '—' : fmtUSD(s?.expense ?? 0),  color: RED },
                  { label: 'Net Position',   val: snap.loading ? '—' : fmtUSD(net),               color: net >= 0 ? GREEN : RED },
                  { label: 'Pending Checks', val: snap.loading ? '—' : (s?.pendingChecks ? `${s.pendingChecks} · ${fmtUSD(s.pendingChecksValue)}` : 'None'), color: s?.pendingChecks ? AMBER : MU2 },
                ].map(kpi => (
                  <div key={kpi.label} style={{ background: 'rgba(255,255,255,0.78)', border: '1px solid rgba(0,0,0,0.07)', padding: '14px 16px', backdropFilter: 'blur(8px)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: kpi.color }} />
                    <div style={{ fontSize: 7, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: MU2, marginBottom: 6 }}>{kpi.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: kpi.color, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{kpi.val}</div>
                  </div>
                ))}
              </div>

              {/* ── Quick actions ── */}
              <div style={{ marginBottom: 28 }}>
                <SH label="Quick Actions" sub={`${ent.shortName} tools`} color={ent.color} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {grps.map(grp => (
                    <div key={grp.label}>
                      <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: MU2, marginBottom: 6 }}>
                        {grp.label}
                      </div>
                      <div className="ops-actions">
                        {grp.items.map(a => (
                          <ActionTile key={a.to} a={a} onGo={() => goTo(a.to)} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Intelligence ── */}
              <div>
                <SH label="Intelligence" sub="real-time operational insights" color={ent.color} />
                {snap.loading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[1, 2, 3].map(i => <div key={i} style={{ height: 62, background: 'rgba(255,255,255,0.55)', animation: 'shimmer 1.5s infinite' }} />)}
                  </div>
                ) : entitySugs.length === 0 ? (
                  <div style={{ padding: '20px 24px', background: 'rgba(22,163,74,0.05)', border: '1px solid rgba(22,163,74,0.18)', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 36, height: 36, background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CheckCircle2 style={{ width: 16, height: 16, color: GREEN }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>All clear — no pending items</div>
                      <div style={{ fontSize: 11, color: MU, marginTop: 2 }}>No outstanding alerts for {ent.shortName}</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {entitySugs.map((sg, i) => {
                      const p = PRI[sg.priority];
                      const SI = sg.Icon;
                      return (
                        <button key={i}
                          onClick={() => { if (sg.entity) { const e2 = ENTITIES.find(e => e.id === sg.entity); if (e2) setEntity(e2); } goTo(sg.action); }}
                          style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px', background: p.bg, border: `1px solid ${p.bd}`, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', position: 'relative', overflow: 'hidden' }}
                          onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(3px)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.07)'; }}
                          onMouseLeave={e => { e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: p.color }} />
                          <div style={{ fontSize: 7, letterSpacing: '0.2em', textTransform: 'uppercase', color: p.color, fontWeight: 800, flexShrink: 0, minWidth: 38 }}>{p.badge}</div>
                          <div style={{ width: 30, height: 30, background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <SI style={{ width: 13, height: 13, color: p.color }} strokeWidth={1.8} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, color: INK, fontWeight: 500, lineHeight: 1.4 }}>{sg.label}</div>
                            <div style={{ fontSize: 10, color: MU, marginTop: 2 }}>{sg.sub}</div>
                          </div>
                          <ArrowRight style={{ width: 12, height: 12, color: MU2, flexShrink: 0 }} />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Bottom padding */}
              <div style={{ height: 40 }} />
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      <Styles />
    </div>
  );
}

/* ── Styles ─────────────────────────────────────────────────────── */
function Styles() {
  return (
    <style>{`
      @keyframes shimmer { 0%,100% { opacity:1; } 50% { opacity:0.55; } }

      /* Destination cards: 2-col on sm+ when entity has 2 dashboards */
      .ops-dest-2 { grid-template-columns: 1fr !important; }
      @media (min-width: 600px) { .ops-dest-2 { grid-template-columns: repeat(2,1fr) !important; } }

      /* KPI: 4-col on md+ */
      @media (min-width: 768px) { .ops-kpi { grid-template-columns: repeat(4,1fr) !important; } }

      /* Quick actions: 2-col → 4-col */
      .ops-actions { display:grid; grid-template-columns: repeat(2,1fr); gap:8px; }
      @media (min-width: 640px) { .ops-actions { grid-template-columns: repeat(4,1fr); } }
    `}</style>
  );
}
