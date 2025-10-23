/** @type {import('next').NextConfig} */
const isStaticExport = process.env.NEXT_STATIC_EXPORT === 'true';
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1];
const basePathEnv = process.env.NEXT_BASE_PATH || process.env.NEXT_PUBLIC_BASE_PATH;
const basePath =
  basePathEnv !== undefined
    ? basePathEnv || undefined
    : isStaticExport && repoName
      ? `/${repoName}`
      : undefined;

const nextConfig = {
  // Use static output when building for GitHub Pages, otherwise keep server output
  output: isStaticExport ? 'export' : 'standalone',
  basePath,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  trailingSlash: Boolean(isStaticExport),
  // Optional: Configure for better Docker performance
  experimental: {
    outputFileTracingRoot: undefined,
  },
}

module.exports = nextConfig
