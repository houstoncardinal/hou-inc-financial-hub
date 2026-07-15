import { ReactNode } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, useRole, ROLE_LABELS } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useInvoices } from '@/hooks/useInvoices';
import { useEntity, ENTITIES } from '@/contexts/EntityContext';
import {
  LayoutGrid, FileText, ArrowDownToLine, ArrowUpFromLine,
  FolderKanban, Users, BookOpen, LogOut, ConciergeBell, BarChart3,
  Settings, Sun, Moon, Receipt, BookMarked, Globe,
  Building2, Zap, Landmark, Layers, FolderOpen, Plus, X, Menu,
} from 'lucide-react';
import ElevenLabsAgent from './ElevenLabsAgent';
import { sounds } from '@/hooks/useSound';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const navGroups = [
  {
    label: 'Daily',
    items: [
      { to: '/finance/dashboard', label: 'Overview',  icon: LayoutGrid,      end: true, desc: 'Balance, stats & charts' },
      { to: '/ledger',            label: 'Ledger',    icon: BookOpen,                   desc: 'Full transaction log' },
      { to: '/checks',            label: 'Checks',    icon: FileText,                   desc: 'Issue & track checks' },
      { to: '/income',            label: 'Income',    icon: ArrowDownToLine,            desc: 'Log revenue received' },
      { to: '/expenses',          label: 'Expenses',  icon: ArrowUpFromLine,            desc: 'Record outgoing costs' },
    ],
  },
  {
    label: 'Management',
    items: [
      { to: '/projects', label: 'Projects', icon: FolderKanban, desc: 'Active & archived jobs' },
      { to: '/vendors',  label: 'Vendors',  icon: Users,         desc: 'Vendor directory' },
    ],
  },
  {
    label: 'Billing',
    items: [
      { to: '/invoices', label: 'Invoices', icon: Receipt, desc: 'Billing & collections' },
    ],
  },
  {
    label: 'Analysis',
    items: [
      { to: '/charts',    label: 'Charts',    icon: BarChart3,   desc: 'Visual analytics' },
      { to: '/concierge', label: 'Concierge', icon: ConciergeBell, desc: 'Guided entry assistant' },
      { to: '/glossary',  label: 'Glossary',  icon: BookMarked,  desc: 'Terms & definitions' },
    ],
  },
  {
    label: 'Storage',
    items: [
      { to: '/documents', label: 'Documents', icon: FolderOpen, desc: 'Receipts & files' },
    ],
  },
];

const mobileQuickNav = [
  { to: '/finance/dashboard', label: 'Overview', icon: LayoutGrid, end: true },
  { to: '/ledger',            label: 'Ledger',   icon: BookOpen },
  { to: '/income',            label: 'Income',   icon: ArrowDownToLine },
  { to: '/expenses',          label: 'Expenses', icon: ArrowUpFromLine },
];

const ENTITY_ICONS: Record<string, React.ComponentType<any>> = {
  'houston-enterprise':           Building2,
  'houston-generator-pros':       Zap,
  'houston-enterprise-holdings':  Landmark,
};

