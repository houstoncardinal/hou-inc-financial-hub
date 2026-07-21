import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, ChevronDown, ExternalLink, Globe, Lock, Moon, PanelLeftClose, PanelLeftOpen, Search, Sun, Wallet, X } from 'lucide-react';
import type { AdminNavGroup, AdminUser } from '@/components/admin/design/AdminSidebar';

/* Luxury sidebar CSS — light, airy, monochrome black nav (no per‑section color coding) */
const SIDEBAR_CSS = `
.term-nav-item{position:relative;border-radius:12px;transition:all .25s cubic-bezier(.22,1,.36,1);}
.term-nav-item::before{content:'';position:absolute;left:0;top:20%;bottom:20%;width:3px;border-radius:0 2px 2px 0;opacity:0;background:#0A0A0A;transition:opacity .3s cubic-bezier(.22,1,.36,1),transform .3s cubic-bezier(.22,1,.36,1);transform:scaleY(.4);}
.term-nav-item:hover{background:rgba(0,0,0,.04);}
.term-nav-item:hover::before{opacity:.5;transform:scaleY(1);}
.term-nav-active{background:rgba(0,0,0,.055)!important;}
.term-nav-active::before{opacity:1!important;transform:scaleY(1)!important;}
.term-nav-icon{color:#0A0A0A;transition:transform .3s cubic-bezier(.34,1.56,.64,1);}
.term-nav-item:hover .term-nav-icon{transform:scale(1.08) translateX(2px);}
.term-nav-label{font-size:12.5px;font-weight:500;letter-spacing:-.01em;color:#0A0A0A;transition:color .2s ease;}
.term-nav-active .term-nav-label{font-weight:700;}
.term-badge{height:18px;min-width:18px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;letter-spacing:.02em;padding:0 5px;transition:all .25s cubic-bezier(.22,1,.36,1);}
.term-group-label{font-size:9px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#4B5563;transition:color .2s ease;}
.term-group-label:hover{color:#0A0A0A;}
.term-footer-item{transition:all .22s cubic-bezier(.22,1,.36,1);border-radius:10px;color:#0A0A0A;}
.term-footer-item:hover{background:rgba(0,0,0,.05);}
`;

/* ══ Top bar — persists across /admin/*, global utilities. Desktop and mobile render
   as two entirely separate bars (rather than one row with responsive hide/show) since
   the mobile layout intentionally re‑orders its controls: logo left, then a dark‑toggle
   → notifications → menu cluster on the right, with the menu trigger anchored at the
   far edge. ══ */
export function TerminalTopBar({
  dark, onToggleDark, notificationCount = 0, userName, userRole, onOpenMobileNav,
}: {
  dark: boolean;
  onToggleDark: () => void;
  notificationCount?: number;
  userName: string;
  userRole: string;
  onOpenMobileNav: () => void;
}) {
  return (
    <>
      {/* Desktop / tablet header */}
      <div className="hidden md:flex h-14 shrink-0 items-center gap-3 px-4 border-b border-slate-200 dark:border-neutral-700 bg-white/80 dark:bg-neutral-950/70 backdrop-blur-md backdrop-saturate-150 relative z-40">
        <img src="/helogo.png" alt="Houston Enterprise" className="h-8 w-auto object-contain dark:invert shrink-0" />
        <div className="flex-1" />
        <div className="flex items-center gap-1.5">
          <button className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors" aria-label="Search">
            <Search className="w-[17px] h-[17px]" strokeWidth={1.9} />
          </button>
          <button className="relative w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors" aria-label="Notifications">
            <Bell className="w-[17px] h-[17px]" strokeWidth={1.9} />
            {notificationCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] rounded-full px-0.5 text-white text-[7px] font-bold flex items-center justify-center leading-none tabular-nums" style={{ backgroundColor: '#DC2626' }}>
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            )}
          </button>
          <button onClick={onToggleDark} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors" aria-label="Toggle dark mode">
            {dark ? <Sun className="w-[17px] h-[17px]" strokeWidth={1.9} /> : <Moon className="w-[17px] h-[17px]" strokeWidth={1.9} />}
          </button>
          <div className="w-px h-5 bg-slate-200 dark:bg-neutral-700 mx-1.5" />
          <button className="flex items-center gap-2 rounded-full pl-1 pr-2.5 py-1 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors">
            <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ backgroundColor: '#0A0A0A' }}>
              {userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </span>
            <span className="hidden lg:flex flex-col items-start leading-none">
              <span className="text-[11px] font-semibold text-slate-800 dark:text-neutral-100">{userName}</span>
              <span className="text-[8.5px] text-slate-400 dark:text-neutral-500">{userRole}</span>
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-500" strokeWidth={1.9} />
          </button>
        </div>
      </div>

      {/* Mobile header — logo left; dark‑toggle → notifications → menu cluster on the right, menu anchored at the far edge */}
      <div className="md:hidden h-14 shrink-0 flex items-center justify-between gap-2 px-3.5 border-b border-slate-200 dark:border-neutral-700 bg-white/90 dark:bg-neutral-950/85 backdrop-blur-md relative z-40">
        <img src="/helogo.png" alt="Houston Enterprise" className="h-7 w-auto object-contain dark:invert shrink-0" />
        <div className="flex items-center gap-1.5">
          <button onClick={onToggleDark} className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-600 dark:text-neutral-300 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 active:scale-95 transition-transform" aria-label="Toggle dark mode">
            {dark ? <Sun className="w-[18px] h-[18px]" strokeWidth={1.9} /> : <Moon className="w-[18px] h-[18px]" strokeWidth={1.9} />}
          </button>
          <button className="relative w-9 h-9 rounded-lg flex items-center justify-center text-slate-600 dark:text-neutral-300 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 active:scale-95 transition-transform" aria-label="Notifications">
            <Bell className="w-[18px] h-[18px]" strokeWidth={1.9} />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] rounded-full px-0.5 text-white text-[8px] font-bold flex items-center justify-center leading-none tabular-nums border-2 border-white dark:border-neutral-950" style={{ backgroundColor: '#DC2626' }}>
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            )}
          </button>
          <button className="w-9 h-9 rounded-lg flex items-center justify-center text-white bg-[#0A0A0A] active:scale-95 transition-transform" onClick={onOpenMobileNav} aria-label="Open navigation">
            <PanelLeftOpen className="w-[18px] h-[18px]" strokeWidth={1.9} />
          </button>
        </div>
      </div>
    </>
  );
}

