import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEntity, ENTITIES } from '@/contexts/EntityContext';
import { fmtUSD } from '@/lib/format';
import {
  Building2, Zap, Landmark, LayoutGrid, FileText, ArrowDownToLine,
  ArrowUpFromLine, BookOpen, Receipt, BarChart3, ConciergeBell,
  FolderOpen, Users, FolderKanban, Settings, Globe, Shield,
  AlertTriangle, CheckCircle2, TrendingUp, Clock, Calendar,
  ArrowRight, LogOut, X, Layers, Activity,
} from 'lucide-react';

/* ── Entity icon + color map ─────────────────────────────────────────── */
const ENTITY_META: Record<string, { icon: React.ComponentType<any>; color: string; muted: string }> = {
  'houston-enterprise':           { icon: Building2, color: '#9D7E3F', muted: 'rgba(157,126,63,0.12)' },
  'houston-generator-pros':       { icon: Zap,       color: '#1B72B5', muted: 'rgba(27,114,181,0.12)' },
  'houston-enterprise-holdings':  { icon: Landmark,  color: '#2C5F8A', muted: 'rgba(44,95,138,0.12)' },
};

/* ── Snapshot types ──────────────────────────────────────────────────── */
interface EntityStat {
  income: number;
  expense: number;
  pendingChecks: number;
  pendingChecksValue: number;
  projects: number;
  vendors: number;
}

interface Snapshot {
  entityStats: Record<string, EntityStat>;
  overdueInvoices: { count: number; value: number };
  portalPending: number;
  totalPendingChecks: number;
  totalPendingChecksValue: number;
  lastIncomeDays: Record<string, number>; // entity → days since last income
  loading: boolean;
}

/* ── Intelligent suggestion engine ──────────────────────────────────── */
interface Suggestion {
  priority: 'critical' | 'high' | 'medium' | 'low';
  icon: React.ComponentType<any>;
  label: string;
  sub: string;
  action: string;
  entity?: string;
}

function buildSuggestions(snap: Snapshot): Suggestion[] {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  const date = now.getDate();
  const suggestions: Suggestion[] = [];

  // Critical: overdue invoices with value
  if (snap.overdueInvoices.count > 0) {
    suggestions.push({
      priority: 'critical',
      icon: AlertTriangle,
      label: `${snap.overdueInvoices.count} overdue invoice${snap.overdueInvoices.count > 1 ? 's' : ''} — ${fmtUSD(snap.overdueInvoices.value)} uncollected`,
      sub: 'Past-due receivables require immediate follow-up',
      action: '/invoices',
    });
  }

  // High: pending checks need clearing
  if (snap.totalPendingChecks > 0) {
    suggestions.push({
      priority: 'high',
      icon: FileText,
      label: `${snap.totalPendingChecks} check${snap.totalPendingChecks > 1 ? 's' : ''} pending clearance — ${fmtUSD(snap.totalPendingChecksValue)} outstanding`,
      sub: 'Update check statuses to keep books accurate',
      action: '/checks',
    });
  }

  // High: portal documents awaiting admin review
  if (snap.portalPending > 0) {
    suggestions.push({
      priority: 'high',
      icon: FolderOpen,
      label: `${snap.portalPending} client document${snap.portalPending > 1 ? 's' : ''} uploaded — awaiting your review`,
      sub: 'Clients have submitted files that need admin approval',
      action: '/admin',
    });
  }

  // Medium: entities with no income in 30+ days
  for (const [eid, days] of Object.entries(snap.lastIncomeDays)) {
    if (days > 30) {
      const entity = ENTITIES.find(e => e.id === eid);
      if (entity) {
        suggestions.push({
          priority: 'medium',
          icon: TrendingUp,
          label: `No income logged for ${entity.shortName} in ${days === 9999 ? 'an extended period' : `${days} days`}`,
          sub: 'Ensure revenue is being captured and reconciled',
          action: '/income',
          entity: eid,
        });
      }
    }
  }

  // Day-of-week intelligence
  if (day === 1) {
    suggestions.push({
      priority: 'medium',
      icon: Calendar,
      label: 'Monday — start the week with a cross-entity P&L review',
      sub: 'Compare last 7 days across all three entities',
      action: '/charts',
    });
  }
  if (day === 5) {
    suggestions.push({
      priority: 'medium',
      icon: CheckCircle2,
      label: 'Friday — reconcile this week before close',
      sub: 'Confirm all transactions are logged and categorized',
      action: '/ledger',
    });
  }

  // Month-end
  if (date >= 25 && date <= 31) {
    suggestions.push({
      priority: 'medium',
      icon: Activity,
      label: `Month-end in ${31 - date + 1} day${31 - date + 1 !== 1 ? 's' : ''} — prepare monthly close`,
      sub: 'Review outstanding balances, pending invoices, and check register',
      action: '/ledger',
    });
  }

  // Time-of-day
  if (hour < 9) {
    suggestions.push({
      priority: 'low',
      icon: Clock,
      label: 'Morning check-in — review overnight position',
      sub: 'Scan cash flow and flag any items that need attention today',
      action: '/finance/dashboard',
    });
  } else if (hour >= 16) {
    suggestions.push({
      priority: 'low',
      icon: Clock,
      label: 'End-of-day — confirm all transactions are logged',
      sub: 'Ensure today\'s activity is captured before close',
      action: '/ledger',
    });
  }

  return suggestions.slice(0, 6);
}

