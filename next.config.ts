import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ['192.168.1.20', 'localhost'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://devlms.stridenex.ai/api/:path*',
      },
    ];
  },
};

export default nextConfig;
