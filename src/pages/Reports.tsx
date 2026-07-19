/* ── Entity-aware Reports tab ──────────────────────────────────────────────
   A single report catalog shell that composes real, already-fetched data
   into the PDF/XLSX/CSV generators in `@/lib/reports.ts`. Every card with an
   active export button is backed by real database-fetched data — no mock
   rows anywhere. Cards for report ideas not yet wired show a plain
   "Coming Soon" badge and are not clickable, per the same honesty rule as
   the rest of this pass. ── */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useEntity } from '@/contexts/EntityContext';
import { useAuth, useRole } from '@/hooks/useAuth';
import { financeProfileFor } from '@/lib/entityFinance';
import { supabase } from '@/integrations/supabase/client';
import { fmtUSD, fmtDate, todayLocalDate } from '@/lib/format';
import { toast } from 'sonner';
import {
  useTransactions, useChecks, useProjects, useVendors,
  useFinanceAgingSummary, useFinanceCostCodes, useFixedAssets, useAccountingPeriods,
  useFinanceControlSummary,
} from '@/hooks/useFinance';
import { useInvoices, invoiceTotal, invoiceSubtotal, invoiceTax } from '@/hooks/useInvoices';
import { useDocuments } from '@/hooks/useDocuments';
import {
  useHgpJobs, useEquipmentUnits, useHgpParts, usePurchaseOrders, useCustomerSites,
  useServiceAgreements, useServiceVisits, useOutageImpacts, useHgpJobPayments,
  useHoldingsNotes, useCapitalActivity, useHoldingsCovenants, useHoldingsBalanceSheet,
  useConsolidatedEntityTotals,
} from '@/hooks/useEntityOps';
import * as R from '@/lib/reports';
import {
  Search, FileText, Table2, Download, Lock, X, ChevronRight, ChevronDown,
  TrendingUp, Landmark, Users, Package, Wrench, AlertTriangle,
  History, Filter, ClipboardList, Building2,
} from 'lucide-react';

const REPORTS_CSS = `
.rp-shell{background:linear-gradient(180deg,hsl(var(--secondary)/0.2),transparent 180px);}
.rp-card{border:1px solid hsl(var(--border));background:hsl(var(--background));padding:14px;display:flex;flex-direction:column;gap:8px;min-width:0;transition:border-color .16s,box-shadow .16s;}
.rp-card:not(.rp-soon):hover{border-color:hsl(var(--foreground)/.22);box-shadow:0 6px 18px rgba(10,10,10,.06);}
.rp-soon{opacity:.55;}
.rp-cat{font-size:7.5px;text-transform:uppercase;letter-spacing:.14em;font-weight:900;color:hsl(var(--muted-foreground));}
.rp-title{font-size:13px;font-weight:800;line-height:1.25;}
.rp-desc{font-size:11px;color:hsl(var(--muted-foreground));line-height:1.4;}
.rp-fmt{font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:.1em;border:1px solid hsl(var(--border));padding:2px 6px;display:inline-flex;align-items:center;gap:3px;}
.rp-fmt:hover{background:hsl(var(--secondary)/.6);}
.rp-chip{height:28px;padding:0 10px;font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;border:1px solid hsl(var(--border));background:hsl(var(--background));white-space:nowrap;}
.rp-chip[data-on="true"]{background:hsl(var(--foreground));color:hsl(var(--background));}
.dark .rp-card{background:hsl(var(--card));}
@media(max-width:767px){.rp-title{font-size:12.5px}}
`;

type Fmt = 'pdf' | 'xlsx' | 'csv';
type Category = 'Executive' | 'Financial' | 'Projects / Jobs' | 'Vendors / Suppliers' | 'Documents' | 'Reconciliation' | 'Compliance' | 'Operations' | 'Tax / Close';
const CATEGORIES: Category[] = ['Executive', 'Financial', 'Projects / Jobs', 'Vendors / Suppliers', 'Documents', 'Reconciliation', 'Compliance', 'Operations', 'Tax / Close'];

interface ReportItem {
  id: string;
  title: string;
  description: string;
  category: Category;
  formats: Fmt[];
  ready: boolean;
  run?: (fmt: Fmt) => void;
  custom?: React.ReactNode; // inline control (e.g. project picker) rendered above the format row
}

const stamp = () => todayLocalDate();
const dl = (fn: () => void, label: string) => { try { fn(); toast.success(`${label} exported`); } catch (e: any) { toast.error(e?.message || 'Export failed'); } };

