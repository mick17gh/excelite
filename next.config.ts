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

  outputFileTracingIncludes: {
    "/*": ["node_modules/.prisma/client/**/*"],
  },
};

export default nextConfig;


