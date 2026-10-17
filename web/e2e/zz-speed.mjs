import { chromium } from '@playwright/test';
const base = 'https://choirbookrepo.vercel.app';
const b = await chromium.launch();
const p = await b.newPage();
await p.goto(base + '/demo');
await p.getByRole('button', { name: 'Start' }).nth(1).click();
await p.waitForURL(/\/c\/demo/);
for (const path of ['/c/demo/calendar', '/c/demo/reports', '/c/demo/dashboard/owing', '/c/demo', '/c/demo/calendar', '/c/demo/reports', '/c/demo']) {
  const t = Date.now();
  await p.goto(base + path, { waitUntil: 'domcontentloaded' });
  console.log(path, Date.now() - t, 'ms');
}
await b.close();
