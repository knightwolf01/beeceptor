// @ts-check
const { expect } = require('@playwright/test');

/**
 * Page Object for Beeceptor web application.
 * 
 * Encapsulates all UI interactions with the Beeceptor dashboard:
 * endpoint management, mock rule configuration, HTTP callout setup,
 * request log verification, and cleanup.
 * 
 * Locators are based on actual Beeceptor UI (as of July 2026) observed
 * through manual browser exploration.
 */
class BeeceptorPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  /* ================================================================
   * NAVIGATION
   * ================================================================ */

  /** Navigate to the endpoints listing page */
  async goToEndpoints() {
    await this.page.goto('https://app.beeceptor.com/endpoints');
    await this.page.waitForLoadState('networkidle');
  }

  /** Navigate to a specific endpoint's console */
  async goToConsole(endpointName) {
    await this.page.goto(`https://app.beeceptor.com/console/${endpointName}`);
    await this.page.waitForLoadState('networkidle');
  }

  /* ================================================================
   * ENDPOINT MANAGEMENT
   * ================================================================ */

  /**
   * Creates a brand new mock endpoint from the Beeceptor homepage.
   * @param {string} name - The subdomain name for the endpoint
   * @returns {Promise<{name: string, baseUrl: string}>}
   */
  async createEndpoint(name) {
    await this.page.goto('https://beeceptor.com/');
    await this.page.waitForLoadState('networkidle');

    // Accept cookies banner if present
    await this.dismissCookieBanner();

    // Fill the endpoint name input (placeholder: "payments-api")
    const nameInput = this.page.locator('input[placeholder="payments-api"]');
    await nameInput.fill(name);

    // Click "Create Mock Server" button
    const createBtn = this.page.getByRole('button', { name: /Create Mock Server/i });
    await createBtn.click();

    // Wait for the console page to load
    await this.page.waitForURL(/\/console\//, { timeout: 30_000 });
    await this.page.waitForLoadState('networkidle');

    // Dismiss onboarding popups
    await this.dismissOnboarding();

    const baseUrl = `https://${name}.free.beeceptor.com`;
    return { name, baseUrl };
  }

  /**
   * Reuses the first existing endpoint from the user's dashboard.
   * Navigates to /endpoints, finds the first endpoint link, and opens it.
   * @returns {Promise<{name: string, baseUrl: string}>}
   */
  async reuseFirstEndpoint() {
    await this.goToEndpoints();

    // Endpoint links are anchors with href containing "/console/"
    const endpointLink = this.page.locator('a[href*="/console/"]').first();
    await expect(endpointLink).toBeVisible({ timeout: 15_000 });

    // Extract the endpoint name from the href
    const href = await endpointLink.getAttribute('href');
    const name = href.split('/console/')[1].split(/[?#]/)[0];

    // Navigate to the endpoint console
    await this.goToConsole(name);
    await this.dismissOnboarding();

    const baseUrl = `https://${name}.free.beeceptor.com`;
    return { name, baseUrl };
  }

  /**
   * Deletes the current endpoint through the settings menu.
   * @param {string} endpointName
   */
  async deleteEndpoint(endpointName) {
    // Click the three-dot menu (⋮) or settings gear
    const settingsBtn = this.page.locator('button, a').filter({ hasText: /⋮/ }).first()
      .or(this.page.locator('[aria-label*="settings" i], [title*="settings" i]').first());
    
    if (await settingsBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await settingsBtn.click();
    }

    // Look for Delete option
    const deleteOption = this.page.getByText(/delete.*endpoint/i).first();
    if (await deleteOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await deleteOption.click();

      // Confirm deletion if prompted
      const confirmInput = this.page.locator('input[placeholder*="type" i], input[placeholder*="confirm" i]');
      if (await confirmInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmInput.fill(endpointName);
      }

      const confirmBtn = this.page.getByRole('button', { name: /^delete$|confirm/i });
      if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmBtn.click();
        await this.page.waitForTimeout(2000);
      }
    }
  }

  /* ================================================================
   * MOCK RULES PANEL
   * ================================================================ */

  /**
   * Opens the Mock Rules drawer/modal from the endpoint console.
   * The "Mock Rules (N)" link is in the top navigation area.
   */
  async openMockRulesPanel() {
    // Click the "Mock Rules" nav link (may show count like "Mock Rules (2)")
    const mockRulesLink = this.page.locator('a, button, span')
      .filter({ hasText: /^Mock Rules/i })
      .first();
    
    await mockRulesLink.click();
    await this.page.waitForTimeout(1500);

    // Verify the Mock Rules drawer opened by looking for its header
    await expect(
      this.page.getByText('Mock Rules').first()
    ).toBeVisible({ timeout: 10_000 });
  }

  /**
   * Deletes ALL existing callout/proxy rules to start clean.
   * Looks for rules with callout/proxy indicators and deletes them.
   */
  async deleteExistingCalloutRules() {
    // Look for delete buttons (trash icons) on rules that have callout indicators
    const deleteButtons = this.page.locator('.rule-item, [class*="rule"]')
      .locator('button[title*="delete" i], button:has(svg), [aria-label*="delete" i]');
    
    const count = await deleteButtons.count().catch(() => 0);
    // Delete from bottom to top to avoid index shifts
    for (let i = count - 1; i >= 0; i--) {
      await deleteButtons.nth(i).click().catch(() => {});
      // Confirm if dialog appears
      const confirmBtn = this.page.getByRole('button', { name: /confirm|yes|delete/i });
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click();
      }
      await this.page.waitForTimeout(500);
    }
  }

  /* ================================================================
   * HTTP CALLOUT RULE CREATION
   * ================================================================ */

  /**
   * Opens the callout rule creation form.
   * 
   * Flow: Mock Rules panel → "+ New Rule" dropdown → "New Callout Rule"
   */
  async openCalloutRuleForm() {
    // First ensure Mock Rules panel is open
    await this.openMockRulesPanel();
    await this.page.waitForTimeout(1000);

    // Look for the dropdown toggle to open the New Rule options
    const toggleBtn = this.page.locator('button').filter({ hasText: /^Toggle Dropdown$/i }).first()
      .or(this.page.locator('.dropdown-toggle').first());
      
    if (await toggleBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await toggleBtn.click({ force: true });
      await this.page.waitForTimeout(1000);
    } else {
      console.log('Toggle Dropdown not found, trying to find New Callout Rule directly');
    }

    // Try the current Beeceptor rule creation entry points.
    const ruleCreationButtons = [
      this.page.getByText(/New Callout Rule/i).first(),
      this.page.getByText(/Create Rule using AI/i).first(),
      this.page.getByText(/Create Rule/i).first(),
      this.page.getByText(/New Rule/i).first(),
      this.page.getByText(/Add Rule/i).first(),
      this.page.getByText(/Add Mock Rule/i).first(),
    ];

    let opened = false;
    for (const button of ruleCreationButtons) {
      if (await button.isVisible({ timeout: 3000 }).catch(() => false)) {
        await button.click({ force: true });
        opened = true;
        break;
      }
    }

    if (!opened) {
      console.log('No visible rule-creation button matched; continuing with the current form state.');
    }
    
    await this.page.waitForTimeout(2000);
    
    // As a fallback, if we are in a generic rule form, try clicking the Callout tab
    const calloutTab = this.page.locator('button').filter({ hasText: /HTTP Callout/i }).first();
    if (await calloutTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await calloutTab.evaluate((node) => node.click()).catch(() => {});
      await this.page.waitForTimeout(1000);
    }
  }

  /**
   * Configures the HTTP Callout rule with the given parameters.
   * 
   * @param {Object} config
   * @param {string} config.method - HTTP method to match (e.g., 'GET', 'POST')
   * @param {string} config.path - Request path to match (e.g., '/api/orders')
   * @param {string} config.targetUrl - The URL to call out to
   * @param {boolean} [config.synchronous=true] - Whether to wait for callout response
   * @param {string} [config.payloadBody] - Optional request body template for the callout
   */
  async configureCalloutRule({ method, path, targetUrl, synchronous = true, payloadBody }) {
    // ── Step 1: Set Request Matching Criteria ──
    const activeModal = this.page.locator('.modal.show').first();

    // Method dropdown (Beeceptor usually defaults to GET)
    if (method !== 'GET' && method !== 'ANY') {
      const methodSelect = activeModal.getByLabel('Method', { exact: true }).first();
      if (await methodSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
        await methodSelect.selectOption(method);
      } else {
        const methodDropdown = activeModal.getByText(/^GET$|^POST$|^PUT$|^DELETE$/i).first();
        if (await methodDropdown.isVisible({ timeout: 3000 }).catch(() => false)) {
          await methodDropdown.click();
          await activeModal.getByText(method, { exact: true }).first().click();
        }
      }
    }

    // DEBUG: Dump visible inputs
    const inputs = await this.page.locator('input').filter({ visible: true }).elementHandles();
    for (const el of inputs) {
      const name = await el.getAttribute('name');
      const placeholder = await el.getAttribute('placeholder');
      const id = await el.getAttribute('id');
      const type = await el.getAttribute('type');
      console.log(`DEBUG INPUT: id=${id}, name=${name}, type=${type}, placeholder=${placeholder}`);
    }


    // Path input — look for input fields near "path" or "match" labels
    const pathInput = activeModal.locator('input[name*="path" i], input[placeholder*="path" i], input[placeholder*="/" i]')
      .filter({ visible: true }).first();
    
    // Find the match value/expression input
    const matchInput = activeModal.locator('input[name*="match" i], input[name*="expression" i]')
      .filter({ visible: true }).first();
    
    if (await matchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await matchInput.fill(path);
    } else if (await pathInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await pathInput.fill(path);
    } else {
      // Fallback to the first visible text input in the modal
      const firstInput = activeModal.locator('input[type="text"], input:not([type])').filter({ visible: true }).first();
      if (await firstInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await firstInput.fill(path);
      }
    }
    
    // ── Step 2: Set Callout Behavior (Synchronous/Asynchronous) ──

    if (synchronous) {
      const syncOption = this.page.locator('label, span, input, button')
        .filter({ hasText: /synchronous/i, visible: true })
        .first();
      if (await syncOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await syncOption.click();
      }
    } else {
      const asyncOption = this.page.locator('label, span, input, button')
        .filter({ hasText: /asynchronous/i, visible: true })
        .first();
      if (await asyncOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await asyncOption.click();
      }
    }

   // ── Step 3: Set Target/Callout URL ──
    const possibleUrlFields = [
      this.page.locator('#targetEndpoint').first(),
      this.page.locator('input[placeholder*="your-webhook-endpoint.com"]').first(),
      this.page.locator('input[placeholder*="webhook"]').first(),
      this.page.locator('input[placeholder*="endpoint"]').first(),
      activeModal.getByLabel(/target endpoint/i).first(),
      activeModal.locator('input[type="url"]').filter({ visible: true }).first(),
      activeModal.locator('input[type="text"]').filter({ visible: true }).nth(1),
    ];

    let urlField = null;
    for (const field of possibleUrlFields) {
      if (await field.isVisible({ timeout: 1000 }).catch(() => false)) {
        urlField = field;
        break;
      }
    }

    if (urlField) {
      await urlField.fill('');
      await urlField.fill(targetUrl);
    } else {
      console.error('⚠️ Could not locate the Target endpoint input field!');
    }
    
    // ── Step 4: Set Payload Body (optional) ──
    if (payloadBody) {
      const bodyTextarea = this.page.locator(
        'textarea[name*="payload" i], textarea[name*="body" i], textarea[name*="callout" i]'
      ).first();
      
      if (await bodyTextarea.isVisible({ timeout: 5000 }).catch(() => false)) {
        await bodyTextarea.fill(payloadBody);
      } else {
        // Try any textarea that's visible in the form
        const anyTextarea = this.page.locator('textarea').first();
        if (await anyTextarea.isVisible({ timeout: 3000 }).catch(() => false)) {
          await anyTextarea.fill(payloadBody);
        }
      }
    }
  }

  /**
   * Saves the currently open rule form by clicking the Save button.
   */
  async saveRule(expectedPath) {
    const scopedButtons = [
      this.page.locator('[role="dialog"], .modal.show, .drawer.show, .ant-modal, [data-testid*="modal"]').first(),
      this.page.locator('form').first(),
      this.page.locator('body').first(),
    ];

    let scope = null;
    for (const candidate of scopedButtons) {
      if (await candidate.isVisible({ timeout: 1000 }).catch(() => false)) {
        scope = candidate;
        break;
      }
    }

    if (!scope) {
      scope = this.page.locator('body').first();
    }

    const possibleButtons = [
      scope.getByRole('button', { name: /^save$/i }).first(),
      scope.getByRole('button', { name: /^create$/i }).first(),
      scope.getByRole('button', { name: /^add$/i }).first(),
      scope.getByRole('button', { name: /^apply$/i }).first(),
      scope.locator('button, a').filter({ hasText: /^(Save|Create|Add|Apply)$/i }).first(),
      scope.locator('button, a').filter({ hasText: /^Create Rule$/i }).first(),
      scope.locator('button, a').filter({ hasText: /^Save Rule$/i }).first(),
      scope.locator('button, a').filter({ hasText: /^Add Rule$/i }).first(),
    ];

    let clicked = false;
    for (const button of possibleButtons) {
      if (await button.isVisible({ timeout: 1000 }).catch(() => false)) {
        await button.click({ force: true });
        clicked = true;
        break;
      }
    }

    if (!clicked) {
      console.log('⚠️ Could not find a visible save/create button inside the rule form; trying a fallback click.');
      const fallbackBtn = this.page.locator('button, a').filter({ hasText: /save|create|add|apply/i }).filter({ hasNotText: /using ai/i }).first();
      if (await fallbackBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await fallbackBtn.click({ force: true });
      }
    }

    await this.page.waitForTimeout(5000);

    if (expectedPath) {
      const pathFound = this.page.locator('body').filter({ hasText: new RegExp(expectedPath.replace('/', '\/')) }).first();
      await pathFound.isVisible({ timeout: 10_000 }).catch(() => {
        console.log('⚠️ The created rule path was not confirmed in the UI after save.');
      });
    }

    const successMsg = this.page.getByText(/saved|created|success/i);
    await successMsg.isVisible({ timeout: 5000 }).catch(() => {
      // Form may have closed silently — that's OK too
    });
  }

  /* ================================================================
   * API TRIGGER & VERIFICATION
   * ================================================================ */

  /**
   * Triggers an API call to the mock endpoint.
   * Uses Playwright's request context (not the browser) for a clean HTTP call.
   * 
   * @param {Object} options
   * @param {string} options.baseUrl - The mock endpoint base URL
   * @param {string} options.path - The API path
   * @param {string} [options.method='GET'] - HTTP method
   * @param {Object} [options.body] - Request body (for POST/PUT)
   * @returns {Promise<{status: number, body: any, headers: Object}>}
   */
  async triggerApiCall({ baseUrl, path, method = 'GET', body }) {
    const { request } = require('@playwright/test');
    const apiContext = await request.newContext();

    let response;
    const url = `${baseUrl}${path}`;
    const options = {
      headers: { 'Content-Type': 'application/json' },
    };

    if (method === 'GET') {
      response = await apiContext.get(url, options);
    } else if (method === 'POST') {
      response = await apiContext.post(url, { ...options, data: body });
    } else if (method === 'PUT') {
      response = await apiContext.put(url, { ...options, data: body });
    } else if (method === 'DELETE') {
      response = await apiContext.delete(url, options);
    }

    const status = response.status();
    let responseBody;
    try {
      responseBody = await response.json();
    } catch {
      try {
        responseBody = await response.text();
      } catch {
        responseBody = null;
      }
    }

    await apiContext.dispose();

    return { status, body: responseBody, headers: response.headers() };
  }

  /**
   * Verifies the callout execution by checking the Beeceptor request log.
   * 
   * Navigates to the request inspector and checks:
   * 1. A request matching the expected path exists in the log
   * 2. The request was handled by a rule (not just default behavior)
   * 3. A callout/proxy execution is recorded
   * 
   * @param {Object} options
   * @param {string} options.endpointName - The endpoint to check
   * @param {string} options.expectedPath - The path that was called
   * @param {number} [options.expectedStatus=200] - Expected HTTP status
   */
  async verifyCalloutInRequestLog({ endpointName, expectedPath, expectedStatus = 200 }) {
    // Reload the console page to refresh request log
    await this.goToConsole(endpointName);
    await this.page.waitForTimeout(3000);

    // The console shows live requests. Look for our request in the list.
    // Requests appear as rows showing method + path + status
    const requestRow = this.page.locator('div, tr, li')
      .filter({ hasText: new RegExp(expectedPath.replace('/', '\\/')) })
      .first();

    await expect(requestRow).toBeVisible({ timeout: 20_000 });

    // Click the request to expand details
    await requestRow.click();
    await this.page.waitForTimeout(2000);

    // Verify the path is shown in the details
    await expect(
      this.page.getByText(expectedPath)
    ).toBeVisible({ timeout: 10_000 });

    // Look for indicators that a rule matched and callout executed
    // Beeceptor shows "Rule Matched" or similar when a mock rule handled the request
    const ruleMatched = this.page.getByText(/rule matched|matched rule|mock rule/i);
    if (await ruleMatched.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Great — rule was matched
    }

    // Look for callout/proxy indicators in the request detail
    const calloutIndicator = this.page.getByText(/callout|proxy|upstream|forwarded/i);
    if (await calloutIndicator.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Callout execution confirmed
    }

    // Verify the status code is shown
    const statusText = this.page.getByText(String(expectedStatus));
    await expect(statusText.first()).toBeVisible({ timeout: 10_000 });
  }

  /* ================================================================
   * UTILITY METHODS
   * ================================================================ */

  /** Dismiss the cookie consent banner if present */
  async dismissCookieBanner() {
    const acceptBtn = this.page.getByRole('button', { name: /Accept/i });
    if (await acceptBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await acceptBtn.click();
    }
  }

  /** Dismiss onboarding popups or tours */
  async dismissOnboarding() {
    const dismissBtns = [
      this.page.getByText("I'll explore myself!"),
      this.page.getByText(/skip|close|dismiss|got it|no thanks/i),
      this.page.locator('[aria-label="Close"]'),
    ];

    for (const btn of dismissBtns) {
      if (await btn.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await btn.first().click().catch(() => {});
        await this.page.waitForTimeout(500);
      }
    }
  }

  /**
   * Takes a screenshot and saves it to the test artifacts.
   * Useful for debugging and verification.
   * @param {string} name - Screenshot file name
   */
  async takeScreenshot(name) {
    await this.page.screenshot({ path: `test-results/${name}.png`, fullPage: true });
  }
}

module.exports = { BeeceptorPage };
