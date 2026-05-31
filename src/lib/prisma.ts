import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let prismaInstance: PrismaClient | undefined;

function getPrisma(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  if (prismaInstance) return prismaInstance;

  try {
    const { PrismaPg } = require("@prisma/adapter-pg");
    const { Pool } = require("pg");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL || "" });
    const adapter = new PrismaPg(pool);
    const client = new PrismaClient({ adapter });
    globalForPrisma.prisma = client;
    return client;
  } catch {
    const client = new PrismaClient();
    globalForPrisma.prisma = client;
    return client;
  }
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_, prop: string | symbol) {
    const client = getPrisma();
    return (client as any)[prop];
  },
});
