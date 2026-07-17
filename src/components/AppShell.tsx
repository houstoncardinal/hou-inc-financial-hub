import { ReactNode } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, useRole, ROLE_LABELS } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useInvoices } from '@/hooks/useInvoices';
import { useEntity, ENTITIES } from '@/contexts/EntityContext';
import { useFinanceRealtime } from '@/hooks/useFinance';
import {
  LayoutGrid, FileText, ArrowDownToLine, ArrowUpFromLine,
  FolderKanban, Users, BookOpen, LogOut, ConciergeBell, BarChart3,
  Settings, Sun, Moon, Receipt, Globe,
  Building2, Zap, Landmark, Layers, FolderOpen, Plus, X, ChevronDown, Check,
  MoreHorizontal, History, ShieldCheck,
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
      { to: '/finance/controls', label: 'Controls', icon: ShieldCheck, desc: 'WIP, aging, roles & bank matching' },
      { to: '/changelog', label: 'Changelog', icon: History,     desc: 'Finance audit trail' },
      { to: '/concierge', label: 'Concierge', icon: ConciergeBell, desc: 'Guided entry assistant' },
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
  { to: '/projects',          label: 'Projects', icon: FolderKanban },
];

const ENTITY_ICONS: Record<string, React.ComponentType<any>> = {
  'houston-enterprise':           Building2,
  'houston-generator-pros':       Zap,
  'houston-enterprise-holdings':  Landmark,
};

