import { useState, ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, MessageSquare, LogOut, Menu, X, ArrowUpRight, User } from 'lucide-react';
import { usePortal } from '@/hooks/usePortal';

const CREAM  = '#FAF7F2';
const DARK   = '#1C1814';
const GOLD   = '#9D7E3F';
const BORDER = '#DDD4C4';
const SERIF  = "'Cormorant Garamond', Georgia, serif";

const NAV = [
  { to: '/portal/dashboard', label: 'Dashboard',     Icon: LayoutDashboard },
  { to: '/portal/project',   label: 'Project Brief', Icon: FileText },
  { to: '/portal/messages',  label: 'Messages',      Icon: MessageSquare },
];

export default function PortalLayout({ children }: { children: ReactNode }) {
  const { client, logout } = usePortal();
  const navigate           = useNavigate();
  const [open, setOpen]    = useState(false);

  const handleLogout = () => { logout(); navigate('/portal'); };

  const initials = client?.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '?';

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: CREAM }}>

      {/* ── Sidebar (desktop) ── */}
      <aside
        className="hidden md:flex flex-col w-60 shrink-0 fixed inset-y-0 left-0 z-40"
        style={{ backgroundColor: '#FFFFFF', borderRight: `1px solid ${BORDER}` }}
      >
        {/* Logo */}
        <div className="px-6 py-5" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <Link to="/" className="flex items-center gap-2.5 select-none mb-3">
            <div className="w-px h-7" style={{ backgroundColor: GOLD }} />
            <div>
              <div className="text-[11px] font-black tracking-[0.28em] uppercase" style={{ color: DARK, fontFamily: SERIF }}>HOU INC</div>
              <div className="text-[7px] uppercase tracking-[0.32em]" style={{ color: GOLD }}>Construction · Houston</div>
            </div>
          </Link>
          <div className="text-[8px] uppercase tracking-[0.3em] font-bold" style={{ color: 'rgba(28,24,20,0.3)' }}>Client Portal</div>
        </div>

        {/* Client info */}
        <div className="px-6 py-5" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-black shrink-0"
              style={{ backgroundColor: 'rgba(157,126,63,0.12)', color: GOLD, border: `1px solid rgba(157,126,63,0.25)`, fontFamily: SERIF }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <div className="text-[12px] font-bold truncate" style={{ color: DARK }}>{client?.name ?? 'Guest'}</div>
              <div className="text-[10px] truncate" style={{ color: 'rgba(28,24,20,0.4)' }}>{client?.email ?? ''}</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4">
          {NAV.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className="flex items-center gap-3 px-3 py-2.5 mb-0.5 text-[11px] font-semibold transition-colors"
              style={({ isActive }) => ({
                color: isActive ? GOLD : 'rgba(28,24,20,0.5)',
                backgroundColor: isActive ? 'rgba(157,126,63,0.07)' : 'transparent',
                borderLeft: isActive ? `2px solid ${GOLD}` : '2px solid transparent',
              })}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer links */}
        <div className="px-3 pb-4" style={{ borderTop: `1px solid ${BORDER}` }}>
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2.5 text-[11px] font-semibold transition-colors mt-3"
            style={{ color: 'rgba(28,24,20,0.35)' }}
            onMouseEnter={e => (e.currentTarget.style.color = DARK)}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(28,24,20,0.35)')}
          >
            <ArrowUpRight className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
            Back to Website
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-[11px] font-semibold transition-colors"
            style={{ color: 'rgba(28,24,20,0.35)' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#c0392b')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(28,24,20,0.35)')}
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Mobile header ── */}
      <div
        className="md:hidden fixed inset-x-0 top-0 z-50 h-14 flex items-center justify-between px-5"
        style={{ backgroundColor: '#FFFFFF', borderBottom: `1px solid ${BORDER}` }}
      >
        <Link to="/" className="flex items-center gap-2 select-none">
          <div className="w-px h-6" style={{ backgroundColor: GOLD }} />
          <div className="text-[11px] font-black tracking-[0.28em] uppercase" style={{ color: DARK, fontFamily: SERIF }}>HOU INC</div>
        </Link>
        <button onClick={() => setOpen(o => !o)} style={{ color: 'rgba(28,24,20,0.5)' }}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 pt-14"
          style={{ backgroundColor: '#FFFFFF' }}
          onClick={() => setOpen(false)}
        >
          <div className="px-5 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-black" style={{ backgroundColor: 'rgba(157,126,63,0.12)', color: GOLD }}>
                {initials}
              </div>
              <div>
                <div className="text-[13px] font-bold" style={{ color: DARK }}>{client?.name}</div>
                <div className="text-[11px]" style={{ color: 'rgba(28,24,20,0.4)' }}>{client?.email}</div>
              </div>
            </div>
          </div>
          <nav className="px-4 py-3">
            {NAV.map(({ to, label, Icon }) => (
              <NavLink key={to} to={to} className="flex items-center gap-3 px-3 py-3 text-[12px] font-semibold" style={{ color: DARK }}>
                <Icon className="w-4 h-4" strokeWidth={1.5} />
                {label}
              </NavLink>
            ))}
            <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-3 text-[12px] font-semibold" style={{ color: '#c0392b' }}>
              <LogOut className="w-4 h-4" strokeWidth={1.5} />
              Sign Out
            </button>
          </nav>
        </div>
      )}

      {/* ── Main content ── */}
      <main className="flex-1 md:ml-60 pt-14 md:pt-0 min-h-screen" style={{ backgroundColor: CREAM }}>
        {children}
      </main>
    </div>
  );
}
