import { useState, ReactNode } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FileText, MessageSquare, LogOut, Menu, X,
  ArrowUpRight, FolderOpen, Calendar, PlusCircle, Settings,
  Bell, Layers, GitBranch, CreditCard, Camera,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePortal } from '@/hooks/usePortal';

/* ── Tokens ─────────────────────────────────────────────────────────── */
const SB   = '#09070404';   /* sidebar bg — near-black warm */
const SBG  = '#0D0A06';
const W    = '#FFFFFF';
const GOLD = '#9D7E3F';
const GOLDF = '#C4A76B';
const CREAM = '#FAF7F2';
const DARK  = '#1A1410';
const BORDER = '#E5E0D9';
const MBORDER = 'rgba(255,255,255,0.07)';
const SERIF = "'Cormorant Garamond', Georgia, serif";

interface NavItem {
  to: string;
  label: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  badge?: number;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

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
  const pendingDocs = docs.filter(d => d.status === 'pending').length;
  const upcomingMeetings = meetings.filter(m => m.status === 'requested' || m.status === 'confirmed').length;

  const NAV_GROUPS: NavGroup[] = [
    {
      label: 'Overview',
      items: [
        { to: '/portal/dashboard',   label: 'Dashboard',        Icon: LayoutDashboard },
        { to: '/portal/projects',    label: 'My Projects',      Icon: Layers },
      ],
    },
    {
      label: 'My Project',
      items: [
        { to: '/portal/project',     label: 'Project Brief',    Icon: FileText },
        { to: '/portal/documents',   label: 'Documents',        Icon: FolderOpen, badge: pendingDocs },
        { to: '/portal/messages',    label: 'Messages',         Icon: MessageSquare, badge: msgCount },
      ],
    },
    {
      label: 'Build',
      items: [
        { to: '/portal/milestones',  label: 'Timeline',         Icon: GitBranch },
        { to: '/portal/meetings',    label: 'Meetings',         Icon: Calendar, badge: upcomingMeetings },
        { to: '/portal/gallery',     label: 'Progress Photos',  Icon: Camera },
      ],
    },
    {
      label: 'Finance',
      items: [
        { to: '/portal/payments',    label: 'Payments',         Icon: CreditCard },
      ],
    },
    {
      label: 'Account',
      items: [
        { to: '/portal/settings',    label: 'Settings',         Icon: Settings },
      ],
    },
  ];

