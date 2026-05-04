import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LayoutGrid, FileText, ArrowDownToLine, ArrowUpFromLine, FolderKanban, Users, BookOpen, LogOut } from 'lucide-react';

const nav = [
  { to: '/', label: 'Overview', icon: LayoutGrid, end: true },
  { to: '/checks', label: 'Checks', icon: FileText },
  { to: '/income', label: 'Income', icon: ArrowDownToLine },
  { to: '/expenses', label: 'Expenses', icon: ArrowUpFromLine },
  { to: '/ledger', label: 'Ledger', icon: BookOpen },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/vendors', label: 'Vendors', icon: Users },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-60 border-r border-border bg-background flex flex-col shrink-0">
        <div className="h-16 px-5 flex items-center gap-3 border-b border-border">
          <div className="w-1.5 h-7 bg-accent" />
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">FinOS</div>
            <div className="text-sm font-semibold tracking-tight">HOU INC</div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {nav.map(n => (
            <NavLink key={n.to} to={n.to} end={n.end}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2 text-sm transition-colors ${isActive ? 'bg-secondary text-foreground border-l-2 border-accent pl-[10px]' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50 border-l-2 border-transparent'}`}>
              <n.icon className="w-4 h-4" strokeWidth={1.5} />
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-border space-y-2">
          <div className="px-3 py-2">
            <div className="micro-label">Operator</div>
            <div className="text-xs text-foreground truncate mt-0.5">{user?.email}</div>
          </div>
          <button onClick={async () => { await signOut(); navigate('/auth'); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50">
            <LogOut className="w-4 h-4" strokeWidth={1.5} /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