/* ── Priority colors ─────────────────────────────────────────────────── */
const PRIORITY_STYLE: Record<string, { dot: string; border: string; bg: string; label: string }> = {
  critical: { dot: '#ef4444', border: 'rgba(239,68,68,0.25)',  bg: 'rgba(239,68,68,0.05)',  label: 'URGENT' },
  high:     { dot: '#f59e0b', border: 'rgba(245,158,11,0.25)', bg: 'rgba(245,158,11,0.05)', label: 'HIGH' },
  medium:   { dot: '#9D7E3F', border: 'rgba(157,126,63,0.25)', bg: 'rgba(157,126,63,0.05)', label: 'REVIEW' },
  low:      { dot: '#6b7280', border: 'rgba(107,114,128,0.2)', bg: 'rgba(107,114,128,0.03)', label: 'INFO' },
};

/* ── Quick actions ───────────────────────────────────────────────────── */
const QUICK_ACTIONS = [
  { label: 'Log Income',     icon: ArrowDownToLine, to: '/income',           color: '#22c55e' },
  { label: 'Record Expense', icon: ArrowUpFromLine, to: '/expenses',         color: '#ef4444' },
  { label: 'Issue Check',    icon: FileText,        to: '/checks/new',       color: '#9D7E3F' },
  { label: 'New Invoice',    icon: Receipt,         to: '/invoices/new',     color: '#6366f1' },
  { label: 'Ledger',         icon: BookOpen,        to: '/ledger',           color: '#14b8a6' },
  { label: 'Charts',         icon: BarChart3,       to: '/charts',           color: '#8b5cf6' },
  { label: 'Vendors',        icon: Users,           to: '/vendors',          color: '#f97316' },
  { label: 'Projects',       icon: FolderKanban,    to: '/projects',         color: '#0ea5e9' },
  { label: 'Concierge',      icon: ConciergeBell,   to: '/concierge',        color: '#ec4899' },
  { label: 'Documents',      icon: FolderOpen,      to: '/documents',        color: '#78716c' },
  { label: 'Settings',       icon: Settings,        to: '/settings',         color: '#6b7280' },
];

/* ── Platform portals ────────────────────────────────────────────────── */
const PORTALS = [
  { label: 'Admin Panel',    icon: Shield, to: '/admin',   desc: 'Client management, portal docs, meetings' },
  { label: 'Client Portal',  icon: Globe,  to: '/portal',  desc: 'Client-facing portal & document requests' },
  { label: 'Public Website', icon: Globe,  to: '/',        desc: 'Houston Enterprise marketing site', external: true },
];

