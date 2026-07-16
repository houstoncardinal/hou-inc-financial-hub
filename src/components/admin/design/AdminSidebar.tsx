import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Globe, ExternalLink, ShieldCheck, Wallet } from 'lucide-react';

const SERIF = "'Cormorant Garamond', Georgia, serif";

/* Luxury nav treatment: gold accent bar that scales in, a soft gradient wash,
   icon lift, and a gentle slide — GPU-friendly (transform/opacity only). */
const SIDEBAR_CSS = `
.asb-item{position:relative;border-radius:10px;transition:color .22s ease,transform .28s cubic-bezier(.22,1,.36,1);}
.asb-item::before{content:'';position:absolute;left:0;top:8px;bottom:8px;width:2.5px;border-radius:9999px;background:linear-gradient(180deg,#9D7E3F,#C9A962);opacity:0;transform:scaleY(.35);transform-origin:center;transition:opacity .25s ease,transform .32s cubic-bezier(.22,1,.36,1);}
.asb-item::after{content:'';position:absolute;inset:0;border-radius:10px;opacity:0;background:linear-gradient(90deg,rgba(157,126,63,.10),rgba(157,126,63,.025) 62%,transparent);transition:opacity .25s ease;pointer-events:none;}
.asb-item:hover{transform:translateX(2px);}
.asb-item:hover::before{opacity:.55;transform:scaleY(.7);}
.asb-item:hover::after{opacity:1;}
.asb-item:hover .asb-icon{color:#9D7E3F;transform:scale(1.1);}
.asb-active{transform:none!important;}
.asb-active::before{opacity:1;transform:scaleY(1);}
.asb-active::after{opacity:1;background:linear-gradient(90deg,rgba(157,126,63,.15),rgba(157,126,63,.04) 68%,transparent);}
.asb-icon{transition:color .22s ease,transform .28s cubic-bezier(.22,1,.36,1);}
.asb-danger:hover::before{background:linear-gradient(180deg,#ef4444,#f87171);}
.asb-danger:hover::after{background:linear-gradient(90deg,rgba(239,68,68,.08),transparent 65%);}
.asb-danger:hover .asb-icon{color:#ef4444;}
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
  return (
    <nav className="flex-1 overflow-y-auto min-h-0 py-1.5">
      {groups.map(group => (
        <div key={group.label} className="mb-1">
          <div className="px-5 pt-2 pb-1">
            <span className="text-[8px] uppercase tracking-[0.22em] text-muted-foreground/70 font-bold">{group.label}</span>
          </div>
          <div className="px-2.5 space-y-[2px]">
            {group.items.map(item => {
              const active = item.key === activeKey;
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  onClick={() => onSelect(item.key)}
                  className={`asb-item w-full flex items-center gap-2.5 px-3 text-left ${dense ? 'py-2.5' : 'py-[6px]'} ${
                    active ? 'asb-active text-foreground font-semibold' : 'text-foreground/72 hover:text-foreground'
                  }`}
                >
                  <Icon className={`asb-icon w-4 h-4 shrink-0 ${active ? 'text-accent' : 'text-muted-foreground'}`} strokeWidth={active ? 2 : 1.7} />
                  <span className="flex-1 min-w-0 text-[12px] truncate leading-tight">{item.label}</span>
                  {!!item.badge && (
                    <span className={`min-w-[19px] h-[19px] px-1 rounded-full text-[9px] font-bold flex items-center justify-center leading-none shrink-0 ${
                      item.urgent ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground'
                    }`}>
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function SidebarHeader() {
  return (
    <div className="px-4 h-14 flex items-center gap-2.5 border-b border-border shrink-0">
      <div className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 bg-accent/12 border border-accent/30 text-accent">
        <ShieldCheck className="w-4 h-4" strokeWidth={1.7} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[12px] font-bold tracking-tight truncate leading-tight text-foreground" style={{ fontFamily: SERIF }}>
          Houston Enterprise
        </div>
        <div className="text-[7.5px] uppercase tracking-[0.24em] text-accent font-bold truncate mt-0.5">Admin Dashboard</div>
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
  const pad = dense ? 'py-2.5' : 'py-[6px]';
  return (
    <div className="border-t border-border shrink-0 pt-1.5">
      <div className="px-2.5 space-y-[2px]">
        <button onClick={onBackToWebsite} className={`asb-item w-full flex items-center gap-2.5 px-3 ${pad} text-[12px] text-foreground/72 hover:text-foreground`}>
          <Globe className="asb-icon w-4 h-4 shrink-0 text-muted-foreground" strokeWidth={1.7} />
          Back to Website
        </button>
        {onOpenPortal && (
          <button onClick={onOpenPortal} className={`asb-item w-full flex items-center gap-2.5 px-3 ${pad} text-[12px] text-foreground/72 hover:text-foreground`}>
            <ExternalLink className="asb-icon w-4 h-4 shrink-0 text-muted-foreground" strokeWidth={1.7} />
            Client Portal
          </button>
        )}
        {onOpenFinance && (
          <button onClick={onOpenFinance} className={`asb-item w-full flex items-center gap-2.5 px-3 ${pad} text-[12px] text-foreground/72 hover:text-foreground`}>
            <Wallet className="asb-icon w-4 h-4 shrink-0 text-muted-foreground" strokeWidth={1.7} />
            Finance Dashboard
          </button>
        )}
        <button onClick={onLock} className={`asb-item asb-danger w-full flex items-center gap-2.5 px-3 ${pad} text-[12px] text-foreground/72 hover:text-destructive`}>
          <Lock className="asb-icon w-4 h-4 shrink-0 text-muted-foreground" strokeWidth={1.7} />
          Lock Dashboard
        </button>
      </div>
      {user && (
        <div className="mx-2.5 mt-1.5 mb-2 p-2 rounded-[10px] border border-border bg-secondary/35 flex items-center gap-2.5 transition-colors hover:border-accent/35">
          <span className="w-7 h-7 rounded-lg bg-accent/15 text-accent flex items-center justify-center text-[10px] font-black shrink-0">
            {user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1 flex items-baseline gap-1.5">
            <span className="text-[11.5px] font-bold text-foreground truncate leading-tight">{user.name}</span>
            <span className="text-[9.5px] text-muted-foreground shrink-0">{user.role}</span>
          </span>
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
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 border-r border-border flex-col z-30 bg-background">
        <SidebarHeader />
        <NavList groups={groups} activeKey={activeKey} onSelect={onSelect} />
        <SidebarFooter onLock={onLock} onBackToWebsite={onBackToWebsite} onOpenPortal={onOpenPortal} onOpenFinance={onOpenFinance} user={user} />
      </aside>

      {/* Mobile full-screen overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="md:hidden fixed inset-0 z-50 bg-background flex flex-col"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
          >
            <div className="flex items-center justify-between px-4 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-accent/12 border border-accent/30 text-accent">
                  <ShieldCheck className="w-[18px] h-[18px]" strokeWidth={1.7} />
                </div>
                <div>
                  <div className="text-[12px] font-bold tracking-tight text-foreground" style={{ fontFamily: SERIF }}>Houston Enterprise</div>
                  <div className="text-[7.5px] uppercase tracking-[0.24em] text-accent font-bold mt-0.5">Admin Dashboard</div>
                </div>
              </div>
              <button onClick={onCloseMobile} className="w-9 h-9 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:text-foreground" aria-label="Close menu">
                <X className="w-4.5 h-4.5" strokeWidth={1.7} />
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
