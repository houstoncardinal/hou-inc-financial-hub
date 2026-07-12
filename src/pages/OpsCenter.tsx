import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEntity, ENTITIES } from '@/contexts/EntityContext';
import { fmtUSD } from '@/lib/format';
import {
  Building2, Zap, Landmark, FileText, ArrowDownToLine,
  ArrowUpFromLine, BookOpen, Receipt, BarChart3, ConciergeBell,
  FolderOpen, Users, FolderKanban, Settings, Globe, Shield,
  AlertTriangle, CheckCircle2, TrendingUp, Clock, Calendar,
  ArrowRight, LogOut, Activity, ChevronRight, Map,
  DollarSign, TrendingDown, Bell, Layers,
} from 'lucide-react';

/* ── Design tokens ─────────────────────────────────────────────── */
const BG     = '#F7F5F2';
const CARD   = '#FFFFFF';
const BD     = '#EAE5DE';
const BD2    = '#F0EBE4';
const TX1    = '#1C1A17';
const TX2    = '#7A746D';
const TX3    = '#B0A99F';
const GOLD   = '#9D7E3F';
const GOLDL  = '#C4A76B';
const GOLDBG = 'rgba(157,126,63,0.07)';
const GOLDB  = 'rgba(157,126,63,0.18)';
const GREEN  = '#16a34a';
const AMBER  = '#d97706';
const RED    = '#dc2626';
const BLUE   = '#1B72B5';
const SF     = "'Cormorant Garamond', Georgia, serif";

/* ── Entity meta ───────────────────────────────────────────────── */
const ENTITY_META: Record<string, { icon: React.ComponentType<any>; color: string; bg: string; border: string }> = {
  'houston-enterprise':          { icon: Building2, color: GOLD,  bg: GOLDBG, border: GOLDB },
  'houston-generator-pros':      { icon: Zap,       color: BLUE,  bg: 'rgba(27,114,181,0.07)', border: 'rgba(27,114,181,0.2)' },
  'houston-enterprise-holdings': { icon: Landmark,  color: '#2C5F8A', bg: 'rgba(44,95,138,0.07)', border: 'rgba(44,95,138,0.2)' },
};

/* ── Snapshot types ─────────────────────────────────────────────── */
interface EntityStat {
  income: number; expense: number;
  pendingChecks: number; pendingChecksValue: number;
  projects: number; vendors: number;
}
interface Snapshot {
  entityStats: Record<string, EntityStat>;
  overdueInvoices: { count: number; value: number };
  portalPending: number;
  totalPendingChecks: number;
  totalPendingChecksValue: number;
  lastIncomeDays: Record<string, number>;
  loading: boolean;
}

/* ── Suggestion engine ──────────────────────────────────────────── */
interface Suggestion {
  priority: 'critical' | 'high' | 'medium' | 'low';
  icon: React.ComponentType<any>;
  label: string; sub: string; action: string; entity?: string;
}

