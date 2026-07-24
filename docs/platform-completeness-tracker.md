# HOU INC Platform Completeness Tracker

Last updated: 2026-07-23 (launch punch-list closure pass — mobile table CSS
fix, Holdings balance sheet wired in, FinanceControls made entity-aware,
Checks reconciliation bugs fixed, production code-splitting, Projects card
redesign across every dashboard, and a much larger-than-expected QA test-data
archive across 19 tables — see the dated section at the bottom for full
detail; prior pass 2026-07-22 covered the Projects/admin pagination sweep,
2026-07-19 covered pagination + transaction-drawer redesign + full-platform
deep audit, further down). Companion machine-readable file:
`platform-completeness-tracker.json` — update both together.

**Scoring rules**: a row is *Complete* only when the workflow is database-backed,
UI-exposed, and covered by a passing automated test or live verification RPC.
*Launch-ready* means production-usable today with known, documented gaps.
Percentages are the assessment of the last agent pass that touched the area —
grounded in the verification RPCs and test suite, not vibes.

## Overall

| Scope | Completion | Status |
|---|---|---|
| **Platform overall** | **97%** | Launch-ready, with a short punch list below |
| Public Website | 90% | Launch-ready |
| Client Portal | 86% | Launch-ready |
| Admin Dashboard | 93% | Launch-ready |
| Finance Dashboard | 98% | Launch-ready |

## By entity

| Entity | Completion | Status | Notes |
|---|---|---|---|
| Houston Enterprise (construction) | 96% | Launch-ready | Full construction finance stack; Checks reconciliation KPI/badge bug and Reconciliation Progress div-by-zero fixed 2026-07-23; Projects screen QA-archived and redesigned |
| Houston Generator Pros | 97% | Launch-ready | Jobs, storm response, inventory, procurement, job invoices, reports all live-tested and working; 2026-07-23 discovered and archived ~700 QA test rows across 10 HGP tables (jobs, sites, visits, parts, equipment, POs, outage events, payments, movements) that had been silently accumulating since mid-July |
| Houston Enterprise Holdings | 95% | Launch-ready | Balance sheet now surfaced on Holdings HQ overview (2026-07-23, RPC existed but was never wired into the UI); FinanceControls no longer shows construction-only WIP/commitments language for this entity; 2026-07-23 archived ~350 QA test rows (notes, covenants, note payments, capital activity) — those tables had been 100% test data |

## By workflow

