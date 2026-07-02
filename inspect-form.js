const fs = require('fs');
const { chromium } = require('playwright');

(async () => {
  const auth = JSON.parse(fs.readFileSync('auth.json', 'utf8'));
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ storageState: { cookies: auth.cookies || [], origins: auth.origins || [] } });
  const page = await context.newPage();

  await page.goto('https://app.beeceptor.com/endpoints', { waitUntil: 'networkidle' });
  await page.waitForTimeout(4000);
  await page.goto('https://app.beeceptor.com/console/pw-test-1782934119461', { waitUntil: 'networkidle' });
  await page.waitForTimeout(6000);

  const mockRulesLink = page.locator('a, button, span').filter({ hasText: /^Mock Rules/i }).first();
  if (await mockRulesLink.isVisible().catch(() => false)) {
    await mockRulesLink.click();
    await page.waitForTimeout(2000);
  }

  const createRuleBtn = page.getByRole('button', { name: /create rule using ai/i }).first();
  if (await createRuleBtn.isVisible().catch(() => false)) {
    await createRuleBtn.click({ force: true });
    await page.waitForTimeout(3000);
  }

  await page.screenshot({ path: 'inspect-form.png', fullPage: true });
  console.log('saved inspect-form.png');
  console.log(await page.locator('body').innerText());
  await browser.close();
})().catch(err => { console.error(err); process.exit(1); });
