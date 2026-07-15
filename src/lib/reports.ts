import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';

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

/* ── PDF building blocks ── */

export function makeDoc(title: string, sub: string, orientation: 'portrait' | 'landscape' = 'portrait'): { doc: jsPDF; y: number } {
  const doc = new jsPDF({ format: 'letter', unit: 'mm', orientation });
  const { w } = pageDims(doc);

  // Thin enterprise document header
  doc.setFillColor(...C.accent);
  doc.rect(0, 0, w, 1.4, 'F');

  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.25);
  doc.line(M, 22, w - M, 22);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.black);
  doc.text('HOU INC', M, 11.5);
  doc.setFontSize(6.2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.muted);
  doc.text('Houston Enterprise Financial Records', M, 16);
  doc.setFontSize(5.4);
  doc.setTextColor(...C.muted);
  doc.text(fmtGeneratedAt(), M, 19.8);

  doc.setFontSize(6.4);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.muted);
  doc.text(sub, w - M, 10.5, { align: 'right', maxWidth: 82 });
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.black);
  doc.text(title, w - M, 17, { align: 'right', maxWidth: 92 });

  return { doc, y: 28 };
}

interface Metric { label: string; value: string; color?: [number, number, number] }

export function drawMetrics(doc: jsPDF, y: number, metrics: Metric[]): number {
  const { w } = pageDims(doc);
  const n = metrics.length;
  const gap = 3;
  const bw = (w - 2 * M - gap * (n - 1)) / n;
  metrics.forEach((m, i) => {
    const x = M + i * (bw + gap);
    doc.setFillColor(248, 248, 248);
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.25);
    doc.rect(x, y, bw, 15, 'FD');
    // Left accent edge
    doc.setFillColor(...(m.color ?? C.accent));
    doc.rect(x, y, 1.4, 15, 'F');
    doc.setFontSize(5.6); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.muted);
    doc.text(m.label.toUpperCase(), x + 3.4, y + 6);
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...(m.color ?? C.black));
    doc.text(m.value, x + 3.4, y + 12.2, { maxWidth: bw - 5 });
  });
  return y + 19;
}

export function sectionLabel(doc: jsPDF, y: number, label: string): number {
  const { w } = pageDims(doc);
  doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.muted);
  doc.text(label.toUpperCase(), M, y);
  doc.setDrawColor(...C.border); doc.setLineWidth(0.25);
  const lw = doc.getTextWidth(label.toUpperCase());
  doc.line(M + lw + 2, y - 0.5, w - M, y - 0.5);
  return y + 5;
}

export function addDecorations(doc: jsPDF, title: string) {
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
    doc.setDrawColor(...C.border); doc.setLineWidth(0.25);
    doc.line(M, fy, w - M, fy);
    doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.muted);
    doc.text('HOU INC · Houston Enterprise Financial Records', M, fy + 4.5);
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
    fontStyle: 'bold' as const, fontSize: 6.1,
    cellPadding: { top: 2.3, bottom: 2.3, left: 2.4, right: 2.4 },
    lineColor: C.border,
    lineWidth: 0.2,
  },
  bodyStyles: {
    fontSize: 6.4, textColor: C.black,
    cellPadding: { top: 2.1, bottom: 2.1, left: 2.4, right: 2.4 },
    overflow: 'linebreak' as const,
    minCellHeight: 4.6,
  },
  alternateRowStyles: { fillColor: C.altRow },
  footStyles: {
    fillColor: [241, 241, 241] as [number, number, number],
    textColor: C.black, fontStyle: 'bold' as const, fontSize: 6.5,
    cellPadding: { top: 2.8, bottom: 2.8, left: 2.4, right: 2.4 },
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
  _period?: string
) {
  const isIncome = kind === 'income';
  const label = isIncome ? 'Income' : 'Expenses';
  const { doc, y } = makeDoc(
    `${label} Ledger`,
    `HOU INC · ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}`
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

  addDecorations(doc, `${label} Ledger`);
  return doc;
}

/* ────────────────────────────────────────────
   PDF: Check Register
──────────────────────────────────────────── */
export function generateCheckRegisterReport(checks: any[], _filter?: string) {
  const { doc, y } = makeDoc('Check Register', 'HOU INC · Instrument Ledger');

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

  addDecorations(doc, 'Check Register');
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
  typeFilter?: string
) {
  const { doc, y } = makeDoc('General Ledger', 'HOU INC · Unified Ledger');

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
      content: r.amount >= 0 ? `+${fmtUSD(Math.abs(r.amount))}` : `−${fmtUSD(Math.abs(r.amount))}`,
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

  addDecorations(doc, 'General Ledger');
  return doc;
}

/* ────────────────────────────────────────────
   PDF: Individual Ledger Record
──────────────────────────────────────────── */
export function generateLedgerRecordReport(row: any) {
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
  const { doc, y } = makeDoc('Houston Enterprise Ledger Record', `${row?.type || 'Finance Entry'} · ${method}`);

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

  addDecorations(doc, 'Houston Enterprise Ledger Record');
  return doc;
}

/* ────────────────────────────────────────────
   PDF: Project Portfolio
──────────────────────────────────────────── */
export function generateProjectReport(projects: any[]) {
  const { doc, y } = makeDoc('Project Portfolio', 'HOU INC · Executive Project Packet');

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

  addDecorations(doc, 'Project Portfolio');
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
  const { doc, y: headerY } = makeDoc('Houston Enterprise Reconciliation', project?.name || 'Project', 'landscape');
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
    foot: [[
      { content: 'Totals', styles: { fontStyle: 'bold' } },
      { content: fmtUSD(fin.revised), styles: { halign: 'right', fontStyle: 'bold' } },
      { content: `${Number(fin.pctDone || 0).toFixed(1)}%`, styles: { halign: 'right', fontStyle: 'bold' } },
      ...drawCols.map((d: any) => ({ content: fmtUSD(d.draw_amount), styles: { halign: 'right', fontStyle: 'bold' } })),
      { content: fmtUSD(fin.earned), styles: { halign: 'right', fontStyle: 'bold' } },
      { content: fmtUSD(fin.balance), styles: { halign: 'right', fontStyle: 'bold', textColor: C.accent } },
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

  addDecorations(doc, 'Houston Enterprise Reconciliation');
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

export function generateInvoicesReport(invoices: InvoiceSummary[]) {
  const { doc, y } = makeDoc('Invoice Register', 'HOU INC · Billing');

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

  addDecorations(doc, 'Invoice Register');
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
  writeWorkbook([{ ws, name: label }], `hou-${kind}-${new Date().toISOString().slice(0, 10)}.xlsx`);
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
  writeWorkbook([{ ws, name: 'Checks' }], `hou-check-register-${new Date().toISOString().slice(0, 10)}.xlsx`);
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
  ], `hou-general-ledger-${new Date().toISOString().slice(0, 10)}.xlsx`);
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
  writeWorkbook([{ ws, name: 'Projects' }], `hou-projects-${new Date().toISOString().slice(0, 10)}.xlsx`);
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
  writeWorkbook([{ ws, name: 'Invoices' }], `hou-invoices-${new Date().toISOString().slice(0, 10)}.xlsx`);
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
