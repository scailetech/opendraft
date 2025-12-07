// ABOUTME: Sticky navbar for bulk.run landing page
// ABOUTME: Logo, nav links, and auth-aware CTA

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { createClient } from "@/lib/supabase/client";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#use-cases", label: "Use Cases" },
  { href: "#faq", label: "FAQ" },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClient();
        if (!supabase) return;
        const { data: { user } } = await supabase.auth.getUser();
        setIsSignedIn(!!user);
      } catch {
        // Ignore auth errors on landing page
      }
    }
    checkAuth();
  }, []);

  return (
    <header className="sticky top-4 z-50 mx-auto w-[95%] md:w-[90%] lg:w-[80%] max-w-6xl">
      <nav className="flex items-center justify-between rounded-lg border border-border bg-card/95 backdrop-blur-md px-4 py-2.5 shadow-sm">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="text-2xl">👟</span>
          <span>bulk</span>
          <span className="text-muted-foreground">.run</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          {isSignedIn ? (
            <Button asChild size="sm" className="bg-green-500 hover:bg-green-600">
              <Link href="/go">Dashboard 👟</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/auth">Sign In</Link>
              </Button>
              <Button asChild size="sm" className="bg-green-500 hover:bg-green-600">
                <Link href="/auth">Get Started 🏃</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile: Theme + Menu Toggle */}
        <div className="md:hidden flex items-center gap-2">
          <ThemeToggle />
          <button
            className="p-2"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden mt-2 rounded-lg border border-border bg-card/95 backdrop-blur-md p-4 shadow-sm">
          <div className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground py-2"
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <hr className="border-border/50 my-2" />
            {isSignedIn ? (
              <Button asChild className="w-full bg-green-500 hover:bg-green-600">
                <Link href="/go">Dashboard 👟</Link>
              </Button>
            ) : (
              <Button asChild className="w-full bg-green-500 hover:bg-green-600">
                <Link href="/auth">Get Started 🏃</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

