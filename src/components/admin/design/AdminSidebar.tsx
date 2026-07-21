import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Globe, ExternalLink, Wallet, ChevronDown } from 'lucide-react';

const IND = '#4F46E5';

/* ── Enterprise sidebar: clean, light, grouped — matches the OverviewDashboard
   indigo system. No glass/gold treatment — flat white, generous whitespace. ── */
const SIDEBAR_CSS = `
.asb-shell{background:#fff;border-right:1px solid #F0F1F5;}
.dark .asb-shell{background:hsl(var(--card));border-color:hsl(var(--border));}
.asb-item{position:relative;overflow:hidden;border-radius:10px;transition:color .2s ease,background-color .2s ease;color:#4B5563;}
.asb-item::before{content:'';position:absolute;left:0;top:22%;bottom:22%;width:3px;border-radius:2px;background:${IND};opacity:0;transform:scaleY(.3);transition:opacity .2s ease,transform .3s cubic-bezier(.34,1.56,.64,1);}
.asb-item:hover{background:#F9FAFB;color:#111827;}
.asb-item:hover::before{opacity:.3;transform:scaleY(1);}
.dark .asb-item:hover{background:hsl(var(--secondary)/.5);}
.asb-active{color:${IND}!important;font-weight:700;}
.asb-active::before{opacity:1!important;transform:scaleY(1)!important;}
.asb-active:hover{background:transparent;}
.asb-icon{transition:color .2s ease,transform .3s cubic-bezier(.34,1.56,.64,1);}
.asb-item:hover .asb-icon{transform:translateX(2px) scale(1.08);}
.asb-danger:hover{background:rgba(220,38,38,.06);color:#DC2626;}
.asb-danger:hover .asb-icon{color:#DC2626;}
.asb-group-btn{transition:color .15s ease;}
.asb-group-btn:hover{color:#6B7280;}
.asb-badge-urgent{animation:asb-pulse 2.4s ease-in-out infinite;}
@keyframes asb-pulse{0%,100%{transform:scale(1);}50%{transform:scale(1.1);}}
.asb-live-dot{animation:asb-dot-breathe 2.2s ease-in-out infinite;}
@keyframes asb-dot-breathe{0%,100%{box-shadow:0 0 0 0 rgba(79,70,229,.4);}50%{box-shadow:0 0 0 4px rgba(79,70,229,0);}}
.asb-footer-card{transition:all .25s cubic-bezier(.16,1,.3,1);}
.asb-footer-card:hover{border-color:#DEE3FC!important;box-shadow:0 4px 14px rgba(16,24,40,.06);transform:translateY(-1px);}
.asb-avatar{transition:transform .28s cubic-bezier(.34,1.56,.64,1);}
.asb-footer-card:hover .asb-avatar{transform:scale(1.08);}
`;

export interface AdminNavItem {
  key: string;
  label: string;
  icon: React.ComponentType<any>;
  desc?: string;
  badge?: number;
  urgent?: boolean;
}

export interface AdminNavGroup {
  label: string;
  items: AdminNavItem[];
}

export interface AdminUser {
  name: string;
  role: string;
}

