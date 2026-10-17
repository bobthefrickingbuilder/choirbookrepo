import { expect, test, type Page } from '@playwright/test';

// The staff dashboard on a laptop, as the demo administrator: what needs
// attention, widgets that drill down to the list behind each number, filters
// kept in the URL, the same figures as Reports, CSV export and customization.

async function enterDemoAsStaff(page: Page) {
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Start' }).nth(1).click();
  await page.waitForURL(/\/c\/demo/);
  const skip = page.getByRole('button', { name: 'Skip the tour' }).first();
  if (await skip.isVisible().catch(() => false)) await skip.click();
}

/** Click a link and wait for its page; a click made while the page is still starting up is retried. */
async function follow(page: Page, link: ReturnType<Page['locator']>, url: RegExp) {
  await expect(async () => {
    if (!url.test(page.url())) await link.click({ timeout: 2_000 });
    await page.waitForURL(url, { timeout: 5_000 });
  }).toPass({ timeout: 30_000 });
}

/** The big number in a dashboard or report figure, by its label. */
const figure = (page: Page, scope: string, label: string) => page.locator(`${scope} .kpi`, { hasText: label }).first().locator('strong');

test.beforeEach(async ({ page }) => {
  await enterDemoAsStaff(page);
});

test('loads quickly and shows what needs attention, with links that fix it', async ({ page }) => {
  const started = Date.now();
  await page.goto('/c/demo');
  await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible();
  const loadMs = Date.now() - started;
  test.info().annotations.push({ type: 'dashboard load (ms)', description: String(loadMs) });
  const attention = page.getByRole('complementary', { name: 'Needs attention' });
  await expect(attention.getByRole('listitem').first()).toBeVisible();
  await expect(attention.getByRole('link', { name: 'Review fees' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Attendance' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Fees' })).toBeVisible();
  await expect(page.getByText('Running order')).toBeVisible();
  // A balance warning: the demo's sectional has only two tenors confirmed.
  await expect(page.getByRole('region', { name: 'Upcoming events' }).getByText('only 2 tenors confirmed')).toBeVisible();
  await follow(page, attention.getByRole('link', { name: 'Review fees' }), /dashboard\/owing/);
  await expect(page.getByRole('heading', { name: 'Fees owing', level: 1 })).toBeVisible();
  await expect(page.getByRole('row').nth(1)).toBeVisible();
});

test('every widget drills down to the list behind its number', async ({ page }) => {
  await page.goto('/c/demo');
  const attendance = page.getByRole('region', { name: 'Attendance' });
  const absent = Number(await figure(page, '[data-widget="attendance"]', 'Absent').innerText());
  await follow(page, attendance.locator('.kpi', { hasText: 'Absent' }), /dashboard\/attendance\?.*status=absent/);
  await expect(page.getByRole('heading', { name: 'Attendance marks', level: 1 })).toBeVisible();
  await expect(page.getByText(`${absent} rows`)).toBeVisible();

  await page.goBack();
  const altos = page.getByRole('region', { name: 'Membership' }).getByRole('link', { name: /^Altos/ });
  const count = (await altos.locator('.bars__value').innerText()).trim();
  await follow(page, altos, /dashboard\/members\?.*section=A/);
  await expect(page.getByRole('heading', { name: 'Choristers', level: 1 })).toBeVisible();
  await expect(page.getByText(`${count} rows`)).toBeVisible();
  await expect(page.getByRole('row').nth(1).getByRole('cell').first()).toHaveText('Altos');

  await page.goBack();
  const form = page.getByRole('region', { name: 'Forms and consents' }).locator('.bars__row--link').first();
  const [done, total] = (await form.locator('.bars__value').innerText()).split('/').map(Number);
  await follow(page, form, /dashboard\/forms\?/);
  await expect(page.getByRole('heading', { name: 'Form completion', level: 1 })).toBeVisible();
  if (total! - done! > 0) await expect(page.getByText(`${total! - done!} rows`)).toBeVisible();
  else await expect(page.getByText('Nothing to show for these filters.')).toBeVisible();
});

