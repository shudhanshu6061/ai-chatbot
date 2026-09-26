import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "canvas"],
  experimental: {
    proxyClientMaxBodySize: "25mb",
  },
};

export default nextConfig;
