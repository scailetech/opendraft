# OpenDraft Production Checklist

## ✅ Already Configured

### Supabase Database
- [x] `waitlist` table exists
- [x] `referrals` table exists  
- [x] Credentials in `.env.local`
- [x] Project: `rnuiiqgkytwmztgsanng`

### Resend Email
- [x] API key configured: `re_VRLqQibn_...`

### Waitlist Config
- [x] 100 thesis/day limit
- [x] 20 positions per referral
- [x] 1 referral required for reward

---

## 🔴 TODO Before Production

### 1. Cloudflare Turnstile (REQUIRED)
Currently using **test keys** - NO spam protection!

```bash
# Replace in .env.local:
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your-real-site-key
TURNSTILE_SECRET_KEY=your-real-secret-key
```

**Steps:**
1. Go to https://dash.cloudflare.com
2. Click **Turnstile** in sidebar
3. Click **Add Site** → enter `opendraft.ai`
4. Copy Site Key + Secret Key
5. Update `.env.local`

### 2. Production URL
```bash
# Change in .env.local:
NEXT_PUBLIC_BASE_URL=https://opendraft.ai
```

### 3. Resend Domain Verification
- [ ] Verify domain `opendraft.ai` in Resend dashboard
- [ ] Add DNS records (SPF, DKIM, DMARC)
- Dashboard: https://resend.com/domains

### 4. Clean Up Test Data
```sql
-- Run in Supabase SQL Editor:
DELETE FROM waitlist WHERE email LIKE %example.com;
```

---

## 🟡 Before Launch

### Testing
- [ ] Test signup with real email
- [ ] Verify email arrives from `hello@opendraft.ai`
- [ ] Test verification link works
- [ ] Test referral flow (2 users)

### Security
- [ ] Enable RLS in Supabase (if not already)
- [ ] Review Supabase policies

### Content
- [ ] FAQ answers accurate
- [ ] Privacy policy link works
- [ ] Terms of service link works
- [ ] GitHub repo link correct

---

## 🟢 Optional

- [ ] Error tracking (Sentry)
- [ ] Analytics (Plausible/PostHog)
- [ ] Uptime monitoring

---

## Quick Links

| Service | URL |
|---------|-----|
| Cloudflare Turnstile | https://dash.cloudflare.com |
| Supabase | https://supabase.com/dashboard/project/rnuiiqgkytwmztgsanng |
| Resend | https://resend.com/emails |

---

## Current .env.local Status

| Variable | Status |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Set |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Set |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Set |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | ⚠️ Test key |
| `TURNSTILE_SECRET_KEY` | ⚠️ Test key |
| `RESEND_API_KEY` | ✅ Set |
| `NEXT_PUBLIC_BASE_URL` | ⚠️ localhost |
| `GEMINI_API_KEY` | ✅ Set |

---

*Last updated: 2025-11-30*
