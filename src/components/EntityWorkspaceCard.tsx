import { motion } from 'framer-motion';
import {
  Landmark, ArrowUpRight, ShieldCheck, LogOut,
  FolderKanban, FileText, TrendingUp, Wrench, Package, Zap, ShoppingCart,
  ScrollText, Coins, Scale, LucideIcon,
} from 'lucide-react';
import { Entity } from '@/contexts/EntityContext';
import { useAuth } from '@/hooks/useAuth';

/* ── Single source of truth for the entity-workspace card used on BOTH
   /finance (EntitySelect.tsx) and /ops (OpsCenter.tsx) — kept in one file so
   the two screens can never visually drift apart when one gets upgraded.

   Wide, single-row card built from three sections (identity | detail |
   actions), separated by hairline dividers — the same shape as an elevated
   private-banking account row. Collapses to a clean vertical stack on
   mobile. Every card is a flex column with ONE flex-1 spacer in the middle
   section, so the action column always lands at the same height regardless
   of description length — this is what keeps buttons pixel-aligned across
   stacked cards. The action column itself uses items-stretch (default) so
   two stacked/side-by-side buttons are always exactly the same size. ── */

export const ENTITY_MODULES: Record<string, { label: string; icon: LucideIcon }[]> = {
  'houston-enterprise': [
    { label: 'Projects & WIP',        icon: FolderKanban },
    { label: 'Checks & Invoicing',    icon: FileText },
    { label: 'Cost-to-Complete',      icon: TrendingUp },
    { label: 'Bank Reconciliation',   icon: Landmark },
  ],
  'houston-generator-pros': [
    { label: 'Service Jobs',      icon: Wrench },
    { label: 'Inventory & Parts', icon: Package },
    { label: 'Storm Response',    icon: Zap },
    { label: 'Procurement',       icon: ShoppingCart },
  ],
  'houston-enterprise-holdings': [
    { label: 'Notes & Debt',      icon: ScrollText },
    { label: 'Covenants',         icon: ShieldCheck },
    { label: 'Capital Activity',  icon: Coins },
    { label: 'Balance Sheet',     icon: Scale },
  ],
};

export const BRAND_GRADIENT = '#9D7E3F';

export const ENTITY_CARD_CSS = `
  .ec-card {
    position: relative;
    border-radius: 20px;
    background: #ffffff;
    border: 1px solid #E7E7EA;
    box-shadow: 0 1px 2px rgba(15,17,21,0.04), 0 1px 1px rgba(15,17,21,0.02);
    transition: border-color .2s ease, box-shadow .2s ease;
  }
  @media (hover: hover) and (pointer: fine) {
    .ec-card:hover {
      border-color: var(--accent);
      box-shadow: 0 16px 32px -12px rgba(15,17,21,0.14), 0 3px 8px rgba(15,17,21,0.05);
    }
    .ec-card:hover .ec-icon { background: var(--accent); border-color: var(--accent); }
    .ec-card:hover .ec-icon svg { color: #fff !important; }
  }
  .ec-card.ec-selected {
    border-color: var(--accent);
    box-shadow: 0 16px 32px -12px rgba(15,17,21,0.14), 0 3px 8px rgba(15,17,21,0.05);
  }
  .ec-card.ec-selected .ec-icon { background: var(--accent); border-color: var(--accent); }
  .ec-card.ec-selected .ec-icon svg { color: #fff !important; }
  .ec-icon {
    background: var(--icon-bg);
    border-color: #E7E7EA;
    transition: background .18s ease, border-color .18s ease;
  }
  .ec-icon svg { transition: color .18s ease; }
  .ec-bar { background: var(--accent); }
  .ec-mod-icon { background: var(--icon-bg); }
  .ec-btn-primary {
    background: var(--accent);
    color: #fff;
    transition: filter .15s ease;
  }
  .ec-btn-primary:hover { filter: brightness(1.15); }
  .ec-btn-secondary {
    background: #ffffff;
    color: #18181B;
    border: 1px solid #E7E7EA;
    transition: border-color .15s ease, background .15s ease;
  }
  .ec-btn-secondary:hover { border-color: #A1A1AA; background: #FAFAFA; }
`;

export function EntityMark({ entity }: { entity: Entity }) {
  if (entity.logoUrl) {
    return (
      <img
        src={entity.logoUrl}
        alt={entity.name}
        className="h-7 w-auto object-contain shrink-0"
        style={{ maxWidth: '100%' }}
      />
    );
  }
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="ec-icon flex items-center justify-center rounded-lg border shrink-0 w-8 h-8">
        <Landmark style={{ color: entity.color }} strokeWidth={1.8} className="w-4 h-4" />
      </div>
      <span className="text-[17px] font-black text-gray-900 tracking-tight leading-none">
        {entity.shortName}
      </span>
    </div>
  );
}

