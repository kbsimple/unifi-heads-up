import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // allowedDevOrigins applies only in `next dev` — ignored in production.
  allowedDevOrigins: ['localhost', '127.0.0.1', '192.168.0.64'],
  experimental: {
    serverActions: {
      // Required in production for Server Actions called from non-localhost origins.
      // allowedDevOrigins has no effect in production (Docker/standalone).
      allowedOrigins: [
        'localhost:3000',
        '127.0.0.1:3000',
        '192.168.0.64:3000',
        '192.168.0.105:3000',
        '100.108.220.113:3000',
      ],
    },
  },
};

export default nextConfig;
