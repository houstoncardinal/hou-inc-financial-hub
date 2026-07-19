import { useMemo, useState } from 'react';
import AppShell from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { generateGlossaryPDF, savePDF } from '@/lib/reports';
import { Search, BookMarked, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { todayLocalDate } from '@/lib/format';

type Category =
  | 'Foundation'
  | 'Capital Movement'
  | 'Instruments'
  | 'Projects'
  | 'Transactions'
  | 'Invoicing'
  | 'Counterparties'
  | 'Analytics'
  | 'Workflows';

interface Term {
  term: string;
  category: Category;
  definition: string;
  alias?: string;
}

const TERMS: Term[] = [
  // Foundation
  {
    term: 'Financial Operating System',
    category: 'Foundation',
    alias: 'Financial OS',
    definition:
      'The conceptual framing of HOU INC — a unified command center for capital movement, project exposure, instrument issuance, and reporting. Not just a ledger; an end-to-end operating layer for financial activity.',
  },
  {
    term: 'Command Center',
    category: 'Foundation',
    definition:
      'The Overview (dashboard) page. Surfaces four live metrics — Total Balance, Inflow MTD, Outflow MTD, and Pending Checks — alongside cash flow charts, a recent activity feed, and quick-action tiles.',
  },
  {
    term: 'Capital Movement',
    category: 'Foundation',
    definition:
      'The combined flow of money into and out of the organization across all channels: income, expenses, and check disbursements. The primary unit of activity tracked by the OS.',
  },
  {
    term: 'Ledger',
    category: 'Foundation',
    definition:
      'The unified, chronological record of every capital movement event — income, expenses, and checks — in a single scrollable view. Supports filtering by project, transaction type, and free-text search.',
  },
  {
    term: 'Net Position',
    category: 'Foundation',
    definition:
      'The real-time financial standing calculated as total Inflow minus total Outflow. Available at the global level and scoped to any individual project.',
  },

  // Capital Movement
  {
    term: 'Inflow',
    category: 'Capital Movement',
    definition:
      'Money entering the organization — income transactions (client payments, retainers, milestones, etc.). Displayed in green across the OS. Contributes positively to Net Position.',
  },
  {
    term: 'Outflow',
    category: 'Capital Movement',
    definition:
      'Money leaving the organization — expense transactions plus cleared checks. Displayed in the accent color across the OS. Reduces Net Position.',
  },
  {
    term: 'MTD',
    category: 'Capital Movement',
    alias: 'Month-to-Date',
    definition:
      'Aggregate of all inflow or outflow recorded from the first day of the current calendar month through today. Shown on the Overview dashboard cards.',
  },
  {
    term: 'Total Balance',
    category: 'Capital Movement',
    definition:
      'The cumulative net position across all time — total inflow received minus total outflow disbursed. The primary financial health indicator on the dashboard.',
  },
  {
    term: 'Budget Utilization',
    category: 'Capital Movement',
    definition:
      'The percentage of a project\'s allocated budget that has been spent, calculated as (spent ÷ budget) × 100. Capped at 100% and rendered as a progress bar on project cards.',
  },
  {
    term: 'Budget Exposure',
    category: 'Capital Movement',
    alias: 'Total Exposure',
    definition:
      'The sum of all budgets across active projects. Represents the maximum potential capital commitment the organization has formally sanctioned.',
  },
  {
    term: 'Outstanding Obligations',
    category: 'Capital Movement',
    definition:
      'The total dollar value of pending checks tied to a project. Capital that is committed and awaiting processing — reducing available liquidity but not yet counted as cleared outflow.',
  },
  {
    term: 'Pending Aging',
    category: 'Capital Movement',
    definition:
      'A breakdown of pending checks grouped by how long they have been uncleared: 0–7 days, 8–14 days, 15–30 days, and 30+ days. Used to surface stale or at-risk instruments.',
  },

  // Instruments
  {
    term: 'Instrument',
    category: 'Instruments',
    definition:
      'A formal financial disbursement document — specifically a check — issued through the OS. Instruments carry a lifecycle: pending → cleared or voided.',
  },
  {
    term: 'Check',
    category: 'Instruments',
    definition:
      'A numbered disbursement instrument issued to a payee for a defined amount on a specific date. Checks are drafted, previewed, and issued from the Checks registry. Each check can be assigned to a project and linked to a vendor.',
  },
  {
    term: 'Check Number',
    category: 'Instruments',
    definition:
      'A unique sequential identifier for each check, auto-incremented from the last check in the database. Can be manually overridden during issuance.',
  },
  {
    term: 'Payee',
    category: 'Instruments',
    definition:
      'The named recipient of a check. Can be typed freely or selected from the Vendor registry. Matching a payee to a vendor enables spend tracking.',
  },
  {
    term: 'Issue Date',
    category: 'Instruments',
    definition:
      'The date a check is formally created and entered into the system. This date drives aging calculations and ledger chronology.',
  },
  {
    term: 'Memo',
    category: 'Instruments',
    definition:
      'A short free-text note on a check describing the purpose of the payment. Appears on the digital check preview and in exports.',
  },
  {
    term: 'Pending',
    category: 'Instruments',
    definition:
      'A check status indicating the instrument has been issued but not yet processed by the bank. Pending checks are tracked as outstanding obligations and excluded from outflow calculations.',
  },
  {
    term: 'Cleared',
    category: 'Instruments',
    definition:
      'A check status indicating the instrument has been processed and funds have left the account. Cleared checks count as outflow in the ledger and reduce Net Position.',
  },
  {
    term: 'Voided',
    category: 'Instruments',
    definition:
      'A check status indicating the instrument has been invalidated and will never be processed. Voided checks are retained in the registry for audit purposes but have no financial impact.',
  },
  {
    term: 'Digital Check Preview',
    category: 'Instruments',
    definition:
      'A rendered visual representation of a check — formatted to resemble a physical bank check — shown in real time during check creation and in the Checks registry.',
  },

  // Projects
  {
    term: 'Project',
    category: 'Projects',
    alias: 'Capital Container',
    definition:
      'A named financial container used to group and track all capital movement related to a specific initiative. Projects have a budget, a status, a short code, and aggregate all linked income, expenses, and checks.',
  },
  {
    term: 'Capital Container',
    category: 'Projects',
    definition:
      'An alternate term for a Project — emphasizing its role as a bounded financial scope rather than a task-management construct. All transactions can be tagged to a capital container.',
  },
  {
    term: 'Project Code',
    category: 'Projects',
    definition:
      'A short alphanumeric identifier for a project (e.g., PROJ-01). Used as a compact label in tables, exports, and reports.',
  },
  {
    term: 'Project Status',
    category: 'Projects',
    definition:
      'The current lifecycle state of a project. Options: Active (ongoing work), On Hold (paused), Completed (finished), Archived (closed for reporting).',
  },
  {
    term: 'Project Budget',
    category: 'Projects',
    definition:
      'The total approved capital allocation for a project. Serves as the denominator for Budget Utilization and the upper bound for planned spending.',
  },
  {
    term: 'Project Net Position',
    category: 'Projects',
    definition:
      'A project-scoped financial balance: incoming funds received minus total spending (expenses + cleared checks). Indicates whether a project is running profitable or at a deficit.',
  },

  // Transactions
  {
    term: 'Transaction',
    category: 'Transactions',
    definition:
      'Any recorded financial event that is not a check. Transactions are of two types: income (money in) or expense (money out). Every transaction carries a date, amount, category, and optional project and vendor tags.',
  },
  {
    term: 'Income',
    category: 'Transactions',
    definition:
      'A transaction representing money received by the organization. Recorded with a source name, category (e.g., Client Payment, Retainer), and optional project tag.',
  },
  {
    term: 'Expense',
    category: 'Transactions',
    definition:
      'A transaction representing money paid out by the organization (not via check). Recorded with a vendor, category, payment method, and optional receipt upload.',
  },
  {
    term: 'Category',
    category: 'Transactions',
    definition:
      'A classification tag applied to a transaction. Income categories include Client Payment, Retainer, Project Milestone, Consulting Fee, and others. Expense categories include Materials & Supplies, Labor & Subcontractors, Insurance, and more. Used to drive the expense and income pie charts in Analytics.',
  },
  {
    term: 'Payment Method',
    category: 'Transactions',
    definition:
      'The mechanism used to settle an expense. Options: Check, Credit Card, Bank Transfer, NET30, Cash, Wire, Other.',
  },
  {
    term: 'NET30',
    category: 'Transactions',
    definition:
      'A payment method indicating the invoice or obligation is due within 30 days of the transaction date. Common in vendor and subcontractor agreements.',
  },
  {
    term: 'Receipt',
    category: 'Transactions',
    definition:
      'An image or PDF attached to an expense transaction as proof of purchase. Can be uploaded via file picker or camera during expense logging (including via the Concierge flow).',
  },
  {
    term: 'Source Name',
    category: 'Transactions',
    definition:
      'The entity or context from which income was received (e.g., a client name, a fund, a platform). Used as a label in the Income registry and drives the Income Sources chart in Analytics.',
  },

  // Invoicing
  {
    term: 'Invoice',
    category: 'Invoicing',
    definition:
      'A formal billing document issued to a client itemizing services rendered, quantities, rates, applicable taxes, and payment terms. Invoices progress through a status workflow: Draft → Sent → Paid (or Overdue).',
  },
  {
    term: 'Invoice Number',
    category: 'Invoicing',
    definition:
      'A unique sequential identifier for each invoice, auto-incremented from the last invoice in the system. Can be manually edited before saving.',
  },
  {
    term: 'Line Item',
    category: 'Invoicing',
    definition:
      'A single row on an invoice representing one deliverable or service. Composed of a description, quantity, and unit rate. The system calculates the line total automatically.',
  },
  {
    term: 'Subtotal',
    category: 'Invoicing',
    definition:
      'The sum of all line item totals before tax is applied. Displayed as an intermediate calculation on the invoice builder and rendered PDF.',
  },
  {
    term: 'Tax Rate',
    category: 'Invoicing',
    definition:
      'A percentage applied to the invoice subtotal to calculate the tax amount. The final invoice total equals subtotal + tax.',
  },
  {
    term: 'Due Date',
    category: 'Invoicing',
    definition:
      'The date by which full payment is expected from the client. Invoices past their due date without a "Paid" status automatically become Overdue.',
  },
  {
    term: 'Payment Terms',
    category: 'Invoicing',
    definition:
      'Free-text field specifying the contractual conditions for payment (e.g., "Net 30", "50% upfront", "Due on receipt"). Printed on the exported invoice PDF.',
  },
  {
    term: 'Invoice Status',
    category: 'Invoicing',
    definition:
      'The current stage of an invoice. Draft: created but not sent. Sent: delivered to the client. Paid: payment confirmed. Overdue: past due date without payment.',
  },
  {
    term: 'Stripe Payment Link',
    category: 'Invoicing',
    definition:
      'A unique URL generated via the Stripe integration that allows a client to pay an invoice online. Can be created and attached to any invoice directly from the invoice builder.',
  },
  {
    term: 'Outstanding (Invoices)',
    category: 'Invoicing',
    definition:
      'The total value of all invoices that have been sent but not yet paid. One of the four summary metrics at the top of the Invoices registry.',
  },

  // Counterparties
  {
    term: 'Vendor',
    category: 'Counterparties',
    definition:
      'An external party to whom payments are made — a supplier, contractor, or service provider. Each vendor entry stores contact information and accumulates a running total of all payments disbursed across transactions and checks.',
  },
  {
    term: 'Vendor Registry',
    category: 'Counterparties',
    definition:
      'The Vendors page: a structured directory of all known payees. Displays each vendor\'s legal name, contact info, total amount paid, and transaction count. Exportable to CSV.',
  },
  {
    term: 'Client',
    category: 'Counterparties',
    definition:
      'The entity billed via the Invoices module. Client details (name, email, company, address) are stored per invoice and appear on the exported invoice PDF.',
  },
  {
    term: 'Counterparty',
    category: 'Counterparties',
    definition:
      'Any external entity involved in a financial transaction — either as a payer (client / income source) or a payee (vendor). The OS tracks both sides of the relationship.',
  },
  {
    term: 'Total Disbursed',
    category: 'Counterparties',
    definition:
      'The cumulative amount paid to a vendor across all recorded expenses and cleared checks. Calculated dynamically and displayed on vendor cards and in vendor reports.',
  },

  // Analytics
  {
    term: 'Cash Flow Trend',
    category: 'Analytics',
    definition:
      'A six-month area chart showing monthly inflow and outflow side by side. Available on both the Overview dashboard and the Charts analytics page.',
  },
  {
    term: 'Cumulative Net Position',
    category: 'Analytics',
    definition:
      'A running-total chart showing how Net Position has evolved over time — the accumulation of all monthly net changes from the earliest recorded transaction.',
  },
  {
    term: 'Expense Breakdown',
    category: 'Analytics',
    definition:
      'A pie chart in Analytics showing the distribution of expenses across the top expense categories, revealing where the most capital is being deployed.',
  },
  {
    term: 'Income Sources',
    category: 'Analytics',
    definition:
      'A pie chart in Analytics showing the distribution of income by source name — useful for identifying revenue concentration risk.',
  },
  {
    term: 'Top Vendors by Spend',
    category: 'Analytics',
    definition:
      'A horizontal bar chart ranking the highest-paid vendors. Surfaces where vendor expenditure is concentrated.',
  },
  {
    term: 'Check Insights',
    category: 'Analytics',
    definition:
      'The analytics section dedicated to check activity: a donut chart of checks by status (pending/cleared/voided) and a monthly line chart of check issuance volume.',
  },
  {
    term: 'Time Period Filter',
    category: 'Analytics',
    definition:
      'A control on the Charts page that scopes all visualizations to a selected window: All Time, This Month, Last Quarter, or a custom date range.',
  },
  {
    term: 'PDF Export',
    category: 'Analytics',
    definition:
      'A branded report generated in PDF format from the current view — available on Checks, Ledger, Projects, Project Detail, and Invoices pages.',
  },
  {
    term: 'Excel Export',
    category: 'Analytics',
    definition:
      'A spreadsheet file generated in XLSX format containing all records for the current view. Available on Checks, Ledger, Projects, and Invoices pages.',
  },
  {
    term: 'CSV Export',
    category: 'Analytics',
    definition:
      'A comma-separated values file export. Available in the Vendors registry and Project Detail pages for use in external tools.',
  },

  // Workflows
  {
    term: 'Concierge',
    category: 'Workflows',
    definition:
      'An AI-assisted guided workflow interface that walks users through common financial tasks step by step — Log Income, Record Expense, Create Check, Add Vendor, Create Project — using a Q&A format instead of a traditional form.',
  },
  {
    term: 'Guided Flow',
    category: 'Workflows',
    definition:
      'A Concierge service session: a structured series of prompts and inputs that leads the user through one complete financial action, with a review-and-confirm summary before saving.',
  },
  {
    term: 'Quick Action',
    category: 'Workflows',
    definition:
      'A shortcut tile on the Overview dashboard that launches a common task immediately — Log Income, Record Expense, New Check, or Concierge — without navigating away.',
  },
  {
    term: 'Quick Create',
    category: 'Workflows',
    definition:
      'An inline capability that allows users to create a new vendor or project from within a form (e.g., during expense entry or check issuance) without leaving the current screen.',
  },
  {
    term: 'Stripe Integration',
    category: 'Workflows',
    definition:
      'A configured connection to Stripe that enables generation of payment links directly from the Invoice builder. Clients can pay invoices via the generated URL.',
  },
  {
    term: 'QuickBooks Export',
    category: 'Workflows',
    definition:
      'An integration path in Settings that packages financial data for import into QuickBooks Online — enabling synchronization with an external accounting workflow.',
  },
  {
    term: 'Square Export',
    category: 'Workflows',
    definition:
      'An integration path in Settings that packages transaction data for import into Square — enabling synchronization with Square\'s point-of-sale and accounting tooling.',
  },
  {
    term: 'JSON Export',
    category: 'Workflows',
    definition:
      'A raw data export available on individual invoices (Invoice Builder → Export → JSON) that serializes invoice data as structured JSON — for consumption by custom systems, external APIs, or developer workflows.',
  },
];

const CATEGORIES: Category[] = [
  'Foundation',
  'Capital Movement',
  'Instruments',
  'Projects',
  'Transactions',
  'Invoicing',
  'Counterparties',
  'Analytics',
  'Workflows',
];

const CATEGORY_COLOR: Record<Category, string> = {
  Foundation: 'bg-foreground/10 text-foreground',
  'Capital Movement': 'bg-[hsl(var(--positive)/0.12)] text-[hsl(var(--positive))]',
  Instruments: 'bg-[hsl(var(--accent)/0.12)] text-accent',
  Projects: 'bg-[hsl(var(--warning)/0.12)] text-[hsl(var(--warning))]',
  Transactions: 'bg-foreground/8 text-muted-foreground',
  Invoicing: 'bg-[hsl(var(--positive)/0.08)] text-[hsl(var(--positive))]',
  Counterparties: 'bg-foreground/8 text-muted-foreground',
  Analytics: 'bg-[hsl(var(--accent)/0.08)] text-accent',
  Workflows: 'bg-[hsl(var(--warning)/0.08)] text-[hsl(var(--warning))]',
};

export default function Glossary() {
  const [q, setQ] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category | 'All'>('All');

  const filtered = useMemo(() => {
    const lower = q.toLowerCase();
    return TERMS.filter((t) => {
      const matchesSearch =
        !q ||
        t.term.toLowerCase().includes(lower) ||
        t.definition.toLowerCase().includes(lower) ||
        (t.alias?.toLowerCase().includes(lower) ?? false);
      const matchesCategory =
        activeCategory === 'All' || t.category === activeCategory;
      return matchesSearch && matchesCategory;
    }).sort((a, b) => a.term.localeCompare(b.term));
  }, [q, activeCategory]);

  const handleDownload = () => {
    const doc = generateGlossaryPDF(TERMS);
    savePDF(doc, `hou-inc-glossary-${todayLocalDate()}.pdf`);
    toast.success('Glossary exported as PDF');
  };

  const grouped = useMemo(() => {
    const map: Record<string, Term[]> = {};
    for (const t of filtered) {
      const letter = t.term[0].toUpperCase();
      if (!map[letter]) map[letter] = [];
      map[letter].push(t);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-5 py-8 md:py-10">

        {/* ── Header ── */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 w-5 h-5 flex items-center justify-center shrink-0">
                <BookMarked className="w-4 h-4 text-accent" strokeWidth={1.5} />
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-1 font-semibold">
                  HOU INC · Financial OS
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Glossary</h1>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  Definitions for every term, concept, and workflow inside the Financial Operating System.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="shrink-0 gap-1.5 h-8 text-xs rounded-none mt-1"
            >
              <FileText className="w-3.5 h-3.5" strokeWidth={1.5} />
              PDF
            </Button>
          </div>

          {/* Stats bar */}
          <div className="flex items-center gap-5 pl-8 mt-4">
            <div>
              <div className="font-mono-tab text-lg font-bold">{TERMS.length}</div>
              <div className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground">Total Terms</div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div>
              <div className="font-mono-tab text-lg font-bold">{CATEGORIES.length}</div>
              <div className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground">Categories</div>
            </div>
            {q || activeCategory !== 'All' ? (
              <>
                <div className="w-px h-8 bg-border" />
                <div>
                  <div className="font-mono-tab text-lg font-bold">{filtered.length}</div>
                  <div className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground">Matching</div>
                </div>
              </>
            ) : null}
          </div>
        </div>

        {/* ── Search ── */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search terms or definitions…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-8 h-9 text-sm rounded-none bg-secondary/40 border-border"
          />
        </div>

        {/* ── Category Filter ── */}
        <div className="flex flex-wrap gap-1.5 mb-8">
          {(['All', ...CATEGORIES] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] font-semibold transition-all rounded-sm border ${
                activeCategory === cat
                  ? 'bg-foreground text-background border-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ── Entries ── */}
        {grouped.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-muted-foreground text-sm">No terms found for "{q}"</div>
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map(([letter, terms]) => (
              <div key={letter}>
                {/* Alphabet divider */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="font-mono-tab text-2xl font-bold text-foreground/20 leading-none select-none w-6">
                    {letter}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <div className="space-y-0 border border-border divide-y divide-border">
                  {terms.map((t) => (
                    <div key={t.term} className="group px-5 py-4 hover:bg-secondary/30 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline flex-wrap gap-x-2 gap-y-1 mb-1.5">
                            <span className="text-sm font-semibold text-foreground">{t.term}</span>
                            {t.alias && (
                              <span className="text-[10px] text-muted-foreground italic">
                                also: {t.alias}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">{t.definition}</p>
                        </div>
                        <span
                          className={`shrink-0 mt-0.5 px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] font-bold rounded-sm ${CATEGORY_COLOR[t.category]}`}
                        >
                          {t.category}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Footer ── */}
        <div className="mt-12 pt-6 border-t border-border flex items-center justify-between">
          <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground/50 font-semibold">
            HOU INC · Financial OS · Glossary
          </div>
          <div className="text-[9px] font-mono-tab text-muted-foreground/40">
            v1 · {TERMS.length} terms
          </div>
        </div>
      </div>
    </AppShell>
  );
}
