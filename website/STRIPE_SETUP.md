# Stripe Payment Integration Setup

This document explains how to set up Stripe for immediate payment mode (20€ instant thesis generation).

## Prerequisites

1. Stripe account: https://stripe.com
2. Stripe API keys (test and live)

## Environment Variables

Add these to your `.env.local` (development) and production environment:

```bash
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_... # or sk_live_... for production
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # or pk_live_... for production
STRIPE_WEBHOOK_SECRET=whsec_... # Webhook signing secret
```

## Setup Steps

### 1. Get Stripe API Keys

1. Go to https://dashboard.stripe.com/apikeys
2. Copy your **Secret key** (starts with `sk_test_` or `sk_live_`)
3. Copy your **Publishable key** (starts with `pk_test_` or `pk_live_`)
4. Add to `.env.local`:
   ```bash
   STRIPE_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

### 2. Set Up Webhook Endpoint

1. Go to https://dashboard.stripe.com/webhooks
2. Click **Add endpoint**
3. Enter endpoint URL:
   - **Development**: `https://your-domain.ngrok.io/api/payment/webhook` (use ngrok for local testing)
   - **Production**: `https://opendraft.xyz/api/payment/webhook`
4. Select events to listen to:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copy the **Signing secret** (starts with `whsec_`)
6. Add to `.env.local`:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### 3. Run Database Migration

Run the payment migration SQL in Supabase:

```bash
# File: website/lib/supabase/migration_add_payment.sql
# Run this in Supabase SQL Editor
```

This adds:
- `payment_mode` (waitlist/immediate)
- `payment_status` (pending/paid/failed/refunded)
- `payment_amount` (20.00)
- `payment_currency` (EUR)
- `stripe_payment_intent_id`
- `paid_at` timestamp

### 4. Test Payment Flow

1. **Test Mode**: Use test card `4242 4242 4242 4242`
2. **Test Flow**:
   - Select "Get Now - 20€" option
   - Fill form
   - Complete payment with test card
   - Check webhook receives `payment_intent.succeeded`
   - Verify user record updated to `payment_status = 'paid'`
   - Check thesis generation triggered

### 5. Production Checklist

- [ ] Switch to live API keys (`sk_live_` and `pk_live_`)
- [ ] Update webhook endpoint to production URL
- [ ] Test with real payment (small amount)
- [ ] Verify webhook receives events
- [ ] Check email delivery
- [ ] Monitor Modal worker processes paid users

## Payment Flow

1. User selects "Get Now - 20€" and fills form
2. Frontend calls `/api/payment/create-intent`
3. Backend creates Stripe PaymentIntent and waitlist entry (`payment_status = 'pending'`)
4. User redirected to Stripe Checkout
5. After payment, Stripe sends webhook to `/api/payment/webhook`
6. Webhook updates user: `payment_status = 'paid'`, `paid_at = now()`
7. Modal worker picks up paid users immediately (priority queue)
8. Thesis generated and email sent

## Troubleshooting

### Webhook Not Receiving Events

- Check webhook URL is correct in Stripe dashboard
- Verify `STRIPE_WEBHOOK_SECRET` matches signing secret
- Check webhook logs in Stripe dashboard
- Use Stripe CLI for local testing: `stripe listen --forward-to localhost:3000/api/payment/webhook`

### Payment Succeeds But User Not Updated

- Check webhook logs in Stripe dashboard
- Verify webhook handler logs (check server logs)
- Check database for `stripe_payment_intent_id` match
- Ensure webhook secret is correct

### Test Cards

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

## Support

For Stripe issues, check:
- Stripe Docs: https://stripe.com/docs
- Stripe Support: https://support.stripe.com

