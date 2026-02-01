import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use standalone output for better compatibility with container-based hosting like Appwrite
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Appwrite-Project",
            value: "ascendancy", // Placeholder, but might help if it's expecting this header
          },
        ],
      },
    ];
  },
};

export default nextConfig;
