import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const email = process.env.PLAYWRIGHT_USER_EMAIL;
const password = process.env.PLAYWRIGHT_USER_PASSWORD;
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnon = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function signIn(page: any) {
  test.skip(!email || !password, 'Set PLAYWRIGHT_USER_EMAIL and PLAYWRIGHT_USER_PASSWORD for authenticated launch tests.');
  await page.goto('/auth');
  await page.getByLabel(/email address/i).fill(email!);
  await page.getByLabel(/password/i).fill(password!);
  await page.getByRole('button', { name: /sign in/i }).click();
  // Two-factor step: the demo verification code is displayed on-page —
  // read it and type it into the OTP input to complete sign-in.
  const codeEl = page.getByText(/^\d{6}$/).first();
  await expect(codeEl).toBeVisible({ timeout: 15_000 });
  const code = (await codeEl.textContent())!.trim();
  const otpInput = page.locator('input[data-input-otp]').first();
  await otpInput.click();
  await otpInput.pressSequentially(code);
  await expect(page).not.toHaveURL(/\/auth$/, { timeout: 15_000 });
}

test('protected ledger redirects to auth in launch mode', async ({ page }) => {
  await page.goto('/ledger');
  await expect(page).toHaveURL(/\/auth$/);
  await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
});

test('protected finance controls and dashboard redirect to auth', async ({ page }) => {
  await page.goto('/finance/controls');
  await expect(page).toHaveURL(/\/auth$/);
  await page.goto('/finance/dashboard');
  await expect(page).toHaveURL(/\/auth$/);
});

test('ledger mobile auth screen has no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/ledger');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow).toBe(false);
});

test('authenticated ledger has compact reconciliation center and no mobile overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await signIn(page);
  await page.goto('/ledger');
  await expect(page.getByText(/reconciliation center/i)).toBeVisible();
  const metrics = await page.evaluate(() => {
    const panel = document.querySelector('.ldg-recon-panel')?.getBoundingClientRect();
    return {
      height: panel?.height ?? 0,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    };
  });
  expect(metrics.overflow).toBe(false);
  expect(metrics.height).toBeLessThan(190);
});

test('entity-aware navigation swaps modules per selected entity', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await signIn(page);

  // The entity dropdown options are buttons whose accessible names combine
  // the entity name with its category/tagline — target those (they only
  // exist inside the open dropdown, so auto-wait handles the open animation
  // and page text like Holdings' Entity Portfolio rows can't be hit instead).
  const switcher = page.getByRole('button', { name: /switch finance entity/i }).first();
  const heOption = page.getByRole('button', { name: /^Houston Enterprise Construction/ });
  const hgpOption = page.getByRole('button', { name: /^Houston Generator Pros Energy Services/ });
  const holdingsOption = page.getByRole('button', { name: /^Houston Enterprise Holdings Holdings/ });

  // Force Houston Enterprise as the active entity regardless of the
  // account's saved preference.
  await page.goto('/finance/dashboard');
  await switcher.click();
  await heOption.click();

  // Houston Enterprise: full construction suite with WIP Controls.
  await expect(page.getByRole('link', { name: /Controls/ }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /Projects/ }).first()).toBeVisible();

  // Switch to Houston Generator Pros via the sidebar entity selector.
  await switcher.click();
  await hgpOption.click();
  await expect(page.getByText('Generator Operations').first()).toBeVisible();
  await expect(page.getByRole('link', { name: /Install Jobs/ }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /Controls/ })).toHaveCount(0);

  // Switch to Holdings.
  await switcher.click();
  await holdingsOption.click();
  await expect(page.getByText('Holdings HQ').first()).toBeVisible();
  await expect(page.getByRole('link', { name: /Assets & Deals/ }).first()).toBeVisible();
});

