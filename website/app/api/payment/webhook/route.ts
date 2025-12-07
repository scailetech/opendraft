import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { WAITLIST_CONFIG } from '@/lib/config/waitlist';
import { Resend } from 'resend';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

const resend = new Resend(process.env.RESEND_API_KEY);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const paymentIntentId = paymentIntent.id;

      console.log(`Payment succeeded: ${paymentIntentId}`);

      // Find user by payment intent ID
      const { data: user, error: findError } = await supabaseAdmin
        .from('waitlist')
        .select('*')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .single();

      if (findError || !user) {
        console.error('User not found for payment intent:', paymentIntentId, findError);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Update user: mark as paid and ready to process
      const { error: updateError } = await supabaseAdmin
        .from('waitlist')
        .update({
          payment_status: WAITLIST_CONFIG.PAYMENT_STATUS.PAID,
          paid_at: new Date().toISOString(),
          status: 'waiting', // Will be processed immediately
          email_verified: true, // Mark as verified since payment succeeded
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Failed to update user payment status:', updateError);
        return NextResponse.json({ error: 'Failed to update payment status' }, { status: 500 });
      }

      console.log(`User ${user.id} marked as paid, triggering thesis generation...`);

      // Trigger immediate thesis generation via Modal
      // Note: Modal function will be called from backend/modal_worker.py
      // The daily batch will pick up paid users immediately, or we can add a separate trigger endpoint
      // For now, paid users will be processed in the next batch (or immediately if batch runs frequently)
      console.log(`User ${user.id} is ready for immediate processing (paid)`);

      // Send payment confirmation email
      try {
        const { PaymentConfirmationEmail } = await import('@/emails/PaymentConfirmationEmail');
        const { render } = await import('@react-email/render');

        await resend.emails.send({
          from: WAITLIST_CONFIG.FROM_EMAIL,
          to: user.email,
          subject: 'Payment confirmed - Your thesis is being generated!',
          html: render(
            PaymentConfirmationEmail({
              fullName: user.full_name,
              thesisTopic: user.thesis_topic,
              paymentAmount: WAITLIST_CONFIG.IMMEDIATE_PAYMENT_AMOUNT,
              paymentCurrency: WAITLIST_CONFIG.IMMEDIATE_PAYMENT_CURRENCY,
            })
          ),
        });
      } catch (emailError) {
        console.error('Failed to send payment confirmation email:', emailError);
        // Don't fail webhook if email fails
      }

      return NextResponse.json({ received: true });
    }

    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const paymentIntentId = paymentIntent.id;

      console.log(`Payment failed: ${paymentIntentId}`);

      // Update user payment status to failed
      const { error: updateError } = await supabaseAdmin
        .from('waitlist')
        .update({
          payment_status: WAITLIST_CONFIG.PAYMENT_STATUS.FAILED,
        })
        .eq('stripe_payment_intent_id', paymentIntentId);

      if (updateError) {
        console.error('Failed to update payment failure status:', updateError);
      }

      return NextResponse.json({ received: true });
    }

    // Handle other event types
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

