import "dotenv/config";
import cors from "cors";
import express from "express";
import { LeadType } from "@prisma/client";
import { prisma } from "./prisma";

const app = express();
const port = Number(process.env.PORT ?? 5000);
const clientOrigin = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";
const supportedLanguages = new Set(["ru", "ky", "en"]);

app.use(
  cors({
    origin: clientOrigin,
  }),
);
app.use(express.json());

function normalizeKgPhone(value: string) {
  const compact = value.replace(/[\s()\-]/g, "");

  if (/^\+996\d{9}$/.test(compact)) return compact;
  if (/^996\d{9}$/.test(compact)) return `+${compact}`;
  if (/^0\d{9}$/.test(compact)) return `+996${compact.slice(1)}`;

  return null;
}

function localizedText(lang: string, values: { ru: string; ky: string; en: string }) {
  if (lang === "ky") return values.ky;
  if (lang === "en") return values.en;

  return values.ru;
}

app.get("/api/health", (_request, response) => {
  response.json({ ok: true });
});

app.get("/api/products", async (request, response) => {
  const requestedLanguage = String(request.query.lang ?? "ru");
  const lang = supportedLanguages.has(requestedLanguage) ? requestedLanguage : "ru";
  const products = await prisma.product.findMany({
    include: {
      category: true,
    },
    orderBy: {
      title_ru: "asc",
    },
  });

  return response.json({
    success: true,
    products: products.map((product) => ({
      id: product.id,
      i18nKey: product.i18nKey,
      nameKey: `products.items.${product.i18nKey}.name`,
      descriptionKey: `products.items.${product.i18nKey}.description`,
      name: localizedText(lang, { ru: product.title_ru, ky: product.title_ky, en: product.title_en }),
      title: localizedText(lang, { ru: product.title_ru, ky: product.title_ky, en: product.title_en }),
      brand: product.brand,
      categorySlug: product.category.slug,
      price: product.price,
      image: product.imageUrl,
      imageUrl: product.imageUrl,
      badgeKey: product.badgeKey,
      badge: `products.badges.${product.badgeKey}`,
      energyClass: product.energyClass,
      pressure: product.pressure,
      power: product.power,
      stock: product.stock,
      description: localizedText(lang, {
        ru: product.description_ru,
        ky: product.description_ky,
        en: product.description_en,
      }),
      category: {
        id: product.category.id,
        slug: product.category.slug,
        i18nKey: product.category.i18nKey,
        nameKey: `heatingCategories.items.${product.category.i18nKey}.title`,
        name: localizedText(lang, {
          ru: product.category.name_ru,
          ky: product.category.name_ky,
          en: product.category.name_en,
        }),
      },
    })),
  });
});

app.post("/api/leads", async (request, response) => {
  const name = String(request.body.name ?? request.body.customer_name ?? "").trim();
  const phone = String(request.body.phone ?? "").trim();
  const message = String(request.body.message ?? request.body.projectDetails ?? "").trim();
  const type =
    request.body.type === "CALCULATOR" || request.body.type === "calculator" ? LeadType.CALCULATOR : LeadType.CALLBACK;
  const normalizedPhone = normalizeKgPhone(phone);

  if (!name) {
    return response.status(400).json({ success: false, message: "Name is required." });
  }

  if (!normalizedPhone) {
    return response.status(400).json({
      success: false,
      message: "Phone number must be a valid KG format, for example +996700123456.",
    });
  }

  const lead = await prisma.lead.create({
    data: {
      name,
      phone: normalizedPhone,
      message: message || null,
      type,
    },
  });

  return response.status(201).json({
    success: true,
    message: "Thank you! We will contact you shortly.",
    leadId: lead.id,
  });
});

app.listen(port, () => {
});
