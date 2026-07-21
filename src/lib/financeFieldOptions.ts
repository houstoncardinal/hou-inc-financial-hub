/* ── Shared finance dropdown option lists ─────────────────────────────────
   Mirrors the live DB CHECK constraints on transactions/checks so every form
   that edits these fields (guided entry, ledger correction, inspectors)
   offers the exact same picklist instead of free text that can drift out
   of sync with what the database actually accepts. ── */

export interface FieldOption { value: string; label: string }

export const TRANSACTION_STATUS: FieldOption[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'posted', label: 'Posted' },
  { value: 'paid', label: 'Paid' },
  { value: 'partially_paid', label: 'Partially Paid' },
  { value: 'voided', label: 'Voided' },
  { value: 'archived', label: 'Archived' },
];

export const CHECK_STATUS: FieldOption[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'cleared', label: 'Cleared' },
  { value: 'voided', label: 'Voided' },
];

export const TRANSACTION_PAYMENT_STATUS: FieldOption[] = [
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'partial', label: 'Partial' },
  { value: 'paid', label: 'Paid' },
  { value: 'overpaid', label: 'Overpaid' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'voided', label: 'Voided' },
];

export const TRANSACTION_APPROVAL_STATUS: FieldOption[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

export const CHECK_APPROVAL_STATUS: FieldOption[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

export const CHECK_PRINT_STATUS: FieldOption[] = [
  { value: 'not_printed', label: 'Not Printed' },
  { value: 'queued', label: 'Queued' },
  { value: 'printed', label: 'Printed' },
  { value: 'reprinted', label: 'Reprinted' },
];

export const CHECK_DELIVERY_STATUS: FieldOption[] = [
  { value: 'not_delivered', label: 'Not Delivered' },
  { value: 'mailed', label: 'Mailed' },
  { value: 'hand_delivered', label: 'Hand Delivered' },
  { value: 'deposited', label: 'Deposited' },
  { value: 'returned', label: 'Returned' },
];

export const RECEIPT_STATUS: FieldOption[] = [
  { value: 'not_provided', label: 'Not Provided' },
  { value: 'attached', label: 'Attached' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'missing', label: 'Missing' },
];

export const BILLABLE_STATUS: FieldOption[] = [
  { value: 'not_billable', label: 'Not Billable' },
  { value: 'billable', label: 'Billable' },
  { value: 'billed', label: 'Billed' },
  { value: 'partially_billed', label: 'Partially Billed' },
  { value: 'written_off', label: 'Written Off' },
];

export const REIMBURSABLE_STATUS: FieldOption[] = [
  { value: 'not_reimbursable', label: 'Not Reimbursable' },
  { value: 'reimbursable', label: 'Reimbursable' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'reimbursed', label: 'Reimbursed' },
  { value: 'rejected', label: 'Rejected' },
];

export const INVOICE_LINK_PROVIDERS: FieldOption[] = [
  { value: 'stripe', label: 'Stripe' },
  { value: 'quickbooks', label: 'QuickBooks' },
  { value: 'square', label: 'Square' },
  { value: 'other', label: 'Other' },
];

export const INCOME_PAYMENT_METHODS: FieldOption[] = [
  { value: 'check', label: 'Check' },
  { value: 'ach_wire', label: 'ACH / Wire' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'financing_draw', label: 'Financing Draw' },
  { value: 'cash', label: 'Cash' },
  { value: 'other', label: 'Other' },
];

export const EXPENSE_PAYMENT_METHODS: FieldOption[] = [
  { value: 'check', label: 'Check' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'ach', label: 'ACH' },
  { value: 'net_30', label: 'NET 30' },
  { value: 'net_60', label: 'NET 60' },
  { value: 'net_90', label: 'NET 90' },
  { value: 'cash', label: 'Cash' },
  { value: 'wire', label: 'Wire' },
  { value: 'other', label: 'Other' },
];

export const COST_PHASES: string[] = [
  'Phase 1: Site Prep & Demo',
  'Phase 2: Foundation & Concrete',
  'Phase 3: Framing & Structure',
  'Phase 4: Rough-Ins (MEP)',
  'Phase 5: Exterior & Roofing',
  'Phase 6: Insulation & Drywall',
  'Phase 7: Finishes & Fixtures',
  'Phase 8: Landscaping & Final',
  'General / Overhead',
];

export const COST_TYPES: FieldOption[] = [
  { value: 'general', label: 'General' },
  { value: 'labor', label: 'Labor' },
  { value: 'material', label: 'Material' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'subcontract', label: 'Subcontract' },
];
