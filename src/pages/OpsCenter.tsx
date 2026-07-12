import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';

/* ── Tokens ─────────────────────────────────────────────────────── */
const BG    = '#F5F3F0';
const CARD  = '#FFFFFF';
const BD    = '#E8E3DC';
const BD2   = '#F0EBE3';
const TX1   = '#1C1A17';
const TX2   = '#7A746D';
const TX3   = '#AFA89E';
const GOLD  = '#9D7E3F';
const GB    = 'rgba(157,126,63,0.07)';
const GBD   = 'rgba(157,126,63,0.17)';
const GREEN = '#16a34a';
const AMBER = '#d97706';
const RED   = '#dc2626';
const BLUE  = '#1B72B5';
const NAVY  = '#2C5F8A';
const SF    = "'Cormorant Garamond', Georgia, serif";

/* ── Entity meta ─────────────────────────────────────────────────── */
const EMETA: Record<string, { Icon: React.ComponentType<any>; color: string; bg: string; bd: string; label: string }> = {
  'houston-enterprise':          { Icon: Building2, color: GOLD, bg: GB,                        bd: GBD,                        label: 'General Contractor' },
  'houston-generator-pros':      { Icon: Zap,       color: BLUE, bg: 'rgba(27,114,181,0.07)',   bd: 'rgba(27,114,181,0.18)',    label: 'Energy Services' },
  'houston-enterprise-holdings': { Icon: Landmark,  color: NAVY, bg: 'rgba(44,95,138,0.07)',    bd: 'rgba(44,95,138,0.18)',     label: 'Holdings & Development' },
};

/* ── Per-entity dashboard access ─────────────────────────────────── */
const DASHBOARDS: Record<string, Array<{ label: string; sub: string; Icon: React.ComponentType<any>; to: string; badge?: string }>> = {
  'houston-enterprise': [
    { label: 'Admin Panel',       sub: 'Client management, portal documents, approvals & meetings', Icon: Shield,          to: '/admin',             badge: 'Admin' },
    { label: 'Finance Dashboard', sub: 'P&L overview, ledger, invoices & financial reporting',      Icon: LayoutDashboard, to: '/finance/dashboard' },
  ],
  'houston-generator-pros': [
    { label: 'Finance Dashboard', sub: 'P&L overview, ledger, invoices & financial reporting',      Icon: LayoutDashboard, to: '/finance/dashboard' },
  ],
  'houston-enterprise-holdings': [
    { label: 'Finance Dashboard', sub: 'P&L overview, ledger, invoices & financial reporting',      Icon: LayoutDashboard, to: '/finance/dashboard' },
  ],
};

/* ── Quick action groups ─────────────────────────────────────────── */
const GROUPS: Array<{ label: string; items: Array<{ label: string; Icon: React.ComponentType<any>; to: string; color: string }> }> = [
  {
    label: 'Finance',
    items: [
      { label: 'Income',   Icon: ArrowDownToLine, to: '/income',       color: GREEN },
      { label: 'Expense',  Icon: ArrowUpFromLine, to: '/expenses',     color: RED },
      { label: 'Check',    Icon: FileText,        to: '/checks/new',   color: GOLD },
      { label: 'Invoice',  Icon: Receipt,         to: '/invoices/new', color: '#6366f1' },
    ],
  },
  {
    label: 'Records',
    items: [
      { label: 'Ledger',    Icon: BookOpen,     to: '/ledger',    color: '#14b8a6' },
      { label: 'Checks',    Icon: FileText,     to: '/checks',    color: AMBER },
      { label: 'Projects',  Icon: FolderKanban, to: '/projects',  color: '#0ea5e9' },
      { label: 'Vendors',   Icon: Users,        to: '/vendors',   color: '#f97316' },
    ],
  },
  {
    label: 'Analytics & Tools',
    items: [
      { label: 'Charts',    Icon: BarChart3,     to: '/charts',    color: '#8b5cf6' },
      { label: 'Documents', Icon: FolderOpen,    to: '/documents', color: '#78716c' },
      { label: 'Concierge', Icon: ConciergeBell, to: '/concierge', color: '#ec4899' },
      { label: 'Settings',  Icon: Settings,      to: '/settings',  color: TX3 },
    ],
  },
];