function buildSuggestions(snap: Snapshot): Suggestion[] {
  const now = new Date();
  const hour = now.getHours(); const day = now.getDay(); const date = now.getDate();
  const suggestions: Suggestion[] = [];
  if (snap.overdueInvoices.count > 0) suggestions.push({ priority: 'critical', icon: AlertTriangle, label: `${snap.overdueInvoices.count} overdue invoice${snap.overdueInvoices.count > 1 ? 's' : ''} — ${fmtUSD(snap.overdueInvoices.value)} uncollected`, sub: 'Past-due receivables require immediate follow-up', action: '/invoices' });
  if (snap.totalPendingChecks > 0) suggestions.push({ priority: 'high', icon: FileText, label: `${snap.totalPendingChecks} check${snap.totalPendingChecks > 1 ? 's' : ''} pending clearance — ${fmtUSD(snap.totalPendingChecksValue)} outstanding`, sub: 'Update check statuses to keep books accurate', action: '/checks' });
  if (snap.portalPending > 0) suggestions.push({ priority: 'high', icon: FolderOpen, label: `${snap.portalPending} client document${snap.portalPending > 1 ? 's' : ''} uploaded — awaiting review`, sub: 'Clients have submitted files that need admin approval', action: '/admin' });
  for (const [eid, days] of Object.entries(snap.lastIncomeDays)) {
    if (days > 30) {
      const entity = ENTITIES.find(e => e.id === eid);
      if (entity) suggestions.push({ priority: 'medium', icon: TrendingUp, label: `No income logged for ${entity.shortName} in ${days === 9999 ? 'an extended period' : `${days} days`}`, sub: 'Ensure revenue is being captured and reconciled', action: '/income', entity: eid });
    }
  }
  if (day === 1) suggestions.push({ priority: 'medium', icon: Calendar, label: 'Monday — start the week with a cross-entity P&L review', sub: 'Compare last 7 days across all three entities', action: '/charts' });
  if (day === 5) suggestions.push({ priority: 'medium', icon: CheckCircle2, label: 'Friday — reconcile this week before close', sub: 'Confirm all transactions are logged and categorized', action: '/ledger' });
  if (date >= 25 && date <= 31) suggestions.push({ priority: 'medium', icon: Activity, label: `Month-end in ${31 - date + 1} day${31 - date + 1 !== 1 ? 's' : ''} — prepare monthly close`, sub: 'Review outstanding balances, pending invoices, and check register', action: '/ledger' });
  if (hour < 9) suggestions.push({ priority: 'low', icon: Clock, label: 'Morning check-in — review overnight position', sub: 'Scan cash flow and flag any items that need attention today', action: '/finance/dashboard' });
  else if (hour >= 16) suggestions.push({ priority: 'low', icon: Clock, label: 'End-of-day — confirm all transactions are logged', sub: "Ensure today's activity is captured before close", action: '/ledger' });
  return suggestions.slice(0, 6);
}

const PRIORITY: Record<string, { color: string; bg: string; border: string; badge: string }> = {
  critical: { color: RED,   bg: 'rgba(220,38,38,0.06)',   border: 'rgba(220,38,38,0.15)',  badge: 'URGENT' },
  high:     { color: AMBER, bg: 'rgba(217,119,6,0.06)',   border: 'rgba(217,119,6,0.15)',  badge: 'HIGH' },
  medium:   { color: GOLD,  bg: GOLDBG,                   border: GOLDB,                   badge: 'REVIEW' },
  low:      { color: TX3,   bg: 'rgba(107,114,128,0.04)', border: 'rgba(107,114,128,0.12)', badge: 'INFO' },
};

/* ── Quick actions ──────────────────────────────────────────────── */
const QUICK = [
  { label: 'Income',     icon: ArrowDownToLine, to: '/income',        color: GREEN },
  { label: 'Expense',    icon: ArrowUpFromLine, to: '/expenses',      color: RED },
  { label: 'Check',      icon: FileText,        to: '/checks/new',    color: GOLD },
  { label: 'Invoice',    icon: Receipt,         to: '/invoices/new',  color: '#6366f1' },
  { label: 'Ledger',     icon: BookOpen,        to: '/ledger',        color: '#14b8a6' },
  { label: 'Charts',     icon: BarChart3,       to: '/charts',        color: '#8b5cf6' },
  { label: 'Vendors',    icon: Users,           to: '/vendors',       color: '#f97316' },
  { label: 'Projects',   icon: FolderKanban,    to: '/projects',      color: '#0ea5e9' },
  { label: 'Concierge',  icon: ConciergeBell,   to: '/concierge',     color: '#ec4899' },
  { label: 'Documents',  icon: FolderOpen,      to: '/documents',     color: '#78716c' },
  { label: 'Map',        icon: Map,             to: '/admin',         color: '#22c55e' },
  { label: 'Settings',   icon: Settings,        to: '/settings',      color: TX3 },
];

const PORTALS = [
  { label: 'Admin Panel',   icon: Shield, to: '/admin',  desc: 'Client management, portal docs, meetings', color: GOLD },
  { label: 'Client Portal', icon: Globe,  to: '/portal', desc: 'Client-facing portal & document sharing',  color: BLUE },
  { label: 'Blueprint Studio', icon: Layers, to: '/admin', desc: '3D property visualization & site planning', color: '#8b5cf6' },
];

