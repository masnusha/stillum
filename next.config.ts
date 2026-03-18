import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Files are uploaded directly to S3 via presigned URLs (browser → S3),
      // so server actions never receive file bytes. This limit covers any future
      // direct-upload routes and keeps Next.js from rejecting large metadata payloads.
      bodySizeLimit: "100mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        // Cloudflare R2 public bucket (avatars + covers)
        protocol: "https",
        hostname: "*.r2.dev",
      },
    ],
  },
};

export default nextConfig;
