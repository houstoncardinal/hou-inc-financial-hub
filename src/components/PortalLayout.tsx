import { useState, ReactNode } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FileText, MessageSquare, LogOut, Menu, X,
  ArrowUpRight, FolderOpen, Calendar, PlusCircle, Settings,
  Layers, GitBranch, CreditCard, Camera, Bell,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePortal } from '@/hooks/usePortal';

/* ── Tokens ─────────────────────────────────────────────────────────── */
const SBG   = '#0D0A06';
const W     = '#FFFFFF';
const GOLD  = '#9D7E3F';
const GOLDF = '#C4A76B';
const SERIF = "'Cormorant Garamond', Georgia, serif";
const MBDR  = 'rgba(255,255,255,0.07)';

interface NavItem {
  to:     string;
  label:  string;
  Icon:   React.ComponentType<{ className?: string; strokeWidth?: number }>;
  badge?: number;
}
interface NavGroup { label: string; items: NavItem[] }

/* ─────────────────────────────────────────────────────────────────────
   Bottom nav items (mobile primary 4 + more)
───────────────────────────────────────────────────────────────────── */
const mkBottomNav = (msgBadge: number, docBadge: number): NavItem[] => [
  { to: '/portal/dashboard',  label: 'Home',     Icon: LayoutDashboard },
  { to: '/portal/milestones', label: 'Timeline', Icon: GitBranch },
  { to: '/portal/messages',   label: 'Messages', Icon: MessageSquare, badge: msgBadge },
  { to: '/portal/documents',  label: 'Docs',     Icon: FolderOpen, badge: docBadge },
];