test('HGP service visit posts income and Holdings note payment moves balance', async () => {
  test.skip(!email || !password || !supabaseUrl || !supabaseAnon, 'Set PLAYWRIGHT_USER_EMAIL, PLAYWRIGHT_USER_PASSWORD, VITE_SUPABASE_URL, and VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY).');

  const client = createClient(supabaseUrl!, supabaseAnon!);
  const { data: auth, error: authError } = await client.auth.signInWithPassword({ email: email!, password: password! });
  expect(authError).toBeNull();
  const userId = auth.user!.id;

  // Skip cleanly when migrations 15/16 haven't been applied to the live DB yet.
  const probe = await client.from('hgp_service_visits').select('id').limit(0);
  test.skip(!!probe.error, `Entity-operations tables missing — run migrations 20260716000015 + 20260716000016 (${probe.error?.message ?? ''})`);

  // HGP: emergency visit with revenue → mirrored income transaction.
  const { data: visit, error: visitError } = await client
    .from('hgp_service_visits')
    .insert({
      user_id: userId, entity_id: 'houston-generator-pros',
      customer_name: `Launch QA Visit ${Date.now()}`, visit_type: 'emergency',
      visit_date: new Date().toISOString().slice(0, 10), revenue: 275.5,
    })
    .select('*')
    .single();
  expect(visitError).toBeNull();

  const { data: visitIncome } = await client
    .from('transactions')
    .select('amount, category, type, status')
    .eq('external_reference', `hgp_visit:${visit.id}`)
    .maybeSingle();
  expect(Number(visitIncome?.amount)).toBe(275.5);
  expect(visitIncome?.category).toBe('Emergency Service');

  // Holdings: receivable note + payment → balance drops by principal portion,
  // interest portion mirrors into the ledger as income.
  const { data: note, error: noteError } = await client
    .from('holdings_notes')
    .insert({
      user_id: userId, entity_id: 'houston-enterprise-holdings',
      direction: 'receivable', counterparty_name: `Launch QA Note ${Date.now()}`,
      principal: 10000, outstanding_balance: 10000, interest_rate: 6,
    })
    .select('*')
    .single();
  expect(noteError).toBeNull();

  const { data: payment, error: paymentError } = await client
    .from('holdings_note_payments')
    .insert({
      user_id: userId, entity_id: 'houston-enterprise-holdings',
      note_id: note.id, amount: 550, principal_portion: 500, interest_portion: 50,
    })
    .select('*')
    .single();
  expect(paymentError).toBeNull();

  const { data: after } = await client.from('holdings_notes').select('outstanding_balance').eq('id', note.id).single();
  expect(Number(after?.outstanding_balance)).toBe(9500);

  const { data: interestTxn } = await client
    .from('transactions')
    .select('amount, category, type')
    .eq('external_reference', `note_payment:${payment.id}`)
    .maybeSingle();
  expect(Number(interestTxn?.amount)).toBe(50);
  expect(interestTxn?.category).toBe('Interest Income');
  expect(interestTxn?.type).toBe('income');
});

test('ledger context labels surface trigger-mirrored business meaning', async () => {
  test.skip(!email || !password || !supabaseUrl || !supabaseAnon, 'Set PLAYWRIGHT_USER_EMAIL, PLAYWRIGHT_USER_PASSWORD, VITE_SUPABASE_URL, and VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY).');

  const client = createClient(supabaseUrl!, supabaseAnon!);
  const { data: auth, error: authError } = await client.auth.signInWithPassword({ email: email!, password: password! });
  expect(authError).toBeNull();
  const userId = auth.user!.id;

  // Skip cleanly until migration 20260717000002 is applied.
  const verify = await client.rpc('verify_ledger_entity_context' as any);
  test.skip(!!verify.error, `Ledger context migration missing — run 20260717000002 (${verify.error?.message ?? ''})`);
  expect((verify.data as any[])?.[0]?.ok).toBe(true);

  // A revenue-bearing visit must appear in the server-paged ledger with a
  // joined context label, findable via search on the customer name.
  const customer = `Ledger Ctx QA ${Date.now()}`;
  const { data: visit, error: visitError } = await client
    .from('hgp_service_visits' as any)
    .insert({
      user_id: userId, entity_id: 'houston-generator-pros',
      customer_name: customer, visit_type: 'emergency',
      visit_date: new Date().toISOString().slice(0, 10), revenue: 181.25,
    })
    .select('*')
    .single();
  expect(visitError).toBeNull();

  const page = await client.rpc('get_ledger_page' as any, {
    p_entity_id: 'houston-generator-pros',
    p_limit: 10,
    p_offset: 0,
    p_search: customer,
  });
  expect(page.error).toBeNull();
  const row = (page.data as any[]).find(r => r.reference === `hgp_visit:${(visit as any).id}`);
  expect(row).toBeTruthy();
  expect(row.context_kind).toBe('service_visit');
  expect(row.context_label).toContain('Emergency visit');
  expect(row.context_label).toContain(customer);
});

