// ABOUTME: Root layout for OpenDraft landing page
// ABOUTME: Configures metadata, fonts, theme provider, and persistent navbar

import type { Metadata } from "next";
import { Inter, Sora, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/layout/navbar";
import { ThemeProvider } from "@/components/layout/theme-provider";

// Display font for headings (geometric, modern)
const sora = Sora({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

// Body font (professional sans-serif)
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

// Monospace for code/tech elements
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL('https://opendraft-landing.vercel.app'),
  title: "OpenDraft - Free AI Thesis Writing Tool | Generate Drafts in Minutes",
  description: "Free AI thesis writing tool with 19 specialized agents. Generate 20k-word thesis drafts in 20-30 minutes with access to 200M+ research papers. Open source & MIT licensed.",
  keywords: [
    "thesis writing AI",
    "academic thesis generator",
    "AI thesis assistant",
    "research paper AI tool",
    "free thesis writing software",
    "dissertation AI tool",
    "AI citation generator",
    "academic writing AI",
    "thesis generator free",
    "AI research assistant",
    "master's thesis AI",
    "PhD dissertation tool",
    "literature review AI",
    "academic AI agents",
    "open source thesis tool"
  ],
  authors: [{ name: "Federico De Ponte" }],
  creator: "Federico De Ponte",
  publisher: "OpenDraft",
  alternates: {
    canonical: "https://opendraft-landing.vercel.app",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://opendraft-landing.vercel.app",
    siteName: "OpenDraft",
    title: "OpenDraft - Free AI Thesis Writing Tool",
    description: "Free open-source AI tool with 19 specialized agents. Generate 20k-word thesis drafts in 20-30 minutes with access to 200M+ research papers.",
  },
  twitter: {
    card: "summary_large_image",
    title: "OpenDraft - Free AI Thesis Writing Tool",
    description: "Free open-source AI thesis writing tool. 19 AI agents, 200M+ papers, database-validated citations. Generate drafts in minutes.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Structured data for SEO (Schema.org JSON-LD)
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "OpenDraft",
    "applicationCategory": "EducationalApplication",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "description": "Free open-source AI thesis writing tool with 19 specialized agents for academic writing",
    "operatingSystem": "Web Browser",
    "softwareVersion": "1.0",
    "author": {
      "@type": "Person",
      "name": "Federico De Ponte"
    },
    "featureList": [
      "19 specialized AI agents",
      "200M+ research papers integration",
      "Auto citation verification",
      "PDF/Word/LaTeX export",
      "Multi-LLM support (Claude, GPT-4, Gemini)",
      "Open source MIT licensed"
    ]
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className={cn(
        "min-h-screen bg-background",
        sora.variable,
        inter.variable,
        mono.variable
      )}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <a href="#main-content" className="skip-to-content">
            Skip to main content
          </a>

          <Navbar />

          <main id="main-content">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
