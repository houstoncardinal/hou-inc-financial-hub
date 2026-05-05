import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

/* ── Shared helpers ──────────────────────────────────── */

const PROFILE = {
  name: 'HOU INC',
  tagline: 'Private Bookkeeping System',
  address: 'Operating Account · All Rights Reserved',
};

const COLORS = {
  primary: [18, 18, 18] as [number, number, number],
  accent: [164, 30, 30] as [number, number, number],
  muted: [97, 97, 97] as [number, number, number],
  border: [229, 229, 229] as [number, number, number],
  bg: [250, 250, 250] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  positive: [30, 120, 60] as [number, number, number],
  negative: [164, 30, 30] as [number, number, number],
};

const fmtUSD = (n: number | string | null | undefined) => {
  const v = typeof n === 'string' ? parseFloat(n) : (n ?? 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(v);
};

function addHeaderFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    // Header line
    doc.setDrawColor(...COLORS.border);
    doc.line(20, 15, 190, 15);
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.primary);
    doc.text('HOU INC', 20, 12);
    doc.setTextColor(...COLORS.muted);
    doc.text('Private Bookkeeping System', 45, 12);
    // Footer
    doc.setDrawColor(...COLORS.border);
    doc.line(20, 280, 190, 280);
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.text(
      `Generated ${new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })} · Page ${i} of ${pageCount}`,
      20,
      287
    );
    doc.text('CONFIDENTIAL', 190, 287, { align: 'right' });
  }
  doc.setPage(1);
}

function addTitleBlock(
  doc: jsPDF,
  title: string,
  subtitle: string,
  extra?: string
) {
  doc.setFontSize(18);
  doc.setTextColor(...COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 20, 35);
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.muted);
  doc.setFont('helvetica', 'normal');
  doc.text(subtitle, 20, 42);
  if (extra) {
    doc.text(extra, 20, 48);
  }
  doc.setDrawColor(...COLORS.accent);
  doc.setLineWidth(0.5);
  doc.line(20, 48, 50, 48);
}

/* ── Transaction Report ──────────────────────────────── */

export function generateTransactionReport(
  data: any[],
  kind: 'income' | 'expense',
  period?: string
) {
  const doc = new jsPDF({ format: 'letter', unit: 'mm' });
  const isIncome = kind === 'income';
  const label = isIncome ? 'Income' : 'Expenses';

  addTitleBlock(
    doc,
    `${label} Ledger`,
    `${PROFILE.name} · ${PROFILE.tagline}`,
    period ? `Period: ${period}` : undefined
  );

  const total = data.reduce((s: number, t: any) => s + Number(t.amount), 0);

  // Summary
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', 20, 58);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.muted);
  doc.text(`Total ${label.toLowerCase()}:`, 20, 65);
  doc.setTextColor(...(isIncome ? COLORS.positive : COLORS.negative));
  doc.setFont('helvetica', 'bold');
  doc.text(`Inflow: ${fmtUSD(total)}`, 65, 65);
  doc.setTextColor(...COLORS.muted);
  doc.setFont('helvetica', 'normal');
  doc.text(`Number of entries:`, 20, 72);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text(String(data.length), 65, 72);

  // Table
  const headers = [
    'Date',
    isIncome ? 'Source' : 'Vendor',
    'Project',
    isIncome ? 'Notes' : 'Category',
    'Amount',
  ];
  const rows = data.map((t: any) => [
    t.transaction_date?.slice(0, 10) || '—',
    isIncome
      ? t.source_name || t.vendors?.name || '—'
      : t.vendors?.name || '—',
    t.projects?.name || '—',
    isIncome ? t.notes || '—' : t.category || '—',
    { content: fmtUSD(t.amount), styles: { halign: 'right' } },
  ]);

  (doc as any).autoTable({
    startY: 80,
    head: [headers],
    body: rows,
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      textColor: COLORS.primary,
      lineColor: COLORS.border,
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: COLORS.bg,
      textColor: COLORS.primary,
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'left',
    },
    columnStyles: {
      4: { halign: 'right', fontStyle: 'bold' },
    },
    foot: [
      [
        { content: 'Total', colSpan: 4, styles: { fontStyle: 'bold' } },
        {
          content: fmtUSD(total),
          styles: {
            halign: 'right',
            fontStyle: 'bold',
            textColor: isIncome ? COLORS.positive : COLORS.negative,
          },
        },
      ],
    ],
    footStyles: { fillColor: COLORS.bg },
    margin: { top: 20, bottom: 25 },
  });

  addHeaderFooter(doc);
  doc.setPage(1);
  return doc;
}

/* ── Check Register Report ──────────────────────────── */

