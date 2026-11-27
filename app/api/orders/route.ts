import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { normalizePhone, validatePhone } from "@/lib/phone";
import { prisma } from "@/src/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

class InvalidOrderError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function findPowerVariant(value: Prisma.JsonValue | null, power: string) {
  if (!Array.isArray(value)) return null;
  const variant = value.find((item) => isRecord(item) && item.power === power);
  if (!isRecord(variant) || typeof variant.power !== "string" || typeof variant.price !== "number") return null;
  return { power: variant.power, price: variant.price };
}

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        orderNumber: true,
        createdAt: true,
        status: true,
        items: {
          select: {
            name: true,
            variant: true,
            quantity: true,
          },
        },
        totalAmount: true,
      },
    });

    return NextResponse.json({
      orders: orders.map((order) => ({
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        status: order.status,
        items: order.items.map(({ name, variant, quantity }) => ({ name, variant, quantity })),
        totalAmount: order.totalAmount,
      })),
    });
  } catch (error) {
    console.error("Failed to load public orders", error);
    return NextResponse.json({ error: "Не удалось загрузить список заказов." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let phase = "request validation";
  try {
    const body: unknown = await request.json();
    if (!isRecord(body)) throw new InvalidOrderError("Некорректные данные заказа.");

    const orderNumber = typeof body.orderNumber === "string" ? body.orderNumber.trim() : "";
    const customerName = typeof body.customerName === "string" ? body.customerName.trim() : "";
    const customerPhone = typeof body.customerPhone === "string" ? body.customerPhone.trim() : "";
    if (body.customerComment !== undefined && body.customerComment !== null && typeof body.customerComment !== "string") {
      throw new InvalidOrderError("Комментарий к заказу должен быть текстом.");
    }
    const customerComment = typeof body.customerComment === "string" ? body.customerComment.trim() : "";

    if (!/^[A-Z0-9-]{6,64}$/i.test(orderNumber)) {
      throw new InvalidOrderError("Укажите корректный номер заказа.");
    }
    if (!customerName || customerName.length > 200) {
      throw new InvalidOrderError("Укажите имя клиента (не более 200 символов).");
    }
    const phoneError = validatePhone(customerPhone);
    if (phoneError) throw new InvalidOrderError(phoneError);
    if (customerComment.length > 4000) {
      throw new InvalidOrderError("Комментарий не должен превышать 4000 символов.");
    }
    if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 100) {
      throw new InvalidOrderError("В заказе должна быть хотя бы одна позиция.");
    }

    const rawItems = body.items.map((item) => {
      if (!isRecord(item)) throw new InvalidOrderError("Некорректная позиция заказа.");
      if (item.variant !== undefined && item.variant !== null && typeof item.variant !== "string") {
        throw new InvalidOrderError("Проверьте вариант товара.");
      }
      const variant = typeof item.variant === "string" ? item.variant.trim() : "";
      const productId = typeof item.productId === "string" ? item.productId : "";
      const quantity = item.quantity;

      if (!/^[\da-f]{24}$/i.test(productId) || variant.length > 100) {
        throw new InvalidOrderError("Проверьте товар и его вариант.");
      }
      if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1 || quantity > 100000) {
        throw new InvalidOrderError("Количество товара должно быть положительным целым числом.");
      }

      return { productId, variant, quantity };
    });
    const productIds = [...new Set(rawItems.map((item) => item.productId))];
    phase = "product lookup";
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, title_ru: true, price: true, powerVariants: true },
    });
    const productsById = new Map(products.map((product) => [product.id, product]));
    const items = rawItems.map(({ productId, variant, quantity }) => {
      const product = productsById.get(productId);
      if (!product) throw new InvalidOrderError("Один из товаров больше недоступен. Обновите корзину и попробуйте снова.");

      const selectedVariant = variant ? findPowerVariant(product.powerVariants, variant) : null;
      if (variant && !selectedVariant) {
        throw new InvalidOrderError(`Вариант «${variant}» товара «${product.title_ru}» больше недоступен.`);
      }

      const name = typeof product.title_ru === "string" ? product.title_ru.trim() : "";
      const unitPrice = selectedVariant?.price ?? product.price;
      if (!name || name.length > 300 || !Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new InvalidOrderError("У товара указана некорректная цена или название.");
      }

      const lineTotal = unitPrice * quantity;
      if (!Number.isFinite(lineTotal)) throw new InvalidOrderError("Сумма позиции заказа слишком велика.");

      return { name, variant: variant || null, quantity, unitPrice, lineTotal };
    });
    const totalAmount = items.reduce((total, item) => total + item.lineTotal, 0);
    if (!Number.isFinite(totalAmount)) throw new InvalidOrderError("Итоговая сумма заказа слишком велика.");

    phase = "order creation";
    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerName,
        customerPhone: normalizePhone(customerPhone),
        customerComment: customerComment || null,
        items,
        totalAmount,
      },
    });

    return NextResponse.json({
      order: {
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        status: order.status,
        items: order.items.map(({ name, variant, quantity, unitPrice, lineTotal }) => ({
          name,
          variant,
          quantity,
          unitPrice,
          lineTotal,
        })),
        totalAmount: order.totalAmount,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof InvalidOrderError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Тело запроса содержит некорректный JSON." }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Заказ с таким номером уже существует. Попробуйте оформить его ещё раз." }, { status: 409 });
    }
    const errorDetails = error instanceof Error ? error.message : String(error);
    const errorCode = error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined;
    console.error("Failed to save order", { phase, error });
    return NextResponse.json({
      error: "Не удалось сохранить заказ. Корзина не очищена, попробуйте ещё раз.",
      ...(process.env.NODE_ENV === "development" && {
        details: errorDetails,
        phase,
        ...(errorCode ? { code: errorCode } : {}),
      }),
    }, { status: 500 });
  }
}
