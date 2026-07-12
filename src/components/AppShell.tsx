import { ReactNode } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, useRole, ROLE_LABELS } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useInvoices } from '@/hooks/useInvoices';
import { useEntity, ENTITIES } from '@/contexts/EntityContext';
import {
  LayoutGrid, FileText, ArrowDownToLine, ArrowUpFromLine,
  FolderKanban, Users, BookOpen, LogOut, Menu, ConciergeBell, BarChart3,
  Settings, Sun, Moon, Receipt, BookMarked, Globe,
  Building2, Zap, Landmark, Layers, FolderOpen,
} from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import ElevenLabsAgent from './ElevenLabsAgent';
import { sounds } from '@/hooks/useSound';
import { useState } from 'react';

const navGroups = [
  {
    label: 'Daily',
    items: [
      { to: '/finance/dashboard', label: 'Overview', icon: LayoutGrid, end: true },
      { to: '/ledger', label: 'Ledger', icon: BookOpen },
      { to: '/checks', label: 'Checks', icon: FileText },
      { to: '/income', label: 'Income', icon: ArrowDownToLine },
      { to: '/expenses', label: 'Expenses', icon: ArrowUpFromLine },
    ],
  },
  {
    label: 'Management',
    items: [
      { to: '/projects', label: 'Projects', icon: FolderKanban },
      { to: '/vendors', label: 'Vendors', icon: Users },
    ],
  },
  {
    label: 'Billing',
    items: [
      { to: '/invoices', label: 'Invoices', icon: Receipt },
    ],
  },
  {
    label: 'Analysis',
    items: [
      { to: '/charts', label: 'Charts', icon: BarChart3 },
      { to: '/concierge', label: 'Concierge', icon: ConciergeBell },
      { to: '/glossary', label: 'Glossary', icon: BookMarked },
    ],
  },
  {
    label: 'Storage',
    items: [
      { to: '/documents', label: 'Documents', icon: FolderOpen },
    ],
  },
];

const mobileNav = [
  { to: '/finance', label: 'Entity', icon: Layers, end: true },
  { to: '/finance/dashboard', label: 'Overview', icon: LayoutGrid, end: true },
  { to: '/checks', label: 'Checks', icon: FileText },
  { to: '/income', label: 'Income', icon: ArrowDownToLine },
  { to: '/documents', label: 'Docs', icon: FolderOpen },
];

