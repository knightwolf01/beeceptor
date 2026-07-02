const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log("Navigating to beeceptor...");
  await page.goto('https://beeceptor.com/');

  console.log("Creating endpoint...");
  await page.locator('input[placeholder="payments-api"]').fill('pw-test-' + Date.now());
  await page.getByRole('button', { name: /Create Mock Server/i }).click();

  console.log("Waiting for console...");
  await page.waitForURL(/\/console\//, { timeout: 30000 });
  await page.waitForTimeout(2000);

  console.log("Opening Mock Rules...");
  const mockRulesLink = page.locator('a, button, span').filter({ hasText: /^Mock Rules/i }).first();
  await mockRulesLink.click({ force: true });
  await page.waitForTimeout(1500);

  console.log("Clicking New Rule dropdown...");
  const splitToggle = page.locator('.dropdown-toggle').first();
  if (await splitToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
    await splitToggle.click({ force: true });
  } else {
    // try to find + New Rule
    await page.getByText('New Rule').first().click({ force: true });
  }
  await page.waitForTimeout(1000);

  console.log("Clicking Callout option...");
  const calloutOption = page.getByText(/Callout/i).first();
  await calloutOption.click({ force: true });
  await page.waitForTimeout(2000);

  console.log("Dumping full page HTML...");
  const html = await page.content();
  fs.writeFileSync('beeceptor_callout_form.html', html);

  console.log("Done. Saved to beeceptor_callout_form.html");
  await browser.close();
})().catch(e => {
  console.error(e);
  process.exit(1);
});
