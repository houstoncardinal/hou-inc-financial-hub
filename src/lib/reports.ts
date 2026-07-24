import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { todayLocalDate } from '@/lib/format';

/* ── Design tokens ── */
export const C = {
  black:    [18, 18, 18]    as [number, number, number],
  accent:   [157, 126, 63]  as [number, number, number],
  muted:    [97, 97, 97]    as [number, number, number],
  border:   [229, 229, 229] as [number, number, number],
  altRow:   [248, 248, 248] as [number, number, number],
  white:    [255, 255, 255] as [number, number, number],
  positive: [30, 120, 60]   as [number, number, number],
  negative: [164, 30, 30]   as [number, number, number],
};
export const M = 18;

// Fixed portrait Letter dims kept for callers that need a page-size constant
// (e.g. layout math before a doc exists); everything below that draws onto an
// actual doc reads the real page size via pageDims() so landscape works too.
const PW = 215.9, PH = 279.4;

function pageDims(doc: jsPDF): { w: number; h: number } {
  return { w: doc.internal.pageSize.getWidth(), h: doc.internal.pageSize.getHeight() };
}

/* ── Formatters ── */
export const fmtUSD = (n: number | string | null | undefined): string => {
  const v = typeof n === 'string' ? parseFloat(n) : (n ?? 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2,
  }).format(isNaN(v as number) ? 0 : (v as number));
};

const fmtGeneratedAt = () => new Date().toLocaleString('en-US', {
  year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
});

/* ── PDF building blocks ──
   entityLabel defaults to 'Houston Enterprise' for backward compatibility,
   but every generator that knows its real entity (or is inherently scoped to
   one) passes the correct name so the header/footer never mislabel a
   Generator Pros or Holdings document as Houston Enterprise. */
const DEFAULT_ENTITY = 'Houston Enterprise';

export function makeDoc(
  title: string,
  sub: string,
  entityLabel: string = DEFAULT_ENTITY,
  orientation: 'portrait' | 'landscape' = 'portrait',
): { doc: jsPDF; y: number } {
  const doc = new jsPDF({ format: 'letter', unit: 'mm', orientation });
  const { w } = pageDims(doc);

  // Top accent bar
  doc.setFillColor(...C.accent);
  doc.rect(0, 0, w, 2.1, 'F');

  // Monogram mark
  doc.setFillColor(...C.black);
  doc.roundedRect(M, 5.4, 7, 7, 1.3, 1.3, 'F');
  doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.white);
  doc.text('H', M + 3.5, 10, { align: 'center' });

  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.line(M, 24.5, w - M, 24.5);

  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.black);
  doc.text('HOU INC', M + 10, 9.6);
  doc.setFontSize(6.2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.muted);
  doc.text(`${entityLabel} Financial Records`, M + 10, 13.9);
  doc.setFontSize(5.4);
  doc.setTextColor(...C.muted);
  doc.text(fmtGeneratedAt(), M + 10, 17.8);

  doc.setFontSize(6.4);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.muted);
  doc.text(sub, w - M, 10.5, { align: 'right', maxWidth: 82 });
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.black);
  doc.text(title, w - M, 18, { align: 'right', maxWidth: 92 });

  return { doc, y: 31 };
}

interface Metric { label: string; value: string; color?: [number, number, number] }

export function drawMetrics(doc: jsPDF, y: number, metrics: Metric[]): number {
  const { w } = pageDims(doc);
  const n = metrics.length;
  const gap = 3;
  const bw = (w - 2 * M - gap * (n - 1)) / n;
  const bh = 18.5;
  metrics.forEach((m, i) => {
    const x = M + i * (bw + gap);
    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.25);
    doc.roundedRect(x, y, bw, bh, 1.4, 1.4, 'FD');
    // Top accent bar
    doc.setFillColor(...(m.color ?? C.accent));
    doc.rect(x + 0.3, y + 0.3, bw - 0.6, 1.6, 'F');
    doc.setFontSize(5.8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.muted);
    doc.text(m.label.toUpperCase(), x + 4, y + 8);
    doc.setFontSize(10.8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...(m.color ?? C.black));
    doc.text(m.value, x + 4, y + 15, { maxWidth: bw - 7 });
  });
  return y + bh + 5;
}

export function sectionLabel(doc: jsPDF, y: number, label: string): number {
  const { w } = pageDims(doc);
  doc.setFillColor(...C.accent);
  doc.rect(M, y - 3.1, 1.3, 3.8, 'F');
  doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.muted);
  doc.text(label.toUpperCase(), M + 3, y);
  doc.setDrawColor(...C.border); doc.setLineWidth(0.25);
  const lw = doc.getTextWidth(label.toUpperCase());
  doc.line(M + lw + 5, y - 0.5, w - M, y - 0.5);
  return y + 5;
}

export function addDecorations(doc: jsPDF, title: string, entityLabel: string = DEFAULT_ENTITY) {
  const { w, h } = pageDims(doc);
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);

    if (i > 1) {
      // Compact continuation header
      doc.setFillColor(...C.accent); doc.rect(0, 0, w, 1.2, 'F');
      doc.setDrawColor(...C.border); doc.line(M, 11, w - M, 11);
      doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.black);
      doc.text('HOU INC', M, 7.8);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.muted);
      doc.text(title, w - M, 7.8, { align: 'right', maxWidth: 90 });
    }

    // Footer
    const fy = h - 14;
    doc.setFillColor(...C.accent); doc.rect(0, h - 1.6, w, 1.6, 'F');
    doc.setDrawColor(...C.border); doc.setLineWidth(0.25);
    doc.line(M, fy, w - M, fy);
    doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.muted);
    doc.text(`HOU INC · ${entityLabel} Financial Records`, M, fy + 4.5);
    doc.text(`Generated ${fmtGeneratedAt()}`, w / 2, fy + 4.5, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text(`Page ${i} of ${n}  ·  CONFIDENTIAL`, w - M, fy + 4.5, { align: 'right' });
  }
  doc.setPage(1);
}

export const tblCfg = (startY: number) => ({
  startY,
  margin: { left: M, right: M, top: 14, bottom: 20 },
  headStyles: {
    fillColor: [246, 246, 246] as [number, number, number],
    textColor: C.black,
    fontStyle: 'bold' as const, fontSize: 6.2,
    cellPadding: { top: 2.5, bottom: 2.5, left: 2.6, right: 2.6 },
    lineColor: C.border,
    lineWidth: 0.2,
  },
  bodyStyles: {
    fontSize: 6.5, textColor: C.black,
    cellPadding: { top: 2.2, bottom: 2.2, left: 2.6, right: 2.6 },
    overflow: 'linebreak' as const,
    minCellHeight: 4.8,
  },
  alternateRowStyles: { fillColor: C.altRow },
  footStyles: {
    fillColor: [241, 241, 241] as [number, number, number],
    textColor: C.black, fontStyle: 'bold' as const, fontSize: 6.6,
    cellPadding: { top: 2.9, bottom: 2.9, left: 2.6, right: 2.6 },
  },
  tableLineColor: C.border,
  tableLineWidth: 0.2,
});

/* ────────────────────────────────────────────
   PDF: Transaction Report (income / expense)
──────────────────────────────────────────── */
export function generateTransactionReport(
  data: any[],
  kind: 'income' | 'expense',
  _period?: string,
  entityLabel: string = 'Houston Enterprise'
) {
  const isIncome = kind === 'income';
  const label = isIncome ? 'Income' : 'Expenses';
  const { doc, y } = makeDoc(
    `${label} Ledger`,
    `HOU INC · ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}`,
    entityLabel
  );

  const total   = data.reduce((s: number, t: any) => s + Number(t.amount), 0);
  const avg     = data.length ? total / data.length : 0;
  const largest = data.length ? Math.max(...data.map((t: any) => Number(t.amount))) : 0;

  const my = drawMetrics(doc, y, [
    { label: `Total ${label}`, value: fmtUSD(total), color: isIncome ? C.positive : C.negative },
    { label: 'Entries',        value: String(data.length) },
    { label: 'Average',        value: fmtUSD(avg) },
    { label: 'Largest Entry',  value: fmtUSD(largest) },
  ]);

  const ty = sectionLabel(doc, my + 2, 'Transaction Detail');

  const rows = data.map((t: any) => [
    t.transaction_date?.slice(0, 10) || '—',
    isIncome ? (t.source_name || t.vendors?.name || '—') : (t.vendors?.name || '—'),
    t.projects?.name || '—',
    isIncome ? (t.notes || '—') : (t.category || '—'),
    { content: fmtUSD(t.amount), styles: { halign: 'right', fontStyle: 'bold' } },
  ]);

  autoTable(doc, {
    ...tblCfg(ty),
    head: [['Date', isIncome ? 'Source' : 'Vendor', 'Project', isIncome ? 'Notes' : 'Category', 'Amount']],
    body: rows,
    columnStyles: {
      0: { cellWidth: 24 },
      4: { halign: 'right', cellWidth: 30 },
    },
    foot: [[
      { content: 'Total', colSpan: 4, styles: { fontStyle: 'bold' } },
      { content: fmtUSD(total), styles: { halign: 'right', fontStyle: 'bold', textColor: isIncome ? C.positive : C.negative } },
    ]],
  });

  addDecorations(doc, `${label} Ledger`, entityLabel);
  return doc;
}

/* ────────────────────────────────────────────
   PDF: Check Register
──────────────────────────────────────────── */
export function generateCheckRegisterReport(checks: any[], _filter?: string, entityLabel: string = 'Houston Enterprise') {
  const { doc, y } = makeDoc('Check Register', 'HOU INC · Instrument Ledger', entityLabel);

  const total   = checks.reduce((s: number, c: any) => s + Number(c.amount), 0);
  const cleared = checks.filter((c: any) => c.status === 'cleared').reduce((s: number, c: any) => s + Number(c.amount), 0);
  const pending = checks.filter((c: any) => c.status === 'pending').reduce((s: number, c: any) => s + Number(c.amount), 0);
  const voided  = checks.filter((c: any) => c.status === 'voided').length;

  const my = drawMetrics(doc, y, [
    { label: 'Total Issued',  value: fmtUSD(total) },
    { label: 'Cleared',       value: fmtUSD(cleared), color: C.positive },
    { label: 'Outstanding',   value: fmtUSD(pending), color: C.negative },
    { label: 'Voided',        value: String(voided) },
  ]);

  const ty = sectionLabel(doc, my + 2, 'Check Register');

  const rows = checks.map((c: any) => [
    c.check_number || '—',
    c.payee_name || '—',
    c.issue_date?.slice(0, 10) || '—',
    {
      content: (c.status || '—').toUpperCase(),
      styles: { fontStyle: 'bold', textColor: c.status === 'cleared' ? C.positive : c.status === 'voided' ? C.muted : C.black },
    },
    c.projects?.name || '—',
    c.memo || '—',
    { content: fmtUSD(c.amount), styles: { halign: 'right', fontStyle: 'bold' } },
  ]);

  autoTable(doc, {
    ...tblCfg(ty),
    head: [['Check #', 'Payee', 'Issue Date', 'Status', 'Project', 'Memo', 'Amount']],
    body: rows,
    columnStyles: {
      0: { cellWidth: 20 },
      2: { cellWidth: 24 },
      3: { cellWidth: 20 },
      6: { halign: 'right', cellWidth: 28 },
    },
    foot: [[
      { content: 'Grand Total', colSpan: 6, styles: { fontStyle: 'bold' } },
      { content: fmtUSD(total), styles: { halign: 'right', fontStyle: 'bold' } },
    ]],
  });

  addDecorations(doc, 'Check Register', entityLabel);
  return doc;
}

/* ────────────────────────────────────────────
   PDF: General Ledger
──────────────────────────────────────────── */
export function generateLedgerReport(
  income: any[],
  expenses: any[],
  checks: any[],
  projectFilter?: string,
  typeFilter?: string,
  entityLabel: string = 'Houston Enterprise'
) {
  const { doc, y } = makeDoc('General Ledger', 'HOU INC · Unified Ledger', entityLabel);

  const all = [
    ...checks.map((c: any) => ({ date: c.issue_date, type: 'Check',   ref: `#${c.check_number}`,      party: c.payee_name, project: c.projects?.name, amount: -Number(c.amount) })),
    ...income.map((t: any) => ({ date: t.transaction_date, type: 'Income',  ref: '—',                       party: t.source_name || t.vendors?.name || '—', project: t.projects?.name, amount:  Number(t.amount) })),
    ...expenses.map((t: any) => ({ date: t.transaction_date, type: 'Expense', ref: t.category || '—',         party: t.vendors?.name || '—', project: t.projects?.name, amount: -Number(t.amount) })),
  ].sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  const inflow  = all.filter(r => r.amount > 0).reduce((s, r) => s + r.amount, 0);
  const outflow = all.filter(r => r.amount < 0).reduce((s, r) => s + Math.abs(r.amount), 0);
  const net     = inflow - outflow;

  let my = drawMetrics(doc, y, [
    { label: 'Total Inflow',  value: fmtUSD(inflow),  color: C.positive },
    { label: 'Total Outflow', value: fmtUSD(outflow), color: C.negative },
    { label: 'Net Position',  value: fmtUSD(net),     color: net >= 0 ? C.positive : C.negative },
    { label: 'Total Entries', value: String(all.length) },
  ]);

  if (projectFilter || typeFilter) {
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.muted);
    const info = [projectFilter && `Project: ${projectFilter}`, typeFilter && `Type: ${typeFilter}`].filter(Boolean).join('  ·  ');
    doc.text(`Active filters — ${info}`, M, my + 2);
    my += 6;
  }

  const ty = sectionLabel(doc, my + 2, 'Ledger Entries');

  const rows = all.map(r => [
    r.date?.slice(0, 10) || '—',
    { content: r.type, styles: { fontStyle: 'bold' } },
    r.ref,
    r.party,
    r.project || '—',
    {
      content: r.amount >= 0 ? `+${fmtUSD(Math.abs(r.amount))}` : `-${fmtUSD(Math.abs(r.amount))}`,
      styles: { halign: 'right', fontStyle: 'bold', textColor: r.amount >= 0 ? C.positive : C.black },
    },
  ]);

  autoTable(doc, {
    ...tblCfg(ty),
    head: [['Date', 'Type', 'Reference', 'Counterparty', 'Project', 'Amount']],
    body: rows,
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 20 },
      5: { halign: 'right', cellWidth: 32 },
    },
    foot: [[
      { content: 'Net Position', colSpan: 5, styles: { fontStyle: 'bold' } },
      { content: fmtUSD(net), styles: { halign: 'right', fontStyle: 'bold', textColor: net >= 0 ? C.positive : C.negative } },
    ]],
  });

  addDecorations(doc, 'General Ledger', entityLabel);
  return doc;
}