/* ══ Left rail — luxury nav, color‑coded icons, refined states ══ */
function RailNavList({ groups, activeKey, onSelect, collapsed }: {
  groups: AdminNavGroup[];
  activeKey: string;
  onSelect: (key: string) => void;
  collapsed: boolean;
}) {
  // Default: first 3 groups open, later groups collapsed for cleaner initial view
  const defaultCollapsed = new Set(['Business', 'System']);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(defaultCollapsed);
  const toggleGroup = (label: string) => setCollapsedGroups(prev => {
    const next = new Set(prev);
    if (next.has(label)) next.delete(label); else next.add(label);
    return next;
  });

  return (
    <nav className="flex-1 overflow-y-auto min-h-0 py-3 px-2">
      {groups.map(group => {
        const isGroupCollapsed = collapsedGroups.has(group.label);
        return (
          <div key={group.label} className="mb-1">
            {!collapsed && (
              <button onClick={() => toggleGroup(group.label)} className="term-group-label w-full flex items-center justify-between gap-2 px-2.5 pt-3 pb-1.5">
                <span>{group.label}</span>
                <ChevronDown className={`w-2.5 h-2.5 shrink-0 transition-transform duration-200 ${isGroupCollapsed ? '-rotate-90' : ''}`} strokeWidth={2.5} />
              </button>
            )}
            {(!isGroupCollapsed || collapsed) && (
              <div className="space-y-0.5">
                {group.items.map(item => {
                  const active = item.key === activeKey;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.key}
                      onClick={() => onSelect(item.key)}
                      title={collapsed ? item.label : undefined}
                      className={`term-nav-item w-full flex items-center gap-2.5 px-2.5 py-[9px] text-left transition-all ${
                        active ? 'term-nav-active' : ''
                      }`}
                    >
                      <span className="term-nav-icon flex items-center justify-center shrink-0" style={{ width: 20, height: 20 }}>
                        <Icon className="w-[18px] h-[18px]" strokeWidth={active ? 2.1 : 1.6} />
                      </span>
                      {!collapsed && (
                        <span className={`term-nav-label flex-1 min-w-0 truncate leading-tight ${active ? 'font-medium' : ''}`}>
                          {item.label}
                        </span>
                      )}
                      {!collapsed && !!item.badge && (
                        <span
                          className="term-badge shrink-0"
                          style={{
                            backgroundColor: item.urgent ? '#FEE2E2' : '#F3F4F6',
                            color: item.urgent ? '#DC2626' : '#6B7280',
                          }}
                        >
                          {item.badge > 99 ? '99+' : item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

function RailFooter({ onLock, onBackToWebsite, onOpenPortal, onOpenFinance, user, collapsed }: {
  onLock: () => void;
  onBackToWebsite: () => void;
  onOpenPortal?: () => void;
  onOpenFinance?: () => void;
  user?: AdminUser;
  collapsed: boolean;
}) {
  return (
    <div className="border-t border-slate-200 dark:border-neutral-700 py-2 px-2 shrink-0">
      <div className="space-y-0.5">
        <button onClick={onBackToWebsite} className="term-footer-item w-full flex items-center gap-2.5 px-2.5 py-[9px] text-[12px] font-medium">
          <Globe className="w-[15px] h-[15px] shrink-0" strokeWidth={1.7} />
          {!collapsed && 'Back to Website'}
        </button>
        {onOpenPortal && (
          <button onClick={onOpenPortal} className="term-footer-item w-full flex items-center gap-2.5 px-2.5 py-[9px] text-[12px] font-medium">
            <ExternalLink className="w-[15px] h-[15px] shrink-0" strokeWidth={1.7} />
            {!collapsed && 'Client Portal'}
          </button>
        )}
        {onOpenFinance && (
          <button onClick={onOpenFinance} className="term-footer-item w-full flex items-center gap-2.5 px-2.5 py-[9px] text-[12px] font-medium">
            <Wallet className="w-[15px] h-[15px] shrink-0" strokeWidth={1.7} />
            {!collapsed && 'Finance Dashboard'}
          </button>
        )}
        <button onClick={onLock} className="term-footer-item w-full flex items-center gap-2.5 px-2.5 py-[9px] text-[12px] font-medium hover:!text-red-600 hover:!bg-red-50 dark:hover:!bg-red-950/20">
          <Lock className="w-[15px] h-[15px] shrink-0" strokeWidth={1.7} />
          {!collapsed && 'Lock Dashboard'}
        </button>
      </div>
      {user && !collapsed && (
        <div className="mt-2 mx-1 rounded-xl p-2.5 border border-slate-100 dark:border-neutral-800 flex items-center gap-2.5 bg-slate-50/50 dark:bg-neutral-900/50">
          <span className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 text-white" style={{ backgroundColor: '#0A0A0A' }}>
            {user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold text-slate-800 dark:text-neutral-100 truncate leading-tight">{user.name}</span>
            <span className="block text-[9px] text-slate-400 dark:text-neutral-500 truncate">{user.role}</span>
          </span>
        </div>
      )}
    </div>
  );
}

export function TerminalRail({
  groups, activeKey, onSelect, mobileOpen, onCloseMobile, onLock, onBackToWebsite, onOpenPortal, onOpenFinance, user,
}: {
  groups: AdminNavGroup[];
  activeKey: string;
  onSelect: (key: string) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onLock: () => void;
  onBackToWebsite: () => void;
  onOpenPortal?: () => void;
  onOpenFinance?: () => void;
  user?: AdminUser;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      <style>{SIDEBAR_CSS}</style>
      {/* Desktop rail */}
      <aside className={`hidden md:flex flex-col shrink-0 border-r border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 transition-[width] duration-150 ${collapsed ? 'w-14' : 'w-56'}`}>
        <RailNavList groups={groups} activeKey={activeKey} onSelect={onSelect} collapsed={collapsed} />
        <RailFooter onLock={onLock} onBackToWebsite={onBackToWebsite} onOpenPortal={onOpenPortal} onOpenFinance={onOpenFinance} user={user} collapsed={collapsed} />
        <button
          onClick={() => setCollapsed(v => !v)}
          className="shrink-0 flex items-center justify-center py-2 border-t border-slate-200 dark:border-neutral-700 text-slate-300 dark:text-neutral-600 hover:text-slate-500 dark:hover:text-neutral-400 hover:bg-slate-50 dark:hover:bg-neutral-900 transition-colors"
          aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
        >
          {collapsed ? <PanelLeftOpen className="w-3.5 h-3.5" strokeWidth={1.7} /> : <PanelLeftClose className="w-3.5 h-3.5" strokeWidth={1.7} />}
        </button>
      </aside>

      {/* Mobile overlay — dimmed backdrop (tap to close) + slide‑in panel from the right,
          matching the side the menu trigger lives on in the mobile header. */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="md:hidden fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              onClick={onCloseMobile}
              aria-hidden="true"
            />
            <motion.div
              className="md:hidden fixed inset-y-0 right-0 z-50 w-[86%] max-w-[320px] bg-white dark:bg-neutral-950 flex flex-col shadow-2xl"
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 340, damping: 36 }}
              role="dialog" aria-modal="true" aria-label="Navigation menu"
            >
              <div className="h-16 shrink-0 flex items-center justify-between px-4 border-b border-slate-200 dark:border-neutral-700">
                <div>
                  <img src="/helogo.png" alt="Houston Enterprise" className="h-6 w-auto object-contain dark:invert" />
                  <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-neutral-500">Navigation</div>
                </div>
                <button onClick={onCloseMobile} className="w-9 h-9 rounded-lg flex items-center justify-center bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 text-slate-600 dark:text-neutral-300 active:scale-95 transition-transform" aria-label="Close menu">
                  <X className="w-[18px] h-[18px]" strokeWidth={1.9} />
                </button>
              </div>
              <RailNavList groups={groups} activeKey={activeKey} onSelect={key => { onSelect(key); onCloseMobile(); }} collapsed={false} />
              <RailFooter onLock={onLock} onBackToWebsite={onBackToWebsite} onOpenPortal={onOpenPortal} onOpenFinance={onOpenFinance} user={user} collapsed={false} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}