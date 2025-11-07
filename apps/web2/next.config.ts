import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow larger request bodies for Server Actions (up to 20MB)
  // Note: For API routes, we stream the body directly to bypass size limits
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
