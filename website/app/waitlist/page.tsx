import { Suspense } from 'react';
import { WaitlistForm } from '@/components/waitlist/WaitlistForm';
import { WaitlistStats } from '@/components/waitlist/WaitlistStats';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Join Waitlist - Free AI Thesis Generation | OpenDraft',
  description: '100 free AI-generated theses per day. Join the waitlist and skip ahead by referring friends. Generate your 20,000-word thesis in 20-30 minutes.',
};

interface PageProps {
  searchParams: { ref?: string };
}

export default function WaitlistPage({ searchParams }: PageProps) {
  const referralCode = searchParams.ref;

  return (
    <section className="container py-24 sm:py-32">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Join the Free Thesis Waitlist
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Get a <strong>free AI-generated thesis</strong> (20,000+ words). We sponsor{' '}
            <strong>100 thesis generations per day</strong>.
          </p>
        </div>

        {/* Live Stats */}
        <div className="mb-12">
          <Suspense fallback={<div className="h-32 animate-pulse bg-muted rounded-lg" />}>
            <WaitlistStats />
          </Suspense>
        </div>

        {/* Signup Form */}
        <div className="mb-12">
          <WaitlistForm referralCode={referralCode} />
        </div>

        {/* How It Works */}
        <div className="bg-muted/50 p-8 rounded-xl">
          <h2 className="text-2xl font-bold mb-6 text-center">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="bg-border dark:bg-border w-12 h-12 rounded-full flex items-center justify-center mb-3">
                <span className="text-2xl font-bold text-primary dark:text-border">
                  1
                </span>
              </div>
              <h3 className="font-semibold mb-2">Sign Up & Verify</h3>
              <p className="text-sm text-muted-foreground">
                Join the waitlist and verify your email. You&apos;ll get a unique referral code.
              </p>
            </div>

            <div>
              <div className="bg-border dark:bg-border w-12 h-12 rounded-full flex items-center justify-center mb-3">
                <span className="text-2xl font-bold text-primary dark:text-border">
                  2
                </span>
              </div>
              <h3 className="font-semibold mb-2">Skip Ahead (Optional)</h3>
              <p className="text-sm text-muted-foreground">
                Share with 3 friends to skip 100 positions. Unlimited referrals!
              </p>
            </div>

            <div>
              <div className="bg-border dark:bg-border w-12 h-12 rounded-full flex items-center justify-center mb-3">
                <span className="text-2xl font-bold text-primary dark:text-border">
                  3
                </span>
              </div>
              <h3 className="font-semibold mb-2">Get Your Thesis</h3>
              <p className="text-sm text-muted-foreground">
                When your position is reached, we generate your thesis and email you the download links.
              </p>
            </div>
          </div>
        </div>

        {/* Academic Honesty Alert */}
        <div className="mt-8 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Academic Honesty:</strong> Check your institution&apos;s AI usage policy before using this tool. Learn more in our{' '}
                <Link href="/#faq" className="underline hover:text-yellow-600">
                  FAQ
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
