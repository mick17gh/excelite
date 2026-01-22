import { PrismaClient } from "./generated/prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

export const db = globalThis.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = db;
}


// export const db = globalThis.prisma ?? new PrismaClient({
//   datasources: {
//     db: {
//       url: process.env.DATABASE_URL,
//     },
//   },
//   log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
//   // Add connection pool configuration
//   __internal: {
//     engine: {
//       connectionTimeout: 20000, // 20 seconds
//       maxWait: 20000, // 20 seconds
//       pool_timeout: 20000, // 20 seconds
//     },
//   },
// });

// if (process.env.NODE_ENV !== 'production') {
//   globalThis.prisma = db;
// }