function ShellEntitySelector({ compact = false }: { compact?: boolean }) {
  const { entity, setEntity } = useEntity();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const active = entity ?? ENTITIES[0];
  const ActiveIcon = ENTITY_ICONS[active.id] ?? Building2;

  const choose = (id: string) => {
    const found = ENTITIES.find(e => e.id === id);
    if (!found) return;
    setEntity(found);
    setOpen(false);
    sounds.tap();
    navigate('/finance/dashboard');
  };

  return (
    <div className={`relative min-w-0 ${compact ? 'flex-1' : 'flex-1'}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`group w-full min-w-0 border transition-all hover:bg-secondary/45 active:opacity-80 shadow-[0_1px_0_rgba(255,255,255,0.45)_inset] dark:shadow-[0_1px_0_rgba(255,255,255,0.05)_inset] ${
          compact
            ? 'h-9 px-2 flex items-center gap-1.5'
            : 'h-10 px-2.5 flex items-center gap-2'
        }`}
        style={{ borderColor: `${active.color}30`, backgroundColor: 'hsl(var(--background))' }}
        aria-label="Switch finance entity"
      >
        <div
          className={`${compact ? 'w-5 h-5' : 'w-6 h-6'} flex items-center justify-center shrink-0`}
          style={{ backgroundColor: `${active.color}10`, border: `1px solid ${active.color}35` }}
        >
          <ActiveIcon className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} style={{ color: active.color }} strokeWidth={1.7} />
        </div>
        <div className="min-w-0 flex-1 text-left">
          <div className={`${compact ? 'text-[10px]' : 'text-[11px]'} font-bold tracking-tight truncate leading-tight text-foreground`}>
            {active.name}
          </div>
          <div className={`${compact ? 'text-[7px]' : 'text-[8px]'} uppercase tracking-[0.16em] text-muted-foreground truncate mt-0.5`}>
            {active.category}
          </div>
        </div>
        <ChevronDown className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: active.color }} strokeWidth={2} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.13, ease: [0.16, 1, 0.3, 1] }}
            className={`absolute left-0 top-full mt-2 border border-border bg-background shadow-[0_20px_55px_rgba(0,0,0,0.16)] dark:shadow-[0_22px_70px_rgba(0,0,0,0.55)] z-50 overflow-hidden ${
              compact ? 'w-[min(94vw,22rem)]' : 'w-full min-w-[18rem]'
            }`}
          >
            <div className="px-3 py-2.5 border-b border-border/60" style={{ background: `linear-gradient(135deg, ${active.color}0F, transparent 64%)` }}>
              <div className="text-[8px] uppercase tracking-[0.24em] text-muted-foreground font-bold">Finance Entity</div>
              <div className="text-[10px] text-foreground/75 mt-1 truncate">Select the operating company for this dashboard.</div>
            </div>
            <div className="p-1.5 space-y-1">
              {ENTITIES.map(e => {
                const EIcon = ENTITY_ICONS[e.id] ?? Building2;
                const selected = e.id === active.id;
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => choose(e.id)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left transition-all hover:bg-secondary/55 border"
                    style={{ backgroundColor: selected ? `${e.color}0D` : undefined, borderColor: selected ? `${e.color}45` : 'hsl(var(--border))', borderLeft: selected ? `2px solid ${e.color}` : '2px solid transparent' }}
                  >
                    <div className="w-6 h-6 flex items-center justify-center shrink-0" style={{ backgroundColor: `${e.color}10`, border: `1px solid ${e.color}30` }}>
                      <EIcon className="w-3.5 h-3.5" style={{ color: e.color }} strokeWidth={1.6} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-semibold truncate">{e.name}</div>
                      <div className="text-[8px] text-muted-foreground truncate mt-0.5">{e.category} · {e.tagline}</div>
                    </div>
                    {selected && <Check className="w-3.5 h-3.5 shrink-0" style={{ color: e.color }} strokeWidth={2.3} />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

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
  const allNavItems = navGroups.flatMap(group => group.items.map(item => ({ ...item, group: group.label })));

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
          style={{ backgroundColor: '#F8F7F3', color: '#171717' }}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          <div style={{ height: 3, background: `linear-gradient(90deg, ${accentColor} 0%, ${accentColor}88 100%)`, flexShrink: 0 }} />

          <div
            style={{ flexShrink: 0, padding: '12px 14px 10px', borderBottom: '1px solid #E6E1D8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFFFFF' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 2, height: 24, backgroundColor: accentColor, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.34em', textTransform: 'uppercase', color: accentColor }}>
                  HOU INC
                </div>
                <div style={{ fontSize: 7, letterSpacing: '0.24em', textTransform: 'uppercase', color: '#777', marginTop: 1 }}>
                  Finance Sector · {entity?.shortName ?? 'Select Entity'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                onClick={() => { toggle(); sounds.tap(); }}
                style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #E1DED6', color: '#555', background: '#FAFAFA', cursor: 'pointer' }}
                aria-label="Toggle theme"
              >
                {isDark ? <Sun className="w-4 h-4" strokeWidth={1.5} /> : <Moon className="w-4 h-4" strokeWidth={1.5} />}
              </button>
              <button
                onClick={() => { sounds.close(); onClose(); }}
                style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #E1DED6', color: '#333', background: '#FFFFFF', cursor: 'pointer' }}
                aria-label="Close menu"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          <div style={{ flexShrink: 0, padding: '9px 12px 8px', borderBottom: '1px solid #E6E1D8', background: '#FBFAF7' }}>
            <div style={{ fontSize: 7, fontWeight: 800, letterSpacing: '0.28em', textTransform: 'uppercase', color: '#777', marginBottom: 6 }}>
              Active Entity
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 5 }}>
              {ENTITIES.map(e => {
                const EIcon = ENTITY_ICONS[e.id] ?? Building2;
                const active = entity?.id === e.id;
                return (
                  <button
                    key={e.id}
                    onClick={() => switchEntity(e.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '7px 7px',
                      border: `1px solid ${active ? `${e.color}66` : '#E1DED6'}`,
                      backgroundColor: active ? `${e.color}12` : '#FFFFFF',
                      cursor: 'pointer',
                      minWidth: 0,
                    }}
                  >
                    <div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: active ? `${e.color}18` : '#F4F2ED', flexShrink: 0 }}>
                      <EIcon className="w-3 h-3" style={{ color: active ? e.color : '#777' }} strokeWidth={1.5} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                      <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: active ? e.color : '#333', lineHeight: 1.12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.shortName}</div>
                      <div style={{ fontSize: 6.5, color: '#777', letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.category}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ flex: 1, overflow: 'hidden', padding: '8px 12px 7px', background: '#F8F7F3' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ fontSize: 7, fontWeight: 800, letterSpacing: '0.28em', textTransform: 'uppercase', color: '#777' }}>Finance Navigation</div>
              <div style={{ fontSize: 8, color: '#777' }}>{allNavItems.length + 2} destinations</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 7 }}>
              {navGroups.map(group => (
                <div key={group.label} style={{ minWidth: 0, background: '#FFFFFF', border: '1px solid #E1DED6', boxShadow: '0 1px 4px rgba(10,10,10,0.035)' }}>
                  <div style={{ height: 2, background: group.label === 'Daily' ? accentColor : '#D8D2C4' }} />
                  <div style={{ padding: '6px 7px 2px', fontSize: 7, fontWeight: 850, letterSpacing: '0.22em', textTransform: 'uppercase', color: group.label === 'Daily' ? accentColor : '#777' }}>{group.label}</div>
                  <div style={{ padding: '0 5px 5px', display: 'grid', gap: 3 }}>
                    {group.items.map(item => (
                      <button
                        key={item.to}
                        onClick={() => go(item.to)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          minWidth: 0,
                          minHeight: 28,
                          padding: '4px 5px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          background: '#FBFAF7',
                          border: '1px solid #EEE9DF',
                        }}
                      >
                        <div style={{ width: 21, height: 21, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: `${accentColor}0F`, border: `1px solid ${accentColor}22`, flexShrink: 0 }}>
                          <item.icon className="w-3 h-3" style={{ color: accentColor }} strokeWidth={1.55} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 9.5, fontWeight: 780, color: '#1F1F1F', lineHeight: 1.05, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.label}
                            {item.to === '/invoices' && overdueCount > 0 && (
                              <span style={{ marginLeft: 4, fontSize: 6.5, fontWeight: 800, padding: '1px 3px', backgroundColor: accentColor, color: '#fff', letterSpacing: '0.08em' }}>
                                {overdueCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6, marginTop: 6 }}>
            <button onClick={() => go('/finance')}
              style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 40, padding: '7px 8px', textAlign: 'left', cursor: 'pointer', background: '#F2EFE7', border: '1px solid #DED8CA' }}>
              <div style={{ width: 27, height: 27, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: `${accentColor}12`, border: `1px solid ${accentColor}24`, flexShrink: 0 }}>
                <Layers className="w-3.5 h-3.5" style={{ color: accentColor }} strokeWidth={1.5} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10.5, fontWeight: 800, color: '#1F1F1F' }}>Switch Entity</div>
                <div style={{ fontSize: 7, color: '#777', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Business</div>
              </div>
            </button>
            <button onClick={() => go('/')}
              style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 40, padding: '7px 8px', textAlign: 'left', cursor: 'pointer', background: '#FFFFFF', border: '1px solid #E1DED6' }}>
              <div style={{ width: 27, height: 27, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F2ED', border: '1px solid #E1DED6', flexShrink: 0 }}>
                <Globe className="w-3.5 h-3.5" style={{ color: '#777' }} strokeWidth={1.5} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10.5, fontWeight: 800, color: '#1F1F1F' }}>Website</div>
                <div style={{ fontSize: 7, color: '#777', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Public site</div>
              </div>
            </button>
            </div>
          </div>

          <div style={{ flexShrink: 0, borderTop: '1px solid #E6E1D8', padding: '8px 12px', paddingBottom: 'calc(8px + env(safe-area-inset-bottom))', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: `${accentColor}18`, border: `1px solid ${accentColor}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: accentColor, flexShrink: 0 }}>
                {(user?.user_metadata?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10.5, fontWeight: 800, color: '#222', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.user_metadata?.full_name || 'User'}
                  {role !== 'admin' && (
                    <span style={{ marginLeft: 6, fontSize: 7, fontWeight: 800, letterSpacing: '0.14em', padding: '1px 5px', backgroundColor: `${accentColor}12`, color: accentColor, border: `1px solid ${accentColor}35` }}>
                      {ROLE_LABELS[role]}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 8.5, color: '#777', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
              </div>
              <button
                onClick={() => go('/settings')}
                style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #E1DED6', backgroundColor: '#FAFAFA', color: '#555', cursor: 'pointer', flexShrink: 0 }}
                aria-label="Settings"
              >
                <Settings className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
              <button
                onClick={async () => { sounds.click(); await signOut(); navigate('/auth'); onClose(); }}
                style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(164,30,30,0.22)', backgroundColor: 'rgba(164,30,30,0.05)', color: '#8b1e1e', cursor: 'pointer', flexShrink: 0 }}
                aria-label="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
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

  return (
    <div className="flex flex-col h-full bg-background/98">
      <div className="px-3 h-14 flex items-center gap-2 border-b border-border shrink-0 bg-gradient-to-b from-secondary/25 to-background">
        <ShellEntitySelector />
        <button
          onClick={() => { toggle(); sounds.tap(); }}
          className="w-8 h-8 border border-border/70 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary rounded-sm transition-all shrink-0"
          style={{ marginRight: isMobileSheet ? 40 : 0 }}
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="w-3.5 h-3.5" strokeWidth={1.5} /> : <Moon className="w-3.5 h-3.5" strokeWidth={1.5} />}
        </button>
      </div>

      <nav className="flex-1 py-1.5 overflow-hidden">
        {navGroups.map(group => (
          <div key={group.label} className="mb-1">
            <div className="px-4 py-0.5">
              <span className="text-[7px] uppercase tracking-[0.24em] text-foreground/55 font-bold">{group.label}</span>
            </div>
            {group.items.map(n => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                onClick={() => { onNavigate?.(); sounds.tap(); }}
                className={({ isActive }) =>
                  `relative mx-2.5 flex items-center gap-2 px-2.5 py-1 text-[11px] transition-all duration-150 border ${
                    isActive
                      ? 'text-foreground bg-secondary/80 font-semibold border-border shadow-[0_1px_0_rgba(255,255,255,0.45)_inset] dark:shadow-[0_1px_0_rgba(255,255,255,0.05)_inset]'
                      : 'text-foreground/78 border-transparent hover:text-foreground hover:bg-secondary/45 hover:border-border/70'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className="absolute left-0 top-2 bottom-2 w-[2px]"
                      style={{ backgroundColor: isActive ? (entity?.color ?? '#9D7E3F') : 'transparent' }}
                    />
                    <span
                      className={`w-5 h-5 flex items-center justify-center shrink-0 border ${isActive ? 'bg-background border-border' : 'bg-secondary/30 border-border/40'}`}
                      style={{ color: isActive ? (entity?.color ?? undefined) : undefined }}
                    >
                      <n.icon className="w-3 h-3" strokeWidth={1.6} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block truncate leading-tight">{n.label}</span>
                      <span className="block text-[7px] text-foreground/45 truncate mt-px leading-tight">{n.desc}</span>
                    </span>
                    {n.to === '/invoices' && overdueCount > 0 && (
                      <span className="text-[8px] font-bold px-1 py-0.5 min-w-[16px] text-center bg-accent text-background leading-none">{overdueCount > 9 ? '9+' : overdueCount}</span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t border-border shrink-0 bg-secondary/20">
        <button
          onClick={handleSettings}
          className={`w-full flex items-center gap-2.5 px-4 py-1.5 text-xs transition-colors hover:bg-secondary/45 ${location.pathname === '/settings' ? 'bg-secondary' : ''}`}
        >
          <div className="w-6 h-6 bg-foreground/10 border border-border/70 flex items-center justify-center text-[9px] font-bold text-foreground shrink-0">{initials}</div>
          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-foreground text-[11px]">{displayName || 'User'}</span>
              {role !== 'admin' && (
                <span className="shrink-0 text-[7px] uppercase tracking-[0.16em] px-1 py-0.5 font-bold bg-accent/10 text-accent border border-accent/30">{ROLE_LABELS[role]}</span>
              )}
            </div>
            <div className="truncate text-foreground/50 text-[8px]">{user?.email}</div>
          </div>
          <Settings className="w-3 h-3 text-foreground/55 shrink-0" strokeWidth={1.5} />
        </button>
        {role === 'admin' && (
          <NavLink to="/admin" onClick={() => { onNavigate?.(); sounds.tap(); }}
            className="w-full flex items-center gap-2.5 px-4 py-1.5 text-[10px] text-foreground/70 hover:text-foreground hover:bg-secondary/30 transition-colors">
            <ShieldCheck className="w-3 h-3 shrink-0" strokeWidth={1.5} />
            <span>Admin Dashboard</span>
          </NavLink>
        )}
        <NavLink to="/" end onClick={() => { onNavigate?.(); sounds.tap(); }}
          className="w-full flex items-center gap-2.5 px-4 py-1.5 text-[10px] text-foreground/70 hover:text-foreground hover:bg-secondary/30 transition-colors">
          <Globe className="w-3 h-3 shrink-0" strokeWidth={1.5} />
          <span>Houston Enterprise Website</span>
        </NavLink>
        <button
          onClick={async () => { sounds.click(); await signOut(); navigate('/auth'); onNavigate?.(); }}
          className="w-full flex items-center gap-2.5 px-4 py-1.5 text-[10px] text-foreground/70 hover:text-foreground hover:bg-secondary/30 transition-colors"
        >
          <LogOut className="w-3 h-3 shrink-0" strokeWidth={1.5} />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );
}

export default function AppShell({
  children,
  mobileHeaderActions,
  hideMobileMenuButton = false,
}: {
  children: ReactNode;
  mobileHeaderActions?: ReactNode;
  hideMobileMenuButton?: boolean;
}) {
  const [fullMenuOpen, setFullMenuOpen] = useState(false);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const { toggle, isDark } = useTheme();
  const { entity } = useEntity();
  const accentColor = entity?.color ?? '#9D7E3F';
  useFinanceRealtime();

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 border-r border-border flex-col z-30">
        <NavContent />
      </aside>

      {/* Mobile header */}
      <header className="md:hidden fixed top-0 inset-x-0 h-14 bg-background border-b border-border flex items-center justify-between px-3 z-30 gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <ShellEntitySelector compact />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {mobileHeaderActions}
          <button
            onClick={() => { toggle(); sounds.tap(); }}
            className={`${mobileHeaderActions ? 'hidden' : 'flex'} h-9 w-9 items-center justify-center text-muted-foreground hover:text-foreground`}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4" strokeWidth={1.5} /> : <Moon className="w-4 h-4" strokeWidth={1.5} />}
          </button>
          {!hideMobileMenuButton && (
            <button
              onClick={() => { setFullMenuOpen(true); sounds.open(); }}
              className="h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground -mr-1"
              aria-label="Open hub"
            >
              <Layers className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Full-screen mobile menu */}
      <FullscreenMobileMenu open={fullMenuOpen} onClose={() => setFullMenuOpen(false)} />

      <ElevenLabsAgent />

      {/* Main */}
      <main className="md:ml-64 min-h-screen flex flex-col">
        <div className="md:hidden h-14 shrink-0" />
        <div className="flex-1 page-enter">{children}</div>
        <div className="md:hidden h-[66px] shrink-0" />
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 h-[66px] bg-white border-t border-[#E6E1D8] z-30 grid grid-cols-5 items-stretch shadow-[0_-8px_24px_rgba(10,10,10,0.075)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {mobileQuickNav.slice(0, 2).map(n => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            onClick={() => sounds.tap()}
            className={({ isActive }) =>
              `relative flex flex-col items-center justify-center gap-0.5 transition-colors border-r border-[#EFEAE1] ${isActive ? 'text-[#111]' : 'text-[#777] hover:text-[#222]'}`
            }
          >
            {({ isActive }) => (
              <>
                <div className="h-6 flex items-center justify-center transition-colors">
                  <n.icon className="w-4 h-4" strokeWidth={isActive ? 2 : 1.5} />
                </div>
                <span className={`text-[8px] uppercase tracking-[0.07em] ${isActive ? 'font-bold' : 'font-semibold'}`}>{n.label}</span>
                {isActive && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-[2px] bg-[#111]" />}
              </>
            )}
          </NavLink>
        ))}

        {/* Add Entry slot */}
        <button
          onClick={() => { sounds.open(); setAddSheetOpen(true); }}
          className="flex flex-col items-center justify-center gap-0.5 transition-colors text-background relative border-r border-[#EFEAE1]"
          aria-label="Add Entry"
        >
          <div
            className="w-11 h-11 -mt-6 flex items-center justify-center rounded-full shadow-[0_10px_22px_rgba(0,0,0,0.24),0_0_0_4px_rgba(255,255,255,0.96)] transition-transform active:scale-95 border border-black"
            style={{ backgroundColor: '#050505' }}
          >
            <Plus className="w-5 h-5" strokeWidth={2.35} style={{ color: '#fff' }} />
          </div>
          <span className="text-[8px] uppercase tracking-[0.07em] font-bold -mt-0.5" style={{ color: '#111' }}>Add</span>
        </button>

        {mobileQuickNav.slice(2).map(n => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            onClick={() => sounds.tap()}
            className={({ isActive }) =>
              `relative flex flex-col items-center justify-center gap-0.5 transition-colors border-r border-[#EFEAE1] ${isActive ? 'text-[#111]' : 'text-[#777] hover:text-[#222]'}`
            }
          >
            {({ isActive }) => (
              <>
                <div className="h-6 flex items-center justify-center transition-colors">
                  <n.icon className="w-4 h-4" strokeWidth={isActive ? 2 : 1.5} />
                </div>
                <span className={`text-[8px] uppercase tracking-[0.07em] ${isActive ? 'font-bold' : 'font-semibold'}`}>{n.label}</span>
                {isActive && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-[2px] bg-[#111]" />}
              </>
            )}
          </NavLink>
        ))}

        {/* More slot */}
        <button
          onClick={() => { sounds.open(); setFullMenuOpen(true); }}
          className="flex flex-col items-center justify-center gap-0.5 text-[#777] hover:text-[#111] transition-colors"
          aria-label="All sections"
        >
          <div className="h-6 flex items-center justify-center">
            <MoreHorizontal className="w-4 h-4" strokeWidth={1.7} />
          </div>
          <span className="text-[8px] uppercase tracking-[0.07em] font-semibold">More</span>
        </button>
      </nav>

      {/* Add Entry sheet */}
      <AddEntrySheet open={addSheetOpen} onClose={() => setAddSheetOpen(false)} />
    </div>
  );
}
