const { chromium } = require('@playwright/test');
const readline = require('readline');

(async () => {
  console.log('\n🐝 Beeceptor Login Helper');
  console.log('========================\n');
  console.log('Opening browser for manual login...\n');

  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome',
    args: ['--disable-blink-features=AutomationControlled'],
    ignoreDefaultArgs: ['--enable-automation'],
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://app.beeceptor.com/login');
  
  console.log('─────────────────────────────────────────────');
  console.log('  1. Sign in using Google OAuth or Email/Password');
  console.log('  2. Wait until you see the dashboard (Your Endpoints)');
  console.log('  3. Come back here and press ENTER');
  console.log('─────────────────────────────────────────────\n');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  await new Promise((resolve) => {
    rl.question('>>> Press ENTER after you are logged in... ', () => {
      rl.close();
      resolve();
    });
  });

  console.log('\n💾 Saving authentication state to auth.json...');
  await context.storageState({ path: 'auth.json' });
  console.log('✅ Session saved successfully!\n');
  console.log('You can now run tests with: npm test\n');

  await browser.close();
})();