/* ────────────────────────────────────────────
   PDF: Individual Ledger Record
──────────────────────────────────────────── */
export function generateLedgerRecordReport(row: any, entityLabel: string = 'Houston Enterprise') {
  const raw = row?.raw ?? {};
  const isCredit = Number(row?.amount ?? 0) >= 0;
  const date = row?.date || raw.transaction_date || raw.issue_date;
  const ref = row?.ref || raw.check_reference || raw.external_reference || raw.check_number || '—';
  const status = row?.reconciled ? 'Reconciled' : 'Open';
  const method = raw.payment_method?.replace?.(/_/g, ' ') || raw.delivery_status?.replace?.(/_/g, ' ') || '—';
  const memo = raw.description || raw.notes || raw.memo || raw.internal_memo || raw.public_memo || '—';
  const externalInvoiceUrl = raw.external_invoice_url || raw.stripe_payment_link || raw.invoice_url;
  const externalInvoiceProvider = raw.external_invoice_provider?.replace?.(/_/g, ' ') || (String(externalInvoiceUrl || '').includes('stripe') ? 'Stripe' : String(externalInvoiceUrl || '').includes('quickbooks') ? 'QuickBooks' : '—');
  const paymentIdentifierLabel = raw.payment_method === 'check' || row?.type === 'Check'
    ? 'Check Number'
    : raw.payment_method === 'ach' || raw.payment_method === 'ach_wire'
      ? 'ACH / Wire Confirmation'
      : raw.payment_method === 'wire'
        ? 'Wire Confirmation'
        : raw.payment_method === 'credit_card'
          ? 'Card / Processor Reference'
          : 'Payment Reference';
  const { doc, y } = makeDoc('Ledger Record', `${row?.type || 'Finance Entry'} · ${method}`, entityLabel);

  const signedAmount = `${isCredit ? '+' : '-'}${fmtUSD(Math.abs(Number(row?.amount || 0)))}`;
  let my = drawMetrics(doc, y, [
    { label: 'Signed Amount', value: signedAmount, color: isCredit ? C.positive : C.negative },
    { label: 'Type', value: row?.type || '—' },
    { label: 'Status', value: status, color: row?.reconciled ? C.positive : C.black },
    { label: 'Entry Date', value: date?.slice?.(0, 10) || '—' },
  ]);

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.black);
  doc.text(row?.party || 'Ledger Entry', M, my + 4);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.muted);
  doc.text(`Reference: ${ref}`, M, my + 9);
  my += 16;

  const detailRows = [
    ['Project', row?.project || raw.projects?.name || 'Unassigned'],
    ['Counterparty', row?.party || raw.payee_name || raw.source_name || raw.vendors?.name || '—'],
    ['Reference / Trace', ref],
    ['Payment Method', method],
    [paymentIdentifierLabel, raw.check_reference || raw.external_reference || raw.check_number || ref],
    ['External Reference', raw.external_reference || '—'],
    ['Linked Invoice ID', raw.invoice_id || '—'],
    ['Invoice Provider', externalInvoiceProvider || '—'],
    ['Invoice Number / Confirmation', raw.external_invoice_number || raw.invoice_number || '—'],
    ['Invoice Payment Link', externalInvoiceUrl || '—'],
    ['Record Status', raw.status || row?.status || status],
    ['Payment Status', raw.payment_status?.replace?.(/_/g, ' ') || '—'],
    ['Approval Status', raw.approval_status?.replace?.(/_/g, ' ') || '—'],
    ['Reconciliation', status],
    ['Posting Date', raw.posting_date?.slice?.(0, 10) || '—'],
    ['Due Date', raw.due_date?.slice?.(0, 10) || '—'],
    ['Cleared Date', raw.cleared_date?.slice?.(0, 10) || '—'],
    ['Accounting Period', raw.accounting_period || '—'],
    ['Category', raw.category || row?.ref || '—'],
    ['Cost Type', raw.cost_type?.replace?.(/_/g, ' ') || '—'],
    ['Cost Phase', raw.cost_phase || '—'],
    ['Currency', raw.currency || 'USD'],
  ];

  autoTable(doc, {
    ...tblCfg(sectionLabel(doc, my, 'Record Detail')),
    head: [['Field', 'Value', 'Field', 'Value']],
    body: Array.from({ length: Math.ceil(detailRows.length / 2) }, (_, i) => {
      const left = detailRows[i * 2] ?? ['', ''];
      const right = detailRows[i * 2 + 1] ?? ['', ''];
      return [
        { content: left[0], styles: { fontStyle: 'bold', textColor: C.muted } },
        left[1],
        { content: right[0], styles: { fontStyle: 'bold', textColor: C.muted } },
        right[1],
      ];
    }),
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 58 },
      2: { cellWidth: 30 },
      3: { cellWidth: 58 },
    },
  });

  let y2 = (doc as any).lastAutoTable.finalY + 8;
  const financialRows = [
    ['Amount Before Tax', raw.amount_before_tax !== undefined ? fmtUSD(raw.amount_before_tax) : '—'],
    ['Tax Amount', raw.tax_amount !== undefined ? fmtUSD(raw.tax_amount) : '—'],
    ['Total Amount', raw.total_amount !== undefined ? fmtUSD(raw.total_amount) : fmtUSD(Math.abs(Number(row?.amount || 0)))],
    ['Net Amount', raw.net_amount !== undefined ? fmtUSD(raw.net_amount) : '—'],
  ];

  autoTable(doc, {
    ...tblCfg(sectionLabel(doc, y2, 'Financial Detail')),
    head: [['Metric', 'Amount']],
    body: financialRows.map(([label, value]) => [
      { content: label, styles: { fontStyle: 'bold', textColor: C.muted } },
      { content: value, styles: { halign: 'right', fontStyle: 'bold' } },
    ]),
    columnStyles: { 1: { halign: 'right' } },
  });

  y2 = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.muted);
  doc.text('MEMO / NOTES', M, y2);
  doc.setDrawColor(...C.border);
  doc.line(M + 22, y2 - 0.5, PW - M, y2 - 0.5);
  doc.setFillColor(248, 248, 248);
  doc.setDrawColor(...C.border);
  doc.rect(M, y2 + 4, PW - M * 2, 26, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C.black);
  doc.text(doc.splitTextToSize(String(memo), PW - M * 2 - 8), M + 4, y2 + 10);

  addDecorations(doc, 'Ledger Record', entityLabel);
  return doc;
}

/* ────────────────────────────────────────────
   PDF: Project Portfolio
──────────────────────────────────────────── */
export function generateProjectReport(projects: any[], entityLabel: string = 'Houston Enterprise') {
  const { doc, y } = makeDoc('Project Portfolio', 'HOU INC · Executive Project Packet', entityLabel);

  const n = (v: any) => Number(v ?? 0) || 0;
  const totalBudget = projects.reduce((s: number, p: any) => s + n(p.current_contract_value ?? p.contract_value ?? p.budget), 0);
  const totalSpent  = projects.reduce((s: number, p: any) => s + n(p.spent ?? p.total_expenses ?? p.actual_project_costs), 0);
  const totalIn     = projects.reduce((s: number, p: any) => s + n(p.incoming ?? p.total_income ?? p.total_collected), 0);
  const outstanding = projects.reduce((s: number, p: any) => s + n(p.outstanding_checks ?? p.accounts_receivable), 0);
  const net         = totalIn - totalSpent - outstanding;
  const avgUsed     = projects.length ? projects.reduce((s: number, p: any) => s + n(p.used), 0) / projects.length : 0;

  const my = drawMetrics(doc, y, [
    { label: 'Contract Value', value: fmtUSD(totalBudget) },
    { label: 'Capital Deployed', value: fmtUSD(totalSpent), color: C.negative },
    { label: 'Collected', value: fmtUSD(totalIn), color: C.positive },
    { label: 'Cash Position', value: fmtUSD(net), color: net >= 0 ? C.positive : C.negative },
  ]);

  const sy = sectionLabel(doc, my + 2, 'Portfolio Financial Summary');
  autoTable(doc, {
    ...tblCfg(sy),
    head: [['Metric', 'Value', 'Operating Meaning']],
    body: [
      ['Active project records', String(projects.length), 'Project cards included in this packet'],
      ['Average budget utilization', `${avgUsed.toFixed(1)}%`, 'Portfolio-wide cost progress against budget'],
      ['Outstanding / receivable exposure', fmtUSD(outstanding), 'Open checks, receivables, or pending cash exposure visible in project data'],
      ['Net portfolio cash position', fmtUSD(net), 'Collected revenue less deployed capital and known open exposure'],
    ],
    columnStyles: {
      0: { cellWidth: 48 },
      1: { cellWidth: 42, halign: 'right', fontStyle: 'bold' },
      2: { cellWidth: PW - M * 2 - 90 },
    },
  });

  let cy = (doc as any).lastAutoTable.finalY + 10;
  cy = sectionLabel(doc, cy, 'Project Overview Cards');

  const cardH = 38;
  const cardW = PW - M * 2;
  const drawText = (text: string, x: number, y0: number, width: number, size = 6.6, color = C.black, bold = false) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(...color);
    doc.text(doc.splitTextToSize(text || '—', width), x, y0);
  };
  const drawKV = (label: string, value: string, x: number, y0: number, width: number, color = C.black) => {
    doc.setFontSize(5.3);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.muted);
    doc.text(label.toUpperCase(), x, y0);
    doc.setFontSize(7.2);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...color);
    doc.text(value, x, y0 + 5, { maxWidth: width });
  };

  projects.forEach((p: any, index: number) => {
    if (cy + cardH > PH - 24) {
      doc.addPage();
      cy = 18;
    }

    const contract = n(p.current_contract_value ?? p.contract_value ?? p.budget);
    const spent = n(p.spent ?? p.total_expenses ?? p.actual_project_costs);
    const collected = n(p.incoming ?? p.total_income ?? p.total_collected);
    const projectNet = collected - spent - n(p.outstanding_checks);
    const used = contract > 0 ? Math.min(999, (spent / contract) * 100) : n(p.used);
    const status = String(p.status || 'active').replace(/_/g, ' ');
    const category = p.category || p.project_type || p.department || 'Project';
    const client = p.client_name_snapshot || p.client_name || p.client || p.portal_clients?.name || 'Client not assigned';
    const location = p.location || p.address || p.city || 'Location not assigned';
    const health = projectNet >= 0 && used <= 85 ? 'Healthy' : projectNet >= 0 ? 'Watch' : 'Needs review';
    const healthColor = health === 'Healthy' ? C.positive : health === 'Watch' ? C.accent : C.negative;

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.25);
    doc.rect(M, cy, cardW, cardH, 'FD');
    doc.setFillColor(...healthColor);
    doc.rect(M, cy, 1.3, cardH, 'F');

    drawText(`${index + 1}. ${p.name || 'Untitled Project'}`, M + 4, cy + 7, 82, 8.8, C.black, true);
    drawText(`${category} · ${status.toUpperCase()}`, M + 4, cy + 12.5, 82, 5.8, C.muted, true);
    drawText(`${client} · ${location}`, M + 4, cy + 18.5, 82, 6.2, C.muted);

    const kx = M + 92;
    const col = 31;
    drawKV('Contract', fmtUSD(contract), kx, cy + 8, col);
    drawKV('Spent', fmtUSD(spent), kx + col, cy + 8, col, C.negative);
    drawKV('Collected', fmtUSD(collected), kx + col * 2, cy + 8, col, C.positive);
    drawKV('Cash Position', fmtUSD(projectNet), kx + col * 3, cy + 8, col, projectNet >= 0 ? C.positive : C.negative);

    doc.setFontSize(5.3);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.muted);
    doc.text('BUDGET UTILIZATION', kx, cy + 25);
    doc.setFillColor(238, 238, 238);
    doc.rect(kx, cy + 27.2, 82, 2.2, 'F');
    doc.setFillColor(...(used > 95 ? C.negative : used > 80 ? C.accent : C.positive));
    doc.rect(kx, cy + 27.2, Math.min(82, (used / 100) * 82), 2.2, 'F');
    doc.setFontSize(6.6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.black);
    doc.text(`${used.toFixed(1)}%`, kx + 86, cy + 29);

    drawKV('Health', health, kx + 119, cy + 25, 28, healthColor);
    cy += cardH + 5;
  });

  addDecorations(doc, 'Project Portfolio', entityLabel);
  return doc;
}

