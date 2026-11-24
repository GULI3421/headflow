import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAdminSession } from "@/src/lib/admin-api-auth";
import { prisma } from "@/src/lib/prisma";

class InvalidProductError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown) {
  if (typeof value === "string") {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
    : [];
}

function productData(value: unknown): Prisma.ProductUncheckedCreateInput {
  if (!isRecord(value)) throw new InvalidProductError("Product data must be an object.");

  const title = String(value.title_ru ?? value.title ?? "").trim();
  const price = Number(value.price);
  const category = String(value.category ?? "").trim();

  if (!title || !category || !Number.isFinite(price) || price < 0) {
    throw new InvalidProductError("Title, category, and a valid price are required.");
  }

  const data: Prisma.ProductUncheckedCreateInput = {
    title_ru: title,
    price,
    category,
    image_id: stringArray(value.image_id ?? value.images),
    power_options: stringArray(value.power_options),
    specs: typeof value.specs === "string" || Array.isArray(value.specs) ? value.specs as Prisma.InputJsonValue : "",
  };
  const stockValue = value.stockQuantity ?? value.stock;
  if (stockValue !== undefined) {
    const stock = Number(stockValue);
    if (!Number.isInteger(stock) || stock < 0) throw new InvalidProductError("Stock must be a non-negative whole number.");
    data.stockQuantity = stock;
    data.stock = stock;
  }
  const oldPriceValue = value.oldPrice ?? value.old_price;
  if (oldPriceValue === null || oldPriceValue === "") {
    data.oldPrice = null;
    data.old_price = null;
  } else if (oldPriceValue !== undefined) {
    const oldPrice = Number(oldPriceValue);
    if (!Number.isFinite(oldPrice) || oldPrice < 0) throw new InvalidProductError("Old price must be non-negative.");
    data.oldPrice = oldPrice;
    data.old_price = oldPrice;
  }
  if (Array.isArray(value.powerVariants)) {
    const variants = value.powerVariants.map((entry) => {
      if (!isRecord(entry)) throw new InvalidProductError("Invalid power variant.");
      const power = String(entry.power ?? "").trim();
      const price = Number(entry.price);
      const stockQuantity = Number(entry.stockQuantity);
      const oldPrice = entry.oldPrice == null || entry.oldPrice === "" ? null : Number(entry.oldPrice);
      if (!power || !Number.isFinite(price) || price < 0 || (oldPrice !== null && (!Number.isFinite(oldPrice) || oldPrice < 0)) || !Number.isInteger(stockQuantity) || stockQuantity < 0) {
        throw new InvalidProductError("Each power option needs a name, valid price, and whole non-negative stock.");
      }
      return { power, price, oldPrice, stockQuantity };
    });
    data.powerVariants = variants as Prisma.InputJsonValue;
  }
  if (value.stock !== undefined) {
    const stock = Number(value.stock);
    if (!Number.isInteger(stock) || stock < 0) throw new InvalidProductError("Stock must be a non-negative whole number.");
    data.stock = stock;
  }

  const optionalStrings = [
    "title_ky",
    "title_en",
    "description_ru",
    "description_ky",
    "description_en",
    "imageUrl",
    "subcategory",
    "description",
    "brand",
    "badgeKey",
    "energyClass",
    "pressure",
    "power",
  ] as const;
  for (const key of optionalStrings) {
    const field = value[key];
    if (typeof field === "string") data[key] = field;
  }
  for (const key of ["certificateUrl", "certificateFileName", "passportUrl", "passportFileName"] as const) {
    const field = value[key];
    if (field === null || field === "") {
      data[key] = null;
    } else if (typeof field === "string") {
      data[key] = field;
    } else if (field !== undefined) {
      throw new InvalidProductError(`${key} must be a string or null.`);
    }
  }

  const oldPrice = value.old_price;
  if (oldPrice === null || oldPrice === "") {
    data.old_price = null;
  } else if (oldPrice !== undefined) {
    const parsedPrice = Number(oldPrice);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      throw new InvalidProductError("Old price must be a valid non-negative number.");
    }
    data.old_price = parsedPrice;
  }

  return data;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const ids = params.get("ids")?.split(",").filter((id) => /^[\da-f]{24}$/i.test(id));
  const exclude = params.get("exclude");
  const where: Prisma.ProductWhereInput = {};

  if (ids) where.id = { in: ids };
  if (params.has("category")) where.category = params.get("category") ?? "";
  if (params.has("subcategory")) where.subcategory = params.get("subcategory") ?? "";
  if (exclude && /^[\da-f]{24}$/i.test(exclude)) where.id = { not: exclude };

  const search = params.get("search")?.trim();
  if (search) {
    where.OR = [
      { title_ru: { contains: search, mode: "insensitive" } },
      { title_ky: { contains: search, mode: "insensitive" } },
      { title_en: { contains: search, mode: "insensitive" } },
    ];
  }

  try {
    const requestedLimit = Number(params.get("limit") ?? (ids?.length || 100));
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 100;
    const [documents, total] = await Promise.all([
      prisma.product.findMany({ where, take: limit }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({ total, documents });
  } catch (error) {
    console.error("Failed to query MongoDB products", error);
    return NextResponse.json({ error: "Unable to load products." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const unauthorized = await requireAdminSession(request);
  if (unauthorized) return unauthorized;

  try {
    const product = await prisma.product.create({ data: productData(await request.json()) });
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    if (error instanceof InvalidProductError || error instanceof SyntaxError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientValidationError) {
      const unknownField = error.message.match(/Unknown argument [`'\"]([^`'\"]+)[`'\"]/i)?.[1];
      if (unknownField && new Set(["oldPrice", "stockQuantity", "powerVariants", "certificateUrl", "certificateFileName", "passportUrl", "passportFileName"]).has(unknownField)) {
        console.error("POST /api/products Prisma Client is stale for the current schema", { unknownField, message: error.message });
        return NextResponse.json({
          error: `Сервер использует устаревший Prisma Client (поле «${unknownField}»). Остановите dev-сервер, выполните npx prisma generate и запустите npm run dev заново.`,
          code: "STALE_PRISMA_CLIENT",
        }, { status: 503 });
      }
      console.error("POST /api/products Prisma validation error", error.message);
      return NextResponse.json({ error: "Prisma отклонила данные товара. Проверьте формат цены, остатка, вариантов и характеристик.", details: error.message.split("\n").slice(0, 4).join(" ").slice(0, 300) }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("POST /api/products Prisma request error", { code: error.code, message: error.message, meta: error.meta });
      return NextResponse.json({ error: `Не удалось создать товар в базе данных (код ${error.code}).`, code: error.code }, { status: 500 });
    }
    const message = error instanceof Error ? error.message : "Неизвестная ошибка.";
    console.error("POST /api/products failed", error);
    return NextResponse.json({ error: `Не удалось добавить товар: ${message.slice(0, 400)}`, code: "PRODUCT_CREATE_FAILED" }, { status: 500 });
  }
}
