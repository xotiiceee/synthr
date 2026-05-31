import type { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let cachedPrisma: PrismaClient | undefined;

function getPrisma(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  if (cachedPrisma) return cachedPrisma;
  const { PrismaClient: PC } = require("@prisma/client") as { PrismaClient: typeof import("@prisma/client").PrismaClient };
  cachedPrisma = new PC();
  globalForPrisma.prisma = cachedPrisma;
  return cachedPrisma;
}

export const prisma = new Proxy({} as unknown as PrismaClient, {
  get(_target, prop: string | symbol) {
    const client = getPrisma();
    return (client as unknown as Record<string | symbol, unknown>)[prop];
  },
}) as PrismaClient;

export default prisma;
