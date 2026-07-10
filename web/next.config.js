/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 'standalone' is only needed for the Docker image. On Vercel, leaving it unset
  // uses Vercel's own optimized build. Toggle via DOCKER_BUILD=1 in the Dockerfile.
  ...(process.env.DOCKER_BUILD ? { output: 'standalone' } : {}),
};

module.exports = nextConfig;
