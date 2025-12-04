// ABOUTME: Waitlist CTA - compelling design with value props
// ABOUTME: Gradient background, social proof, and benefits

import { Button } from "@/components/ui/button";
import { ArrowRight, FileText, CheckCircle, Download, Users } from "lucide-react";
import Link from "next/link";

const benefits = [
  { icon: FileText, text: "20,000+ words" },
  { icon: CheckCircle, text: "50+ verified citations" },
  { icon: Download, text: "PDF, Word, LaTeX" },
];

export const WaitlistCTASection = () => {
  return (
    <section className="py-24 sm:py-32">
      <div className="container">
        <div className="max-w-4xl mx-auto">
          {/* Card with gradient border */}
          <div className="relative rounded-2xl overflow-hidden">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-accent/10 to-transparent" />

            {/* Content */}
            <div className="relative bg-card/80 backdrop-blur-sm border border-accent/20 rounded-2xl p-8 md:p-12">
              <div className="text-center">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-sm text-accent mb-6">
                  <Users className="w-4 h-4" />
                  20 free generations daily
                </div>

                <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
                  Get your free thesis draft
                </h2>

                <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                  We sponsor the API costs. You get a complete, publication-ready thesis
                  with verified citations—absolutely free.
                </p>

                {/* Benefits row */}
                <div className="flex flex-wrap justify-center gap-6 mb-8">
                  {benefits.map((benefit) => (
                    <div key={benefit.text} className="flex items-center gap-2 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                        <benefit.icon className="w-4 h-4 text-accent" />
                      </div>
                      <span className="text-muted-foreground">{benefit.text}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <Button asChild size="lg" className="h-12 px-8 bg-accent hover:bg-accent/90">
                  <Link href="/waitlist">
                    Join Free Waitlist
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>

                <p className="text-xs text-muted-foreground mt-4">
                  No credit card required · Skip ahead by referring friends
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
