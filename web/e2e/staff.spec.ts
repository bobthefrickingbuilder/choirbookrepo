import { expect, test, type Page } from '@playwright/test';

// Staff flows on a tablet, as the demo administrator (Claire Dubois), plus a
// check that a section leader only sees what their role allows. Anything a
// test creates, it deletes again, so the demo stays tidy between runs.

async function enterDemoAsStaff(page: Page) {
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Start' }).nth(1).click();
  await page.waitForURL(/\/c\/demo/);
  const skip = page.getByRole('button', { name: 'Skip the tour' }).first();
  if (await skip.isVisible().catch(() => false)) await skip.click();
}

const stamp = () => `E2E ${Date.now().toString(36)}`;

test.describe.configure({ mode: 'default' });

test.beforeEach(async ({ page }) => {
  await enterDemoAsStaff(page);
});

test('roster: search, filter, open a profile, add and delete a staff note', async ({ page }) => {
  await page.goto('/c/demo/roster');
  await expect(page.getByRole('heading', { name: 'Roster', level: 1 })).toBeVisible();
  await page.getByPlaceholder('Search name, email, school or guardian').fill('Lucas');
  await expect(page.getByRole('row').filter({ hasText: 'Lucas Bergeron' })).toBeVisible();
  await page.getByRole('row').filter({ hasText: 'Lucas Bergeron' }).getByText('Lucas Bergeron').click();
  await expect(page.getByRole('heading', { name: 'Lucas Bergeron', level: 1 })).toBeVisible();
  await expect(page.getByText('Attendance this term')).toBeVisible();
  await expect(page.getByText('Staff only')).toBeVisible();
  const note = `${stamp()} note`;
  await page.getByLabel('Add a note').fill(note);
  await page.getByRole('button', { name: 'Save note' }).click();
  const card = page.locator('.note', { hasText: note });
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
  await expect(card).toHaveCount(0);
});