test('HGP outage workflow: site match and emergency dispatch create real rows', async () => {
  test.skip(!email || !password || !supabaseUrl || !supabaseAnon, 'Set PLAYWRIGHT_USER_EMAIL, PLAYWRIGHT_USER_PASSWORD, VITE_SUPABASE_URL, and VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY).');

  const client = createClient(supabaseUrl!, supabaseAnon!);
  const { data: auth, error: authError } = await client.auth.signInWithPassword({ email: email!, password: password! });
  expect(authError).toBeNull();
  const userId = auth.user!.id;

  // Skip cleanly until migration 20260717000003 is applied.
  const verify = await client.rpc('verify_hgp_field_ops' as any);
  test.skip(!!verify.error, `HGP field-ops migration missing — run 20260717000003 (${verify.error?.message ?? ''})`);
  for (const row of (verify.data as any[]) ?? []) expect(row.ok).toBe(true);

  const zip = `77${String(Date.now()).slice(-3)}`;
  const { data: site, error: siteError } = await client
    .from('hgp_customer_sites' as any)
    .insert({
      user_id: userId, entity_id: 'houston-generator-pros',
      customer_name: `Storm QA Customer ${Date.now()}`, city: 'Houston', zip,
      utility_provider: 'CenterPoint Energy',
    })
    .select('*')
    .single();
  expect(siteError).toBeNull();

  const { data: event, error: eventError } = await client
    .from('hgp_outage_events' as any)
    .insert({
      user_id: userId, entity_id: 'houston-generator-pros',
      provider: 'CenterPoint Energy', status: 'active',
      affected_customers: 1200, zip, cause: 'Launch QA storm',
      outage_started_at: new Date().toISOString(),
    })
    .select('*')
    .single();
  expect(eventError).toBeNull();

  // ZIP matching pulls the site into the outage.
  const match = await client.rpc('match_hgp_outage_impacts' as any, { p_outage_event_id: (event as any).id });
  expect(match.error).toBeNull();
  expect(Number(match.data)).toBeGreaterThanOrEqual(1);

  // One-click dispatch creates a real emergency job in the pipeline.
  const dispatch = await client.rpc('create_hgp_emergency_job' as any, {
    p_outage_event_id: (event as any).id, p_site_id: (site as any).id,
  });
  expect(dispatch.error).toBeNull();

  const { data: job } = await client
    .from('hgp_jobs' as any)
    .select('job_type, emergency, stage, outage_event_id, customer_name')
    .eq('id', dispatch.data as any)
    .single();
  expect((job as any)?.job_type).toBe('emergency');
  expect((job as any)?.emergency).toBe(true);
  expect((job as any)?.outage_event_id).toBe((event as any).id);

  // The impact's outreach workflow advanced to 'scheduled'.
  const { data: impact } = await client
    .from('hgp_outage_impacts' as any)
    .select('outreach_status')
    .eq('outage_event_id', (event as any).id)
    .eq('site_id', (site as any).id)
    .single();
  expect((impact as any)?.outreach_status).toBe('scheduled');
});