| Workflow | % | Status | Remaining work | Priority | Complexity | Verification |
|---|---|---|---|---|---|---|
| Lead capture (contact/start-project → admin) | 95 | Complete | — | Low | — | Forms write `contact_submissions`/`start_project_submissions`; admin Leads tab |
| Client onboarding (invite → portal) | 90 | Launch-ready | Invite-flow automated test | Low | S | `portal_invites` + `/portal/invite`; manual QA |
| Portal communication (messages/meetings) | 85 | Launch-ready | Realtime message test; meeting reminder emails absent | Med | M | Admin↔portal tables + realtime channels |
| Document requests/uploads | 90 | Launch-ready | Portal upload automated test | Low | S | Admin presets + typed requests; `documents` bucket; entity tag chips |
| Project management (admin ↔ finance sync) | 95 | Complete | — | Low | — | FK link + depth-guarded triggers; live playwright |
| Construction finance (WIP/draws/retainage/CO/commitments) | 95 | Complete | Cost-code/phase report polish | Low | M | 7-check `verify_finance_launch_migrations()`; live draw test |
| Cost-to-Complete forecasting / EAC-WIP / AP compliance (HE) | 96 | Complete | Cost-code line items are still manually entered per commitment (no bulk import); red/yellow thresholds are fixed constants, not per-project configurable | Low | S | `verify_ctc_commitments_wip()` + `verify_ctc_combined_ap_guard_fix()` live; trigger stress-tested with real inserts (see note below) |
| Generator operations (inventory/plans/visits/jobs) | 96 | Complete | Recurring maintenance billing automation | Med | M | `verify_hgp_field_ops` + inventory/procurement/job-payment live tests |
| Storm response (outages → dispatch) | 90 | Complete | Edge-function polling (terms-gated); site map overlay | Med | L | Live outage→dispatch playwright test |
| HGP dispatch (technician/status) | 95 | Complete | — | Low | — | `verify_dispatch_capital_approvals()` live |
| HGP command map (coords/markers/locate) | 95 | Complete | — | Low | — | `verify_hgp_command_map()` live |
| HGP inventory (parts/scan/deploy/job costing) | 95 | Complete | — | Low | — | `verify_hgp_inventory()` live |
| Holdings notes/debt/capital | 94 | Complete | — | Low | — | Amortization + note-payment live tests |
| Holdings covenants | 95 | Complete | — | Low | — | `verify_holdings_covenants()` live |
| Holdings capital approvals | 95 | Complete | — | Low | — | `verify_dispatch_capital_approvals()` live |
| Ledger/reconciliation (context, audit, bank match) | 96 | Complete | **Fixed 2026-07-23** — Checks KPI now counts `reconciliation_status === 'reconciled'` only (matches what the row badges show, dropping the `OR status === 'cleared'` clause that made the two contradict each other); Reconciliation Progress ring on the project overview no longer shows a misleading 0% when a project has payments collected but nothing billed yet — shows "ahead of billing" instead. Remaining: AP aging fills only when unpaid bills logged (workflow discipline, not a bug) | Low | — | Recon-audit + ledger-context live tests |
| Invoices/payments | 94 | Launch-ready | Recurring service billing automation | Med | M | Paid-invoice→income trigger live; external payment links embedded in PDF |
| Reporting/exports | 95 | Launch-ready | Add automated PDF visual regression later | Low | M | Entity Reports tab, pay apps, cost-code, HGP ops, Holdings board packet |
| Security/RLS/roles | 93 | Launch-ready | `admin_changelog` SELECT policy queried `auth.users` directly (42501 permission denied, audit trail always showed empty) — **fixed this pass**, migration `20260719000003`; role-management UI still lacks an automated test; storage policy review pass still open | High | M | Recursion-repair verified; owner-RLS on all entity tables; `verify_changelog_rls_repair()` live |
| Mobile responsiveness | 93 | Launch-ready | **Fixed 2026-07-23** — the unlayered `.finance-mobile-surface *{min-width:0}` rule in `src/index.css` always beat every `@layer`-based Tailwind utility regardless of specificity (unlayered CSS wins over any layer by cascade-layer rules), collapsing deliberate `min-w-[...]` table-column widths to illegible sizes on mobile. Scoped the reset to exclude `.overflow-x-auto` and its descendants (the wrapper class every scrollable table already uses) so the flex-shrink fix it was meant to provide still works without nuking table columns. Remaining: tablet screenshot sweep still open | Med | — | Fix verified against the mechanism (cascade layers), not yet re-run through the full Playwright mobile-overflow suite |
| Performance/scaling | 97 | Complete | **Fixed 2026-07-19**, extended 2026-07-22 (pagination) and 2026-07-23 (code-splitting) — pagination now covers every unbounded list found across three passes (finance + admin, see prior notes). Code-splitting: every one of the ~55 page components in `src/App.tsx` converted to `React.lazy()` behind a single `<Suspense>` boundary, plus a `vendor-react` manual chunk for React/ReactDOM/React Router. The single 7.9MB/2.1MB-gzip JS chunk is gone — production build now emits 200+ chunks, largest are `mapbox-gl` (510KB gzip) and the PDF/Excel `reports` bundle (435KB gzip), both now isolated so a portal client or public-site visitor never downloads either. Verified: `npm run build` produces the split output, and a live Playwright check on the built app confirmed the Home and Portal pages load neither `mapbox-gl` nor `reports` chunks, zero console errors | Low | — | Live Playwright sweep across 11 screens (2026-07-19) + all 8 admin tabs and both Projects screens (2026-07-22) + built-app smoke test confirming lazy chunk isolation (2026-07-23): zero console errors throughout |
| Launch documentation | 95 | Complete | Keep in sync per pass | Low | — | `enterprise-launch-readiness-checklist.md` + this tracker |
| Entity-context reliability (multi-entity switching) | 100 | Complete — fixed this pass | `EntityContext.tsx` restored the active entity via an independent `supabase.auth.getUser()` network call on every mount; a transient failure was silently swallowed and defaulted the whole session to Houston Enterprise with no visible error — live-reproduced causing a real HGP transaction to get created under the wrong legal entity. Fixed by sourcing from `useAuth()`'s already-resolved session instead of a redundant network call; stress-tested with the `auth/v1/user` endpoint fully blocked across 3 reloads, entity selection held | Critical (fixed) | S | Live Playwright repro: entity survives 6 reloads incl. 3 with the endpoint blocked |