/* ─────────────────────────────────────────────────────────────────────
   Main Component
──────────────────────────────────────────────────────────────────────── */
export default function OpsCenter() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { setEntity } = useEntity();
  const [time, setTime] = useState(new Date());
  const [snap, setSnap] = useState<Snapshot>({
    entityStats: {},
    overdueInvoices: { count: 0, value: 0 },
    portalPending: 0,
    totalPendingChecks: 0,
    totalPendingChecksValue: 0,
    lastIncomeDays: {},
    loading: true,
  });

  // Tick clock
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Fetch cross-entity snapshot
  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().slice(0, 10);
      const [txnRes, checkRes, invoiceRes, portalRes, projectRes, vendorRes] = await Promise.all([
        supabase.from('transactions').select('entity_id, type, amount, transaction_date').is('deleted_at', null),
        supabase.from('checks').select('entity_id, amount, status').is('deleted_at', null),
        supabase.from('invoices').select('entity_id, status, line_items, tax_rate'),
        supabase.from('portal_documents').select('id, status').eq('status', 'uploaded'),
        supabase.from('projects').select('entity_id').is('deleted_at', null),
        supabase.from('vendors').select('entity_id').is('deleted_at', null),
      ]);

      // Per-entity stats
      const entityStats: Record<string, EntityStat> = {};
      ENTITIES.forEach(e => {
        entityStats[e.id] = { income: 0, expense: 0, pendingChecks: 0, pendingChecksValue: 0, projects: 0, vendors: 0 };
      });

      for (const t of txnRes.data ?? []) {
        if (!entityStats[t.entity_id]) continue;
        if (t.type === 'income')  entityStats[t.entity_id].income  += Number(t.amount);
        if (t.type === 'expense') entityStats[t.entity_id].expense += Number(t.amount);
      }

      let totalPendingChecks = 0;
      let totalPendingChecksValue = 0;
      for (const c of checkRes.data ?? []) {
        if (!entityStats[c.entity_id]) continue;
        if (c.status === 'pending') {
          entityStats[c.entity_id].pendingChecks++;
          entityStats[c.entity_id].pendingChecksValue += Number(c.amount);
          totalPendingChecks++;
          totalPendingChecksValue += Number(c.amount);
        }
      }

      for (const p of projectRes.data ?? []) {
        if (entityStats[p.entity_id]) entityStats[p.entity_id].projects++;
      }
      for (const v of vendorRes.data ?? []) {
        if (entityStats[v.entity_id]) entityStats[v.entity_id].vendors++;
      }

      // Overdue invoices
      let overdueCount = 0;
      let overdueValue = 0;
      for (const inv of invoiceRes.data ?? []) {
        if (inv.status === 'overdue' || (inv.status === 'sent' && inv.due_date < today)) {
          overdueCount++;
          const items: any[] = inv.line_items ?? [];
          const sub = items.reduce((s: number, i: any) => s + (i.qty ?? 0) * (i.rate ?? 0), 0);
          overdueValue += sub * (1 + (inv.tax_rate ?? 0) / 100);
        }
      }

      // Last income per entity
      const lastIncomeDays: Record<string, number> = {};
      for (const e of ENTITIES) {
        const rows = (txnRes.data ?? []).filter(t => t.entity_id === e.id && t.type === 'income');
        if (rows.length === 0) {
          lastIncomeDays[e.id] = 9999;
        } else {
          const latest = rows.reduce((max, t) => t.transaction_date > max ? t.transaction_date : max, '');
          const diff = Math.floor((Date.now() - new Date(latest).getTime()) / 86400000);
          lastIncomeDays[e.id] = diff;
        }
      }

      setSnap({
        entityStats,
        overdueInvoices: { count: overdueCount, value: overdueValue },
        portalPending: portalRes.data?.length ?? 0,
        totalPendingChecks,
        totalPendingChecksValue,
        lastIncomeDays,
        loading: false,
      });
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
  const greeting = time.getHours() < 12 ? 'Good morning' : time.getHours() < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#080808',
        color: '#e5e5e5',
        fontFamily: "'Inter', system-ui, sans-serif",
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle grid texture */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'linear-gradient(rgba(157,126,63,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(157,126,63,0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      {/* Glow top-left */}
      <div style={{
        position: 'fixed', top: -200, left: -200, width: 600, height: 600,
        background: 'radial-gradient(circle, rgba(157,126,63,0.06) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1280, margin: '0 auto', padding: '0 24px 80px' }}>

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 0 24px', borderBottom: '1px solid rgba(157,126,63,0.15)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', background: '#9D7E3F',
              boxShadow: '0 0 8px rgba(157,126,63,0.8)',
              animation: 'pulse 2s infinite',
            }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#9D7E3F', fontWeight: 700 }}>
                  Operations Center
                </span>
                <span style={{
                  fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase',
                  padding: '2px 6px', border: '1px solid rgba(157,126,63,0.4)',
                  color: 'rgba(157,126,63,0.6)', fontWeight: 600,
                }}>
                  RESTRICTED
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                {greeting}, {displayName} · HOU INC Internal Platform
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 18, fontWeight: 600, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.04em', color: '#e5e5e5' }}>
                {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>
                {time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
            <button
              onClick={() => navigate(-1)}
              style={{
                width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
                color: 'rgba(255,255,255,0.4)', cursor: 'pointer', borderRadius: 2,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { (e.target as HTMLElement).style.color = '#fff'; (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.3)'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.4)'; (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'; }}
            >
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>

        {/* ── Entity Hubs ── */}
        <Section label="Entity Hubs" sub="Select entity to set context and launch dashboard">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            {ENTITIES.map(entity => {
              const meta = ENTITY_META[entity.id];
              const stats = snap.entityStats[entity.id];
              const Icon = meta.icon;
              const net = (stats?.income ?? 0) - (stats?.expense ?? 0);
              return (
                <button
                  key={entity.id}
                  onClick={() => launchEntity(entity.id)}
                  style={{
                    background: meta.muted,
                    border: `1px solid ${meta.color}30`,
                    padding: '18px 20px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.18s',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget;
                    el.style.borderColor = `${meta.color}70`;
                    el.style.background = `${meta.color}18`;
                    el.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget;
                    el.style.borderColor = `${meta.color}30`;
                    el.style.background = meta.muted;
                    el.style.transform = 'translateY(0)';
                  }}
                >
                  {/* Accent bar */}
                  <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: meta.color }} />

                  <div style={{ paddingLeft: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Icon style={{ width: 16, height: 16, color: meta.color }} />
                        <span style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: meta.color, fontWeight: 700 }}>
                          {entity.shortName}
                        </span>
                      </div>
                      <ArrowRight style={{ width: 13, height: 13, color: `${meta.color}60` }} />
                    </div>

                    <div style={{ fontSize: 13, fontWeight: 600, color: '#e5e5e5', marginBottom: 3, lineHeight: 1.3 }}>
                      {entity.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 14 }}>
                      {entity.tagline}
                    </div>

                    {snap.loading ? (
                      <div style={{ height: 32, background: 'rgba(255,255,255,0.04)', borderRadius: 2, animation: 'pulse 1.5s infinite' }} />
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                        <Stat label="Income" value={fmtUSD(stats?.income ?? 0)} color={meta.color} />
                        <Stat label="Net" value={fmtUSD(net)} color={net >= 0 ? '#22c55e' : '#ef4444'} />
                        <Stat label="Pending" value={stats?.pendingChecks ?? 0} color={stats?.pendingChecks ? '#f59e0b' : 'rgba(255,255,255,0.2)'} />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </Section>

        {/* ── Intelligence ── */}
        <Section
          label="Intelligence"
          sub="What would you like to do today?"
        >
          {snap.loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ height: 64, background: 'rgba(255,255,255,0.03)', borderRadius: 2, animation: 'pulse 1.5s infinite' }} />
              ))}
            </div>
          ) : suggestions.length === 0 ? (
            <div style={{
              padding: '20px 24px', border: '1px solid rgba(34,197,94,0.2)', background: 'rgba(34,197,94,0.04)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <CheckCircle2 style={{ width: 16, height: 16, color: '#22c55e', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, color: '#e5e5e5', fontWeight: 500 }}>All clear — platform is healthy</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>No pending items or alerts detected across all entities</div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {suggestions.map((s, i) => {
                const style = PRIORITY_STYLE[s.priority];
                const Icon = s.icon;
                return (
                  <button
                    key={i}
                    onClick={() => navigate(s.action)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 18px',
                      background: style.bg,
                      border: `1px solid ${style.border}`,
                      cursor: 'pointer', textAlign: 'left',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = style.dot + '60'; e.currentTarget.style.background = style.bg.replace('0.05', '0.09').replace('0.04', '0.08').replace('0.03', '0.06'); }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = style.border; e.currentTarget.style.background = style.bg; }}
                  >
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: style.dot, flexShrink: 0, boxShadow: `0 0 6px ${style.dot}80` }} />
                    <div style={{
                      fontSize: 8, letterSpacing: '0.16em', textTransform: 'uppercase',
                      color: style.dot, fontWeight: 700, flexShrink: 0, width: 46,
                    }}>
                      {style.label}
                    </div>
                    <Icon style={{ width: 14, height: 14, color: style.dot, flexShrink: 0, opacity: 0.8 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: '#e5e5e5', fontWeight: 500, lineHeight: 1.3 }}>{s.label}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{s.sub}</div>
                    </div>
                    <ArrowRight style={{ width: 13, height: 13, color: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                  </button>
                );
              })}
            </div>
          )}
        </Section>

        {/* ── Platform Portals ── */}
        <Section label="Platform" sub="Launch any system in the HOU INC platform">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            {PORTALS.map(p => {
              const Icon = p.icon;
              return (
                <button
                  key={p.to}
                  onClick={() => p.external ? window.open(p.to, '_blank') : navigate(p.to)}
                  style={{
                    padding: '16px 18px', background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(157,126,63,0.35)'; e.currentTarget.style.background = 'rgba(157,126,63,0.06)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Icon style={{ width: 15, height: 15, color: '#9D7E3F' }} />
                    <ArrowRight style={{ width: 12, height: 12, color: 'rgba(255,255,255,0.15)' }} />
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#e5e5e5', marginBottom: 3 }}>{p.label}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', lineHeight: 1.4 }}>{p.desc}</div>
                </button>
              );
            })}
          </div>
        </Section>

        {/* ── Quick Actions ── */}
        <Section label="Quick Actions" sub="Jump to any tool in the finance platform">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {QUICK_ACTIONS.map(a => {
              const Icon = a.icon;
              return (
                <button
                  key={a.to}
                  onClick={() => navigate(a.to)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '8px 14px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    cursor: 'pointer', fontSize: 12, color: 'rgba(255,255,255,0.7)',
                    transition: 'all 0.15s', borderRadius: 2,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = a.color + '50';
                    e.currentTarget.style.color = '#fff';
                    e.currentTarget.style.background = a.color + '12';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  }}
                >
                  <Icon style={{ width: 13, height: 13, color: a.color }} />
                  {a.label}
                </button>
              );
            })}
          </div>
        </Section>

        {/* ── Footer ── */}
        <div style={{
          marginTop: 40, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            HOU INC · Internal Operations · {user?.email}
          </div>
          <button
            onClick={() => { signOut(); navigate('/auth'); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 11,
              color: 'rgba(255,255,255,0.25)', background: 'transparent', border: 'none',
              cursor: 'pointer', transition: 'color 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.25)'; }}
          >
            <LogOut style={{ width: 12, height: 12 }} /> Sign Out
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────────── */
function Section({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 36 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
        <span style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#9D7E3F', fontWeight: 700 }}>
          {label}
        </span>
        {sub && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{sub}</span>}
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
        {typeof value === 'number' && label === 'Pending' ? (value === 0 ? '—' : value) : value}
      </div>
    </div>
  );
}
