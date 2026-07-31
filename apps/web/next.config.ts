import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@crafthub/ui', '@crafthub/shared'],
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
