import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg(databaseUrl),
});

const categories = [
  {
    name_ru: "Котлы",
    name_ky: "Казандыктар",
    slug: "boilers",
  },
  {
    name_ru: "Радиаторы",
    name_ky: "Радиаторлор",
    slug: "radiators",
  },
  {
    name_ru: "Теплый пол",
    name_ky: "Жылуу пол",
    slug: "underfloor-heating",
  },
];

async function main() {
  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name_ru: category.name_ru,
        name_ky: category.name_ky,
      },
      create: category,
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