test('roster: CSV import reads a messy file and explains every problem', async ({ page }) => {
  await page.goto('/c/demo/roster/import');
  const messy = [
    '',
    'FIRST NAME,last name, E-mail ,Date of Birth,Pupitre',
    'ÉLISE,ROY,elise.e2e@Example.com,2010-05-03,Sopranos',
    ',,,,',
    'sam,okafor,ELISE.E2E@example.com,14 March 2008,alto',
    'Noah,,noah@example,03/04/2009,Baritone',
    'Lucas,Bergeron,lucas.bergeron@example.com,,B',
  ].join('\n');
  await page.getByLabel('Or paste the CSV text').fill(messy);
  await expect(page.getByText('1 ready to import · 3 with problems · 1 blank lines skipped')).toBeVisible();
  await expect(page.getByText('Same email as an earlier line')).toBeVisible();
  await expect(page.getByText('Already on the roster')).toBeVisible();
  await expect(page.getByText('Date of birth not understood (use YYYY-MM-DD)')).toBeVisible();
  await expect(page.getByText('Unknown section: imported unplaced')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download problem report' }).click();
  expect((await download).suggestedFilename()).toBe('import-problems.csv');
});

test('roster: CSV export downloads a file', async ({ page }) => {
  await page.goto('/c/demo/roster');
  const download = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Export CSV' }).click();
  expect((await download).suggestedFilename()).toBe('demo-roster.csv');
});

test('attendance: take attendance by section, undo, and show the door QR code', async ({ page }) => {
  await page.goto('/c/demo/attendance');
  await expect(page.getByRole('heading', { name: 'Attendance', level: 1 })).toBeVisible();
  await page.locator('a.event-pick').first().click();
  await expect(page.getByRole('button', { name: 'QR check-in' }).or(page.getByRole('link', { name: 'QR check-in' }))).toBeVisible();
  const row = page.getByRole('radiogroup').first();
  const present = row.getByRole('radio').first();
  const before = await present.getAttribute('aria-checked');
  await present.click();
  await expect(present).toHaveAttribute('aria-checked', before === 'true' ? 'false' : 'true');
  await present.click(); // back to how it was
  await expect(present).toHaveAttribute('aria-checked', before ?? 'false');
  await page.getByRole('link', { name: 'QR check-in' }).click();
  await expect(page.getByRole('heading', { name: 'Scan to check in' })).toBeVisible();
  await expect(page.locator('.qr-screen__code svg')).toBeVisible();
  await expect(page.locator('.qr-screen__manual code')).toHaveText(/^[0-9A-F]{8}$/);
});

test('calendar: create a weekly sectional, edit it, then delete it', async ({ page }) => {
  const title = `${stamp()} sectional`;
  await page.goto('/c/demo/calendar');
  await page.getByRole('link', { name: 'New event' }).click();
  await page.getByLabel('Type').selectOption('sectional');
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Venue').fill('Room 2');
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await page.getByRole('link', { name: 'Edit event' }).click();
  await page.getByRole('textbox', { name: 'Dress (optional)', exact: true }).fill('Black');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Dress: Black')).toBeVisible();
  await page.getByRole('button', { name: 'Delete event' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete event' }).click();
  await page.waitForURL(/\/calendar$/);
});

test('music: library, a piece with its files and assignments, add and delete a piece', async ({ page }) => {
  await page.goto('/c/demo/music');
  await page.getByRole('link', { name: 'Manage library' }).click();
  await expect(page.getByRole('heading', { name: 'Music library' })).toBeVisible();
  await expect(page.getByText(/storage used/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Concert set lists' }).or(page.getByText('Concert set lists'))).toBeVisible();
  const title = `${stamp()} piece`;
  // On a slow connection the button can be clicked before the page is ready; retry until the dialog opens.
  await expect(async () => {
    await page.getByRole('button', { name: 'Add piece' }).click();
    await expect(page.getByRole('dialog').getByLabel('Title')).toBeVisible({ timeout: 2_000 });
  }).toPass();
  await page.getByRole('dialog').getByLabel('Title').fill(title);
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Upload score (PDF)' })).toBeVisible();
  await page.getByRole('button', { name: 'Delete piece' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
  await page.waitForURL(/\/music\/manage$/);
});

test('communications: draft an announcement and delete it; inbox, updates and email log', async ({ page }) => {
  const title = `${stamp()} notice`;
  await page.goto('/c/demo/communications');
  await expect(page.getByText(/emails left today/)).toBeVisible();
  await page.getByRole('link', { name: 'New announcement' }).click();
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Message').fill('Automated test. Please ignore.');
  await page.locator('label', { hasText: 'Save as draft' }).click();
  await page.getByRole('button', { name: 'Save as draft' }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await page.getByRole('button', { name: 'Delete announcement' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
  await page.waitForURL(/\/communications$/);
  await page.getByRole('link', { name: 'Inbox' }).click();
  await expect(page.getByText(/Typical first reply/)).toBeVisible();
  await page.locator('a.event-pick').first().click();
  await expect(page.getByLabel('Assigned to')).toBeVisible();
  await page.goto('/c/demo/communications?tab=updates');
  await expect(page.getByText(/One personal summary per chorister/)).toBeVisible();
  await page.goto('/c/demo/communications?tab=email');
  await expect(page.getByText('Recent emails')).toBeVisible();
});

test('forms and fees: forms, a form’s responses, a fee’s balances, payments', async ({ page }) => {
  await page.goto('/c/demo/forms-fees');
  await expect(page.getByRole('link', { name: 'New form' })).toBeVisible();
  await page.locator('a.event-pick').first().click();
  await expect(page.getByText(/submitted/).first()).toBeVisible();
  await page.goto('/c/demo/forms-fees?tab=fees');
  await page.getByRole('link', { name: 'Annual fee' }).click();
  await expect(page.getByText('Outstanding').first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Record payment/ }).first()).toBeVisible();
  await page.goto('/c/demo/forms-fees?tab=payments');
  await expect(page.getByRole('columnheader', { name: 'Method' })).toBeVisible();
});

test('forms: build a draft form with a question, then delete it', async ({ page }) => {
  const title = `${stamp()} form`;
  await page.goto('/c/demo/forms-fees/forms/new');
  await page.getByLabel('Title').fill(title);
  await page.getByRole('button', { name: 'Add question' }).click();
  await page.getByLabel('Question (English)').fill('T-shirt size');
  await page.getByLabel('Question (French)').fill('Taille de t-shirt');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await page.getByRole('button', { name: 'Delete form' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
  await page.waitForURL(/forms-fees\?tab=forms/);
});

test('tickets: sales by concert and the door scanner refuses an unknown code', async ({ page }) => {
  await page.goto('/c/demo/tickets');
  await expect(page.getByRole('heading', { name: 'Tickets', level: 1 })).toBeVisible();
  await expect(page.getByText('Sales by chorister').first()).toBeVisible();
  await page.getByRole('link', { name: 'Scan at the door' }).first().click();
  // Typing before the page is ready is lost; retype until the Check button turns on.
  await expect(async () => {
    await page.getByLabel('Ticket code').fill('00000000');
    await expect(page.getByRole('button', { name: 'Check' })).toBeEnabled({ timeout: 2_000 });
  }).toPass();
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.getByText('Ticket not found')).toBeVisible();
});

test('seating: the riser chart shows rows and seats', async ({ page }) => {
  await page.goto('/c/demo/tickets');
  const concert = page.getByRole('link', { name: 'Scan at the door' }).first();
  const href = (await concert.getAttribute('href')) ?? '';
  const eventId = href.split('/').pop();
  await page.goto(`/c/demo/calendar/${eventId}/seating`);
  await expect(page.getByRole('heading', { name: 'Riser chart' })).toBeVisible();
  await expect(page.locator('.riser__seat').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Fill by section' })).toBeVisible();
});

test('volunteers: jobs with slots, add a job and delete it', async ({ page }) => {
  const title = `${stamp()} job`;
  await page.goto('/c/demo/volunteers');
  await expect(page.getByText('Chaperone police checks')).toBeVisible();
  await page.getByRole('button', { name: 'Add job' }).click();
  await page.getByRole('dialog').getByLabel('Job').fill(title);
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText(title)).toBeVisible();
  await page.getByRole('button', { name: `Edit job: ${title}` }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete job' }).click();
  await page.getByRole('alertdialog').or(page.getByRole('dialog').last()).getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText(title)).toHaveCount(0);
});

test('reports: figures, CSV export and the board report', async ({ page }) => {
  await page.goto('/c/demo/reports');
  await expect(page.getByText('Attendance rate')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('link', { name: 'CSV' }).first().click();
  expect((await download).suggestedFilename()).toMatch(/\.csv$/);
  await page.getByRole('link', { name: 'Board report' }).click();
  await expect(page.getByRole('heading', { name: 'Report to the board of directors' })).toBeVisible();
  // Typing before the page is ready is lost, so type until the report shows it.
  await expect(async () => {
    await page.getByRole('textbox', { name: 'Highlights' }).fill('Sold-out winter concert (test)');
    await expect(page.locator('.board__doc')).toContainText('Sold-out winter concert (test)', { timeout: 3_000 });
  }).toPass({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Clear all' }).click();
});

test('users, settings and the audit log', async ({ page }) => {
  await page.goto('/c/demo/users');
  await expect(page.getByText('Claire Dubois').first()).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Conductor: Music library' })).toHaveValue('edit');
  await page.goto('/c/demo/settings');
  await expect(page.getByLabel('Choir name')).toHaveValue('Maple Valley Youth Choir');
  await expect(page.getByText('Sections and voice parts')).toBeVisible();
  await page.goto('/c/demo/audit');
  await expect(page.getByRole('heading', { name: 'Audit log' })).toBeVisible();
  await expect(page.getByRole('row').nth(1)).toBeVisible();
});

test('a section leader sees attendance but not fees or settings', async ({ page }) => {
  await page.getByRole('button', { name: 'Section leader' }).first().click();
  await page.waitForURL(/\/c\/demo/);
  const nav = page.getByRole('navigation', { name: 'Main' }).first();
  await expect(nav.getByRole('link', { name: 'Attendance' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Forms & fees' })).toHaveCount(0);
  await page.goto('/c/demo/settings');
  await expect(page.getByText('Your role does not include this area.', { exact: false })).toBeVisible();
  // Back to the administrator for the next run.
  await page.getByRole('button', { name: 'Administrator' }).first().click();
  await page.waitForURL(/\/c\/demo/);
});
