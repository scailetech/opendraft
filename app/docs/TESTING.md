# E2E Testing Guide

**Comprehensive documentation for Playwright E2E testing infrastructure**

This guide addresses the recurring Playwright authentication test failures and documents the permanent automated solution.

---

## Table of Contents

1. [The Recurring Auth Issue (Root Cause & Solution)](#the-recurring-auth-issue)
2. [Quick Start](#quick-start)
3. [Testing Infrastructure](#testing-infrastructure)
4. [Environment Setup](#environment-setup)
5. [Running Tests](#running-tests)
6. [Troubleshooting](#troubleshooting)
7. [Architecture Details](#architecture-details)

---

## The Recurring Auth Issue

###  Problem Summary

**Symptom**: Playwright tests repeatedly failed across sessions with authentication errors, timeouts, or "user not found" failures.

**Root Causes Identified**:
1. **Manual Setup Process**: Required manually starting dev server, creating test user, checking environment variables
2. **Port Conflicts**: Dev server (port 3333) conflicted with test server, causing connection errors
3. **Missing Environment Variables**: Tests failed mid-execution when `.env.local` was incomplete
4. **Stale Test Users**: Test user deleted or missing in Supabase auth
5. **Knowledge Loss**: Configuration steps lost between sessions/team members

### ✅ Permanent Solution Implemented

**Automated Testing Infrastructure** (4 files created + 1 bug fix):

| Component | Purpose | Status |
|-----------|---------|--------|
| `scripts/verify-test-env.ts` | Pre-flight checks (env vars, server, test user) | ✅ Tested |
| `scripts/start-test-server.sh` | Auto-start dev server on port 3334 | ✅ Bug fixed |
| `scripts/create-test-user.ts` | Create test user in Supabase | ✅ Working |
| `.env.test.example` | Environment variable template | ✅ Created |
| `package.json` | 6 npm test scripts | ✅ Added |

**Key Improvements**:
- ✅ Automated setup eliminates manual configuration errors
- ✅ Port 3334 isolates tests from dev server (no conflicts)
- ✅ Pre-flight checks catch issues BEFORE tests run
- ✅ Clear error messages with actionable fixes
- ✅ Documentation preserves knowledge between sessions

---

## Quick Start

### One-Time Setup (< 5 minutes)

```bash
# 1. Copy environment template
cp .env.test.example .env.local

# 2. Fill in real credentials in .env.local:
#    - NEXT_PUBLIC_SUPABASE_URL
#    - SUPABASE_SERVICE_ROLE_KEY
#    - NEXT_PUBLIC_SUPABASE_ANON_KEY
#    - MODAL_API_URL
#    - GEMINI_API_KEY

# 3. Run automated setup (creates user, starts server, validates)
npm run test:setup
```

### Run Tests

```bash
# Run all E2E tests with pre-flight checks
npm run test:e2e

# Or run individual components:
npm run test:env       # Check environment only
npm run test:server    # Start dev server only
npm run test:user      # Create test user only
```

### Cleanup

```bash
# Stop server and clean up artifacts
npm run test:cleanup
```

---

## Testing Infrastructure

### Architecture Overview

```
📦 Testing Stack
├── 🔍 Pre-Flight Checks (scripts/verify-test-env.ts)
│   ├── Environment variables validation
│   ├── Dev server health check
│   └── Test user existence check
│
├── 🚀 Dev Server Automation (scripts/start-test-server.sh)
│   ├── Port cleanup (fuser + lsof multi-layered)
│   ├── Background server start
│   ├── Health check polling (max 60s)
│   └── PID tracking for cleanup
│
├── 👤 Test User Management (scripts/create-test-user.ts)
│   ├── Supabase admin client
│   ├── Create/verify test@bulkgpt.local
│   └── Auto-confirm email
│
└── 🎭 Playwright Tests
    ├── Real Supabase auth (not mocked)
    ├── Session saved to playwright/.auth/user.json
    └── Isolated on port 3334
```

### NPM Scripts

```json
{
  "test:env": "npx tsx scripts/verify-test-env.ts",
  "test:server": "bash scripts/start-test-server.sh",
  "test:user": "npx tsx scripts/create-test-user.ts",
  "test:setup": "npm run test:user && npm run test:server && npm run test:env",
  "test:e2e": "npm run test:env && npx playwright test",
  "test:cleanup": "lsof -ti:3334 | xargs kill -9 2>/dev/null || true && rm -f /tmp/playwright-dev-server.* playwright/.auth/user.json"
}
```

---

## Environment Setup

### Required Environment Variables

Create `.env.local` from `.env.test.example`:

```bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Modal API (Required for batch processing)
MODAL_API_URL=https://scaile--bulk-gpt-processor-mvp-fastapi-app.modal.run

# Gemini AI (Required for AI features)
GEMINI_API_KEY=AIzaSy...

# Test Credentials (Created automatically)
TEST_USER_EMAIL=test@bulkgpt.local
TEST_USER_PASSWORD=Test123456!

# Vercel (Optional - for production E2E tests)
VERCEL_BYPASS_TOKEN=your-bypass-token
```

**Where to Find Credentials**:
- **Supabase**: Project Settings → API → Project URL, service_role key, anon key
- **Modal**: Deployed function URL
- **Gemini**: https://makersuite.google.com/app/apikey
- **Vercel**: Project Settings → Deployment Protection

---

## Running Tests

### Pre-Flight Checks

**Always run before tests** to catch configuration issues:

```bash
npm run test:env
```

**Output**:
```
🔍 Running pre-flight checks for Playwright E2E tests...

✅ All required environment variables are set
✅ Dev server is running on port 3334
✅ Test user exists (test@bulkgpt.local)

✅ All checks passed (3/3)
Ready to run Playwright tests!
```

### Dev Server Management

**Start Server** (automated with bug fix for port detection):
```bash
npm run test:server

# Output:
# 🚀 Starting dev server for Playwright tests on port 3334...
# ✅ Port 3334 is now free
# ✅ Dev server is ready on http://localhost:3334 (took 1s)
# Server PID: 1065171
```

**Check Server Status**:
```bash
curl http://localhost:3334
# Should return HTTP 307 (Next.js redirect) or 200
```

**Stop Server**:
```bash
npm run test:cleanup
# or manually:
kill $(cat /tmp/playwright-dev-server.pid)
```

### Test User Creation

```bash
npm run test:user

# Output:
# ✅ Test user created successfully!
#    User ID: 2b1c7015-17db-4486-a645-34fe30b5d8b3
#    Email: test@bulkgpt.local
#
# 📝 Test credentials for Playwright:
#    Email: test@bulkgpt.local
#    Password: Test123456!
```

**Note**: Script is idempotent - safe to run multiple times (won't create duplicates).

### Running E2E Tests

```bash
# Full test suite with pre-flight checks
npm run test:e2e

# Run specific test file
npx playwright test playwright-tests/your-test.spec.ts

# Run with UI mode (debugging)
npx playwright test --ui

# Run specific project
npx playwright test --project=chromium

# Run without auth (public pages)
npx playwright test --project=no-auth
```

---

## Troubleshooting

### Common Issues

#### 1. "Dev server is not running on port 3334"

**Cause**: Server crashed or not started

**Fix**:
```bash
npm run test:server
# Wait for "✅ Dev server is ready" message
```

**If port is stuck**:
```bash
lsof -ti:3334 | xargs kill -9
npm run test:server
```

#### 2. "Missing environment variables"

**Cause**: `.env.local` incomplete or missing

**Fix**:
```bash
# Copy template
cp .env.test.example .env.local

# Fill in real values (see Environment Setup section)
# Then verify:
npm run test:env
```

#### 3. "Test user does not exist"

**Cause**: Test user deleted or never created

**Fix**:
```bash
npm run test:user
```

**If creation fails**:
- Check `SUPABASE_SERVICE_ROLE_KEY` is correct
- Verify Supabase project is active
- Check auth is enabled in Supabase dashboard

#### 4. "EADDRINUSE: address already in use :::3334"

**Cause**: Port conflict (bug fixed in `start-test-server.sh`)

**Fix**:
```bash
# Manual cleanup
fuser -k -KILL 3334/tcp
sleep 2

# Re-run server script (now with multi-layered cleanup)
npm run test:server
```

#### 5. "Auth setup timeout (90s)"

**Cause**: Supabase auth API slow or network issues

**Fix**:
- Check internet connection
- Verify Supabase project is not paused
- Check `.env.local` has correct Supabase URL
- Try running auth setup alone:
  ```bash
  npx playwright test --project=real-auth-setup
  ```

---

## Architecture Details

### Port Isolation Strategy

**Why Port 3334?**
- Default dev server: `localhost:3333`
- Test server: `localhost:3334` (isolated)
- Prevents port conflicts during development
- Allows running tests while dev server is active

### Authentication Flow

```
1. npm run test:user
   ├─> Check if test@bulkgpt.local exists
   └─> Create user if missing (Supabase Admin API)

2. npm run test:server
   ├─> Kill processes on port 3334 (multi-layered)
   ├─> Start Next.js dev server
   └─> Wait for HTTP 200/307 response

3. npx playwright test
   ├─> Run real-auth-setup project (auth.setup.ts)
   │   ├─> Navigate to /auth page
   │   ├─> Fill email/password form
   │   ├─> Submit login (real Supabase auth)
   │   ├─> Wait for auth redirect
   │   └─> Save session to playwright/.auth/user.json
   │
   └─> Run test projects (chromium, etc.)
       └─> Load session from user.json (reuse auth)
```

**Important**: This is **REAL authentication**, not mocked. Test user must exist in Supabase.

### File Structure

```
bulk-gpt-app/
├── scripts/
│   ├── verify-test-env.ts       # Pre-flight checks
│   ├── start-test-server.sh     # Dev server automation
│   └── create-test-user.ts      # Test user creation
│
├── playwright-tests/
│   ├── auth.setup.ts             # Auth session creation
│   └── *.spec.ts                 # Test files
│
├── playwright/.auth/
│   └── user.json                 # Saved auth session
│
├── playwright.config.ts          # Playwright configuration
├── .env.test.example             # Environment template
└── .env.local                    # Actual credentials (gitignored)
```

### Pre-Flight Check Details

**scripts/verify-test-env.ts** validates 3 critical components:

1. **Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

2. **Dev Server**:
   - HTTP request to `http://localhost:3334`
   - Accepts: 200 (OK), 307 (redirect), 401 (auth)
   - 3-second timeout

3. **Test User**:
   - Queries Supabase admin API
   - Checks for `test@bulkgpt.local`
   - Returns user ID and creation date

**Exit Codes**:
- `0`: All checks passed (ready for tests)
- `1`: One or more checks failed (not ready)

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    env:
      NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
      SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
      MODAL_API_URL: ${{ secrets.MODAL_API_URL }}
      GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}

    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install chromium

      - name: Run automated setup
        run: npm run test:setup

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Cleanup
        if: always()
        run: npm run test:cleanup
```

---

## Best Practices

### ✅ Do

- Run `npm run test:env` before running tests
- Use `npm run test:cleanup` after tests
- Keep test user credentials in `.env.local` (gitignored)
- Run tests on isolated port 3334
- Use automated scripts (`test:setup`, `test:e2e`)

### ❌ Don't

- Commit `.env.local` to version control
- Run tests on port 3333 (conflicts with dev server)
- Skip pre-flight checks (catches issues early)
- Delete test user from Supabase (breaks auth setup)
- Run multiple dev servers on same port

---

## Summary

**Problem**: Recurring Playwright authentication test failures across sessions

**Solution**: Automated testing infrastructure with pre-flight checks, dev server automation, and test user management

**Result**: ✅ Zero-config test execution with automated environment validation

**Commands to Remember**:
```bash
npm run test:setup    # One-time setup
npm run test:e2e      # Run tests
npm run test:cleanup  # Clean up
```

For issues or questions, see the Troubleshooting section above.
