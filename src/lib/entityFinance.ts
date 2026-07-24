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
  | 'changelog' | 'concierge' | 'documents' | 'storm' | 'inventory' | 'reports'
  | 'procurement' | 'clients'
  | 'command' | 'estimates' | 'people' | 'equipment';

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
  /** Category pickers on the Income/Expense forms (transactions.category). */
  incomeCategories: string[];
  expenseCategories: string[];
  /** Quick-add tag presets on the Documents upload sheet (documents.tags). */
  documentTags: string[];
  /** Projects-screen header copy. */
  projectsHeader: { title: string; description: string };
  /** Finance Controls-screen header copy. Also gates which sections of that
      screen render — WIP/percent-complete and cost-code commitments are
      construction-specific concepts (retainage, change orders, earned
      value) that don't map onto generator install/service jobs or holding-
      company asset deals, so those sections only render for entities whose
      `overview` is 'construction'. */
  controlsHeader: { title: string; description: string };
  /** Shared-screen header copy keyed by screen (falls back to shared copy). */
  screenHeaders: Partial<Record<'vendors' | 'checks' | 'invoices', { title: string; description: string }>>;
}

const ALL_MODULES: FinanceModuleKey[] = [
  'overview', 'command', 'ledger', 'checks', 'income', 'expenses', 'projects', 'vendors',
  'invoices', 'charts', 'controls', 'changelog', 'concierge', 'documents', 'reports',
  'clients', 'procurement', 'estimates', 'people', 'equipment',
];