/* ────────────────────────────────────────────
   PDF: Houston Enterprise Reconciliation
   Mirrors the client SOV / draw / add-on reconciliation worksheet.
──────────────────────────────────────────── */
export function generateProjectReconciliationReport({
  project,
  scopeItems,
  changeOrders,
  addOns = [],
  draws,
  payments,
  fin,
}: {
  project: any;
  scopeItems: any[];
  changeOrders: any[];
  addOns?: any[];
  draws: any[];
  payments: any[];
  fin: any;
}) {
  const { doc, y: headerY } = makeDoc('Houston Enterprise Reconciliation', project?.name || 'Project', 'Houston Enterprise', 'landscape');
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 8; // tighter than the shared M=18 — landscape needs the room for 5 draw columns
  const drawCols = draws.slice(0, 5);

  const y0 = drawMetrics(doc, headerY, [
    { label: 'Project Total with Add Ons', value: fmtUSD(fin.revised) },
    { label: 'Total Work Completed', value: fmtUSD(fin.earned) },
    { label: 'Total Paid to Date', value: fmtUSD(fin.paid) },
    { label: 'Current Balance Due', value: fmtUSD(Math.max(fin.earned - fin.paid, 0)), color: C.accent },
    { label: 'Project Balance Due', value: fmtUSD(fin.balance) },
  ]);

  const drawHead = drawCols.map((d: any) => d.scheduled_date?.slice(0, 10) || d.invoice_number || 'Draw');
  const head = [[
    'Scope / SOV',
    'Total Project',
    '% Work Completed',
    ...drawHead,
    'Total $ Value of Work Completed',
    'Balance',
  ]];
  const body = scopeItems.map((item: any) => {
    const revised = Number(item.contract_amount || 0) + Number(item.change_order_amount || 0) - Number(item.approved_credit_amount || 0);
    const earned = revised * Number(item.percent_complete || 0) / 100;
    const balance = Math.max(revised - earned, 0);
    const rowDraws = drawCols.map((d: any) => {
      const match = String(d.milestone_name || '').toLowerCase().includes(String(item.name || '').toLowerCase());
      return { content: match ? fmtUSD(d.draw_amount) : '', styles: { halign: 'right' } };
    });
    return [
      item.name || '—',
      { content: fmtUSD(revised), styles: { halign: 'right' } },
      { content: `${Number(item.percent_complete || 0).toFixed(1)}%`, styles: { halign: 'right' } },
      ...rowDraws,
      { content: fmtUSD(earned), styles: { halign: 'right', fontStyle: 'bold' } },
      { content: balance ? fmtUSD(balance) : '-', styles: { halign: 'right' } },
    ];
  });

  autoTable(doc, {
    ...tblCfg(y0),
    margin: { left: margin, right: margin, top: 14, bottom: 18 },
    head,
    body,
    columnStyles: {
      0: { cellWidth: 48 },
      1: { cellWidth: 24 },
      2: { cellWidth: 22 },
      [head[0].length - 2]: { cellWidth: 32 },
      [head[0].length - 1]: { cellWidth: 24 },
    },
    /* Every footer cell here must equal the sum of the scope-item rows
       printed above it — using project-level truths (fin.revised, fin.pctDone,
       fin.balance) would show a total the visible rows don't add up to
       whenever the Schedule of Values doesn't yet cover the full contract. */
    foot: [[
      { content: 'Totals', styles: { fontStyle: 'bold' } },
      { content: fmtUSD(fin.sovRevisedTotal ?? fin.revised), styles: { halign: 'right', fontStyle: 'bold' } },
      { content: `${Number(fin.sovPctDone ?? fin.pctDone ?? 0).toFixed(1)}%`, styles: { halign: 'right', fontStyle: 'bold' } },
      ...drawCols.map((d: any) => ({ content: fmtUSD(d.draw_amount), styles: { halign: 'right', fontStyle: 'bold' } })),
      { content: fmtUSD(fin.earned), styles: { halign: 'right', fontStyle: 'bold' } },
      { content: fmtUSD((fin.sovRevisedTotal ?? fin.revised) - fin.earned), styles: { halign: 'right', fontStyle: 'bold', textColor: C.accent } },
    ]],
  });

  let y = (doc as any).lastAutoTable.finalY + 6;
  if (y > 155) { doc.addPage(); y = 18; }

  const approvedCos = changeOrders.filter((c: any) => c.status === 'approved');
  autoTable(doc, {
    ...tblCfg(y),
    margin: { left: margin, right: pageW / 2 + 3, top: 14, bottom: 18 },
    head: [['Change Orders / Credits', 'Amount', 'Notes']],
    body: approvedCos.map((c: any) => [
      c.title,
      { content: fmtUSD((c.type === 'deduction' || c.type === 'credit') ? -Number(c.amount) : Number(c.amount)), styles: { halign: 'right' } },
      c.description || c.notes || c.approval_method || '—',
    ]),
    foot: [[
      'Change Order Total',
      { content: fmtUSD(fin.net), styles: { halign: 'right', fontStyle: 'bold' } },
      '',
    ]],
  });
  const y1 = (doc as any).lastAutoTable.finalY;

  autoTable(doc, {
    ...tblCfg(y),
    margin: { left: pageW / 2 + 3, right: margin, top: 14, bottom: 18 },
    head: [['Payments Received', 'Paid']],
    body: payments.map((p: any) => [
      p.source_name || p.description || p.transaction_date?.slice(0, 10) || 'Payment',
      { content: `(${fmtUSD(p.amount)})`, styles: { halign: 'right' } },
    ]),
    foot: [[
      'Total Paid to Date',
      { content: `(${fmtUSD(fin.paid)})`, styles: { halign: 'right', fontStyle: 'bold' } },
    ]],
  });
  const y2 = (doc as any).lastAutoTable.finalY;

  if (addOns.length > 0) {
    let addOnsY = Math.max(y1, y2) + 6;
    if (addOnsY > 165) { doc.addPage(); addOnsY = 18; }
    const approvedAddOns = addOns.filter((a: any) => a.status === 'approved');
    const addOnsNet = approvedAddOns.reduce((s: number, a: any) => s + (a.kind === 'credit' ? -Number(a.amount) : Number(a.amount)), 0);
    autoTable(doc, {
      ...tblCfg(addOnsY),
      margin: { left: margin, right: margin, top: 14, bottom: 18 },
      head: [['Add Ons', 'Pricing', 'Amount', 'Status', 'Notes']],
      body: addOns.map((a: any) => [
        a.line_item,
        a.unit_cost != null && a.unit_quantity != null ? `${a.unit_quantity} ${a.unit_label || 'units'} @ ${fmtUSD(a.unit_cost)}` : '—',
        { content: fmtUSD(a.kind === 'credit' ? -Number(a.amount) : Number(a.amount)), styles: { halign: 'right' } },
        a.approval_method || a.status,
        a.client_visible_notes || a.internal_notes || '—',
      ]),
      foot: [[
        'Add Ons Total (Approved)',
        '', { content: fmtUSD(addOnsNet), styles: { halign: 'right', fontStyle: 'bold' } }, '', '',
      ]],
    });
  }

  addDecorations(doc, 'Houston Enterprise Reconciliation', 'Houston Enterprise');
  return doc;
}

/* ────────────────────────────────────────────
   PDF: Invoice Register
──────────────────────────────────────────── */
export interface InvoiceSummary {
  invoice_number: string;
  client_name: string;
  client_company?: string;
  issue_date: string;
  due_date: string;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
}

export function generateInvoicesReport(invoices: InvoiceSummary[], entityLabel: string = 'Houston Enterprise') {
  const { doc, y } = makeDoc('Invoice Register', 'HOU INC · Billing', entityLabel);

  const totalAmt    = invoices.reduce((s, i) => s + i.total, 0);
  const paidAmt     = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);
  const outstanding = invoices.filter(i => i.status === 'sent' || i.status === 'overdue').reduce((s, i) => s + i.total, 0);
  const overdueN    = invoices.filter(i => i.status === 'overdue').length;

  const my = drawMetrics(doc, y, [
    { label: 'Total Invoiced', value: fmtUSD(totalAmt) },
    { label: 'Collected',      value: fmtUSD(paidAmt),    color: C.positive },
    { label: 'Outstanding',    value: fmtUSD(outstanding), color: C.negative },
    { label: 'Overdue',        value: String(overdueN),   color: overdueN > 0 ? C.negative : undefined },
  ]);

  const ty = sectionLabel(doc, my + 2, 'Invoice Detail');

  const rows = invoices.map(inv => [
    inv.invoice_number,
    inv.client_name,
    inv.client_company || '—',
    inv.issue_date?.slice(0, 10) || '—',
    inv.due_date?.slice(0, 10) || '—',
    {
      content: inv.status.toUpperCase(),
      styles: {
        fontStyle: 'bold',
        textColor: inv.status === 'paid' ? C.positive : inv.status === 'overdue' ? C.negative : C.black,
      },
    },
    { content: fmtUSD(inv.total), styles: { halign: 'right', fontStyle: 'bold' } },
  ]);

  autoTable(doc, {
    ...tblCfg(ty),
    head: [['Invoice #', 'Client', 'Company', 'Issued', 'Due', 'Status', 'Total']],
    body: rows,
    columnStyles: {
      0: { cellWidth: 24 },
      3: { cellWidth: 26 },
      4: { cellWidth: 26 },
      5: { cellWidth: 20 },
      6: { halign: 'right', cellWidth: 28 },
    },
    foot: [[
      { content: 'Total Invoiced', colSpan: 6, styles: { fontStyle: 'bold' } },
      { content: fmtUSD(totalAmt), styles: { halign: 'right', fontStyle: 'bold' } },
    ]],
  });

  addDecorations(doc, 'Invoice Register', entityLabel);
  return doc;
}

/* ────────────────────────────────────────────
   Excel: shared helpers
──────────────────────────────────────────── */
interface SheetDef {
  name: string;
  headers: string[];
  rows: any[][];
  colWidths?: number[];
  currencyCols?: number[];
}

// Bundles a sheet's data + title; the actual styled worksheet is built in
// writeWorkbook (exceljs, unlike the xlsx package, actually writes cell
// styles — fonts/fills/borders — to the output file, not just values).
export function buildSheet(def: SheetDef, reportTitle: string): { def: SheetDef; title: string } {
  return { def, title: reportTitle };
}

export async function writeWorkbook(
  sheets: Array<{ ws: { def: SheetDef; title: string }; name: string }>,
  filename: string,
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'HOU INC';
  wb.created = new Date();

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const HEADER_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF121212' } };
  const TITLE_FILL: ExcelJS.Fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9D7E3F' } };
  const ALT_FILL: ExcelJS.Fill    = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F8F8' } };
  const THIN_BORDER: ExcelJS.Border = { style: 'thin', color: { argb: 'FFE5E5E5' } };

  sheets.forEach(({ ws: { def, title }, name }) => {
    const sheet = wb.addWorksheet(name.slice(0, 31), { views: [{ state: 'frozen', ySplit: 5 }] });
    const lastCol = def.headers.length;

    sheet.mergeCells(1, 1, 1, lastCol);
    const titleCell = sheet.getCell(1, 1);
    titleCell.value = 'HOU INC — Houston Enterprise Financial Records';
    titleCell.font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = TITLE_FILL;
    titleCell.alignment = { vertical: 'middle', indent: 1 };
    sheet.getRow(1).height = 24;

    sheet.mergeCells(2, 1, 2, lastCol);
    const subCell = sheet.getCell(2, 1);
    subCell.value = title;
    subCell.font = { bold: true, size: 11, color: { argb: 'FF121212' } };
    subCell.alignment = { indent: 1 };

    sheet.mergeCells(3, 1, 3, lastCol);
    const genCell = sheet.getCell(3, 1);
    genCell.value = `Generated ${today}  ·  CONFIDENTIAL`;
    genCell.font = { italic: true, size: 9, color: { argb: 'FF616161' } };
    genCell.alignment = { indent: 1 };

    const headerRow = sheet.getRow(5);
    def.headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
      cell.fill = HEADER_FILL;
      cell.alignment = { vertical: 'middle' };
      cell.border = { bottom: THIN_BORDER };
    });
    headerRow.height = 18;

    def.rows.forEach((r, ri) => {
      const row = sheet.getRow(6 + ri);
      r.forEach((v, ci) => {
        const cell = row.getCell(ci + 1);
        cell.value = v;
        if (def.currencyCols?.includes(ci) && typeof v === 'number') cell.numFmt = '"$"#,##0.00';
        if (ri % 2 === 1) cell.fill = ALT_FILL;
        cell.border = { bottom: THIN_BORDER };
      });
    });

    sheet.columns = (def.colWidths ?? def.headers.map(h => Math.min(Math.max(String(h).length + 8, 14), 32)))
      .map(w => ({ width: w }));

    if (def.rows.length > 0) {
      sheet.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5 + def.rows.length, column: lastCol } };
    }
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* ────────────────────────────────────────────
   Excel: per-report downloaders
──────────────────────────────────────────── */
export function downloadTransactionExcel(data: any[], kind: 'income' | 'expense') {
  const isIncome = kind === 'income';
  const label = isIncome ? 'Income' : 'Expenses';
  const rows = data.map((t: any) => [
    t.transaction_date?.slice(0, 10) || '',
    isIncome ? (t.source_name || t.vendors?.name || '') : (t.vendors?.name || ''),
    t.projects?.name || '',
    isIncome ? (t.notes || '') : (t.category || ''),
    Number(t.amount) || 0,
  ]);
  const ws = buildSheet({
    name: label,
    headers: ['Date', isIncome ? 'Source' : 'Vendor', 'Project', isIncome ? 'Notes' : 'Category', 'Amount'],
    rows,
    colWidths: [14, 28, 22, 28, 14],
    currencyCols: [4],
  }, `${label} Ledger`);
  writeWorkbook([{ ws, name: label }], `hou-${kind}-${todayLocalDate()}.xlsx`);
}

export function downloadCheckExcel(checks: any[]) {
  const rows = checks.map((c: any) => [
    c.check_number || '',
    c.payee_name || '',
    c.issue_date?.slice(0, 10) || '',
    (c.status || '').toUpperCase(),
    c.projects?.name || '',
    c.memo || '',
    Number(c.amount) || 0,
  ]);
  const ws = buildSheet({
    name: 'Checks',
    headers: ['Check #', 'Payee', 'Issue Date', 'Status', 'Project', 'Memo', 'Amount'],
    rows,
    colWidths: [12, 28, 14, 12, 22, 30, 14],
    currencyCols: [6],
  }, 'Check Register');
  writeWorkbook([{ ws, name: 'Checks' }], `hou-check-register-${todayLocalDate()}.xlsx`);
}

