import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Tree-shake ai SDK to prevent Zod v4 Set objects in unused schema exports from breaking RSC serialization
    optimizePackageImports: ["ai", "@ai-sdk/react"],
  },
};

export default nextConfig;
