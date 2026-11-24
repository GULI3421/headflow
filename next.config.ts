import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Игнорировать ошибки TypeScript во время сборки на Vercel
    ignoreBuildErrors: true,
  },
  // ... другие ваши настройки, если они там были
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cloud.appwrite.io",
        pathname: "/v1/storage/buckets/**",
      },
    ],
  },
};

export default nextConfig;