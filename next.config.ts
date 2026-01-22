// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   images: {
//     remotePatterns: [
//       {
//         protocol: 'https',
//         hostname: 'flexibiz.sfo3.cdn.digitaloceanspaces.com',
//         port: '',
//         pathname: '/**',
//       },
//     ],
//   },
// };

// export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "flexibiz.sfo3.cdn.digitaloceanspaces.com",
        port: "",
        pathname: "/**",
      },
    ],
  },

  experimental: {
    // @ts-expect-error – supported by Next.js runtime but missing in types
    outputFileTracingIncludes: {
      "/*": ["lib/generated/prisma/**/*"],
    },
  },
};

export default nextConfig;