export function downloadLedgerExcel(income: any[], expenses: any[], checks: any[]) {
  const HEADERS = ['Date', 'Type', 'Counterparty', 'Project', 'Reference / Category', 'Notes / Memo', 'Amount'];
  const WIDTHS  = [14, 14, 28, 22, 24, 30, 14];

  const incomeRows = income.map((t: any) => [
    t.transaction_date?.slice(0, 10) || '',
    'Income',
    t.source_name || t.vendors?.name || '',
    t.projects?.name || '',
    t.category || '',
    t.notes || '',
    Number(t.amount) || 0,
  ]);
  const expenseRows = expenses.map((t: any) => [
    t.transaction_date?.slice(0, 10) || '',
    'Expense',
    t.vendors?.name || '',
    t.projects?.name || '',
    t.category || '',
    t.notes || '',
    Number(t.amount) || 0,
  ]);
  const checkRows = checks.map((c: any) => [
    c.issue_date?.slice(0, 10) || '',
    'Check',
    c.payee_name || '',
    c.projects?.name || '',
    `#${c.check_number}`,
    c.memo || '',
    Number(c.amount) || 0,
  ]);
  const allRows = [...incomeRows, ...expenseRows, ...checkRows]
    .sort((a, b) => (a[0] as string).localeCompare(b[0] as string));

  const mkSheet = (rows: any[][], name: string, title: string) =>
    buildSheet({ name, headers: HEADERS, rows, colWidths: WIDTHS, currencyCols: [6] }, title);

  writeWorkbook([
    { ws: mkSheet(allRows,    'All Entries', 'General Ledger — All'),      name: 'All Entries' },
    { ws: mkSheet(incomeRows, 'Income',      'General Ledger — Income'),   name: 'Income' },
    { ws: mkSheet(expenseRows,'Expenses',    'General Ledger — Expenses'), name: 'Expenses' },
    { ws: mkSheet(checkRows,  'Checks',      'General Ledger — Checks'),   name: 'Checks' },
  ], `hou-general-ledger-${todayLocalDate()}.xlsx`);
}

export function downloadProjectExcel(projects: any[]) {
  const rows = projects.map((p: any) => [
    p.name || '',
    p.code || '',
    (p.status || '').toUpperCase(),
    Number(p.budget) || 0,
    Number(p.spent) || 0,
    Number(p.incoming) || 0,
    Number(p.net) || 0,
    Number(p.outstanding) || 0,
    `${(p.used || 0).toFixed(1)}%`,
  ]);
  const ws = buildSheet({
    name: 'Projects',
    headers: ['Project', 'Code', 'Status', 'Budget', 'Spent', 'Incoming', 'Net', 'Outstanding', 'Utilization'],
    rows,
    colWidths: [30, 12, 14, 16, 16, 16, 16, 16, 14],
    currencyCols: [3, 4, 5, 6, 7],
  }, 'Project Portfolio');
  writeWorkbook([{ ws, name: 'Projects' }], `hou-projects-${todayLocalDate()}.xlsx`);
}

export function downloadInvoiceExcel(invoices: InvoiceSummary[]) {
  const rows = invoices.map(inv => [
    inv.invoice_number || '',
    inv.client_name || '',
    inv.client_company || '',
    inv.issue_date?.slice(0, 10) || '',
    inv.due_date?.slice(0, 10) || '',
    inv.status.toUpperCase() || '',
    inv.subtotal || 0,
    inv.tax || 0,
    inv.total || 0,
  ]);
  const ws = buildSheet({
    name: 'Invoices',
    headers: ['Invoice #', 'Client', 'Company', 'Issued', 'Due', 'Status', 'Subtotal', 'Tax', 'Total'],
    rows,
    colWidths: [14, 24, 24, 14, 14, 12, 14, 14, 14],
    currencyCols: [6, 7, 8],
  }, 'Invoice Register');
  writeWorkbook([{ ws, name: 'Invoices' }], `hou-invoices-${todayLocalDate()}.xlsx`);
}

/* ────────────────────────────────────────────
   PDF: Glossary
──────────────────────────────────────────── */
export interface GlossaryTerm {
  term: string;
  category: string;
  definition: string;
  alias?: string;
}

const GLOSSARY_CATEGORY_ORDER = [
  'Foundation', 'Capital Movement', 'Instruments', 'Projects',
  'Transactions', 'Invoicing', 'Counterparties', 'Analytics', 'Workflows',
];

export function generateGlossaryPDF(terms: GlossaryTerm[]) {
  const { doc, y } = makeDoc('Glossary', 'HOU INC · Financial OS Reference');

  // Intro paragraph
  let cy = y;
  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.muted);
  const intro =
    'Definitions for every term, concept, and workflow inside the HOU INC Financial Operating System. ' +
    'Use this reference to understand the language of capital movement, instrument issuance, ' +
    'project accounting, and operational workflows.';
  const introLines = doc.splitTextToSize(intro, PW - 2 * M);
  doc.text(introLines, M, cy);
  cy += introLines.length * 4.2 + 5;

  // Summary metrics
  const categoryCount = [...new Set(terms.map(t => t.category))].length;
  cy = drawMetrics(doc, cy, [
    { label: 'Total Terms',  value: String(terms.length) },
    { label: 'Categories',   value: String(categoryCount) },
    { label: 'As of',        value: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) },
  ]);
  cy += 6;

  // Group by category and render
  for (const cat of GLOSSARY_CATEGORY_ORDER) {
    const catTerms = terms
      .filter(t => t.category === cat)
      .sort((a, b) => a.term.localeCompare(b.term));
    if (!catTerms.length) continue;

    cy = sectionLabel(doc, cy, cat);

    const rows = catTerms.map(t => [
      t.alias ? `${t.term}\nalso: ${t.alias}` : t.term,
      t.definition,
    ]);

    autoTable(doc, {
      startY: cy,
      margin: { left: M, right: M, top: 14, bottom: 20 },
      head: [['Term', 'Definition']],
      body: rows,
      headStyles: {
        fillColor: C.black, textColor: C.white, fontStyle: 'bold' as const, fontSize: 6.5,
        cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
      },
      bodyStyles: {
        fontSize: 7, textColor: C.black,
        cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 },
        minCellHeight: 8,
      },
      alternateRowStyles: { fillColor: C.altRow },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: 'bold' as const, valign: 'top' },
        1: { cellWidth: 129.9, valign: 'top' },
      },
      tableLineColor: C.border,
      tableLineWidth: 0.2,
    });

    cy = (doc as any).lastAutoTable.finalY + 9;
  }

  addDecorations(doc, 'Glossary');
  return doc;
}

/* ────────────────────────────────────────────
   Shared: key/value statement section (exec summaries, pay apps,
   balance sheets — anywhere a labeled figure needs a clean line item)
──────────────────────────────────────────── */
function kvSection(
  doc: jsPDF,
  y: number,
  label: string,
  rows: Array<[string, string, [number, number, number]?]>,
) {
  const sy = sectionLabel(doc, y, label);
  autoTable(doc, {
    ...tblCfg(sy),
    body: rows.map(([k, v, color]) => [
      { content: k, styles: { fontStyle: 'bold', textColor: C.muted } },
      { content: v, styles: { halign: 'right', fontStyle: 'bold', textColor: color ?? C.black } },
    ]),
    showHead: false,
    columnStyles: { 1: { halign: 'right', cellWidth: 50 } },
  });
  return (doc as any).lastAutoTable.finalY + 8;
}

/* ────────────────────────────────────────────
   Report: generic entity-branded executive summary
──────────────────────────────────────────── */
export interface ExecSummarySection { label: string; rows: Array<{ label: string; value: string; color?: [number, number, number] }> }

export function generateExecutiveSummaryReport(opts: {
  entityLabel: string;
  reportTitle: string;
  metrics: Array<{ label: string; value: string; color?: [number, number, number] }>;
  sections: ExecSummarySection[];
  narrative?: string;
}) {
  const { doc, y } = makeDoc(opts.reportTitle, `HOU INC · ${opts.entityLabel}`, opts.entityLabel);
  let cy = drawMetrics(doc, y, opts.metrics.slice(0, 4));
  for (const s of opts.sections) {
    cy = kvSection(doc, cy + 2, s.label, s.rows.map(r => [r.label, r.value, r.color] as [string, string, [number, number, number]?]));
  }
  if (opts.narrative) {
    cy = sectionLabel(doc, cy + 2, 'Notes & Assumptions');
    doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.black);
    const lines = doc.splitTextToSize(opts.narrative, pageDims(doc).w - 2 * M);
    doc.text(lines, M, cy);
  }
  addDecorations(doc, opts.reportTitle, opts.entityLabel);
  return doc;
}

/* ────────────────────────────────────────────
   Report: AR / AP Aging (shared across all entities)
──────────────────────────────────────────── */
export interface AgingRow { aging_type: string; bucket: string; open_amount: number }

function agingMap(aging: AgingRow[]) {
  const map: Record<string, number> = {};
  aging.forEach(r => { map[`${r.aging_type}:${r.bucket}`] = Number(r.open_amount) || 0; });
  return map;
}
const AGING_BUCKETS = ['current', '1-30', '31-60', '61-90', '90+'];

export function generateAgingReport(aging: AgingRow[], entityLabel: string) {
  const { doc, y } = makeDoc('AR / AP Aging', `HOU INC · ${entityLabel}`, entityLabel);
  const map = agingMap(aging);
  const arTotal = AGING_BUCKETS.reduce((s, b) => s + (map[`ar:${b}`] || 0), 0);
  const apTotal = AGING_BUCKETS.reduce((s, b) => s + (map[`ap:${b}`] || 0), 0);
  const my = drawMetrics(doc, y, [
    { label: 'Total AR Open', value: fmtUSD(arTotal), color: C.positive },
    { label: 'Total AP Open', value: fmtUSD(apTotal), color: C.negative },
    { label: '90+ Days AR', value: fmtUSD(map['ar:90+'] || 0), color: (map['ar:90+'] || 0) > 0 ? C.negative : C.positive },
    { label: 'Net Aging Exposure', value: fmtUSD(arTotal - apTotal) },
  ]);
  const ty = sectionLabel(doc, my + 2, 'Aging Buckets');
  autoTable(doc, {
    ...tblCfg(ty),
    head: [['Bucket', 'Accounts Receivable', 'Accounts Payable']],
    body: AGING_BUCKETS.map(b => [
      b === 'current' ? 'Current' : `${b} days`,
      { content: fmtUSD(map[`ar:${b}`] || 0), styles: { halign: 'right' } },
      { content: fmtUSD(map[`ap:${b}`] || 0), styles: { halign: 'right' } },
    ]),
    foot: [['Total',
      { content: fmtUSD(arTotal), styles: { halign: 'right', fontStyle: 'bold' } },
      { content: fmtUSD(apTotal), styles: { halign: 'right', fontStyle: 'bold' } },
    ]],
  });
  addDecorations(doc, 'AR / AP Aging', entityLabel);
  return doc;
}

export function downloadAgingExcel(aging: AgingRow[], entityLabel: string) {
  const map = agingMap(aging);
  const rows = AGING_BUCKETS.map(b => [b === 'current' ? 'Current' : `${b} days`, map[`ar:${b}`] || 0, map[`ap:${b}`] || 0]);
  const ws = buildSheet({ name: 'Aging', headers: ['Bucket', 'AR Open', 'AP Open'], rows, colWidths: [16, 16, 16], currencyCols: [1, 2] }, `${entityLabel} — AR / AP Aging`);
  writeWorkbook([{ ws, name: 'Aging' }], `hou-aging-${todayLocalDate()}.xlsx`);
}

/* ────────────────────────────────────────────
   Report: Vendor / Supplier / Counterparty Spend (shared, term-aware)
──────────────────────────────────────────── */
function aggregateSpend(transactions: any[], checks: any[]) {
  const byParty: Record<string, { name: string; txn: number; checks: number; count: number }> = {};
  transactions.filter((t: any) => t.type === 'expense' && t.vendor_id).forEach((t: any) => {
    const id = t.vendor_id, name = t.vendors?.name || 'Unknown';
    const row = byParty[id] ?? (byParty[id] = { name, txn: 0, checks: 0, count: 0 });
    row.txn += Number(t.amount) || 0; row.count++;
  });
  checks.filter((c: any) => c.status === 'cleared' && (c.payee_vendor_id || c.vendors?.name)).forEach((c: any) => {
    const id = c.payee_vendor_id || c.payee_name; const name = c.vendors?.name || c.payee_name || 'Unknown';
    const row = byParty[id] ?? (byParty[id] = { name, txn: 0, checks: 0, count: 0 });
    row.checks += Number(c.amount) || 0; row.count++;
  });
  return Object.values(byParty).map(v => ({ ...v, total: v.txn + v.checks })).sort((a, b) => b.total - a.total);
}

export function generateVendorSpendReport(vendors: any[], transactions: any[], checks: any[], termLabel: string, entityLabel: string = 'Houston Enterprise') {
  const { doc, y } = makeDoc(`${termLabel} Spend`, 'HOU INC · Spend Analysis', entityLabel);
  const list = aggregateSpend(transactions, checks);
  const total = list.reduce((s, v) => s + v.total, 0);
  const my = drawMetrics(doc, y, [
    { label: 'Total Spend', value: fmtUSD(total) },
    { label: `Active ${termLabel}s`, value: String(vendors.length) },
    { label: 'With Spend', value: String(list.length) },
    { label: 'Top Spend', value: list[0] ? fmtUSD(list[0].total) : fmtUSD(0) },
  ]);
  const ty = sectionLabel(doc, my + 2, `${termLabel} Detail`);
  autoTable(doc, {
    ...tblCfg(ty),
    head: [[termLabel, 'Transactions', 'Checks', 'Entries', 'Total Spend']],
    body: list.map(v => [v.name, fmtUSD(v.txn), fmtUSD(v.checks), String(v.count), { content: fmtUSD(v.total), styles: { halign: 'right', fontStyle: 'bold' } }]),
    columnStyles: { 4: { halign: 'right' } },
    foot: [[{ content: 'Total', colSpan: 4, styles: { fontStyle: 'bold' } }, { content: fmtUSD(total), styles: { halign: 'right', fontStyle: 'bold' } }]],
  });
  addDecorations(doc, `${termLabel} Spend`, entityLabel);
  return doc;
}

export function downloadVendorSpendExcel(transactions: any[], checks: any[], termLabel: string) {
  const list = aggregateSpend(transactions, checks);
  const rows = list.map(v => [v.name, v.txn, v.checks, v.count, v.total]);
  const ws = buildSheet({ name: 'Spend', headers: [termLabel, 'Transactions', 'Checks', 'Entries', 'Total'], rows, colWidths: [28, 16, 16, 12, 16], currencyCols: [1, 2, 4] }, `${termLabel} Spend`);
  writeWorkbook([{ ws, name: 'Spend' }], `hou-vendor-spend-${todayLocalDate()}.xlsx`);
}

