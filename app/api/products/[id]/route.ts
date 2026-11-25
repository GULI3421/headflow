import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAdminSession } from "@/src/lib/admin-api-auth";
import { prisma } from "@/src/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

function validId(id: string) {
  return /^[\da-f]{24}$/i.test(id);
}

function safeImageUrl(imageUrl: string | null) {
  return imageUrl && imageUrl.length <= 2048 && !/^data:/i.test(imageUrl) ? imageUrl : null;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!validId(id)) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  try {
    const product = await prisma.product.findUnique({ where: { id } });
    return product
      ? NextResponse.json({ ...product, imageUrl: safeImageUrl(product.imageUrl) })
      : NextResponse.json({ error: "Product not found." }, { status: 404 });
  } catch (error) {
    console.error("Failed to read MongoDB product", error);
    return NextResponse.json({ error: "Unable to load product." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const unauthorized = await requireAdminSession(request);
  if (unauthorized) return unauthorized;

  const { id } = await params;
  if (!validId(id)) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  try {
    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return NextResponse.json({ error: "Product data must be an object." }, { status: 400 });
    }
    const data = body as Record<string, unknown>;
    const fields: Prisma.ProductUncheckedUpdateInput = {};

    if ("title_ru" in data || "title" in data) {
      const title = String(data.title_ru ?? data.title ?? "").trim();
      if (!title) return NextResponse.json({ error: "Title is required." }, { status: 400 });
      fields.title_ru = title;
    }
    if ("price" in data) {
      const price = Number(data.price);
      if (!Number.isFinite(price) || price < 0) {
        return NextResponse.json({ error: "Price must be a valid non-negative number." }, { status: 400 });
      }
      fields.price = price;
    }
    if ("stock" in data) {
      const stock = Number(data.stock);
      if (!Number.isInteger(stock) || stock < 0) {
        return NextResponse.json({ error: "Stock must be a non-negative whole number." }, { status: 400 });
      }
      fields.stock = stock;
      fields.stockQuantity = stock;
    }
    if ("stockQuantity" in data) {
      const stock = Number(data.stockQuantity);
      if (!Number.isInteger(stock) || stock < 0) return NextResponse.json({ error: "Stock must be a non-negative whole number." }, { status: 400 });
      fields.stockQuantity = stock;
      fields.stock = stock;
    }
    if ("powerVariants" in data) {
      if (!Array.isArray(data.powerVariants)) return NextResponse.json({ error: "Power variants must be an array." }, { status: 400 });
      const variants = data.powerVariants.map((entry) => {
        if (typeof entry !== "object" || entry === null || Array.isArray(entry)) throw new Error("Invalid power variant.");
        const variant = entry as Record<string, unknown>;
        const power = String(variant.power ?? "").trim();
        const price = Number(variant.price);
        const oldPrice = variant.oldPrice == null || variant.oldPrice === "" ? null : Number(variant.oldPrice);
        const stockQuantity = Number(variant.stockQuantity);
        if (!power || !Number.isFinite(price) || price < 0 || (oldPrice !== null && (!Number.isFinite(oldPrice) || oldPrice < 0)) || !Number.isInteger(stockQuantity) || stockQuantity < 0) throw new Error("Invalid power variant.");
        return { power, price, oldPrice, stockQuantity };
      });
      fields.powerVariants = variants as Prisma.InputJsonValue;
    }
    if ("category" in data) {
      const category = String(data.category ?? "").trim();
      if (!category) return NextResponse.json({ error: "Category is required." }, { status: 400 });
      fields.category = category;
    }
    for (const key of [
      "title_ky", "title_en", "description_ru", "description_ky", "description_en",
      "subcategory", "description", "brand", "badgeKey", "energyClass", "pressure", "power",
    ] as const) {
      if (typeof data[key] === "string") fields[key] = data[key];
    }
    if ("imageUrl" in data) {
      if (data.imageUrl === null || data.imageUrl === "") {
        fields.imageUrl = null;
      } else if (typeof data.imageUrl !== "string" || data.imageUrl.length > 2048 || /^data:/i.test(data.imageUrl)) {
        return NextResponse.json({
          error: "Укажите URL или путь загруженного изображения, а не встроенные данные изображения.",
        }, { status: 400 });
      } else {
        fields.imageUrl = data.imageUrl.trim();
      }
    }
    for (const key of ["certificateUrl", "certificateFileName", "passportUrl", "passportFileName"] as const) {
      if (!(key in data)) continue;
      if (data[key] === null || data[key] === "") {
        fields[key] = null;
      } else if (typeof data[key] === "string") {
        fields[key] = data[key];
      } else {
        return NextResponse.json({ error: `${key} must be a string or null.` }, { status: 400 });
      }
    }
    for (const key of ["image_id", "power_options"] as const) {
      if (Array.isArray(data[key])) {
        fields[key] = data[key].filter((item): item is string => typeof item === "string");
      }
    }
    if (typeof data.specs === "string" || Array.isArray(data.specs)) {
      fields.specs = data.specs as Prisma.InputJsonValue;
    }
    if ("old_price" in data) {
      if (data.old_price === null || data.old_price === "") {
        fields.old_price = null;
      } else {
        const oldPrice = Number(data.old_price);
        if (!Number.isFinite(oldPrice) || oldPrice < 0) {
          return NextResponse.json({ error: "Old price must be a valid non-negative number." }, { status: 400 });
        }
        fields.old_price = oldPrice;
      }
    }
    if ("oldPrice" in data || "old_price" in data || "price" in data) {
      const incomingOld = data.oldPrice ?? data.old_price;
      if (incomingOld === null || incomingOld === "") {
        if ("price" in data) {
          const current = await prisma.product.findUnique({ where: { id }, select: { price: true } });
          if (current && current.price !== Number(data.price)) {
            fields.oldPrice = current.price;
            fields.old_price = current.price;
          } else {
            fields.oldPrice = null;
            fields.old_price = null;
          }
        } else {
          fields.oldPrice = null;
          fields.old_price = null;
        }
      } else if (incomingOld !== undefined) {
        const oldPrice = Number(incomingOld);
        if (!Number.isFinite(oldPrice) || oldPrice < 0) return NextResponse.json({ error: "Old price must be non-negative." }, { status: 400 });
        fields.oldPrice = oldPrice;
        fields.old_price = oldPrice;
      } else if ("price" in data) {
        const current = await prisma.product.findUnique({ where: { id }, select: { price: true } });
        if (current && current.price !== Number(data.price)) {
          fields.oldPrice = current.price;
          fields.old_price = current.price;
        }
      }
    }

    const product = await prisma.product.update({ where: { id }, data: fields });
    return NextResponse.json(product);
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid power variant.") {
      return NextResponse.json({ error: "Each power option needs a name, valid price, and whole non-negative stock." }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Тело запроса содержит некорректный JSON." }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientValidationError) {
      const unknownField = error.message.match(/Unknown argument [`'\"]([^`'\"]+)[`'\"]/i)?.[1];
      const schemaFields = new Set(["oldPrice", "stockQuantity", "powerVariants", "certificateUrl", "certificateFileName", "passportUrl", "passportFileName"]);
      if (unknownField && schemaFields.has(unknownField)) {
        console.error("PATCH /api/products/:id Prisma Client is stale for the current schema", { unknownField, message: error.message });
        return NextResponse.json({
          error: `Сервер использует устаревший Prisma Client (поле «${unknownField}»). Остановите dev-сервер, выполните npx prisma generate и запустите npm run dev заново.`,
          code: "STALE_PRISMA_CLIENT",
        }, { status: 503 });
      }
      console.error("PATCH /api/products/:id Prisma validation error", error.message);
      return NextResponse.json({
        error: "Prisma отклонила данные обновления. Проверьте формат значений товара.",
        details: error.message.split("\n").slice(0, 4).join(" ").slice(0, 300),
      }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const validationCodes = new Set(["P2000", "P2009", "P2011", "P2012", "P2023"]);
      const isValidationError = validationCodes.has(error.code);
      console.error("PATCH /api/products/:id Prisma request error", { code: error.code, message: error.message, meta: error.meta });
      return NextResponse.json({
        error: isValidationError
          ? "MongoDB отклонила одно или несколько значений товара. Проверьте формат цены, остатка, вариантов и характеристик."
          : "Не удалось обновить товар из-за ошибки базы данных.",
        code: error.code,
        ...(isValidationError ? { details: error.message.slice(0, 600) } : {}),
      }, { status: isValidationError ? 400 : 500 });
    }
    const message = error instanceof Error ? error.message : "Неизвестная ошибка.";
    console.error("PATCH /api/products/:id failed", error);
    return NextResponse.json({
      error: `Не удалось обновить товар: ${message.slice(0, 400)}`,
      code: "PRODUCT_UPDATE_FAILED",
    }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const unauthorized = await requireAdminSession(request);
  if (unauthorized) return unauthorized;

  const { id } = await params;
  if (!validId(id)) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  try {
    await prisma.product.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }
    console.error("Failed to delete MongoDB product", error);
    return NextResponse.json({ error: "Unable to delete product." }, { status: 500 });
  }
}