  const SidebarContent = (
    <>
      {/* Logo */}
      <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${MBORDER}` }}>
        <Link to="/" className="flex items-center gap-3 select-none mb-2">
          <div className="w-px h-7 shrink-0" style={{ backgroundColor: GOLD }} />
          <div>
            <div className="text-[11px] font-black tracking-[0.32em] uppercase" style={{ color: W, fontFamily: SERIF }}>HOU INC</div>
            <div className="text-[7px] uppercase tracking-[0.38em] font-semibold" style={{ color: GOLD }}>Construction · Houston</div>
          </div>
        </Link>
        <div className="ml-4 flex items-center gap-2 mt-1">
          <div className="h-px flex-1" style={{ backgroundColor: 'rgba(157,126,63,0.25)' }} />
          <span className="text-[7px] uppercase tracking-[0.4em] font-bold" style={{ color: 'rgba(157,126,63,0.55)' }}>Client Portal</span>
          <div className="h-px flex-1" style={{ backgroundColor: 'rgba(157,126,63,0.25)' }} />
        </div>
      </div>

      {/* User card */}
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${MBORDER}` }}>
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div
              className="w-10 h-10 flex items-center justify-center text-[12px] font-black"
              style={{
                background: `linear-gradient(135deg, rgba(157,126,63,0.25) 0%, rgba(196,167,107,0.15) 100%)`,
                border: `1.5px solid rgba(157,126,63,0.4)`,
                color: GOLDF,
                fontFamily: SERIF,
              }}>
              {initials}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border border-[#0D0A06] flex items-center justify-center"
              style={{ backgroundColor: '#2ecc71' }}>
              <div className="w-1.5 h-1.5 rounded-full bg-white opacity-90" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-bold truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>{client?.name ?? 'Guest'}</div>
            <div className="text-[10px] truncate font-light" style={{ color: 'rgba(255,255,255,0.3)' }}>{client?.email ?? ''}</div>
          </div>
          <Bell className="w-3.5 h-3.5 shrink-0" style={{ color: 'rgba(255,255,255,0.2)' }} strokeWidth={1.5} />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto" style={{ padding: '12px 10px' }}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label} className={gi > 0 ? 'mt-5' : ''}>
            <div className="px-3 mb-2 text-[8px] uppercase tracking-[0.44em] font-bold"
              style={{ color: 'rgba(255,255,255,0.2)' }}>{group.label}</div>
            {group.items.map(({ to, label, Icon, badge }) => (
              <NavLink key={to} to={to} end={to === '/portal/dashboard'}
                className="flex items-center gap-3 px-3 py-2.5 mb-0.5 relative group"
                style={({ isActive }) => ({
                  color: isActive ? GOLDF : 'rgba(255,255,255,0.52)',
                  backgroundColor: isActive ? 'rgba(157,126,63,0.1)' : 'transparent',
                  borderLeft: isActive ? `2px solid ${GOLD}` : '2px solid transparent',
                  transition: 'all 0.16s',
                })}>
                <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                <span className="flex-1 text-[11px] font-semibold">{label}</span>
                {badge != null && badge > 0 && (
                  <span className="w-4.5 h-4.5 min-w-[18px] px-1 flex items-center justify-center text-[8px] font-black"
                    style={{ backgroundColor: GOLD, color: '#0D0A06' }}>
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}

        {/* Start New Project CTA */}
        <div className="mt-5 px-3">
          <div className="h-px mb-4" style={{ backgroundColor: MBORDER }} />
          <Link to="/portal/project"
            className="flex items-center gap-2.5 px-3 py-2.5 transition-all"
            style={{ backgroundColor: 'rgba(157,126,63,0.15)', border: '1px solid rgba(157,126,63,0.28)', color: GOLDF }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(157,126,63,0.25)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(157,126,63,0.15)'; }}>
            <PlusCircle className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
            <span className="text-[11px] font-bold uppercase tracking-[0.18em]">New Project</span>
          </Link>
        </div>
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px 10px', borderTop: `1px solid ${MBORDER}` }}>
        <Link to="/"
          className="flex items-center gap-3 px-3 py-2 mb-0.5 transition-all"
          style={{ color: 'rgba(255,255,255,0.25)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.25)'; }}>
          <ArrowUpRight className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
          <span className="text-[11px] font-semibold">Back to Website</span>
        </Link>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 transition-all"
          style={{ color: 'rgba(255,255,255,0.25)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#e74c3c'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.25)'; }}>
          <LogOut className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
          <span className="text-[11px] font-semibold">Sign Out</span>
        </button>

        {/* Version tag */}
        <div className="px-3 pt-3 text-[8px] uppercase tracking-[0.26em] font-medium" style={{ color: 'rgba(255,255,255,0.1)' }}>
          HOU INC Portal v2 · Est. 1998
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#F5F2EE' }}>

      {/* ── Sidebar (desktop) ── */}
      <aside
        className="hidden md:flex flex-col fixed inset-y-0 left-0 z-40"
        style={{ width: '260px', backgroundColor: SBG, boxShadow: '2px 0 24px rgba(0,0,0,0.18)' }}>
        {SidebarContent}
      </aside>

      {/* ── Mobile header ── */}
      <div className="md:hidden fixed inset-x-0 top-0 z-50 h-14 flex items-center justify-between px-5"
        style={{ backgroundColor: SBG, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Link to="/portal/dashboard" className="flex items-center gap-2.5 select-none">
          <div className="w-px h-6" style={{ backgroundColor: GOLD }} />
          <div className="text-[11px] font-black tracking-[0.3em] uppercase" style={{ color: W, fontFamily: SERIF }}>HOU INC</div>
        </Link>
        <div className="flex items-center gap-3">
          {(msgCount > 0 || pendingDocs > 0) && !open && (
            <span className="w-5 h-5 flex items-center justify-center text-[8px] font-black"
              style={{ backgroundColor: GOLD, color: SBG }}>
              {msgCount + pendingDocs > 9 ? '9+' : msgCount + pendingDocs}
            </span>
          )}
          <button onClick={() => setOpen(o => !o)} style={{ color: 'rgba(255,255,255,0.6)' }}>
            <AnimatePresence mode="wait" initial={false}>
              {open
                ? <motion.span key="x"    initial={{ rotate: -45, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 45, opacity: 0 }} transition={{ duration: 0.18 }}><X className="w-5 h-5" /></motion.span>
                : <motion.span key="menu" initial={{ rotate: 45, opacity: 0 }}  animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -45, opacity: 0 }} transition={{ duration: 0.18 }}><Menu className="w-5 h-5" /></motion.span>
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
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="md:hidden fixed inset-0 z-40 pt-14 flex flex-col"
            style={{ backgroundColor: SBG, width: '280px', boxShadow: '4px 0 32px rgba(0,0,0,0.4)' }}
            onClick={e => e.stopPropagation()}>
            {SidebarContent}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay for mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-0 z-30"
            style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Main content ── */}
      <main className="flex-1 md:ml-[260px] pt-14 md:pt-0 min-h-screen" style={{ backgroundColor: '#F5F2EE' }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            style={{ minHeight: '100%' }}>
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