export default function Reports() {
  const { entity } = useEntity();
  const { user } = useAuth();
  const role = useRole();
  const entityId = entity?.id ?? 'houston-enterprise';
  const profile = financeProfileFor(entityId);
  const entityLabel = entity?.name ?? 'Houston Enterprise';

  const [q, setQ] = useState('');
  const [cat, setCat] = useState<'all' | Category>('all');
  const [catOpen, setCatOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [payAppProjectId, setPayAppProjectId] = useState('');
  const [reconProjectId, setReconProjectId] = useState('');

  /* ── Shared data (entity-scoped via useEntity() context inside each hook) ── */
  const { data: income = [] } = useTransactions('income');
  const { data: expenses = [] } = useTransactions('expense');
  const { data: checks = [] } = useChecks();
  const { data: projects = [] } = useProjects();
  const { data: vendors = [] } = useVendors();
  const { data: aging = [] } = useFinanceAgingSummary();
  const { data: controlSummary = [] } = useFinanceControlSummary();
  const { data: costCodes = [] } = useFinanceCostCodes();
  const { data: fixedAssets = [] } = useFixedAssets();
  const { data: accountingPeriods = [] } = useAccountingPeriods();
  const { invoices } = useInvoices();
  const { data: documents = [] } = useDocuments();

  /* ── HGP data (harmless empty arrays when entity ≠ HGP) ── */
  const { data: hgpJobs = [] } = useHgpJobs();
  const { data: equipmentUnits = [] } = useEquipmentUnits();
  const { data: hgpParts = [] } = useHgpParts();
  const { data: purchaseOrders = [] } = usePurchaseOrders();
  const { data: customerSites = [] } = useCustomerSites();
  const { data: serviceAgreements = [] } = useServiceAgreements();
  const { data: serviceVisits = [] } = useServiceVisits();
  const { data: outageImpacts = [] } = useOutageImpacts();
  const { data: hgpJobPayments = [] } = useHgpJobPayments();

  /* ── Holdings data (harmless empty arrays when entity ≠ Holdings) ── */
  const { data: holdingsNotes = [] } = useHoldingsNotes();
  const { data: capitalActivity = [] } = useCapitalActivity();
  const { data: covenants = [] } = useHoldingsCovenants();
  const { data: balanceSheet } = useHoldingsBalanceSheet();
  const { data: consolidatedTotals } = useConsolidatedEntityTotals();

  /* ── Role access (entity-scoped) ── */
  const { data: roles = [] } = useQuery({
    queryKey: ['app-user-roles-reports', entityId],
    queryFn: async () => {
      const { data, error } = await supabase.from('app_user_roles' as any).select('*').eq('entity_id', entityId).order('assigned_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  /* ── Audit / activity feed — reconciliation + system health are genuinely
     entity-scoped; admin_changelog only carries a dashboard scope ('finance'),
     not a per-business-entity one, so it's labeled accordingly rather than
     mislabeled as entity-specific. ── */
  const { data: auditEvents = [] } = useQuery({
    queryKey: ['reports-audit-feed', entityId],
    queryFn: async () => {
      const [rec, chg, health] = await Promise.all([
        supabase.from('finance_reconciliation_audit' as any).select('*').eq('entity_id', entityId).order('created_at', { ascending: false }).limit(200),
        supabase.from('admin_changelog' as any).select('*').eq('dashboard', 'finance').order('created_at', { ascending: false }).limit(200),
        supabase.from('system_health_events' as any).select('*').eq('entity_id', entityId).order('created_at', { ascending: false }).limit(200),
      ]);
      const events: R.AuditEventRow[] = [
        ...((rec.data ?? []) as any[]).map(r => ({
          date: r.created_at, source: 'Reconciliation', action: r.action, table_name: r.source_table,
          user_label: r.user_id ? String(r.user_id).slice(0, 8) : '—',
          details: [r.counterparty, r.reference, r.amount != null ? fmtUSD(r.amount) : null].filter(Boolean).join(' · ') || '—',
        })),
        ...((chg.data ?? []) as any[]).map(r => ({
          date: r.created_at, source: 'Admin / Finance Changelog', action: r.action, table_name: r.entity,
          user_label: r.changed_by || '—', details: r.entity_label || '—',
        })),
        ...((health.data ?? []) as any[]).map(r => ({
          date: r.created_at, source: 'System Health', action: r.severity, table_name: r.area,
          user_label: r.user_id ? String(r.user_id).slice(0, 8) : '—', details: r.message,
        })),
      ].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      return events;
    },
  });
  const [auditSource, setAuditSource] = useState('all');
  const [auditSearch, setAuditSearch] = useState('');
  const filteredAudit = useMemo(() => auditEvents.filter(e => {
    if (auditSource !== 'all' && e.source !== auditSource) return false;
    if (auditSearch && !JSON.stringify(e).toLowerCase().includes(auditSearch.toLowerCase())) return false;
    return true;
  }), [auditEvents, auditSource, auditSearch]);
  const auditSources = useMemo(() => Array.from(new Set(auditEvents.map(e => e.source))), [auditEvents]);
  const canSeeAudit = ['admin', 'finance_manager', 'read_only_auditor'].includes(role);

  /* ── Derived data ── */
  const modelProfitability = useMemo(() => {
    const groups: Record<string, { model: string; units: number; revenue: number; costs: number }> = {};
    const num = (v: unknown) => Number(v || 0);
    const jobCosts = (j: any) => num(j.equipment_cost) + num(j.labor_cost) + num(j.materials_cost) + num(j.subcontractor_cost) + num(j.permit_cost);
    for (const j of hgpJobs as any[]) {
      if (!['commissioned', 'maintenance_enrolled', 'completed'].includes(j.stage)) continue;
      if (!j.generator_model || num(j.quoted_amount) <= 0) continue;
      const g = groups[j.generator_model] ?? (groups[j.generator_model] = { model: j.generator_model, units: 0, revenue: 0, costs: 0 });
      g.units += 1; g.revenue += num(j.quoted_amount); g.costs += jobCosts(j);
    }
    return Object.values(groups).map(g => ({ ...g, margin: g.revenue - g.costs, marginPct: g.revenue > 0 ? ((g.revenue - g.costs) / g.revenue) * 100 : 0 })).sort((a, b) => b.margin - a.margin);
  }, [hgpJobs]);

  const enrichedProjects = useMemo(() => {
    const byId: Record<string, any> = {};
    for (const row of controlSummary as any[]) byId[row.project_id] = row;
    return (projects as any[]).map(p => {
      const c = byId[p.id];
      return {
        ...p,
        current_contract_value: c ? Number(c.revised_contract_value) : Number(p.budget) || 0,
        spent: c ? Number(c.actual_cost) : 0,
        incoming: c ? Number(c.earned_revenue) : 0,
        outstanding_checks: c ? Number(c.ar_open) : 0,
        used: c ? Number(c.percent_complete_cost) : 0,
      };
    });
  }, [projects, controlSummary]);

  const hgpJobInvoices = useMemo(() => (invoices as any[]).filter(inv => inv.hgp_job_id), [invoices]);

  const holdingsPending = useMemo(() => (capitalActivity as any[]).filter(a => a.approval_status === 'pending'), [capitalActivity]);
  const entityPerformanceRows = useMemo(() => {
    if (!consolidatedTotals) return [];
    return Object.entries(consolidatedTotals as Record<string, { income: number; expense: number; clearedChecks: number }>).map(([id, t]) => ({
      entity_id: id, entity_name: id.replace(/-/g, ' '),
      revenue: t.income, expenses: t.expense + t.clearedChecks, net_income: t.income - t.expense - t.clearedChecks,
    }));
  }, [consolidatedTotals]);

  const selectedProject = (projects as any[]).find(p => p.id === payAppProjectId);
  const selectedControl = (controlSummary as any[]).find(c => c.project_id === payAppProjectId);
  const reconProject = (projects as any[]).find(p => p.id === reconProjectId);

  /* ── Catalog ── */
  const catalog: ReportItem[] = useMemo(() => {
    const items: ReportItem[] = [];

    /* Executive */
    if (entityId === 'houston-enterprise') {
      items.push({
        id: 'he-exec', title: 'Construction Executive Summary', category: 'Executive', formats: ['pdf'], ready: true,
        description: 'Revenue, margin, WIP, and AR/AP posture across the active portfolio.',
        run: () => dl(() => {
          const totalRevised = (controlSummary as any[]).reduce((s, r) => s + Number(r.revised_contract_value || 0), 0);
          const totalEarned = (controlSummary as any[]).reduce((s, r) => s + Number(r.earned_revenue || 0), 0);
          const totalCost = (controlSummary as any[]).reduce((s, r) => s + Number(r.actual_cost || 0), 0);
          const doc = R.generateExecutiveSummaryReport({
            entityLabel, reportTitle: 'Construction Executive Summary',
            metrics: [
              { label: 'Revised Contract Value', value: fmtUSD(totalRevised) },
              { label: 'Earned Revenue', value: fmtUSD(totalEarned) },
              { label: 'Gross Margin', value: fmtUSD(totalEarned - totalCost), color: totalEarned - totalCost >= 0 ? R.C.positive : R.C.negative },
              { label: 'Active Projects', value: String(controlSummary.length) },
            ],
            sections: [{
              label: 'Portfolio Position', rows: [
                { label: 'Pending Change Order Exposure', value: fmtUSD((controlSummary as any[]).reduce((s, r) => s + Number(r.pending_change_orders || 0), 0)) },
                { label: 'AR Open', value: fmtUSD((controlSummary as any[]).reduce((s, r) => s + Number(r.ar_open || 0), 0)) },
                { label: 'Committed Cost', value: fmtUSD((controlSummary as any[]).reduce((s, r) => s + Number(r.committed_cost || 0), 0)) },
              ],
            }],
          });
          R.savePDF(doc, `hou-he-executive-summary-${stamp()}.pdf`);
        }, 'Executive summary'),
      });
    }
    if (entityId === 'houston-generator-pros') {
      items.push({
        id: 'hgp-exec', title: 'HGP Executive Operations Summary', category: 'Executive', formats: ['pdf'], ready: true,
        description: 'Install pipeline, service revenue, inventory position, and open balances in one page.',
        run: () => dl(() => {
          const active = (hgpJobs as any[]).filter(j => !['completed', 'lost'].includes(j.stage));
          const revenue = (income as any[]).reduce((s, t) => s + Number(t.amount || 0), 0);
          const doc = R.generateExecutiveSummaryReport({
            entityLabel, reportTitle: 'HGP Executive Operations Summary',
            metrics: [
              { label: 'Open Jobs', value: String(active.length) },
              { label: 'Total Income (Live)', value: fmtUSD(revenue), color: R.C.positive },
              { label: 'Inventory SKUs', value: String((hgpParts as any[]).length) },
              { label: 'Equipment On Hand', value: String((equipmentUnits as any[]).filter(u => u.status === 'in_stock').length) },
            ],
            sections: [{
              label: 'Pipeline & Balances', rows: [
                { label: 'Emergency Jobs Open', value: String(active.filter(j => j.emergency).length) },
                { label: 'Deposits Held', value: fmtUSD(active.reduce((s, j) => s + (Number(j.deposit_amount) || 0), 0)) },
                { label: 'Service Agreements Active', value: String((serviceAgreements as any[]).filter(a => a.status === 'active').length) },
              ],
            }],
          });
          R.savePDF(doc, `hou-hgp-executive-summary-${stamp()}.pdf`);
        }, 'Executive summary'),
      });
    }
    if (entityId === 'houston-enterprise-holdings') {
      items.push({
        id: 'heh-exec', title: 'Holdings Executive Summary', category: 'Executive', formats: ['pdf'], ready: !!balanceSheet,
        description: 'Assets, liabilities, equity, and consolidated entity performance at a glance.',
        run: balanceSheet ? () => dl(() => {
          const doc = R.generateExecutiveSummaryReport({
            entityLabel, reportTitle: 'Holdings Executive Summary',
            metrics: [
              { label: 'Total Assets', value: fmtUSD(balanceSheet.total_assets) },
              { label: 'Total Liabilities', value: fmtUSD(balanceSheet.total_liabilities) },
              { label: "Owners' Equity", value: fmtUSD(balanceSheet.owners_equity), color: balanceSheet.owners_equity >= 0 ? R.C.positive : R.C.negative },
              { label: 'Active Notes', value: String((holdingsNotes as any[]).filter(n => n.status === 'active').length) },
            ],
            sections: [{
              label: 'Capital Position', rows: [
                { label: 'Cash Position', value: fmtUSD(balanceSheet.cash_position) },
                { label: 'Pending Capital Approvals', value: String(holdingsPending.length) },
                { label: 'Covenants Tracked', value: String((covenants as any[]).length) },
              ],
            }],
          });
          R.savePDF(doc, `hou-holdings-executive-summary-${stamp()}.pdf`);
        }, 'Executive summary') : undefined,
      });
      items.push({
        id: 'heh-board-packet', title: 'Consolidated Board Packet', category: 'Executive', formats: ['pdf'], ready: !!balanceSheet,
        description: 'The single document for a board member or lender — performance, notes, covenants, capital activity, and approvals.',
        run: balanceSheet ? () => dl(() => {
          const doc = R.generateBoardPacketReport({
            periodLabel: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
            balanceSheet, entityPerformance: entityPerformanceRows, notes: holdingsNotes as any[],
            covenants: covenants as any[], capitalActivity: capitalActivity as any[], pendingApprovals: holdingsPending,
            managementNotes: 'Management-basis figures derived from this platform\'s cash/transaction ledger and note balances. Not audited financial statements.',
          });
          R.savePDF(doc, `hou-holdings-board-packet-${stamp()}.pdf`);
        }, 'Board packet') : undefined,
      });
    }

    /* Financial — shared */
    items.push(
      { id: 'ledger', title: 'General Ledger', category: 'Financial', formats: ['pdf', 'xlsx'], ready: true,
        description: 'Every income, expense, and check entry in one unified ledger.',
        run: fmt => dl(() => fmt === 'pdf' ? R.savePDF(R.generateLedgerReport(income, expenses, checks), `hou-ledger-${stamp()}.pdf`) : R.downloadLedgerExcel(income, expenses, checks), 'General ledger') },
      { id: 'income', title: 'Income Report', category: 'Financial', formats: ['pdf', 'xlsx'], ready: true,
        description: 'All recorded income, sorted by date, with source and project detail.',
        run: fmt => dl(() => fmt === 'pdf' ? R.savePDF(R.generateTransactionReport(income, 'income'), `hou-income-${stamp()}.pdf`) : R.downloadTransactionExcel(income, 'income'), 'Income report') },
      { id: 'expense', title: 'Expense Report', category: 'Financial', formats: ['pdf', 'xlsx'], ready: true,
        description: `All recorded expenses by ${profile.terms.vendor.toLowerCase()} and category.`,
        run: fmt => dl(() => fmt === 'pdf' ? R.savePDF(R.generateTransactionReport(expenses, 'expense'), `hou-expenses-${stamp()}.pdf`) : R.downloadTransactionExcel(expenses, 'expense'), 'Expense report') },
      { id: 'checks', title: 'Check Register', category: 'Financial', formats: ['pdf', 'xlsx'], ready: true,
        description: 'Issued, cleared, and voided checks with retainage detail.',
        run: fmt => dl(() => fmt === 'pdf' ? R.savePDF(R.generateCheckRegisterReport(checks), `hou-checks-${stamp()}.pdf`) : R.downloadCheckExcel(checks), 'Check register') },
      { id: 'aging', title: 'Open AR / AP Aging', category: 'Financial', formats: ['pdf', 'xlsx'], ready: true,
        description: 'Receivables and payables aged into current / 1-30 / 31-60 / 61-90 / 90+ buckets.',
        run: fmt => dl(() => fmt === 'pdf' ? R.savePDF(R.generateAgingReport(aging, entityLabel), `hou-aging-${stamp()}.pdf`) : R.downloadAgingExcel(aging, entityLabel), 'Aging report') },
      { id: 'invoices', title: 'Invoice Report', category: 'Financial', formats: ['pdf', 'xlsx'], ready: true,
        description: 'Every invoice with status, terms, and payment-link availability.',
        run: fmt => dl(() => {
          const rows = (invoices as any[]).map(inv => ({ invoice_number: inv.invoice_number, client_name: inv.client_name, client_company: inv.client_company, issue_date: inv.issue_date, due_date: inv.due_date, status: inv.status, subtotal: invoiceSubtotal(inv), tax: invoiceTax(inv), total: invoiceTotal(inv) }));
          if (fmt === 'pdf') R.savePDF(R.generateInvoicesReport(rows), `hou-invoices-${stamp()}.pdf`);
          else R.downloadInvoiceExcel(rows);
        }, 'Invoice report') },
    );

    /* Financial — HE only */
    if (entityId === 'houston-enterprise') {
      items.push(
        { id: 'fixed-assets', title: 'Fixed Asset Register', category: 'Financial', formats: ['pdf', 'xlsx'], ready: (fixedAssets as any[]).length > 0,
          description: 'Equipment, vehicles, and tooling with book-basis accumulated depreciation and net book value.',
          run: (fixedAssets as any[]).length > 0 ? fmt => dl(() => fmt === 'pdf' ? R.savePDF(R.generateFixedAssetsReport(fixedAssets, entityLabel), `hou-fixed-assets-${stamp()}.pdf`) : R.downloadFixedAssetsExcel(fixedAssets, entityLabel), 'Fixed asset register') : undefined },
      );
    }

    /* Financial — Holdings only */
    if (entityId === 'houston-enterprise-holdings') {
      items.push(
        { id: 'balance-sheet', title: 'Statement of Financial Position', category: 'Financial', formats: ['pdf', 'xlsx'], ready: !!balanceSheet,
          description: 'Management-basis balance sheet — cash, notes receivable/payable, and owners\' equity.',
          run: balanceSheet ? fmt => dl(() => fmt === 'pdf' ? R.savePDF(R.generateBalanceSheetReport(balanceSheet), `hou-balance-sheet-${stamp()}.pdf`) : R.downloadBalanceSheetExcel(balanceSheet), 'Balance sheet') : undefined },
        { id: 'notes', title: 'Notes Payable / Receivable', category: 'Financial', formats: ['pdf', 'xlsx'], ready: true,
          description: 'Every note with direction, principal, outstanding balance, rate, and maturity.',
          run: fmt => dl(() => fmt === 'pdf' ? R.savePDF(R.generateNotesReport(holdingsNotes), `hou-notes-${stamp()}.pdf`) : R.downloadNotesExcel(holdingsNotes), 'Notes report') },
        { id: 'capital-activity', title: 'Capital Activity Report', category: 'Financial', formats: ['pdf', 'xlsx'], ready: true,
          description: 'Contributions, distributions, dividends, management fees, and tax reserve transfers.',
          run: fmt => dl(() => fmt === 'pdf' ? R.savePDF(R.generateCapitalActivityReport(capitalActivity), `hou-capital-activity-${stamp()}.pdf`) : R.downloadCapitalActivityExcel(capitalActivity), 'Capital activity report') },
        { id: 'pending-approvals', title: 'Pending Capital Approvals', category: 'Financial', formats: ['pdf'], ready: true,
          description: 'Capital activity awaiting admin / finance manager approval.',
          run: () => dl(() => R.savePDF(R.generateCapitalActivityReport(holdingsPending), `hou-pending-approvals-${stamp()}.pdf`), 'Pending approvals report') },
      );
    }

    /* Projects / Jobs — HE */
    if (entityId === 'houston-enterprise') {
      items.push(
        { id: 'project-portfolio', title: 'Project Financial Breakdown & Profitability', category: 'Projects / Jobs', formats: ['pdf', 'xlsx'], ready: true,
          description: 'Contract value, capital deployed, collected revenue, and health per project.',
          run: fmt => dl(() => fmt === 'pdf' ? R.savePDF(R.generateProjectReport(enrichedProjects), `hou-projects-${stamp()}.pdf`) : R.downloadProjectExcel(enrichedProjects), 'Project portfolio report') },
        { id: 'cost-code', title: 'Cost Code / Phase Spend', category: 'Projects / Jobs', formats: ['pdf', 'xlsx'], ready: true,
          description: 'Actual spend rolled up by cost code and construction division.',
          run: fmt => dl(() => fmt === 'pdf' ? R.savePDF(R.generateCostCodeReport(costCodes, expenses, entityLabel), `hou-cost-codes-${stamp()}.pdf`) : R.downloadCostCodeExcel(costCodes, expenses, entityLabel), 'Cost code report') },
        {
          id: 'pay-app', title: 'Pay Application / AIA-Style Billing', category: 'Projects / Jobs', formats: ['pdf', 'xlsx'], ready: !!selectedControl,
          description: 'Formal application for payment — contract sum, retainage, prior payments, current amount due.',
          custom: (
            <Select value={payAppProjectId} onValueChange={setPayAppProjectId}>
              <SelectTrigger className="rounded-none h-8 text-[11px]"><SelectValue placeholder="Select a project…" /></SelectTrigger>
              <SelectContent>{(projects as any[]).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          ),
          run: selectedControl ? fmt => dl(() => {
            const paid = (income as any[]).filter(t => t.project_id === payAppProjectId).reduce((s, t) => s + Number(t.amount || 0), 0);
            const priorPayApps = 1; // first application against this control snapshot unless re-run later in the period
            const input: R.PayAppInput = {
              projectName: selectedProject?.name || 'Project', clientName: selectedProject?.client_name_snapshot || selectedProject?.client_name,
              applicationNumber: priorPayApps, periodEnding: todayLocalDate(),
              originalContract: Number(selectedControl.budget || 0), approvedChangeOrders: Number(selectedControl.approved_change_orders || 0),
              completedStoredToDate: Number(selectedControl.earned_revenue || 0),
              retainagePercent: Number(selectedControl.earned_revenue) > 0 ? (Number(selectedControl.ar_retainage_held || 0) / Number(selectedControl.earned_revenue)) * 100 : 0,
              retainageHeld: Number(selectedControl.ar_retainage_held || 0), previousPayments: paid,
              changeOrders: [],
            };
            if (fmt === 'pdf') R.savePDF(R.generatePayApplicationReport(input), `hou-payapp-${selectedProject?.name?.replace(/\s+/g, '-') || 'project'}-${stamp()}.pdf`);
            else R.downloadPayApplicationExcel(input);
          }, 'Pay application') : undefined,
        },
        {
          id: 'project-reconciliation', title: 'Project Reconciliation Worksheet', category: 'Reconciliation', formats: ['pdf'], ready: !!reconProject,
          description: 'Schedule-of-values worksheet — scope items, change orders, draws, and payments for one project.',
          custom: (
            <Select value={reconProjectId} onValueChange={setReconProjectId}>
              <SelectTrigger className="rounded-none h-8 text-[11px]"><SelectValue placeholder="Select a project…" /></SelectTrigger>
              <SelectContent>{(projects as any[]).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          ),
          run: reconProject ? () => dl(async () => {
            const [scope, cos, draws] = await Promise.all([
              supabase.from('project_scope_items' as any).select('*').eq('project_id', reconProjectId).order('sort_order'),
              supabase.from('project_change_orders' as any).select('*').eq('project_id', reconProjectId),
              supabase.from('draw_schedules' as any).select('*').eq('project_id', reconProjectId),
            ]);
            const control = (controlSummary as any[]).find(c => c.project_id === reconProjectId);
            const payments = (income as any[]).filter(t => t.project_id === reconProjectId);
            const fin = {
              revised: Number(control?.revised_contract_value || 0), earned: Number(control?.earned_revenue || 0),
              paid: payments.reduce((s, p) => s + Number(p.amount || 0), 0), net: Number(control?.approved_change_orders || 0),
              balance: Math.max(Number(control?.revised_contract_value || 0) - Number(control?.earned_revenue || 0), 0),
            };
            const doc = R.generateProjectReconciliationReport({ project: reconProject, scopeItems: scope.data ?? [], changeOrders: cos.data ?? [], draws: draws.data ?? [], payments, fin });
            R.savePDF(doc, `hou-reconciliation-${reconProject.name?.replace(/\s+/g, '-')}-${stamp()}.pdf`);
          }, 'Reconciliation worksheet') : undefined,
        },
      );
    }

    /* Projects / Jobs — HGP */
    if (entityId === 'houston-generator-pros') {
      items.push(
        { id: 'model-profitability', title: 'Generator Model Profitability', category: 'Projects / Jobs', formats: ['pdf', 'xlsx'], ready: modelProfitability.length > 0,
          description: 'Margin by generator model across delivered jobs.',
          run: modelProfitability.length ? fmt => dl(() => fmt === 'pdf' ? R.savePDF(R.generateModelProfitabilityReport(modelProfitability), `hou-model-profitability-${stamp()}.pdf`) : R.downloadModelProfitabilityExcel(modelProfitability), 'Model profitability report') : undefined },
        { id: 'job-pipeline', title: 'Install Job Pipeline', category: 'Projects / Jobs', formats: ['pdf'], ready: true,
          description: 'Jobs by pipeline stage with quoted value and balance due.',
          run: () => dl(() => {
            const stages: Record<string, { count: number; quoted: number }> = {};
            for (const j of hgpJobs as any[]) {
              const row = stages[j.stage] ?? (stages[j.stage] = { count: 0, quoted: 0 });
              row.count++; row.quoted += Number(j.quoted_amount) || 0;
            }
            const doc = R.generateExecutiveSummaryReport({
              entityLabel, reportTitle: 'Install Job Pipeline',
              metrics: [
                { label: 'Total Jobs', value: String((hgpJobs as any[]).length) },
                { label: 'Total Quoted', value: fmtUSD((hgpJobs as any[]).reduce((s, j) => s + (Number(j.quoted_amount) || 0), 0)) },
              ],
              sections: [{ label: 'By Pipeline Stage', rows: Object.entries(stages).map(([stage, r]) => ({ label: stage.replace(/_/g, ' '), value: `${r.count} jobs · ${fmtUSD(r.quoted)}` })) }],
            });
            R.savePDF(doc, `hou-job-pipeline-${stamp()}.pdf`);
          }, 'Job pipeline report') },
        { id: 'deposits-open-balances', title: 'Deposits & Open Balances', category: 'Projects / Jobs', formats: ['pdf'], ready: true,
          description: 'Deposits held and outstanding balance due across open jobs.',
          run: () => dl(() => R.savePDF(R.generateDepositsOpenBalancesReport(hgpJobs), `hou-deposits-open-balances-${stamp()}.pdf`), 'Deposits report') },
        { id: 'service-visit-revenue', title: 'Service Visit Revenue', category: 'Operations', formats: ['pdf'], ready: (serviceVisits as any[]).length > 0,
          description: 'Completed service visit revenue and margin by visit type.',
          run: (serviceVisits as any[]).length ? () => dl(() => R.savePDF(R.generateServiceVisitRevenueReport(serviceVisits), `hou-service-visits-${stamp()}.pdf`), 'Service visit revenue report') : undefined },
        { id: 'job-invoices', title: 'Job-Linked Invoice / Receipt Report', category: 'Projects / Jobs', formats: ['pdf'], ready: hgpJobInvoices.length > 0,
          description: 'Formal invoices created directly from an install, service, or emergency job.',
          run: hgpJobInvoices.length ? () => dl(() => {
            const rows = hgpJobInvoices.map(inv => ({ invoice_number: inv.invoice_number, client_name: inv.client_name, client_company: inv.client_company, issue_date: inv.issue_date, due_date: inv.due_date, status: inv.status, subtotal: invoiceSubtotal(inv), tax: invoiceTax(inv), total: invoiceTotal(inv) }));
            R.savePDF(R.generateInvoicesReport(rows), `hou-job-invoices-${stamp()}.pdf`);
          }, 'Job invoice report') : undefined },
      );
    }

    /* Vendors / Suppliers — shared, term-aware */
    items.push({
      id: 'vendor-spend', title: `${profile.terms.vendor} Spend`, category: 'Vendors / Suppliers', formats: ['pdf', 'xlsx'], ready: true,
      description: `Total spend per ${profile.terms.vendor.toLowerCase()} across transactions and checks.`,
      run: fmt => dl(() => fmt === 'pdf' ? R.savePDF(R.generateVendorSpendReport(vendors, expenses, checks, profile.terms.vendor), `hou-vendor-spend-${stamp()}.pdf`) : R.downloadVendorSpendExcel(expenses, checks, profile.terms.vendor), `${profile.terms.vendor} spend report`),
    });
    if (entityId === 'houston-generator-pros') {
      items.push(
        { id: 'purchase-orders', title: 'Purchase Order / Procurement', category: 'Vendors / Suppliers', formats: ['pdf', 'xlsx'], ready: (purchaseOrders as any[]).length > 0,
          description: 'Purchase orders by vendor, status, and amount — mirrors HGP equipment expenses.',
          run: (purchaseOrders as any[]).length ? fmt => dl(() => fmt === 'pdf' ? R.savePDF(R.generatePurchaseOrderReport(purchaseOrders), `hou-purchase-orders-${stamp()}.pdf`) : R.downloadPurchaseOrderExcel(purchaseOrders), 'Purchase order report') : undefined },
      );
    }

    /* Operations — HGP */
    if (entityId === 'houston-generator-pros') {
      items.push(
        { id: 'inventory-valuation', title: 'Inventory Valuation', category: 'Operations', formats: ['pdf', 'xlsx'], ready: (hgpParts as any[]).length > 0,
          description: 'On-hand quantity × unit cost across the parts register.',
          run: (hgpParts as any[]).length ? fmt => dl(() => fmt === 'pdf' ? R.savePDF(R.generateInventoryValuationReport(hgpParts), `hou-inventory-valuation-${stamp()}.pdf`) : R.downloadInventoryValuationExcel(hgpParts), 'Inventory valuation report') : undefined },
        { id: 'low-stock', title: 'Low Stock / Reorder', category: 'Operations', formats: ['pdf'], ready: true,
          description: 'Parts at or below their reorder point, with suggested reorder quantity and cost.',
          run: () => dl(() => R.savePDF(R.generateLowStockReorderReport(hgpParts), `hou-low-stock-${stamp()}.pdf`), 'Low stock report') },
        { id: 'technician-workload', title: 'Technician Workload', category: 'Operations', formats: ['pdf'], ready: true,
          description: 'Open jobs, logged visits, hours, and revenue per assigned technician.',
          run: () => dl(() => R.savePDF(R.generateTechnicianWorkloadReport(hgpJobs, serviceVisits), `hou-technician-workload-${stamp()}.pdf`), 'Technician workload report') },
        { id: 'emergency-response', title: 'Emergency Service / Outage Response', category: 'Operations', formats: ['pdf'], ready: true,
          description: 'Emergency jobs, dispatch status, and outage-matched customer sites.',
          run: () => dl(() => R.savePDF(R.generateEmergencyResponseReport(hgpJobs, outageImpacts), `hou-emergency-response-${stamp()}.pdf`), 'Emergency response report') },
        { id: 'customer-sites', title: 'Customer Site Registry', category: 'Operations', formats: ['pdf'], ready: (customerSites as any[]).length > 0,
          description: 'Registered customer sites with address, utility, and agreement linkage.',
          run: (customerSites as any[]).length ? () => dl(() => R.savePDF(R.generateCustomerSiteRegistryReport(customerSites), `hou-customer-sites-${stamp()}.pdf`), 'Customer site registry') : undefined },
        { id: 'warranty-expiration', title: 'Warranty Expiration', category: 'Operations', formats: ['pdf'], ready: (equipmentUnits as any[]).some((u: any) => u.warranty_end),
          description: 'Installed units by warranty expiration — active vs. expired.',
          run: (equipmentUnits as any[]).some((u: any) => u.warranty_end) ? () => dl(() => R.savePDF(R.generateWarrantyExpirationReport(equipmentUnits), `hou-warranty-expiration-${stamp()}.pdf`), 'Warranty expiration report') : undefined },
        { id: 'service-renewals', title: 'Service Agreement Renewals', category: 'Operations', formats: ['pdf'], ready: (serviceAgreements as any[]).length > 0,
          description: 'Recurring maintenance plans by renewal date and annual value.',
          run: (serviceAgreements as any[]).length ? () => dl(() => R.savePDF(R.generateServiceAgreementRenewalReport(serviceAgreements), `hou-service-renewals-${stamp()}.pdf`), 'Service renewal report') : undefined },
      );
    }

    /* Operations — Holdings */
    if (entityId === 'houston-enterprise-holdings') {
      items.push(
        { id: 'covenants', title: 'Covenant Compliance', category: 'Compliance', formats: ['pdf'], ready: (covenants as any[]).length > 0,
          description: 'Covenant thresholds, current values, and compliance status per note.',
          run: (covenants as any[]).length ? () => dl(() => R.savePDF(R.generateCovenantComplianceReport(covenants), `hou-covenants-${stamp()}.pdf`), 'Covenant compliance report') : undefined },
      );
    }

    /* Documents — shared */
    items.push({
      id: 'documents', title: 'Documents Report', category: 'Documents', formats: ['pdf'], ready: true,
      description: 'Every stored receipt, contract, and file with type, tags, and linkage.',
      run: () => dl(() => R.savePDF(R.generateDocumentsReport(documents, entityLabel), `hou-documents-${stamp()}.pdf`), 'Documents report'),
    });

    /* Reconciliation — shared */
    items.push({
      id: 'reconciliation-audit', title: 'Reconciliation Audit Report', category: 'Reconciliation', formats: ['pdf', 'xlsx'], ready: true,
      description: 'Bank-match acceptance and reconciliation status changes for this entity.',
      run: fmt => dl(() => {
        const recOnly = auditEvents.filter(e => e.source === 'Reconciliation');
        if (fmt === 'pdf') R.savePDF(R.generateAuditTrailReport(recOnly, entityLabel), `hou-reconciliation-audit-${stamp()}.pdf`);
        else R.downloadAuditTrailExcel(recOnly, entityLabel);
      }, 'Reconciliation audit report'),
    });

    /* Compliance — shared */
    items.push({
      id: 'role-access', title: 'User / Role Access Report', category: 'Compliance', formats: ['pdf', 'xlsx'], ready: true,
      description: 'Who has access to this entity\'s finance dashboard, and at what role.',
      run: fmt => dl(() => fmt === 'pdf' ? R.savePDF(R.generateRoleAccessReport(roles, entityLabel), `hou-role-access-${stamp()}.pdf`) : R.downloadRoleAccessExcel(roles, entityLabel), 'Role access report'),
    });
    if (canSeeAudit) {
      items.push({
        id: 'audit-trail', title: 'Activity / Audit Trail Report', category: 'Compliance', formats: ['pdf', 'xlsx'], ready: true,
        description: 'Consolidated reconciliation, admin changelog, and system-health event log.',
        run: fmt => dl(() => fmt === 'pdf' ? R.savePDF(R.generateAuditTrailReport(filteredAudit, entityLabel), `hou-audit-trail-${stamp()}.pdf`) : R.downloadAuditTrailExcel(filteredAudit, entityLabel), 'Audit trail report'),
      });
    }

    /* Tax / Close — shared */
    items.push({
      id: 'sales-tax', title: 'Sales / Use Tax Liability', category: 'Tax / Close', formats: ['pdf', 'xlsx'], ready: true,
      description: 'Tax collected on logged income transactions, by accounting period.',
      run: fmt => dl(() => {
        const byPeriod: Record<string, number> = {};
        for (const t of income as any[]) {
          const key = t.accounting_period || String(t.transaction_date || '').slice(0, 7) || 'Unknown';
          byPeriod[key] = (byPeriod[key] || 0) + (Number(t.tax_amount) || 0);
        }
        const total = Object.values(byPeriod).reduce((s, v) => s + v, 0);
        const doc = R.generateExecutiveSummaryReport({
          entityLabel, reportTitle: 'Sales / Use Tax Liability',
          metrics: [{ label: 'Total Tax Collected', value: fmtUSD(total) }, { label: 'Periods With Activity', value: String(Object.keys(byPeriod).length) }],
          sections: [{ label: 'By Accounting Period', rows: Object.entries(byPeriod).sort((a, b) => b[0].localeCompare(a[0])).map(([period, amt]) => ({ label: period, value: fmtUSD(amt) })) }],
          narrative: 'Reflects tax_amount as entered on each income transaction. This platform does not currently maintain jurisdiction-level tax rate tables — verify rates against your filing jurisdiction before remitting.',
        });
        if (fmt === 'pdf') { R.savePDF(doc, `hou-sales-tax-${stamp()}.pdf`); return; }
        const rows = Object.entries(byPeriod).sort((a, b) => b[0].localeCompare(a[0])).map(([period, amt]) => [period, amt]);
        R.downloadCSV(rows, `hou-sales-tax-${stamp()}.csv`, ['Period', 'Tax Collected'], (r: any) => r);
      }, 'Sales tax report'),
    });
    items.push({
      id: 'accounting-periods', title: 'Accounting Period Status', category: 'Tax / Close', formats: ['pdf'], ready: true,
      description: 'Open, soft-closed, and locked periods — close periods from Controls.',
      run: () => dl(() => {
        const doc = R.generateExecutiveSummaryReport({
          entityLabel, reportTitle: 'Accounting Period Status',
          metrics: [
            { label: 'Locked Periods', value: String((accountingPeriods as any[]).filter(p => p.status === 'locked').length) },
            { label: 'Soft-Closed', value: String((accountingPeriods as any[]).filter(p => p.status === 'soft_closed').length) },
          ],
          sections: [{ label: 'Periods on Record', rows: (accountingPeriods as any[]).map(p => ({ label: p.period_key, value: String(p.status).replace(/_/g, ' ') })) }],
        });
        R.savePDF(doc, `hou-accounting-periods-${stamp()}.pdf`);
      }, 'Accounting period status report'),
    });

    /* Coming soon — honest, non-clickable */
    const soonHE: ReportItem[] = entityId === 'houston-enterprise' ? [] : [];
    const soon: ReportItem[] = [
      ...soonHE,
      ...(entityId === 'houston-generator-pros' ? [
        { id: 'dispatch-schedule', title: 'Dispatch Schedule Report', category: 'Operations' as Category, formats: ['pdf'] as Fmt[], ready: false,
          description: 'Static export of the live dispatch calendar — the interactive calendar on Generator Ops is the primary tool today.' },
        { id: 'maintenance-forecast', title: 'Maintenance Revenue Forecast', category: 'Operations' as Category, formats: ['pdf'] as Fmt[], ready: false,
          description: 'Forward-projected recurring maintenance revenue — needs a proration model beyond this pass.' },
      ] : []),
      ...(entityId === 'houston-enterprise-holdings' ? [
        { id: 'maturity-risk', title: 'Maturity Risk Report', category: 'Compliance' as Category, formats: ['pdf'] as Fmt[], ready: false,
          description: 'Standalone maturity-risk ladder — currently surfaced live on Holdings HQ; a dedicated export is planned.' },
        { id: 'liquidity-reserve', title: 'Liquidity / Reserve Report', category: 'Financial' as Category, formats: ['pdf'] as Fmt[], ready: false,
          description: 'Needs a defined reserve policy (target liquidity ratio) before a report can be meaningful.' },
      ] : []),
    ];

    return [...items, ...soon];
  }, [entityId, entityLabel, profile, income, expenses, checks, aging, controlSummary, costCodes, fixedAssets, invoices, hgpJobs, hgpParts, equipmentUnits, purchaseOrders, customerSites, serviceAgreements, serviceVisits, outageImpacts, holdingsNotes, capitalActivity, covenants, balanceSheet, entityPerformanceRows, holdingsPending, roles, documents, accountingPeriods, vendors, projects, enrichedProjects, modelProfitability, hgpJobInvoices, payAppProjectId, reconProjectId, selectedControl, selectedProject, reconProject, canSeeAudit, filteredAudit, auditEvents]);

  const filtered = catalog.filter(r => {
    if (cat !== 'all' && r.category !== cat) return false;
    if (q && !(r.title.toLowerCase().includes(q.toLowerCase()) || r.description.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });

  const categoryCounts = useMemo(() => {
    const out: Record<string, number> = { all: catalog.length };
    for (const c of CATEGORIES) out[c] = catalog.filter(r => r.category === c).length;
    return out;
  }, [catalog]);

  return (
    <AppShell>
      <style>{REPORTS_CSS}</style>
      <PageHeader
        eyebrow="Finance Dashboard"
        title="Reports"
        description={`Entity-aware statements, exports, and board packets for ${entityLabel}.`}
        actions={canSeeAudit ? (
          <button className="rp-chip" onClick={() => setAuditOpen(true)}>
            <History className="w-3.5 h-3.5 inline mr-1.5" />Activity Log
          </button>
        ) : undefined}
      />

      <div className="rp-shell border-t border-border/50">
        <div className="px-4 sm:px-8 py-4 space-y-3.5">
          <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center">
            <div className="relative flex-1 min-w-0 sm:max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search reports…" className="rounded-none h-9 pl-8 text-sm" />
            </div>
            <div className="text-[10px] text-muted-foreground font-mono-tab sm:ml-auto shrink-0">{filtered.length} of {catalog.length} reports</div>
          </div>
          <Popover open={catOpen} onOpenChange={setCatOpen}>
            <PopoverTrigger asChild>
              <button type="button" className="rp-chip gap-1.5 self-start" data-on={cat !== 'all'}>
                <Filter className="w-3 h-3" />
                Category: {cat === 'all' ? 'All' : cat}
                <span className="font-mono-tab">{cat === 'all' ? categoryCounts.all : categoryCounts[cat]}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${catOpen ? 'rotate-180' : ''}`} />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[min(94vw,26rem)] p-2.5 rounded-none border-border" align="start">
              <div className="text-[8px] uppercase tracking-[0.2em] font-black text-muted-foreground mb-2 px-0.5">Filter by Category</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                <button className="rp-chip justify-center" data-on={cat === 'all'} onClick={() => { setCat('all'); setCatOpen(false); }}>
                  All <span className="font-mono-tab">{categoryCounts.all}</span>
                </button>
                {CATEGORIES.filter(c => categoryCounts[c] > 0).map(c => (
                  <button key={c} className="rp-chip justify-center" data-on={cat === c} onClick={() => { setCat(cat === c ? 'all' : c); setCatOpen(false); }}>
                    {c} <span className="font-mono-tab">{categoryCounts[c]}</span>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map(r => (
              <div key={r.id} className={`rp-card ${!r.ready ? 'rp-soon' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <span className="rp-cat">{r.category}</span>
                  {!r.ready && <span className="text-[8px] font-black uppercase tracking-wider text-muted-foreground border border-border px-1.5 py-0.5">Coming Soon</span>}
                </div>
                <div className="rp-title">{r.title}</div>
                <div className="rp-desc flex-1">{r.description}</div>
                {r.custom && <div className="pt-1">{r.custom}</div>}
                {r.ready && r.run && (
                  <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                    {r.formats.includes('pdf') && <button className="rp-fmt" onClick={() => r.run!('pdf')}><FileText className="w-3 h-3" />PDF</button>}
                    {r.formats.includes('xlsx') && <button className="rp-fmt" onClick={() => r.run!('xlsx')}><Table2 className="w-3 h-3" />XLSX</button>}
                    {r.formats.includes('csv') && <button className="rp-fmt" onClick={() => r.run!('csv')}><Download className="w-3 h-3" />CSV</button>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Activity / Audit Trail drill-in ── */}
      <Dialog open={auditOpen} onOpenChange={setAuditOpen}>
        <DialogContent className="max-w-3xl rounded-none max-h-[85vh] overflow-hidden flex flex-col p-0">
          <div className="px-5 pt-4 pb-3 border-b border-border">
            <DialogHeader><DialogTitle className="text-base flex items-center gap-2"><History className="w-4 h-4" />Activity & Audit Trail — {entityLabel}</DialogTitle></DialogHeader>
            <div className="flex flex-wrap gap-2 mt-3">
              <div className="relative flex-1 min-w-[160px]">
                <Filter className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                <Input value={auditSearch} onChange={e => setAuditSearch(e.target.value)} placeholder="Search action, table, details…" className="rounded-none h-8 pl-7 text-xs" />
              </div>
              <Select value={auditSource} onValueChange={setAuditSource}>
                <SelectTrigger className="rounded-none h-8 w-44 text-[11px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  {auditSources.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <button className="rp-fmt !h-8" onClick={() => dl(() => R.savePDF(R.generateAuditTrailReport(filteredAudit, entityLabel), `hou-audit-trail-${stamp()}.pdf`), 'Audit trail')}><FileText className="w-3 h-3" />PDF</button>
              <button className="rp-fmt !h-8" onClick={() => dl(() => R.downloadAuditTrailExcel(filteredAudit, entityLabel), 'Audit trail')}><Table2 className="w-3 h-3" />XLSX</button>
              <button className="rp-fmt !h-8" onClick={() => dl(() => R.downloadCSV(filteredAudit, `hou-audit-trail-${stamp()}.csv`, ['Date', 'Source', 'Action', 'Table', 'User', 'Details'], (e: any) => [e.date, e.source, e.action, e.table_name, e.user_label, e.details]), 'Audit trail')}><Download className="w-3 h-3" />CSV</button>
            </div>
          </div>
          <div className="overflow-y-auto flex-1 divide-y divide-border">
            {filteredAudit.slice(0, 200).map((e, i) => (
              <div key={i} className="px-5 py-2.5 text-xs flex items-start gap-3">
                <div className="w-32 shrink-0 text-muted-foreground font-mono-tab">{e.date ? fmtDate(e.date) : '—'}</div>
                <div className="w-28 shrink-0 text-[9px] font-black uppercase tracking-wider text-muted-foreground">{e.source}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{e.action} <span className="text-muted-foreground font-normal">· {e.table_name}</span></div>
                  <div className="text-muted-foreground truncate">{e.details}</div>
                </div>
              </div>
            ))}
            {!filteredAudit.length && <div className="py-16 text-center text-sm text-muted-foreground">No activity recorded yet for this entity.</div>}
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
