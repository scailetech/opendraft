// ABOUTME: Footer section for bulk.run landing page
// ABOUTME: Logo, links, and copyright

import Link from "next/link";

export function FooterSection() {
  return (
    <footer className="border-t border-border/50 bg-secondary/30 py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <span className="text-2xl">👟</span>
            <span className="text-xl font-semibold">bulk</span>
            <span className="text-xl text-muted-foreground">.run</span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/auth" className="hover:text-foreground transition-colors">
              Sign In
            </Link>
            <Link href="#features" className="hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="#faq" className="hover:text-foreground transition-colors">
              FAQ
            </Link>
          </div>

          {/* Copyright */}
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} bulk.run. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}




