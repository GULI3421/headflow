import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: ["../.env.local", "../.env", ".env"] });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required.");
}

export const prisma = new PrismaClient();
