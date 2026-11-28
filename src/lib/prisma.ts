import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

const cachedPrisma = globalForPrisma.prisma;
const cachedClientIsCompatible = Boolean(cachedPrisma && typeof cachedPrisma.calculatorEstimate === "object");

if (cachedPrisma && !cachedClientIsCompatible) {
  console.warn("Discarding a cached Prisma Client without the calculatorEstimate delegate.");
}

export const prisma = cachedClientIsCompatible && cachedPrisma
  ? cachedPrisma
  : new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
