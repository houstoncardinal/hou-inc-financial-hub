# HOU INC Financial Hub — Enterprise Launch Readiness Checklist

Last updated: 2026-07-17. Run every section top to bottom before go-live.

## 1. Database migrations (run in the Supabase SQL editor, in order)

All migrations are idempotent — safe to re-run. The launch-critical chain:

| Migration | Purpose | Verified by |
|---|---|---|
| `20260716000010_admin_finance_project_link.sql` | Admin ↔ finance project FK link + bidirectional sync | `verify_finance_launch_migrations()` |
| `20260716000011_funded_draw_income_sync.sql` | Funded draws → income ledger | same |
| `20260716000012_finance_launch_hardening.sql` | Roles, recon audit, bank matching, paid-invoice sync, ledger paging | same |
| `20260716000013_finance_launch_controls.sql` | WIP view, retainage, aging, commitments | same |
| `20260716000014_finance_launch_audit_repair.sql` | **Critical fixes**: RLS recursion + draw double-count | same (7 checks) |
| `20260716000015_entity_operations.sql` | HGP equipment/service + Holdings notes/capital | `verify_finance_launch_migrations()` check 7 |
| `20260716000016_entity_operations_depth.sql` | Service visits→income, note payments→balance/interest | `verify_entity_operations_depth()` |
| `20260717000001_entity_finance_summaries.sql` | Server-side HGP/Holdings summary RPCs | `verify_entity_finance_summaries()` |
| `20260717000002_ledger_entity_context.sql` | Ledger business-context labels + search | `verify_ledger_entity_context()` |
| `20260717000003_hgp_field_operations.sql` | HGP jobs pipeline + Storm Response outage stack | `verify_hgp_field_ops()` |
| `20260717000004_entity_finance_depth2.sql` | Holdings amortization + HGP job-completion automation | `verify_entity_finance_depth2()` |
| `20260717000005_holdings_covenants.sql` | Covenant/compliance tracking | `verify_holdings_covenants()` |
| `20260717000006_dispatch_and_capital_approvals.sql` | HGP technician/dispatch + Holdings capital approvals | `verify_dispatch_capital_approvals()` |
| `20260717000007_hgp_command_map.sql` | Job coordinates for the dispatch map | `verify_hgp_command_map()` |
| `20260717000008_hgp_inventory_system.sql` | HGP parts, movement ledger, job-cost integration | `verify_hgp_inventory()` |
| `20260718000001_hgp_job_payments.sql` | Job payments → HGP income + collected totals | `verify_hgp_job_payments()` |
| `20260718000002_hgp_procurement_scheduling.sql` | POs → HGP expenses; visit scheduled/completed lifecycle | `verify_hgp_procurement_scheduling()` |

### One-shot verification (paste in SQL editor)

```sql
SELECT * FROM verify_finance_launch_migrations();
SELECT * FROM verify_entity_operations_depth();
SELECT * FROM verify_entity_finance_summaries();
SELECT * FROM verify_ledger_entity_context();
SELECT * FROM verify_hgp_field_ops();
SELECT * FROM verify_entity_finance_depth2();
SELECT * FROM verify_holdings_covenants();
SELECT * FROM verify_dispatch_capital_approvals();
SELECT * FROM verify_hgp_command_map();
SELECT * FROM verify_hgp_inventory();
SELECT * FROM verify_hgp_job_payments();
SELECT * FROM verify_hgp_procurement_scheduling();
```

Every row must show `ok = true`. As of 2026-07-17 all 9 verification RPCs
return only ok=true on the live project — the full migration chain 10–23 is
applied, and Playwright passes 26/26 with zero skips.

## 2. Environment variables (`.env`, git-ignored — verify before deploy)

