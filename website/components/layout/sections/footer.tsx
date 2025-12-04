// ABOUTME: Footer section - modern clean layout
// ABOUTME: Organized links, social icons, and MIT license

import { GraduationCap, Github, Linkedin, Mail } from "lucide-react";
import Link from "next/link";

const footerLinks = {
  product: [
    { label: "Features", href: "/#features" },
    { label: "AI Agents", href: "/#agents" },
    { label: "Pricing", href: "/#comparison" },
    { label: "Examples", href: "/#examples" },
  ],
  resources: [
    { label: "Documentation", href: "https://github.com/federicodeponte/opendraft/blob/master/00_START_HERE.md" },
    { label: "Quick Start", href: "https://github.com/federicodeponte/opendraft#-quick-start-10-minutes" },
    { label: "FAQ", href: "/#faq" },
    { label: "Blog", href: "/blog" },
  ],
  community: [
    { label: "GitHub", href: "https://github.com/federicodeponte/opendraft" },
    { label: "Discussions", href: "https://github.com/federicodeponte/opendraft/discussions" },
    { label: "Issues", href: "https://github.com/federicodeponte/opendraft/issues" },
    { label: "Contributing", href: "https://github.com/federicodeponte/opendraft/blob/master/CONTRIBUTING.md" },
  ],
};

const socialLinks = [
  { icon: Github, href: "https://github.com/federicodeponte/opendraft", label: "GitHub" },
  { icon: Linkedin, href: "https://linkedin.com/in/federicodeponte", label: "LinkedIn" },
];

export const FooterSection = () => {
  return (
    <footer className="border-t border-border/50 bg-muted/30">
      <div className="container py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-emerald-400 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-xl">OpenDraft</span>
            </Link>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
              Free, open-source AI thesis writing framework. 19 specialized agents, 200M+ papers, publication-ready exports.
            </p>
            {/* Social links */}
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <Link
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  className="w-9 h-9 rounded-lg bg-card border border-border flex items-center justify-center hover:border-accent/50 hover:text-accent transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="w-4 h-4" />
                </Link>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-medium mb-4">Product</h4>
            <ul className="space-y-2">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-medium mb-4">Resources</h4>
            <ul className="space-y-2">
              {footerLinks.resources.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    target={link.href.startsWith("http") ? "_blank" : undefined}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Community */}
          <div>
            <h4 className="font-medium mb-4">Community</h4>
            <ul className="space-y-2">
              {footerLinks.community.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    target="_blank"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-border/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © 2025 OpenDraft · MIT License · Free Forever
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/#faq" className="hover:text-foreground transition-colors">
              FAQ
            </Link>
            <Link
              href="https://github.com/federicodeponte/opendraft/blob/master/LICENSE"
              target="_blank"
              className="hover:text-foreground transition-colors"
            >
              License
            </Link>
            <Link
              href="https://github.com/federicodeponte/opendraft"
              target="_blank"
              className="flex items-center gap-1 hover:text-accent transition-colors"
            >
              <Github className="w-4 h-4" />
              Star on GitHub
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
