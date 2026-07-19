import { ReactNode } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, useRole, ROLE_LABELS } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useInvoices } from '@/hooks/useInvoices';
import { useEntity, ENTITIES } from '@/contexts/EntityContext';
import { financeProfileFor, ROUTE_MODULES } from '@/lib/entityFinance';
import { useFinanceRealtime } from '@/hooks/useFinance';
import {
  LayoutGrid, FileText, ArrowDownToLine, ArrowUpFromLine,
  FolderKanban, Users, BookOpen, LogOut, ConciergeBell, BarChart3,
  Settings, Sun, Moon, Receipt, Globe,
  Building2, Zap, Landmark, Layers, FolderOpen, Plus, X, ChevronDown, ChevronRight, Check,
  MoreHorizontal, History, ShieldCheck, CloudLightning, Package, FileBarChart, ShoppingCart,
} from 'lucide-react';
import ElevenLabsAgent from './ElevenLabsAgent';
import { sounds } from '@/hooks/useSound';
import { useState, useEffect } from 'react';
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
      { to: '/clients', label: 'Clients', icon: Users, desc: 'Client accounts & history' },
      { to: '/storm',    label: 'Storm Response', icon: CloudLightning, desc: 'Outage intelligence & dispatch' },
      { to: '/inventory', label: 'Inventory', icon: Package, desc: 'Parts, stock & movement ledger' },
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
      { to: '/reports',   label: 'Reports',   icon: FileBarChart, desc: 'PDF, Excel & CSV exports' },
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
  {
    label: 'Beta Tools',
    beta: true,
    items: [
      { to: '/beta/procurement', label: 'Procurement Engine', icon: ShoppingCart, desc: 'Material hedge & RFQ routing' },
    ],
  },
];

const mobileQuickNav = [
  { to: '/finance/dashboard', label: 'Overview', icon: LayoutGrid, end: true },
  { to: '/ledger',            label: 'Ledger',   icon: BookOpen },
  { to: '/projects',          label: 'Projects', icon: FolderKanban },
];

/* Entity-aware navigation: filters modules the selected entity doesn't use
   (e.g. construction WIP Controls and the Concierge for HGP/Holdings) and
   applies that entity's terminology (Install Jobs, Suppliers, Assets & Deals,
   Corporate Expenses…). Houston Enterprise sees the full unchanged nav. */
