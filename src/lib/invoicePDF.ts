import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice, invoiceSubtotal, invoiceTax, invoiceTotal } from '@/hooks/useInvoices';
import { C, tblCfg, addDecorations, fmtUSD as fmtUSDShared } from '@/lib/reports';

const fmtUSD = (n: number) => fmtUSDShared(n);

const fmtDate = (s: string) => {
  const d = new Date(s);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

export function generateInvoicePDF(inv: Invoice): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const W = 215.9, M = 20;

  // ── Top accent stripe (shared brand color) ──
  doc.setFillColor(...C.accent);
  doc.rect(0, 0, W, 1.5, 'F');

  // ── Header: Brand ──
  let y = 20;
  doc.setFontSize(13);
  doc.setTextColor(...C.black);
  doc.setFont('helvetica', 'bold');
  doc.text('HOU INC', M, y);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.muted);
  doc.text('Houston Enterprise Financial Records', M, y + 5);
  doc.text('Operating Account · All Rights Reserved', M, y + 9);

  // ── Invoice badge (top-right) ──
  const badgeX = W - M - 40;
  doc.setFillColor(...C.black);
  doc.rect(badgeX, y - 5, 40, 10, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  doc.text('INVOICE', badgeX + 20, y + 1.5, { align: 'center' });

  // ── Invoice number + dates (right column) ──
  y += 16;
  const fields = [
    ['Invoice No', inv.invoice_number],
    ['Issue Date', fmtDate(inv.issue_date)],
    ['Due Date',   fmtDate(inv.due_date)],
  ];
  const rCol = W - M;
  fields.forEach(([label, val]) => {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.muted);
    doc.text(label, rCol - 60, y, { align: 'left' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.black);
    doc.text(val, rCol, y, { align: 'right' });
    y += 6;
  });

  // ── Divider ──
  y = 56;
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.line(M, y, W - M, y);

  // ── Bill To ──
  y += 8;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.muted);
  doc.text('BILL TO', M, y);

  y += 5;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.black);
  doc.text(inv.client_name, M, y);

  if (inv.client_company) {
    y += 5;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.muted);
    doc.text(inv.client_company, M, y);
  }
  if (inv.client_email) {
    y += 4.5;
    doc.setFontSize(8);
    doc.setTextColor(...C.muted);
    doc.text(inv.client_email, M, y);
  }
  if (inv.client_address) {
    y += 4.5;
    doc.setFontSize(8);
    doc.setTextColor(...C.muted);
    doc.text(inv.client_address, M, y);
  }

  // ── Line items table (shared table styling — same as every other export) ──
  y += 12;
  const subtotal = invoiceSubtotal(inv);
  const tax = invoiceTax(inv);
  const total = invoiceTotal(inv);

  const tableRows = inv.line_items.map(item => [
    item.description || '—',
    String(item.qty),
    fmtUSD(item.rate),
    fmtUSD(item.qty * item.rate),
  ]);

  autoTable(doc, {
    ...tblCfg(y),
    margin: { left: M, right: M, top: 14, bottom: 20 },
    head: [['Description', 'Qty', 'Rate', 'Amount']],
    body: tableRows,
    columnStyles: {
      0: { halign: 'left', cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 18 },
      2: { halign: 'right', cellWidth: 32 },
      3: { halign: 'right', cellWidth: 36 },
    },
  });

  // ── Totals ──
  // A page break here (long invoices) previously ran the totals/notes/terms
  // block straight into the fixed-position footer with no page-break check at
  // all — ensureSpace keeps every block clear of the footer zone instead.
  let fy = (doc as any).lastAutoTable.finalY + 6;
  const pageH = doc.internal.pageSize.getHeight();
  const FOOTER_ZONE = pageH - 24;
  const ensureSpace = (needed: number) => {
    if (fy + needed > FOOTER_ZONE) { doc.addPage(); fy = 24; }
  };

  const drawTotLine = (label: string, val: string, bold = false, color: [number, number, number] = C.black) => {
    doc.setFontSize(bold ? 9 : 8);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(...C.muted);
    doc.text(label, W - M - 55, fy);
    doc.setTextColor(...color);
    doc.text(val, W - M, fy, { align: 'right' });
    fy += bold ? 7 : 5.5;
  };

  ensureSpace(24);
  drawTotLine('Subtotal', fmtUSD(subtotal));
  if (inv.tax_rate > 0) drawTotLine(`Tax (${inv.tax_rate}%)`, fmtUSD(tax));
  doc.setDrawColor(...C.border);
  doc.line(W - M - 70, fy - 1, W - M, fy - 1);
  drawTotLine('TOTAL DUE', fmtUSD(total), true, C.accent);

  // ── Stripe payment link ──
  if (inv.stripe_payment_link) {
    ensureSpace(10);
    fy += 2;
    doc.setFillColor(99, 91, 255, 10);
    doc.setFontSize(7);
    doc.setTextColor(99, 91, 255);
    doc.text('Pay online: ' + inv.stripe_payment_link, M, fy);
    fy += 6;
  }

  // ── Notes + Terms ──
  fy += 4;
  if (inv.notes) {
    const notesLines = doc.splitTextToSize(inv.notes, W - 2 * M - 70);
    ensureSpace(8 + notesLines.length * 4);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.muted);
    doc.text('NOTES', M, fy);
    fy += 4;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.black);
    doc.text(notesLines, M, fy);
    fy += notesLines.length * 4 + 4;
  }
  if (inv.terms) {
    const termLines = doc.splitTextToSize(inv.terms, W - 2 * M - 70);
    ensureSpace(8 + termLines.length * 4);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.muted);
    doc.text('PAYMENT TERMS', M, fy);
    fy += 4;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.black);
    doc.text(termLines, M, fy);
  }

  // Real footer + page numbers on every page — including overflow pages the
  // old hardcoded-position footer never accounted for.
  addDecorations(doc, `Invoice ${inv.invoice_number}`);

  return doc;
}

export { savePDF } from '@/lib/reports';
