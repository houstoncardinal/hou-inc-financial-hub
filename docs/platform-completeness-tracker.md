# HOU INC Platform Completeness Tracker

Last updated: 2026-07-19 (full-platform deep audit + live-repair pass — see
findings section at the bottom). Companion machine-readable
file: `platform-completeness-tracker.json` — update both together.

**Scoring rules**: a row is *Complete* only when the workflow is database-backed,
UI-exposed, and covered by a passing automated test or live verification RPC.
*Launch-ready* means production-usable today with known, documented gaps.
Percentages are the assessment of the last agent pass that touched the area —
grounded in the verification RPCs and test suite, not vibes.

## Overall

| Scope | Completion | Status |
|---|---|---|
| **Platform overall** | **93%** | Launch-ready, with a short punch list below |
| Public Website | 90% | Launch-ready |
| Client Portal | 86% | Launch-ready |
| Admin Dashboard | 90% | Launch-ready |
| Finance Dashboard | 93% | Launch-ready |

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
| Performance/scaling | 80 | Launch-ready | `TxnPage.tsx` (Income + Expenses, all 3 entities) has **no pagination at all** — Holdings' 430-row Income screen renders a single ~23,000px page; Holdings HQ dashboard's Note Schedule (148 rows) and the Assets & Deals register are also fully unpaginated (~10,000px each). Ledger/Checks/HgpJobs already paginate correctly — same fix pattern just needs applying here | High | M | Server-side ledger paging + summary RPCs; new gap found via live crawl, not previously tracked |
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
ledger sort-by-recency → `20260719000003` changelog RLS repair.

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
