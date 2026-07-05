import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Configure basePath if hosting in a subfolder, e.g. basePath: '/dictionary'
};

export default nextConfig;
