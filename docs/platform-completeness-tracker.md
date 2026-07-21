# HOU INC Platform Completeness Tracker

Last updated: 2026-07-19 (pagination sweep + transaction-drawer redesign +
Ledger correction-form dropdown pass — see note at the bottom; full-platform
deep audit + live-repair pass earlier the same day, findings section further
down). Companion machine-readable file: `platform-completeness-tracker.json`
— update both together.

**Scoring rules**: a row is *Complete* only when the workflow is database-backed,
UI-exposed, and covered by a passing automated test or live verification RPC.
*Launch-ready* means production-usable today with known, documented gaps.
Percentages are the assessment of the last agent pass that touched the area —
grounded in the verification RPCs and test suite, not vibes.

## Overall

| Scope | Completion | Status |
|---|---|---|
| **Platform overall** | **95%** | Launch-ready, with a short punch list below |
| Public Website | 90% | Launch-ready |
| Client Portal | 86% | Launch-ready |
| Admin Dashboard | 90% | Launch-ready |
| Finance Dashboard | 96% | Launch-ready |

## By entity

| Entity | Completion | Status | Notes |
|---|---|---|---|
| Houston Enterprise (construction) | 94% | Launch-ready | Full construction finance stack; 2 reconciliation-display bugs and unpaginated Income/Expenses found this pass (see findings) |
| Houston Generator Pros | 95% | Launch-ready | Jobs, storm response, inventory, procurement, job invoices, reports all live-tested and working; shared mobile-table + pagination gaps apply here too |
| Houston Enterprise Holdings | 90% | Launch-ready | Notes/amortization/covenants/approvals verified; balance sheet missing from HQ overview, two dashboard widgets render 10,000+px unpaginated lists |

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
| Ledger/reconciliation (context, audit, bank match) | 93 | Launch-ready | AP aging fills only when unpaid bills logged (workflow discipline); Checks page KPI counts "cleared" as reconciled while row badges show "unreconciled" (contradicts itself); Project Reconciliation Progress ring shows 0% instead of "ahead of billing" when collected > billed | Low | S | Recon-audit + ledger-context live tests |
| Invoices/payments | 94 | Launch-ready | Recurring service billing automation | Med | M | Paid-invoice→income trigger live; external payment links embedded in PDF |
| Reporting/exports | 95 | Launch-ready | Add automated PDF visual regression later | Low | M | Entity Reports tab, pay apps, cost-code, HGP ops, Holdings board packet |
| Security/RLS/roles | 93 | Launch-ready | `admin_changelog` SELECT policy queried `auth.users` directly (42501 permission denied, audit trail always showed empty) — **fixed this pass**, migration `20260719000003`; role-management UI still lacks an automated test; storage policy review pass still open | High | M | Recursion-repair verified; owner-RLS on all entity tables; `verify_changelog_rls_repair()` live |
| Mobile responsiveness | 87 | Launch-ready | Global rule `src/index.css:143-166` (`.finance-mobile-surface .overflow-x-auto * { min-width:0 }`) sits outside any `@layer` and beats Tailwind's `min-w-[...]` escape hatch on CSS-grid "table" listings — collapses columns to illegible widths on mobile (confirmed on HGP Generator Units/Unit Margin and Holdings Assets & Deals register; likely affects Charts/Ledger/Projects/Admin too, same pattern); tablet screenshot sweep still open | High | S | Playwright mobile overflow tests green on the screens they cover; new gap found via live screenshot, not covered by existing tests |
| Performance/scaling | 92 | Launch-ready | **Fixed 2026-07-19** — added a shared `usePagination`/`PaginationBar` pattern and applied it across every remaining unbounded list found in the finance dashboard: Income/Expenses (`TxnPage.tsx`), Checks, Vendors, Invoices, Documents, Clients, Projects (via `FinanceControls.tsx`'s control summary), HGP Inventory parts register, Storm Response outage events, Procurement hedge opportunities, Holdings HQ Note Schedule + Capital Activity, Holdings Assets & Deals/Fixed Assets/Notes registers, and every per-project tab in `ProjectBreakdown.tsx` (SOV, Milestones, Draws, Change Orders, Add-Ons, Payments, Expenses, Audit) plus `ProjectDetail.tsx`'s Activity/Documents tabs. Remaining: production build still emits a single 7.9MB/2.1MB-gzip JS chunk (no code-splitting) | Low | M | Live Playwright sweep across 11 screens post-fix: zero console errors; `tsc`/`eslint`/Vitest/build all clean |
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

- **`FinanceControls.tsx` isn't entity-aware** — hardcodes "Construction
  Finance Command Center" copy for all three entities, and its WIP/Percentage
  Complete widget reads the generic HE-shaped `projects` table, so for HGP
  and Holdings it surfaces a handful of unrelated stray rows instead of real
  install-job or asset-deal data. Needs a product decision on what "WIP
  control" even means for a non-construction entity, not just a copy fix.
- **Checks reconciliation KPI vs. row-badge inconsistency** and
  **Reconciliation Progress ring div-by-zero** — see Ledger/reconciliation
  row above. Both need a decision on the intended semantics, not just a
  number fix.
- **Committed Cost Index has no upper-bound guard** — a test project with a
  $0 contract value against a $25M+ check displayed as "10076%" committed
  consistently across Overview/Controls/Charts (internally consistent, just
  needs a "no contract set" state instead of a 5-digit percentage).
- **`Vendors.tsx` hardcodes the "Counterparties" eyebrow** for every entity
  instead of using the same `screenHeaderFor` pattern its title/description
  already use — cosmetic, one line.
- **Holdings HQ dashboard never surfaces the balance sheet** — the
  `get_holdings_balance_sheet` RPC/hook is wired into Reports and Assets &
  Deals but never imported into `HoldingsHQ.tsx`, so `/finance/dashboard`
  for Holdings shows no "financial position" section despite the backend
  being fully live and verified.
- Public-site pages all share one generic `<title>` tag rather than
  per-page titles — minor SEO gap, not functional.

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