/* ── Snapshot ─────────────────────────────────────────────────────── */
interface EStat { income: number; expense: number; pendingChecks: number; pendingChecksValue: number; projects: number; vendors: number }
interface Snap {
  entityStats: Record<string, EStat>;
  overdueInvoices: { count: number; value: number };
  portalPending: number;
  totalChecks: number; totalChecksVal: number;
  lastIncomeDays: Record<string, number>;
  loading: boolean;
}

/* ── Suggestions ─────────────────────────────────────────────────── */
interface Sug { priority: 'critical' | 'high' | 'medium' | 'low'; Icon: React.ComponentType<any>; label: string; sub: string; action: string; entity?: string }

function buildSugs(snap: Snap): Sug[] {
  const now = new Date(); const h = now.getHours(); const d = now.getDay(); const dt = now.getDate();
  const out: Sug[] = [];
  if (snap.overdueInvoices.count > 0) out.push({ priority: 'critical', Icon: AlertTriangle, label: `${snap.overdueInvoices.count} overdue invoice${snap.overdueInvoices.count > 1 ? 's' : ''} — ${fmtUSD(snap.overdueInvoices.value)} uncollected`, sub: 'Past-due receivables require immediate follow-up', action: '/invoices' });
  if (snap.totalChecks > 0)           out.push({ priority: 'high',     Icon: FileText,      label: `${snap.totalChecks} check${snap.totalChecks > 1 ? 's' : ''} pending clearance — ${fmtUSD(snap.totalChecksVal)} outstanding`, sub: 'Update check statuses to keep books accurate', action: '/checks' });
  if (snap.portalPending > 0)         out.push({ priority: 'high',     Icon: FolderOpen,    label: `${snap.portalPending} client document${snap.portalPending > 1 ? 's' : ''} uploaded — awaiting review`, sub: 'Clients have submitted files that need admin approval', action: '/admin' });
  for (const [eid, days] of Object.entries(snap.lastIncomeDays)) {
    if (days > 30) {
      const ent = ENTITIES.find(e => e.id === eid);
      if (ent) out.push({ priority: 'medium', Icon: TrendingUp, label: `No income logged for ${ent.shortName} in ${days === 9999 ? 'an extended period' : `${days} days`}`, sub: 'Ensure revenue is being captured and reconciled', action: '/income', entity: eid });
    }
  }
  if (d === 1)             out.push({ priority: 'medium', Icon: Calendar,    label: 'Monday — start the week with a cross-entity P&L review', sub: 'Compare last 7 days across all three entities', action: '/charts' });
  if (d === 5)             out.push({ priority: 'medium', Icon: CheckCircle2, label: 'Friday — reconcile this week before close', sub: 'Confirm all transactions are logged and categorized', action: '/ledger' });
  if (dt >= 25 && dt <= 31) out.push({ priority: 'medium', Icon: Activity,   label: `Month-end in ${31 - dt + 1} day${31 - dt + 1 !== 1 ? 's' : ''} — prepare monthly close`, sub: 'Review outstanding balances, pending invoices, and check register', action: '/ledger' });
  if (h < 9)               out.push({ priority: 'low', Icon: Clock, label: 'Morning check-in — review overnight position', sub: 'Scan cash flow and flag any items that need attention today', action: '/finance/dashboard' });
  else if (h >= 16)        out.push({ priority: 'low', Icon: Clock, label: 'End-of-day — confirm all transactions are logged', sub: "Ensure today's activity is captured before close", action: '/ledger' });
  return out.slice(0, 6);
}

const PRI: Record<string, { color: string; bg: string; bd: string; badge: string }> = {
  critical: { color: RED,   bg: 'rgba(220,38,38,0.06)',   bd: 'rgba(220,38,38,0.14)',   badge: 'URGENT' },
  high:     { color: AMBER, bg: 'rgba(217,119,6,0.06)',   bd: 'rgba(217,119,6,0.14)',   badge: 'HIGH' },
  medium:   { color: GOLD,  bg: GB,                       bd: GBD,                      badge: 'REVIEW' },
  low:      { color: TX3,   bg: 'rgba(107,114,128,0.04)', bd: 'rgba(107,114,128,0.1)',  badge: 'INFO' },
};

