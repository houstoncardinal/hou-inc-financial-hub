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