/* ────────────────────────────────────────────
   Report: Audit & Activity Trail (shared)
──────────────────────────────────────────── */
export interface AuditEventRow { date: string; source: string; action: string; table_name?: string; user_label?: string; details?: string }

export function generateAuditTrailReport(events: AuditEventRow[], entityLabel: string) {
  const { doc, y } = makeDoc('Audit & Activity Trail', `HOU INC · ${entityLabel}`, entityLabel);
  const sources = new Set(events.map(e => e.source)).size;
  const my = drawMetrics(doc, y, [
    { label: 'Total Events', value: String(events.length) },
    { label: 'Sources', value: String(sources) },
    { label: 'Most Recent', value: events[0]?.date?.slice(0, 10) || '—' },
    { label: 'Earliest Shown', value: events[events.length - 1]?.date?.slice(0, 10) || '—' },
  ]);
  const ty = sectionLabel(doc, my + 2, 'Event Log');
  autoTable(doc, {
    ...tblCfg(ty),
    head: [['Date', 'Source', 'Action', 'Table', 'User', 'Details']],
    body: events.slice(0, 400).map(e => [
      e.date ? e.date.slice(0, 16).replace('T', ' ') : '—',
      e.source, e.action, e.table_name || '—', e.user_label || '—', e.details || '—',
    ]),
  });
  addDecorations(doc, 'Audit & Activity Trail', entityLabel);
  return doc;
}

export function downloadAuditTrailExcel(events: AuditEventRow[], entityLabel: string) {
  const rows = events.map(e => [e.date?.slice(0, 16).replace('T', ' ') || '', e.source, e.action, e.table_name || '', e.user_label || '', e.details || '']);
  const ws = buildSheet({ name: 'Activity', headers: ['Date', 'Source', 'Action', 'Table', 'User', 'Details'], rows, colWidths: [18, 14, 20, 16, 22, 40] }, `${entityLabel} — Audit Trail`);
  writeWorkbook([{ ws, name: 'Activity' }], `hou-audit-trail-${todayLocalDate()}.xlsx`);
}

/* ────────────────────────────────────────────
   Report: User & Role Access (shared)
──────────────────────────────────────────── */
export function generateRoleAccessReport(roles: any[], entityLabel: string) {
  const { doc, y } = makeDoc('User & Role Access', `HOU INC · ${entityLabel}`, entityLabel);
  const my = drawMetrics(doc, y, [
    { label: 'Total Assignments', value: String(roles.length) },
    { label: 'Active', value: String(roles.filter((r: any) => r.is_active).length) },
    { label: 'Admins', value: String(roles.filter((r: any) => r.role === 'admin' && r.is_active).length) },
  ]);
  const ty = sectionLabel(doc, my + 2, 'Role Assignments');
  autoTable(doc, {
    ...tblCfg(ty),
    head: [['User', 'Role', 'Status', 'Assigned', 'Notes']],
    body: roles.map((r: any) => [r.user_id, String(r.role).replace(/_/g, ' '), r.is_active ? 'Active' : 'Inactive', r.assigned_at?.slice(0, 10) || '—', r.notes || '—']),
  });
  addDecorations(doc, 'User & Role Access', entityLabel);
  return doc;
}

export function downloadRoleAccessExcel(roles: any[], entityLabel: string) {
  const rows = roles.map((r: any) => [r.user_id, r.role, r.is_active ? 'Active' : 'Inactive', r.assigned_at?.slice(0, 10) || '', r.notes || '']);
  const ws = buildSheet({ name: 'Roles', headers: ['User ID', 'Role', 'Status', 'Assigned', 'Notes'], rows, colWidths: [30, 18, 12, 14, 30] }, `${entityLabel} — Role Access`);
  writeWorkbook([{ ws, name: 'Roles' }], `hou-role-access-${todayLocalDate()}.xlsx`);
}

/* ────────────────────────────────────────────
   Report: Houston Enterprise · Pay Application
   HOU INC's professional equivalent of an AIA G702/G703 certificate —
   not a licensed AIA form reproduction, same structure and math.
──────────────────────────────────────────── */
export interface PayAppInput {
  projectName: string;
  clientName?: string;
  applicationNumber: number;
  periodEnding: string;
  originalContract: number;
  approvedChangeOrders: number;
  completedStoredToDate: number;
  retainagePercent: number;
  retainageHeld: number;
  previousPayments: number;
  changeOrders: Array<{ title: string; amount: number; status: string }>;
}

function payAppMath(input: PayAppInput) {
  const contractSumToDate = input.originalContract + input.approvedChangeOrders;
  const earnedLessRetainage = input.completedStoredToDate - input.retainageHeld;
  const currentPaymentDue = Math.max(earnedLessRetainage - input.previousPayments, 0);
  const balanceToFinish = Math.max(contractSumToDate - earnedLessRetainage, 0);
  return { contractSumToDate, earnedLessRetainage, currentPaymentDue, balanceToFinish };
}

export function generatePayApplicationReport(input: PayAppInput) {
  const { doc, y } = makeDoc('Application for Payment', `${input.projectName} · Application #${input.applicationNumber}`, 'Houston Enterprise');
  const m = payAppMath(input);
  const { w } = pageDims(doc);

  let cy = y;
  doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.muted);
  doc.text(`Owner / Client: ${input.clientName || 'On file'}`, M, cy);
  doc.text(`Period Ending: ${new Date(input.periodEnding).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, w - M, cy, { align: 'right' });
  cy += 8;

  cy = drawMetrics(doc, cy, [
    { label: 'Contract Sum to Date', value: fmtUSD(m.contractSumToDate) },
    { label: 'Completed & Stored', value: fmtUSD(input.completedStoredToDate) },
    { label: 'Current Payment Due', value: fmtUSD(m.currentPaymentDue), color: C.accent },
    { label: 'Balance to Finish', value: fmtUSD(m.balanceToFinish) },
  ]);

  cy = kvSection(doc, cy + 2, 'Certificate for Payment', [
    ['1. Original Contract Sum', fmtUSD(input.originalContract)],
    ['2. Net Change by Change Orders', fmtUSD(input.approvedChangeOrders)],
    ['3. Contract Sum to Date (Line 1 + 2)', fmtUSD(m.contractSumToDate)],
    ['4. Total Completed & Stored to Date', fmtUSD(input.completedStoredToDate)],
    [`5. Retainage (${input.retainagePercent.toFixed(1)}%)`, fmtUSD(input.retainageHeld)],
    ['6. Total Earned Less Retainage (Line 4 - 5)', fmtUSD(m.earnedLessRetainage)],
    ['7. Less Previous Certificates for Payment', fmtUSD(input.previousPayments)],
    ['8. CURRENT PAYMENT DUE (Line 6 - 7)', fmtUSD(m.currentPaymentDue), C.accent],
    ['9. Balance to Finish, Including Retainage (Line 3 - 6)', fmtUSD(m.balanceToFinish)],
  ]);

  if (input.changeOrders.length) {
    const ty = sectionLabel(doc, cy + 2, 'Change Order Summary');
    autoTable(doc, {
      ...tblCfg(ty),
      head: [['Change Order', 'Status', 'Amount']],
      body: input.changeOrders.map(c => [c.title, c.status, { content: fmtUSD(c.amount), styles: { halign: 'right' } }]),
      foot: [['Net Approved Change Orders', '', { content: fmtUSD(input.approvedChangeOrders), styles: { halign: 'right', fontStyle: 'bold' } }]],
    });
    cy = (doc as any).lastAutoTable.finalY + 6;
  }

  cy += 6;
  if (cy > 225) { doc.addPage(); cy = 24; }
  doc.setFontSize(6.5); doc.setFont('helvetica', 'italic'); doc.setTextColor(...C.muted);
  doc.text(
    'The undersigned contractor certifies that, to the best of its knowledge, the work covered by this application for payment has been completed in accordance with the contract documents and all amounts have been paid for work for which previous certificates were issued and payments received.',
    M, cy, { maxWidth: w - 2 * M },
  );
  cy += 16;
  doc.setDrawColor(...C.border);
  doc.line(M, cy, M + 62, cy);
  doc.line(w - M - 62, cy, w - M, cy);
  doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.muted);
  doc.text('Contractor Signature / Date', M, cy + 4);
  doc.text('Owner / Client Signature / Date', w - M - 62, cy + 4);

  addDecorations(doc, `Application for Payment #${input.applicationNumber}`, 'Houston Enterprise');
  return doc;
}

export function downloadPayApplicationExcel(input: PayAppInput) {
  const m = payAppMath(input);
  const rows: any[][] = [
    ['1. Original Contract Sum', input.originalContract],
    ['2. Net Change by Change Orders', input.approvedChangeOrders],
    ['3. Contract Sum to Date', m.contractSumToDate],
    ['4. Total Completed & Stored to Date', input.completedStoredToDate],
    [`5. Retainage (${input.retainagePercent.toFixed(1)}%)`, input.retainageHeld],
    ['6. Total Earned Less Retainage', m.earnedLessRetainage],
    ['7. Less Previous Certificates for Payment', input.previousPayments],
    ['8. Current Payment Due', m.currentPaymentDue],
    ['9. Balance to Finish Including Retainage', m.balanceToFinish],
  ];
  const ws = buildSheet({ name: 'Pay Application', headers: ['Line Item', 'Amount'], rows, colWidths: [46, 18], currencyCols: [1] }, `${input.projectName} — Application #${input.applicationNumber}`);
  writeWorkbook([{ ws, name: 'Pay Application' }], `hou-payapp-${input.applicationNumber}-${todayLocalDate()}.xlsx`);
}

/* ────────────────────────────────────────────
   Report: Houston Enterprise · Cost Code / Phase Spend
   Actual spend rolled up by cost code — no per-code budget exists in the
   schema (budgets live at the project level), so this is an honest actual-
   spend-by-code report, not a fabricated budget-vs-actual.
──────────────────────────────────────────── */
export function generateCostCodeReport(costCodes: any[], transactions: any[], entityLabel: string) {
  const { doc, y } = makeDoc('Cost Code / Phase Spend', `HOU INC · ${entityLabel}`, entityLabel);
  const spend: Record<string, { amount: number; count: number }> = {};
  transactions.filter((t: any) => t.type === 'expense' && t.cost_phase).forEach((t: any) => {
    const key = t.cost_phase;
    const row = spend[key] ?? (spend[key] = { amount: 0, count: 0 });
    row.amount += Number(t.amount) || 0; row.count++;
  });
  const known = new Set(costCodes.map((cc: any) => cc.code));
  const rows = costCodes.map((cc: any) => ({
    code: cc.code, name: cc.name, division: cc.finance_construction_divisions?.name || '—',
    amount: spend[cc.code]?.amount || 0, count: spend[cc.code]?.count || 0,
  }));
  Object.keys(spend).filter(k => !known.has(k)).forEach(k => rows.push({ code: k, name: '(unmapped phase)', division: '—', amount: spend[k].amount, count: spend[k].count }));
  rows.sort((a, b) => b.amount - a.amount);
  const total = rows.reduce((s, r) => s + r.amount, 0);

  const my = drawMetrics(doc, y, [
    { label: 'Total Coded Spend', value: fmtUSD(total) },
    { label: 'Cost Codes', value: String(costCodes.length) },
    { label: 'Codes With Spend', value: String(rows.filter(r => r.amount > 0).length) },
    { label: 'Top Code', value: rows[0] ? fmtUSD(rows[0].amount) : fmtUSD(0) },
  ]);
  const ty = sectionLabel(doc, my + 2, 'Spend by Cost Code');
  autoTable(doc, {
    ...tblCfg(ty),
    head: [['Code', 'Name', 'Division', 'Entries', 'Actual Spend']],
    body: rows.map(r => [r.code, r.name, r.division, String(r.count), { content: fmtUSD(r.amount), styles: { halign: 'right', fontStyle: 'bold' } }]),
    columnStyles: { 4: { halign: 'right' } },
    foot: [[{ content: 'Total', colSpan: 4, styles: { fontStyle: 'bold' } }, { content: fmtUSD(total), styles: { halign: 'right', fontStyle: 'bold' } }]],
  });
  addDecorations(doc, 'Cost Code / Phase Spend', entityLabel);
  return doc;
}

export function downloadCostCodeExcel(costCodes: any[], transactions: any[], entityLabel: string) {
  const spend: Record<string, number> = {};
  transactions.filter((t: any) => t.type === 'expense' && t.cost_phase).forEach((t: any) => {
    spend[t.cost_phase] = (spend[t.cost_phase] || 0) + (Number(t.amount) || 0);
  });
  const rows = costCodes.map((cc: any) => [cc.code, cc.name, cc.finance_construction_divisions?.name || '', spend[cc.code] || 0]);
  const ws = buildSheet({ name: 'Cost Codes', headers: ['Code', 'Name', 'Division', 'Actual Spend'], rows, colWidths: [12, 30, 20, 16], currencyCols: [3] }, `${entityLabel} — Cost Code Spend`);
  writeWorkbook([{ ws, name: 'Cost Codes' }], `hou-cost-codes-${todayLocalDate()}.xlsx`);
}

