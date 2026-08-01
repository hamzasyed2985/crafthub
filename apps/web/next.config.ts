import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@crafthub/ui', '@crafthub/shared'],
};

export default nextConfig;