export default function PortalLayout({ children }: { children: ReactNode }) {
  const { client, logout, getMessageCount, getDocuments, getMeetings } = usePortal();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [open, setOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/portal'); };
  const initials  = client?.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '?';
  const msgCount  = getMessageCount();
  const docs      = getDocuments();
  const meetings  = getMeetings();
  const pendingDocs         = docs.filter(d => d.status === 'pending').length;
  const upcomingMeetings    = meetings.filter(m => m.status === 'requested' || m.status === 'confirmed').length;
  const bottomNav = mkBottomNav(msgCount, pendingDocs);

  const NAV_GROUPS: NavGroup[] = [
    {
      label: 'Overview',
      items: [
        { to: '/portal/dashboard', label: 'Dashboard',       Icon: LayoutDashboard },
        { to: '/portal/projects',  label: 'My Projects',     Icon: Layers },
      ],
    },
    {
      label: 'My Project',
      items: [
        { to: '/portal/project',   label: 'Project Brief',   Icon: FileText },
        { to: '/portal/documents', label: 'Documents',       Icon: FolderOpen,     badge: pendingDocs },
        { to: '/portal/messages',  label: 'Messages',        Icon: MessageSquare,  badge: msgCount },
      ],
    },
    {
      label: 'Build',
      items: [
        { to: '/portal/milestones', label: 'Timeline',        Icon: GitBranch },
        { to: '/portal/meetings',   label: 'Meetings',        Icon: Calendar,       badge: upcomingMeetings },
        { to: '/portal/gallery',    label: 'Progress Photos', Icon: Camera },
      ],
    },
    {
      label: 'Finance',
      items: [
        { to: '/portal/payments', label: 'Payments', Icon: CreditCard },
      ],
    },
    {
      label: 'Account',
      items: [
        { to: '/portal/settings', label: 'Settings', Icon: Settings },
      ],
    },
  ];

  /* ── Sidebar content (shared desktop + drawer) ── */
  const SidebarContent = (
    <>
      {/* Logo */}
      <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${MBDR}` }}>
        <Link to="/" className="flex items-center gap-3 select-none mb-2" onClick={() => setOpen(false)}>
          <div className="w-px h-7 shrink-0" style={{ backgroundColor: GOLD }} />
          <div>
            <div className="text-[11px] font-black tracking-[0.36em] uppercase" style={{ color: W, fontFamily: SERIF }}>HOU INC</div>
            <div className="text-[7px] uppercase tracking-[0.42em] font-semibold" style={{ color: GOLD }}>Construction · Houston</div>
          </div>
        </Link>
        <div className="ml-4 flex items-center gap-2 mt-1">
          <div className="h-px flex-1" style={{ backgroundColor: 'rgba(157,126,63,0.2)' }} />
          <span className="text-[7px] uppercase tracking-[0.44em] font-bold" style={{ color: 'rgba(157,126,63,0.45)' }}>Client Portal</span>
          <div className="h-px flex-1" style={{ backgroundColor: 'rgba(157,126,63,0.2)' }} />
        </div>
      </div>

      {/* User card */}
      <div style={{ padding: '14px 20px 14px', borderBottom: `1px solid ${MBDR}` }}>
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div
              className="w-9 h-9 flex items-center justify-center text-[11px] font-black"
              style={{
                background: 'linear-gradient(135deg, rgba(157,126,63,0.28) 0%, rgba(196,167,107,0.14) 100%)',
                border: '1.5px solid rgba(157,126,63,0.4)',
                color: GOLDF, fontFamily: SERIF,
              }}>
              {initials}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-[#0D0A06]"
              style={{ backgroundColor: '#2ecc71' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-bold truncate" style={{ color: 'rgba(255,255,255,0.88)' }}>{client?.name ?? 'Guest'}</div>
            <div className="text-[9px] truncate font-light" style={{ color: 'rgba(255,255,255,0.28)' }}>{client?.email ?? ''}</div>
          </div>
          <Bell className="w-3.5 h-3.5 shrink-0" style={{ color: 'rgba(255,255,255,0.16)' }} strokeWidth={1.5} />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto" style={{ padding: '10px 10px' }}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label} className={gi > 0 ? 'mt-4' : ''}>
            <div className="px-3 mb-1.5 text-[7px] uppercase tracking-[0.48em] font-bold"
              style={{ color: 'rgba(255,255,255,0.17)' }}>{group.label}</div>
            {group.items.map(({ to, label, Icon, badge }) => (
              <NavLink key={to} to={to} end={to === '/portal/dashboard'}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 mb-0.5 relative"
                style={({ isActive }) => ({
                  color:           isActive ? GOLDF : 'rgba(255,255,255,0.48)',
                  backgroundColor: isActive ? 'rgba(157,126,63,0.1)' : 'transparent',
                  borderLeft:      isActive ? `2px solid ${GOLD}` : '2px solid transparent',
                  transition:      'all 0.15s',
                })}>
                <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                <span className="flex-1 text-[11px] font-semibold">{label}</span>
                {badge != null && badge > 0 && (
                  <span className="min-w-[18px] px-1 h-[18px] flex items-center justify-center text-[8px] font-black"
                    style={{ backgroundColor: GOLD, color: SBG }}>
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}

        <div className="mt-5 px-3">
          <div className="h-px mb-4" style={{ backgroundColor: MBDR }} />
          <Link to="/portal/project" onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2.5 transition-all"
            style={{ backgroundColor: 'rgba(157,126,63,0.12)', border: '1px solid rgba(157,126,63,0.25)', color: GOLDF }}>
            <PlusCircle className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">New Project</span>
          </Link>
        </div>
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px 10px', borderTop: `1px solid ${MBDR}` }}>
        <Link to="/" onClick={() => setOpen(false)}
          className="flex items-center gap-3 px-3 py-2 mb-0.5 transition-all"
          style={{ color: 'rgba(255,255,255,0.22)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.55)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.22)'; }}>
          <ArrowUpRight className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
          <span className="text-[11px] font-semibold">Back to Website</span>
        </Link>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 transition-all"
          style={{ color: 'rgba(255,255,255,0.22)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#e74c3c'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.22)'; }}>
          <LogOut className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
          <span className="text-[11px] font-semibold">Sign Out</span>
        </button>
        <div className="px-3 pt-3 text-[7px] uppercase tracking-[0.3em] font-medium" style={{ color: 'rgba(255,255,255,0.08)' }}>
          HOU INC · Est. 1998
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#F5F2EE' }}>

      {/* ── Sidebar desktop ── */}
      <aside
        className="hidden md:flex flex-col fixed inset-y-0 left-0 z-40"
        style={{ width: 260, backgroundColor: SBG, boxShadow: '2px 0 28px rgba(0,0,0,0.22)' }}>
        {SidebarContent}
      </aside>

      {/* ── Mobile header ── */}
      <div className="md:hidden fixed inset-x-0 top-0 z-50 h-14 flex items-center justify-between px-4"
        style={{ backgroundColor: SBG, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <Link to="/portal/dashboard" className="flex items-center gap-2.5 select-none">
          <div className="w-px h-6" style={{ backgroundColor: GOLD }} />
          <div className="text-[11px] font-black tracking-[0.32em] uppercase" style={{ color: W, fontFamily: SERIF }}>HOU INC</div>
        </Link>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 flex items-center justify-center text-[10px] font-black"
            style={{ background: 'rgba(157,126,63,0.18)', border: '1px solid rgba(157,126,63,0.35)', color: GOLDF, fontFamily: SERIF }}>
            {initials}
          </div>
          <button
            onClick={() => setOpen(o => !o)}
            className="w-8 h-8 flex items-center justify-center"
            style={{ color: 'rgba(255,255,255,0.6)' }}>
            <AnimatePresence mode="wait" initial={false}>
              {open
                ? <motion.span key="x"    initial={{ rotate: -45, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 45, opacity: 0 }}  transition={{ duration: 0.15 }}><X    className="w-5 h-5" /></motion.span>
                : <motion.span key="menu" initial={{ rotate:  45, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -45, opacity: 0 }} transition={{ duration: 0.15 }}><Menu  className="w-5 h-5" /></motion.span>
              }
            </AnimatePresence>
          </button>
        </div>
      </div>

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {open && (
          <motion.div key="drawer"
            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="md:hidden fixed inset-0 z-40 pt-14 pb-20 flex flex-col"
            style={{ backgroundColor: SBG, width: 280, boxShadow: '4px 0 36px rgba(0,0,0,0.45)' }}
            onClick={e => e.stopPropagation()}>
            {SidebarContent}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-0 z-30"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            onClick={() => setOpen(false)} />
        )}
      </AnimatePresence>

      {/* ── Mobile bottom navigation ── */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-50 h-16 flex items-stretch"
        style={{ backgroundColor: SBG, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {bottomNav.map(({ to, Icon, label, badge }) => (
          <NavLink key={to} to={to} end={to === '/portal/dashboard'}
            className="flex-1 flex flex-col items-center justify-center gap-1 relative"
            style={({ isActive }) => ({ color: isActive ? GOLDF : 'rgba(255,255,255,0.33)' })}>
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute top-0 inset-x-2 h-[2px]" style={{ backgroundColor: GOLD }} />
                )}
                <div className="relative">
                  <Icon className="w-[18px] h-[18px]" strokeWidth={1.5} />
                  {badge != null && badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[14px] h-[14px] px-0.5 flex items-center justify-center text-[7px] font-black"
                      style={{ backgroundColor: GOLD, color: SBG }}>
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </div>
                <span className="text-[8px] font-semibold tracking-[0.04em]">{label}</span>
              </>
            )}
          </NavLink>
        ))}
        {/* Menu button */}
        <button
          onClick={() => setOpen(o => !o)}
          className="flex-1 flex flex-col items-center justify-center gap-1 relative"
          style={{ color: open ? GOLDF : 'rgba(255,255,255,0.33)' }}>
          {open && <div className="absolute top-0 inset-x-2 h-[2px]" style={{ backgroundColor: GOLD }} />}
          <Menu className="w-[18px] h-[18px]" strokeWidth={1.5} />
          <span className="text-[8px] font-semibold tracking-[0.04em]">Menu</span>
        </button>
      </div>

      {/* ── Main content ── */}
      <main className="flex-1 md:ml-[260px] pt-14 md:pt-0 pb-20 md:pb-0 min-h-screen"
        style={{ backgroundColor: '#F5F2EE' }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{ minHeight: '100%' }}>
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