/* ────────────────────────────────────────────
   Report: Houston Enterprise · Fixed Assets Register
──────────────────────────────────────────── */
export function generateFixedAssetsReport(assets: any[], entityLabel: string) {
  const { doc, y } = makeDoc('Fixed Asset Register', `HOU INC · ${entityLabel} · Book Basis`, entityLabel);
  const cost = assets.reduce((s: number, a: any) => s + Number(a.cost_basis || 0), 0);
  const accum = assets.reduce((s: number, a: any) => s + Number(a.accumulated_depreciation || 0), 0);
  const nbv = assets.reduce((s: number, a: any) => s + Number(a.net_book_value || 0), 0);
  const my = drawMetrics(doc, y, [
    { label: 'Total Cost Basis', value: fmtUSD(cost) },
    { label: 'Accumulated Depreciation', value: fmtUSD(accum), color: C.negative },
    { label: 'Net Book Value', value: fmtUSD(nbv), color: C.positive },
    { label: 'Assets Tracked', value: String(assets.length) },
  ]);
  const ty = sectionLabel(doc, my + 2, 'Asset Detail');
  autoTable(doc, {
    ...tblCfg(ty),
    head: [['Asset', 'Category', 'In Service', 'Cost Basis', 'Accum. Depr.', 'Net Book Value', 'Method']],
    body: assets.map((a: any) => [
      a.asset_name, String(a.asset_category).replace(/_/g, ' '), a.placed_in_service_date?.slice(0, 10) || '—',
      fmtUSD(a.cost_basis), fmtUSD(a.accumulated_depreciation),
      { content: fmtUSD(a.net_book_value), styles: { halign: 'right', fontStyle: 'bold' } },
      String(a.depreciation_method).replace(/_/g, ' '),
    ]),
    foot: [[{ content: 'Total', colSpan: 3, styles: { fontStyle: 'bold' } },
      { content: fmtUSD(cost), styles: { fontStyle: 'bold' } },
      { content: fmtUSD(accum), styles: { fontStyle: 'bold' } },
      { content: fmtUSD(nbv), styles: { halign: 'right', fontStyle: 'bold' } }, '']],
  });
  doc.setFontSize(6); doc.setFont('helvetica', 'italic'); doc.setTextColor(...C.muted);
  const noteY = (doc as any).lastAutoTable.finalY + 5;
  doc.text('Book-basis straight-line / declining-balance depreciation for internal management reporting — not prepared as a tax (MACRS) schedule.', M, noteY);
  addDecorations(doc, 'Fixed Asset Register', entityLabel);
  return doc;
}

export function downloadFixedAssetsExcel(assets: any[], entityLabel: string) {
  const rows = assets.map((a: any) => [
    a.asset_name, a.asset_category, a.placed_in_service_date?.slice(0, 10) || '', a.depreciation_method,
    Number(a.cost_basis) || 0, Number(a.accumulated_depreciation) || 0, Number(a.net_book_value) || 0,
  ]);
  const ws = buildSheet({ name: 'Fixed Assets', headers: ['Asset', 'Category', 'In Service', 'Method', 'Cost Basis', 'Accum. Depreciation', 'Net Book Value'], rows, colWidths: [26, 16, 14, 20, 16, 18, 16], currencyCols: [4, 5, 6] }, `${entityLabel} — Fixed Asset Register`);
  writeWorkbook([{ ws, name: 'Fixed Assets' }], `hou-fixed-assets-${todayLocalDate()}.xlsx`);
}

/* ────────────────────────────────────────────
   Report: HGP · Model Profitability
──────────────────────────────────────────── */
export function generateModelProfitabilityReport(models: Array<{ model: string; units: number; revenue: number; costs: number; margin: number; marginPct: number }>) {
  const { doc, y } = makeDoc('Generator Model Profitability', 'HOU INC · Houston Generator Pros', 'Houston Generator Pros');
  const revenue = models.reduce((s, m) => s + m.revenue, 0);
  const margin = models.reduce((s, m) => s + m.margin, 0);
  const my = drawMetrics(doc, y, [
    { label: 'Delivered Revenue', value: fmtUSD(revenue) },
    { label: 'Total Margin', value: fmtUSD(margin), color: margin >= 0 ? C.positive : C.negative },
    { label: 'Models Delivered', value: String(models.length) },
    { label: 'Blended Margin', value: revenue > 0 ? `${((margin / revenue) * 100).toFixed(1)}%` : '—' },
  ]);
  const ty = sectionLabel(doc, my + 2, 'By Generator Model');
  autoTable(doc, {
    ...tblCfg(ty),
    head: [['Model', 'Units', 'Revenue', 'Job Costs', 'Margin', 'Margin %']],
    body: models.map(m => [m.model, String(m.units), fmtUSD(m.revenue), fmtUSD(m.costs),
      { content: fmtUSD(m.margin), styles: { textColor: m.margin >= 0 ? C.positive : C.negative, fontStyle: 'bold' } },
      `${m.marginPct.toFixed(1)}%`]),
    foot: [['Total', String(models.reduce((s, m) => s + m.units, 0)), fmtUSD(revenue), fmtUSD(models.reduce((s, m) => s + m.costs, 0)),
      { content: fmtUSD(margin), styles: { fontStyle: 'bold' } }, '']],
  });
  addDecorations(doc, 'Generator Model Profitability', 'Houston Generator Pros');
  return doc;
}

export function downloadModelProfitabilityExcel(models: Array<{ model: string; units: number; revenue: number; costs: number; margin: number; marginPct: number }>) {
  const rows = models.map(m => [m.model, m.units, m.revenue, m.costs, m.margin, m.marginPct]);
  const ws = buildSheet({ name: 'Model Profitability', headers: ['Model', 'Units', 'Revenue', 'Job Costs', 'Margin', 'Margin %'], rows, colWidths: [28, 10, 16, 16, 16, 12], currencyCols: [2, 3, 4] }, 'Generator Model Profitability');
  writeWorkbook([{ ws, name: 'Model Profitability' }], `hou-hgp-model-profitability-${todayLocalDate()}.xlsx`);
}

/* ────────────────────────────────────────────
   Report: HGP · Inventory Valuation
──────────────────────────────────────────── */
export function generateInventoryValuationReport(parts: any[]) {
  const { doc, y } = makeDoc('Inventory Valuation', 'HOU INC · Houston Generator Pros', 'Houston Generator Pros');
  const totalValue = parts.reduce((s: number, p: any) => s + Number(p.qty_on_hand || 0) * Number(p.unit_cost || 0), 0);
  const lowStock = parts.filter((p: any) => Number(p.qty_on_hand || 0) <= Number(p.reorder_point || 0));
  const my = drawMetrics(doc, y, [
    { label: 'Total Inventory Value', value: fmtUSD(totalValue) },
    { label: 'SKUs Tracked', value: String(parts.length) },
    { label: 'Units on Hand', value: String(parts.reduce((s: number, p: any) => s + Number(p.qty_on_hand || 0), 0)) },
    { label: 'Below Reorder Point', value: String(lowStock.length), color: lowStock.length > 0 ? C.negative : C.positive },
  ]);
  const ty = sectionLabel(doc, my + 2, 'Part Register');
  autoTable(doc, {
    ...tblCfg(ty),
    head: [['SKU', 'Name', 'Category', 'Qty on Hand', 'Unit Cost', 'Value', 'Location']],
    body: parts.map((p: any) => {
      const value = Number(p.qty_on_hand || 0) * Number(p.unit_cost || 0);
      return [p.sku || '—', p.name, String(p.category).replace(/_/g, ' '), String(p.qty_on_hand), fmtUSD(p.unit_cost),
        { content: fmtUSD(value), styles: { halign: 'right', fontStyle: 'bold' } }, p.location || '—'];
    }),
    foot: [[{ content: 'Total', colSpan: 5, styles: { fontStyle: 'bold' } }, { content: fmtUSD(totalValue), styles: { halign: 'right', fontStyle: 'bold' } }, '']],
  });
  addDecorations(doc, 'Inventory Valuation', 'Houston Generator Pros');
  return doc;
}

export function downloadInventoryValuationExcel(parts: any[]) {
  const rows = parts.map((p: any) => [p.sku || '', p.name, p.category, Number(p.qty_on_hand) || 0, Number(p.unit_cost) || 0, (Number(p.qty_on_hand) || 0) * (Number(p.unit_cost) || 0), p.location || '']);
  const ws = buildSheet({ name: 'Inventory', headers: ['SKU', 'Name', 'Category', 'Qty', 'Unit Cost', 'Value', 'Location'], rows, colWidths: [14, 26, 16, 10, 14, 14, 16], currencyCols: [4, 5] }, 'Inventory Valuation');
  writeWorkbook([{ ws, name: 'Inventory' }], `hou-hgp-inventory-valuation-${todayLocalDate()}.xlsx`);
}

/* ────────────────────────────────────────────
   Report: HGP · Low Stock / Reorder
──────────────────────────────────────────── */
export function generateLowStockReorderReport(parts: any[]) {
  const low = parts.filter((p: any) => Number(p.qty_on_hand || 0) <= Number(p.reorder_point || 0));
  const { doc, y } = makeDoc('Low Stock / Reorder', 'HOU INC · Houston Generator Pros', 'Houston Generator Pros');
  const exposure = low.reduce((s: number, p: any) => s + Number(p.reorder_qty || p.reorder_point * 2 || 0) * Number(p.unit_cost || 0), 0);
  const my = drawMetrics(doc, y, [
    { label: 'Parts Below Reorder Point', value: String(low.length), color: low.length > 0 ? C.negative : C.positive },
    { label: 'Estimated Reorder Cost', value: fmtUSD(exposure) },
    { label: 'Total SKUs', value: String(parts.length) },
  ]);
  const ty = sectionLabel(doc, my + 2, 'Reorder Queue');
  autoTable(doc, {
    ...tblCfg(ty),
    head: [['SKU', 'Name', 'On Hand', 'Reorder Point', 'Suggested Qty', 'Est. Cost', 'Preferred Vendor']],
    body: low.map((p: any) => {
      const qty = Number(p.reorder_qty || p.reorder_point * 2 || 0);
      return [p.sku || '—', p.name, String(p.qty_on_hand), String(p.reorder_point), String(qty), fmtUSD(qty * Number(p.unit_cost || 0)), p.vendors?.name || '—'];
    }),
  });
  addDecorations(doc, 'Low Stock / Reorder', 'Houston Generator Pros');
  return doc;
}

/* ────────────────────────────────────────────
   Report: HGP · Purchase Order / Procurement
──────────────────────────────────────────── */
export function generatePurchaseOrderReport(pos: any[]) {
  const { doc, y } = makeDoc('Purchase Order / Procurement', 'HOU INC · Houston Generator Pros', 'Houston Generator Pros');
  const total = pos.reduce((s: number, p: any) => s + Number(p.total_amount || 0), 0);
  const ordered = pos.filter((p: any) => p.status === 'ordered').reduce((s: number, p: any) => s + Number(p.total_amount || 0), 0);
  const my = drawMetrics(doc, y, [
    { label: 'Total Procurement', value: fmtUSD(total) },
    { label: 'In Transit (Ordered)', value: fmtUSD(ordered), color: C.accent },
    { label: 'Purchase Orders', value: String(pos.length) },
  ]);
  const ty = sectionLabel(doc, my + 2, 'Purchase Order Detail');
  autoTable(doc, {
    ...tblCfg(ty),
    head: [['PO #', 'Vendor', 'Order Date', 'Status', 'Amount']],
    body: pos.map((p: any) => [p.po_number || '—', p.vendors?.name || '—', p.order_date?.slice(0, 10) || '—',
      { content: String(p.status).toUpperCase(), styles: { fontStyle: 'bold', textColor: p.status === 'cancelled' ? C.muted : p.status === 'received' ? C.positive : C.accent } },
      { content: fmtUSD(p.total_amount), styles: { halign: 'right', fontStyle: 'bold' } }]),
    foot: [[{ content: 'Total', colSpan: 4, styles: { fontStyle: 'bold' } }, { content: fmtUSD(total), styles: { halign: 'right', fontStyle: 'bold' } }]],
  });
  addDecorations(doc, 'Purchase Order / Procurement', 'Houston Generator Pros');
  return doc;
}

export function downloadPurchaseOrderExcel(pos: any[]) {
  const rows = pos.map((p: any) => [p.po_number || '', p.vendors?.name || '', p.order_date?.slice(0, 10) || '', p.status, Number(p.total_amount) || 0]);
  const ws = buildSheet({ name: 'Purchase Orders', headers: ['PO #', 'Vendor', 'Order Date', 'Status', 'Amount'], rows, colWidths: [14, 26, 14, 12, 16], currencyCols: [4] }, 'Purchase Order / Procurement');
  writeWorkbook([{ ws, name: 'Purchase Orders' }], `hou-hgp-purchase-orders-${todayLocalDate()}.xlsx`);
}

/* ────────────────────────────────────────────
   Report: HGP · Deposits & Open Balances
──────────────────────────────────────────── */
export function generateDepositsOpenBalancesReport(jobs: any[]) {
  const { doc, y } = makeDoc('Deposits & Open Balances', 'HOU INC · Houston Generator Pros', 'Houston Generator Pros');
  const active = jobs.filter((j: any) => !['completed', 'lost'].includes(j.stage));
  const deposits = active.reduce((s: number, j: any) => s + (Number(j.deposit_amount) || 0), 0);
  const balance = active.reduce((s: number, j: any) => s + Math.max((Number(j.quoted_amount) || 0) - (Number(j.deposit_amount) || 0), 0), 0);
  const my = drawMetrics(doc, y, [
    { label: 'Deposits Held', value: fmtUSD(deposits), color: C.positive },
    { label: 'Balance Due', value: fmtUSD(balance), color: C.accent },
    { label: 'Open Jobs', value: String(active.length) },
  ]);
  const withBalance = active.filter((j: any) => (Number(j.quoted_amount) || 0) - (Number(j.deposit_amount) || 0) > 0);
  const ty = sectionLabel(doc, my + 2, 'Jobs With Open Balance');
  autoTable(doc, {
    ...tblCfg(ty),
    head: [['Customer', 'Stage', 'Quoted', 'Collected', 'Balance Due']],
    body: withBalance.map((j: any) => [j.customer_name, String(j.stage).replace(/_/g, ' '), fmtUSD(j.quoted_amount), fmtUSD(j.deposit_amount),
      { content: fmtUSD(Math.max((Number(j.quoted_amount) || 0) - (Number(j.deposit_amount) || 0), 0)), styles: { halign: 'right', fontStyle: 'bold', textColor: C.accent } }]),
    foot: [[{ content: 'Total Open Balance', colSpan: 4, styles: { fontStyle: 'bold' } }, { content: fmtUSD(balance), styles: { halign: 'right', fontStyle: 'bold' } }]],
  });
  addDecorations(doc, 'Deposits & Open Balances', 'Houston Generator Pros');
  return doc;
}