export function generateCheckRegisterReport(
  checks: any[],
  filter?: string
) {
  const doc = new jsPDF({ format: 'letter', unit: 'mm' });

  addTitleBlock(
    doc,
    'Check Register',
    `${PROFILE.name} · ${PROFILE.tagline}`,
    filter ? `Filter: ${filter}` : undefined
  );

  const cleared = checks
    .filter((c: any) => c.status === 'cleared')
    .reduce((s: number, c: any) => s + Number(c.amount), 0);
  const pending = checks
    .filter((c: any) => c.status === 'pending')
    .reduce((s: number, c: any) => s + Number(c.amount), 0);

  // Summary
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', 20, 58);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.muted);
  doc.text('Cleared:', 20, 65);
  doc.setTextColor(...COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.text(fmtUSD(cleared), 45, 65);
  doc.setTextColor(...COLORS.muted);
  doc.setFont('helvetica', 'normal');
  doc.text('Pending:', 80, 65);
  doc.setTextColor(...COLORS.negative);
  doc.setFont('helvetica', 'bold');
  doc.text(fmtUSD(pending), 100, 65);
  doc.setTextColor(...COLORS.muted);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total instruments:`, 20, 72);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text(String(checks.length), 65, 72);

  const headers = [
    'Check #',
    'Payee',
    'Issue Date',
    'Status',
    'Project',
    'Memo',
    'Amount',
  ];
  const rows = checks.map((c: any) => [
    c.check_number,
    c.payee_name,
    c.issue_date?.slice(0, 10) || '—',
    c.status?.toUpperCase() || '—',
    c.projects?.name || '—',
    c.memo || '—',
    { content: fmtUSD(c.amount), styles: { halign: 'right' } },
  ]);

  const grandTotal = checks.reduce(
    (s: number, c: any) => s + Number(c.amount),
    0
  );

  (doc as any).autoTable({
    startY: 80,
    head: [headers],
    body: rows,
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      textColor: COLORS.primary,
      lineColor: COLORS.border,
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: COLORS.bg,
      textColor: COLORS.primary,
      fontStyle: 'bold',
      fontSize: 7,
    },
    columnStyles: {
      6: { halign: 'right', fontStyle: 'bold' },
    },
    foot: [
      [
        { content: 'Grand Total', colSpan: 6, styles: { fontStyle: 'bold' } },
        {
          content: fmtUSD(grandTotal),
          styles: { halign: 'right', fontStyle: 'bold' },
        },
      ],
    ],
    footStyles: { fillColor: COLORS.bg },
    margin: { top: 20, bottom: 25 },
  });

  addHeaderFooter(doc);
  doc.setPage(1);
  return doc;
}

/* ── Full Ledger Report ─────────────────────────────── */

export function generateLedgerReport(
  income: any[],
  expenses: any[],
  checks: any[],
  projectFilter?: string,
  typeFilter?: string
) {
  const doc = new jsPDF({ format: 'letter', unit: 'mm' });

  addTitleBlock(
    doc,
    'General Ledger',
    `${PROFILE.name} · ${PROFILE.tagline}`,
    [projectFilter && `Project: ${projectFilter}`,
     typeFilter && `Type: ${typeFilter}`]
      .filter(Boolean)
      .join(' · ') || undefined
  );

  const all = [
    ...checks.map((c: any) => ({
      date: c.issue_date,
      type: 'Check',
      ref: `#${c.check_number}`,
      party: c.payee_name,
      project: c.projects?.name,
      amount: -Number(c.amount),
      status: c.status,
    })),
    ...income.map((t: any) => ({
      date: t.transaction_date,
      type: 'Income',
      ref: '—',
      party: t.source_name || t.vendors?.name || '—',
      project: t.projects?.name,
      amount: Number(t.amount),
      status: '—',
    })),
    ...expenses.map((t: any) => ({
      date: t.transaction_date,
      type: 'Expense',
      ref: t.category || '—',
      party: t.vendors?.name || '—',
      project: t.projects?.name,
      amount: -Number(t.amount),
      status: '—',
    })),
  ].sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  const inflow = all
    .filter((r) => r.amount > 0)
    .reduce((s, r) => s + r.amount, 0);
  const outflow = all
    .filter((r) => r.amount < 0)
    .reduce((s, r) => s + Math.abs(r.amount), 0);
  const net = inflow - outflow;

  // Summary
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.text('Financial Summary', 20, 58);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  const summaryData = [
    { label: 'Total Inflow', value: fmtUSD(inflow), color: COLORS.positive },
    { label: 'Total Outflow', value: fmtUSD(outflow), color: COLORS.negative },
    { label: 'Net Position', value: fmtUSD(net), color: net >= 0 ? COLORS.positive : COLORS.negative },
  ];
  summaryData.forEach((s, i) => {
    doc.setTextColor(...COLORS.muted);
    doc.text(s.label, 20, 65 + i * 7);
    doc.setTextColor(...s.color);
    doc.setFont('helvetica', 'bold');
    doc.text(s.value, 55, 65 + i * 7);
    doc.setFont('helvetica', 'normal');
  });

  doc.setTextColor(...COLORS.muted);
  doc.text(`Total entries: ${all.length}`, 20, 86);
  doc.text('Date range: ' + (all.length > 0 ? `${all[0].date?.slice(0, 10)} — ${all[all.length - 1].date?.slice(0, 10)}` : '—'), 20, 93);

  const headers = [
    'Date',
    'Type',
    'Reference',
    'Counterparty',
    'Project',
    'Amount',
  ];
  const rows = all.map((r) => [
    r.date?.slice(0, 10) || '—',
    r.type,
    r.ref,
    r.party,
    r.project || '—',
    {
      content: r.amount >= 0 ? `+${fmtUSD(Math.abs(r.amount))}` : `−${fmtUSD(Math.abs(r.amount))}`,
      styles: {
        halign: 'right',
        textColor: r.amount >= 0 ? COLORS.positive : COLORS.primary,
      },
    },
  ]);

  (doc as any).autoTable({
    startY: 100,
    head: [headers],
    body: rows,
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      textColor: COLORS.primary,
      lineColor: COLORS.border,
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: COLORS.bg,
      textColor: COLORS.primary,
      fontStyle: 'bold',
      fontSize: 7,
    },
    columnStyles: {
      5: { halign: 'right', fontStyle: 'bold' },
    },
    foot: [
      [
        { content: 'Net Position', colSpan: 5, styles: { fontStyle: 'bold' } },
        {
          content: fmtUSD(net),
          styles: {
            halign: 'right',
            fontStyle: 'bold',
            textColor: net >= 0 ? COLORS.positive : COLORS.negative,
          },
        },
      ],
    ],
    footStyles: { fillColor: COLORS.bg },
    margin: { top: 20, bottom: 25 },
  });

  addHeaderFooter(doc);
  doc.setPage(1);
  return doc;
}

