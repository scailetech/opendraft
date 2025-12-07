import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import { Providers } from './providers'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: {
    default: 'AEO Visibility Machine — AI-Powered Answer Engine Optimization',
    template: '%s | AEO Visibility Machine',
  },
  description: 'Optimize your brand for AI search engines. Generate strategic keywords, create AEO-optimized content, and boost visibility in ChatGPT, Perplexity, Claude, and Gemini.',
  keywords: ['AEO', 'Answer Engine Optimization', 'AI visibility', 'AI search', 'ChatGPT SEO', 'Perplexity optimization', 'AI content strategy', 'keyword research'],
  authors: [{ name: 'SCAILE' }],
  creator: 'SCAILE',
  publisher: 'SCAILE',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://aeo.scaile.tech'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'AEO Visibility Machine',
    title: 'AEO Visibility Machine — AI-Powered Answer Engine Optimization',
    description: 'Optimize your brand for AI search engines. Generate strategic keywords and AEO-optimized content for maximum AI visibility.',
    images: [
      {
        url: '/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'AEO Visibility Machine — Answer Engine Optimization Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AEO Visibility Machine — AI-Powered Answer Engine Optimization',
    description: 'Optimize your brand for AI search engines. Generate keywords and AEO content for ChatGPT, Perplexity, Claude, and more.',
    images: ['/og-image.svg'],
    creator: '@scailetech',
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
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [
      { url: '/apple-icon.svg', sizes: '180x180', type: 'image/svg+xml' },
    ],
  },
      manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`} suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
        <Toaster
          position="top-center"
          closeButton
          duration={4000}
          visibleToasts={3}
          gap={8}
          toastOptions={{
            className: [
              'border border-border/50 bg-card/95 backdrop-blur-md text-foreground',
              'shadow-lg shadow-black/5 dark:shadow-black/20',
              'rounded-xl px-4 py-3',
              'animate-in fade-in-0 slide-in-from-top-4 zoom-in-95 duration-300',
            ].join(' '),
            style: {
              '--toast-close-button-start': '0.75rem',
            } as React.CSSProperties,
          }}
        />
        {/* Live region for screen reader announcements */}
        <div
          id="live-region"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        />
        <div
          id="live-region-assertive"
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          className="sr-only"
        />
      </body>
    </html>
  )
}

