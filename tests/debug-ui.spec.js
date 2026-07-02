const fs = require('fs');
const { test } = require('@playwright/test');

test('inspect beeceptor rule form', async ({ page }) => {
  test.skip(!fs.existsSync('auth.json'), 'auth missing');
  await page.goto('https://app.beeceptor.com/endpoints');
  await page.waitForLoadState('networkidle');
  await page.goto('https://app.beeceptor.com/console/pw-test-1782934119461');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000);

  const mockRulesLink = page.locator('a, button, span').filter({ hasText: /^Mock Rules/i }).first();
  if (await mockRulesLink.isVisible().catch(() => false)) {
    await mockRulesLink.click();
    await page.waitForTimeout(2000);
  }

  const buttons = page.locator('button, a');
  const count = await buttons.count();
  for (let i = 0; i < count; i++) {
    const txt = (await buttons.nth(i).textContent()).trim();
    if (txt) console.log(`BUTTON[${i}]: ${txt}`);
  }

  const inputs = page.locator('input, textarea, select');
  const inputCount = await inputs.count();
  for (let i = 0; i < inputCount; i++) {
    const el = inputs.nth(i);
    const id = await el.getAttribute('id');
    const name = await el.getAttribute('name');
    const placeholder = await el.getAttribute('placeholder');
    const type = await el.getAttribute('type');
    const value = await el.inputValue().catch(() => '');
    console.log(`INPUT[${i}]: id=${id} name=${name} placeholder=${placeholder} type=${type} value=${value}`);
  }

  console.log('BODY TEXT:\n' + (await page.locator('body').innerText()));
  await page.screenshot({ path: 'debug-ui.png', fullPage: true });
});
