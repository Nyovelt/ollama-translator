/** @type {import('next').NextConfig} */
// The UI is built as a static export (out/) and served by the Express backend
// (server/index.js) inside the single Docker container.
const isStaticExport = process.env.NEXT_STATIC_EXPORT === 'true';
// Optional base path (e.g. when hosted under a sub-path behind a reverse proxy).
const basePath = process.env.NEXT_BASE_PATH || undefined;

const nextConfig = {
  output: isStaticExport ? 'export' : 'standalone',
  basePath,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  trailingSlash: Boolean(isStaticExport),
};

module.exports = nextConfig;
