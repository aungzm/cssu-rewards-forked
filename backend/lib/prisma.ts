import { PrismaClient } from "@prisma/client";

// A single client for the whole process. Previously each controller created
// its own instance, which meant several independent connection pools.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
