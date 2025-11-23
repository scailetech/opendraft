import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Gift, Sparkles, Users } from 'lucide-react';

export const WaitlistCTASection = () => {
  return (
    <section className="container py-24 sm:py-32">
      <div className="mx-auto max-w-5xl">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-border p-8 md:p-12">
          {/* Background decorative elements */}
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-border/20 blur-3xl" />
          <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />

          <div className="relative z-10">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-4">
                <Gift className="h-4 w-4 text-white" />
                <span className="text-sm font-medium text-white">Limited Offer</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Get a Free AI-Generated Thesis
              </h2>
              <p className="text-lg text-border max-w-2xl mx-auto">
                We&apos;re sponsoring <strong className="text-white">100 free thesis generations per day</strong>.
                Join the waitlist and skip ahead by referring friends!
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <Sparkles className="h-8 w-8 text-border mb-3" />
                <h3 className="font-semibold text-white mb-2">20,000+ Words</h3>
                <p className="text-sm text-border">
                  Complete thesis with proper citations, formatted and ready to download
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <Users className="h-8 w-8 text-border mb-3" />
                <h3 className="font-semibold text-white mb-2">Viral Referrals</h3>
                <p className="text-sm text-border">
                  Share with 3 friends to skip 100 positions. Unlimited referrals!
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <Gift className="h-8 w-8 text-border mb-3" />
                <h3 className="font-semibold text-white mb-2">100% Free</h3>
                <p className="text-sm text-border">
                  No credit card required. Get both PDF and Word formats
                </p>
              </div>
            </div>

            {/* CTA Button */}
            <div className="text-center">
              <Link href="/waitlist">
                <Button
                  size="lg"
                  className="bg-white text-primary hover:bg-border font-bold px-8 py-6 text-lg shadow-2xl"
                >
                  Join Free Waitlist →
                </Button>
              </Link>
              <p className="mt-4 text-sm text-border">
                🎓 Designed for bachelor&apos;s, master&apos;s, and PhD students
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