test('Holdings amortization projects a converging schedule and HGP job completion auto-registers the site', async () => {
  test.skip(!email || !password || !supabaseUrl || !supabaseAnon, 'Set PLAYWRIGHT_USER_EMAIL, PLAYWRIGHT_USER_PASSWORD, VITE_SUPABASE_URL, and VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY).');

  const client = createClient(supabaseUrl!, supabaseAnon!);
  const { data: auth, error: authError } = await client.auth.signInWithPassword({ email: email!, password: password! });
  expect(authError).toBeNull();
  const userId = auth.user!.id;

  // Skip cleanly until migration 20260717000004 is applied.
  const verify = await client.rpc('verify_entity_finance_depth2' as any);
  test.skip(!!verify.error, `Depth-2 migration missing — run 20260717000004 (${verify.error?.message ?? ''})`);
  for (const row of (verify.data as any[]) ?? []) expect(row.ok).toBe(true);

  // Amortization: $12,000 at 6% APR, $500/month → first-period interest $60,
  // principal $440, and the balance strictly decreases to zero.
  const { data: note, error: noteError } = await client
    .from('holdings_notes' as any)
    .insert({
      user_id: userId, entity_id: 'houston-enterprise-holdings',
      direction: 'payable', counterparty_name: `Amort QA ${Date.now()}`,
      principal: 12000, outstanding_balance: 12000, interest_rate: 6,
      payment_amount: 500, payment_frequency: 'monthly',
    })
    .select('*')
    .single();
  expect(noteError).toBeNull();

  const sched = await client.rpc('get_holdings_note_amortization' as any, { p_note_id: (note as any).id, p_max_periods: 60 });
  expect(sched.error).toBeNull();
  const rows = sched.data as any[];
  expect(rows.length).toBeGreaterThan(20);
  expect(Number(rows[0].interest)).toBeCloseTo(60, 1);
  expect(Number(rows[0].principal)).toBeCloseTo(440, 1);
  expect(Number(rows[rows.length - 1].ending_balance)).toBe(0);
  const principalSum = rows.reduce((s, r) => s + Number(r.principal), 0);
  expect(principalSum).toBeCloseTo(12000, 0);

  // Job completion automation: completing an install registers the customer
  // site for Storm Response matching.
  const customer = `Lifecycle QA ${Date.now()}`;
  const { data: job, error: jobError } = await client
    .from('hgp_jobs' as any)
    .insert({
      user_id: userId, entity_id: 'houston-generator-pros',
      job_type: 'install', stage: 'installing', customer_name: customer,
      site_address: '1 QA Way', city: 'Houston', zip: '77002',
      utility_provider: 'CenterPoint Energy',
    })
    .select('*')
    .single();
  expect(jobError).toBeNull();

  const { error: completeError } = await client
    .from('hgp_jobs' as any)
    .update({ stage: 'completed', completed_date: new Date().toISOString().slice(0, 10) })
    .eq('id', (job as any).id);
  expect(completeError).toBeNull();

  const { data: site } = await client
    .from('hgp_customer_sites' as any)
    .select('customer_name, zip, utility_provider')
    .eq('customer_name', customer)
    .maybeSingle();
  expect((site as any)?.zip).toBe('77002');
  expect((site as any)?.utility_provider).toBe('CenterPoint Energy');
});

test('Holdings covenant tracking writes real rows with status workflow', async () => {
  test.skip(!email || !password || !supabaseUrl || !supabaseAnon, 'Set PLAYWRIGHT_USER_EMAIL, PLAYWRIGHT_USER_PASSWORD, VITE_SUPABASE_URL, and VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY).');

  const client = createClient(supabaseUrl!, supabaseAnon!);
  const { data: auth, error: authError } = await client.auth.signInWithPassword({ email: email!, password: password! });
  expect(authError).toBeNull();
  const userId = auth.user!.id;

  // Skip cleanly until migration 20260717000005 is applied.
  const verify = await client.rpc('verify_holdings_covenants' as any);
  test.skip(!!verify.error, `Covenants migration missing — run 20260717000005 (${verify.error?.message ?? ''})`);
  expect((verify.data as any[])?.[0]?.ok).toBe(true);

  const name = `Covenant QA ${Date.now()}`;
  const { data: covenant, error: covError } = await client
    .from('holdings_covenants' as any)
    .insert({
      user_id: userId, entity_id: 'houston-enterprise-holdings',
      name, covenant_type: 'financial', requirement: 'Minimum DSCR 1.25x',
      status: 'compliant', next_review_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    })
    .select('*')
    .single();
  expect(covError).toBeNull();

  const { error: breachError } = await client
    .from('holdings_covenants' as any)
    .update({ status: 'breached' })
    .eq('id', (covenant as any).id);
  expect(breachError).toBeNull();

  const { data: after } = await client
    .from('holdings_covenants' as any)
    .select('status, name')
    .eq('id', (covenant as any).id)
    .single();
  expect((after as any)?.status).toBe('breached');
  expect((after as any)?.name).toBe(name);
});

