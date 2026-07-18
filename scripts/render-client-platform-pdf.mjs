import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const assetsDir = path.join(docsDir, 'client-platform-assets');
const htmlOut = path.join(docsDir, 'HOU_INC_Client_Platform_Overview.html');
const pdfOut = path.join(docsDir, 'HOU_INC_Client_Platform_Overview.pdf');

fs.mkdirSync(assetsDir, { recursive: true });

function loadEnv() {
  try {
    for (const line of fs.readFileSync(path.join(root, '.env'), 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
      }
    }
  } catch {}
}

loadEnv();

const baseURL = process.env.CLIENT_PDF_BASE_URL || 'http://127.0.0.1:8092';
const email = process.env.PLAYWRIGHT_USER_EMAIL;
const password = process.env.PLAYWRIGHT_USER_PASSWORD;

async function waitForServer(url, timeout = 120_000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status < 500) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 600));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function startServer() {
  if (process.env.CLIENT_PDF_SKIP_SERVER) return null;
  const child = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '8092'], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });
  child.stdout.on('data', (d) => process.stdout.write(`[vite] ${d}`));
  child.stderr.on('data', (d) => process.stderr.write(`[vite] ${d}`));
  return child;
}

async function signIn(page) {
  if (!email || !password) return false;
  await page.goto(`${baseURL}/auth`, { waitUntil: 'networkidle' });
  const emailInput = page.getByLabel(/email address/i);
  await emailInput.fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  const codeEl = page.getByText(/^\d{6}$/).first();
  await codeEl.waitFor({ state: 'visible', timeout: 15_000 });
  const code = (await codeEl.textContent()).trim();
  const otpInput = page.locator('input[data-input-otp]').first();
  await otpInput.click();
  await otpInput.pressSequentially(code);
  await page.waitForURL((url) => !url.pathname.endsWith('/auth'), { timeout: 15_000 });
  return true;
}

async function chooseEntity(page, namePattern) {
  const switcher = page.getByRole('button', { name: /switch finance entity/i }).first();
  await switcher.click();
  await page.getByRole('button', { name: namePattern }).click();
  await page.waitForTimeout(900);
}

async function snap(page, slug, url, options = {}) {
  const file = path.join(assetsDir, `${slug}.png`);
  await page.setViewportSize(options.mobile ? { width: 390, height: 880 } : { width: 1440, height: 940 });
  await page.goto(`${baseURL}${url}`, { waitUntil: 'networkidle', timeout: 60_000 });
  if (options.entity) await chooseEntity(page, options.entity);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(options.delay ?? 900);
  await page.screenshot({ path: file, fullPage: false });
  return `client-platform-assets/${slug}.png`;
}

const server = startServer();
let screenshots = {};

try {
  await waitForServer(baseURL);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 940 } });

  screenshots.home = await snap(page, '01-public-home', '/');
  screenshots.start = await snap(page, '02-start-project', '/start-project');
  screenshots.portfolio = await snap(page, '03-public-portfolio', '/portfolio');

  let authed = false;
  try {
    authed = await signIn(page);
  } catch (e) {
    console.warn(`Authenticated screenshots skipped: ${e.message}`);
  }

  if (authed) {
    screenshots.entitySelect = await snap(page, '04-entity-selector', '/finance');
    screenshots.finance = await snap(page, '04-finance-dashboard', '/finance/dashboard', { entity: /^Houston Enterprise Construction/ });
    screenshots.ledger = await snap(page, '05-ledger', '/ledger');
    screenshots.checks = await snap(page, '06-checks-register', '/checks');
    screenshots.income = await snap(page, '07-income-entry', '/income');
    screenshots.expenses = await snap(page, '08-expense-entry', '/expenses');
    screenshots.invoices = await snap(page, '09-invoices', '/invoices');
    screenshots.documents = await snap(page, '10-documents', '/documents');
    screenshots.controls = await snap(page, '11-finance-controls', '/finance/controls');
    screenshots.charts = await snap(page, '12-charts', '/charts');
    screenshots.hgp = await snap(page, '13-hgp-generator-ops', '/finance/dashboard', { entity: /^Houston Generator Pros Energy Services/ });
    screenshots.jobs = await snap(page, '14-hgp-install-jobs', '/projects');
    screenshots.storm = await snap(page, '15-hgp-storm-response', '/storm');
    screenshots.holdings = await snap(page, '16-holdings-hq', '/finance/dashboard', { entity: /^Houston Enterprise Holdings Holdings/ });
    screenshots.admin = await snap(page, '17-admin-dashboard', '/admin');
    screenshots.mobileLedger = await snap(page, '18-mobile-ledger', '/ledger', { mobile: true });
  }

  await browser.close();
} finally {
  if (server) server.kill('SIGTERM');
}

const image = (key, caption) => screenshots[key]
  ? `<figure><img src="${screenshots[key]}" alt="${caption}" /><figcaption>${caption}</figcaption></figure>`
  : `<div class="visual-fallback"><strong>${caption}</strong><span>Authenticated screenshot was not available in this run.</span></div>`;

const screenSpotlight = (key, title, caption, bullets = []) => screenshots[key]
  ? `<section class="screen-spotlight">
      <div class="spotlight-head">
        <div>
          <span class="eyebrow">Screen Spotlight</span>
          <h3>${title}</h3>
        </div>
        <p>${caption}</p>
      </div>
      <img src="${screenshots[key]}" alt="${title}" />
      ${bullets.length ? `<ul class="spotlight-list">${bullets.map((b) => `<li>${b}</li>`).join('')}</ul>` : ''}
    </section>`
  : `<div class="visual-fallback"><strong>${title}</strong><span>${caption}</span></div>`;

