import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

/* ── Design tokens ── */
const C = {
  black:    [18, 18, 18]    as [number, number, number],
  accent:   [164, 30, 30]   as [number, number, number],
  muted:    [97, 97, 97]    as [number, number, number],
  border:   [229, 229, 229] as [number, number, number],
  altRow:   [248, 248, 248] as [number, number, number],
  white:    [255, 255, 255] as [number, number, number],
  positive: [30, 120, 60]   as [number, number, number],
  negative: [164, 30, 30]   as [number, number, number],
};
const PW = 215.9, PH = 279.4, M = 18;

/* ── Formatters ── */
const fmtUSD = (n: number | string | null | undefined): string => {
  const v = typeof n === 'string' ? parseFloat(n) : (n ?? 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2,
  }).format(isNaN(v as number) ? 0 : (v as number));
};

/* ── PDF building blocks ── */

function makeDoc(title: string, sub: string): { doc: jsPDF; y: number } {
  const doc = new jsPDF({ format: 'letter', unit: 'mm' });

  // Red accent stripe
  doc.setFillColor(...C.accent);
  doc.rect(0, 0, PW, 2.5, 'F');

  // Black header band
  doc.setFillColor(...C.black);
  doc.rect(0, 2.5, PW, 22, 'F');

  // Brand — left side
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.white);
  doc.text('HOU INC', M, 16.5);
  doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(150, 150, 150);
  doc.text('Private Bookkeeping System', M, 21.5);

  // Report title — right side
  doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(150, 150, 150);
  doc.text(sub, PW - M, 14, { align: 'right' });
  doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.white);
  doc.text(title, PW - M, 21.5, { align: 'right' });

  return { doc, y: 31 };
}

interface Metric { label: string; value: string; color?: [number, number, number] }

function drawMetrics(doc: jsPDF, y: number, metrics: Metric[]): number {
  const n = metrics.length;
  const gap = 3;
  const bw = (PW - 2 * M - gap * (n - 1)) / n;
  metrics.forEach((m, i) => {
    const x = M + i * (bw + gap);
    doc.setFillColor(248, 248, 248);
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.25);
    doc.rect(x, y, bw, 17, 'FD');
    // Left accent edge
    doc.setFillColor(...(m.color ?? C.accent));
    doc.rect(x, y, 2.5, 17, 'F');
    doc.setFontSize(6); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.muted);
    doc.text(m.label.toUpperCase(), x + 5, y + 7);
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...(m.color ?? C.black));
    doc.text(m.value, x + 5, y + 14);
  });
  return y + 22;
}

function sectionLabel(doc: jsPDF, y: number, label: string): number {
  doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.muted);
  doc.text(label.toUpperCase(), M, y);
  doc.setDrawColor(...C.border); doc.setLineWidth(0.25);
  const lw = doc.getTextWidth(label.toUpperCase());
  doc.line(M + lw + 2, y - 0.5, PW - M, y - 0.5);
  return y + 5;
}

