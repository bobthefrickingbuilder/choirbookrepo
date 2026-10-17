import { expect, test, type Page } from '@playwright/test';

// Privacy, consent and safety (Phase 6), on a laptop, in the demo choir:
// consents, data export, account deletion, guardian signatures, the message
// filter, the roster's age rules and the draft legal pages.
// Every change is undone or harmless; the demo also resets every night.

// Guardian links and deletion links are checked with the server's secret key,
// which only the deployed site has.
const deployed = Boolean(process.env.BASE_URL);

async function enterDemo(page: Page, as: 'chorister' | 'staff') {
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Start' }).nth(as === 'chorister' ? 0 : 1).click();
  await page.waitForURL(/\/c\/demo/);
  const skip = page.getByRole('button', { name: 'Skip the tour' }).first();
  if (await skip.isVisible().catch(() => false)) await skip.click();
}

/** Click a link or button and wait for the page; a click made while the page is still starting up is retried. */
async function follow(page: Page, target: ReturnType<Page['locator']>, url: RegExp) {
  await expect(async () => {
    if (!url.test(page.url())) await target.click({ timeout: 2_000 });
    await page.waitForURL(url, { timeout: 5_000 });
  }).toPass({ timeout: 30_000 });
}

/** Saves the message filter's extra words, and checks they stuck (a save made before the page is ready is retried). */
async function setExtraWords(page: Page, words: string) {
  await expect(async () => {
    await page.goto('/c/demo/settings');
    // Wait until the page is interactive: text typed earlier is lost when React takes over.
    await page.waitForLoadState('networkidle');
    const card = page.locator('.cb-card', { hasText: 'Message filter' });
    const box = card.getByLabel('Also hold these words');
    await box.fill('');
    await box.fill(words);
    await expect(box).toHaveValue(words);
    await card.getByRole('button', { name: 'Save' }).click();
    await expect(card.getByText('Saved')).toBeVisible({ timeout: 5_000 });
    await page.reload();
    await expect(page.locator('.cb-card', { hasText: 'Message filter' }).getByLabel('Also hold these words')).toHaveValue(words, { timeout: 5_000 });
  }).toPass({ timeout: 45_000 });
}

test.describe.configure({ mode: 'serial' });

test('legal pages are public, in both languages, and marked as drafts', async ({ page, context }) => {
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { name: 'Privacy policy', level: 1 })).toBeVisible();
  await expect(page.getByText('Draft for review.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Where it is kept' })).toBeVisible();
  await page.getByRole('link', { name: 'Terms of use' }).click();
  await expect(page.getByRole('heading', { name: 'Terms of use', level: 1 })).toBeVisible();
  await context.addCookies([{ name: 'cb-lang', value: 'fr', url: page.url() }]);
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { name: 'Politique de confidentialité', level: 1 })).toBeVisible();
  await expect(page.getByText('Ébauche à faire approuver.')).toBeVisible();
  await context.clearCookies({ name: 'cb-lang' });
  // The sign-in page links to both.
  await page.goto('/sign-in');
  await expect(page.getByRole('navigation', { name: 'Privacy and terms' }).getByRole('link', { name: 'Privacy' })).toBeVisible();
});

test('a chorister reviews consents, gives and withdraws an optional one, and downloads their data', async ({ page }) => {
  await enterDemo(page, 'chorister');
  await page.goto('/c/demo/profile');
  const consents = page.locator('#consents');
  await expect(consents.locator('[data-consent="participation"]')).toBeVisible();
  // Required consents: give them if the demo has not yet.
  for (const kind of ['participation', 'code_of_conduct']) {
    const item = consents.locator(`[data-consent="${kind}"]`);
    const agree = item.getByRole('button', { name: 'I agree' });
    if (await agree.isVisible().catch(() => false)) {
      await agree.click();
      await expect(item.getByText('Given', { exact: true })).toBeVisible();
    }
    await expect(item.getByRole('button', { name: 'Withdraw' })).toHaveCount(0);
  }
  // An optional one: give it, then withdraw it again.
  const medical = consents.locator('[data-consent="medical_info"]');
  const agree = medical.getByRole('button', { name: 'I agree' });
  if (await agree.isVisible().catch(() => false)) {
    await agree.click();
    await expect(medical.getByText('Given', { exact: true })).toBeVisible();
  }
  await medical.getByRole('button', { name: 'Withdraw' }).click();
  await expect(medical.getByText('Withdrawn', { exact: true })).toBeVisible();
  await expect(medical.getByText(/Withdrawn on .* wording version 1/)).toBeVisible();

  // The data download includes the consents just recorded.
  const res = await page.request.get('/c/demo/profile/export?format=json');
  expect(res.ok()).toBe(true);
  const body = (await res.json()) as { data: Record<string, unknown[]> };
  expect(body.data.people).toHaveLength(1);
  expect((body.data.consents as { kind: string }[]).some((c) => c.kind === 'medical_info')).toBe(true);
});

