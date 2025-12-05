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
  metadataBase: new URL('https://opendraft.xyz'),
  title: "OpenDraft - Free AI Thesis Writing Tool | 95%+ Citation Accuracy",
  description: "Free AI thesis writing tool with 19 specialized agents. Generate 20,000+ word theses with 50+ verified citations from 200M+ academic papers. Open source & MIT licensed.",
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
    "open source thesis tool",
    "opendraft",
    "AI thesis writer",
    "automated thesis generation"
  ],
  authors: [{ name: "Federico De Ponte" }],
  creator: "Federico De Ponte",
  publisher: "OpenDraft",
  alternates: {
    canonical: "https://opendraft.xyz",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://opendraft.xyz",
    siteName: "OpenDraft",
    title: "OpenDraft - Free AI Thesis Writing Tool | 95%+ Citation Accuracy",
    description: "Free open-source AI thesis writing tool. 19 AI agents, 200M+ papers, auto-verified citations. Generate publication-ready theses 10x faster.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "OpenDraft - AI Thesis Writing Tool",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "OpenDraft - Free AI Thesis Writing Tool",
    description: "Free open-source AI thesis writing tool. 19 AI agents, 200M+ papers, auto-citations. Write 10x faster.",
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
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'OpenDraft',
  },
  formatDetection: {
    telephone: false,
  },
  category: 'education',
  classification: 'Academic Writing Tool',
  other: {
    'mobile-web-app-capable': 'yes',
    'msapplication-TileColor': '#10b981',
    'msapplication-config': '/browserconfig.xml',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Structured data for SEO (Schema.org JSON-LD)
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "OpenDraft",
      "applicationCategory": "EducationalApplication",
      "applicationSubCategory": "Academic Writing Tool",
      "url": "https://opendraft.xyz",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock"
      },
      "description": "Free open-source AI thesis writing tool with 19 specialized agents. Generate 20,000+ word theses with 50+ verified citations from 200M+ academic papers.",
      "operatingSystem": "Web Browser",
      "softwareVersion": "1.0",
      "author": {
        "@type": "Person",
        "name": "Federico De Ponte"
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.8",
        "ratingCount": "127",
        "bestRating": "5"
      },
      "featureList": [
        "19 specialized AI agents",
        "200M+ research papers integration",
        "95%+ citation accuracy",
        "Auto citation verification via CrossRef & arXiv",
        "PDF/Word/LaTeX export",
        "Multi-LLM support (Claude, GPT-4, Gemini)",
        "Open source MIT licensed",
        "20,000+ word thesis generation"
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "OpenDraft",
      "url": "https://opendraft.xyz",
      "logo": "https://opendraft.xyz/icon",
      "sameAs": [
        "https://github.com/federicodeponte/opendraft"
      ],
      "contactPoint": {
        "@type": "ContactPoint",
        "email": "support@opendraft.xyz",
        "contactType": "customer support"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "OpenDraft",
      "url": "https://opendraft.xyz",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://opendraft.xyz/blog?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Is OpenDraft free to use?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, OpenDraft is completely free and open source under the MIT license. We sponsor the API costs for thesis generation."
          }
        },
        {
          "@type": "Question",
          "name": "How long does it take to generate a thesis?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "OpenDraft generates a complete 20,000+ word thesis in 15-25 minutes, including research, writing, and citation verification."
          }
        },
        {
          "@type": "Question",
          "name": "Are the citations real and verified?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, all citations are verified against CrossRef and arXiv databases with 95%+ accuracy. Each source includes DOI links for verification."
          }
        }
      ]
    }
  ];

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
          defaultTheme="dark"
          enableSystem={false}
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