/* ═══════════════════════════════════════════════════════════════════
   MAIN
═══════════════════════════════════════════════════════════════════ */
export default function OpsCenter() {
  const navigate    = useNavigate();
  const { user, signOut } = useAuth();
  const { setEntity } = useEntity();
  const [time, setTime] = useState(new Date());
  const [snap, setSnap] = useState<Snapshot>({
    entityStats: {}, overdueInvoices: { count: 0, value: 0 },
    portalPending: 0, totalPendingChecks: 0, totalPendingChecksValue: 0,
    lastIncomeDays: {}, loading: true,
  });

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().slice(0, 10);
      const [txnRes, checkRes, invoiceRes, portalRes, projectRes, vendorRes] = await Promise.all([
        supabase.from('transactions').select('entity_id,type,amount,transaction_date').is('deleted_at', null),
        supabase.from('checks').select('entity_id,amount,status').is('deleted_at', null),
        supabase.from('invoices').select('entity_id,status,line_items,tax_rate,due_date'),
        supabase.from('portal_documents').select('id,status').eq('status', 'uploaded'),
        supabase.from('projects').select('entity_id').is('deleted_at', null),
        supabase.from('vendors').select('entity_id').is('deleted_at', null),
      ]);
      const entityStats: Record<string, EntityStat> = {};
      ENTITIES.forEach(e => { entityStats[e.id] = { income: 0, expense: 0, pendingChecks: 0, pendingChecksValue: 0, projects: 0, vendors: 0 }; });
      for (const t of txnRes.data ?? []) {
        if (!entityStats[t.entity_id]) continue;
        if (t.type === 'income')  entityStats[t.entity_id].income  += Number(t.amount);
        if (t.type === 'expense') entityStats[t.entity_id].expense += Number(t.amount);
      }
      let totalPendingChecks = 0, totalPendingChecksValue = 0;
      for (const c of checkRes.data ?? []) {
        if (!entityStats[c.entity_id]) continue;
        if (c.status === 'pending') {
          entityStats[c.entity_id].pendingChecks++;
          entityStats[c.entity_id].pendingChecksValue += Number(c.amount);
          totalPendingChecks++; totalPendingChecksValue += Number(c.amount);
        }
      }
      for (const p of projectRes.data ?? []) { if (entityStats[p.entity_id]) entityStats[p.entity_id].projects++; }
      for (const v of vendorRes.data ?? []) { if (entityStats[v.entity_id]) entityStats[v.entity_id].vendors++; }
      let overdueCount = 0, overdueValue = 0;
      for (const inv of invoiceRes.data ?? []) {
        if (inv.status === 'overdue' || (inv.status === 'sent' && inv.due_date < today)) {
          overdueCount++;
          const items: any[] = inv.line_items ?? [];
          overdueValue += items.reduce((s: number, i: any) => s + (i.qty ?? 0) * (i.rate ?? 0), 0) * (1 + (inv.tax_rate ?? 0) / 100);
        }
      }
      const lastIncomeDays: Record<string, number> = {};
      for (const e of ENTITIES) {
        const rows = (txnRes.data ?? []).filter(t => t.entity_id === e.id && t.type === 'income');
        if (!rows.length) { lastIncomeDays[e.id] = 9999; continue; }
        const latest = rows.reduce((max, t) => t.transaction_date > max ? t.transaction_date : max, '');
        lastIncomeDays[e.id] = Math.floor((Date.now() - new Date(latest).getTime()) / 86400000);
      }
      setSnap({ entityStats, overdueInvoices: { count: overdueCount, value: overdueValue }, portalPending: portalRes.data?.length ?? 0, totalPendingChecks, totalPendingChecksValue, lastIncomeDays, loading: false });
    }
    load();
  }, []);

  const suggestions = useMemo(() => buildSuggestions(snap), [snap]);

  const launchEntity = (entityId: string) => {
    const entity = ENTITIES.find(e => e.id === entityId);
    if (entity) setEntity(entity);
    navigate('/finance/dashboard');
  };

  const displayName = user?.user_metadata?.full_name?.split(' ')[0] || 'Admin';
  const greeting    = time.getHours() < 12 ? 'Good morning' : time.getHours() < 17 ? 'Good afternoon' : 'Good evening';

  /* ── alerts badge ── */
  const alertCount = (snap.overdueInvoices.count > 0 ? 1 : 0) + (snap.totalPendingChecks > 0 ? 1 : 0) + (snap.portalPending > 0 ? 1 : 0);

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Sticky Header ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(247,245,242,0.92)',
        backdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${BD}`,
      }}>
        <div style={{ maxWidth: 1320, margin: '0 auto', padding: '0 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>

            {/* Left: brand + greeting */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Logo mark */}
              <div style={{
                width: 36, height: 36, background: GOLD, display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Building2 style={{ width: 18, height: 18, color: '#fff' }} strokeWidth={1.5} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: TX1, letterSpacing: '-0.01em' }}>
                    Operations Center
                  </span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                    padding: '2px 7px', background: GOLDBG, border: `1px solid ${GOLDB}`, color: GOLD,
                  }}>
                    INTERNAL
                  </span>
                  {alertCount > 0 && (
                    <span style={{
                      fontSize: 9, fontWeight: 800, width: 18, height: 18,
                      background: RED, color: '#fff', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {alertCount}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: TX2, marginTop: 1 }}>
                  {greeting}, {displayName}
                </div>
              </div>
            </div>

            {/* Right: clock + sign out */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ textAlign: 'right', display: 'none' }} className="sm-show">
                <div style={{ fontSize: 15, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: TX1, letterSpacing: '0.02em' }}>
                  {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div style={{ fontSize: 10, color: TX3, marginTop: 1 }}>
                  {time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
              </div>
              <button
                onClick={() => { signOut(); navigate('/auth'); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  fontSize: 11, fontWeight: 500, color: TX3,
                  background: 'transparent', border: `1px solid ${BD}`, cursor: 'pointer',
                  padding: '6px 12px', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = RED; e.currentTarget.style.borderColor = 'rgba(220,38,38,0.3)'; e.currentTarget.style.background = 'rgba(220,38,38,0.04)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = TX3; e.currentTarget.style.borderColor = BD; e.currentTarget.style.background = 'transparent'; }}
              >
                <LogOut style={{ width: 12, height: 12 }} /> Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <main style={{ maxWidth: 1320, margin: '0 auto', padding: '28px 20px 80px' }}>

        {/* ── Summary KPIs ── */}
        {!snap.loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 32 }}>
            {[
              {
                label: 'Total Revenue',
                value: fmtUSD(Object.values(snap.entityStats).reduce((s, e) => s + e.income, 0)),
                icon: DollarSign, color: GREEN, sub: 'All entities combined',
              },
              {
                label: 'Net Position',
                value: fmtUSD(Object.values(snap.entityStats).reduce((s, e) => s + e.income - e.expense, 0)),
                icon: TrendingUp, color: BLUE, sub: 'Revenue minus expenses',
              },
              {
                label: 'Pending Checks',
                value: snap.totalPendingChecks === 0 ? '—' : String(snap.totalPendingChecks),
                icon: FileText, color: snap.totalPendingChecks > 0 ? AMBER : TX3, sub: snap.totalPendingChecks > 0 ? fmtUSD(snap.totalPendingChecksValue) : 'All clear',
              },
              {
                label: 'Overdue Invoices',
                value: snap.overdueInvoices.count === 0 ? '—' : String(snap.overdueInvoices.count),
                icon: AlertTriangle, color: snap.overdueInvoices.count > 0 ? RED : TX3, sub: snap.overdueInvoices.count > 0 ? fmtUSD(snap.overdueInvoices.value) : 'None outstanding',
              },
            ].map(kpi => {
              const Icon = kpi.icon;
              return (
                <div key={kpi.label} style={{
                  background: CARD, border: `1px solid ${BD}`,
                  padding: '16px 18px', position: 'relative', overflow: 'hidden',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: kpi.color }} />
                  <div style={{ paddingLeft: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: TX3 }}>{kpi.label}</span>
                      <Icon style={{ width: 13, height: 13, color: kpi.color }} strokeWidth={1.8} />
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: TX1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', lineHeight: 1 }}>
                      {kpi.value}
                    </div>
                    <div style={{ fontSize: 10, color: TX3, marginTop: 5 }}>{kpi.sub}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Entity Hubs ── */}
        <SectionHeader label="Entity Hubs" sub="Select an entity to set context and open the dashboard" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 12, marginBottom: 32 }}>
          {ENTITIES.map(entity => {
            const meta  = ENTITY_META[entity.id];
            const stats = snap.entityStats[entity.id];
            const Icon  = meta.icon;
            const net   = (stats?.income ?? 0) - (stats?.expense ?? 0);
            return (
              <button
                key={entity.id}
                onClick={() => launchEntity(entity.id)}
                style={{
                  background: CARD, border: `1px solid ${BD}`,
                  padding: '20px 22px', cursor: 'pointer', textAlign: 'left',
                  transition: 'all 0.18s', position: 'relative', overflow: 'hidden',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = meta.border;
                  e.currentTarget.style.background = meta.bg;
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = BD;
                  e.currentTarget.style.background = CARD;
                  e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Top gold accent line */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: meta.color }} />
                {/* Left accent bar */}
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: meta.color, opacity: 0.4 }} />

                <div style={{ paddingLeft: 6 }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                        <div style={{ width: 28, height: 28, background: meta.bg, border: `1px solid ${meta.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Icon style={{ width: 13, height: 13, color: meta.color }} strokeWidth={1.8} />
                        </div>
                        <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.16em', color: meta.color }}>
                          {entity.shortName}
                        </span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: TX1, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                        {entity.name}
                      </div>
                      <div style={{ fontSize: 11, color: TX2, marginTop: 3 }}>{entity.tagline}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 9px', background: meta.bg, border: `1px solid ${meta.border}` }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: meta.color, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Open</span>
                      <ChevronRight style={{ width: 10, height: 10, color: meta.color }} strokeWidth={2.5} />
                    </div>
                  </div>

                  {/* Stats row */}
                  {snap.loading ? (
                    <div style={{ height: 40, background: BD2, animation: 'shimmer 1.5s infinite' }} />
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, background: BD }}>
                      {[
                        { label: 'Revenue', value: fmtUSD(stats?.income ?? 0), color: TX1 },
                        { label: 'Net',     value: fmtUSD(net),                 color: net >= 0 ? GREEN : RED },
                        { label: 'Checks',  value: (stats?.pendingChecks ?? 0) === 0 ? '—' : String(stats.pendingChecks), color: stats?.pendingChecks ? AMBER : TX3 },
                      ].map(s => (
                        <div key={s.label} style={{ background: CARD, padding: '10px 12px', textAlign: 'center' }}>
                          <div style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: TX3, marginBottom: 4 }}>{s.label}</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: s.color, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Projects / Vendors pill row */}
                  {!snap.loading && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: BD2, border: `1px solid ${BD}` }}>
                        <FolderKanban style={{ width: 10, height: 10, color: TX3 }} strokeWidth={1.5} />
                        <span style={{ fontSize: 10, color: TX2 }}>{stats?.projects ?? 0} project{stats?.projects !== 1 ? 's' : ''}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: BD2, border: `1px solid ${BD}` }}>
                        <Users style={{ width: 10, height: 10, color: TX3 }} strokeWidth={1.5} />
                        <span style={{ fontSize: 10, color: TX2 }}>{stats?.vendors ?? 0} vendor{stats?.vendors !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Intelligence ── */}
        <SectionHeader label="Intelligence" sub="AI-powered operational recommendations for today" />
        <div style={{ marginBottom: 32 }}>
          {snap.loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2, 3].map(i => <div key={i} style={{ height: 68, background: BD2, animation: 'shimmer 1.5s infinite' }} />)}
            </div>
          ) : suggestions.length === 0 ? (
            <div style={{
              padding: '20px 24px', background: 'rgba(22,163,74,0.05)',
              border: '1px solid rgba(22,163,74,0.2)',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
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
              {suggestions.map((s, i) => {
                const p    = PRIORITY[s.priority];
                const Icon = s.icon;
                return (
                  <button
                    key={i}
                    onClick={() => {
                      if (s.entity) { const ent = ENTITIES.find(e => e.id === s.entity); if (ent) setEntity(ent); }
                      navigate(s.action);
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 18px', background: p.bg,
                      border: `1px solid ${p.border}`,
                      cursor: 'pointer', textAlign: 'left',
                      transition: 'all 0.15s', position: 'relative', overflow: 'hidden',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateX(3px)';
                      e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateX(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ width: 3, alignSelf: 'stretch', background: p.color, flexShrink: 0, marginLeft: -18, marginRight: -3 }} />
                    <div style={{
                      fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase',
                      color: p.color, fontWeight: 800, flexShrink: 0, width: 40,
                    }}>
                      {p.badge}
                    </div>
                    <div style={{ width: 30, height: 30, background: CARD, border: `1px solid ${BD}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon style={{ width: 13, height: 13, color: p.color }} strokeWidth={1.8} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: TX1, fontWeight: 500, lineHeight: 1.3 }}>{s.label}</div>
                      <div style={{ fontSize: 11, color: TX2, marginTop: 3 }}>{s.sub}</div>
                    </div>
                    <ArrowRight style={{ width: 13, height: 13, color: TX3, flexShrink: 0 }} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Platform portals ── */}
        <SectionHeader label="Platform" sub="Launch any system in the HOU INC platform" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 32 }}>
          {PORTALS.map(p => {
            const Icon = p.icon;
            return (
              <button
                key={p.to + p.label}
                onClick={() => navigate(p.to)}
                style={{
                  padding: '18px 20px', background: CARD, border: `1px solid ${BD}`,
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.18s',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = p.color + '40';
                  e.currentTarget.style.background = p.color + '08';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = BD;
                  e.currentTarget.style.background = CARD;
                  e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ width: 34, height: 34, background: p.color + '14', border: `1px solid ${p.color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon style={{ width: 15, height: 15, color: p.color }} strokeWidth={1.5} />
                  </div>
                  <ArrowRight style={{ width: 13, height: 13, color: TX3 }} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: TX1, marginBottom: 4 }}>{p.label}</div>
                <div style={{ fontSize: 11, color: TX2, lineHeight: 1.5 }}>{p.desc}</div>
              </button>
            );
          })}
        </div>

        {/* ── Quick Actions ── */}
        <SectionHeader label="Quick Actions" sub="Jump to any tool with a single tap" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8, marginBottom: 32 }}>
          {QUICK.map(a => {
            const Icon = a.icon;
            return (
              <button
                key={a.to + a.label}
                onClick={() => navigate(a.to)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 8, padding: '14px 8px',
                  background: CARD, border: `1px solid ${BD}`,
                  cursor: 'pointer', transition: 'all 0.15s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = a.color + '45';
                  e.currentTarget.style.background = a.color + '08';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.08)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = BD;
                  e.currentTarget.style.background = CARD;
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
                }}
              >
                <div style={{ width: 36, height: 36, background: a.color + '12', border: `1px solid ${a.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon style={{ width: 16, height: 16, color: a.color }} strokeWidth={1.5} />
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, color: TX1, textAlign: 'center', lineHeight: 1.2 }}>{a.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Footer ── */}
        <div style={{ paddingTop: 24, borderTop: `1px solid ${BD}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: TX1, fontFamily: SF }}>HOU INC · Internal Operations</div>
            <div style={{ fontSize: 10, color: TX3, marginTop: 2 }}>{user?.email} · Restricted access</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums', color: TX2 }}>
              {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div style={{ fontSize: 10, color: TX3 }}>
              {time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes shimmer {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.55; }
        }
        @media (min-width: 640px) {
          .sm-show { display: block !important; }
        }
      `}</style>
    </div>
  );
}

function SectionHeader({ label, sub }: { label: string; sub?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 3, height: 14, background: GOLD }} />
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: GOLD }}>
          {label}
        </span>
      </div>
      {sub && <span style={{ fontSize: 11, color: TX3 }}>{sub}</span>}
    </div>
  );
}