const ENTITY_ICONS: Record<string, React.ComponentType<any>> = {
  'houston-enterprise':           Building2,
  'houston-generator-pros':       Zap,
  'houston-enterprise-holdings':  Landmark,
};

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
  const overdueCount = invoices.filter(i => i.status === 'overdue').length;

  const handleSettings = () => {
    navigate('/settings');
    onNavigate?.();
    sounds.tap();
  };

  const handleEntitySwitch = (id: string) => {
    const found = ENTITIES.find(e => e.id === id);
    if (found) {
      setEntity(found);
      navigate('/finance/dashboard');
      onNavigate?.();
      sounds.tap();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Brand + Theme Toggle */}
      <div className="px-5 h-14 flex items-center border-b border-border shrink-0">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-0.5 h-5 bg-accent shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-bold tracking-[0.12em] uppercase">HOU INC</div>
            <div className="text-[7px] uppercase tracking-[0.2em] text-muted-foreground">Finance Sector</div>
          </div>
        </div>
        {/* Theme toggle — pushed to right but not touching close button */}
        <button
          onClick={() => { toggle(); sounds.tap(); }}
          className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary rounded-sm transition-all shrink-0"
          style={{ marginRight: isMobileSheet ? 40 : 0 }}
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="w-3.5 h-3.5" strokeWidth={1.5} /> : <Moon className="w-3.5 h-3.5" strokeWidth={1.5} />}
        </button>
      </div>

      {/* ── Entity Switcher Panel ── */}
      <div className="shrink-0 border-b border-border">
        {/* Section header */}
        <div className="px-4 pt-3 pb-1.5 flex items-center justify-between">
          <span className="text-[7px] uppercase tracking-[0.3em] font-bold text-muted-foreground/60">Entity</span>
          <NavLink
            to="/finance"
            onClick={() => { onNavigate?.(); sounds.tap(); }}
            className={({ isActive }) =>
              `text-[7px] uppercase tracking-[0.2em] font-semibold transition-colors ${
                isActive ? 'text-accent' : 'text-muted-foreground hover:text-foreground'
              }`
            }
          >
            Full Selector →
          </NavLink>
        </div>

        {/* 3 entity buttons — always visible, one-click switch */}
        <div className="px-2 pb-2.5 space-y-0.5">
          {ENTITIES.map(e => {
            const EIcon = ENTITY_ICONS[e.id] ?? Building2;
            const active = entity?.id === e.id;
            return (
              <button
                key={e.id}
                onClick={() => handleEntitySwitch(e.id)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left transition-all duration-200 relative overflow-hidden"
                style={{
                  backgroundColor: active ? e.colorMuted : 'transparent',
                  border: `1px solid ${active ? e.color : 'transparent'}`,
                }}
              >
                {/* Active indicator bar */}
                {active && (
                  <div
                    className="absolute left-0 top-0 bottom-0 w-0.5"
                    style={{ backgroundColor: e.color }}
                  />
                )}
                <div
                  className="w-5 h-5 flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: active ? e.colorMuted : 'var(--secondary)',
                    border: `1px solid ${active ? e.color : 'var(--border)'}`,
                    transition: 'background 0.2s, border-color 0.2s',
                  }}
                >
                  <EIcon
                    className="w-2.5 h-2.5"
                    style={{ color: active ? e.color : 'var(--muted-foreground)', strokeWidth: 1.5 }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="text-[9px] font-bold uppercase tracking-[0.1em] truncate leading-tight"
                    style={{ color: active ? e.color : 'var(--foreground)' }}
                  >
                    {e.shortName}
                  </div>
                  <div className="text-[7px] text-muted-foreground uppercase tracking-[0.14em] truncate leading-tight">
                    {e.category}
                  </div>
                </div>
                {active && (
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: e.color }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {navGroups.map(group => (
          <div key={group.label} className="mb-2">
            <div className="px-5 py-1.5">
              <span className="text-[7px] uppercase tracking-[0.18em] text-muted-foreground/60 font-semibold">
                {group.label}
              </span>
            </div>
            {group.items.map(n => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                onClick={() => { onNavigate?.(); sounds.tap(); }}
                className={({ isActive }) =>
                  `relative flex items-center gap-3 px-5 py-2 text-xs transition-all duration-150 ${
                    isActive
                      ? 'text-foreground bg-secondary font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
                  }`
                }
              >
                <n.icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                <span className="flex-1">{n.label}</span>
                {n.to === '/invoices' && overdueCount > 0 && (
                  <span className="text-[8px] font-bold px-1 py-0.5 min-w-[16px] text-center bg-accent text-background leading-none">
                    {overdueCount > 9 ? '9+' : overdueCount}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Profile */}
      <div className="border-t border-border shrink-0">
        <button
          onClick={handleSettings}
          className={`w-full flex items-center gap-3 px-5 py-2.5 text-xs transition-colors hover:bg-secondary/40 ${
            location.pathname === '/settings' ? 'bg-secondary' : ''
          }`}
        >
          <div className="w-6 h-6 rounded-full bg-foreground/10 flex items-center justify-center text-[9px] font-bold text-foreground shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-foreground text-[11px]">{displayName || 'User'}</span>
              {role !== 'admin' && (
                <span className="shrink-0 text-[7px] uppercase tracking-[0.16em] px-1 py-0.5 font-bold bg-accent/10 text-accent border border-accent/30">
                  {ROLE_LABELS[role]}
                </span>
              )}
            </div>
            <div className="truncate text-muted-foreground text-[9px]">{user?.email}</div>
          </div>
          <Settings className="w-3 h-3 text-muted-foreground shrink-0" strokeWidth={1.5} />
        </button>
        <NavLink
          to="/"
          end
          onClick={() => { onNavigate?.(); sounds.tap(); }}
          className="w-full flex items-center gap-3 px-5 py-2 text-[10px] text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors"
        >
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
  const [sheetOpen, setSheetOpen] = useState(false);
  const { toggle, isDark } = useTheme();

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
            onClick={() => { setSheetOpen(true); sounds.open(); }}
            className="h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground -mr-1"
            aria-label="Open menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      <Sheet open={sheetOpen} onOpenChange={o => { setSheetOpen(o); if (!o) sounds.close(); }}>
        <SheetContent side="left" className="p-0 w-64 rounded-none border-r border-border">
          <NavContent onNavigate={() => setSheetOpen(false)} isMobileSheet />
        </SheetContent>
      </Sheet>

      <ElevenLabsAgent />

      {/* Main */}
      <main className="md:ml-52 min-h-screen flex flex-col">
        <div className="md:hidden h-12 shrink-0" />
        <div className="flex-1 page-enter">{children}</div>
        <div className="md:hidden h-16 shrink-0" />
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 h-16 bg-background border-t border-border z-30 flex items-stretch">
        {mobileNav.map(n => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            onClick={() => sounds.tap()}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                isActive ? 'text-foreground' : 'text-muted-foreground'
              }`
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
      </nav>
    </div>
  );
}