test('HGP dispatch fields and Holdings capital approvals persist real state', async () => {
  test.skip(!email || !password || !supabaseUrl || !supabaseAnon, 'Set PLAYWRIGHT_USER_EMAIL, PLAYWRIGHT_USER_PASSWORD, VITE_SUPABASE_URL, and VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY).');

  const client = createClient(supabaseUrl!, supabaseAnon!);
  const { data: auth, error: authError } = await client.auth.signInWithPassword({ email: email!, password: password! });
  expect(authError).toBeNull();
  const userId = auth.user!.id;

  // Skip cleanly until migration 20260717000006 is applied.
  const verify = await client.rpc('verify_dispatch_capital_approvals' as any);
  test.skip(!!verify.error, `Dispatch/approvals migration missing — run 20260717000006 (${verify.error?.message ?? ''})`);
  for (const row of (verify.data as any[]) ?? []) expect(row.ok).toBe(true);

  // Technician + dispatch status persist on a job.
  const { data: job, error: jobError } = await client
    .from('hgp_jobs' as any)
    .insert({
      user_id: userId, entity_id: 'houston-generator-pros',
      job_type: 'emergency', stage: 'scheduled', emergency: true,
      customer_name: `Dispatch QA ${Date.now()}`,
      technician: 'QA Tech', dispatch_status: 'en_route',
    })
    .select('technician, dispatch_status')
    .single();
  expect(jobError).toBeNull();
  expect((job as any).technician).toBe('QA Tech');
  expect((job as any).dispatch_status).toBe('en_route');

  // Capital activity: pending → approved with approver stamp.
  const { data: capital, error: capError } = await client
    .from('holdings_capital_activity' as any)
    .insert({
      user_id: userId, entity_id: 'houston-enterprise-holdings',
      activity_type: 'distribution', amount: 1234.56,
      activity_date: new Date().toISOString().slice(0, 10),
      approval_status: 'pending', memo: 'Approval QA',
    })
    .select('*')
    .single();
  expect(capError).toBeNull();
  expect((capital as any).approval_status).toBe('pending');

  const { error: approveError } = await client
    .from('holdings_capital_activity' as any)
    .update({ approval_status: 'approved', approved_by: email, approved_at: new Date().toISOString() })
    .eq('id', (capital as any).id);
  expect(approveError).toBeNull();

  const { data: after } = await client
    .from('holdings_capital_activity' as any)
    .select('approval_status, approved_by, approved_at')
    .eq('id', (capital as any).id)
    .single();
  expect((after as any).approval_status).toBe('approved');
  expect((after as any).approved_by).toBe(email);
  expect((after as any).approved_at).toBeTruthy();
});

test('HGP job coordinates persist for the dispatch map', async () => {
  test.skip(!email || !password || !supabaseUrl || !supabaseAnon, 'Set PLAYWRIGHT_USER_EMAIL, PLAYWRIGHT_USER_PASSWORD, VITE_SUPABASE_URL, and VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY).');

  const client = createClient(supabaseUrl!, supabaseAnon!);
  const { data: auth, error: authError } = await client.auth.signInWithPassword({ email: email!, password: password! });
  expect(authError).toBeNull();
  const userId = auth.user!.id;

  // Skip cleanly until migration 20260717000007 is applied.
  const verify = await client.rpc('verify_hgp_command_map' as any);
  test.skip(!!verify.error, `Command-map migration missing — run 20260717000007 (${verify.error?.message ?? ''})`);
  expect((verify.data as any[])?.[0]?.ok).toBe(true);

  // A job stores coordinates (map-plottable) and they round-trip exactly.
  const { data: job, error: jobError } = await client
    .from('hgp_jobs' as any)
    .insert({
      user_id: userId, entity_id: 'houston-generator-pros',
      job_type: 'install', stage: 'scheduled',
      customer_name: `Map QA ${Date.now()}`,
      site_address: '901 Bagby St', city: 'Houston', zip: '77002',
      latitude: 29.7604, longitude: -95.3698,
    })
    .select('latitude, longitude')
    .single();
  expect(jobError).toBeNull();
  expect(Number((job as any).latitude)).toBeCloseTo(29.7604, 4);
  expect(Number((job as any).longitude)).toBeCloseTo(-95.3698, 4);
});