/* ── Project Report ─────────────────────────────────── */

export function generateProjectReport(projects: any[]) {
  const doc = new jsPDF({ format: 'letter', unit: 'mm' });

  addTitleBlock(
    doc,
    'Project Portfolio Report',
    `${PROFILE.name} · ${PROFILE.tagline}`,
    `${projects.length} project${projects.length !== 1 ? 's' : ''}`
  );

  const totalBudget = projects.reduce((s: number, p: any) => s + Number(p.budget), 0);
  const totalSpent = projects.reduce((s: number, p: any) => s + Number(p.spent || 0), 0);
  const totalIn = projects.reduce((s: number, p: any) => s + Number(p.incoming || 0), 0);

  // Summary
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.text('Portfolio Summary', 20, 58);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  [
    { label: 'Total Budget', value: fmtUSD(totalBudget) },
    { label: 'Total Spent', value: fmtUSD(totalSpent) },
    { label: 'Total Income', value: fmtUSD(totalIn) },
    { label: 'Net Portfolio', value: fmtUSD(totalIn - totalSpent),
      color: totalIn - totalSpent >= 0 ? COLORS.positive : COLORS.negative },
  ].forEach((s, i) => {
    doc.setTextColor(...COLORS.muted);
    doc.text(s.label, 20, 65 + i * 7);
    doc.setTextColor(...(s.color || COLORS.primary));
    doc.setFont('helvetica', 'bold');
    doc.text(s.value, 55, 65 + i * 7);
    doc.setFont('helvetica', 'normal');
  });

  const headers = [
    'Project',
    'Code',
    'Status',
    'Budget',
    'Spent',
    'Incoming',
    'Utilization',
  ];
  const rows = projects.map((p: any) => [
    p.name,
    p.code || '—',
    p.status?.toUpperCase() || '—',
    { content: fmtUSD(p.budget), styles: { halign: 'right' } },
    { content: fmtUSD(p.spent || 0), styles: { halign: 'right' } },
    { content: fmtUSD(p.incoming || 0), styles: { halign: 'right' } },
    {
      content: `${p.used?.toFixed(1) || '0'}%`,
      styles: { halign: 'right' },
    },
  ]);

  (doc as any).autoTable({
    startY: 95,
    head: [headers],
    body: rows,
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      textColor: COLORS.primary,
      lineColor: COLORS.border,
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: COLORS.bg,
      textColor: COLORS.primary,
      fontStyle: 'bold',
      fontSize: 7,
    },
    margin: { top: 20, bottom: 25 },
  });

  addHeaderFooter(doc);
  doc.setPage(1);
  return doc;
}

/* ── CSV Export ─────────────────────────────────────── */

export function downloadCSV(
  data: any[],
  filename: string,
  headers: string[],
  getter: (row: any) => any[]
) {
  const rows = [
    headers.join(','),
    ...data.map((row) =>
      getter(row)
        .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
        .join(',')
    ),
  ];
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── Universal PDF save helper ──────────────────────── */

export function savePDF(doc: jsPDF, filename: string) {
  doc.save(filename);
}