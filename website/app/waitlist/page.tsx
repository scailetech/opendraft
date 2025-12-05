import { Suspense } from 'react';
import { WaitlistForm } from '@/components/waitlist/WaitlistForm';
import { WaitlistStats } from '@/components/waitlist/WaitlistStats';
import { AlertTriangle, FileText, CheckCircle, Download, DollarSign, Clock } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Join Waitlist - Free AI Thesis Generation | OpenDraft',
  description: '20 free AI-generated theses per day. Join the waitlist and skip ahead by referring friends. Generate your 20,000-word thesis in 15-25 minutes.',
};

interface PageProps {
  searchParams: { ref?: string };
}

const benefits = [
  {
    icon: FileText,
    title: '20,000+ Words',
    description: 'Full-length master\'s thesis or PhD dissertation',
  },
  {
    icon: CheckCircle,
    title: '50+ Verified Citations',
    description: 'Auto-verified via CrossRef & arXiv',
  },
  {
    icon: Download,
    title: 'PDF, Word, LaTeX',
    description: 'Publication-ready export formats',
  },
  {
    icon: DollarSign,
    title: '$0 Cost',
    description: 'We sponsor the API costs for you',
  },
];

export default function WaitlistPage({ searchParams }: PageProps) {
  const referralCode = searchParams.ref;

  return (
    <section className="container py-16 sm:py-24">
      <div className="max-w-6xl mx-auto">
        {/* Hero Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-sm text-accent mb-6">
            <Clock className="w-4 h-4" />
            20 free generations daily
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Get Your Free Thesis
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Join the waitlist for a <strong>free AI-generated thesis</strong>.
            20,000+ words, 50+ citations, publication-ready.
          </p>
        </div>

        {/* 2-Column: Form + Benefits */}
        <div className="grid lg:grid-cols-5 gap-8 mb-12">
          {/* Form - Primary */}
          <div className="lg:col-span-3">
            <div className="bg-card border border-border rounded-xl p-6 sm:p-8">
              <WaitlistForm referralCode={referralCode} />
            </div>
          </div>

          {/* Benefits - Secondary */}
          <div className="lg:col-span-2">
            <div className="bg-accent/5 border border-accent/10 rounded-xl p-6 sm:p-8 h-full">
              <h2 className="text-lg font-semibold mb-6">What You Get</h2>
              <div className="space-y-5">
                {benefits.map((benefit) => (
                  <div key={benefit.title} className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                      <benefit.icon className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">{benefit.title}</h3>
                      <p className="text-sm text-muted-foreground">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Trust indicator */}
              <div className="mt-8 pt-6 border-t border-accent/10">
                <p className="text-xs text-muted-foreground">
                  95%+ citation accuracy. All sources verified against academic databases.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Live Stats - Subtle */}
        <div className="mb-12">
          <Suspense fallback={<div className="h-12 animate-pulse bg-muted rounded-lg" />}>
            <WaitlistStats />
          </Suspense>
        </div>

        {/* How It Works - Horizontal */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-center mb-8">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-card border border-border mb-4">
                <span className="font-mono text-sm font-medium">1</span>
              </div>
              <h3 className="font-medium mb-1">Sign Up & Verify</h3>
              <p className="text-sm text-muted-foreground">
                Enter your details and verify your email
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-card border border-border mb-4">
                <span className="font-mono text-sm font-medium">2</span>
              </div>
              <h3 className="font-medium mb-1">Wait or Skip Ahead</h3>
              <p className="text-sm text-muted-foreground">
                Each referral = 20 positions skipped
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-card border border-border mb-4">
                <span className="font-mono text-sm font-medium">3</span>
              </div>
              <h3 className="font-medium mb-1">Get Your Thesis</h3>
              <p className="text-sm text-muted-foreground">
                Download PDF, Word, and LaTeX files
              </p>
            </div>
          </div>
        </div>

        {/* Academic Honesty */}
        <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/50 p-4 rounded-lg">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Academic Honesty:</strong> Check your institution&apos;s AI usage policy before using this tool.{' '}
                <Link href="/#faq" className="underline hover:text-amber-600">
                  Learn more
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
