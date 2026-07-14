import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice, invoiceSubtotal, invoiceTax, invoiceTotal } from '@/hooks/useInvoices';

const C = {
  black:    [18, 18, 18]   as [number, number, number],
  accent:   [164, 30, 30]  as [number, number, number],
  muted:    [97, 97, 97]   as [number, number, number],
  border:   [220, 220, 220] as [number, number, number],
  bg:       [250, 250, 250] as [number, number, number],
  white:    [255, 255, 255] as [number, number, number],
  positive: [30, 120, 60]  as [number, number, number],
};

const fmtUSD = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);

const fmtDate = (s: string) => {
  const d = new Date(s);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

export function generateInvoicePDF(inv: Invoice): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, M = 20;

  // ── Background ──
  doc.setFillColor(...C.white);
  doc.rect(0, 0, W, 297, 'F');

  // ── Top accent stripe ──
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
  doc.text('Private Bookkeeping System', M, y + 5);
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

  // ── Line items table ──
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
    startY: y,
    margin: { left: M, right: M },
    head: [['Description', 'Qty', 'Rate', 'Amount']],
    body: tableRows,
    headStyles: {
      fillColor: C.black,
      textColor: C.white,
      fontSize: 7,
      fontStyle: 'bold',
      cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
    },
    bodyStyles: {
      fontSize: 8,
      textColor: C.black,
      cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
    },
    alternateRowStyles: { fillColor: C.bg },
    columnStyles: {
      0: { halign: 'left', cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 18 },
      2: { halign: 'right', cellWidth: 32 },
      3: { halign: 'right', cellWidth: 36 },
    },
    tableLineColor: C.border,
    tableLineWidth: 0.2,
  });

  // ── Totals ──
  let fy = (doc as any).lastAutoTable.finalY + 6;

  const drawTotLine = (label: string, val: string, bold = false, color: [number, number, number] = C.black) => {
    doc.setFontSize(bold ? 9 : 8);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(...C.muted);
    doc.text(label, W - M - 55, fy);
    doc.setTextColor(...color);
    doc.text(val, W - M, fy, { align: 'right' });
    fy += bold ? 7 : 5.5;
  };

  drawTotLine('Subtotal', fmtUSD(subtotal));
  if (inv.tax_rate > 0) drawTotLine(`Tax (${inv.tax_rate}%)`, fmtUSD(tax));
  doc.setDrawColor(...C.border);
  doc.line(W - M - 70, fy - 1, W - M, fy - 1);
  drawTotLine('TOTAL DUE', fmtUSD(total), true, C.accent);

  // ── Stripe payment link ──
  if (inv.stripe_payment_link) {
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
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.muted);
    doc.text('NOTES', M, fy);
    fy += 4;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.black);
    const notesLines = doc.splitTextToSize(inv.notes, W - 2 * M - 70);
    doc.text(notesLines, M, fy);
    fy += notesLines.length * 4 + 4;
  }
  if (inv.terms) {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.muted);
    doc.text('PAYMENT TERMS', M, fy);
    fy += 4;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.black);
    const termLines = doc.splitTextToSize(inv.terms, W - 2 * M - 70);
    doc.text(termLines, M, fy);
  }

  // ── Footer ──
  const footerY = 284;
  doc.setDrawColor(...C.border);
  doc.line(M, footerY, W - M, footerY);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.muted);
  doc.text('HOU INC · Private Bookkeeping System', M, footerY + 4);
  doc.text(`Generated ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`, W - M, footerY + 4, { align: 'right' });

  return doc;
}

export function savePDF(doc: jsPDF, filename: string) {
  doc.save(filename);
}