test('filters live in the URL and the figures match Reports', async ({ page }) => {
  await page.goto('/c/demo');
  await page.getByRole('combobox', { name: 'Section' }).selectOption({ label: 'Altos' });
  await page.waitForURL(/section=A/);
  await expect(page.getByRole('region', { name: 'Membership' }).locator('.kpi', { hasText: 'Active' }).locator('strong')).toBeVisible();
  const rate = (await figure(page, '[data-widget="attendance"]', 'Attendance').innerText()).replace(/\s/g, '');
  const active = (await figure(page, '[data-widget="membership"]', 'Active').innerText()).trim();

  // A shared link opens the same view.
  const url = page.url();
  await page.goto(url);
  await expect(page.getByRole('combobox', { name: 'Section' })).toHaveValue('A');

  // Reports with the same filters agree.
  await page.goto(url.replace('/c/demo?', '/c/demo/reports?'));
  await expect(page.getByRole('heading', { name: 'Reports', level: 1 })).toBeVisible();
  expect((await figure(page, 'main', 'Attendance rate').innerText()).replace(/\s/g, '')).toBe(rate);
  expect((await figure(page, 'main', 'Active choristers').innerText()).trim()).toBe(active);

  // A custom date range.
  await page.goto('/c/demo');
  await page.getByRole('combobox', { name: 'Period' }).selectOption('custom');
  await page.getByRole('textbox', { name: 'From' }).fill('2026-09-01');
  await page.getByRole('textbox', { name: 'To' }).fill('2026-09-30');
  await page.getByRole('button', { name: 'Apply' }).click();
  await page.waitForURL(/from=2026-09-01&to=2026-09-30/);
  await expect(page.getByRole('region', { name: 'Attendance' })).toBeVisible();
});

test('a widget downloads as CSV and the board report starts from the same filters', async ({ page }) => {
  await page.goto('/c/demo?period=term&section=B');
  const download = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download Attendance as CSV' }).click();
  expect((await download).suggestedFilename()).toMatch(/^demo-dashboard-attendance-B-.*\.csv$/);
  await page.getByRole('link', { name: 'Board report' }).click();
  await page.waitForURL(/reports\/board\?period=term&section=B/);
  await expect(page.locator('.board__doc')).toContainText('Basses');
});

test('staff can hide and reorder widgets, and go back to their role default', async ({ page }) => {
  await page.goto('/c/demo');
  await page.getByRole('button', { name: 'Customize' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('checkbox', { name: 'Show Tickets' }).setChecked(false, { force: true });
  await dialog.getByRole('button', { name: 'Move Fees up' }).click();
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(page.locator('[data-widget="tickets"]')).toHaveCount(0);
  const order = await page.locator('[data-widget]').evaluateAll((els) => els.map((e) => e.getAttribute('data-widget')));
  expect(order.indexOf('fees')).toBeLessThan(order.indexOf('upcoming'));
  await page.reload();
  await expect(page.locator('[data-widget="tickets"]')).toHaveCount(0);

  await page.getByRole('button', { name: 'Customize' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Reset to my role’s default' }).click();
  await expect(page.locator('[data-widget="tickets"]')).toHaveCount(1);
});

test('a section leader only sees their section, and the treasurer sees fees first', async ({ page }) => {
  await page.getByRole('button', { name: 'Section leader' }).first().click();
  await page.waitForURL(/\/c\/demo/);
  await expect(page.getByText('You see your section only.')).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Section' })).toHaveValue('A');
  await expect(page.locator('[data-widget="fees"]')).toHaveCount(0);
  await page.goto('/c/demo?section=B');
  await expect(page.getByRole('combobox', { name: 'Section' })).toHaveValue('A');

  await page.getByRole('button', { name: 'Treasurer' }).first().click();
  await page.waitForURL(/\/c\/demo/);
  await expect(page.locator('[data-widget]').first()).toHaveAttribute('data-widget', 'fees');
  await expect(page.locator('[data-widget="attendance"]')).toHaveCount(0);

  await page.getByRole('button', { name: 'Administrator' }).first().click();
  await page.waitForURL(/\/c\/demo/);
});
