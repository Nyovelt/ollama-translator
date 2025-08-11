/** @type {import('next').NextConfig} */
const nextConfig = {
  // App directory is now stable in Next.js 14
  output: 'standalone',
  
  // Optional: Configure for better Docker performance
  experimental: {
    outputFileTracingRoot: undefined,
  },
}

module.exports = nextConfig
