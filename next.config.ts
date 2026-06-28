import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/graphql",
        destination: "http://127.0.0.1:3000/graphql",
      },
    ];
  },
};

export default nextConfig;
