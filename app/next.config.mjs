import bundleAnalyzer from '@next/bundle-analyzer'

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Enable compression for responses
  compress: true,
  // Performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  experimental: {
    optimizeCss: true,
  },
  webpack: (config, { isServer }) => {
    // Fix for OpenTelemetry vendor chunks issue with Sentry
    // This prevents Next.js from trying to create separate vendor chunks
    // that can cause module resolution issues with OpenTelemetry
    if (isServer) {
      // Disable automatic vendor chunk splitting for server-side bundles
      // OpenTelemetry packages will be bundled directly instead
      // Only modify if config.optimization exists to avoid breaking anything
      if (config.optimization) {
        config.optimization = {
          ...config.optimization,
          splitChunks: false,
        }
      }
    }

    // Suppress webpack warnings for known Sentry/OpenTelemetry dynamic requires
    // These are safe runtime requires that webpack can't statically analyze
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      {
        module: /require-in-the-middle/,
        message: /Critical dependency: require function is used in a way in which dependencies cannot be statically extracted/,
      },
      {
        module: /@opentelemetry\/instrumentation/,
      },
    ]

    return config
  },
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
    },
  },
  // ESLint warnings converted to non-blocking (build can proceed)
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: false,
  },
  typescript: {
    // Only block build on TypeScript errors, not lint errors
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.posthog.com https://*.sentry.io https://accounts.google.com https://apis.google.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co https://thurgehvjgrdmrjayzczf.supabase.co https://*.posthog.com https://*.sentry.io https://*.vercel.app https://bulkgpt-fedeproject.vercel.app https://bulk-gpt.com https://www.bulk-gpt.com https://accounts.google.com https://*.googleapis.com wss://*.supabase.co",
              "frame-src 'self' https://accounts.google.com https://*.googleapis.com https://*.google.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

export default withBundleAnalyzer(nextConfig)
