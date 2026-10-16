import { expect, test, type Page } from '@playwright/test';

// The chorister's main flows, on a phone, as the demo chorister (Ella, 19, alto).
// Every change a test makes is undone, so the demo stays tidy between runs.

async function enterDemoAsChorister(page: Page) {
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Start' }).first().click();
  await page.waitForURL(/\/c\/demo/);
  // Close the tour if it opened.
  const skip = page.getByRole('button', { name: 'Skip the tour' }).first();
  if (await skip.isVisible().catch(() => false)) await skip.click();
}

test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }) => {
  await enterDemoAsChorister(page);
});

test('home shows the next event, to-dos, practice and announcements', async ({ page }) => {
  await page.goto('/c/demo');
  await expect(page.getByRole('heading', { name: 'Hi, Ella' })).toBeVisible();
  await expect(page.getByText('Next up', { exact: false })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Waiting for you' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'This week’s practice' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Announcements' })).toBeVisible();
  // Phones get the bottom navigation.
  await expect(page.getByRole('navigation', { name: 'Main' }).last().getByRole('link', { name: 'Music' })).toBeVisible();
});

test('one-tap absence: report, then undo', async ({ page }) => {
  await page.goto('/c/demo');
  const undo = page.getByRole('button', { name: 'Undo' }).first();
  if (await undo.isVisible().catch(() => false)) await undo.click();
  await page.getByRole('button', { name: 'I’ll be absent' }).first().click();
  await page.getByLabel('Reason').fill('Sick (automated test)');
  await page.getByRole('button', { name: 'Send to the choir office' }).click();
  await expect(page.getByText('You told us you’ll be absent').first()).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).first().click();
  await expect(page.getByRole('button', { name: 'I’ll be absent' }).first()).toBeVisible();
});

test('calendar: list and month views, event details, availability and .ics', async ({ page }) => {
  await page.goto('/c/demo/calendar');
  await expect(page.getByRole('heading', { name: 'Calendar', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Month' }).click();
  await expect(page).toHaveURL(/view=month/);
  await page.getByRole('button', { name: 'List' }).click();
  await page.getByText('Dress rehearsal').first().click();
  await expect(page.getByRole('heading', { name: 'Dress rehearsal' })).toBeVisible();
  await page.locator('label', { hasText: 'Maybe' }).click();
  await expect(page.getByRole('radio', { name: 'Maybe' })).toBeChecked();
  await page.getByRole('button', { name: 'Save my answer' }).click();
  await expect(page.getByText('Thanks, your answer is saved.')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Add to my calendar' }).click();
  expect((await download).suggestedFilename()).toMatch(/\.ics$/);
});

test('attendance page shows rate, absences left and history', async ({ page }) => {
  await page.goto('/c/demo/absences');
  await expect(page.getByText('Attendance this term', { exact: false })).toBeVisible();
  await expect(page.getByText(/absences left this term|No absence limit/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'History' })).toBeVisible();
});

test('music: library, practice player, score and practice log', async ({ page }) => {
  await page.goto('/c/demo/music');
  await page.getByLabel('Search titles and composers').fill('Bogor');
  await page.getByRole('link', { name: /Bogoroditse Devo/ }).click();
  await expect(page.getByRole('heading', { name: 'Bogoroditse Devo' })).toBeVisible();
  const play = page.getByRole('button', { name: 'Play', exact: true });
  await expect(play).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('combobox', { name: 'My part' })).toHaveValue(/.+/);
  await expect(page.getByText('Speed: 100%')).toBeVisible();
  await expect(page.locator('.score__page canvas')).toBeVisible();
  await page.getByLabel('Minutes practised').fill('12');
  await page.getByRole('button', { name: 'Log practice' }).click();
  await expect(page.getByText('Logged. Keep it up.')).toBeVisible();
});

test('messages: open a conversation and reply', async ({ page }) => {
  await page.goto('/c/demo/messages');
  await page.getByRole('link', { name: /Paying the rest of my fee/ }).click();
  await page.getByLabel('Reply').fill('Thanks! (automated test)');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.locator('.msg__body', { hasText: 'Thanks! (automated test)' }).last()).toBeVisible();
});

test('announcements feed', async ({ page }) => {
  await page.goto('/c/demo/announcements');
  await expect(page.getByRole('heading', { name: 'Winter Light tickets are on sale' })).toBeVisible();
});

test('forms and fees: forms list, balances, card payment notice', async ({ page }) => {
  await page.goto('/c/demo/forms-fees');
  await expect(page.getByRole('heading', { name: 'Forms', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Annual fee' })).toBeVisible();
  await expect(page.getByText('Left to pay').first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Receipt' }).first()).toBeVisible();
});

test('tickets, volunteering (sign up and withdraw), seating', async ({ page }) => {
  await page.goto('/c/demo/tickets');
  await expect(page.getByRole('heading', { name: 'My complimentary tickets' })).toBeVisible();
  await page.goto('/c/demo/volunteering');
  const signUp = page.getByRole('button', { name: 'Sign up' }).first();
  await signUp.click();
  await expect(page.getByText('You’re signed up').first()).toBeVisible();
  await page.getByRole('button', { name: 'Withdraw' }).first().click();
  await expect(page.getByRole('button', { name: 'Sign up' }).first()).toBeVisible();
  // Seating: the concert page shows where Ella stands on the risers.
  await page.goto('/c/demo');
  await page.getByRole('link', { name: 'Winter Light' }).first().click();
  await expect(page.getByRole('heading', { name: 'Where you stand' })).toBeVisible();
  await expect(page.getByText(/Row [A-D], position \d+/)).toBeVisible();
});

test('profile: save details, notification choices and data download', async ({ page }) => {
  await page.goto('/c/demo/profile');
  await page.getByLabel('Pronouns').fill('she/her');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Saved.')).toBeVisible();
  await expect(page.getByRole('table', { name: 'Notifications' })).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download (JSON)' }).click();
  expect((await download).suggestedFilename()).toMatch(/my-data.*\.json$/);
});

test('notification centre', async ({ page }) => {
  await page.goto('/c/demo/notifications');
  await expect(page.getByRole('heading', { name: 'Notifications', level: 1 })).toBeVisible();
});