export const ENTITY_FINANCE_PROFILES: Record<string, EntityFinanceProfile> = {
  /* Full construction finance suite — WIP controls, guided entry, everything.
     Category lists match the pre-entity-aware hardcoded lists exactly so
     Houston Enterprise's forms are byte-identical to before. */
  'houston-enterprise': {
    modules: ALL_MODULES,
    overview: 'construction',
    labels: {},
    descriptions: {},
    terms: { project: 'Project', projects: 'Projects', vendor: 'Vendor', vendors: 'Vendors' },
    incomeCategories: [
      'Client Payment', 'Retainer', 'Project Milestone', 'Consulting Fee',
      'Reimbursement', 'Interest Income', 'Grant', 'Investment',
      'Refund', 'Other Income',
    ],
    expenseCategories: [
      'Materials', 'Labor', 'Subcontractor', 'Equipment', 'Equipment rental',
      'Permits', 'Inspections', 'Fuel', 'Delivery', 'Dumpster and disposal',
      'Jobsite utilities', 'Temporary facilities', 'Professional services',
      'Repairs', 'Tools and supplies', 'Office overhead', 'Insurance',
      'Marketing', 'Software', 'Payroll', 'Vehicle expense', 'Travel',
      'Meals', 'Other',
    ],
    documentTags: [
      'Contract', 'Change Order', 'Lien Waiver', 'Permit', 'Inspection',
      'Draw Package', 'Sub Agreement', 'Jobsite Photo', 'Closeout',
    ],
    projectsHeader: {
      title: 'Project Portfolio',
      description: 'Budget allocation, capital deployed, and outstanding obligations across all active jobs.',
    },
    controlsHeader: {
      title: 'Construction Finance Command Center',
      description: 'WIP, retainage, aging, commitments, bank matching, and role controls for launch operations.',
    },
    screenHeaders: {},
  },

  /* Generator sales, installs, inventory, and recurring service. Concierge is
     enabled here because src/pages/Concierge.tsx has HGP-specific guided flows
     (generator income, suppliers, install jobs, service parts, emergency work),
     not the construction-only questions. */
  'houston-generator-pros': {
    modules: [
      'overview', 'ledger', 'checks', 'income', 'expenses', 'projects',
      'vendors', 'invoices', 'charts', 'changelog', 'documents', 'storm', 'inventory',
      'clients', 'controls', 'reports', 'concierge',
    ],
    overview: 'generator',
    labels: {
      overview: 'Generator Ops',
      projects: 'Install Jobs',
      vendors: 'Suppliers',
      storm: 'Storm Response',
      inventory: 'Inventory',
      clients: 'Clients',
      controls: 'Controls',
      concierge: 'Guided Entry',
    },
    descriptions: {
      overview: 'Sales, inventory, service & margin',
      projects: 'Installation & service jobs',
      vendors: 'Distributors & suppliers',
      storm: 'Outage intelligence & dispatch',
      inventory: 'Parts, stock & movement ledger',
      clients: 'Generator customers & sites',
      controls: 'Aging, bank matching & roles',
      reports: 'Ops, inventory & job exports',
      concierge: 'Guided HGP finance flows',
    },
    terms: { project: 'Job', projects: 'Install Jobs', vendor: 'Supplier', vendors: 'Suppliers' },
    /* 'Service Maintenance'/'Emergency Service' match the categories written
       by the hgp_visit income sync trigger (20260716000016) and read by the
       Generator Ops revenue split — keep those strings stable. */
    incomeCategories: [
      'Generator Sale', 'Generator Deposit', 'Installation Payment', 'Final Payment',
      'Service Maintenance', 'Maintenance Plan', 'Emergency Service',
      'Warranty Reimbursement', 'Financing Payment', 'Parts Sale', 'Other Income',
    ],
    expenseCategories: [
      'Generator Equipment Purchase', 'Distributor Invoice', 'Install Materials',
      'Electrical Labor', 'Subcontract Labor', 'Permit Fees', 'Inspection Fees',
      'Warranty Parts', 'Service Parts', 'Truck & Fuel', 'Marketing Leads',
      'Software', 'Insurance', 'Payroll', 'Office Overhead', 'Other',
    ],
    documentTags: [
      'Signed Proposal', 'Site Survey', 'Load Calculation', 'Spec Sheet',
      'Permit Application', 'Inspection Approval', 'Warranty Registration',
      'Maintenance Agreement', 'Install Photos', 'Service Report', 'Manufacturer Invoice',
    ],
    projectsHeader: {
      title: 'Install Jobs',
      description: 'Generator sales, installation jobs, and service work — equipment, labor, and margin per job.',
    },
    controlsHeader: {
      title: 'Operations Controls',
      description: 'AR/AP aging, bank feed matching, and role controls for Houston Generator Pros.',
    },
    screenHeaders: {
      vendors: { title: 'Suppliers & Distributors', description: 'Generator distributors, electrical suppliers, subcontract electricians, and parts sources with spend history.' },
      checks: { title: 'Check Ledger', description: 'Distributor, subcontractor, and permit payments — issuance and clearance state.' },
      invoices: { title: 'Customer Invoices', description: 'Deposit, install, service, maintenance-plan, and emergency invoices with payment tracking.' },
    },
  },

  /* Holding-company operations — capital, notes, distributions, consolidated
     view. Checks stay (distributions are paid by check); construction WIP
     controls and the construction concierge are hidden. */
  'houston-enterprise-holdings': {
    modules: [
      'overview', 'ledger', 'checks', 'income', 'expenses', 'projects',
      'vendors', 'invoices', 'charts', 'changelog', 'documents',
      'controls', 'reports',
    ],
    overview: 'holdings',
    labels: {
      overview: 'Holdings HQ',
      projects: 'Assets & Deals',
      income: 'Inflows',
      expenses: 'Corporate Expenses',
      controls: 'Controls',
    },
    descriptions: {
      overview: 'Portfolio, capital & consolidated view',
      projects: 'Investments & development deals',
      income: 'Interest, fees & distributions in',
      expenses: 'Overhead & corporate costs',
      controls: 'Aging, bank matching & roles',
      reports: 'Statements & board packets',
    },
    terms: { project: 'Asset', projects: 'Assets & Deals', vendor: 'Counterparty', vendors: 'Counterparties' },
    /* 'Interest Income'/'Interest Expense' match the categories written by
       the note-payment sync trigger (20260716000016) — keep stable. */
    incomeCategories: [
      'Management Fee', 'Interest Income', 'Intercompany Repayment',
      'Capital Contribution Received', 'Distribution Received',
      'Asset Sale Proceeds', 'Tax Refund', 'Entity Transfer In', 'Other Income',
    ],
    expenseCategories: [
      'Corporate Overhead', 'Debt Service', 'Interest Expense',
      'Owner Distribution', 'Tax Reserve Transfer', 'Legal & Accounting',
      'Insurance', 'Intercompany Funding', 'Asset Purchase',
      'Entity Transfer Out', 'Other',
    ],
    documentTags: [
      'Loan Agreement', 'Promissory Note', 'Amortization Schedule',
      'Board Resolution', 'Operating Agreement', 'Capital Record',
      'Distribution Approval', 'Tax Document', 'Insurance Policy',
      'Formation Document', 'Bank Statement', 'Owner Report',
    ],
    projectsHeader: {
      title: 'Assets & Deals',
      description: 'Investments, development deals, and strategic initiatives across the holding portfolio.',
    },
    controlsHeader: {
      title: 'Portfolio Controls',
      description: 'AR/AP aging, bank feed matching, and role controls across the Holdings portfolio.',
    },
    screenHeaders: {
      vendors: { title: 'Counterparties', description: 'Lenders, attorneys, CPAs, insurers, and corporate service providers with disbursement history.' },
      checks: { title: 'Disbursements', description: 'Distributions, debt service, and corporate payments — issuance and clearance state.' },
      invoices: { title: 'Fee & Chargeback Billing', description: 'Management fees, intercompany invoices, and entity chargebacks with payment tracking.' },
    },
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
  '/command': 'command',
  '/estimates': 'estimates',
  '/people': 'people',
  '/equipment': 'equipment',
  '/ledger': 'ledger',
  '/checks': 'checks',
  '/income': 'income',
  '/expenses': 'expenses',
  '/projects': 'projects',
  '/clients': 'clients',
  '/vendors': 'vendors',
  '/invoices': 'invoices',
  '/charts': 'charts',
  '/finance/controls': 'controls',
  '/changelog': 'changelog',
  '/concierge': 'concierge',
  '/documents': 'documents',
  '/storm': 'storm',
  '/inventory': 'inventory',
  '/reports': 'reports',
  '/beta/procurement': 'procurement',
};

export function moduleLabel(entityId: string | null | undefined, module: FinanceModuleKey, fallback: string): string {
  return financeProfileFor(entityId).labels[module] ?? fallback;
}

export function moduleDescription(entityId: string | null | undefined, module: FinanceModuleKey, fallback: string): string {
  return financeProfileFor(entityId).descriptions[module] ?? fallback;
}

export function screenHeaderFor(
  entityId: string | null | undefined,
  screen: 'vendors' | 'checks' | 'invoices',
  fallback: { title: string; description: string },
): { title: string; description: string } {
  return financeProfileFor(entityId).screenHeaders[screen] ?? fallback;
}