function entityNavGroups(entityId: string | null | undefined) {
  const profile = financeProfileFor(entityId);
  return navGroups
    .map(group => ({
      ...group,
      items: group.items
        .filter(item => {
          const mod = ROUTE_MODULES[item.to];
          return !mod || profile.modules.includes(mod);
        })
        .map(item => {
          const mod = ROUTE_MODULES[item.to];
          if (!mod) return item;
          return {
            ...item,
            label: profile.labels[mod] ?? item.label,
            desc: profile.descriptions[mod] ?? item.desc,
          };
        }),
    }))
    .filter(group => group.items.length > 0);
}

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
  const location = useLocation();
  const overdueCount = invoices.filter((i: any) => i.status === 'overdue').length;
  const accentColor = entity?.color ?? '#9D7E3F';
  const groups = entityNavGroups(entity?.id);
  const allNavItems = groups.flatMap(group => group.items.map(item => ({ ...item, group: group.label })));
  const activeGroupLabel = groups.find(g => g.items.some(i => i.to === location.pathname))?.label ?? groups[0]?.label ?? null;
  const [expandedGroup, setExpandedGroup] = useState<string | null>(activeGroupLabel);

  // Re-anchor to whichever group contains the current page each time the
  // sheet opens, rather than remembering whatever the user last toggled.
  useEffect(() => { if (open) setExpandedGroup(activeGroupLabel); }, [open, activeGroupLabel]);

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

          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px 10px', background: '#F8F7F3' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 7, fontWeight: 800, letterSpacing: '0.28em', textTransform: 'uppercase', color: '#777' }}>Finance Navigation</div>
              <div style={{ fontSize: 8, color: '#777' }}>{allNavItems.length + 2} destinations</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {groups.map(group => {
                const isOpen = expandedGroup === group.label;
                return (
                  <div key={group.label} style={{ background: '#FFFFFF', border: '1px solid #E1DED6', boxShadow: '0 1px 4px rgba(10,10,10,0.035)', overflow: 'hidden' }}>
                    <div style={{ height: 2, background: isOpen ? accentColor : '#D8D2C4' }} />
                    <button
                      type="button"
                      onClick={() => { setExpandedGroup(isOpen ? null : group.label); sounds.tap(); }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 12px', cursor: 'pointer', background: 'transparent', border: 'none', textAlign: 'left',
                      }}
                    >
                      <span style={{ fontSize: 11.5, fontWeight: 850, letterSpacing: '0.14em', textTransform: 'uppercase', color: isOpen ? accentColor : '#333' }}>{group.label}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ fontSize: 9.5, color: '#999' }}>{group.items.length}</span>
                        <ChevronDown className="w-3.5 h-3.5" style={{ color: isOpen ? accentColor : '#999', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }} strokeWidth={2} />
                      </span>
                    </button>
                    {isOpen && (
                      <div style={{ padding: '0 8px 8px', display: 'grid', gap: 4 }}>
                        {group.items.map(item => (
                          <button
                            key={item.to}
                            onClick={() => go(item.to)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              minHeight: 54,
                              padding: '8px 10px',
                              textAlign: 'left',
                              cursor: 'pointer',
                              background: '#FBFAF7',
                              border: '1px solid #EEE9DF',
                            }}
                          >
                            <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: `${accentColor}0F`, border: `1px solid ${accentColor}22`, flexShrink: 0 }}>
                              <item.icon className="w-4 h-4" style={{ color: accentColor }} strokeWidth={1.6} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 14, fontWeight: 750, color: '#1F1F1F', lineHeight: 1.15 }}>{item.label}</span>
                                {item.to === '/invoices' && overdueCount > 0 && (
                                  <span style={{ fontSize: 8, fontWeight: 800, padding: '1px 5px', backgroundColor: accentColor, color: '#fff', letterSpacing: '0.06em' }}>
                                    {overdueCount}
                                  </span>
                                )}
                              </div>
                              {item.desc && (
                                <div style={{ fontSize: 10, color: '#8A8580', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.desc}</div>
                              )}
                            </div>
                            <ChevronRight className="w-3.5 h-3.5" style={{ color: '#C4BEB0', flexShrink: 0 }} strokeWidth={1.75} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              <button onClick={() => go('/finance')}
                style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 54, padding: '9px 10px', textAlign: 'left', cursor: 'pointer', background: '#F2EFE7', border: '1px solid #DED8CA' }}>
                <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: `${accentColor}12`, border: `1px solid ${accentColor}24`, flexShrink: 0 }}>
                  <Layers className="w-4 h-4" style={{ color: accentColor }} strokeWidth={1.5} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: '#1F1F1F' }}>Switch Entity</div>
                  <div style={{ fontSize: 9.5, color: '#8A8580' }}>Houston Enterprise, Generator Pros, Holdings</div>
                </div>
                <ChevronRight className="w-3.5 h-3.5" style={{ color: '#C4BEB0', flexShrink: 0 }} strokeWidth={1.75} />
              </button>
              <button onClick={() => go('/')}
                style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 54, padding: '9px 10px', textAlign: 'left', cursor: 'pointer', background: '#FFFFFF', border: '1px solid #E1DED6' }}>
                <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F2ED', border: '1px solid #E1DED6', flexShrink: 0 }}>
                  <Globe className="w-4 h-4" style={{ color: '#777' }} strokeWidth={1.5} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: '#1F1F1F' }}>Houston Enterprise Website</div>
                  <div style={{ fontSize: 9.5, color: '#8A8580' }}>Leave the finance app for the public site</div>
                </div>
                <ChevronRight className="w-3.5 h-3.5" style={{ color: '#C4BEB0', flexShrink: 0 }} strokeWidth={1.75} />
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
  const [betaOpen, setBetaOpen] = useState(true);

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
        {entityNavGroups(entity?.id).map(group => {
          const isBetaGroup = (group as any).beta || group.label === 'Beta Tools';
          const collapsed = isBetaGroup && !betaOpen;
          return (
          <div key={group.label} className="mb-1">
            <div className="px-4 py-0.5">
              {isBetaGroup ? (
                <button
                  type="button"
                  onClick={() => { setBetaOpen(o => !o); sounds.tap(); }}
                  className="w-full flex items-center justify-between text-[7px] uppercase tracking-[0.24em] text-foreground/55 font-bold hover:text-foreground transition-colors"
                >
                  <span>{group.label}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${betaOpen ? 'rotate-180' : ''}`} strokeWidth={2} />
                </button>
              ) : (
                <span className="text-[7px] uppercase tracking-[0.24em] text-foreground/55 font-bold">{group.label}</span>
              )}
            </div>
            {!collapsed && group.items.map(n => (
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
          );
        })}
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
      <main className="finance-mobile-surface md:ml-64 min-h-screen flex flex-col min-w-0">
        <div className="md:hidden h-14 shrink-0" />
        <div className="flex-1 page-enter min-w-0">{children}</div>
        <div className="md:hidden h-[66px] shrink-0" />
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 h-[64px] bg-background/92 backdrop-blur-md border-t border-border z-30 grid grid-cols-5 items-stretch shadow-[0_-6px_20px_rgba(10,10,10,0.06)] dark:shadow-[0_-6px_20px_rgba(0,0,0,0.35)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {mobileQuickNav.slice(0, 2).map(n => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            onClick={() => sounds.tap()}
            className="relative flex flex-col items-center justify-center gap-1 transition-colors text-muted-foreground hover:text-foreground"
          >
            {({ isActive }) => (
              <>
                <div className="h-5 flex items-center justify-center transition-colors" style={{ color: isActive ? accentColor : undefined }}>
                  <n.icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2 : 1.5} />
                </div>
                <span className={`text-[8px] uppercase tracking-[0.08em] transition-colors ${isActive ? 'font-bold text-foreground' : 'font-semibold'}`}>{n.label}</span>
                {isActive && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-[2px] rounded-full" style={{ backgroundColor: accentColor }} />}
              </>
            )}
          </NavLink>
        ))}

        {/* Add Entry slot — same flat, equal-weight tab styling as every
            other slot (no oversized floating FAB) for a cleaner, more
            enterprise toolbar. */}
        <button
          onClick={() => { sounds.open(); setAddSheetOpen(true); }}
          className="flex flex-col items-center justify-center gap-1 transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Add Entry"
        >
          <div className="h-5 flex items-center justify-center">
            <Plus className="w-[18px] h-[18px]" strokeWidth={1.8} />
          </div>
          <span className="text-[8px] uppercase tracking-[0.08em] font-semibold">Add</span>
        </button>

        {mobileQuickNav.slice(2).map(n => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            onClick={() => sounds.tap()}
            className="relative flex flex-col items-center justify-center gap-1 transition-colors text-muted-foreground hover:text-foreground"
          >
            {({ isActive }) => (
              <>
                <div className="h-5 flex items-center justify-center transition-colors" style={{ color: isActive ? accentColor : undefined }}>
                  <n.icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2 : 1.5} />
                </div>
                <span className={`text-[8px] uppercase tracking-[0.08em] transition-colors ${isActive ? 'font-bold text-foreground' : 'font-semibold'}`}>{n.label}</span>
                {isActive && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-[2px] rounded-full" style={{ backgroundColor: accentColor }} />}
              </>
            )}
          </NavLink>
        ))}

        {/* More slot */}
        <button
          onClick={() => { sounds.open(); setFullMenuOpen(true); }}
          className="flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="All sections"
        >
          <div className="h-5 flex items-center justify-center">
            <MoreHorizontal className="w-[18px] h-[18px]" strokeWidth={1.6} />
          </div>
          <span className="text-[8px] uppercase tracking-[0.08em] font-semibold">More</span>
        </button>
      </nav>

      {/* Add Entry sheet */}
      <AddEntrySheet open={addSheetOpen} onClose={() => setAddSheetOpen(false)} />
    </div>
  );
}
