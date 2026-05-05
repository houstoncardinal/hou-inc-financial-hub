import { ReactNode, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutGrid, FileText, ArrowDownToLine, ArrowUpFromLine,
  FolderKanban, Users, BookOpen, LogOut, Menu, ConciergeBell, BarChart3
} from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import SmartWidget from './SmartWidget';

const nav = [
  { to: '/', label: 'Overview', icon: LayoutGrid, end: true },
  { to: '/concierge', label: 'Concierge', icon: ConciergeBell },
  { to: '/charts', label: 'Charts', icon: BarChart3 },
  { to: '/checks', label: 'Checks', icon: FileText },
  { to: '/income', label: 'Income', icon: ArrowDownToLine },
  { to: '/expenses', label: 'Expenses', icon: ArrowUpFromLine },
  { to: '/ledger', label: 'Ledger', icon: BookOpen },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/vendors', label: 'Vendors', icon: Users },
];

const primaryNav = nav.slice(0, 5);
const mobileNav = [
  { to: '/', label: 'Home', icon: LayoutGrid, end: true },
  { to: '/checks', label: 'Checks', icon: FileText },
  { to: '/income', label: 'Income', icon: ArrowDownToLine },
  { to: '/expenses', label: 'Expenses', icon: ArrowUpFromLine },
  { to: '/concierge', label: 'Assist', icon: ConciergeBell },
];

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="h-16 px-5 flex items-center gap-3 border-b border-border shrink-0">
        <div className="w-1.5 h-7 bg-accent" />
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">FinOS</div>
          <div className="text-sm font-semibold tracking-tight">HOU INC</div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {nav.map(n => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 text-sm transition-colors border-l-2 ${
                isActive
                  ? 'bg-secondary text-foreground border-accent pl-[10px]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50 border-transparent'
              }`
            }
          >
            <n.icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
            <span>{n.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-border space-y-1 shrink-0">
        <div className="px-3 py-2">
          <div className="micro-label">Operator</div>
          <div className="text-xs text-foreground truncate mt-0.5">{user?.email}</div>
        </div>
        <button
          onClick={async () => { await signOut(); navigate('/auth'); onNavigate?.(); }}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" strokeWidth={1.5} />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-60 border-r border-border flex-col z-30">
        <NavContent />
      </aside>

      {/* ── Mobile top bar ── */}
      <header className="md:hidden fixed top-0 inset-x-0 h-14 bg-background border-b border-border flex items-center justify-between px-4 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-1 h-5 bg-accent shrink-0" />
          <div>
            <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground leading-none">FinOS</div>
            <div className="text-[11px] font-semibold tracking-tight">HOU INC</div>
          </div>
        </div>
        <button
          onClick={() => setSheetOpen(true)}
          className="h-10 w-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors -mr-2"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* ── Mobile drawer ── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="left" className="p-0 w-72 rounded-none border-r border-border">
          <NavContent onNavigate={() => setSheetOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* ── Smart Widget (floating globe) ── */}
      <SmartWidget />

      {/* ── Main content ── */}
      <main className="md:ml-60 min-h-screen flex flex-col">
        <div className="md:hidden h-14 shrink-0" />
        <div className="flex-1">{children}</div>
        <div className="md:hidden h-20 shrink-0" />
      </main>

      {/* ── Mobile bottom nav ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 h-16 bg-background border-t border-border z-30 flex items-stretch">
        {mobileNav.map(n => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                isActive ? 'text-foreground' : 'text-muted-foreground'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`p-1.5 transition-colors ${isActive ? 'bg-secondary' : ''}`}>
                  <n.icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2 : 1.5} />
                </div>
                <span className="text-[9px] uppercase tracking-[0.1em] font-medium leading-none">{n.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
