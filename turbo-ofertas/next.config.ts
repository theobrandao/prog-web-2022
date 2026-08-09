import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "argon2", "sharp"],
  eslint: {
    // Lint runs separately in CI; do not block builds on lint.
    ignoreDuringBuilds: true,
  },
  // The existing src/core, src/services and src/lib modules import with explicit
  // ".js" extensions (TypeScript NodeNext style). Map those back to the real .ts
  // sources so webpack can resolve them.
  webpack(config) {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js", ".jsx"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
};

export default nextConfig;
