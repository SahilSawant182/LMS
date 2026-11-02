import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '/lms',
  assetPrefix: process.env.NODE_ENV === 'production' ? 'https://lms.stridenex.ai' : undefined,
  allowedDevOrigins: ['192.168.31.30', '192.168.1.20', 'localhost', '*.loca.lt'],
  async redirects() {
    return [
      {
        source: '/',
        destination: '/lms',
        basePath: false,
        permanent: false,
      },
      {
        source: '/dashboard',
        destination: '/lms/dashboard',
        basePath: false,
        permanent: false,
      },
      {
        source: '/login',
        destination: '/lms/login',
        basePath: false,
        permanent: false,
      },
      {
        source: '/courses',
        destination: '/lms/courses',
        basePath: false,
        permanent: false,
      },
      {
        source: '/batches',
        destination: '/lms/batches',
        basePath: false,
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://devlms.stridenex.ai/api/:path*',
        basePath: false,
      },
      {
        source: '/api/:path*',
        destination: 'https://devlms.stridenex.ai/api/:path*',
      },
      {
        source: '/courses/:slug',
        destination: '/course/:slug',
      },
      {
        source: '/batch',
        destination: '/batches',
      },
      {
        source: '/batches/:slug',
        destination: '/batch/:slug',
      },
    ];
  },
};

export default nextConfig;
