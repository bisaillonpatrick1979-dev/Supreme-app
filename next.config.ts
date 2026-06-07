import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: '*.googleapis.com',
      },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        '*.vercel.app',
        process.env.NEXT_PUBLIC_APP_URL ?? '',
      ].filter(Boolean),
    },
  },
  eslint: {
    // Run lint separately via CI
    ignoreDuringBuilds: false,
  },
}

export default nextConfig
