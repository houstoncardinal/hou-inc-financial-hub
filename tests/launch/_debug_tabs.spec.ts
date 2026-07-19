import { expect, test } from '@playwright/test';

const email = process.env.PLAYWRIGHT_USER_EMAIL;
const password = process.env.PLAYWRIGHT_USER_PASSWORD;

async function signIn(page: any) {
  await page.goto('/auth');
  await page.getByLabel(/email address/i).fill(email!);
  await page.getByLabel(/password/i).fill(password!);
  await page.getByRole('button', { name: /sign in/i }).click();
  const codeEl = page.getByText(/^\d{6}$/).first();
  await expect(codeEl).toBeVisible({ timeout: 15_000 });
  const code = (await codeEl.textContent())!.trim();
  const otpInput = page.locator('input[data-input-otp]').first();
  await otpInput.click();
  await otpInput.pressSequentially(code);
  await expect(page).not.toHaveURL(/\/auth$/, { timeout: 15_000 });
}

test('ProjectDetail two-level tabs + Reports category filter, mobile', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);

  await page.goto('/projects?entity=houston-enterprise');
  await page.waitForTimeout(1500);
  await page.locator('.proj-card').first().click();
  await page.waitForTimeout(1500);
  const overflow1 = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  console.log('ProjectDetail outer tabs: mobile overflow =', overflow1);
  await page.screenshot({ path: '/tmp/pd-outer-tabs.png' });

  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('shows all 5 outer tabs (Overview/Reconciliation/Documents/Photos/Activity):',
    ['Overview', 'Reconciliation', 'Documents', 'Photos', 'Activity'].every(t => bodyText.includes(t)));

  // Click Reconciliation tab (grid cell now).
  const reconTab = page.locator('button[role="tab"]', { hasText: 'Reconciliation' }).first();
  if (await reconTab.count() > 0) {
    await reconTab.click();
    await page.waitForTimeout(1000);
    const overflow2 = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    console.log('ProjectDetail inner sub-tabs: mobile overflow =', overflow2);
    await page.screenshot({ path: '/tmp/pd-inner-tabs.png' });
  } else {
    console.log('Reconciliation tab not found');
  }
});

test('Reports category filter popover, mobile', async ({ page }) => {
  test.setTimeout(30_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  await page.goto('/reports?entity=houston-enterprise');
  await page.waitForTimeout(1500);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  console.log('Reports page mobile overflow:', overflow);
  await page.screenshot({ path: '/tmp/reports-mobile.png' });
  await page.getByRole('button', { name: /category: all/i }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: '/tmp/reports-popover.png' });
});
