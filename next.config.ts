import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/orbital-launcher",
  images: { unoptimized: true },
};

export default nextConfig;