test('HGP inventory: receive and consume maintain quantities and job materials cost', async () => {
  test.skip(!email || !password || !supabaseUrl || !supabaseAnon, 'Set PLAYWRIGHT_USER_EMAIL, PLAYWRIGHT_USER_PASSWORD, VITE_SUPABASE_URL, and VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY).');

  const client = createClient(supabaseUrl!, supabaseAnon!);
  const { data: auth, error: authError } = await client.auth.signInWithPassword({ email: email!, password: password! });
  expect(authError).toBeNull();
  const userId = auth.user!.id;

  // Skip cleanly until migration 20260717000008 is applied.
  const verify = await client.rpc('verify_hgp_inventory' as any);
  test.skip(!!verify.error, `Inventory migration missing — run 20260717000008 (${verify.error?.message ?? ''})`);
  for (const row of (verify.data as any[]) ?? []) expect(row.ok).toBe(true);

  // Part starts at zero on hand.
  const { data: part, error: partError } = await client
    .from('hgp_parts' as any)
    .insert({
      user_id: userId, entity_id: 'houston-generator-pros',
      name: `Inventory QA Battery ${Date.now()}`, category: 'batteries',
      unit_cost: 0, reorder_point: 2,
    })
    .select('*')
    .single();
  expect(partError).toBeNull();

  // Receive 5 @ $40 → qty 5, carrying cost updates to last cost.
  const { error: recvError } = await client
    .from('hgp_inventory_movements' as any)
    .insert({
      user_id: userId, entity_id: 'houston-generator-pros',
      part_id: (part as any).id, movement_type: 'received',
      quantity: 5, unit_cost: 40, total_cost: 200,
    });
  expect(recvError).toBeNull();

  const { data: afterRecv } = await client
    .from('hgp_parts' as any).select('qty_on_hand, unit_cost').eq('id', (part as any).id).single();
  expect(Number((afterRecv as any).qty_on_hand)).toBe(5);
  expect(Number((afterRecv as any).unit_cost)).toBe(40);

  // Consume 2 to a job → qty 3 and $80 lands in the job's materials cost.
  const { data: job, error: jobError } = await client
    .from('hgp_jobs' as any)
    .insert({
      user_id: userId, entity_id: 'houston-generator-pros',
      job_type: 'service', stage: 'scheduled',
      customer_name: `Inventory QA Job ${Date.now()}`, materials_cost: 0,
    })
    .select('*')
    .single();
  expect(jobError).toBeNull();

  const { error: consumeError } = await client
    .from('hgp_inventory_movements' as any)
    .insert({
      user_id: userId, entity_id: 'houston-generator-pros',
      part_id: (part as any).id, job_id: (job as any).id,
      movement_type: 'consumed', quantity: 2, unit_cost: 40, total_cost: 80,
    });
  expect(consumeError).toBeNull();

  const { data: afterConsume } = await client
    .from('hgp_parts' as any).select('qty_on_hand').eq('id', (part as any).id).single();
  expect(Number((afterConsume as any).qty_on_hand)).toBe(3);

  const { data: jobAfter } = await client
    .from('hgp_jobs' as any).select('materials_cost').eq('id', (job as any).id).single();
  expect(Number((jobAfter as any).materials_cost)).toBe(80);

  // Unit lifecycle writes into the same ledger automatically.
  const { data: unit, error: unitError } = await client
    .from('hgp_equipment_units' as any)
    .insert({
      user_id: userId, entity_id: 'houston-generator-pros',
      model: `Inventory QA Gen ${Date.now()}`, unit_cost: 9000,
    })
    .select('*')
    .single();
  expect(unitError).toBeNull();

  const { data: unitMovement } = await client
    .from('hgp_inventory_movements' as any)
    .select('movement_type, total_cost')
    .eq('equipment_unit_id', (unit as any).id)
    .maybeSingle();
  expect((unitMovement as any)?.movement_type).toBe('received');
  expect(Number((unitMovement as any)?.total_cost)).toBe(9000);
});

