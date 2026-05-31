import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ["pg", "@prisma/adapter-pg", "@prisma/client", "prisma"],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
