import { useState, ReactNode, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FileText, MessageSquare, LogOut, Menu, X,
  ArrowUpRight, FolderOpen, Calendar, PlusCircle, Settings,
  Layers, GitBranch, CreditCard, Camera, Bell, ChevronDown,
  PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePortal } from '@/hooks/usePortal';

/* ── Tokens — same light structure as admin, black accent instead of admin's
   monochrome-on-dark rail so the portal still reads as its own surface. ── */
const PAGE_BG = '#F8FAFC';
const INK     = '#111827';
const MUTED   = '#6B7280';
const BORDER  = '#E5E7EB';
const ACCENT      = '#000000';
const ACCENT_SOFT = '#404040';
const SERIF   = "'Cormorant Garamond', Georgia, serif";

/* Sidebar CSS — mirrors the admin TerminalNav's rounded nav items + left
   accent bar. */
const SIDEBAR_CSS = `
.pf-nav-item{position:relative;border-radius:12px;transition:all .25s cubic-bezier(.22,1,.36,1);}
.pf-nav-item::before{content:'';position:absolute;left:0;top:20%;bottom:20%;width:3px;border-radius:0 2px 2px 0;opacity:0;background:${ACCENT};transition:opacity .3s cubic-bezier(.22,1,.36,1),transform .3s cubic-bezier(.22,1,.36,1);transform:scaleY(.4);}
.pf-nav-item:hover{background:rgba(0,0,0,.06);}
.pf-nav-item:hover::before{opacity:.5;transform:scaleY(1);}
.pf-nav-active{background:rgba(0,0,0,.09)!important;}
.pf-nav-active::before{opacity:1!important;transform:scaleY(1)!important;}
.pf-nav-icon{color:${MUTED};transition:transform .3s cubic-bezier(.34,1.56,.64,1),color .2s ease;}
.pf-nav-item:hover .pf-nav-icon,.pf-nav-active .pf-nav-icon{color:${ACCENT};}
.pf-nav-item:hover .pf-nav-icon{transform:scale(1.08) translateX(2px);}
.pf-nav-label{font-size:11.5px;font-weight:500;letter-spacing:-.01em;color:${INK};transition:color .2s ease;}
.pf-nav-active .pf-nav-label{font-weight:700;}
.pf-badge{height:17px;min-width:17px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;letter-spacing:.02em;padding:0 5px;background:rgba(0,0,0,.12);color:${ACCENT};}
.pf-group-label{font-size:9px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#9CA3AF;transition:color .2s ease;}
.pf-group-label:hover{color:${INK};}
.pf-footer-item{transition:all .22s cubic-bezier(.22,1,.36,1);border-radius:10px;color:${MUTED};}
.pf-footer-item:hover{background:rgba(0,0,0,.04);color:${INK};}
.pf-rail-scroll{scrollbar-width:none;-ms-overflow-style:none;}
.pf-rail-scroll::-webkit-scrollbar{display:none;width:0;height:0;}
`;

