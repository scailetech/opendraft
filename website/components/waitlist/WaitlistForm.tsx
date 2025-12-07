'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WAITLIST_CONFIG } from '@/lib/config/waitlist';
import Turnstile from 'react-turnstile';
import { Loader2, ChevronDown, ChevronUp, CreditCard, Gift } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';

const formSchema = z.object({
  email: z.string().email('Invalid email address'),
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  thesisTopic: z
    .string()
    .min(10, 'Topic must be at least 10 characters')
    .max(500, 'Topic must be less than 500 characters'),
  language: z.string(),
  academicLevel: z.string(),
});

type FormData = z.infer<typeof formSchema>;

interface WaitlistFormProps {
  referralCode?: string;
}

export function WaitlistForm({ referralCode: urlReferralCode }: WaitlistFormProps) {
  const [turnstileToken, setTurnstileToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'waitlist' | 'immediate'>('waitlist');
  const [success, setSuccess] = useState<{ position: number; referralCode: string; referralBonusApplied?: boolean; paymentMode?: 'waitlist' | 'immediate' } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showReferralField, setShowReferralField] = useState(false);
  const [manualReferralCode, setManualReferralCode] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      language: 'en',
      academicLevel: 'master',
    },
  });

  const selectedLanguage = watch('language');
  const selectedLevel = watch('academicLevel');

  const onSubmit = async (data: FormData) => {
    if (!turnstileToken) {
      setError('Please complete the verification');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    // Use URL referral code if present, otherwise use manual input
    const finalReferralCode = urlReferralCode || manualReferralCode.trim() || undefined;

    try {
      // If immediate payment mode, create payment intent and redirect to Stripe Checkout
      if (paymentMode === 'immediate') {
        const response = await fetch('/api/payment/create-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...data,
            turnstileToken,
            referredByCode: finalReferralCode,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Payment setup failed');
        }

        // Redirect to Stripe Checkout
        const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
        if (!stripe) {
          throw new Error('Stripe failed to load');
        }

        const { error: stripeError } = await stripe.confirmPayment({
          clientSecret: result.clientSecret,
          confirmParams: {
            return_url: `${window.location.origin}/waitlist/payment-success`,
          },
        });

        if (stripeError) {
          throw new Error(stripeError.message || 'Payment failed');
        }

        // Payment redirect initiated, don't set success state yet
        return;
      }

      // Waitlist mode - use existing signup flow
      const response = await fetch('/api/waitlist/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          turnstileToken,
          referredByCode: finalReferralCode,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Signup failed');
      }

      setSuccess({
        position: result.position,
        referralCode: result.referralCode,
        referralBonusApplied: result.referralBonusApplied,
        paymentMode: 'waitlist',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    if (success.paymentMode === 'immediate') {
      return (
        <div className="max-w-2xl mx-auto p-8 bg-green-50 dark:bg-green-950 rounded-xl border-2 border-green-200 dark:border-green-800">
          <h3 className="text-2xl font-bold text-green-800 dark:text-green-200 mb-4">
            💳 Payment Processing...
          </h3>
          <p className="text-green-700 dark:text-green-300 mb-4">
            Your payment is being processed. You will be redirected to complete payment shortly.
          </p>
        </div>
      );
    }

    return (
      <div className="max-w-2xl mx-auto p-8 bg-green-50 dark:bg-green-950 rounded-xl border-2 border-green-200 dark:border-green-800">
        <h3 className="text-2xl font-bold text-green-800 dark:text-green-200 mb-4">
          🎉 You&apos;re on the waitlist!
        </h3>
        <p className="text-green-700 dark:text-green-300 mb-4">
          <strong>Position #{success.position}</strong> - <strong className="text-green-800 dark:text-green-100">Check your email to verify your spot!</strong>
          {success.referralBonusApplied && (
            <span className="block mt-2 text-sm">
              🎉 You skipped {WAITLIST_CONFIG.REFERRAL_BONUS} positions with your referral code!
            </span>
          )}
        </p>
        <div className="bg-yellow-50 dark:bg-yellow-950/50 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg mb-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>⚠️ Important:</strong> You must verify your email to secure your spot on the waitlist. 
            Check your inbox (and spam folder) for the verification email from OpenDraft.
          </p>
        </div>
        <p className="text-sm text-green-600 dark:text-green-400 mb-4">
          Want to skip ahead? Each referral = {WAITLIST_CONFIG.REFERRAL_REWARD} positions skipped for you, and {WAITLIST_CONFIG.REFERRAL_BONUS} positions for your friend!
        </p>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-green-300 dark:border-green-700">
          <p className="text-xs text-muted-foreground mb-2">Your referral code:</p>
          <code className="text-lg font-mono font-bold text-accent">
            {success.referralCode}
          </code>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl mx-auto space-y-6">
      {/* Payment Mode Selection */}
      <div className="border border-border rounded-lg p-4 bg-muted/30">
        <label className="block text-sm font-medium mb-3">Choose your option:</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setPaymentMode('waitlist')}
            className={`p-4 rounded-lg border-2 transition-all ${
              paymentMode === 'waitlist'
                ? 'border-accent bg-accent/10'
                : 'border-border hover:border-accent/50'
            }`}
          >
            <Gift className="h-5 w-5 mb-2 mx-auto text-accent" />
            <div className="font-semibold">Free Waitlist</div>
            <div className="text-xs text-muted-foreground mt-1">Join the queue</div>
          </button>
          <button
            type="button"
            onClick={() => setPaymentMode('immediate')}
            className={`p-4 rounded-lg border-2 transition-all ${
              paymentMode === 'immediate'
                ? 'border-accent bg-accent/10'
                : 'border-border hover:border-accent/50'
            }`}
          >
            <CreditCard className="h-5 w-5 mb-2 mx-auto text-accent" />
            <div className="font-semibold">Get Now - {WAITLIST_CONFIG.IMMEDIATE_PAYMENT_AMOUNT}€</div>
            <div className="text-xs text-muted-foreground mt-1">Instant generation</div>
          </button>
        </div>
      </div>

      {(urlReferralCode || manualReferralCode.trim()) && (
        <div className="bg-accent/10 p-4 rounded-lg border border-accent/20">
          <p className="text-sm text-accent">
            🎁 You were referred! You&apos;ll skip {WAITLIST_CONFIG.REFERRAL_BONUS} positions when you verify, and your friend will skip {WAITLIST_CONFIG.REFERRAL_REWARD} positions too!
          </p>
        </div>
      )}

      {/* Referral Code Input Field */}
      <div className="border border-border rounded-lg">
        <button
          type="button"
          onClick={() => setShowReferralField(!showReferralField)}
          className="w-full flex items-center justify-between p-3 text-sm font-medium hover:bg-muted/50 transition-colors"
        >
          <span className="text-muted-foreground">
            {showReferralField ? 'Hide' : 'Have a referral code?'}
          </span>
          {showReferralField ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {showReferralField && (
          <div className="p-4 pt-0 border-t border-border">
            <label htmlFor="referralCode" className="block text-sm font-medium mb-2">
              Referral Code (Optional)
            </label>
            <Input
              id="referralCode"
              type="text"
              placeholder="Enter referral code (e.g., AWDVRVLML)"
              value={manualReferralCode}
              onChange={(e) => setManualReferralCode(e.target.value.toUpperCase().trim())}
              maxLength={WAITLIST_CONFIG.REFERRAL_CODE_LENGTH}
              className="font-mono uppercase"
              disabled={!!urlReferralCode}
            />
            {urlReferralCode && (
              <p className="text-xs text-muted-foreground mt-1">
                Referral code already applied from URL
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Skip {WAITLIST_CONFIG.REFERRAL_BONUS} positions when you verify your email!
            </p>
          </div>
        )}
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-2">
          Email Address *
        </label>
        <Input
          id="email"
          type="email"
          placeholder="your.email@example.com"
          {...register('email')}
          className={errors.email ? 'border-red-500' : ''}
        />
        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
      </div>

      <div>
        <label htmlFor="fullName" className="block text-sm font-medium mb-2">
          Full Name *
        </label>
        <Input
          id="fullName"
          type="text"
          placeholder="John Doe"
          {...register('fullName')}
          className={errors.fullName ? 'border-red-500' : ''}
        />
        {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName.message}</p>}
      </div>

      <div>
        <label htmlFor="thesisTopic" className="block text-sm font-medium mb-2">
          Thesis Topic *
        </label>
        <Textarea
          id="thesisTopic"
          placeholder="Brief description of your thesis topic (e.g., 'Machine learning for climate prediction')"
          {...register('thesisTopic')}
          className={errors.thesisTopic ? 'border-red-500' : ''}
          rows={3}
        />
        {errors.thesisTopic && (
          <p className="text-red-500 text-sm mt-1">{errors.thesisTopic.message}</p>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="language" className="block text-sm font-medium mb-2">
            Language *
          </label>
          <Select value={selectedLanguage} onValueChange={(value) => setValue('language', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {WAITLIST_CONFIG.LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label htmlFor="academicLevel" className="block text-sm font-medium mb-2">
            Academic Level *
          </label>
          <Select
            value={selectedLevel}
            onValueChange={(value) => setValue('academicLevel', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bachelor">Bachelor&apos;s</SelectItem>
              <SelectItem value="master">Master&apos;s</SelectItem>
              <SelectItem value="phd">PhD</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-center">
        <Turnstile
          sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
          onVerify={setTurnstileToken}
        />
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 p-4 rounded-lg">
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={isSubmitting || !turnstileToken}
        className="w-full bg-accent hover:bg-accent/90 text-white"
        size="lg"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {paymentMode === 'immediate' ? 'Processing Payment...' : 'Joining Waitlist...'}
          </>
        ) : paymentMode === 'immediate' ? (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Pay {WAITLIST_CONFIG.IMMEDIATE_PAYMENT_AMOUNT}€ & Get Thesis Now
          </>
        ) : (
          'Join Free Waitlist'
        )}
      </Button>

      {paymentMode === 'waitlist' && (
        <>
          <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 p-3 rounded-lg mb-2">
            <p className="text-xs text-blue-800 dark:text-blue-200 text-center">
              <strong>📧 Email Verification Required:</strong> After signing up, you'll receive a verification email. 
              You must click the verification link to secure your spot on the waitlist.
            </p>
          </div>
          <p className="text-xs text-center text-muted-foreground">
            By joining, you agree to receive email notifications about your thesis generation status.
          </p>
        </>
      )}

      {paymentMode === 'immediate' && (
        <div className="bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 p-3 rounded-lg mb-2">
          <p className="text-xs text-green-800 dark:text-green-200 text-center">
            <strong>⚡ Instant Processing:</strong> After payment, your thesis will be generated immediately. 
            You'll receive an email with download links within 30-60 minutes.
          </p>
        </div>
      )}
    </form>
  );
}