const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>HOU INC Platform Overview</title>
  <style>
    @page { size: Letter; margin: 0.36in 0.38in; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #15120e; font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; font-size: 11.4px; line-height: 1.45; background: #fff; }
    .cover { min-height: 9.35in; display: grid; grid-template-rows: auto auto 1fr auto; gap: 14px; padding: 0.08in 0; page-break-after: always; }
    .brand { color: #8f6d2e; font-size: 11px; letter-spacing: .24em; font-weight: 900; text-transform: uppercase; }
    h1 { font-size: 41px; line-height: 1; margin: 13px 0 11px; letter-spacing: -0.018em; color: #100d09; }
    .subtitle { font-size: 16px; color: #51483d; max-width: 7.05in; }
    .cover-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; align-items: stretch; }
    .hero-card { border: 1px solid #d8c6a8; background: linear-gradient(135deg,#fff,#fbf8f1); padding: 12px; box-shadow: inset 0 2px 0 rgba(157,126,63,.12); }
    .hero-card strong { display: block; font-size: 15px; margin-bottom: 4px; color: #19140d; }
    .proof { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; margin-top: 12px; }
    .proof div { border-top: 3px solid #9d7e3f; background:#fbf8f1; padding: 8px 7px; font-weight: 900; font-size: 9.5px; text-transform: uppercase; letter-spacing: .07em; min-height: 42px; }
    .cover-strip { display:grid; grid-template-columns: 1.2fr .8fr; gap: 10px; align-items: stretch; }
    .cover-strip figure { margin: 0; }
    .cover-strip img { max-height: 2.35in; }
    .cover-caption { border:1px solid #d8c6a8; background:#fff; padding:10px; }
    .cover-caption h3 { margin-top:0; }
    h2 { font-size: 25px; margin: 18px 0 9px; padding-bottom: 6px; border-bottom: 1px solid #d8cbb6; page-break-after: avoid; color: #111; }
    h3 { font-size: 15px; color: #725522; margin: 13px 0 6px; page-break-after: avoid; }
    h4 { font-size: 12.5px; margin: 9px 0 5px; }
    p { margin: 0 0 7px; }
    ul, ol { margin: 0 0 8px 18px; padding: 0; }
    li { margin: 2.5px 0; }
    .chapter { margin-top: 10px; }
    .newpage { page-break-before: always; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; }
    .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
    .card { border: 1px solid #dfd3bf; background: #fbfaf7; padding: 10px; page-break-inside: avoid; }
    .card h4 { color: #17120a; margin-top: 0; }
    .tag { display: inline-block; border: 1px solid #d9c8aa; background: #f6f0e5; color: #6f5522; padding: 3px 7px; margin: 0 4px 5px 0; font-size: 8.2px; font-weight: 900; letter-spacing: .09em; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0 12px; table-layout: fixed; }
    th, td { border: 1px solid #ded2be; padding: 5px 6px; vertical-align: top; overflow-wrap: anywhere; }
    th { background: #f2eadc; color: #3b2b13; font-weight: 900; }
    tr { page-break-inside: avoid; }
    figure { margin: 9px 0 13px; }
    img { width: 100%; max-height: 4.35in; object-fit: cover; object-position: top center; border: 1px solid #d8cbb6; display: block; box-shadow: 0 5px 16px rgba(20,17,13,.08); }
    figcaption { color: #5f5548; font-size: 9px; margin-top: 5px; font-weight: 800; }
    .visual-fallback { border: 1px dashed #c6b48f; background: #fbfaf7; padding: 12px; color: #6d6255; }
    .visual-fallback strong { display: block; color: #17120a; margin-bottom: 4px; }
    .flow { display: flex; flex-wrap: wrap; gap: 5px; margin: 6px 0 9px; }
    .flow span { border: 1px solid #d9c8aa; background: #fff; padding: 6px 8px; font-weight: 900; font-size: 9.2px; }
    .note { border-left: 3px solid #9d7e3f; padding: 7px 9px; background: #fbfaf7; margin: 8px 0; }
    .toc a { color: #14110d; text-decoration: none; }
    .toc { columns: 2; column-gap: 28px; }
    .toc li { margin: 3px 0; break-inside: avoid; }
    .benefit { font-weight: 800; color: #2f2413; }
    .lux-band { background: linear-gradient(135deg,#fff,#fbf8f1); color: #15120e; border: 1px solid #d8c6a8; padding: 12px; margin: 11px 0; box-shadow: inset 0 3px 0 rgba(157,126,63,.16); }
    .lux-band h3 { color: #725522; margin-top: 0; }
    .mini-stat { border-left: 2px solid #9d7e3f; padding-left: 7px; }
    .mini-stat strong { display:block; font-size: 14px; }
    .hierarchy { border: 1px solid #d8cbb6; background: linear-gradient(180deg,#fff,#fbfaf7); padding: 10px; margin: 8px 0 12px; page-break-inside: avoid; }
    .h-row { display: grid; gap: 7px; margin: 7px 0; align-items: stretch; }
    .h-row.top { grid-template-columns: 1fr; }
    .h-row.apps { grid-template-columns: repeat(4, 1fr); }
    .h-row.entities { grid-template-columns: repeat(3, 1fr); }
    .h-node { border: 1px solid #d7c7aa; background: #fff; padding: 8px; text-align: center; min-height: 44px; }
    .h-node.dark { background: #f7f0e4; color: #15120e; border-color: #b6985e; box-shadow: inset 0 3px 0 rgba(157,126,63,.18); }
    .h-node.gold { background: #f4ead9; border-color: #b6985e; }
    .h-node strong { display:block; font-size: 10.5px; margin-bottom: 2px; }
    .h-node span { display:block; font-size: 7.8px; color: #6d6255; }
    .h-node.dark span { color: #5f5548; }
    .arrow { text-align:center; color:#9d7e3f; font-weight:900; letter-spacing:.12em; font-size: 8px; margin: -2px 0; }
    .dense-list { columns: 2; column-gap: 18px; }
    .dense-list li { break-inside: avoid; }
    .matrix td:first-child, .matrix th:first-child { width: 21%; }
    .eyebrow { display:inline-block; color:#8f6d2e; font-size:8.4px; letter-spacing:.18em; text-transform:uppercase; font-weight:900; margin-bottom:3px; }
    .screen-spotlight { page-break-inside: avoid; border: 1px solid #d8c6a8; background: linear-gradient(180deg,#fff,#fbfaf7); padding: 11px; margin: 13px 0 16px; box-shadow: inset 0 3px 0 rgba(157,126,63,.15); }
    .spotlight-head { display:grid; grid-template-columns: .42fr .58fr; gap: 12px; align-items:end; margin-bottom: 8px; }
    .spotlight-head h3 { font-size: 17px; color:#15120e; margin:0; }
    .spotlight-head p { color:#5f5548; margin:0; font-weight:600; }
    .screen-spotlight img { max-height: 5.25in; object-fit: cover; object-position: top center; }
    .spotlight-list { display:grid; grid-template-columns: repeat(3, 1fr); gap: 6px; list-style:none; margin:8px 0 0; padding:0; }
    .spotlight-list li { border:1px solid #ded2be; background:#fff; padding:6px 7px; font-weight:700; margin:0; }
    .chapter-title { border:1px solid #d8c6a8; background:#fbfaf7; padding:12px 14px; margin: 14px 0 10px; box-shadow: inset 0 3px 0 rgba(157,126,63,.16); }
    .chapter-title h2 { border:0; padding:0; margin:0 0 4px; }
    .chapter-title p { margin:0; color:#5f5548; font-size:12px; font-weight:600; }
  </style>
</head>
<body>
  <section class="cover">
    <div>
      <div class="brand">HOU INC Platform</div>
      <h1>Client-Facing Platform Overview</h1>
      <p class="subtitle">A unified business operating system for residential construction, commercial construction, generator operations, client collaboration, administration, and enterprise finance.</p>
      <div class="proof">
        <div>Public Website</div>
        <div>Client Portal</div>
        <div>Admin Dashboard</div>
        <div>Finance Command Center</div>
      </div>
    </div>
    <div class="cover-strip">
      ${screenshots.finance ? `<figure><img src="${screenshots.finance}" alt="Houston Enterprise finance dashboard" /><figcaption>Houston Enterprise finance dashboard: construction financial command center, ledger visibility, KPIs, and decision support.</figcaption></figure>` : '<div></div>'}
      <div class="cover-caption">
        <h3>Especially Built for Houston Enterprise</h3>
        <p>Designed around the way Houston Enterprise operates: branded public presence, client-facing portal, admin operations, project management, construction finance, entity-specific dashboards, realtime sync, and executive reporting.</p>
        <div><span class="tag">Construction</span><span class="tag">Client Portal</span><span class="tag">Admin Ops</span><span class="tag">Finance Controls</span><span class="tag">HGP</span><span class="tag">Holdings</span></div>
      </div>
    </div>
    <div class="cover-grid">
      <div class="hero-card">
        <strong>What it is</strong>
        <p>A secure, database-connected platform that brings clients, administrators, project teams, finance staff, and executives into one coordinated operating environment.</p>
      </div>
      <div class="hero-card">
        <strong>Why it matters</strong>
        <p>It replaces disconnected spreadsheets, messages, document folders, and finance trackers with one system that can manage leads, projects, documents, meetings, invoices, ledger activity, entity operations, and reporting.</p>
      </div>
    </div>
    <div class="grid-4">
      <div class="card"><h4>Client Experience</h4><p>Portal access for project updates, documents, meetings, messages, payments, and gallery progress.</p></div>
      <div class="card"><h4>Operations</h4><p>Admin tools for leads, clients, projects, documents, meetings, portfolio, help requests, and maps.</p></div>
      <div class="card"><h4>Finance</h4><p>Checks, ledger, reconciliation, income, expenses, invoices, reports, controls, and audit trail.</p></div>
      <div class="card"><h4>Entity Depth</h4><p>Specialized finance modules for Houston Enterprise, Houston Generator Pros, and Holdings.</p></div>
    </div>
  </section>

  <section>
    <div class="chapter-title">
      <h2>Chapter Glossary</h2>
      <p>A guided map of the platform, its applications, business workflows, dashboards, automations, and client value.</p>
    </div>
    <ol class="toc">
      <li>Executive Summary</li>
      <li>Platform Map</li>
      <li>Visual System Hierarchy</li>
      <li>Public Website</li>
      <li>Client Portal</li>
      <li>Admin Dashboard</li>
      <li>Finance Dashboard</li>
      <li>Entity-Specific Experiences</li>
      <li>Automation and Realtime Operations</li>
      <li>Security and Permissions</li>
      <li>Reporting and Executive Visibility</li>
      <li>Benefits for the Client</li>
      <li>Operational Process Maps</li>
      <li>Feature Capability Matrix</li>
      <li>Launch Readiness</li>
    </ol>
  </section>

  <section class="chapter">
    <div class="chapter-title"><h2>1. Executive Summary</h2><p>The platform in plain language: what was built, who it serves, and why it matters to Houston Enterprise.</p></div>
    <p>HOU INC Financial Hub is a complete operating platform for a modern construction and services organization. It supports the full client journey from first website visit through project intake, portal collaboration, project execution, finance tracking, invoice/payment review, reconciliation, and executive reporting.</p>
    <p>The platform is built around three business entities: Houston Enterprise for residential/commercial construction, Houston Generator Pros for generator sales/installation/service, and Houston Enterprise Holdings for ownership, capital, notes, and consolidated financial oversight.</p>
    <div class="grid-3">
      <div class="card"><h4>For Clients</h4><p>Clear portal access to project status, documents, milestones, messages, meetings, payments, and gallery updates.</p></div>
      <div class="card"><h4>For Admins</h4><p>A central command center for intake, approvals, client management, documents, meetings, messages, help requests, maps, projects, and portfolio management.</p></div>
      <div class="card"><h4>For Finance</h4><p>Entity-aware financial controls for checks, income, expenses, ledger, invoices, vendors, documents, charts, reconciliation, WIP, retainage, aging, and auditability.</p></div>
    </div>
    <div class="lux-band">
      <h3>Executive Positioning</h3>
      <p>This is not simply a website or a bookkeeping dashboard. It is a unified client, operations, and finance platform that allows leadership to manage the business from first impression through final payment, while preserving specialized workflows for construction, generator operations, and holding-company finance.</p>
      <div class="grid-4">
        <div class="mini-stat"><strong>4</strong> major applications</div>
        <div class="mini-stat"><strong>3</strong> business entities</div>
        <div class="mini-stat"><strong>180+</strong> feature areas</div>
        <div class="mini-stat"><strong>Realtime</strong> database-backed operations</div>
      </div>
    </div>
    <table class="matrix">
      <thead><tr><th>Built For Houston Enterprise</th><th>How The Platform Supports It</th></tr></thead>
      <tbody>
        <tr><td>Residential and Commercial Construction</td><td>Dedicated project, client, document, milestone, draw, change order, invoice, expense, and ledger workflows designed around construction operations.</td></tr>
        <tr><td>Professional Client Experience</td><td>Clients can interact through a branded portal instead of scattered texts, calls, emails, and file requests.</td></tr>
        <tr><td>Internal Management</td><td>Admins can manage leads, client approvals, document requests, meetings, messages, projects, maps, portfolio content, and help requests from one dashboard.</td></tr>
        <tr><td>Financial Control</td><td>Finance users can track checks, income, expenses, invoices, ledger records, reconciliation, WIP, retainage, aging, commitments, reports, and entity-specific performance.</td></tr>
      </tbody>
    </table>
  </section>

  <section class="chapter">
    <div class="chapter-title"><h2>2. Platform Map</h2><p>How the website, portal, admin dashboard, and finance dashboard work together as one operating system.</p></div>
    <p>The system is organized into four major apps that share one secure Supabase backend.</p>
    <table>
      <thead><tr><th>Application</th><th>Primary Audience</th><th>What It Does</th><th>Business Benefit</th></tr></thead>
      <tbody>
        <tr><td>Public Website</td><td>Prospects</td><td>Shows services, portfolio, company information, contact forms, and project-start forms.</td><td>Turns interest into structured leads.</td></tr>
        <tr><td>Client Portal</td><td>Clients</td><td>Gives clients one place to communicate, upload documents, review milestones, view payments, and track projects.</td><td>Improves transparency and reduces scattered communication.</td></tr>
        <tr><td>Admin Dashboard</td><td>Internal admins</td><td>Manages clients, documents, meetings, messages, leads, projects, map pins, portfolio, help requests, and operations.</td><td>Creates one operational control center.</td></tr>
        <tr><td>Finance Dashboard</td><td>Finance/executives/project managers</td><td>Manages ledger, checks, income, expenses, invoices, vendors, projects, documents, charts, controls, HGP operations, and Holdings finance.</td><td>Improves financial visibility, speed, auditability, and entity-specific decision making.</td></tr>
      </tbody>
    </table>
    <div class="flow">
      <span>Website Lead</span><span>Admin Review</span><span>Client Portal</span><span>Project Setup</span><span>Finance Tracking</span><span>Invoice / Payment</span><span>Reconciliation</span><span>Executive Reporting</span>
    </div>
    <h3>Visual System Hierarchy</h3>
    <div class="hierarchy">
      <div class="h-row top">
        <div class="h-node dark"><strong>HOU INC Digital Operating Platform</strong><span>One connected client, admin, project, and finance ecosystem</span></div>
      </div>
      <div class="arrow">CONNECTS TO</div>
      <div class="h-row apps">
        <div class="h-node gold"><strong>Public Website</strong><span>Services, portfolio, contact, start-project intake</span></div>
        <div class="h-node gold"><strong>Client Portal</strong><span>Documents, messages, meetings, milestones, payments</span></div>
        <div class="h-node gold"><strong>Admin Dashboard</strong><span>Client approval, project ops, documents, help, portfolio</span></div>
        <div class="h-node gold"><strong>Finance Dashboard</strong><span>Ledger, checks, income, expenses, invoices, reports</span></div>
      </div>
      <div class="arrow">FINANCE DASHBOARD MANAGES</div>
      <div class="h-row entities">
        <div class="h-node"><strong>Houston Enterprise</strong><span>Residential/commercial construction, WIP, draws, retainage</span></div>
        <div class="h-node"><strong>Houston Generator Pros</strong><span>Generator installs, service, equipment, outages, dispatch</span></div>
        <div class="h-node"><strong>Houston Enterprise Holdings</strong><span>Notes, debt, capital, distributions, consolidated oversight</span></div>
      </div>
    </div>
    <div class="hierarchy">
      <div class="h-row top"><div class="h-node dark"><strong>Lead-to-Cash Operating Flow</strong><span>How a client and project move through the platform</span></div></div>
      <div class="h-row apps">
        <div class="h-node"><strong>Lead Capture</strong><span>Website forms and portfolio interest</span></div>
        <div class="h-node"><strong>Admin Qualification</strong><span>Approve client, request docs, schedule meeting</span></div>
        <div class="h-node"><strong>Project Delivery</strong><span>Milestones, messages, documents, scope, photos</span></div>
        <div class="h-node"><strong>Finance Control</strong><span>Invoice, draw, ledger, reconcile, report</span></div>
      </div>
    </div>
    ${image('home', 'Public website first impression and service-entry experience.')}
  </section>

  <section class="chapter">
    <div class="chapter-title"><h2>3. Public Website</h2><p>The public-facing brand, services, portfolio, and lead-capture experience.</p></div>
    <p>The public website presents HOU INC as a professional construction and project management company. It includes dedicated service pages, a portfolio experience, company information, contact capture, and project-start intake.</p>
    <div class="grid-2">
      <div class="card"><h4>Key Features</h4><ul><li>Home page</li><li>Residential construction page</li><li>Commercial construction page</li><li>Project management page</li><li>Portfolio and project detail screens</li><li>Contact and start-project forms</li></ul></div>
      <div class="card"><h4>Benefits</h4><ul><li>Professional client-facing brand presence</li><li>Structured lead capture</li><li>Service education before sales conversations</li><li>Project portfolio proof</li><li>Direct bridge into admin review workflows</li></ul></div>
    </div>
    ${image('portfolio', 'Public portfolio screen used to showcase completed or featured work.')}
    ${image('start', 'Start-project intake screen for structured lead capture.')}
  </section>

  <section class="chapter">
    <div class="chapter-title"><h2>4. Client Portal</h2><p>A secure client workspace for communication, documents, milestones, meetings, payments, and project visibility.</p></div>
    <p>The client portal gives customers a secure place to stay connected after they become a client. It reduces email back-and-forth by organizing project information, documents, meetings, messages, milestones, gallery updates, and payment visibility.</p>
    <table>
      <thead><tr><th>Portal Area</th><th>Client Can</th><th>Company Can</th></tr></thead>
      <tbody>
        <tr><td>Dashboard</td><td>See project/client overview.</td><td>Centralize status and next steps.</td></tr>
        <tr><td>Messages</td><td>Send and receive updates.</td><td>Keep communication tied to client records.</td></tr>
        <tr><td>Documents</td><td>Upload requested files.</td><td>Request, review, approve, and organize documents.</td></tr>
        <tr><td>Meetings</td><td>See scheduled calls/site visits.</td><td>Create and manage meeting details.</td></tr>
        <tr><td>Milestones</td><td>Track project progress.</td><td>Communicate progress without manual status emails.</td></tr>
        <tr><td>Payments</td><td>Review invoices/payment items.</td><td>Bridge financial communication into the portal.</td></tr>
        <tr><td>Gallery</td><td>View project photos.</td><td>Share visible progress and deliverables.</td></tr>
      </tbody>
    </table>
    <p class="note"><span class="benefit">Client benefit:</span> The portal makes the company feel organized, transparent, and easy to work with.</p>
  </section>

  <section class="chapter">
    <div class="chapter-title"><h2>5. Admin Dashboard</h2><p>The internal command center for client operations, project coordination, documents, meetings, portfolio, and support.</p></div>
    <p>The admin dashboard is the internal operations center. It lets authorized users manage clients, documents, meetings, portal requests, leads, projects, map information, portfolio content, financial snapshots, help requests, and operational notes.</p>
    ${screenSpotlight('admin', 'Admin Operations Dashboard', 'The admin dashboard gives the internal team a command center for managing clients, leads, meetings, documents, project records, portfolio content, help requests, and operational data.', ['Client approval and management', 'Document and meeting workflows', 'Project, portfolio, map, and help-request control'])}
    <div class="grid-3">
      <div class="card"><h4>Client Management</h4><p>Approve/reject clients, inspect client details, manage notes, and view activity.</p></div>
      <div class="card"><h4>Documents and Meetings</h4><p>Request common construction documents, review uploads, schedule meetings, and update statuses.</p></div>
      <div class="card"><h4>Projects and Portfolio</h4><p>Manage admin projects, connect finance projects, and control public portfolio content.</p></div>
    </div>
    <table class="matrix">
      <thead><tr><th>Admin Capability</th><th>What It Manages</th><th>Client / Business Value</th></tr></thead>
      <tbody>
        <tr><td>Client Intake</td><td>Portal clients, start-project submissions, contact submissions, approval/rejection, notes, internal logs.</td><td>Converts public interest into organized client records and next actions.</td></tr>
        <tr><td>Document Control</td><td>Document requests, custom document names, common residential/commercial request catalog, review status.</td><td>Reduces missing paperwork and gives clients a clear submission process.</td></tr>
        <tr><td>Meeting Management</td><td>Date, time, method, meeting details, status, completion workflow, client communication.</td><td>Keeps consultation and project meetings structured and visible.</td></tr>
        <tr><td>Project Operations</td><td>Admin projects, project updates, milestones, assigned/client-specific project context, finance links.</td><td>Allows internal teams to manage the same project from admin and finance contexts.</td></tr>
        <tr><td>Portfolio and Map</td><td>Public portfolio content and client/project map pins.</td><td>Supports marketing credibility and geographic planning.</td></tr>
      </tbody>
    </table>
  </section>

  <section class="chapter">
    <div class="chapter-title"><h2>6. Finance Dashboard</h2><p>The entity-aware financial command center for Houston Enterprise and its related business entities.</p></div>
    <p>The finance dashboard is a multi-entity financial command center. It adapts depending on which company is selected, while preserving shared finance primitives like ledger, checks, income, expenses, invoices, vendors, documents, charts, and reporting.</p>
    ${image('finance', 'Houston Enterprise finance dashboard for construction financial visibility.')}
    ${image('ledger', 'Ledger and reconciliation center for viewing and managing financial records.')}
    <h3>Core Finance Capabilities</h3>
    <div>
      <span class="tag">Ledger</span><span class="tag">Checks</span><span class="tag">Income</span><span class="tag">Expenses</span><span class="tag">Invoices</span><span class="tag">Vendors</span><span class="tag">Projects</span><span class="tag">Documents</span><span class="tag">Charts</span><span class="tag">Controls</span><span class="tag">Reconciliation</span><span class="tag">Audit Trail</span>
    </div>
    <p>The ledger is backed by server-side paging logic, reconciliation actions, audit history, and realtime database subscriptions so users can review current financial activity without manually refreshing the application.</p>
    <table class="matrix">
      <thead><tr><th>Finance Area</th><th>Included Functions</th><th>Enterprise Benefit</th></tr></thead>
      <tbody>
        <tr><td>Ledger</td><td>Unified ledger records, search, filters, source context, reconcile/reopen, audit history, realtime refresh.</td><td>Creates a controlled financial register that can scale beyond small spreadsheets.</td></tr>
        <tr><td>Construction Controls</td><td>WIP, percent complete, retainage AR/AP, aging, change order exposure, commitments versus actuals.</td><td>Gives leadership visibility into project financial health before problems become surprises.</td></tr>
        <tr><td>Transaction Entry</td><td>Entity-aware income/expense categories, project/vendor links, scope/milestone/change order context.</td><td>Captures financial activity with business meaning instead of generic memo fields.</td></tr>
        <tr><td>Invoices and Draws</td><td>Invoice creation/editing, payment links, funded draw income automation, portal visibility.</td><td>Connects billing, client communication, and recognized income.</td></tr>
        <tr><td>Reporting</td><td>Charts, PDFs, Excel/CSV exports, entity summaries, project reconciliation reports.</td><td>Supports management meetings, CPA review, and operational decision making.</td></tr>
      </tbody>
    </table>
    <h3>Finance Screen Gallery</h3>
    ${screenSpotlight('entitySelect', 'Entity Selector', 'The finance dashboard begins with entity selection, allowing the team to manage Houston Enterprise, Houston Generator Pros, or Houston Enterprise Holdings from one secure finance environment.', ['Single platform for multiple companies', 'Entity-specific terminology and modules', 'Finance context persists across dashboards'])}
    ${screenSpotlight('checks', 'Checks Register', 'The check register centralizes check activity, payment status, vendors, project associations, and reconciliation context.', ['Track issued and cleared checks', 'Connect payments to vendors/projects', 'Supports reconciliation workflows'])}
    ${screenSpotlight('income', 'Income Entry', 'Income entry captures revenue with entity-specific categories, payment details, project links, and business context.', ['Construction draws and invoices', 'Generator deposits and service revenue', 'Holdings interest and management fees'])}
    ${screenSpotlight('expenses', 'Expense Entry', 'Expense entry records costs with vendor, project, phase, and category context so financial activity can be reviewed by job, entity, and business purpose.', ['Job-costing context', 'Vendor and project links', 'Entity-aware expense categories'])}
    ${screenSpotlight('invoices', 'Invoices', 'Invoice management supports client billing, invoice review, payment status, and finance-to-portal visibility.', ['Client billing workflow', 'Invoice edit/create screens', 'Payment-link integration point'])}
    ${screenSpotlight('documents', 'Documents', 'The document center organizes finance and project files with upload, camera, tag, search, and review-friendly workflows.', ['Document tags by entity', 'Storage-backed upload flow', 'Project and finance document support'])}
    ${screenSpotlight('controls', 'Construction Finance Controls', 'Houston Enterprise receives construction-grade finance controls including WIP, retainage, AR/AP aging, change order exposure, commitments, and project financial health.', ['WIP and percent complete', 'Retainage AR/AP', 'Commitments versus actuals'])}
    ${screenSpotlight('charts', 'Charts and Analytics', 'Charts transform project, ledger, and entity data into visual management insights for leadership and finance review.', ['Cash-flow visibility', 'Entity performance charts', 'Executive reporting support'])}
    ${screenSpotlight('mobileLedger', 'Mobile Ledger Experience', 'The system is designed to stay usable on mobile devices, including compact ledger and reconciliation views for field or executive review.', ['Mobile-first responsive layout', 'No horizontal overflow in launch tests', 'Finance access on all devices'])}
  </section>

  <section class="chapter">
    <div class="chapter-title"><h2>7. Entity-Specific Experiences</h2><p>Specialized business dashboards for construction, generator operations, and holding-company finance.</p></div>
    <p>The platform is not a one-size-fits-all finance dashboard. Each entity has specialized screens, terminology, categories, and workflows based on what that company actually does.</p>
    <h3>Houston Enterprise</h3>
    <p>Houston Enterprise is modeled as the construction entity. It focuses on projects, construction controls, WIP, retainage, commitments, change orders, draw schedules, invoices, checks, expenses, and project financial visibility.</p>
    <div class="flow"><span>Lead</span><span>Client</span><span>Construction Project</span><span>Scope / SOV</span><span>Change Orders</span><span>Draws</span><span>Invoices</span><span>Ledger</span><span>Reconciliation</span></div>
    <h3>Houston Generator Pros</h3>
    <p>Houston Generator Pros is modeled around generator sales, installation, service agreements, maintenance, emergency service, equipment inventory, installation jobs, outage response, customer sites, and dispatch opportunities.</p>
    <div class="flow"><span>Generator Lead</span><span>Site Survey</span><span>Load Calc</span><span>Permit</span><span>Equipment</span><span>Install</span><span>Inspection</span><span>Commission</span><span>Maintenance Plan</span><span>Storm Response</span></div>
    ${screenSpotlight('hgp', 'Houston Generator Pros Operations Dashboard', 'HGP receives a generator-business dashboard with equipment, service agreements, visits, recurring revenue, emergency service, warranty visibility, and generator-specific performance indicators.', ['Equipment and warranty oversight', 'Service agreements and visits', 'Generator-specific revenue visibility'])}
    ${screenSpotlight('jobs', 'HGP Install Jobs', 'Install Jobs replaces a generic projects table with a generator installation and service pipeline: lead, survey, load calculation, permit, equipment, scheduled install, inspection, commissioning, and maintenance enrollment.', ['Generator install pipeline', 'Permit, inspection, and equipment status', 'Job economics and emergency priority'])}
    ${screenSpotlight('storm', 'HGP Storm Response', 'Storm Response helps HGP monitor outage events, match affected customer sites, plan outreach, and create emergency jobs when customers may need backup power support.', ['Outage provider registry', 'Customer-site impact matching', 'Emergency dispatch workflow'])}
    <h3>Houston Enterprise Holdings</h3>
    <p>Houston Enterprise Holdings is modeled as a holding company. It focuses on notes payable/receivable, debt, interest, capital activity, contributions, distributions, management fees, tax reserves, and consolidated entity performance.</p>
    <div class="flow"><span>Entity Totals</span><span>Notes</span><span>Interest</span><span>Capital Activity</span><span>Distributions</span><span>Tax Reserves</span><span>Consolidated Reporting</span></div>
    ${screenSpotlight('holdings', 'Houston Enterprise Holdings HQ', 'Holdings HQ gives the ownership entity a specialized view for notes payable/receivable, note payments, interest activity, capital contributions, distributions, tax reserves, and consolidated entity totals.', ['Notes payable and receivable', 'Capital activity and distributions', 'Consolidated entity performance'])}
  </section>

  <section class="chapter">
    <div class="chapter-title"><h2>8. Automation and Realtime Operations</h2><p>Database-backed automations that reduce duplicate work and keep records synchronized.</p></div>
    <p>The system includes database-backed automations that reduce manual duplicate entry and help keep operational records aligned.</p>
    <table>
      <thead><tr><th>Automation</th><th>What Happens</th><th>Benefit</th></tr></thead>
      <tbody>
        <tr><td>Admin and Finance Project Sync</td><td>Houston Enterprise admin projects and finance projects are linked and synchronized.</td><td>Teams can manage projects from either dashboard.</td></tr>
        <tr><td>Funded Draw Income</td><td>Funded draw requests post income transactions.</td><td>Project/entity income updates automatically.</td></tr>
        <tr><td>Reconciliation Audit</td><td>Reconcile/reopen changes create audit records.</td><td>Improves financial accountability.</td></tr>
        <tr><td>HGP Visit Income</td><td>Revenue-producing service visits create income entries.</td><td>Service operations and finance stay aligned.</td></tr>
        <tr><td>Holdings Note Payments</td><td>Note payments update balances and post interest activity.</td><td>Debt/capital management becomes more reliable.</td></tr>
        <tr><td>Outage Matching</td><td>Outage events can be matched to HGP customer sites.</td><td>Creates proactive response opportunities during storms.</td></tr>
      </tbody>
    </table>
    <div class="grid-2">
      <div class="card"><h4>Realtime Work Style</h4><p>Important finance, portal, project, entity, map, message, and document tables are subscribed through Supabase realtime channels so changes can be reflected without manual refreshes.</p></div>
      <div class="card"><h4>Data Integrity Work Style</h4><p>Database triggers handle high-value sync paths such as funded draws, service visit revenue, note payments, paid invoices, reconciliation audit rows, and admin-finance project links.</p></div>
    </div>
  </section>

  <section class="chapter">
    <div class="chapter-title"><h2>9. Security and Permissions</h2><p>Authentication, role-based access, entity restrictions, audit logs, and protected data workflows.</p></div>
    <p>The platform uses Supabase authentication, role-based frontend guards, entity module restrictions, Row Level Security policies, storage policies, and audit tables. Users can be scoped as admin, finance manager, finance user, project manager, client, read-only auditor, or viewer.</p>
    <div class="grid-2">
      <div class="card"><h4>Access Control</h4><p>Admin-only areas are restricted, finance areas require finance-compatible roles, and entity-specific modules are only available when relevant to the selected company.</p></div>
      <div class="card"><h4>Auditability</h4><p>Important events can be tracked through reconciliation audit rows, finance audit events, admin changelog records, portal logs, and system health events.</p></div>
    </div>
  </section>

  <section class="chapter">
    <div class="chapter-title"><h2>10. Reporting and Executive Visibility</h2><p>Dashboards, charts, exports, project reports, reconciliation insight, and entity-level oversight.</p></div>
    <p>The platform includes operational dashboards, entity dashboards, finance charts, reconciliation reporting, PDF exports, Excel exports, ledger reports, project reports, invoice reports, and entity-specific performance views.</p>
    <ul>
      <li>Construction leaders can review project financial health, WIP, retainage, aging, commitments, change orders, and draw schedules.</li>
      <li>Generator operations can review equipment, service agreements, jobs, outages, emergency work, recurring revenue, and margin indicators.</li>
      <li>Holdings stakeholders can review notes, interest, capital flows, entity totals, and consolidated performance.</li>
      <li>Finance staff can export reports and reconcile activity with an audit trail.</li>
    </ul>
  </section>

  <section class="chapter">
    <div class="chapter-title"><h2>11. Benefits for the Client</h2><p>The practical business value this platform creates for clients, staff, finance teams, and leadership.</p></div>
    <div class="grid-2">
      <div class="card"><h4>Better Experience</h4><p>Clients get a clear portal instead of fragmented messages, unclear document requests, and uncertain project status.</p></div>
      <div class="card"><h4>Better Operations</h4><p>Admins and project teams can manage clients, projects, meetings, documents, messages, and financial context from one place.</p></div>
      <div class="card"><h4>Better Finance</h4><p>Finance users get entity-aware tools for ledger, reconciliation, income, expenses, checks, invoices, controls, reporting, and auditability.</p></div>
      <div class="card"><h4>Better Growth</h4><p>The system is designed to support more clients, more projects, more entities, and more specialized business lines over time.</p></div>
    </div>
  </section>

  <section class="chapter">
    <div class="chapter-title"><h2>12. Operational Process Maps</h2><p>Visual process maps showing how information flows from website to admin to portal to finance.</p></div>
    <div class="hierarchy">
      <div class="h-row top"><div class="h-node dark"><strong>Website to Operations to Finance</strong><span>Primary platform hierarchy for Houston Enterprise and shared company operations</span></div></div>
      <div class="h-row apps">
        <div class="h-node gold"><strong>Website</strong><span>Services, portfolio, contact, project intake</span></div>
        <div class="h-node gold"><strong>Admin Dashboard</strong><span>Client approval, docs, meetings, messages, project ops</span></div>
        <div class="h-node gold"><strong>Client Portal</strong><span>Client-facing project, documents, messages, payments</span></div>
        <div class="h-node gold"><strong>Finance Dashboard</strong><span>Project accounting, ledger, controls, reporting</span></div>
      </div>
      <div class="arrow">FINANCE ENTITY SELECTOR OPENS THREE SPECIALIZED OPERATING MODELS</div>
      <div class="h-row entities">
        <div class="h-node"><strong>Houston Enterprise</strong><span>Construction projects, WIP, retainage, commitments, draws, change orders</span></div>
        <div class="h-node"><strong>Houston Generator Pros</strong><span>Generator sales, installs, service visits, equipment, customer sites, outages</span></div>
        <div class="h-node"><strong>Houston Enterprise Holdings</strong><span>Notes, interest, capital activity, distributions, consolidated entity performance</span></div>
      </div>
    </div>
    <div class="grid-3">
      <div class="card"><h4>Construction Management Cycle</h4><ul><li>Lead and project intake</li><li>Admin review and client approval</li><li>Project, scope, SOV, milestones</li><li>Change orders and draw schedules</li><li>Invoices, checks, ledger, reconciliation</li></ul></div>
      <div class="card"><h4>Generator Operations Cycle</h4><ul><li>Customer site and equipment registry</li><li>Survey, permit, install, inspection</li><li>Service plans and visits</li><li>Emergency response and storm monitoring</li><li>Revenue posting into finance</li></ul></div>
      <div class="card"><h4>Holdings Management Cycle</h4><ul><li>Notes payable/receivable</li><li>Interest and principal movements</li><li>Capital contributions/distributions</li><li>Entity performance visibility</li><li>Consolidated finance reporting</li></ul></div>
    </div>
  </section>

  <section class="chapter">
    <div class="chapter-title"><h2>13. Enterprise Capability Matrix</h2><p>A high-level matrix of what the platform can manage across business operations.</p></div>
    <table class="matrix">
      <thead><tr><th>Capability</th><th>Where It Lives</th><th>What It Does</th><th>Why It Matters</th></tr></thead>
      <tbody>
        <tr><td>Lead Capture</td><td>Website / Admin</td><td>Captures contact and start-project submissions and routes them into admin review.</td><td>Turns marketing activity into structured operational data.</td></tr>
        <tr><td>Client Collaboration</td><td>Client Portal / Admin</td><td>Messages, documents, meetings, milestones, payments, gallery, and project status.</td><td>Improves client trust and reduces scattered communication.</td></tr>
        <tr><td>Project Operations</td><td>Admin / Finance</td><td>Admin projects, finance projects, milestones, documents, project details, scopes, draw schedules.</td><td>Creates one shared operational source of truth.</td></tr>
        <tr><td>Financial Control</td><td>Finance Dashboard</td><td>Ledger, checks, income, expenses, invoices, vendors, reconciliation, audit trail.</td><td>Supports accurate financial operations and management review.</td></tr>
        <tr><td>Construction Finance</td><td>Houston Enterprise Finance</td><td>WIP, percentage complete, retainage, AR/AP aging, change orders, commitments.</td><td>Gives construction leadership visibility into risk and profitability.</td></tr>
        <tr><td>Generator Operations</td><td>HGP Finance</td><td>Equipment, service agreements, visits, install jobs, storm response, outage matching.</td><td>Aligns service operations with revenue and emergency opportunity response.</td></tr>
        <tr><td>Holdings Oversight</td><td>Holdings Finance</td><td>Notes, note payments, interest posting, capital activity, entity performance.</td><td>Supports owner-level financial management and consolidated visibility.</td></tr>
        <tr><td>Reporting</td><td>Finance / Admin</td><td>Dashboards, charts, PDFs, Excel/CSV exports, project and ledger reporting.</td><td>Makes the platform useful for management meetings, audits, and client conversations.</td></tr>
        <tr><td>Security</td><td>Global</td><td>Supabase auth, roles, module guards, RLS, audit logs, system health events.</td><td>Protects business data and supports enterprise operating discipline.</td></tr>
      </tbody>
    </table>
    <div class="lux-band">
      <h3>Client Value Statement</h3>
      <p>The platform gives the business a branded customer experience, an internal operating command center, and an entity-aware finance system. That combination is what makes it more valuable than separate tools: the same client, project, document, finance, and operational data can move through the company without being manually recreated in every department.</p>
    </div>
  </section>

  <section class="chapter">
    <div class="chapter-title"><h2>14. Launch Readiness</h2><p>Current readiness signals, validation, and the difference between client-facing and engineering documentation.</p></div>
    <p>The platform has been verified through production build, unit tests, focused finance linting, and Playwright launch tests covering authentication redirects, mobile overflow, entity switching, HGP revenue posting, Holdings note payments, ledger context labels, funded draw income flow, and reconciliation audit workflows.</p>
    <table>
      <thead><tr><th>Validation</th><th>Result</th></tr></thead>
      <tbody>
        <tr><td>Production build</td><td>Passed</td></tr>
        <tr><td>Unit tests</td><td>Passed</td></tr>
        <tr><td>Focused finance lint</td><td>Passed</td></tr>
        <tr><td>Playwright launch suite</td><td>Passed</td></tr>
      </tbody>
    </table>
    <p class="note">This document is client-facing. Internal engineering details, code-level migration notes, and technical risk registers are maintained separately in the engineering specification.</p>
  </section>
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
  headerTemplate: '<div style="font-size:8px;color:#7a7063;width:100%;padding:0 34px;">HOU INC Platform Overview</div>',
  footerTemplate: '<div style="font-size:8px;color:#7a7063;width:100%;padding:0 34px;text-align:right;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
  margin: { top: '0.58in', right: '0.48in', bottom: '0.55in', left: '0.48in' },
});
await browser.close();

console.log(pdfOut);