## Deferred (tracked, not blocking)

| Item | Foundation in place | Next step | Complexity |
|---|---|---|---|
| Outage polling Edge Function | Provider registry with terms notes | Edge Function per provider where terms permit | L |
| Technician scheduling board | technician/dispatch columns (mig 22) | Per-tech lanes on the 8-week planner | M |
| Recurring maintenance billing | Agreements with annual_value + renewal pipeline | Invoice generation from active plans | M |
| Cost-code/phase reporting (HE) | `finance_cost_codes`/divisions tables + hooks | Add deeper budget import tooling if needed | M |

## Migration gate status (live-probed 2026-07-19)

**All 21 `verify_*()` diagnostic RPCs on the live database return `ok = true`** —
re-probed directly via the Supabase Management API this pass, not assumed from
a prior doc. Every migration through `20260719000003_changelog_rls_repair.sql`
is applied and verified, including three that this same doc previously listed
as "pending apply" (`20260718000003`–`006`) and three more that were live but
untracked in this file (`20260718000007`–`009`, HE procurement/hedge engine +
entity client accounts + finance/portal separation). Nothing is actually
pending — the doc was stale, not the database.

Full applied-and-verified list: chain 10–26 (HGP procurement/scheduling)
→ `20260718000003` invoice intelligence job link → `20260718000004` accounting
period close → `20260718000005` fixed assets depreciation → `20260718000006`
holdings balance sheet → `20260718000007` HE procurement/hedge engine →
`20260718000008` entity client accounts → `20260718000009` finance/client
portal separation → `20260719000001` admin help requests → `20260719000002`
ledger sort-by-recency → `20260719000003` changelog RLS repair →
`20260719000004` commitments/CTC-forecasting/EAC-WIP/AP-compliance-guard →
`20260719000005` combined transactions+checks AP guard fix (same day
follow-up, closes a cross-table exposure loophole found via live testing).
23 `verify_*()` diagnostics now pass (added `verify_ctc_commitments_wip()`
and `verify_ctc_combined_ap_guard_fix()`).

Baseline test battery, re-run 2026-07-19: `tsc --noEmit` clean, `eslint`
clean (one pre-existing, unrelated `prefer-const` error in
`ProjectManager.tsx:1075`, not touched this pass), Vitest 15/15, `npm run
build` clean (flags one perf item — see Performance/scaling row above:
single 7.9MB/2.1MB-gzip JS chunk, no code-splitting).

## 2026-07-19 deep audit — fixed this pass

Found via three parallel live Playwright crawls (Houston Enterprise; HGP +
Holdings; Admin + Client Portal) covering every route in the app while signed
in as an admin user, plus manual verification of each fix below.

1. **Change Orders were completely non-functional while reporting false
   success.** `handleCreateCO` (`src/pages/Admin.tsx`) inserted a `title`
   column that doesn't exist on the live `change_orders` table (schema drift
   between migration `20260711000001_cross_platform_bridges.sql`'s
   `CREATE TABLE IF NOT EXISTS` and the table as it actually exists — the
   live table uses `number`, not `title`) and never checked the insert's
   `error`, so the admin always saw "Change order created and client
   notified" — and the client really was auto-messaged — while no row was
   ever saved. `PortalPayments.tsx` had the matching `select('...title...')`
   bug, so the portal's Change Orders panel was permanently empty. Fixed:
   both files now use the real `number` column, and `handleCreateCO` throws
   on a real insert error instead of swallowing it. Verified live — a real
   change order now persists and immediately appears in the Changelog.