test('HGP job payments post to income and own the collected total', async () => {
  test.skip(!email || !password || !supabaseUrl || !supabaseAnon, 'Set PLAYWRIGHT_USER_EMAIL, PLAYWRIGHT_USER_PASSWORD, VITE_SUPABASE_URL, and VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY).');

  const client = createClient(supabaseUrl!, supabaseAnon!);
  const { data: auth, error: authError } = await client.auth.signInWithPassword({ email: email!, password: password! });
  expect(authError).toBeNull();
  const userId = auth.user!.id;

  // Skip cleanly until migration 20260718000001 is applied.
  const verify = await client.rpc('verify_hgp_job_payments' as any);
  test.skip(!!verify.error, `Job-payments migration missing — run 20260718000001 (${verify.error?.message ?? ''})`);
  for (const row of (verify.data as any[]) ?? []) expect(row.ok).toBe(true);

  const { data: job, error: jobError } = await client
    .from('hgp_jobs' as any)
    .insert({
      user_id: userId, entity_id: 'houston-generator-pros',
      job_type: 'install', stage: 'scheduled',
      customer_name: `Payments QA ${Date.now()}`, generator_model: 'Guardian 26kW',
      quoted_amount: 15000, deposit_amount: 0,
    })
    .select('*')
    .single();
  expect(jobError).toBeNull();

  // Deposit payment → income entry with the HGP catalog category.
  const { data: deposit, error: depError } = await client
    .from('hgp_job_payments' as any)
    .insert({
      user_id: userId, entity_id: 'houston-generator-pros',
      job_id: (job as any).id, payment_type: 'deposit', amount: 5000, method: 'ach_wire',
    })
    .select('*')
    .single();
  expect(depError).toBeNull();

  const { data: incomeRow } = await client
    .from('transactions')
    .select('amount, category, type, source_name, status')
    .eq('external_reference', `hgp_job_payment:${(deposit as any).id}`)
    .maybeSingle();
  expect(Number((incomeRow as any)?.amount)).toBe(5000);
  expect((incomeRow as any)?.category).toBe('Generator Deposit');
  expect((incomeRow as any)?.type).toBe('income');

  // Progress payment stacks the collected total on the job.
  const { error: progError } = await client
    .from('hgp_job_payments' as any)
    .insert({
      user_id: userId, entity_id: 'houston-generator-pros',
      job_id: (job as any).id, payment_type: 'progress', amount: 4000, method: 'check',
    });
  expect(progError).toBeNull();

  const { data: jobAfter } = await client
    .from('hgp_jobs' as any).select('deposit_amount').eq('id', (job as any).id).single();
  expect(Number((jobAfter as any).deposit_amount)).toBe(9000);

  // Voiding the deposit reverses the total and voids its income entry.
  const { error: voidError } = await client
    .from('hgp_job_payments' as any)
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', (deposit as any).id);
  expect(voidError).toBeNull();

  const { data: jobFinal } = await client
    .from('hgp_jobs' as any).select('deposit_amount').eq('id', (job as any).id).single();
  expect(Number((jobFinal as any).deposit_amount)).toBe(4000);

  const { data: voidedIncome } = await client
    .from('transactions')
    .select('status')
    .eq('external_reference', `hgp_job_payment:${(deposit as any).id}`)
    .maybeSingle();
  expect((voidedIncome as any)?.status).toBe('voided');
});