/* ────────────────────────────────────────────
   Report: HGP · Warranty Expiration
──────────────────────────────────────────── */
export function generateWarrantyExpirationReport(units: any[]) {
  const { doc, y } = makeDoc('Warranty Expiration', 'HOU INC · Houston Generator Pros', 'Houston Generator Pros');
  const withWarranty = units.filter((u: any) => u.warranty_end);
  const today = new Date();
  const expiring90 = withWarranty.filter((u: any) => {
    const d = new Date(u.warranty_end); const days = (d.getTime() - today.getTime()) / 86400000;
    return days >= 0 && days <= 90;
  });
  const expired = withWarranty.filter((u: any) => new Date(u.warranty_end) < today);
  const my = drawMetrics(doc, y, [
    { label: 'Units With Warranty', value: String(withWarranty.length) },
    { label: 'Expiring Next 90 Days', value: String(expiring90.length), color: expiring90.length > 0 ? C.accent : C.positive },
    { label: 'Already Expired', value: String(expired.length), color: expired.length > 0 ? C.negative : C.positive },
  ]);
  const sorted = [...withWarranty].sort((a, b) => String(a.warranty_end).localeCompare(String(b.warranty_end)));
  const ty = sectionLabel(doc, my + 2, 'Units by Warranty Expiration');
  autoTable(doc, {
    ...tblCfg(ty),
    head: [['Model', 'Serial #', 'Customer', 'Install Date', 'Warranty End', 'Status']],
    body: sorted.map((u: any) => {
      const isExpired = new Date(u.warranty_end) < today;
      return [u.model, u.serial_number || '—', u.customer_name || '—', u.install_date?.slice(0, 10) || '—', u.warranty_end?.slice(0, 10),
        { content: isExpired ? 'EXPIRED' : 'ACTIVE', styles: { fontStyle: 'bold', textColor: isExpired ? C.negative : C.positive } }];
    }),
  });
  addDecorations(doc, 'Warranty Expiration', 'Houston Generator Pros');
  return doc;
}

/* ────────────────────────────────────────────
   Report: HGP · Customer Site Registry
──────────────────────────────────────────── */
export function generateCustomerSiteRegistryReport(sites: any[]) {
  const { doc, y } = makeDoc('Customer Site Registry', 'HOU INC · Houston Generator Pros', 'Houston Generator Pros');
  const geocoded = sites.filter((s: any) => s.latitude && s.longitude).length;
  const my = drawMetrics(doc, y, [
    { label: 'Registered Sites', value: String(sites.length) },
    { label: 'Mapped / Geocoded', value: String(geocoded) },
    { label: 'Under Agreement', value: String(sites.filter((s: any) => s.agreement_id).length) },
  ]);
  const ty = sectionLabel(doc, my + 2, 'Site Detail');
  autoTable(doc, {
    ...tblCfg(ty),
    head: [['Customer', 'Address', 'City', 'Utility', 'Under Agreement']],
    body: sites.map((s: any) => [s.customer_name, s.site_address || '—', s.city || '—', s.utility_provider || '—', s.agreement_id ? 'Yes' : 'No']),
  });
  addDecorations(doc, 'Customer Site Registry', 'Houston Generator Pros');
  return doc;
}

/* ────────────────────────────────────────────
   Report: HGP · Service Visit Revenue
──────────────────────────────────────────── */
export function generateServiceVisitRevenueReport(visits: any[]) {
  const { doc, y } = makeDoc('Service Visit Revenue', 'HOU INC · Houston Generator Pros', 'Houston Generator Pros');
  const completed = visits.filter((v: any) => v.status === 'completed');
  const revenue = completed.reduce((s: number, v: any) => s + (Number(v.revenue) || 0), 0);
  const cost = completed.reduce((s: number, v: any) => s + (Number(v.cost) || 0), 0);
  const my = drawMetrics(doc, y, [
    { label: 'Completed Visits', value: String(completed.length) },
    { label: 'Visit Revenue', value: fmtUSD(revenue), color: C.positive },
    { label: 'Visit Margin', value: fmtUSD(revenue - cost), color: revenue - cost >= 0 ? C.positive : C.negative },
  ]);
  const byType: Record<string, { revenue: number; count: number }> = {};
  completed.forEach((v: any) => {
    const row = byType[v.visit_type] ?? (byType[v.visit_type] = { revenue: 0, count: 0 });
    row.revenue += Number(v.revenue) || 0; row.count++;
  });
  const ty = sectionLabel(doc, my + 2, 'Revenue by Visit Type');
  autoTable(doc, {
    ...tblCfg(ty),
    head: [['Visit Type', 'Visits', 'Revenue']],
    body: Object.entries(byType).map(([type, r]) => [String(type).replace(/_/g, ' '), String(r.count), fmtUSD(r.revenue)]),
    foot: [['Total', String(completed.length), { content: fmtUSD(revenue), styles: { halign: 'right', fontStyle: 'bold' } }]],
  });
  addDecorations(doc, 'Service Visit Revenue', 'Houston Generator Pros');
  return doc;
}

/* ────────────────────────────────────────────
   Report: Holdings · Notes Payable / Receivable
──────────────────────────────────────────── */
export function generateNotesReport(notes: any[]) {
  const { doc, y } = makeDoc('Notes Payable / Receivable', 'HOU INC · Houston Enterprise Holdings', 'Houston Enterprise Holdings');
  const receivable = notes.filter((n: any) => n.direction === 'receivable' && n.status === 'active').reduce((s: number, n: any) => s + Number(n.outstanding_balance || 0), 0);
  const payable = notes.filter((n: any) => n.direction === 'payable' && n.status === 'active').reduce((s: number, n: any) => s + Number(n.outstanding_balance || 0), 0);
  const my = drawMetrics(doc, y, [
    { label: 'Notes Receivable', value: fmtUSD(receivable), color: C.positive },
    { label: 'Notes Payable', value: fmtUSD(payable), color: C.negative },
    { label: 'Net Position', value: fmtUSD(receivable - payable), color: receivable - payable >= 0 ? C.positive : C.negative },
    { label: 'Active Notes', value: String(notes.filter((n: any) => n.status === 'active').length) },
  ]);
  const ty = sectionLabel(doc, my + 2, 'Note Detail');
  autoTable(doc, {
    ...tblCfg(ty),
    head: [['Counterparty', 'Direction', 'Type', 'Principal', 'Outstanding', 'Rate', 'Maturity', 'Status']],
    body: notes.map((n: any) => [n.counterparty_name, n.direction === 'receivable' ? 'Receivable' : 'Payable', String(n.note_type).replace(/_/g, ' '),
      fmtUSD(n.principal), { content: fmtUSD(n.outstanding_balance), styles: { fontStyle: 'bold', textColor: n.direction === 'receivable' ? C.positive : C.negative } },
      `${Number(n.interest_rate || 0).toFixed(2)}%`, n.maturity_date?.slice(0, 10) || '—', String(n.status).replace(/_/g, ' ')]),
  });
  addDecorations(doc, 'Notes Payable / Receivable', 'Houston Enterprise Holdings');
  return doc;
}

export function downloadNotesExcel(notes: any[]) {
  const rows = notes.map((n: any) => [n.counterparty_name, n.direction, n.note_type, Number(n.principal) || 0, Number(n.outstanding_balance) || 0, Number(n.interest_rate) || 0, n.maturity_date?.slice(0, 10) || '', n.status]);
  const ws = buildSheet({ name: 'Notes', headers: ['Counterparty', 'Direction', 'Type', 'Principal', 'Outstanding', 'Rate %', 'Maturity', 'Status'], rows, colWidths: [24, 12, 18, 16, 16, 10, 14, 12], currencyCols: [3, 4] }, 'Notes Payable / Receivable');
  writeWorkbook([{ ws, name: 'Notes' }], `hou-holdings-notes-${todayLocalDate()}.xlsx`);
}

/* ────────────────────────────────────────────
   Report: Holdings · Capital Activity
──────────────────────────────────────────── */
export function generateCapitalActivityReport(activity: any[]) {
  const { doc, y } = makeDoc('Capital Activity', 'HOU INC · Houston Enterprise Holdings', 'Houston Enterprise Holdings');
  const sum = (t: string) => activity.filter((a: any) => a.activity_type === t).reduce((s: number, a: any) => s + Number(a.amount || 0), 0);
  const my = drawMetrics(doc, y, [
    { label: 'Contributions ITD', value: fmtUSD(sum('capital_contribution')), color: C.positive },
    { label: 'Distributions ITD', value: fmtUSD(sum('distribution')), color: C.negative },
    { label: 'Dividends ITD', value: fmtUSD(sum('dividend')), color: C.negative },
    { label: 'Total Activity', value: String(activity.length) },
  ]);
  const ty = sectionLabel(doc, my + 2, 'Activity Detail');
  autoTable(doc, {
    ...tblCfg(ty),
    head: [['Date', 'Type', 'Related Entity', 'Amount', 'Memo']],
    body: activity.map((a: any) => [a.activity_date?.slice(0, 10), String(a.activity_type).replace(/_/g, ' '), a.related_entity_id || '—',
      { content: fmtUSD(a.amount), styles: { halign: 'right', fontStyle: 'bold' } }, a.memo || '—']),
  });
  addDecorations(doc, 'Capital Activity', 'Houston Enterprise Holdings');
  return doc;
}

export function downloadCapitalActivityExcel(activity: any[]) {
  const rows = activity.map((a: any) => [a.activity_date?.slice(0, 10) || '', a.activity_type, a.related_entity_id || '', Number(a.amount) || 0, a.memo || '']);
  const ws = buildSheet({ name: 'Capital Activity', headers: ['Date', 'Type', 'Related Entity', 'Amount', 'Memo'], rows, colWidths: [14, 20, 20, 16, 30], currencyCols: [3] }, 'Capital Activity');
  writeWorkbook([{ ws, name: 'Capital Activity' }], `hou-holdings-capital-activity-${todayLocalDate()}.xlsx`);
}

/* ────────────────────────────────────────────
   Report: Holdings · Covenant Compliance
──────────────────────────────────────────── */
export function generateCovenantComplianceReport(covenants: any[]) {
  const { doc, y } = makeDoc('Covenant Compliance', 'HOU INC · Houston Enterprise Holdings', 'Houston Enterprise Holdings');
  const breached = covenants.filter((c: any) => c.status === 'breached').length;
  const atRisk = covenants.filter((c: any) => c.status === 'at_risk').length;
  const my = drawMetrics(doc, y, [
    { label: 'Covenants Tracked', value: String(covenants.length) },
    { label: 'In Compliance', value: String(covenants.filter((c: any) => c.status === 'compliant').length), color: C.positive },
    { label: 'At Risk', value: String(atRisk), color: atRisk > 0 ? C.accent : C.positive },
    { label: 'Breached', value: String(breached), color: breached > 0 ? C.negative : C.positive },
  ]);
  const ty = sectionLabel(doc, my + 2, 'Covenant Detail');
  autoTable(doc, {
    ...tblCfg(ty),
    head: [['Covenant', 'Note', 'Required', 'Current', 'Status', 'Last Tested']],
    body: covenants.map((c: any) => [c.name, c.holdings_notes?.counterparty_name || '—', c.threshold_value != null ? String(c.threshold_value) : '—',
      c.current_value != null ? String(c.current_value) : '—',
      { content: String(c.status).replace(/_/g, ' ').toUpperCase(), styles: { fontStyle: 'bold', textColor: c.status === 'breached' ? C.negative : c.status === 'at_risk' ? C.accent : C.positive } },
      c.last_tested_date?.slice(0, 10) || '—']),
  });
  addDecorations(doc, 'Covenant Compliance', 'Houston Enterprise Holdings');
  return doc;
}

/* ────────────────────────────────────────────
   Report: Holdings · Balance Sheet (management basis)
──────────────────────────────────────────── */
export interface HoldingsBalanceSheet {
  as_of_date: string; cash_position: number; notes_receivable: number; total_assets: number;
  notes_payable: number; total_liabilities: number; owners_equity: number;
  capital_contributions_itd: number; distributions_itd: number; dividends_itd: number;
  management_fees_itd: number; tax_reserves_itd: number; intercompany_transfers_itd: number;
}

export function generateBalanceSheetReport(bs: HoldingsBalanceSheet) {
  const { doc, y } = makeDoc('Statement of Financial Position', `HOU INC · Houston Enterprise Holdings · As of ${fmtDateLong(bs.as_of_date)}`, 'Houston Enterprise Holdings');
  let cy = drawMetrics(doc, y, [
    { label: 'Total Assets', value: fmtUSD(bs.total_assets) },
    { label: 'Total Liabilities', value: fmtUSD(bs.total_liabilities) },
    { label: "Owners' Equity", value: fmtUSD(bs.owners_equity), color: bs.owners_equity >= 0 ? C.positive : C.negative },
  ]);
  cy = kvSection(doc, cy + 2, 'Assets', [
    ['Cash Position (net of all-time income, expense, cleared checks)', fmtUSD(bs.cash_position)],
    ['Notes Receivable (active)', fmtUSD(bs.notes_receivable)],
    ['TOTAL ASSETS', fmtUSD(bs.total_assets), C.accent],
  ]);
  cy = kvSection(doc, cy, 'Liabilities', [
    ['Notes Payable (active)', fmtUSD(bs.notes_payable)],
    ['TOTAL LIABILITIES', fmtUSD(bs.total_liabilities), C.accent],
  ]);
  cy = kvSection(doc, cy, "Owners' Equity", [
    ["Owners' Equity (Total Assets - Total Liabilities)", fmtUSD(bs.owners_equity), C.accent],
  ]);
  cy = kvSection(doc, cy, 'Capital Activity Since Inception (supplementary)', [
    ['Capital Contributions', fmtUSD(bs.capital_contributions_itd)],
    ['Distributions', fmtUSD(-bs.distributions_itd)],
    ['Dividends', fmtUSD(-bs.dividends_itd)],
    ['Management Fees Collected', fmtUSD(bs.management_fees_itd)],
    ['Tax Reserve Transfers', fmtUSD(bs.tax_reserves_itd)],
    ['Intercompany Transfers', fmtUSD(bs.intercompany_transfers_itd)],
  ]);
  doc.setFontSize(6.5); doc.setFont('helvetica', 'italic'); doc.setTextColor(...C.muted);
  const lines = doc.splitTextToSize(
    'Management-basis statement. This platform maintains a cash/transaction ledger rather than full double-entry books with dedicated equity accounts — Owners’ Equity above is therefore reported as a residual (Total Assets less Total Liabilities), and capital activity is shown separately as supporting context rather than forced to reconcile line-by-line against it. Not prepared under GAAP.',
    pageDims(doc).w - 2 * M,
  );
  doc.text(lines, M, cy + 2);
  addDecorations(doc, 'Statement of Financial Position', 'Houston Enterprise Holdings');
  return doc;
}

