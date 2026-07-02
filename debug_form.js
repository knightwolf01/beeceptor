const fs = require('fs');
const { chromium } = require('playwright');

(async () => {
  const auth = JSON.parse(fs.readFileSync('auth.json', 'utf8'));
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: { cookies: auth.cookies || [], origins: auth.origins || [] } });
  const page = await context.newPage();

  await page.goto('https://app.beeceptor.com/endpoints', { waitUntil: 'networkidle' });
  await page.waitForTimeout(4000);
  await page.goto('https://app.beeceptor.com/console/pw-test-1782934119461', { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);

  const mockRulesLink = page.locator('a, button, span').filter({ hasText: /^Mock Rules/i }).first();
  if (await mockRulesLink.isVisible().catch(() => false)) {
    await mockRulesLink.click();
    await page.waitForTimeout(2000);
  }

  const candidates = [
    page.getByText(/New Callout Rule/i).first(),
    page.getByText(/Create Rule using AI/i).first(),
    page.getByText(/Create Rule/i).first(),
    page.getByText(/New Rule/i).first(),
    page.getByText(/Add Rule/i).first(),
  ];

  for (const c of candidates) {
    if (await c.isVisible().catch(() => false)) {
      await c.click({ force: true });
      break;
    }
  }

  await page.waitForTimeout(4000);
  const bodyText = await page.locator('body').innerText();
  const bodyHtml = await page.locator('body').innerHTML();
  fs.writeFileSync('debug_form_text.txt', bodyText.slice(0, 20000));
  fs.writeFileSync('debug_form_html.html', bodyHtml.slice(0, 400000));
  await page.screenshot({ path: 'debug_form.png', fullPage: true });
  console.log('wrote debug_form_text.txt, debug_form_html.html, debug_form.png');
  await browser.close();
})().catch(err => {
  console.error(err);
  process.exit(1);
});
