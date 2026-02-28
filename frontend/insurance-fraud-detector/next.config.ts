import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Limit worker count to reduce RAM usage
  experimental: {
    workerThreads: false,
    cpus: 2,
  },
};

export default nextConfig;