export function downloadBalanceSheetExcel(bs: HoldingsBalanceSheet) {
  const rows: any[][] = [
    ['Cash Position', bs.cash_position], ['Notes Receivable', bs.notes_receivable], ['Total Assets', bs.total_assets],
    ['Notes Payable', bs.notes_payable], ['Total Liabilities', bs.total_liabilities],
    ["Owners' Equity", bs.owners_equity],
    ['Capital Contributions ITD', bs.capital_contributions_itd], ['Distributions ITD', -bs.distributions_itd], ['Dividends ITD', -bs.dividends_itd],
    ['Management Fees ITD', bs.management_fees_itd], ['Tax Reserves ITD', bs.tax_reserves_itd], ['Intercompany Transfers ITD', bs.intercompany_transfers_itd],
  ];
  const ws = buildSheet({ name: 'Balance Sheet', headers: ['Line Item', 'Amount'], rows, colWidths: [40, 18], currencyCols: [1] }, `Statement of Financial Position — As of ${fmtDateLong(bs.as_of_date)}`);
  writeWorkbook([{ ws, name: 'Balance Sheet' }], `hou-holdings-balance-sheet-${todayLocalDate()}.xlsx`);
}

function fmtDateLong(s: string) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

/* ────────────────────────────────────────────
   Report: Holdings · Consolidated Board Packet
   The single document a board member, lender, or investor gets — entity
   performance, notes/debt, covenants, capital activity, pending approvals,
   maturity risk, and the balance sheet in one PDF.
──────────────────────────────────────────── */
export function generateBoardPacketReport(opts: {
  periodLabel: string;
  balanceSheet: HoldingsBalanceSheet;
  entityPerformance: Array<{ entity_id: string; entity_name?: string; net_income?: number; revenue?: number; expenses?: number }>;
  notes: any[];
  covenants: any[];
  capitalActivity: any[];
  pendingApprovals: any[];
  managementNotes?: string;
}) {
  const { doc, y } = makeDoc('Consolidated Board Packet', `HOU INC · Houston Enterprise Holdings · ${opts.periodLabel}`, 'Houston Enterprise Holdings');
  const activeNotes = opts.notes.filter((n: any) => n.status === 'active');
  const maturingSoon = activeNotes.filter((n: any) => {
    if (!n.maturity_date) return false;
    const days = (new Date(n.maturity_date).getTime() - Date.now()) / 86400000;
    return days >= 0 && days <= 180;
  });

  let cy = drawMetrics(doc, y, [
    { label: 'Total Assets', value: fmtUSD(opts.balanceSheet.total_assets) },
    { label: "Owners' Equity", value: fmtUSD(opts.balanceSheet.owners_equity), color: opts.balanceSheet.owners_equity >= 0 ? C.positive : C.negative },
    { label: 'Maturing Within 180d', value: String(maturingSoon.length), color: maturingSoon.length > 0 ? C.accent : C.positive },
    { label: 'Pending Approvals', value: String(opts.pendingApprovals.length), color: opts.pendingApprovals.length > 0 ? C.accent : C.positive },
  ]);

  cy = kvSection(doc, cy + 2, 'Statement of Financial Position (Summary)', [
    ['Total Assets', fmtUSD(opts.balanceSheet.total_assets)],
    ['Total Liabilities', fmtUSD(opts.balanceSheet.total_liabilities)],
    ["Owners' Equity", fmtUSD(opts.balanceSheet.owners_equity), C.accent],
  ]);

  if (opts.entityPerformance.length) {
    const ty = sectionLabel(doc, cy + 2, 'Consolidated Entity Performance');
    autoTable(doc, {
      ...tblCfg(ty),
      head: [['Entity', 'Revenue', 'Expenses', 'Net Income']],
      body: opts.entityPerformance.map((e: any) => [e.entity_name || e.entity_id, fmtUSD(e.revenue || 0), fmtUSD(e.expenses || 0),
        { content: fmtUSD(e.net_income || 0), styles: { fontStyle: 'bold', textColor: (e.net_income || 0) >= 0 ? C.positive : C.negative } }]),
    });
    cy = (doc as any).lastAutoTable.finalY + 8;
  }

  if (activeNotes.length) {
    const ty = sectionLabel(doc, cy, 'Notes & Debt Service');
    autoTable(doc, {
      ...tblCfg(ty),
      head: [['Counterparty', 'Direction', 'Outstanding', 'Rate', 'Maturity']],
      body: activeNotes.map((n: any) => [n.counterparty_name, n.direction, fmtUSD(n.outstanding_balance), `${Number(n.interest_rate || 0).toFixed(2)}%`, n.maturity_date?.slice(0, 10) || '—']),
    });
    cy = (doc as any).lastAutoTable.finalY + 8;
  }

  if (opts.covenants.length) {
    const ty = sectionLabel(doc, cy, 'Covenant Compliance');
    autoTable(doc, {
      ...tblCfg(ty),
      head: [['Covenant', 'Status', 'Last Tested']],
      body: opts.covenants.map((c: any) => [c.name,
        { content: String(c.status).replace(/_/g, ' ').toUpperCase(), styles: { fontStyle: 'bold', textColor: c.status === 'breached' ? C.negative : c.status === 'at_risk' ? C.accent : C.positive } },
        c.last_tested_date?.slice(0, 10) || '—']),
    });
    cy = (doc as any).lastAutoTable.finalY + 8;
  }

  if (opts.pendingApprovals.length) {
    const ty = sectionLabel(doc, cy, 'Pending Capital Approvals');
    autoTable(doc, {
      ...tblCfg(ty),
      head: [['Type', 'Amount', 'Requested']],
      body: opts.pendingApprovals.map((a: any) => [String(a.activity_type).replace(/_/g, ' '), fmtUSD(a.amount), a.activity_date?.slice(0, 10) || '—']),
    });
    cy = (doc as any).lastAutoTable.finalY + 8;
  }

  if (opts.managementNotes) {
    cy = sectionLabel(doc, cy, 'Management Notes & Assumptions');
    doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.black);
    doc.text(doc.splitTextToSize(opts.managementNotes, pageDims(doc).w - 2 * M), M, cy);
  }

  addDecorations(doc, 'Consolidated Board Packet', 'Houston Enterprise Holdings');
  return doc;
}

/* ────────────────────────────────────────────
   Report: HGP · Technician Workload
──────────────────────────────────────────── */
export function generateTechnicianWorkloadReport(jobs: any[], visits: any[]) {
  const { doc, y } = makeDoc('Technician Workload', 'HOU INC · Houston Generator Pros', 'Houston Generator Pros');
  const byTech: Record<string, { jobs: number; visits: number; hours: number; revenue: number }> = {};
  const bump = (name: string) => byTech[name] ?? (byTech[name] = { jobs: 0, visits: 0, hours: 0, revenue: 0 });
  jobs.filter((j: any) => j.technician && !['completed', 'lost'].includes(j.stage)).forEach((j: any) => {
    bump(j.technician).jobs += 1;
  });
  visits.filter((v: any) => v.technician).forEach((v: any) => {
    const row = bump(v.technician);
    row.visits += 1; row.hours += Number(v.labor_hours) || 0; row.revenue += Number(v.revenue) || 0;
  });
  const rows = Object.entries(byTech).map(([name, r]) => ({ name, ...r })).sort((a, b) => (b.jobs + b.visits) - (a.jobs + a.visits));
  const my = drawMetrics(doc, y, [
    { label: 'Technicians', value: String(rows.length) },
    { label: 'Open Jobs Assigned', value: String(rows.reduce((s, r) => s + r.jobs, 0)) },
    { label: 'Logged Visits', value: String(rows.reduce((s, r) => s + r.visits, 0)) },
    { label: 'Visit Revenue', value: fmtUSD(rows.reduce((s, r) => s + r.revenue, 0)), color: C.positive },
  ]);
  const ty = sectionLabel(doc, my + 2, 'By Technician');
  autoTable(doc, {
    ...tblCfg(ty),
    head: [['Technician', 'Open Jobs', 'Visits', 'Labor Hours', 'Visit Revenue']],
    body: rows.map(r => [r.name, String(r.jobs), String(r.visits), r.hours.toFixed(1), fmtUSD(r.revenue)]),
  });
  addDecorations(doc, 'Technician Workload', 'Houston Generator Pros');
  return doc;
}

/* ────────────────────────────────────────────
   Report: HGP · Service Agreement Renewals
──────────────────────────────────────────── */
export function generateServiceAgreementRenewalReport(agreements: any[]) {
  const { doc, y } = makeDoc('Service Agreement Renewals', 'HOU INC · Houston Generator Pros', 'Houston Generator Pros');
  const active = agreements.filter((a: any) => a.status === 'active');
  const today = new Date();
  const expiring90 = active.filter((a: any) => a.end_date && (new Date(a.end_date).getTime() - today.getTime()) / 86400000 <= 90);
  const annualValue = active.reduce((s: number, a: any) => s + (Number(a.annual_value) || 0), 0);
  const my = drawMetrics(doc, y, [
    { label: 'Active Agreements', value: String(active.length) },
    { label: 'Renewing Within 90 Days', value: String(expiring90.length), color: expiring90.length > 0 ? C.accent : C.positive },
    { label: 'Recurring Annual Value', value: fmtUSD(annualValue), color: C.positive },
  ]);
  const ty = sectionLabel(doc, my + 2, 'Agreement Detail');
  autoTable(doc, {
    ...tblCfg(ty),
    head: [['Customer', 'Plan', 'Annual Value', 'Visits / Year', 'End Date', 'Status']],
    body: [...active].sort((a, b) => String(a.end_date || '9999').localeCompare(String(b.end_date || '9999'))).map((a: any) => [
      a.customer_name, String(a.plan).replace(/_/g, ' '), fmtUSD(a.annual_value), String(a.visits_per_year),
      a.end_date?.slice(0, 10) || 'Open-ended',
      { content: a.end_date && (new Date(a.end_date).getTime() - today.getTime()) / 86400000 <= 90 ? 'RENEWING SOON' : 'ACTIVE',
        styles: { fontStyle: 'bold', textColor: a.end_date && (new Date(a.end_date).getTime() - today.getTime()) / 86400000 <= 90 ? C.accent : C.positive } },
    ]),
  });
  addDecorations(doc, 'Service Agreement Renewals', 'Houston Generator Pros');
  return doc;
}

/* ────────────────────────────────────────────
   Report: HGP · Emergency Service / Outage Response
──────────────────────────────────────────── */
export function generateEmergencyResponseReport(jobs: any[], impacts: any[]) {
  const { doc, y } = makeDoc('Emergency Service / Outage Response', 'HOU INC · Houston Generator Pros', 'Houston Generator Pros');
  const emergencyJobs = jobs.filter((j: any) => j.emergency);
  const revenue = emergencyJobs.reduce((s: number, j: any) => s + (Number(j.quoted_amount) || 0), 0);
  const matched = impacts.filter((i: any) => i.hgp_customer_sites);
  const my = drawMetrics(doc, y, [
    { label: 'Emergency Jobs', value: String(emergencyJobs.length) },
    { label: 'Emergency Revenue', value: fmtUSD(revenue), color: C.positive },
    { label: 'Outage-Matched Sites', value: String(matched.length) },
    { label: 'Open Emergencies', value: String(emergencyJobs.filter((j: any) => !['completed', 'lost'].includes(j.stage)).length), color: C.negative },
  ]);
  const ty = sectionLabel(doc, my + 2, 'Emergency Job Detail');
  autoTable(doc, {
    ...tblCfg(ty),
    head: [['Customer', 'Stage', 'Technician', 'Dispatch', 'Quoted']],
    body: emergencyJobs.map((j: any) => [j.customer_name, String(j.stage).replace(/_/g, ' '), j.technician || '—', String(j.dispatch_status || 'unassigned').replace(/_/g, ' '), fmtUSD(j.quoted_amount)]),
  });
  addDecorations(doc, 'Emergency Service / Outage Response', 'Houston Generator Pros');
  return doc;
}

/* ────────────────────────────────────────────
   Report: Documents (shared)
──────────────────────────────────────────── */
export function generateDocumentsReport(documents: any[], entityLabel: string) {
  const { doc, y } = makeDoc('Documents Report', `HOU INC · ${entityLabel}`, entityLabel);
  const byType: Record<string, number> = {};
  documents.forEach((d: any) => { byType[d.doc_type] = (byType[d.doc_type] || 0) + 1; });
  const my = drawMetrics(doc, y, [
    { label: 'Total Documents', value: String(documents.length) },
    { label: 'Document Types', value: String(Object.keys(byType).length) },
    { label: 'OCR Processed', value: String(documents.filter((d: any) => d.ocr_status === 'complete').length) },
  ]);
  const ty = sectionLabel(doc, my + 2, 'Document Register');
  autoTable(doc, {
    ...tblCfg(ty),
    head: [['Title', 'Type', 'Tags', 'Uploaded', 'Linked To']],
    body: documents.slice(0, 400).map((d: any) => [
      d.title || d.file_name, String(d.doc_type).replace(/_/g, ' '), (d.tags || []).join(', ') || '—',
      d.created_at?.slice(0, 10) || '—',
      d.linked_project_id ? 'Project' : d.linked_transaction_id ? 'Transaction' : d.linked_invoice_id ? 'Invoice' : d.linked_check_id ? 'Check' : '—',
    ]),
  });
  addDecorations(doc, 'Documents Report', entityLabel);
  return doc;
}

/* ────────────────────────────────────────────
   Legacy / utility helpers
──────────────────────────────────────────── */
export function downloadCSV(
  data: any[],
  filename: string,
  headers: string[],
  getter: (row: any) => any[]
) {
  const rows = [
    headers.join(','),
    ...data.map(row =>
      getter(row).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
    ),
  ];
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function savePDF(doc: jsPDF, filename: string) {
  doc.save(filename);
}