2. **Changelog/Audit Trail was always empty — 42501 permission denied.** The
   `admin_read_changelog` RLS policy queried `auth.users` directly, which
   requires a grant Supabase doesn't provide by default. Inserts worked
   (different, working policy), so rows were silently accumulating,
   unreadable, since the table was created. Fixed via migration
   `20260719000003_changelog_rls_repair.sql` — policy now matches the
   working INSERT policy's `auth.uid() IS NOT NULL` pattern. Verified live:
   the Changelog screen went from "No entries yet" to **500 of 500 entries**,
   including audit history from earlier in this same project's life that was
   never previously visible to anyone.
3. **Entity selection could silently revert, mislabeling financial data
   across legal entities.** See the "Entity-context reliability" row above —
   this is the most severe finding of the pass. Fixed in
   `src/contexts/EntityContext.tsx`; stress-tested with the relevant auth
   endpoint fully blocked.

## 2026-07-19 deep audit — open findings (not fixed this pass)

Judgment calls or larger scope, intentionally left for a follow-up pass
rather than fixed opportunistically:

- ~~`FinanceControls.tsx` isn't entity-aware~~ — **fixed 2026-07-23**. See the
  dated section below for the resolution (entity-aware header copy + WIP/
  commitments sections now only render for construction).
- ~~Checks reconciliation KPI vs. row-badge inconsistency~~ and
  ~~Reconciliation Progress ring div-by-zero~~ — **fixed 2026-07-23**, see
  the Ledger/reconciliation row above.
- **Committed Cost Index has no upper-bound guard** — a test project with a
  $0 contract value against a $25M+ check displayed as "10076%" committed
  consistently across Overview/Controls/Charts (internally consistent, just
  needs a "no contract set" state instead of a 5-digit percentage). Still open.
- **`Vendors.tsx` hardcodes the "Counterparties" eyebrow** for every entity
  instead of using the same `screenHeaderFor` pattern its title/description
  already use — cosmetic, one line. Still open.
- ~~Holdings HQ dashboard never surfaces the balance sheet~~ — **fixed
  2026-07-23**, see the dated section below.
- Public-site pages all share one generic `<title>` tag rather than
  per-page titles — minor SEO gap, not functional. Still open.

## 2026-07-19 (same day, follow-up pass) — pagination sweep + transaction UX polish

User-reported pain point: several finance screens rendered every row at once
with no way to page through them. Fixed by building a shared
`src/hooks/usePagination.ts` + `src/components/PaginationBar.tsx` pair and
applying it everywhere an unbounded list was found — see the updated
Performance/scaling row above for the full list of screens. Verified with a
live Playwright sweep across 11 screens (entity switching + every touched
page) showing zero console errors, plus a clean `tsc`/`eslint`/Vitest/build
pass.

Same pass also (1) rebuilt `src/components/FinanceDetailDrawer.tsx` (the
Vendors detail panel) to match the more polished icon-labeled/stat-tile card
design already used by the Income/Expense and Checks transaction inspectors,
and (2) converted the Ledger "Signed Correction" edit form's ~13 free-text
status/category/payment-method/cost-type fields to real dropdowns sourced
from the live DB CHECK constraints (new `src/lib/financeFieldOptions.ts`),
extracting the category picker into a shared `src/components/CategorySelect.tsx`
used by both the Ledger form and the Income/Expense guided forms so they
can never drift out of sync with each other or with what the database
actually accepts.

## 2026-07-19 (later same day) — Commitments, Cost-to-Complete forecasting, EAC-based WIP, AP compliance guard (Houston Enterprise)

Built the construction-ERP layer requested: cost-code line items on
subcontract/PO commitments, a project-manager Cost-to-Complete worksheet, an
earned-value (EAC) WIP reconciliation feed, and a database trigger enforcing
subcontractor billing discipline. Migration `20260719000004` (schema, RPCs,
trigger) plus a same-day fix migration `20260719000005` — see below.

