import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";
import { execSync } from "node:child_process";

function getRevision(): string {
  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    return process.env.VERCEL_GIT_COMMIT_SHA;
  }
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
  } catch {
    return `build-${Date.now()}`;
  }
}

const revision = getRevision();

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  additionalPrecacheEntries: [
    { url: "/offline", revision },
    { url: "/pos", revision },
  ],
});

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "flexibiz.sfo3.cdn.digitaloceanspaces.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.digitaloceanspaces.com",
      },
      {
        protocol: "https",
        hostname: "*.cdn.digitaloceanspaces.com",
      },
    ],
  },

  outputFileTracingIncludes: {
    "/*": ["node_modules/.prisma/client/**/*"],
  },
};

export default withSerwist(nextConfig);