function NavList({ groups, activeKey, onSelect, dense = false }: {
  groups: AdminNavGroup[];
  activeKey: string;
  onSelect: (key: string) => void;
  dense?: boolean;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggleGroup = (label: string) => setCollapsed(prev => {
    const next = new Set(prev);
    if (next.has(label)) next.delete(label); else next.add(label);
    return next;
  });

  return (
    <nav className="flex-1 overflow-y-auto min-h-0 py-2">
      {groups.map(group => {
        const isCollapsed = collapsed.has(group.label);
        return (
          <div key={group.label} className="mb-1">
            <button
              onClick={() => toggleGroup(group.label)}
              className="asb-group-btn w-full flex items-center justify-between gap-2 px-5 pt-3 pb-1.5 text-gray-400"
            >
              <span className="text-[9.5px] uppercase tracking-[0.16em] font-bold">{group.label}</span>
              <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} strokeWidth={2.4} />
            </button>
            {!isCollapsed && (
              <div className="px-3 space-y-0.5">
                {group.items.map(item => {
                  const active = item.key === activeKey;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.key}
                      onClick={() => onSelect(item.key)}
                      className={`asb-item w-full flex items-center gap-2.5 px-3 text-left ${dense ? 'py-2.5' : 'py-[7px]'} ${active ? 'asb-active' : ''}`}
                    >
                      <Icon className="asb-icon w-[15px] h-[15px] shrink-0" strokeWidth={active ? 2.1 : 1.7} />
                      <span className="flex-1 min-w-0 text-[12.5px] truncate leading-tight">{item.label}</span>
                      {!!item.badge && (
                        <span className={`min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-bold flex items-center justify-center leading-none shrink-0 ${
                          item.urgent ? 'bg-orange-500 text-white asb-badge-urgent' : 'bg-gray-100 text-gray-500'
                        }`}>
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

function SidebarHeader() {
  return (
    <div className="px-5 h-16 flex items-center shrink-0 border-b" style={{ borderColor: '#F0F1F5' }}>
      <div className="min-w-0">
        <img src="/helogo.png" alt="Houston Enterprise" className="h-7 w-auto object-contain" />
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="asb-live-dot w-[5px] h-[5px] rounded-full shrink-0" style={{ backgroundColor: IND }} />
          <div className="text-[8.5px] uppercase tracking-[0.22em] text-gray-400 font-bold">Admin Console</div>
        </div>
      </div>
    </div>
  );
}

function SidebarFooter({ onLock, onBackToWebsite, onOpenPortal, onOpenFinance, user, dense = false }: {
  onLock: () => void;
  onBackToWebsite: () => void;
  onOpenPortal?: () => void;
  onOpenFinance?: () => void;
  user?: AdminUser;
  dense?: boolean;
}) {
  const pad = dense ? 'py-2.5' : 'py-[7px]';
  return (
    <div className="border-t shrink-0 pt-2" style={{ borderColor: '#F0F1F5' }}>
      <div className="px-3 space-y-0.5">
        <button onClick={onBackToWebsite} className={`asb-item w-full flex items-center gap-2.5 px-3 ${pad} text-[12px] text-gray-500`}>
          <Globe className="asb-icon w-[15px] h-[15px] shrink-0" strokeWidth={1.7} />
          Back to Website
        </button>
        {onOpenPortal && (
          <button onClick={onOpenPortal} className={`asb-item w-full flex items-center gap-2.5 px-3 ${pad} text-[12px] text-gray-500`}>
            <ExternalLink className="asb-icon w-[15px] h-[15px] shrink-0" strokeWidth={1.7} />
            Client Portal
          </button>
        )}
        {onOpenFinance && (
          <button onClick={onOpenFinance} className={`asb-item w-full flex items-center gap-2.5 px-3 ${pad} text-[12px] text-gray-500`}>
            <Wallet className="asb-icon w-[15px] h-[15px] shrink-0" strokeWidth={1.7} />
            Finance Dashboard
          </button>
        )}
        <button onClick={onLock} className={`asb-item asb-danger w-full flex items-center gap-2.5 px-3 ${pad} text-[12px] text-gray-500`}>
          <Lock className="asb-icon w-[15px] h-[15px] shrink-0" strokeWidth={1.7} />
          Lock Dashboard
        </button>
      </div>
      {user && (
        <div className="asb-footer-card mx-3 mt-2 mb-3 p-2 rounded-xl border flex items-center gap-2.5" style={{ borderColor: '#F0F1F5' }}>
          <span className="asb-avatar w-8 h-8 rounded-full flex items-center justify-center text-[10.5px] font-black shrink-0 text-white"
            style={{ backgroundColor: IND }}>
            {user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11.5px] font-bold text-gray-900 truncate leading-tight">{user.name}</span>
            <span className="block text-[9.5px] text-gray-400 truncate">{user.role}</span>
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-gray-300 shrink-0" strokeWidth={2.2} />
        </div>
      )}
    </div>
  );
}

export function AdminSidebar({
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
  return (
    <>
      <style>{SIDEBAR_CSS}</style>

      {/* Desktop sidebar */}
      <aside className="asb-shell hidden md:flex fixed inset-y-0 left-0 w-64 flex-col z-30 overflow-hidden">
        <SidebarHeader />
        <NavList groups={groups} activeKey={activeKey} onSelect={onSelect} />
        <SidebarFooter onLock={onLock} onBackToWebsite={onBackToWebsite} onOpenPortal={onOpenPortal} onOpenFinance={onOpenFinance} user={user} />
      </aside>

      {/* Mobile full-screen overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="md:hidden fixed inset-0 z-50 bg-white flex flex-col"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: '#F0F1F5' }}>
              <img src="/helogo.png" alt="Houston Enterprise" className="h-7 w-auto object-contain" />
              <button onClick={onCloseMobile} className="w-9 h-9 flex items-center justify-center rounded-xl border text-gray-500" style={{ borderColor: '#F0F1F5' }} aria-label="Close menu">
                <X className="w-4 h-4" strokeWidth={1.7} />
              </button>
            </div>
            <NavList
              groups={groups}
              activeKey={activeKey}
              onSelect={key => { onSelect(key); onCloseMobile(); }}
              dense
            />
            <SidebarFooter onLock={onLock} onBackToWebsite={onBackToWebsite} onOpenPortal={onOpenPortal} onOpenFinance={onOpenFinance} user={user} dense />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
