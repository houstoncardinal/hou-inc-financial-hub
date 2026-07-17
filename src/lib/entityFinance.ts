/* ── Entity-aware finance architecture ────────────────────────────────────────
   Single source of truth for which finance modules each entity gets, what
   they're called, and which overview dashboard renders. Houston Enterprise
   keeps the full construction finance suite unchanged; Houston Generator Pros
   and Houston Enterprise Holdings get navigation, terminology, and overview
   dashboards fitted to their business models instead of a copied construction
   UI. Pure data + pure functions so gating logic is unit-testable. ── */

export type FinanceModuleKey =
  | 'overview' | 'ledger' | 'checks' | 'income' | 'expenses'
  | 'projects' | 'vendors' | 'invoices' | 'charts' | 'controls'
  | 'changelog' | 'concierge' | 'documents';

export type OverviewVariant = 'construction' | 'generator' | 'holdings';

export interface EntityFinanceProfile {
  /** Which nav modules are visible for this entity. */
  modules: FinanceModuleKey[];
  /** Which overview dashboard renders at /finance/dashboard. */
  overview: OverviewVariant;
  /** Nav label overrides keyed by module (falls back to the shared label). */
  labels: Partial<Record<FinanceModuleKey, string>>;
  /** Nav description overrides keyed by module. */
  descriptions: Partial<Record<FinanceModuleKey, string>>;
  /** Business-model terminology used across shared screens. */
  terms: { project: string; projects: string; vendor: string; vendors: string };
}

const ALL_MODULES: FinanceModuleKey[] = [
  'overview', 'ledger', 'checks', 'income', 'expenses', 'projects', 'vendors',
  'invoices', 'charts', 'controls', 'changelog', 'concierge', 'documents',
];

export const ENTITY_FINANCE_PROFILES: Record<string, EntityFinanceProfile> = {
  /* Full construction finance suite — WIP controls, guided entry, everything. */
  'houston-enterprise': {
    modules: ALL_MODULES,
    overview: 'construction',
    labels: {},
    descriptions: {},
    terms: { project: 'Project', projects: 'Projects', vendor: 'Vendor', vendors: 'Vendors' },
  },

  /* Generator sales, installs, inventory, and recurring service — no
     construction WIP controls, no construction guided-entry concierge. */
  'houston-generator-pros': {
    modules: [
      'overview', 'ledger', 'checks', 'income', 'expenses', 'projects',
      'vendors', 'invoices', 'charts', 'changelog', 'documents',
    ],
    overview: 'generator',
    labels: {
      overview: 'Generator Ops',
      projects: 'Install Jobs',
      vendors: 'Suppliers',
    },
    descriptions: {
      overview: 'Sales, inventory, service & margin',
      projects: 'Installation & service jobs',
      vendors: 'Distributors & suppliers',
    },
    terms: { project: 'Job', projects: 'Install Jobs', vendor: 'Supplier', vendors: 'Suppliers' },
  },

  /* Holding-company operations — capital, notes, distributions, consolidated
     view. Checks stay (distributions are paid by check); construction WIP
     controls and the construction concierge are hidden. */
  'houston-enterprise-holdings': {
    modules: [
      'overview', 'ledger', 'checks', 'income', 'expenses', 'projects',
      'vendors', 'invoices', 'charts', 'changelog', 'documents',
    ],
    overview: 'holdings',
    labels: {
      overview: 'Holdings HQ',
      projects: 'Assets & Deals',
      income: 'Inflows',
      expenses: 'Corporate Expenses',
    },
    descriptions: {
      overview: 'Portfolio, capital & consolidated view',
      projects: 'Investments & development deals',
      income: 'Interest, fees & distributions in',
      expenses: 'Overhead & corporate costs',
    },
    terms: { project: 'Asset', projects: 'Assets & Deals', vendor: 'Counterparty', vendors: 'Counterparties' },
  },
};

const FALLBACK = ENTITY_FINANCE_PROFILES['houston-enterprise'];

export function financeProfileFor(entityId: string | null | undefined): EntityFinanceProfile {
  return (entityId && ENTITY_FINANCE_PROFILES[entityId]) || FALLBACK;
}

export function entityHasModule(entityId: string | null | undefined, module: FinanceModuleKey): boolean {
  return financeProfileFor(entityId).modules.includes(module);
}

/** Route → module map so navigation and guards gate consistently. */
export const ROUTE_MODULES: Record<string, FinanceModuleKey> = {
  '/finance/dashboard': 'overview',
  '/ledger': 'ledger',
  '/checks': 'checks',
  '/income': 'income',
  '/expenses': 'expenses',
  '/projects': 'projects',
  '/vendors': 'vendors',
  '/invoices': 'invoices',
  '/charts': 'charts',
  '/finance/controls': 'controls',
  '/changelog': 'changelog',
  '/concierge': 'concierge',
  '/documents': 'documents',
};

export function moduleLabel(entityId: string | null | undefined, module: FinanceModuleKey, fallback: string): string {
  return financeProfileFor(entityId).labels[module] ?? fallback;
}

export function moduleDescription(entityId: string | null | undefined, module: FinanceModuleKey, fallback: string): string {
  return financeProfileFor(entityId).descriptions[module] ?? fallback;
}
