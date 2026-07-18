# HOU INC Platform Completeness Tracker

Last updated: 2026-07-18 (interactive inventory + jobs UX pass). Companion machine-readable
file: `platform-completeness-tracker.json` — update both together.

**Scoring rules**: a row is *Complete* only when the workflow is database-backed,
UI-exposed, and covered by a passing automated test or live verification RPC.
*Launch-ready* means production-usable today with known, documented gaps.
Percentages are the assessment of the last agent pass that touched the area —
grounded in the verification RPCs and test suite, not vibes.

## Overall

| Scope | Completion | Status |
|---|---|---|
| **Platform overall** | **93%** | Launch-ready |
| Public Website | 90% | Launch-ready |
| Client Portal | 85% | Launch-ready |
| Admin Dashboard | 90% | Launch-ready |
| Finance Dashboard | 95% | Launch-ready |

## By entity

| Entity | Completion | Status | Notes |
|---|---|---|---|
| Houston Enterprise (construction) | 95% | Launch-ready | Full construction finance stack, WIP/retainage/aging live-verified |
| Houston Generator Pros | 95% | Launch-ready | Jobs, storm response, live dispatch map, model profitability — all live-verified |
| Houston Enterprise Holdings | 92% | Launch-ready | Notes/amortization/covenants/approvals; covenant+approval migrations pending apply |

## By workflow

| Workflow | % | Status | Remaining work | Priority | Complexity | Verification |
|---|---|---|---|---|---|---|
| Lead capture (contact/start-project → admin) | 95 | Complete | — | Low | — | Forms write `contact_submissions`/`start_project_submissions`; admin Leads tab |
| Client onboarding (invite → portal) | 90 | Launch-ready | Invite-flow automated test | Low | S | `portal_invites` + `/portal/invite`; manual QA |
| Portal communication (messages/meetings) | 85 | Launch-ready | Realtime message test; meeting reminder emails absent | Med | M | Admin↔portal tables + realtime channels |
| Document requests/uploads | 90 | Launch-ready | Portal upload automated test | Low | S | Admin presets + typed requests; `documents` bucket; entity tag chips |
| Project management (admin ↔ finance sync) | 95 | Complete | — | Low | — | FK link + depth-guarded triggers; live playwright |
| Construction finance (WIP/draws/retainage/CO/commitments) | 95 | Complete | Cost-code/phase report polish | Low | M | 7-check `verify_finance_launch_migrations()`; live draw test |
| Generator operations (inventory/plans/visits/jobs) | 92 | Complete | Model profitability *export*; equipment lifecycle report | Med | M | `verify_hgp_field_ops` + `verify_entity_operations_depth`; live tests |
| Storm response (outages → dispatch) | 90 | Complete | Edge-function polling (terms-gated); site map overlay | Med | L | Live outage→dispatch playwright test |
| HGP dispatch (technician/status) | 95 | Complete | — | Low | — | `verify_dispatch_capital_approvals()` live |
| HGP command map (coords/markers/locate) | 95 | Complete | — | Low | — | `verify_hgp_command_map()` live |
| HGP inventory (parts/scan/deploy/job costing) | 95 | Complete | — | Low | — | `verify_hgp_inventory()` live |
| Holdings notes/debt/capital | 94 | Complete | — | Low | — | Amortization + note-payment live tests |
| Holdings covenants | 95 | Complete | — | Low | — | `verify_holdings_covenants()` live |
| Holdings capital approvals | 95 | Complete | — | Low | — | `verify_dispatch_capital_approvals()` live |
| Ledger/reconciliation (context, audit, bank match) | 95 | Complete | AP aging fills only when unpaid bills logged (workflow discipline) | Low | — | Recon-audit + ledger-context live tests |
| Invoices/payments | 90 | Launch-ready | Recurring service billing automation | Med | M | Paid-invoice→income trigger live |
| Reporting/exports | 85 | Partial | HGP job report; Holdings covenant report; WIP PDF | Med | M | Amortization CSV done; reports.ts PDFs exist for projects |
| Security/RLS/roles | 92 | Launch-ready | Role-management UI test; storage policy review pass | High | M | Recursion-repair verified; owner-RLS on all entity tables |
| Mobile responsiveness | 92 | Launch-ready | Tablet screenshot sweep | Med | S | Playwright mobile overflow tests green |
| Performance/scaling | 88 | Launch-ready | Documents/admin list pagination at scale | Med | M | Server-side ledger paging + summary RPCs |
| Launch documentation | 95 | Complete | Keep in sync per pass | Low | — | `enterprise-launch-readiness-checklist.md` + this tracker |

## Deferred (tracked, not blocking)

| Item | Foundation in place | Next step | Complexity |
|---|---|---|---|
| Outage polling Edge Function | Provider registry with terms notes | Edge Function per provider where terms permit | L |
| Technician scheduling board | technician/dispatch columns (mig 22) | Per-tech lanes on the 8-week planner | M |
| Recurring maintenance billing | Agreements with annual_value + renewal pipeline | Invoice generation from active plans | M |
| Cost-code/phase reporting (HE) | `finance_cost_codes`/divisions tables + hooks | Report screen/PDF | M |

## Migration gate status (live-probed 2026-07-17)

Applied & verified: 10, 11, 12, 13, 14, 15, 16, 17 (summaries), 18 (ledger context), 19 (field ops), 20 (depth-2).
Applied & verified: chain 10–23 (all 9 verification RPCs ok=true, live-probed 2026-07-17).
**Pending apply**: none — chain 10–24 fully applied. Playwright: **28/28 passed, zero skips** (live-probed 2026-07-18).