test('HGP purchase orders post expenses and scheduled visits defer income until completed', async () => {
  test.skip(!email || !password || !supabaseUrl || !supabaseAnon, 'Set PLAYWRIGHT_USER_EMAIL, PLAYWRIGHT_USER_PASSWORD, VITE_SUPABASE_URL, and VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY).');

  const client = createClient(supabaseUrl!, supabaseAnon!);
  const { data: auth, error: authError } = await client.auth.signInWithPassword({ email: email!, password: password! });
  expect(authError).toBeNull();
  const userId = auth.user!.id;

  // Skip cleanly until migration 20260718000002 is applied.
  const verify = await client.rpc('verify_hgp_procurement_scheduling' as any);
  test.skip(!!verify.error, `Procurement/scheduling migration missing — run 20260718000002 (${verify.error?.message ?? ''})`);
  for (const row of (verify.data as any[]) ?? []) expect(row.ok).toBe(true);

  // PO → expense with the HGP catalog category.
  const { data: po, error: poError } = await client
    .from('hgp_purchase_orders' as any)
    .insert({
      user_id: userId, entity_id: 'houston-generator-pros',
      po_number: `PO-QA-${Date.now()}`, total_amount: 8750.25, status: 'received',
    })
    .select('*')
    .single();
  expect(poError).toBeNull();

  const { data: expense } = await client
    .from('transactions')
    .select('amount, category, type')
    .eq('external_reference', `hgp_po:${(po as any).id}`)
    .maybeSingle();
  expect(Number((expense as any)?.amount)).toBeCloseTo(8750.25, 2);
  expect((expense as any)?.category).toBe('Generator Equipment Purchase');
  expect((expense as any)?.type).toBe('expense');

  // Scheduled visit with expected revenue: NO income until completed.
  const { data: visit, error: visitError } = await client
    .from('hgp_service_visits' as any)
    .insert({
      user_id: userId, entity_id: 'houston-generator-pros',
      customer_name: `Schedule QA ${Date.now()}`, visit_type: 'scheduled',
      status: 'scheduled', revenue: 325,
      visit_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    })
    .select('*')
    .single();
  expect(visitError).toBeNull();

  const { data: early } = await client
    .from('transactions')
    .select('id, status')
    .eq('external_reference', `hgp_visit:${(visit as any).id}`)
    .maybeSingle();
  expect(early === null || (early as any)?.status === 'voided').toBe(true);

  // Completing the visit posts the income.
  const { error: completeError } = await client
    .from('hgp_service_visits' as any)
    .update({ status: 'completed' })
    .eq('id', (visit as any).id);
  expect(completeError).toBeNull();

  const { data: posted } = await client
    .from('transactions')
    .select('amount, status, category')
    .eq('external_reference', `hgp_visit:${(visit as any).id}`)
    .maybeSingle();
  expect(Number((posted as any)?.amount)).toBe(325);
  expect((posted as any)?.status).toBe('posted');
});

test('funded draw and reconciliation audit database workflow', async () => {
  test.skip(!email || !password || !supabaseUrl || !supabaseAnon, 'Set Supabase and Playwright credentials for database launch workflow test.');

  const client = createClient(supabaseUrl!, supabaseAnon!);
  const { data: auth, error: authError } = await client.auth.signInWithPassword({ email: email!, password: password! });
  expect(authError).toBeNull();
  const userId = auth.user?.id;
  expect(userId).toBeTruthy();

  const entityId = 'houston-enterprise';
  const { data: project, error: projectError } = await client
    .from('projects')
    .insert({ user_id: userId, entity_id: entityId, name: `Launch QA ${Date.now()}`, status: 'active', budget: 1000 })
    .select('*')
    .single();
  expect(projectError).toBeNull();

  const { data: draw, error: drawError } = await client
    .from('draw_schedules')
    .insert({ project_id: project.id, milestone_name: 'Launch QA funded draw', draw_amount: 123.45, status: 'funded', scheduled_date: new Date().toISOString().slice(0, 10) })
    .select('*')
    .single();
  expect(drawError).toBeNull();

  const { data: income, error: incomeError } = await client
    .from('transactions')
    .select('*')
    .eq('external_reference', `draw_schedule:${draw.id}`)
    .maybeSingle();
  expect(incomeError).toBeNull();
  expect(Number(income?.amount)).toBe(123.45);

  const { error: reconError } = await client
    .from('transactions')
    .update({ reconciled: true, reconciliation_status: 'reconciled', cleared_date: new Date().toISOString().slice(0, 10) })
    .eq('id', income.id);
  expect(reconError).toBeNull();

  const { data: audit, error: auditError } = await client
    .from('finance_reconciliation_audit')
    .select('*')
    .eq('source_table', 'transactions')
    .eq('source_record_id', income.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  expect(auditError).toBeNull();
  expect(audit?.new_reconciled).toBe(true);
});
