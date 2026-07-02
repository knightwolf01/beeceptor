# Beeceptor HTTP Callout — Playwright Automation

End-to-end Playwright automation that tests the **HTTP Callout** feature on [Beeceptor](https://beeceptor.com).

## What This Automation Does

| Step | Action | Description |
|------|--------|-------------|
| 1 | **Open Beeceptor** | Navigates to Beeceptor and confirms authentication |
| 2 | **Create/Reuse Endpoint** | Creates a new mock endpoint or reuses an existing one |
| 3 | **Configure HTTP Callout Rule** | Opens the callout rule form, sets method/path/target URL |
| 4 | **Trigger API Call** | Sends an HTTP request to the mock endpoint |
| 5 | **Verify Callout** | Confirms the callout executed via response + request log |
| 6 | **Clean Up** | Deletes the test callout rule |

## What is HTTP Callout?

Beeceptor's **HTTP Callout Rule** (also called Proxy Rule) allows you to:
- **Forward** incoming requests to a real backend server
- **Transform** request payloads before forwarding
- Operate in **Synchronous** mode (wait for target response) or **Asynchronous** mode (return instant response, fire callout in background)

[📖 Official Documentation](https://beeceptor.com/docs/proxy-rule-http-callout/)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Authenticate (One-Time)

Since Beeceptor uses Google OAuth, you need to log in manually once:

```bash
npm run login
```

This opens a browser → you sign in → press ENTER → session saved to `auth.json`.

### 3. Run Tests

```bash
# Headed mode (see the browser)
npm run test:headed

# Headless mode
npm test

# Debug mode (step through)
npm run test:debug
```

### 4. View Report

```bash
npm run report
```

## Project Structure

```
beeceptor/
├── package.json              # Project config & scripts
├── playwright.config.js      # Playwright configuration
├── login.js                  # Manual OAuth login helper
├── README.md                 # This file
├── auth.json                 # Saved session (created by login.js)
├── pages/
│   └── BeeceptorPage.js      # Page Object Model
├── tests/
│   └── http-callout.spec.js  # Main E2E test
└── test-results/             # Screenshots & artifacts
```

## How It Works

1. **Authentication**: Uses `auth.json` (saved browser cookies/storage) to skip OAuth login during tests
2. **Endpoint Management**: Reuses existing endpoints or creates new ones
3. **Callout Rule**: Configures a rule that forwards `POST /api/test-callout` to `postman-echo.com/post`
4. **Verification**: 
   - **Layer 1**: Checks the HTTP response — httpbin echoes back our data, proving the callout fired
   - **Layer 2**: Checks Beeceptor's request log UI for callout execution evidence
5. **Cleanup**: Deletes the test rule to leave the account clean

## Tech Stack

- **Playwright** — Browser automation framework
- **Page Object Model** — Clean separation of UI interaction logic
- **postman-echo.com** — Public echo API used as the callout target
