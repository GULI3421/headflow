import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

config({ path: ["../.env.local", "../.env", ".env"] });

export default defineConfig({
  engine: "classic",
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "ts-node prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