function addDecorations(doc: jsPDF, title: string) {
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);

    if (i > 1) {
      // Compact continuation header
      doc.setFillColor(...C.accent); doc.rect(0, 0, PW, 1.5, 'F');
      doc.setFillColor(...C.black); doc.rect(0, 1.5, PW, 10, 'F');
      doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.white);
      doc.text('HOU INC', M, 8.5);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(150, 150, 150);
      doc.text(title, PW - M, 8.5, { align: 'right' });
    }

    // Footer
    const fy = PH - 14;
    doc.setDrawColor(...C.border); doc.setLineWidth(0.25);
    doc.line(M, fy, PW - M, fy);
    doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.muted);
    doc.text('HOU INC · Private Bookkeeping System', M, fy + 4.5);
    doc.text(
      `Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
      PW / 2, fy + 4.5, { align: 'center' }
    );
    doc.setFont('helvetica', 'bold');
    doc.text(`Page ${i} of ${n}  ·  CONFIDENTIAL`, PW - M, fy + 4.5, { align: 'right' });
  }
  doc.setPage(1);
}

const tblCfg = (startY: number) => ({
  startY,
  margin: { left: M, right: M, top: 14, bottom: 20 },
  headStyles: {
    fillColor: C.black, textColor: C.white,
    fontStyle: 'bold' as const, fontSize: 7,
    cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
  },
  bodyStyles: {
    fontSize: 7.5, textColor: C.black,
    cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
  },
  alternateRowStyles: { fillColor: C.altRow },
  footStyles: {
    fillColor: [235, 235, 235] as [number, number, number],
    textColor: C.black, fontStyle: 'bold' as const, fontSize: 7.5,
    cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
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

  (doc as any).autoTable({
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

  (doc as any).autoTable({
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

  (doc as any).autoTable({
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
   PDF: Project Portfolio
──────────────────────────────────────────── */
export function generateProjectReport(projects: any[]) {
  const { doc, y } = makeDoc('Project Portfolio', 'HOU INC · Capital Containers');

  const totalBudget = projects.reduce((s: number, p: any) => s + Number(p.budget), 0);
  const totalSpent  = projects.reduce((s: number, p: any) => s + Number(p.spent || 0), 0);
  const totalIn     = projects.reduce((s: number, p: any) => s + Number(p.incoming || 0), 0);
  const net         = totalIn - totalSpent;

  const my = drawMetrics(doc, y, [
    { label: 'Total Budget', value: fmtUSD(totalBudget) },
    { label: 'Total Spent',  value: fmtUSD(totalSpent), color: C.negative },
    { label: 'Total Income', value: fmtUSD(totalIn),    color: C.positive },
    { label: 'Net Portfolio',value: fmtUSD(net),        color: net >= 0 ? C.positive : C.negative },
  ]);

  const ty = sectionLabel(doc, my + 2, 'Project Detail');

  const rows = projects.map((p: any) => [
    p.name,
    p.code || '—',
    { content: (p.status || '—').toUpperCase(), styles: { fontStyle: 'bold' } },
    { content: fmtUSD(p.budget),       styles: { halign: 'right' } },
    { content: fmtUSD(p.spent || 0),   styles: { halign: 'right' } },
    { content: fmtUSD(p.incoming || 0),styles: { halign: 'right', textColor: C.positive } },
    { content: `${(p.used || 0).toFixed(1)}%`, styles: { halign: 'right' } },
  ]);

  (doc as any).autoTable({
    ...tblCfg(ty),
    head: [['Project', 'Code', 'Status', 'Budget', 'Spent', 'Incoming', 'Utilization']],
    body: rows,
    columnStyles: {
      2: { cellWidth: 22 },
      3: { halign: 'right', cellWidth: 28 },
      4: { halign: 'right', cellWidth: 28 },
      5: { halign: 'right', cellWidth: 28 },
      6: { halign: 'right', cellWidth: 24 },
    },
    foot: [[
      { content: 'Portfolio Total', colSpan: 3, styles: { fontStyle: 'bold' } },
      { content: fmtUSD(totalBudget), styles: { halign: 'right', fontStyle: 'bold' } },
      { content: fmtUSD(totalSpent),  styles: { halign: 'right', fontStyle: 'bold' } },
      { content: fmtUSD(totalIn),     styles: { halign: 'right', fontStyle: 'bold', textColor: C.positive } },
      { content: '—', styles: { halign: 'right' } },
    ]],
  });

  addDecorations(doc, 'Project Portfolio');
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

  (doc as any).autoTable({
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

function buildSheet(def: SheetDef, reportTitle: string): XLSX.WorkSheet {
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const aoa: any[][] = [
    ['HOU INC — Private Bookkeeping System'],
    [reportTitle],
    [`Generated: ${today}`],
    [],
    def.headers,
    ...def.rows,
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Column widths
  if (def.colWidths) {
    ws['!cols'] = def.colWidths.map(w => ({ wch: w }));
  }

  // Freeze header row (rows 1-5 frozen so headers are always visible)
  ws['!views'] = [{ state: 'frozen', ySplit: 5, topLeftCell: 'A6' } as any];

  // Merge title/metadata rows across all columns
  const lastCol = def.headers.length - 1;
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: lastCol } },
  ];

  // Number format for currency columns
  if (def.currencyCols) {
    def.rows.forEach((_, ri) => {
      def.currencyCols!.forEach(ci => {
        const addr = XLSX.utils.encode_cell({ r: ri + 5, c: ci });
        if (ws[addr] && ws[addr].t === 'n') {
          ws[addr].z = '"$"#,##0.00';
        }
      });
    });
  }

  return ws;
}

function writeWorkbook(sheets: Array<{ ws: XLSX.WorkSheet; name: string }>, filename: string) {
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ ws, name }) =>
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31))
  );
  XLSX.writeFile(wb, filename);
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
