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
  await page.waitForTimeout(5000);

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
  await calloutOption.evaluate(node => node.click());
  await page.waitForTimeout(2000);
  
  const activeModal = page.locator('.modal.show').first();

  console.log("Filling Path...");
  const pathInput = activeModal.locator('input[name*="path" i], input[placeholder*="path" i], input[placeholder*="/" i]').filter({ visible: true }).first();
  await pathInput.fill('/api/test-callout');

  console.log("Filling Target URL...");
  const urlField = activeModal.locator('input[type="text"], input[type="url"], input:not([type])').filter({ visible: true, has: page.locator('xpath=ancestor::*[contains(@class, "row") or contains(@class, "form-group")]').filter({ hasText: /target|callout.*url/i }) }).first();
  await urlField.fill('https://postman-echo.com/post');
  
  console.log("Saving...");
  const saveBtn = activeModal.locator('button, a').filter({ hasText: /^Save$/i }).first();
  await saveBtn.evaluate((node) => node.click());
  await page.waitForTimeout(2000);

  console.log("Dumping errors...");
  const errors = await page.locator('.text-danger, .invalid-feedback, .alert-danger').allInnerTexts();
  console.log("ERRORS:", errors);
  
  const formHtml = await activeModal.evaluate(node => node.innerHTML).catch(() => "MODAL CLOSED");
  fs.writeFileSync('form_after_save.html', formHtml);
  console.log("Saved modal HTML to form_after_save.html");
  
  await browser.close();
})().catch(e => {
  console.error(e);
  process.exit(1);
});
