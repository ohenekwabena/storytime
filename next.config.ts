import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable component caching for database-driven app
  cacheComponents: false,
};

export default nextConfig;