interface NavItem {
  to:     string;
  label:  string;
  Icon:   React.ComponentType<{ className?: string; strokeWidth?: number; style?: React.CSSProperties }>;
  badge?: number;
}
interface NavGroup { label: string; items: NavItem[] }

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
  const [collapsed, setCollapsed] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const toggleGroup = (label: string) => setCollapsedGroups(prev => {
    const next = new Set(prev);
    if (next.has(label)) next.delete(label); else next.add(label);
    return next;
  });

  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior }); }, [location.pathname]);

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

  /* ── Nav list (shared desktop rail + mobile drawer) — collapsible groups,
     same click-to-toggle + rotating chevron mechanic as admin's TerminalNav ── */
  const NavList = ({ collapsedRail }: { collapsedRail: boolean }) => (
    <nav className="pf-rail-scroll flex-1 overflow-y-auto min-h-0" style={{ padding: '10px 8px' }}>
      {NAV_GROUPS.map((group, gi) => {
        const isGroupCollapsed = collapsedGroups.has(group.label);
        return (
        <div key={group.label} className={gi > 0 ? 'mt-1' : ''}>
          {!collapsedRail && (
            <button
              onClick={() => toggleGroup(group.label)}
              className="pf-group-label w-full flex items-center justify-between gap-2 px-3 pt-2.5 pb-1">
              <span>{group.label}</span>
              <ChevronDown className={`w-2.5 h-2.5 shrink-0 transition-transform duration-200 ${isGroupCollapsed ? '-rotate-90' : ''}`} strokeWidth={2.5} />
            </button>
          )}
          {(!isGroupCollapsed || collapsedRail) && group.items.map(({ to, label, Icon, badge }) => (
            <NavLink key={to} to={to} end={to === '/portal/dashboard'}
              onClick={() => setOpen(false)}
              title={collapsedRail ? label : undefined}
              className={({ isActive }) => `pf-nav-item w-full flex items-center gap-2.5 px-2.5 py-[7px] text-left ${isActive ? 'pf-nav-active' : ''}`}>
              <span className="pf-nav-icon flex items-center justify-center shrink-0" style={{ width: 18, height: 18 }}>
                <Icon className="w-4 h-4" strokeWidth={1.7} />
              </span>
              {!collapsedRail && (
                <span className="pf-nav-label flex-1 min-w-0 truncate leading-tight">{label}</span>
              )}
              {!collapsedRail && badge != null && badge > 0 && (
                <span className="pf-badge shrink-0">{badge > 9 ? '9+' : badge}</span>
              )}
            </NavLink>
          ))}
        </div>
        );
      })}

      {!collapsedRail && (
        <div className="mt-4 px-2.5">
          <div className="h-px mb-3" style={{ backgroundColor: BORDER }} />
          <Link to="/portal/project" onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2.5 transition-all rounded-xl"
            style={{ backgroundColor: 'rgba(0,0,0,0.08)', border: `1px solid rgba(0,0,0,0.22)`, color: ACCENT }}>
            <PlusCircle className="w-3.5 h-3.5 shrink-0" strokeWidth={1.7} />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">New Project</span>
          </Link>
        </div>
      )}
    </nav>
  );

  const Footer = ({ collapsedRail }: { collapsedRail: boolean }) => (
    <div style={{ borderTop: `1px solid ${BORDER}`, padding: '8px 8px' }}>
      <Link to="/" onClick={() => setOpen(false)}
        className="pf-footer-item w-full flex items-center gap-2.5 px-2.5 py-[7px] text-[11.5px] font-medium">
        <ArrowUpRight className="w-3.5 h-3.5 shrink-0" strokeWidth={1.7} />
        {!collapsedRail && 'Back to Website'}
      </Link>
      <button onClick={handleLogout}
        className="pf-footer-item w-full flex items-center gap-2.5 px-2.5 py-[7px] text-[11.5px] font-medium hover:!text-red-600 hover:!bg-red-50">
        <LogOut className="w-3.5 h-3.5 shrink-0" strokeWidth={1.7} />
        {!collapsedRail && 'Sign Out'}
      </button>
      {client && !collapsedRail && (
        <div className="mt-1.5 mx-1 rounded-xl p-2 flex items-center gap-2" style={{ backgroundColor: 'rgba(0,0,0,0.05)', border: `1px solid rgba(0,0,0,0.16)` }}>
          <div className="relative shrink-0">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black"
              style={{
                background: 'linear-gradient(135deg, rgba(0,0,0,0.24) 0%, rgba(64,64,64,0.12) 100%)',
                border: `1.5px solid rgba(0,0,0,0.4)`, color: ACCENT, fontFamily: SERIF,
              }}>
              {initials}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white" style={{ backgroundColor: '#22c55e' }} />
          </div>
          <span className="min-w-0 flex-1">
            <span className="block text-[10.5px] font-semibold truncate leading-tight" style={{ color: INK }}>{client.name}</span>
            <span className="block text-[8.5px] truncate" style={{ color: MUTED }}>{client.email}</span>
          </span>
          <button onClick={() => navigate('/portal/messages')} className="relative shrink-0 p-0.5" title="Messages">
            <Bell className="w-3.5 h-3.5" style={{ color: msgCount > 0 ? ACCENT : MUTED }} strokeWidth={1.7} />
            {msgCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 flex items-center justify-center text-[7px] font-black rounded-full text-white" style={{ backgroundColor: ACCENT }}>
                {msgCount > 9 ? '9+' : msgCount}
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );

  const Logo = ({ collapsedRail }: { collapsedRail: boolean }) => (
    <div style={{ padding: collapsedRail ? '18px 10px 14px' : '18px 16px 14px', borderBottom: `1px solid ${BORDER}` }}>
      <Link to="/" className="flex items-center gap-2.5 select-none" onClick={() => setOpen(false)}>
        <div className="w-px h-6 shrink-0" style={{ backgroundColor: ACCENT }} />
        {!collapsedRail && (
          <div>
            <div className="text-[11px] font-black tracking-[0.3em] uppercase leading-none" style={{ color: INK, fontFamily: SERIF }}>HOU INC</div>
            <div className="text-[7px] uppercase tracking-[0.36em] font-bold mt-1" style={{ color: ACCENT }}>Client Portal</div>
          </div>
        )}
      </Link>
    </div>
  );

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: PAGE_BG }}>
      <style>{SIDEBAR_CSS}</style>

      {/* ── Desktop rail ── */}
      <aside
        className={`hidden md:flex flex-col fixed inset-y-0 left-0 z-40 bg-white transition-[width] duration-150 ${collapsed ? 'w-14' : 'w-60'}`}
        style={{ borderRight: `1px solid ${BORDER}` }}>
        <Logo collapsedRail={collapsed} />
        <NavList collapsedRail={collapsed} />
        <Footer collapsedRail={collapsed} />
        <button
          onClick={() => setCollapsed(v => !v)}
          className="shrink-0 flex items-center justify-center py-1.5 transition-colors"
          style={{ borderTop: `1px solid ${BORDER}`, color: '#D1D5DB' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = MUTED; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#D1D5DB'; }}
          aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}>
          {collapsed ? <PanelLeftOpen className="w-3.5 h-3.5" strokeWidth={1.7} /> : <PanelLeftClose className="w-3.5 h-3.5" strokeWidth={1.7} />}
        </button>
      </aside>

      {/* ── Mobile header — logo left; avatar → menu-trigger cluster on the
          right, menu anchored at the far edge, matching admin's TerminalTopBar ── */}
      <div className="md:hidden fixed inset-x-0 top-0 z-50 h-14 flex items-center justify-between px-4 bg-white/90 backdrop-blur-md"
        style={{ borderBottom: `1px solid ${BORDER}` }}>
        <Link to="/portal/dashboard" className="flex items-center gap-2.5 select-none">
          <div className="w-px h-6" style={{ backgroundColor: ACCENT }} />
          <div className="text-[11px] font-black tracking-[0.28em] uppercase" style={{ color: INK, fontFamily: SERIF }}>HOU INC</div>
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0"
            style={{ background: 'rgba(0,0,0,0.1)', border: `1px solid rgba(0,0,0,0.28)`, color: ACCENT, fontFamily: SERIF }}>
            {initials}
          </div>
          <button
            onClick={() => setOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl active:scale-95 transition-transform"
            style={{ color: MUTED, backgroundColor: '#F9FAFB', border: `1px solid ${BORDER}` }}
            aria-label="Open navigation">
            <Menu className="w-[18px] h-[18px]" strokeWidth={1.9} />
          </button>
        </div>
      </div>

      {/* ── Mobile drawer — slides in from the right with its own header +
          close button, spring transition; same structure as admin's TerminalRail ── */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 z-40 backdrop-blur-[2px]"
              style={{ backgroundColor: 'rgba(17,24,39,0.45)' }}
              onClick={() => setOpen(false)}
              aria-hidden="true" />
            <motion.div key="drawer"
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 36 }}
              className="md:hidden fixed inset-y-0 right-0 z-50 w-[86%] max-w-[320px] bg-white flex flex-col"
              style={{ boxShadow: '-4px 0 36px rgba(0,0,0,0.16)' }}
              role="dialog" aria-modal="true" aria-label="Navigation menu">
              <div className="h-16 shrink-0 flex items-center justify-between px-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
                <div>
                  <div className="text-[11px] font-black tracking-[0.28em] uppercase" style={{ color: INK, fontFamily: SERIF }}>HOU INC</div>
                  <div className="mt-0.5 text-[7px] uppercase tracking-[0.36em] font-bold" style={{ color: ACCENT }}>Client Portal</div>
                </div>
                <button onClick={() => setOpen(false)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
                  style={{ backgroundColor: '#F9FAFB', border: `1px solid ${BORDER}`, color: MUTED }}
                  aria-label="Close navigation">
                  <X className="w-[18px] h-[18px]" strokeWidth={1.9} />
                </button>
              </div>
              <NavList collapsedRail={false} />
              <Footer collapsedRail={false} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Mobile bottom navigation ── */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-50 h-16 flex items-stretch bg-white"
        style={{ borderTop: `1px solid ${BORDER}` }}>
        {bottomNav.map(({ to, Icon, label, badge }) => (
          <NavLink key={to} to={to} end={to === '/portal/dashboard'}
            className="flex-1 flex flex-col items-center justify-center gap-1 relative">
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute top-0 inset-x-2 h-[2px]" style={{ backgroundColor: ACCENT }} />
                )}
                <div className="relative">
                  <Icon className="w-[18px] h-[18px]" style={{ color: isActive ? ACCENT : '#9CA3AF' }} strokeWidth={1.7} />
                  {badge != null && badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[14px] h-[14px] px-0.5 flex items-center justify-center text-[7px] font-black rounded-full text-white" style={{ backgroundColor: ACCENT }}>
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </div>
                <span className="text-[8px] font-semibold tracking-[0.04em]" style={{ color: isActive ? ACCENT : '#9CA3AF' }}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
        <button
          onClick={() => setOpen(o => !o)}
          className="flex-1 flex flex-col items-center justify-center gap-1 relative"
          style={{ color: open ? ACCENT : '#9CA3AF' }}>
          {open && <div className="absolute top-0 inset-x-2 h-[2px]" style={{ backgroundColor: ACCENT }} />}
          <Menu className="w-[18px] h-[18px]" strokeWidth={1.7} />
          <span className="text-[8px] font-semibold tracking-[0.04em]">Menu</span>
        </button>
      </div>

      {/* ── Main content ──
          No route-keyed fade wrapper here on purpose: every portal page already
          has its own entry animation, and layering a second layout-level fade
          on top (with an instant, exit-less unmount in between) is what caused
          the visible blank flash on navigation. Each page's own transition is
          now the only one, so switching screens is instant and single-layer. */}
      <main className={`flex-1 pt-14 md:pt-0 pb-20 md:pb-0 min-h-screen transition-[margin] duration-150 ${collapsed ? 'md:ml-14' : 'md:ml-60'}`}
        style={{ backgroundColor: PAGE_BG, minHeight: '100%' }}>
        {children}
      </main>
    </div>
  );
}
