import type { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let prisma: PrismaClient;

function getPrisma(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  if (prisma) return prisma;

  // Dynamic import at runtime only — never during build
  const { PrismaClient: PC } = require("@prisma/client");
  const client = new PC();
  prisma = client;
  globalForPrisma.prisma = client;
  return client;
}

export { getPrisma as prisma };

// Proxy that traps calls to prisma methods
const prismaProxy = new Proxy({} as unknown as PrismaClient, {
  get(_target, prop) {
    return (getPrisma() as any)[prop];
  },
});

export { prismaProxy as prisma };
export default prismaProxy;