export function EntityCard({
  entity, isCurrent, onGo, onSelect, selected,
}: {
  entity: Entity;
  isCurrent: boolean;
  onGo: (target: 'admin' | 'finance') => void;
  /** When provided, the whole card body also acts as a selector (used by /ops
      to choose which entity's operations hub to enter) alongside the direct
      action buttons below — both stay usable at once. */
  onSelect?: () => void;
  selected?: boolean;
}) {
  const stop = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn(); };
  const modules = ENTITY_MODULES[entity.id] ?? [];

  return (
    <motion.div
      onClick={onSelect}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      whileTap={onSelect ? { scale: 0.995 } : undefined}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={`ec-card overflow-hidden ${selected ? 'ec-selected' : ''} ${onSelect ? 'cursor-pointer' : ''}`}
      style={{
        '--accent': entity.color,
        '--icon-bg': entity.colorMuted,
      } as React.CSSProperties}
    >
      <div className="ec-bar h-[3px] w-full" />

      <div className="flex flex-col md:flex-row">
        {/* ── Identity ── */}
        <div className="flex items-center justify-between md:flex-col md:items-start md:justify-center gap-2 p-4 md:p-5 md:w-[230px] md:shrink-0 border-b md:border-b-0 md:border-r border-gray-100">
          <EntityMark entity={entity} />
          <div className="flex items-center gap-1.5 md:flex-col md:items-start md:gap-1.5 md:mt-2.5">
            {isCurrent && (
              <span
                className="text-[8px] font-black uppercase tracking-[0.14em] px-2 py-[3px] rounded-full"
                style={{ color: entity.color, background: entity.colorMuted }}
              >
                Current
              </span>
            )}
            <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-gray-400">
              {entity.category}
            </span>
          </div>
        </div>

        {/* ── Detail: flex-1 spacer keeps every card's action column the
            same height regardless of description/module content. ── */}
        <div className="flex-1 min-w-0 p-4 md:p-5 border-b md:border-b-0 md:border-r border-gray-100 flex flex-col justify-center">
          {!entity.logoUrl && (
            <h3 className="text-[16px] font-extrabold text-gray-900 tracking-tight leading-tight mb-1">
              {entity.name}
            </h3>
          )}
          <p className="text-[11px] font-semibold mb-1.5" style={{ color: entity.color }}>
            {entity.tagline}
          </p>
          <p className="text-[12.5px] text-gray-500 leading-relaxed line-clamp-2 mb-3">
            {entity.description}
          </p>

          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {modules.map((m) => (
              <div key={m.label} className="flex items-center gap-2">
                <div className="ec-mod-icon flex items-center justify-center rounded-md w-6 h-6 shrink-0">
                  <m.icon className="w-3 h-3" style={{ color: entity.color }} strokeWidth={2} />
                </div>
                <span className="text-[11px] font-semibold text-gray-600 whitespace-nowrap">{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Actions — identical on /finance and /ops. Fixed-height (h-10)
            buttons at every breakpoint: flex-1 splits width evenly when
            stacked side by side on mobile; md:flex-none + md:w-full keeps
            them a constant size on desktop instead of stretching to fill
            the whole column, so a 1-button card and a 2-button card both
            show buttons of the same size. ── */}
        <div className="flex gap-2 p-4 md:p-5 md:w-[190px] md:shrink-0 md:flex-col md:justify-center">
          {entity.hasAdminAccess && (
            <button
              onClick={stop(() => onGo('admin'))}
              className="ec-btn-secondary h-10 flex-1 md:flex-none md:w-full flex items-center justify-center gap-1.5 rounded-lg text-[11px] font-bold"
            >
              <ShieldCheck className="w-3.5 h-3.5" strokeWidth={2} />
              Admin
            </button>
          )}
          <button
            onClick={stop(() => onGo('finance'))}
            className="ec-btn-primary h-10 flex-1 md:flex-none md:w-full flex items-center justify-center gap-1.5 rounded-lg text-[11px] font-bold"
          >
            Finance Dashboard
            <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.25} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/** Shared page header used by both /finance and /ops — Houston Enterprise
    wordmark, eyebrow label, optional hint text, and a "signed in as" chip. */
export function EntityPortalHeader({ eyebrow, rightHint, onSignOut }: { eyebrow: string; rightHint?: string; onSignOut?: () => void }) {
  const { user } = useAuth();
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'Admin';
  const initial = firstName.charAt(0).toUpperCase();

  return (
    <div className="flex items-center justify-between mb-4 md:mb-6 pb-3 md:pb-4 border-b border-gray-100 shrink-0">
      <div className="flex items-center gap-3">
        <img src="/helogo.png" alt="Houston Enterprise" className="h-6 md:h-7 w-auto object-contain" />
        <span className="text-gray-300 text-sm font-light">/</span>
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">{eyebrow}</span>
      </div>
      <div className="flex items-center gap-2">
        {rightHint && <span className="hidden md:inline text-[11.5px] text-gray-400 mr-1">{rightHint}</span>}
        <div className="hidden sm:flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-full bg-gray-50 border border-gray-100">
          <div className="flex items-center justify-center rounded-full w-5 h-5 shrink-0 text-white text-[9px] font-bold" style={{ background: '#18181B' }}>
            {initial}
          </div>
          <span className="text-[10.5px] font-semibold text-gray-600">{firstName}</span>
        </div>
        {onSignOut && (
          <button onClick={onSignOut} className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 hover:text-red-600 border border-gray-200 hover:border-red-200 rounded-full px-2.5 py-1.5 transition-colors">
            <LogOut className="w-3 h-3" strokeWidth={2} /> <span className="hidden sm:inline">Sign Out</span>
          </button>
        )}
      </div>
    </div>
  );
}

export function TopAccentLine() {
  return <div className="fixed top-0 left-0 right-0 h-[2px] z-50" style={{ background: BRAND_GRADIENT }} />;
}

export function HeadlineAccentTick() {
  return <div className="hidden md:block w-6 h-[2px] rounded-full mb-3" style={{ background: BRAND_GRADIENT }} />;
}