| Variable | Used for |
|---|---|
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` | App database/auth (anon key) |
| `VITE_SUPABASE_PROJECT_ID` + `SUPABASE_ACCESS_TOKEN` | `npx supabase gen types typescript --project-id $VITE_SUPABASE_PROJECT_ID` |
| `VITE_MAPBOX_TOKEN` | Admin client map (and future HGP job map) |
| `VITE_OPENAI_API_KEY` | Document OCR / receipt scan |
| `VITE_FIRECRAWL_API_KEY` | Web scraper tooling |
| `PLAYWRIGHT_USER_EMAIL` / `PLAYWRIGHT_USER_PASSWORD` | Authenticated launch tests (Playwright auto-loads `.env`) |

Never expose the service-role key in the frontend; it is not referenced anywhere in `src/` (verified).

## 3. Test commands (all must pass)

```bash
npx tsc --noEmit        # TypeScript — expected clean
npx eslint . --quiet    # Lint — expected clean on touched files
npm test                # Vitest unit suite
npm run build           # Production build
npm run test:launch     # Playwright (boots dev server on :8090)
```

Playwright expectations with credentials set and all migrations applied:
**all tests pass with zero skips** (auth gates, mobile overflow, entity
navigation, reconciliation center, ledger context, HGP visit→income,
Holdings note payment→balance, outage→dispatch, amortization + job-completion
automation, funded-draw→recon-audit). A skipped test names the exact
migration to apply in its skip message.

## 4. Auth, roles, and RLS

- Real auth only — no dev bypass (`/auth` has email+password + 2FA step).
- Role overrides live in `app_user_roles` (managed on `/finance/controls`);
  policies use `user_has_entity_role()` / `can_manage_entity_roles()`
  SECURITY DEFINER helpers (no self-referencing policy recursion).
- First-admin bootstrap: with zero admin rows for an entity, the signed-in
  operator can claim the first admin role; afterwards only admins manage roles.
- All entity-operations tables (HGP/Holdings) are owner-scoped
  (`auth.uid() = user_id`); the outage provider registry is read-only public
  metadata for signed-in users.
- Client portal isolation is enforced through portal RPCs + RLS; anonymous
  API access returns zero rows (verified via REST probe).

## 5. Storage & external services

- `documents` bucket: uploads via the Documents screen; entity-tag chips write `documents.tags[]`.
- Outage providers (CenterPoint/Oncor/AEP/Entergy/TNMP): **manual logging by
  design** — map-only sources are not scraped. Future automation belongs in a
  server-side Edge Function holding credentials, per the terms notes stored in
  `hgp_outage_sources`.
- Mapbox: admin Client Map uses `VITE_MAPBOX_TOKEN`; confirm the token's URL
  restrictions include the production domain.

## 6. Post-launch monitoring (first 7 days)

1. `system_health_events` — investigate any `critical` (schema-cache) or `error` rows daily.
2. Reconciliation Center — spot-check `finance_reconciliation_audit` after the first real bank import.
3. First real funded draw / note payment / service visit — confirm ledger rows carry the expected context labels and categories.
4. Archive `Launch QA*` / `*QA*` rows created by the test suite so QA data never pollutes reports.
5. Watch Storm Response after the first storm: log events, run matching, confirm dispatches land in the emergency queue.

## 7. Go / No-Go

- [x] All 9 verification RPCs return only `ok = true` (live-probed 2026-07-17)
- [x] `npm run build` clean
- [x] Playwright 26/26, zero skips (2026-07-17)
- [ ] Roles assigned in `app_user_roles` for every real operator
- [ ] `.env` production values set; Mapbox token domain-restricted
- [ ] QA rows archived
- [ ] Post-launch monitoring owner assigned

## Known deferred items (not launch blockers)

- Outage polling Edge Function (manual logging is the supported path).
- Capital call / distribution **approval workflow** (capital activity log exists; approvals would add a status + approver column).
- Per-technician lanes on the 8-week planner (technician/dispatch fields ship in migration `...000006`).
- See `docs/platform-completeness-tracker.md` for the full scored breakdown.
