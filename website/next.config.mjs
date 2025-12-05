/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output for Render deployment (smaller, faster builds)
  output: 'standalone',
  
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "github.com",
      },
      {
        protocol: "https",
        hostname: "img.shields.io",
      },
    ],
  },
};

export default nextConfig;
