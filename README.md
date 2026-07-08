# HOU INC Financial Hub

A full-stack web platform for Houston Enterprise (HOU INC), a luxury residential and commercial construction company based in Houston, TX. The platform serves three distinct audiences through three integrated sub-systems built with React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, and Supabase.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│              HOU INC Financial Hub                      │
├────────────────┬───────────────────┬────────────────────┤
│  Public Site   │  Client Portal    │  Finance Sector    │
│  (marketing)   │  (client-facing)  │  (internal ops)    │
│  /             │  /portal/*        │  /finance          │
│  /services     │                   │  /checks           │
│  /portfolio    │                   │  /income           │
│  /about        │                   │  /expenses         │
│  /contact      │                   │  /projects         │
└────────────────┴───────────────────┴────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript + Vite |
| Routing | React Router DOM v6 |
| Styling | Tailwind CSS v3 + Radix UI primitives |
| Animation | Framer Motion v12 |
| State / Data | TanStack Query v5 + Supabase |
| Charts | Recharts |
| PDF Export | jsPDF + jsPDF-AutoTable |
| Excel Export | XLSX (SheetJS) |
| Invoicing | Custom invoice engine + optional Stripe integration |
| Voice AI | ElevenLabs Conversational AI SDK |
| Web Scraping | Firecrawl REST API |
| Auth (finance) | Supabase Auth (protected routes via `<Protected>`) |
| Auth (admin/portal) | Custom localStorage session |
| Typography | Cormorant Garamond (serif) via Google Fonts |
| Icons | Lucide React |
| Notifications | Sonner toast |

---

## Sub-Platform 1 — Public Marketing Website

The external-facing brand presence for Houston Enterprise. Built as a luxury construction marketing site with premium animations, Cormorant Garamond typography, and a gold/black design system.

### Routes

| Route | Page | Description |
|---|---|---|
| `/` | Home | Hero with parallax scroll, floating service cards, differentiator accordion, stats counters, testimonials, project showcase, contact CTA |
| `/services` | Services | Full breakdown of Residential Construction, Commercial Construction, and Project Management services |
| `/portfolio` | Portfolio | Project gallery — items managed via Admin panel, synced through localStorage |
| `/about` | About | Company story, founders Jeff Ali & David Alvares, team values, Houston roots |
| `/contact` | Contact | Contact form — submissions persisted to localStorage, visible in Admin panel |

### Layout (`PublicLayout.tsx`)

Shared wrapper for all public pages containing:

- **Sticky header** (72px, `position: fixed`, `overflow: visible`) with logo, nav links, and CTAs
- **Services mega menu** — 3-column panel mounted inside the header DOM as `position: absolute, top: 100%`. On desktop, hovering the Services nav link opens it; cursor moving into the panel stays within the header's DOM tree so there is no hover gap. On mobile, tapping opens it. Three service pillars — Residential Construction, Commercial Construction, Project Management — each with animated gold sweep bar on hover.
- **Mobile menu** — Full-viewport (`position: fixed, inset: 0`) slide-in overlay with cream background. Contains nav links with gold separators, quick-access rows (Client Portal, Start a Project, View Portfolio), and a contact info strip.
- **Footer** — 4-column grid (brand, services, company, contact) with gold accent rule and copyright strip.

### Motion System (`src/components/motion/`)

| Component | Behavior |
|---|---|
| `Reveal` | Scroll-triggered fade-up entrance, configurable delay |
| `AnimatedCounter` | Number animates up when entering the viewport |
| `TiltCard` | 3D perspective tilt on mouse move |
| `MagneticButton` | Button pulled toward cursor on hover |
| `Marquee` | Continuously scrolling horizontal ticker |

### Design Tokens

```
BLACK  = '#0A0A0A'   CREAM  = '#F7F5F1'   ACCENT = '#9D7E3F'
WHITE  = '#FFFFFF'   G200   = '#E8E8E6'   ACL    = '#C4A76B'
SERIF  = 'Cormorant Garamond, Georgia, serif'
```

### Differentiator Accordion (Home.tsx)

The "The Standard Your Project Deserves" section features 4 interactive accordion rows:

| # | Title | Stats |
|---|---|---|
| 01 | Two Decades of Houston Mastery | 200+ projects · $800M+ built · 450+ trade partners |
| 02 | End-to-End Accountability | 1 point of contact · Zero handoffs · 100% in-house PM |
| 03 | On Time. On Budget. | 98% on-time delivery · $0 budget surprises · 100+ commercial projects |
| 04 | Radical Transparency | 24/7 portal access · Daily site updates · 100% cost visibility |

**Interaction:** Desktop — hover opens row (detected via `(hover: hover) and (pointer: fine)` media query). Mobile — tap to toggle. Animation is a pure `height: 0 → auto` reveal at 0.40s with no opacity delay so content is immediately visible. Each open row reveals a pull quote, a 3-column stat grid with hairline separators, and a 2-column capability list.

---

## Sub-Platform 2 — Client Portal

A self-service portal for prospective and active construction clients. Fully functional without a backend — all state stored in `localStorage`.

### Routes

| Route | Page | Description |
|---|---|---|
| `/portal` | PortalAuth | Register a new account or sign in. Split-screen layout with animated feature list on the right. |
| `/portal/dashboard` | PortalDashboard | Post-login home — 5-step project status pipeline, quick-access cards, time-of-day greeting |
| `/portal/project` | PortalProject | Multi-step project brief wizard: project type (6 options), style (8 options), size, rooms, budget, timeline, description |
| `/portal/messages` | PortalMessages | Messaging thread with builder Jeff Ali. Smart auto-replies respond contextually to budget, timeline, meetings, design, permits, and materials topics. Quick-prompt chips included. |
| `/portal/documents` | PortalDocuments | Document center — pre-seeded required docs (intake form, proof of identity, proof of funds, site plan). Drag-and-drop upload. Status: pending / uploaded / approved / rejected. |
| `/portal/meetings` | PortalMeetings | Meeting scheduler — 8 meeting types, time slots, format (In-Person / Video Call / Phone Call). Status: requested → confirmed → completed / cancelled. |

### Project Status Pipeline

```
Account Created → Brief Submitted → Consultation Scheduled → Proposal Delivered → Build Underway
```

### localStorage Keys

| Key | Contents |
|---|---|
| `hou-portal-clients` | Registered client accounts |
| `hou-portal-session` | Active portal session |
| `hou-portal-briefs` | Project brief per client ID |
| `hou-portal-messages` | Message thread per client ID |
| `hou-portal-docs` | Document records per client ID |
| `hou-portal-meetings` | Meeting requests per client ID |

### Builder Info (hardcoded in `usePortal.ts`)

```
Jeff Ali — Co-Founder & Principal Builder
Phone:   (281) 915-9595
Email:   jeff@houinc.com
Bio:     25+ years building luxury residential and commercial projects across greater Houston
```

---

## Sub-Platform 3 — Finance Sector

A private financial operating system for HOU INC's internal bookkeeping, project accounting, and reporting. All routes wrapped in `<Protected>` — redirects unauthenticated users to `/auth`.

**Default credentials:** `admin@houinc.com` / `houinc2024` (configurable via `/settings`)

### Routes

| Route | Page | Description |
|---|---|---|
| `/auth` | Auth | Supabase email + password sign-in |
| `/finance` | Overview | Command center — 4 KPI tiles, cash flow chart, balance trend, inflow/outflow charts, pending aging, recent activity feed, quick-action tiles |
| `/ledger` | Ledger | Combined ledger of all transactions and checks — sortable, filterable, time-filtered |
| `/checks` | Checks | Check register with status management (pending / cleared / voided), vendor linking, project linking |
| `/checks/new` | CheckNew | Issue a new check — payee, amount, check number, date, memo, project/vendor |
| `/income` | TxnPage | Income transaction log — amount, date, source name, category, project |
| `/expenses` | TxnPage | Expense transaction log — amount, date, vendor, category, project |
| `/projects` | Projects | Project roster — name, code, budget, status, notes |
| `/projects/:id` | ProjectDetail | Per-project financial breakdown — linked transactions, checks, invoices, budget utilization |
| `/vendors` | Vendors | Vendor/subcontractor directory — name, email, phone, address |
| `/invoices` | Invoices | Invoice register — status (draft / sent / paid / overdue), overdue badge in sidebar, PDF/Excel export |
| `/invoices/new` | InvoiceNew | Invoice builder — line items, tax rate, client details, auto-invoice numbers, PDF download, Stripe payment link |
| `/invoices/:id` | InvoiceNew | Edit existing invoice |
| `/charts` | Charts | Analytics — bar, pie, line, area, and composed charts. Time-filtered. |
| `/concierge` | Concierge | Guided entry wizard for income, expenses, checks, vendors, and projects. Conversational multi-step form. |
| `/glossary` | Glossary | Searchable financial glossary — 9 categories, PDF export |
| `/settings` | Settings | Profile name, admin credentials, theme selection, Stripe API key + live connection test |

### Supabase Schema

| Table | Key Columns |
|---|---|
| `transactions` | `amount`, `type` (income/expense), `category`, `date`, `source_name`, `vendor_id`, `project_id`, `notes`, `deleted_at` |
| `checks` | `check_number`, `payee_name`, `payee_vendor_id`, `project_id`, `amount`, `issue_date`, `status`, `memo`, `deleted_at` |
| `projects` | `name`, `code`, `budget`, `status`, `notes`, `deleted_at` |
| `vendors` | `name`, `contact_email`, `contact_phone`, `address`, `deleted_at` |
| `profiles` | `user_id`, `display_name`, `email` |
| `audit_log` | `event_type`, `user_id`, `resource_type`, `resource_id`, `ip_address`, `geo_city`, `geo_country`, `success` |

**Enums:** `check_status` (pending / cleared / voided) · `project_status` (active / completed / on_hold / cancelled)

All tables use soft deletes (`deleted_at` nullable timestamp).

### Finance Hooks (`useFinance.ts`)

| Hook | Description |
|---|---|
| `useTransactions(kind)` | Fetches income or expense records via React Query |
| `useChecks()` | Fetches check register |
| `useProjects()` | Fetches project list |
| `useVendors()` | Fetches vendor directory |
| `useUpsert(table)` | Generic insert/update mutation |
| `useQuickCreate` | Multi-entity create helper used by Concierge |

### Invoice Engine

- Stored in `localStorage` (`hou-invoices`)
- Auto-generated invoice numbers: `INV-YYYY-NNNN`
- Line items: description, quantity, rate
- Subtotal / configurable tax rate / total calculation
- PDF generation with branded HOU INC header (`invoicePDF.ts`)
- Stripe payment link generation via Stripe API (`/v1/payment_links`)
- Excel export via SheetJS

### Export Capabilities

| Report | Formats | Triggered From |
|---|---|---|
| Ledger Report | PDF | Overview, Ledger |
| Check Register | PDF + Excel | Checks |
| Income/Expense Report | PDF + Excel | Income, Expenses |
| Invoice Register | PDF + Excel | Invoices |
| Individual Invoice | PDF | InvoiceNew |
| Project Report | PDF | Projects |
| Glossary | PDF | Glossary |

All PDFs use a branded template: red accent stripe, black header band, HOU INC wordmark, report title, and auto-table body.

---

## Admin Panel (`/admin`)

Internal management panel protected by a local password gate (`houinc2024`). No Supabase session required.

| Tab | Description |
|---|---|
| Overview | Live stats — portal clients, submitted briefs, pending docs, unread messages, upcoming meetings |
| Users | Full client roster with brief status, contact info, delete capability |
| Submissions | Public contact form submissions from `/contact` |
| Portfolio | Full CRUD for portfolio items — title, category, location, sq ft, year, description, featured flag. Changes propagate to `/portfolio` via localStorage. |
| Finance | Finance report log |
| Analytics | Platform-level usage analytics |

**Default portfolio items (seeded):**
- Chambord River Oaks Estate — 14,500 sq ft luxury residential (2024)
- Westway Commerce Campus — 212,000 sq ft commercial/industrial (2024)
- The Meridian Tower Retail — 98,000 sq ft retail/mixed-use (2023)
- Memorial Custom Home — 8,200 sq ft luxury residential (2023)
- Post Oak Medical Plaza — 45,000 sq ft medical office (2022)

---

## Tools

### Web Scraper (`/scraper`)

A Firecrawl-powered web intelligence tool. No authentication required to access.

| Mode | Description |
|---|---|
| Scrape | Single-page extraction — returns Markdown content, page metadata (title, OG tags, language, keywords), and all outbound links |
| Crawl | Multi-page site crawl — configurable depth, live progress polling, paginated results |

Features: copy to clipboard, download as `.md`, scrape history (last 20 sessions in localStorage), cancel active crawls.

**Requires:** `VITE_FIRECRAWL_API_KEY`

---

## Voice AI — ElevenLabs Agent

A floating microphone button rendered globally within the Finance Sector (`AppShell.tsx`). Appears only on finance routes.

**Tool capabilities (callable by voice):**

| Category | Tools |
|---|---|
| Navigation | Navigate to any finance route |
| Read | Summarize transactions, checks, projects, vendors, invoices, balances |
| Write | Create income, expenses, checks, vendors, projects, invoices |
| Export | PDF, Excel, and CSV exports for any entity |

**Requires:** `VITE_ELEVENLABS_AGENT_ID`

---

## Authentication Summary

| Area | Mechanism | Default Credentials |
|---|---|---|
| Finance Sector | Supabase Auth | `admin@houinc.com` / `houinc2024` |
| Admin Panel | localStorage password gate | `houinc2024` |
| Client Portal | Custom registration/session | User-created |

---

## Theme System

Dark and light modes for the Finance Sector. Toggled via the sidebar or mobile header. Persisted to localStorage. Four themes configurable in `/settings`: Default, Slate, Rose, Emerald.

---

## Environment Variables

Create a `.env` file at the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_FIRECRAWL_API_KEY=your_firecrawl_api_key
VITE_ELEVENLABS_AGENT_ID=your_elevenlabs_agent_id
```

---

## Development

```bash
npm install
npm run dev        # Vite dev server (port 8080)
npm run build      # Production build
npm run preview    # Preview production build
npm run test       # Vitest test suite
npm run lint       # ESLint
```

---

## Company

```
Houston Enterprise (HOU INC)
Est. 1998 · Houston, Texas

Co-Founders:  Jeff Ali · David Alvares
Phone:        (281) 915-9595
Email:        Info@Houinc.com
Address:      2100 W Loop South, Suite #1115, Houston, TX 77027
Services:     Residential Construction · Commercial Construction · Project Management
```