/* ═══════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════ */
export default function OpsCenter() {
  const navigate           = useNavigate();
  const { user, signOut }  = useAuth();
  const { setEntity }      = useEntity();

  const [phase, setPhase]        = useState<'select' | 'hub'>('select');
  const [active, setActive]      = useState<Entity | null>(null);
  const [time, setTime]          = useState(new Date());
  const [snap, setSnap]          = useState<Snap>({ entityStats: {}, overdueInvoices: { count: 0, value: 0 }, portalPending: 0, totalChecks: 0, totalChecksVal: 0, lastIncomeDays: {}, loading: true });

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().slice(0, 10);
      const [txRes, ckRes, invRes, porRes, prRes, vRes] = await Promise.all([
        supabase.from('transactions').select('entity_id,type,amount,transaction_date').is('deleted_at', null),
        supabase.from('checks').select('entity_id,amount,status').is('deleted_at', null),
        supabase.from('invoices').select('entity_id,status,line_items,tax_rate,due_date'),
        supabase.from('portal_documents').select('id,status').eq('status', 'uploaded'),
        supabase.from('projects').select('entity_id').is('deleted_at', null),
        supabase.from('vendors').select('entity_id').is('deleted_at', null),
      ]);
      const es: Record<string, EStat> = {};
      ENTITIES.forEach(e => { es[e.id] = { income: 0, expense: 0, pendingChecks: 0, pendingChecksValue: 0, projects: 0, vendors: 0 }; });
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
      for (const p of prRes.data ?? []) { if (es[p.entity_id]) es[p.entity_id].projects++; }
      for (const v of vRes.data ?? []) { if (es[v.entity_id]) es[v.entity_id].vendors++; }
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
        const latest = rows.reduce((max, t) => t.transaction_date > max ? t.transaction_date : max, '');
        lid[e.id] = Math.floor((Date.now() - new Date(latest).getTime()) / 86400000);
      }
      setSnap({ entityStats: es, overdueInvoices: { count: oc, value: ov }, portalPending: porRes.data?.length ?? 0, totalChecks: tc, totalChecksVal: tv, lastIncomeDays: lid, loading: false });
    }
    load();
  }, []);

  const sugs       = useMemo(() => buildSugs(snap), [snap]);
  const alertCount = (snap.overdueInvoices.count > 0 ? 1 : 0) + (snap.totalChecks > 0 ? 1 : 0) + (snap.portalPending > 0 ? 1 : 0);
  const name       = user?.user_metadata?.full_name?.split(' ')[0] || 'Admin';
  const greeting   = time.getHours() < 12 ? 'Good morning' : time.getHours() < 17 ? 'Good afternoon' : 'Good evening';

  const selectEntity = (ent: Entity) => { setActive(ent); setEntity(ent); setPhase('hub'); };
  const goSignOut    = () => { signOut(); navigate('/auth'); };
  const goTo         = (path: string) => navigate(path);

  const totalRevenue  = Object.values(snap.entityStats).reduce((s, e) => s + e.income, 0);
  const totalExpenses = Object.values(snap.entityStats).reduce((s, e) => s + e.expense, 0);
  const totalNet      = totalRevenue - totalExpenses;

  /* ─────────────────── SHARED HEADER ─────────────────── */
  const renderHeader = (back?: boolean) => (
    <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(245,243,240,0.95)', backdropFilter: 'blur(20px)', borderBottom: `1px solid ${BD}` }}>
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '0 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>

          {/* Left */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {back && active ? (
              <>
                <button onClick={() => setPhase('select')} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: 'none', border: `1px solid ${BD}`, cursor: 'pointer', color: TX2, fontSize: 11, fontWeight: 500, transition: 'color 0.15s, background 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.color = TX1; e.currentTarget.style.background = CARD; }}
                  onMouseLeave={e => { e.currentTarget.style.color = TX2; e.currentTarget.style.background = 'none'; }}>
                  <ChevronLeft style={{ width: 11, height: 11 }} strokeWidth={2.5} /> Entities
                </button>
                <div style={{ width: 1, height: 16, background: BD }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: EMETA[active.id].color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: TX1 }}>{active.shortName}</span>
                  <span className="ops-ename" style={{ fontSize: 12, color: TX2 }}>{active.name}</span>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Building2 style={{ width: 17, height: 17, color: '#fff' }} strokeWidth={1.5} />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: TX1, letterSpacing: '-0.01em' }}>HOU INC</div>
                  <div style={{ fontSize: 9, fontWeight: 600, color: TX3, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Operations Center</div>
                </div>
              </div>
            )}
          </div>

          {/* Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="ops-time" style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: TX1, lineHeight: 1.2 }}>
                {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div style={{ fontSize: 9, color: TX3 }}>
                {time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
            </div>
            {alertCount > 0 && (
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: RED, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800 }}>
                {alertCount}
              </div>
            )}
            <button onClick={goSignOut} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 500, color: TX3, background: 'transparent', border: `1px solid ${BD}`, cursor: 'pointer', padding: '6px 12px', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.color = RED; e.currentTarget.style.borderColor = 'rgba(220,38,38,0.3)'; e.currentTarget.style.background = 'rgba(220,38,38,0.04)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = TX3; e.currentTarget.style.borderColor = BD; e.currentTarget.style.background = 'transparent'; }}>
              <LogOut style={{ width: 11, height: 11 }} /> Sign Out
            </button>
          </div>

        </div>
      </div>
    </header>
  );

  /* ═══════════════════════════════════════════════════════
     PHASE 1 — ENTITY SELECTION
  ═══════════════════════════════════════════════════════ */
  if (phase === 'select') return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: "'Inter', system-ui, sans-serif" }}>
      {renderHeader()}

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '44px 20px 80px' }}>

        {/* Greeting */}
        <div style={{ marginBottom: 44 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: GOLD, marginBottom: 10 }}>
            {greeting}
          </div>
          <div style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(30px, 5vw, 46px)', color: TX1, lineHeight: 1.08, letterSpacing: '-0.01em', marginBottom: 8 }}>
            {name}.
          </div>
          <div style={{ fontSize: 13, color: TX2 }}>
            Select an entity below to access its management dashboards and financial tools.
          </div>
        </div>

        {/* Entity cards */}
        <div className="ops-entity-grid">
          {ENTITIES.map(ent => {
            const m     = EMETA[ent.id];
            const Icon  = m.Icon;
            const s     = snap.entityStats[ent.id];
            const net   = (s?.income ?? 0) - (s?.expense ?? 0);
            const dbs   = DASHBOARDS[ent.id];
            const hasAdmin = dbs.some(d => d.badge === 'Admin');

            return (
              <button key={ent.id} onClick={() => selectEntity(ent)}
                className="ops-entity-card"
                style={{ background: CARD, border: `1px solid ${BD}`, padding: 0, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', position: 'relative', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = m.color + '55'; e.currentTarget.style.boxShadow = `0 8px 32px rgba(0,0,0,0.1)`; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = BD; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'translateY(0)'; }}>

                {/* Top color bar */}
                <div style={{ height: 3, background: m.color }} />

                <div style={{ padding: '22px 24px 20px' }}>
                  {/* Entity header row */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
                    <div style={{ width: 46, height: 46, background: m.bg, border: `1px solid ${m.bd}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon style={{ width: 21, height: 21, color: m.color }} strokeWidth={1.5} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', padding: '2px 7px', background: m.bg, border: `1px solid ${m.bd}`, color: m.color }}>
                        {m.label}
                      </div>
                      <div style={{ fontSize: 8, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: TX3 }}>
                        Est. {ent.since}
                      </div>
                    </div>
                  </div>

                  {/* Name */}
                  <div style={{ fontFamily: SF, fontSize: 22, fontWeight: 700, color: TX1, lineHeight: 1.1, letterSpacing: '-0.01em', marginBottom: 4 }}>
                    {ent.name}
                  </div>
                  <div style={{ fontSize: 11, color: TX2, letterSpacing: '0.02em', marginBottom: 14 }}>
                    {ent.tagline}
                  </div>
                  <div style={{ fontSize: 11, color: TX2, lineHeight: 1.65, marginBottom: 20, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {ent.description}
                  </div>

                  {/* Stats grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: BD, marginBottom: 16 }}>
                    {[
                      { label: 'Revenue', value: snap.loading ? '—' : fmtUSD(s?.income ?? 0), color: TX1 },
                      { label: 'Net Position', value: snap.loading ? '—' : fmtUSD(net), color: net >= 0 ? GREEN : RED },
                    ].map(kpi => (
                      <div key={kpi.label} style={{ background: BD2, padding: '12px 14px' }}>
                        <div style={{ fontSize: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: TX3, marginBottom: 5 }}>{kpi.label}</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: kpi.color, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{kpi.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Access badges + CTA */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '2px 7px', background: m.bg, border: `1px solid ${m.bd}`, color: m.color }}>
                        Finance
                      </div>
                      {hasAdmin && (
                        <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '2px 7px', background: GB, border: `1px solid ${GBD}`, color: GOLD }}>
                          Admin
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: m.color }}>
                      Open <ArrowRight style={{ width: 13, height: 13 }} strokeWidth={2} />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Portfolio summary bar */}
        {!snap.loading && (
          <div style={{ marginTop: 28, background: CARD, border: `1px solid ${BD}`, padding: '18px 24px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: TX3, marginBottom: 4 }}>Combined Portfolio</div>
                <div style={{ fontSize: 11, color: TX2 }}>Across all three entities</div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28 }}>
                {[
                  { label: 'Total Revenue', value: fmtUSD(totalRevenue), color: TX1 },
                  { label: 'Total Expenses', value: fmtUSD(totalExpenses), color: TX1 },
                  { label: 'Net Position', value: fmtUSD(totalNet), color: totalNet >= 0 ? GREEN : RED },
                  { label: 'Pending Checks', value: snap.totalChecks === 0 ? 'None' : `${snap.totalChecks} · ${fmtUSD(snap.totalChecksVal)}`, color: snap.totalChecks > 0 ? AMBER : TX3 },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <div style={{ fontSize: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: TX3, marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Alerts row */}
        {!snap.loading && alertCount > 0 && (
          <div style={{ marginTop: 10, padding: '11px 18px', background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.14)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle style={{ width: 13, height: 13, color: RED, flexShrink: 0 }} strokeWidth={2} />
            <span style={{ fontSize: 12, color: TX1 }}>
              {alertCount} item{alertCount !== 1 ? 's' : ''} require attention — select an entity to review and act.
            </span>
          </div>
        )}

      </main>

      <Styles />
    </div>
  );

  /* ═══════════════════════════════════════════════════════
     PHASE 2 — ENTITY HUB
  ═══════════════════════════════════════════════════════ */
  if (!active) return null;
  const m      = EMETA[active.id];
  const Icon   = m.Icon;
  const s      = snap.entityStats[active.id];
  const net    = (s?.income ?? 0) - (s?.expense ?? 0);
  const dbs    = DASHBOARDS[active.id];

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: "'Inter', system-ui, sans-serif" }}>
      {renderHeader(true)}

      <main style={{ maxWidth: 1320, margin: '0 auto', padding: '0 20px 80px' }}>

        {/* Entity identity bar */}
        <div style={{ padding: '28px 0 26px', borderBottom: `1px solid ${BD}`, marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
            <div style={{ width: 54, height: 54, background: m.bg, border: `2px solid ${m.bd}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon style={{ width: 24, height: 24, color: m.color }} strokeWidth={1.5} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', padding: '2px 8px', background: m.bg, border: `1px solid ${m.bd}`, color: m.color }}>
                  {m.label}
                </div>
                <div style={{ fontSize: 8, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: TX3 }}>
                  Est. {active.since}
                </div>
              </div>
              <div style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(22px, 4vw, 36px)', color: TX1, lineHeight: 1.08, letterSpacing: '-0.01em', marginBottom: 6 }}>
                {active.name}
              </div>
              <div style={{ fontSize: 12, color: TX2, lineHeight: 1.65, maxWidth: 680 }}>
                {active.description}
              </div>
            </div>
          </div>
        </div>

        {/* KPI row */}
        <div className="ops-kpi-grid" style={{ marginBottom: 32 }}>
          {[
            { label: 'Revenue',        value: snap.loading ? '—' : fmtUSD(s?.income ?? 0),   color: GREEN, Icon: ArrowDownToLine },
            { label: 'Expenses',       value: snap.loading ? '—' : fmtUSD(s?.expense ?? 0),  color: RED,   Icon: ArrowUpFromLine },
            { label: 'Net Position',   value: snap.loading ? '—' : fmtUSD(net),               color: net >= 0 ? GREEN : RED, Icon: TrendingUp },
            { label: 'Pending Checks', value: snap.loading ? '—' : (s?.pendingChecks ? `${s.pendingChecks} · ${fmtUSD(s.pendingChecksValue)}` : 'None'), color: s?.pendingChecks ? AMBER : TX3, Icon: FileText },
          ].map(kpi => {
            const KI = kpi.Icon;
            return (
              <div key={kpi.label} style={{ background: CARD, border: `1px solid ${BD}`, padding: '16px 18px', position: 'relative', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: kpi.color }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: TX3 }}>{kpi.label}</span>
                  <KI style={{ width: 12, height: 12, color: kpi.color }} strokeWidth={1.8} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: kpi.color, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                  {kpi.value}
                </div>
              </div>
            );
          })}
        </div>

        {/* Dashboard launchers */}
        <SecHead label="Dashboards" sub={`Available views for ${active.shortName}`} />
        <div className="ops-dash-grid" style={{ marginBottom: 36 }}>
          {dbs.map(db => {
            const DI = db.Icon;
            return (
              <button key={db.to} onClick={() => goTo(db.to)}
                style={{ background: CARD, border: `1px solid ${BD}`, padding: '24px 26px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', position: 'relative', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = m.color + '55'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = BD; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: m.color }} />

                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
                  <div style={{ width: 44, height: 44, background: m.bg, border: `1px solid ${m.bd}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <DI style={{ width: 19, height: 19, color: m.color }} strokeWidth={1.5} />
                  </div>
                  {db.badge && (
                    <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '2px 8px', background: m.bg, border: `1px solid ${m.bd}`, color: m.color }}>
                      {db.badge}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 17, fontWeight: 700, color: TX1, letterSpacing: '-0.01em', marginBottom: 6 }}>{db.label}</div>
                <div style={{ fontSize: 12, color: TX2, lineHeight: 1.65, marginBottom: 18 }}>{db.sub}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: m.color }}>
                  Open {db.label} <ArrowRight style={{ width: 12, height: 12 }} strokeWidth={2} />
                </div>
              </button>
            );
          })}
        </div>

        {/* Quick actions — grouped */}
        <SecHead label="Quick Actions" sub="Jump to any finance tool in one tap" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 36 }}>
          {GROUPS.map(grp => (
            <div key={grp.label}>
              <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: TX3, marginBottom: 8 }}>
                {grp.label}
              </div>
              <div className="ops-action-grid">
                {grp.items.map(a => {
                  const AI = a.Icon;
                  return (
                    <button key={a.to} onClick={() => goTo(a.to)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: CARD, border: `1px solid ${BD}`, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = a.color + '44'; e.currentTarget.style.background = a.color + '06'; e.currentTarget.style.boxShadow = '0 3px 12px rgba(0,0,0,0.07)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = BD; e.currentTarget.style.background = CARD; e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)'; }}>
                      <div style={{ width: 32, height: 32, background: a.color + '12', border: `1px solid ${a.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <AI style={{ width: 14, height: 14, color: a.color }} strokeWidth={1.5} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: TX1 }}>{a.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Intelligence */}
        <SecHead label="Intelligence" sub="Real-time operational insights across all entities" />
        <div style={{ marginBottom: 36 }}>
          {snap.loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2, 3].map(i => <div key={i} style={{ height: 66, background: BD2, animation: 'shimmer 1.5s infinite' }} />)}
            </div>
          ) : sugs.length === 0 ? (
            <div style={{ padding: '20px 24px', background: 'rgba(22,163,74,0.05)', border: '1px solid rgba(22,163,74,0.2)', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 36, height: 36, background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CheckCircle2 style={{ width: 16, height: 16, color: GREEN }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: TX1 }}>All clear — platform is healthy</div>
                <div style={{ fontSize: 11, color: TX2, marginTop: 2 }}>No pending items or alerts across all entities</div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {sugs.map((sg, i) => {
                const p  = PRI[sg.priority];
                const SI = sg.Icon;
                return (
                  <button key={i}
                    onClick={() => { if (sg.entity) { const ent = ENTITIES.find(e => e.id === sg.entity); if (ent) setEntity(ent); } goTo(sg.action); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px', background: p.bg, border: `1px solid ${p.bd}`, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', position: 'relative', overflow: 'hidden' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(3px)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.07)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: p.color }} />
                    <div style={{ fontSize: 7, letterSpacing: '0.2em', textTransform: 'uppercase', color: p.color, fontWeight: 800, flexShrink: 0, minWidth: 38 }}>
                      {p.badge}
                    </div>
                    <div style={{ width: 30, height: 30, background: CARD, border: `1px solid ${BD}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <SI style={{ width: 13, height: 13, color: p.color }} strokeWidth={1.8} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: TX1, fontWeight: 500, lineHeight: 1.4 }}>{sg.label}</div>
                      <div style={{ fontSize: 10, color: TX2, marginTop: 2 }}>{sg.sub}</div>
                    </div>
                    <ArrowRight style={{ width: 12, height: 12, color: TX3, flexShrink: 0 }} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Portfolio cross-view */}
        <SecHead label="Portfolio" sub="Snapshot across all three entities" />
        <div className="ops-entity-grid" style={{ marginBottom: 0 }}>
          {ENTITIES.map(ent => {
            const em   = EMETA[ent.id];
            const EI   = em.Icon;
            const es   = snap.entityStats[ent.id];
            const en   = (es?.income ?? 0) - (es?.expense ?? 0);
            const isSel = ent.id === active.id;
            return (
              <button key={ent.id} onClick={() => selectEntity(ent)}
                style={{ background: isSel ? em.bg : CARD, border: `1px solid ${isSel ? em.bd : BD}`, padding: '18px 20px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.18s', position: 'relative', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                onMouseEnter={e => { if (!isSel) { e.currentTarget.style.borderColor = em.color + '44'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.07)'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
                onMouseLeave={e => { if (!isSel) { e.currentTarget.style.borderColor = BD; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'translateY(0)'; } }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: em.color }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 32, height: 32, background: em.bg, border: `1px solid ${em.bd}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <EI style={{ width: 14, height: 14, color: em.color }} strokeWidth={1.5} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: TX1 }}>{ent.shortName}</div>
                    <div style={{ fontSize: 9, color: TX3 }}>{ent.tagline}</div>
                  </div>
                  {isSel && (
                    <div style={{ marginLeft: 'auto', fontSize: 7, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '2px 6px', background: em.color, color: '#fff' }}>
                      Active
                    </div>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: BD }}>
                  <div style={{ background: snap.loading ? BD2 : CARD, padding: '8px 10px' }}>
                    <div style={{ fontSize: 7, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: TX3, marginBottom: 3 }}>Revenue</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: TX1, fontVariantNumeric: 'tabular-nums' }}>{snap.loading ? '—' : fmtUSD(es?.income ?? 0)}</div>
                  </div>
                  <div style={{ background: snap.loading ? BD2 : CARD, padding: '8px 10px' }}>
                    <div style={{ fontSize: 7, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: TX3, marginBottom: 3 }}>Net</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: en >= 0 ? GREEN : RED, fontVariantNumeric: 'tabular-nums' }}>{snap.loading ? '—' : fmtUSD(en)}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

      </main>

      <Styles />
    </div>
  );
}

/* ── Section header ─────────────────────────────────────────────── */
function SecHead({ label, sub }: { label: string; sub?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 3, height: 13, background: GOLD }} />
        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: GOLD }}>{label}</span>
      </div>
      {sub && <span style={{ fontSize: 10, color: TX3 }}>{sub}</span>}
    </div>
  );
}

/* ── Styles ─────────────────────────────────────────────────────── */
function Styles() {
  return (
    <style>{`
      @keyframes shimmer { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }

      /* Entity selection grid: 3-col → 1-col */
      .ops-entity-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 14px;
        margin-bottom: 0;
      }
      /* KPI grid */
      .ops-kpi-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
      }
      /* Dashboard launch grid */
      .ops-dash-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 12px;
      }
      /* Quick action group grid */
      .ops-action-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
      }

      @media (max-width: 900px) {
        .ops-entity-grid { grid-template-columns: 1fr; }
        .ops-kpi-grid    { grid-template-columns: repeat(2, 1fr); }
        .ops-action-grid { grid-template-columns: repeat(2, 1fr); }
      }
      @media (max-width: 640px) {
        .ops-kpi-grid    { grid-template-columns: repeat(2, 1fr); }
        .ops-action-grid { grid-template-columns: repeat(2, 1fr); }
        .ops-ename       { display: none; }
        .ops-time        { display: none; }
      }
    `}</style>
  );
}