test('account deletion explains what goes and what stays; demo accounts cannot be deleted', async ({ page }) => {
  await enterDemo(page, 'chorister');
  await page.goto('/c/demo/profile');
  await follow(page, page.getByRole('link', { name: 'Delete my account' }), /\/account\/delete/);
  await expect(page.getByRole('heading', { name: 'Delete your account', level: 1 })).toBeVisible();
  await expect(page.getByText('What is deleted')).toBeVisible();
  await expect(page.getByText(/Payment and receipt records/)).toBeVisible();
  await expect(page.getByText('Demo accounts cannot be deleted.', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Email me a confirmation link' })).toHaveCount(0);
  // A made-up confirmation link deletes nothing.
  await page.goto(`/confirm-deletion?token=${'0'.repeat(48)}`);
  await expect(page.getByRole('button', { name: 'Delete my account' })).toHaveCount(0);
});

test('a guardian signs a minor’s form from the link, once', async ({ page }) => {
  test.skip(!deployed, 'Guardian links need the server key, which only the deployed site has.');
  await enterDemo(page, 'staff');
  await page.goto('/c/demo/forms-fees?tab=forms');
  await follow(page, page.getByRole('link', { name: 'Spring tour permission' }).first(), /forms-fees\/forms\//);
  await page.getByRole('button', { name: 'Resend guardian link' }).first().click();
  const open = page.getByRole('link', { name: 'Open the guardian’s link' });
  await expect(open).toBeVisible();
  await follow(page, open, /\/guardian\/[0-9a-f]+\?demo=1/);
  const link = page.url();

  await expect(page.getByRole('heading', { name: /Signature needed: Spring tour permission/ })).toBeVisible();
  await expect(page.getByText('Vegetarian')).toBeVisible();
  await page.getByRole('button', { name: 'Sign the form' }).click();
  await expect(page.getByText('Tick the box to confirm', { exact: false })).toBeVisible();
  await page.getByRole('checkbox').check({ force: true });
  await page.getByLabel('Your full name').fill('Demo Guardian');
  await page.getByRole('button', { name: 'Sign the form' }).click();
  await expect(page.getByText('Thank you, Demo Guardian')).toBeVisible();

  // The link works once.
  await page.goto(link);
  await expect(page.getByText('This form is already signed')).toBeVisible();
  await expect(page.getByText(/Signed by Demo Guardian/)).toBeVisible();
  // An unknown link says so.
  await page.goto(`/guardian/${'ab'.repeat(24)}`);
  await expect(page.getByText('We could not find this link')).toBeVisible();
});

test('the message filter holds a member’s message for review, and staff hide it', async ({ page }) => {
  // Staff add a harmless test word to the filter.
  await enterDemo(page, 'staff');
  await setExtraWords(page, 'kazoo');

  // The chorister's message with it is held.
  await enterDemo(page, 'chorister');
  await page.goto('/c/demo/messages');
  await follow(page, page.getByRole('link', { name: /Paying the rest of my fee/ }), /\/messages\/[0-9a-f-]{36}/);
  const text = `Please bring a kazoo (automated test ${Date.now()})`;
  await page.getByLabel('Reply').fill(text);
  await page.getByRole('button', { name: 'Send' }).click();
  const mine = page.locator('li', { has: page.locator('.msg__body', { hasText: text }) }).last();
  await expect(mine.getByText('Waiting for review by the choir office')).toBeVisible();

  // Staff see it in moderation and hide it, then remove the test word.
  await enterDemo(page, 'staff');
  await page.goto('/c/demo/communications?tab=moderation');
  const held = page.getByRole('list', { name: 'Held by the filter' }).getByRole('listitem').filter({ hasText: text });
  await expect(held).toBeVisible();
  await held.getByRole('button', { name: 'Hide' }).click();
  await expect(held).toHaveCount(0);
  await setExtraWords(page, '');
});

test('the roster asks for a guardian for minors and refuses anyone under 14', async ({ page }) => {
  await enterDemo(page, 'staff');
  await page.goto('/c/demo/roster');
  const dialog = page.getByRole('dialog');
  await expect(async () => {
    if (!(await dialog.isVisible())) await page.getByRole('button', { name: 'Add chorister' }).first().click({ timeout: 2_000 });
    await expect(dialog).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 30_000 });
  await dialog.getByRole('textbox', { name: /^First name/ }).fill('Test');
  await dialog.getByRole('textbox', { name: /^Last name/ }).fill('Minor');
  const year = new Date().getFullYear();
  await dialog.getByRole('textbox', { name: /^Date of birth/ }).fill(`${year - 16}-01-15`);
  await expect(dialog.getByRole('group', { name: 'Parent or guardian' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Add chorister' })).toBeDisabled();
  await dialog.getByRole('textbox', { name: /^Date of birth/ }).fill(`${year - 12}-01-15`);
  await dialog.getByRole('textbox', { name: /^Guardian first name/ }).fill('Pat');
  await dialog.getByRole('textbox', { name: /^Guardian last name/ }).fill('Minor');
  await dialog.getByRole('button', { name: 'Add chorister' }).click();
  await expect(dialog.getByText('Choristers must be 14 or older to register in Choirbook.')).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel' }).first().click();
});

test('settings show guardian copies and the message filter', async ({ page }) => {
  await enterDemo(page, 'staff');
  await page.goto('/c/demo/settings');
  const copies = page.locator('.cb-card', { hasText: 'Guardian copies' });
  await expect(copies.getByRole('checkbox', { name: 'Fee reminders and receipts' })).toBeChecked();
  await expect(copies.getByRole('checkbox', { name: 'Announcements' })).not.toBeChecked();
  await expect(page.locator('.cb-card', { hasText: 'Message filter' }).getByText(/Built-in lists: \d+ English and \d+ French/)).toBeVisible();
});
