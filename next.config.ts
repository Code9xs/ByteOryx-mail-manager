import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb"
    }
  },
  webpack(config) {
    config.watchOptions = {
      ...(config.watchOptions ?? {}),
      ignored: /[\\/](node_modules|\.next|System Volume Information)(?:[\\/]|$)/
    };
    return config;
  }
};

export default nextConfig;