**Discovered before building anything**: most of the "core schema" the
request assumed didn't exist yet actually did — `finance_commitments`,
`finance_cost_codes`, and a cost-ratio WIP view/RPC were all already live
from earlier work. Built additively on top rather than recreating: new
`finance_commitment_lines` (cost-code breakdown per commitment),
`finance_project_cost_budgets` (per-project-per-cost-code original budget +
PM's live forecasted-cost-to-complete), `finance_lien_waivers`, an
orthogonal `transactions.compliance_hold` flag (not overloading the
already-locked `status` CHECK constraint), `get_cost_to_complete_worksheet()`
+ `upsert_project_cost_budget()` RPCs, and `get_wip_reconciliation()`
(EAC-based, additive alongside the existing cost-ratio WIP RPC — both are
shown side by side in `/finance/controls` with an explanation of the
difference). Seeded a starter 17-code construction cost-code list for HE
since the master list existed but had never been populated.

**UI**: `/admin/projects/:id/forecasting` (new `src/pages/admin/ProjectForecasting.tsx`,
gated to `admin`/`project_manager`, reusing a new shared `AdminPinGate`
component so it sits in the same security perimeter as `/admin` without
duplicating the PIN logic) — a dense desktop grid / mobile-card worksheet
with inline-editable Original Budget and Forecasted Cost to Complete cells
(debounced autosave), color-coded variance flags, and an "Add Cost Code"
picker. `/finance/controls` gained a WIP Reconciliation section and the
existing Committed Costs panel gained expandable cost-code line-item entry
per commitment. `ProjectBreakdown.tsx`'s Draws tab now blocks new draw
creation with a clear banner + deep-link when any cost code is red-flagged,
and the Overview tab surfaces a "Cost-to-Complete Forecast" quick action once
a project has commitments.

**Bug found and fixed via live testing, not code review**: the AP compliance
trigger's max-dollar guard originally computed prior-invoiced exposure
*separately per table* — a check-insert only summed prior checks, a
transaction-insert only summed prior transactions — so a vendor could bypass
a commitment's dollar cap entirely by mixing payment methods, exactly the
loophole the migration's own comment claimed to close. Live-reproduced: $800
in prior expense transactions plus a new $500 check (combined exposure
$1,300 against a $1,000 commitment) was incorrectly allowed. Fixed in
`20260719000005_ctc_combined_ap_guard_fix.sql` to sum both tables together;
re-tested with real inserts (three-stage test: first draw succeeds with no
hold, second draw succeeds but flips `compliance_hold`/`lien_waiver_status`
to pending since no matching received lien waiver exists for the prior
draw's exact dollar amount, third draw across the combined cap is hard-blocked
with a clear exception naming the commitment, both totals, and the overrun
amount) — confirmed correct on both the `transactions` and `checks` sides.
All test data (commitment, line, budget row, transactions, checks) deleted
after verification.

## 2026-07-22 — Projects screens + admin-wide pagination sweep

User-reported: the finance Projects tab and admin Projects tab were
"cluttered" with no way to page through results — both were confirmed to
render every project on one page. Root cause: the 2026-07-19 pagination
sweep's own summary text said Projects was covered "via `FinanceControls.tsx`'s
control summary" — that widget was paginated, but the actual `Projects.tsx`
(finance) and `ProjectManager.tsx` (admin) list screens themselves were never
touched. Both fixed this pass using the existing `usePagination`/`PaginationBar`
pair: `Projects.tsx` paginates its grid, table, and WIP views independently
(12/25/25 per page respectively, each remembering its own page position);
`ProjectManager.tsx` paginates its cards view (12/page) and list view
(25/page, shared between the desktop table and mobile card variants of the
same underlying page). Portfolio/status-count totals still compute from the
full filtered set, not just the visible page.

While in `ProjectManager.tsx`, took the opportunity to give the shared
`AdminTable` component (`src/components/admin/design/AdminTable.tsx`) a
built-in optional `paginate`/`pageSize`/`itemLabel`/`resetKey` prop set,
rather than wiring `usePagination` ad hoc at each call site — any current or
future `AdminTable` usage now opts into consistent pagination with one line.
Used this to paginate the admin Clients table and the Approvals tab's "All
Applications" table.

Then audited the rest of `Admin.tsx` for the same unbounded-list pattern the
user asked about ("any dashboard screen that tends to list a long list of
details") and fixed every one found: the Leads tab's Start-Project-briefs and
Contact-forms sub-tabs (15/page each, list-numbering preserved across pages
via the original array's index rather than the page-local one), the Meetings
tab's list view (20/page — calendar view left unpaginated since date-grouping
already chunks it visually), both Help Requests inboxes' Resolved sections
(client-portal and staff "type help" queues — Open/In-Progress left
unpaginated since those are actively-worked queues that stay small by nature,
only Resolved accumulates forever), the admin Documents review queue
(`DocumentsManager.tsx`, 20/page, desktop table + mobile cards share one page
state), and the Changelog — which really was rendering all 500 audit entries
in a single unbounded timeline, exactly the risk the 2026-07-19 audit
predicted; now pages at 30/screen.

**Verification**: `tsc`/`eslint` clean of new issues (only the same 4
pre-existing errors this doc has tracked since before this pass — 2 unrelated
`AdminProject` type mismatches, `PortalPayments.tsx`'s known `ChangeOrder`
column-name issue, and the pre-existing `prefer-const` at
`ProjectManager.tsx`). Live Playwright screenshot sweep across both Projects
screens (desktop + mobile) and all 8 admin tabs: zero console errors.
Confirmed `PaginationBar`'s self-hide-when-small behavior is working as
designed against the real dev dataset — Clients/Leads/Documents/Meetings are
naturally small right now and correctly show no pagination controls, while
Projects (100+ QA test rows) and Changelog (500 rows) correctly show them.

## 2026-07-23 — Launch punch-list closure: mobile CSS, Holdings balance sheet,
## FinanceControls entity-awareness, Checks reconciliation bugs, code-splitting,
## Projects card redesign, and a much larger QA-data archive than expected

User asked to close out every remaining item from the 2026-07-19/22 punch
list and fix the Projects card aesthetics across every dashboard. All six
punch-list items were fixed; the QA-data cleanup turned out to be far larger
in scope than the original finding once the same investigation was extended
to HGP and Holdings (see below).

**1. Mobile table-column CSS collapse** — root cause confirmed: the
`.finance-mobile-surface *{min-width:0}` rule in `src/index.css` sits outside
any `@layer`, and unlayered CSS always wins over `@layer`-based rules
regardless of specificity or source order — this is what let it beat every
Tailwind `min-w-[...]` utility on scrollable tables. Fixed by excluding
`.overflow-x-auto` and its descendants (`*:not(.overflow-x-auto, .overflow-x-auto *)`)
so the flex-shrink fix the rule was meant to provide still works without
collapsing table columns.

**2. Holdings HQ balance sheet** — `useHoldingsBalanceSheet()` already existed
and was wired into Reports and Assets & Deals, just never imported into
`HoldingsHQ.tsx`. Added a "Financial Position" panel (Total Assets/
Liabilities/Owners' Equity + Cash/Notes Receivable/Notes Payable/Mgmt Fees
breakdown) to the Overview tab, gated on the RPC returning data.

**3. `FinanceControls.tsx` entity-awareness** — added a `controlsHeader`
field to each entity's profile in `entityFinance.ts` (the nav copy already
described this screen as "Aging, bank matching & roles" for HGP/Holdings,
with no mention of WIP — the actual page just didn't match that promise
yet). The WIP/Percentage-Complete summary, WIP Reconciliation, and Committed
Costs sections now only render when `profile.overview === 'construction'`;
HGP and Holdings instead see an explanatory banner and just Aging/Role
Management/Bank Feed Matching. Verified live across all three entities via
`?entity=` URL override.

**4. Checks reconciliation bugs** — the KPI card counted a check as
"reconciled" via `reconciliation_status === 'reconciled' OR status === 'cleared'`,
while the per-row badge a few lines down showed the raw `reconciliation_status`
alone — clearing and reconciling are separate steps, so a cleared-but-not-
reconciled check made the KPI% and the row badges visibly disagree. Fixed by
matching `reconciliation_status` alone in both the KPI and its trend-chart
bucket. Separately, the project-overview Reconciliation Progress ring divided
`paid / billed` and showed a flat 0% whenever `billed` was 0 — including when
`paid > 0` (deposits/retainage collected ahead of any funded draw). Added an
explicit "ahead of billing" state (100% + relabeled copy) for that case.

**5. Production code-splitting** — see the updated Performance/scaling row
above. Every page in `src/App.tsx` is now `React.lazy()`-loaded behind one
`<Suspense>` boundary; `mapbox-gl` and the PDF/Excel `reports` bundle (the
two largest dependencies) are now isolated to the specific lazy pages that
use them instead of shipping to every visitor.

**6. Projects card redesign** — the finance `Projects.tsx` grid card and
admin `ProjectManager.tsx` cards card had sharp corners, gold/brown-tinted
gradients, and repeated the health score/signal three times in one card
(header, health-card header, and again as a progress-bar row) alongside a
harsh 1px-gridded 5-cell financial table. Rounded both card families
(`border-radius:16px`), removed the gold tint, consolidated health down to a
single top-right display, replaced the cramped financial grid with a soft
rounded 2×2 stat grid, and turned "Over Budget"/"Near Limit" from full pill
badges into a single inline warning line. Extended the same rounding to
`HgpJobs.tsx` (`.hj-card`) and `HoldingsAssets.tsx` (`.asset-card`) — the
"Projects" equivalent screens for those two entities — for consistency
across every dashboard where projects/jobs/deals exist. Verified live at
both desktop and mobile widths on all four screens, zero console errors.

**7. QA test-data archive — far larger than the original finding.** The
2026-07-19 audit's checklist item only named "test projects and test
transactions." Investigating the exact scope live turned up 93 `projects` +
93 `admin_projects` + 491 `transactions` + 1 `portal_clients` row, all
created 2026-07-17–19 with unmistakable machine-generated names
(`Launch QA 1784434648807`, etc.) — archived via the existing soft-delete
(`deleted_at`) mechanism after user confirmation. While redesigning the HGP
and Holdings "Projects" screens for item 6, the same pollution was found to
run far deeper: **342 of 344 `hgp_jobs`, all 140 `hgp_customer_sites`, 194 of
195 `hgp_service_visits`, all 48 `hgp_parts`, all 48 `hgp_equipment_units`,
38 `hgp_purchase_orders`, 72 `hgp_outage_events`, all 148 `holdings_notes`,
all 58 `holdings_covenants`, 59 `holdings_capital_activity` rows, plus 81
linked `holdings_note_payments`, 42 linked `hgp_job_payments`, and 145 linked
`hgp_inventory_movements`** — effectively the entire HGP and Holdings
datasets in this environment were test data from the same mid-July testing
window, not real business records. Flagged the expanded scope to the user
before touching anything ("this is much bigger than what you approved
before"); archived all of it the same reversible way after a second
confirmation. `hgp_outage_impacts` was left untouched — it has no
`deleted_at` column, so orphaned rows pointing at now-archived outage events
are harmless rather than something to hard-delete. Live-verified before/after
screenshots: HGP Install Jobs went from 344 cluttered cards to 2 real jobs;
Holdings Assets & Deals went from a QA-flooded notes/covenants list to a
clean "No notes recorded yet" / "No capital activity recorded yet" state
with just the one real "Taylor Project" deal.

**Still open** (unchanged from prior passes, not touched this pass):
Committed Cost Index has no upper-bound guard on a $0-contract edge case;
`Vendors.tsx` hardcodes its "Counterparties" eyebrow instead of using
`screenHeaderFor`; public-site pages share one generic `<title>` tag; role
assignments in `app_user_roles` still only cover the developer account (no
other real operators assigned yet — this needs the user's own input on who
those operators are); production `.env` values and Mapbox token domain
restriction still need to be set on the actual hosting/Mapbox accounts,
outside what's reachable from this codebase; tablet screenshot sweep for
mobile responsiveness still open.

**Verification**: `tsc --noEmit` and `eslint` both clean of any *new* issues
across every touched file (only the same handful of pre-existing, unrelated
errors this doc has tracked since before this pass remain — 2
`AdminProject`/`SetStateAction` type mismatches, `PortalPayments.tsx`'s known
`ChangeOrder` column-name issue, and the pre-existing `prefer-const` in
`ProjectManager.tsx`). `npm run build` succeeds with the new split-chunk
output. Live Playwright verification across FinanceControls (all 3
entities), Checks, HoldingsHQ, both redesigned Projects screens (desktop +
mobile), HgpJobs, and HoldingsAssets: zero console errors throughout.