/* ── Full-screen luxury mobile menu ─────────────────────────────────────── */
function FullscreenMobileMenu({
  open, onClose,
}: { open: boolean; onClose: () => void }) {
  const { user, signOut } = useAuth();
  const role = useRole();
  const { toggle, isDark } = useTheme();
  const { invoices } = useInvoices();
  const { entity, setEntity } = useEntity();
  const navigate = useNavigate();
  const overdueCount = invoices.filter((i: any) => i.status === 'overdue').length;
  const accentColor = entity?.color ?? '#9D7E3F';

  const go = (to: string) => {
    sounds.tap();
    onClose();
    navigate(to);
  };

  const switchEntity = (id: string) => {
    const found = ENTITIES.find(e => e.id === id);
    if (found) { setEntity(found); sounds.tap(); onClose(); navigate('/finance/dashboard'); }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col overflow-hidden"
          style={{ backgroundColor: '#0A0A0A' }}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Gold accent bar */}
          <div style={{ height: 3, background: `linear-gradient(90deg, ${accentColor} 0%, ${accentColor}88 100%)`, flexShrink: 0 }} />

          {/* Header */}
          <div
            style={{ flexShrink: 0, padding: '16px 20px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 2, height: 24, backgroundColor: accentColor, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.34em', textTransform: 'uppercase', color: accentColor }}>
                  HOU INC
                </div>
                <div style={{ fontSize: 7, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)', marginTop: 1 }}>
                  Finance Sector · {entity?.shortName ?? 'Select Entity'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                onClick={() => { toggle(); sounds.tap(); }}
                style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', background: 'transparent', cursor: 'pointer' }}
                aria-label="Toggle theme"
              >
                {isDark ? <Sun className="w-4 h-4" strokeWidth={1.5} /> : <Moon className="w-4 h-4" strokeWidth={1.5} />}
              </button>
              <button
                onClick={() => { sounds.close(); onClose(); }}
                style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid rgba(255,255,255,0.12)`, color: 'rgba(255,255,255,0.7)', background: 'transparent', cursor: 'pointer' }}
                aria-label="Close menu"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Entity switcher */}
          <div style={{ flexShrink: 0, padding: '12px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.36em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', marginBottom: 8 }}>
              Active Entity
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {ENTITIES.map(e => {
                const EIcon = ENTITY_ICONS[e.id] ?? Building2;
                const active = entity?.id === e.id;
                return (
                  <button
                    key={e.id}
                    onClick={() => switchEntity(e.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 12px',
                      border: `1px solid ${active ? e.color : 'rgba(255,255,255,0.06)'}`,
                      backgroundColor: active ? `${e.color}14` : 'transparent',
                      cursor: 'pointer', transition: 'all 0.18s ease',
                      borderLeft: active ? `3px solid ${e.color}` : '3px solid transparent',
                    }}
                  >
                    <div style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: active ? `${e.color}20` : 'rgba(255,255,255,0.05)', flexShrink: 0 }}>
                      <EIcon className="w-3.5 h-3.5" style={{ color: active ? e.color : 'rgba(255,255,255,0.4)' }} strokeWidth={1.5} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: active ? e.color : 'rgba(255,255,255,0.6)', lineHeight: 1.2 }}>{e.shortName}</div>
                      <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>{e.category}</div>
                    </div>
                    {active && <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: e.color, flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation — scrollable */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {navGroups.map(group => (
              <div key={group.label} style={{ marginBottom: 4 }}>
                <div style={{ padding: '8px 20px 4px', fontSize: 7, fontWeight: 700, letterSpacing: '0.36em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.24)' }}>
                  {group.label}
                </div>
                {group.items.map(item => (
                  <button
                    key={item.to}
                    onClick={() => go(item.to)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                      padding: '11px 20px', textAlign: 'left', cursor: 'pointer',
                      background: 'transparent', border: 'none', borderLeft: '2px solid transparent',
                      transition: 'background 0.15s ease, border-color 0.15s ease',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.04)';
                      (e.currentTarget as HTMLElement).style.borderLeftColor = accentColor;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                      (e.currentTarget as HTMLElement).style.borderLeftColor = 'transparent';
                    }}
                  >
                    <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: `${accentColor}12`, border: `1px solid ${accentColor}22`, flexShrink: 0 }}>
                      <item.icon className="w-4 h-4" style={{ color: accentColor }} strokeWidth={1.5} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', lineHeight: 1.25 }}>
                        {item.label}
                        {item.to === '/invoices' && overdueCount > 0 && (
                          <span style={{ marginLeft: 8, fontSize: 8, fontWeight: 800, padding: '2px 6px', backgroundColor: accentColor, color: '#fff', letterSpacing: '0.1em' }}>
                            {overdueCount} OVERDUE
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginTop: 2 }}>{(item as any).desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            ))}

            {/* Entity selector link */}
            <div style={{ padding: '8px 20px 4px', fontSize: 7, fontWeight: 700, letterSpacing: '0.36em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.24)' }}>
              Navigation
            </div>
            <button onClick={() => go('/finance')}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '11px 20px', textAlign: 'left', cursor: 'pointer', background: 'transparent', border: 'none', borderLeft: '2px solid transparent' }}>
              <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: `${accentColor}12`, border: `1px solid ${accentColor}22`, flexShrink: 0 }}>
                <Layers className="w-4 h-4" style={{ color: accentColor }} strokeWidth={1.5} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>Switch Entity</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginTop: 2 }}>Change active business entity</div>
              </div>
            </button>
            <button onClick={() => go('/')}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '11px 20px', textAlign: 'left', cursor: 'pointer', background: 'transparent', border: 'none', borderLeft: '2px solid transparent' }}>
              <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
                <Globe className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.4)' }} strokeWidth={1.5} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>HOU INC Website</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.24)', marginTop: 2 }}>Return to public site</div>
              </div>
            </button>
          </div>

          {/* Footer — user + sign out */}
          <div style={{ flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.07)', padding: '12px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: `${accentColor}22`, border: `1px solid ${accentColor}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: accentColor, flexShrink: 0 }}>
                {(user?.user_metadata?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.8)', truncate: 'true' }}>
                  {user?.user_metadata?.full_name || 'User'}
                  {role !== 'admin' && (
                    <span style={{ marginLeft: 6, fontSize: 7, fontWeight: 800, letterSpacing: '0.18em', padding: '1px 5px', backgroundColor: `${accentColor}22`, color: accentColor, border: `1px solid ${accentColor}44` }}>
                      {ROLE_LABELS[role]}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{user?.email}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => go('/settings')}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer' }}
              >
                <Settings className="w-3.5 h-3.5" strokeWidth={1.5} /> Settings
              </button>
              <button
                onClick={async () => { sounds.click(); await signOut(); navigate('/auth'); onClose(); }}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px', border: '1px solid rgba(239,68,68,0.22)', backgroundColor: 'rgba(239,68,68,0.06)', color: 'rgba(239,68,68,0.7)', fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer' }}
              >
                <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} /> Sign Out
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Add Entry Sheet ─────────────────────────────────────────────────────── */
function AddEntrySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { entity } = useEntity();
  const navigate   = useNavigate();
  const accentColor = entity?.color ?? '#9D7E3F';

  const ENTRY_OPTIONS = [
    {
      label:       'Income',
      description: 'Log revenue or a payment received',
      icon:        ArrowDownToLine,
      route:       '/income',
      color:       '#10b981',
      bg:          'rgba(16,185,129,0.08)',
      border:      'rgba(16,185,129,0.22)',
    },
    {
      label:       'Expense',
      description: 'Record an outgoing payment or cost',
      icon:        ArrowUpFromLine,
      route:       '/expenses',
      color:       '#ef4444',
      bg:          'rgba(239,68,68,0.07)',
      border:      'rgba(239,68,68,0.2)',
    },
    {
      label:       'Check',
      description: 'Issue a new check to a payee',
      icon:        FileText,
      route:       '/checks/new',
      color:       '#f59e0b',
      bg:          'rgba(245,158,11,0.08)',
      border:      'rgba(245,158,11,0.22)',
    },
    {
      label:       'Concierge',
      description: 'Guided walkthrough for any entry',
      icon:        ConciergeBell,
      route:       '/concierge',
      color:       accentColor,
      bg:          `${accentColor}12`,
      border:      `${accentColor}35`,
    },
  ] as const;

  const go = (route: string) => {
    sounds.tap();
    onClose();
    navigate(route);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => { sounds.close(); onClose(); }}
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 bg-background border-t border-border"
            style={{ borderRadius: '16px 16px 0 0', paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 40 }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-9 h-1 rounded-full bg-border" />
            </div>
            <div className="px-5 pt-2 pb-4 flex items-center justify-between">
              <div>
                <div className="text-[8px] uppercase tracking-[0.3em] font-bold mb-0.5" style={{ color: accentColor }}>
                  {entity ? entity.name : 'Finance Hub'}
                </div>
                <div className="text-[18px] font-bold tracking-tight">Add Entry</div>
              </div>
              <button
                onClick={() => { sounds.close(); onClose(); }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
            {entity && (
              <div className="mx-5 mb-4 flex items-center gap-2.5 px-3 py-2.5 border"
                style={{ borderColor: `${accentColor}30`, backgroundColor: `${accentColor}08` }}>
                <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: accentColor }} />
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: accentColor }}>{entity.shortName}</div>
                  <div className="text-[9px] text-muted-foreground">{entity.category}</div>
                </div>
                <div className="ml-auto text-[9px] text-muted-foreground">Entry will be saved to this entity</div>
              </div>
            )}
            <div className="px-5 grid grid-cols-2 gap-3">
              {ENTRY_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <motion.button
                    key={opt.label}
                    onClick={() => go(opt.route)}
                    whileTap={{ scale: 0.97 }}
                    className="flex flex-col items-start gap-2.5 p-4 border text-left transition-colors active:opacity-80"
                    style={{ backgroundColor: opt.bg, borderColor: opt.border }}
                  >
                    <div className="w-9 h-9 flex items-center justify-center"
                      style={{ backgroundColor: `${opt.color}18`, border: `1px solid ${opt.border}` }}>
                      <Icon className="w-4 h-4" style={{ color: opt.color }} strokeWidth={1.75} />
                    </div>
                    <div>
                      <div className="text-[13px] font-bold leading-tight" style={{ color: opt.color }}>{opt.label}</div>
                      <div className="text-[10px] text-muted-foreground leading-snug mt-0.5">{opt.description}</div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
            <div className="px-5 pt-4 text-[9px] text-muted-foreground text-center">
              All entries sync to your database in real time
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function NavContent({ onNavigate, isMobileSheet }: { onNavigate?: () => void; isMobileSheet?: boolean }) {
  const { user, signOut } = useAuth();
  const role = useRole();
  const { toggle, isDark } = useTheme();
  const { invoices } = useInvoices();
  const { entity, setEntity } = useEntity();
  const navigate = useNavigate();
  const location = useLocation();
  const displayName = user?.user_metadata?.full_name || '';
  const initials = (displayName || user?.email || 'U').charAt(0).toUpperCase();
  const overdueCount = invoices.filter((i: any) => i.status === 'overdue').length;

  const handleSettings = () => { navigate('/settings'); onNavigate?.(); sounds.tap(); };

  const handleEntitySwitch = (id: string) => {
    const found = ENTITIES.find(e => e.id === id);
    if (found) { setEntity(found); navigate('/finance/dashboard'); onNavigate?.(); sounds.tap(); }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="px-5 h-14 flex items-center border-b border-border shrink-0">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-0.5 h-5 bg-accent shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-bold tracking-[0.12em] uppercase">HOU INC</div>
            <div className="text-[7px] uppercase tracking-[0.2em] text-muted-foreground">Finance Sector</div>
          </div>
        </div>
        <button
          onClick={() => { toggle(); sounds.tap(); }}
          className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary rounded-sm transition-all shrink-0"
          style={{ marginRight: isMobileSheet ? 40 : 0 }}
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="w-3.5 h-3.5" strokeWidth={1.5} /> : <Moon className="w-3.5 h-3.5" strokeWidth={1.5} />}
        </button>
      </div>

      <div className="shrink-0 border-b border-border">
        <div className="px-4 pt-3 pb-1.5 flex items-center justify-between">
          <span className="text-[7px] uppercase tracking-[0.3em] font-bold text-muted-foreground/60">Entity</span>
          <NavLink
            to="/finance"
            onClick={() => { onNavigate?.(); sounds.tap(); }}
            className={({ isActive }) => `text-[7px] uppercase tracking-[0.2em] font-semibold transition-colors ${isActive ? 'text-accent' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Full Selector →
          </NavLink>
        </div>
        <div className="px-2 pb-2.5 space-y-0.5">
          {ENTITIES.map(e => {
            const EIcon = ENTITY_ICONS[e.id] ?? Building2;
            const active = entity?.id === e.id;
            return (
              <button
                key={e.id}
                onClick={() => handleEntitySwitch(e.id)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left transition-all duration-200 relative overflow-hidden"
                style={{ backgroundColor: active ? e.colorMuted : 'transparent', border: `1px solid ${active ? e.color : 'transparent'}` }}
              >
                {active && <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ backgroundColor: e.color }} />}
                <div className="w-5 h-5 flex items-center justify-center shrink-0"
                  style={{ backgroundColor: active ? e.colorMuted : 'var(--secondary)', border: `1px solid ${active ? e.color : 'var(--border)'}`, transition: 'background 0.2s, border-color 0.2s' }}>
                  <EIcon className="w-2.5 h-2.5" style={{ color: active ? e.color : 'var(--muted-foreground)', strokeWidth: 1.5 }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[9px] font-bold uppercase tracking-[0.1em] truncate leading-tight" style={{ color: active ? e.color : 'var(--foreground)' }}>{e.shortName}</div>
                  <div className="text-[7px] text-muted-foreground uppercase tracking-[0.14em] truncate leading-tight">{e.category}</div>
                </div>
                {active && <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: e.color }} />}
              </button>
            );
          })}
        </div>
      </div>

      <nav className="flex-1 py-2 overflow-y-auto">
        {navGroups.map(group => (
          <div key={group.label} className="mb-2">
            <div className="px-5 py-1.5">
              <span className="text-[7px] uppercase tracking-[0.18em] text-muted-foreground/60 font-semibold">{group.label}</span>
            </div>
            {group.items.map(n => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                onClick={() => { onNavigate?.(); sounds.tap(); }}
                className={({ isActive }) =>
                  `relative flex items-center gap-3 px-5 py-2 text-xs transition-all duration-150 ${isActive ? 'text-foreground bg-secondary font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'}`
                }
              >
                <n.icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                <span className="flex-1">{n.label}</span>
                {n.to === '/invoices' && overdueCount > 0 && (
                  <span className="text-[8px] font-bold px-1 py-0.5 min-w-[16px] text-center bg-accent text-background leading-none">{overdueCount > 9 ? '9+' : overdueCount}</span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t border-border shrink-0">
        <button
          onClick={handleSettings}
          className={`w-full flex items-center gap-3 px-5 py-2.5 text-xs transition-colors hover:bg-secondary/40 ${location.pathname === '/settings' ? 'bg-secondary' : ''}`}
        >
          <div className="w-6 h-6 rounded-full bg-foreground/10 flex items-center justify-center text-[9px] font-bold text-foreground shrink-0">{initials}</div>
          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-foreground text-[11px]">{displayName || 'User'}</span>
              {role !== 'admin' && (
                <span className="shrink-0 text-[7px] uppercase tracking-[0.16em] px-1 py-0.5 font-bold bg-accent/10 text-accent border border-accent/30">{ROLE_LABELS[role]}</span>
              )}
            </div>
            <div className="truncate text-muted-foreground text-[9px]">{user?.email}</div>
          </div>
          <Settings className="w-3 h-3 text-muted-foreground shrink-0" strokeWidth={1.5} />
        </button>
        <NavLink to="/" end onClick={() => { onNavigate?.(); sounds.tap(); }}
          className="w-full flex items-center gap-3 px-5 py-2 text-[10px] text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors">
          <Globe className="w-3 h-3 shrink-0" strokeWidth={1.5} />
          <span>HOU INC Website</span>
        </NavLink>
        <button
          onClick={async () => { sounds.click(); await signOut(); navigate('/auth'); onNavigate?.(); }}
          className="w-full flex items-center gap-3 px-5 py-2 text-[10px] text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors"
        >
          <LogOut className="w-3 h-3 shrink-0" strokeWidth={1.5} />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const [fullMenuOpen, setFullMenuOpen] = useState(false);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const { toggle, isDark } = useTheme();
  const { entity } = useEntity();
  const accentColor = entity?.color ?? '#9D7E3F';

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-52 border-r border-border flex-col z-30">
        <NavContent />
      </aside>

      {/* Mobile header */}
      <header className="md:hidden fixed top-0 inset-x-0 h-12 bg-background border-b border-border flex items-center justify-between px-4 z-30">
        <div className="flex items-center gap-2">
          <div className="w-0.5 h-4 bg-accent" />
          <div className="text-[10px] font-bold tracking-[0.12em] uppercase">HOU INC</div>
          {entity && (
            <div className="text-[8px] uppercase tracking-[0.18em] font-semibold ml-1" style={{ color: accentColor }}>
              · {entity.shortName}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => { toggle(); sounds.tap(); }}
            className="h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4" strokeWidth={1.5} /> : <Moon className="w-4 h-4" strokeWidth={1.5} />}
          </button>
          <button
            onClick={() => { setFullMenuOpen(true); sounds.open(); }}
            className="h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground -mr-1"
            aria-label="Open menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Full-screen mobile menu */}
      <FullscreenMobileMenu open={fullMenuOpen} onClose={() => setFullMenuOpen(false)} />

      <ElevenLabsAgent />

      {/* Main */}
      <main className="md:ml-52 min-h-screen flex flex-col">
        <div className="md:hidden h-12 shrink-0" />
        <div className="flex-1 page-enter">{children}</div>
        <div className="md:hidden h-16 shrink-0" />
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 h-16 bg-background border-t border-border z-30 flex items-stretch"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {mobileQuickNav.map(n => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            onClick={() => sounds.tap()}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${isActive ? 'text-foreground' : 'text-muted-foreground'}`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`p-1 transition-colors ${isActive ? 'bg-secondary' : ''}`}>
                  <n.icon className="w-4 h-4" strokeWidth={isActive ? 2 : 1.5} />
                </div>
                <span className={`text-[8px] uppercase tracking-[0.08em] ${isActive ? 'font-semibold' : ''}`}>{n.label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* Add Entry slot */}
        <button
          onClick={() => { sounds.open(); setAddSheetOpen(true); }}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors text-background relative"
          aria-label="Add Entry"
        >
          <div
            className="w-9 h-9 flex items-center justify-center rounded-full shadow-md transition-transform active:scale-95"
            style={{ backgroundColor: accentColor }}
          >
            <Plus className="w-4.5 h-4.5" strokeWidth={2.5} style={{ color: '#fff' }} />
          </div>
          <span className="text-[8px] uppercase tracking-[0.08em] font-semibold" style={{ color: accentColor }}>Add</span>
        </button>

        {/* Menu slot */}
        <button
          onClick={() => { sounds.open(); setFullMenuOpen(true); }}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 text-muted-foreground transition-colors"
          aria-label="All sections"
        >
          <div className="p-1">
            <Menu className="w-4 h-4" strokeWidth={1.5} />
          </div>
          <span className="text-[8px] uppercase tracking-[0.08em]">Menu</span>
        </button>
      </nav>

      {/* Add Entry sheet */}
      <AddEntrySheet open={addSheetOpen} onClose={() => setAddSheetOpen(false)} />
    </div>
  );
}
