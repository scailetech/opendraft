// ABOUTME: CTA section - final push to get users to sign up
// ABOUTME: Prominent call to action before footer

import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function CTASection() {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl rounded-lg bg-card border border-border p-10 text-center">
          <div className="mb-4 text-4xl">👟</div>
          <h2 className="mb-4 text-2xl font-bold md:text-3xl">
            Ready to run AI at scale?
          </h2>
          <p className="mb-6 text-muted-foreground">
            Start processing your first batch in under 2 minutes. No credit card required.
          </p>
          <Button
            asChild
            size="lg"
            className="group bg-green-500 hover:bg-green-600"
          >
            <Link href="/auth">
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

