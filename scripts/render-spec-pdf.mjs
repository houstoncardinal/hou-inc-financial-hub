import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const root = process.cwd();
const input = path.join(root, 'docs', 'complete-engineering-specification.md');
const htmlOut = path.join(root, 'docs', 'complete-engineering-specification.html');
const pdfOut = path.join(root, 'docs', 'HOU_INC_Complete_Engineering_Specification.pdf');

const markdown = fs.readFileSync(input, 'utf8');

const escapeHtml = (value) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const inline = (value) =>
  escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

function tableToHtml(rows) {
  const cells = rows.map((row) =>
    row
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((cell) => inline(cell.trim())),
  );
  const header = cells[0] ?? [];
  const body = cells.slice(2);
  return [
    '<table>',
    '<thead><tr>',
    ...header.map((cell) => `<th>${cell}</th>`),
    '</tr></thead>',
    '<tbody>',
    ...body.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`),
    '</tbody></table>',
  ].join('');
}

function markdownToHtml(md) {
  const lines = md.split('\n');
  const out = [];
  let paragraph = [];
  let list = [];
  let ordered = [];
  let table = [];
  let inFence = false;
  let fenceLang = '';
  let fence = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    out.push(`<p>${inline(paragraph.join(' '))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (!list.length) return;
    out.push(`<ul>${list.map((item) => `<li>${inline(item)}</li>`).join('')}</ul>`);
    list = [];
  };
  const flushOrdered = () => {
    if (!ordered.length) return;
    out.push(`<ol>${ordered.map((item) => `<li>${inline(item)}</li>`).join('')}</ol>`);
    ordered = [];
  };
  const flushTable = () => {
    if (!table.length) return;
    out.push(tableToHtml(table));
    table = [];
  };
  const flushBlocks = () => {
    flushParagraph();
    flushList();
    flushOrdered();
    flushTable();
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      if (inFence) {
        out.push(`<pre class="code ${escapeHtml(fenceLang)}"><code>${escapeHtml(fence.join('\n'))}</code></pre>`);
        inFence = false;
        fenceLang = '';
        fence = [];
      } else {
        flushBlocks();
        inFence = true;
        fenceLang = trimmed.slice(3).trim();
      }
      continue;
    }

    if (inFence) {
      fence.push(line);
      continue;
    }

    if (!trimmed) {
      flushBlocks();
      continue;
    }

    if (trimmed === '---') {
      flushBlocks();
      out.push('<hr />');
      continue;
    }

    if (/^\|.*\|$/.test(trimmed)) {
      flushParagraph();
      flushList();
      flushOrdered();
      table.push(trimmed);
      continue;
    }

    flushTable();

    const heading = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushBlocks();
      const level = heading[1].length;
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }

    const bullet = trimmed.match(/^-\s+(.*)$/);
    if (bullet) {
      flushParagraph();
      flushOrdered();
      list.push(bullet[1]);
      continue;
    }

    const numbered = trimmed.match(/^\d+\.\s+(.*)$/);
    if (numbered) {
      flushParagraph();
      flushList();
      ordered.push(numbered[1]);
      continue;
    }

    flushList();
    flushOrdered();
    paragraph.push(trimmed);
  }

  flushBlocks();
  return out.join('\n');
}

const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>HOU INC Complete Engineering Specification</title>
  <style>
    @page { size: Letter; margin: 0.58in 0.52in; }
    * { box-sizing: border-box; }
    body {
      color: #171717;
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
      font-size: 10.5px;
      line-height: 1.45;
      margin: 0;
      background: #fff;
    }
    h1, h2, h3, h4 { color: #0a0a0a; line-height: 1.12; margin: 18px 0 8px; page-break-after: avoid; }
    h1 { font-size: 24px; padding-bottom: 8px; border-bottom: 2px solid #9d7e3f; page-break-before: always; }
    h1:first-child { page-break-before: auto; }
    h2 { font-size: 16px; color: #6f5522; }
    h3 { font-size: 13px; }
    h4 { font-size: 11.5px; }
    p { margin: 0 0 8px; }
    ul, ol { margin: 0 0 9px 18px; padding: 0; }
    li { margin: 2px 0; }
    code {
      font-family: "SFMono-Regular", Consolas, monospace;
      font-size: 9px;
      background: #f4f1eb;
      border: 1px solid #e7decf;
      border-radius: 3px;
      padding: 0 3px;
    }
    pre {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      background: #111;
      color: #fafafa;
      border-radius: 6px;
      padding: 10px;
      font-size: 8.5px;
      page-break-inside: avoid;
    }
    pre code { background: transparent; border: 0; color: inherit; padding: 0; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 8px 0 12px;
      table-layout: fixed;
      page-break-inside: auto;
    }
    th, td {
      border: 1px solid #ddd6c8;
      padding: 4px 5px;
      vertical-align: top;
      overflow-wrap: anywhere;
    }
    th {
      background: #f4f1eb;
      color: #3b2b13;
      font-weight: 800;
    }
    tr { page-break-inside: avoid; }
    hr { border: 0; border-top: 1px solid #ded6c7; margin: 18px 0; }
    strong { font-weight: 800; }
  </style>
</head>
<body>
${markdownToHtml(markdown)}
</body>
</html>`;

fs.writeFileSync(htmlOut, html);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto(`file://${htmlOut}`, { waitUntil: 'load' });
await page.pdf({
  path: pdfOut,
  format: 'Letter',
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: '<div style="font-size:8px;color:#777;width:100%;padding:0 36px;">HOU INC Financial Hub - Complete Engineering Specification</div>',
  footerTemplate: '<div style="font-size:8px;color:#777;width:100%;padding:0 36px;text-align:right;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
  margin: { top: '0.72in', right: '0.52in', bottom: '0.62in', left: '0.52in' },
});
await browser.close();

console.log(pdfOut);
