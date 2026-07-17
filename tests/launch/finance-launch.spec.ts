import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const email = process.env.PLAYWRIGHT_USER_EMAIL;
const password = process.env.PLAYWRIGHT_USER_PASSWORD;
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnon = process.env.VITE_SUPABASE_ANON_KEY;

async function signIn(page: any) {
  test.skip(!email || !password, 'Set PLAYWRIGHT_USER_EMAIL and PLAYWRIGHT_USER_PASSWORD for authenticated launch tests.');
  await page.goto('/auth');
  await page.getByLabel(/email address/i).fill(email!);
  await page.getByLabel(/password/i).fill(password!);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).not.toHaveURL(/\/auth$/);
}

test('protected ledger redirects to auth in launch mode', async ({ page }) => {
  await page.goto('/ledger');
  await expect(page).toHaveURL(/\/auth$/);
  await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
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
