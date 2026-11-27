import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/src/lib/admin-api-auth";
import { prisma } from "@/src/lib/prisma";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

type OrderStatus = "NEW" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
type InventoryOrderItem = {
  productId?: string | null;
  inventoryDeducted?: number | null;
  name: string;
  variant: string | null;
  quantity: number;
  unitPrice: number;
};

type InventoryAdjustment = {
  deductedQuantity: number;
  variant: string | null;
};

class OrderNotFoundError extends Error {}
class InventoryUpdateError extends Error {}

const inventoryProductSelect = {
  id: true,
  title_ru: true,
  stock: true,
  stockQuantity: true,
  powerVariants: true,
} satisfies Prisma.ProductSelect;

function isOrderStatus(value: unknown): value is OrderStatus {
  return value === "NEW" || value === "IN_PROGRESS" || value === "COMPLETED" || value === "CANCELLED";
}

function isJsonObject(value: Prisma.JsonValue): value is Prisma.JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function productHasVariants(product: { powerVariants: Prisma.JsonValue | null }) {
  return Array.isArray(product.powerVariants) && product.powerVariants.length > 0;
}

function productHasVariant(product: { powerVariants: Prisma.JsonValue | null }, power: string) {
  if (!Array.isArray(product.powerVariants)) return false;
  const normalizedPower = normalizeText(power);
  return product.powerVariants.some((variant) => (
    isJsonObject(variant)
    && typeof variant.power === "string"
    && normalizeText(variant.power) === normalizedPower
  ));
}

function productHasVariantPrice(product: { powerVariants: Prisma.JsonValue | null }, price: number) {
  if (!Array.isArray(product.powerVariants)) return false;
  return product.powerVariants.some((variant) => (
    isJsonObject(variant)
    && typeof variant.price === "number"
    && variant.price === price
  ));
}

async function findInventoryProduct(
  transaction: Prisma.TransactionClient,
  item: InventoryOrderItem,
) {
  if (item.productId && /^[\da-f]{24}$/i.test(item.productId)) {
    const product = await transaction.product.findUnique({
      where: { id: item.productId },
      select: inventoryProductSelect,
    });
    if (product) return product;
  }

  const itemName = normalizeText(item.name);
  if (!itemName) {
    throw new InventoryUpdateError("В позиции заказа не указано название товара.");
  }

  const nameCandidates = await transaction.product.findMany({
    where: { title_ru: { contains: item.name.trim(), mode: "insensitive" } },
    select: inventoryProductSelect,
  });
  const exactMatches = nameCandidates.filter((product) => normalizeText(product.title_ru) === itemName);
  const matches = exactMatches.length > 0
    ? exactMatches
    : nameCandidates.filter((product) => normalizeText(product.title_ru).includes(itemName));

  const requestedVariant = item.variant;
  if (requestedVariant) {
    const variantMatches = matches.filter((product) => productHasVariant(product, requestedVariant));
    if (variantMatches.length === 1) return variantMatches[0];
    if (variantMatches.length > 1) {
      throw new InventoryUpdateError(`Найдено несколько товаров «${item.name}» с вариантом «${requestedVariant}».`);
    }
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) {
      throw new InventoryUpdateError(`Не удалось однозначно определить товар «${item.name}» для списания.`);
    }
    throw new InventoryUpdateError(`Не удалось найти товар «${item.name}» с вариантом «${requestedVariant}» для списания.`);
  }

  const priceMatches = matches.filter((product) => productHasVariantPrice(product, item.unitPrice));
  if (priceMatches.length === 1) return priceMatches[0];
  if (priceMatches.length > 1) {
    throw new InventoryUpdateError(`Найдено несколько товаров «${item.name}» с ценой ${item.unitPrice} для списания.`);
  }

  const withoutVariants = matches.filter((product) => !productHasVariants(product));
  if (withoutVariants.length === 1) return withoutVariants[0];
  if (withoutVariants.length > 1 || matches.length > 1) {
    throw new InventoryUpdateError(`Найдено несколько товаров «${item.name}» для списания; укажите productId в заказе.`);
  }
  if (matches.length === 1) return matches[0];

  throw new InventoryUpdateError(`Не удалось найти товар «${item.name}» для списания.`);
}

async function adjustProductStock(
  transaction: Prisma.TransactionClient,
  item: InventoryOrderItem,
  quantityDelta: number,
): Promise<InventoryAdjustment> {
  const product = await findInventoryProduct(transaction, item);
  const variants = Array.isArray(product.powerVariants) ? product.powerVariants : [];

  if (variants.length > 0) {
    const requestedVariant = item.variant;
    let variantIndex: number;
    if (requestedVariant) {
      const matchingIndexes = variants.flatMap((variant, index) =>
        isJsonObject(variant)
          && typeof variant.power === "string"
          && normalizeText(variant.power) === normalizeText(requestedVariant)
          ? [index]
          : [],
      );
      if (matchingIndexes.length === 0) {
        throw new InventoryUpdateError(`Вариант «${requestedVariant}» товара «${item.name}» больше не найден.`);
      }
      if (matchingIndexes.length > 1) {
        throw new InventoryUpdateError(`Вариант «${requestedVariant}» товара «${item.name}» неоднозначен.`);
      }
      variantIndex = matchingIndexes[0];
    } else {
      const matchingAvailablePriceIndex = variants.findIndex((variant) => (
        isJsonObject(variant)
        && typeof variant.price === "number"
        && variant.price === item.unitPrice
        && typeof variant.stockQuantity === "number"
        && variant.stockQuantity > 0
      ));
      const firstInStockIndex = variants.findIndex((variant) => (
        isJsonObject(variant)
        && typeof variant.stockQuantity === "number"
        && variant.stockQuantity > 0
      ));
      const matchingPriceIndex = variants.findIndex((variant) => (
        isJsonObject(variant)
        && typeof variant.price === "number"
        && variant.price === item.unitPrice
      ));
      variantIndex = matchingAvailablePriceIndex >= 0
        ? matchingAvailablePriceIndex
        : firstInStockIndex >= 0
          ? firstInStockIndex
          : matchingPriceIndex >= 0
            ? matchingPriceIndex
            : 0;
    }

    const selectedVariant = variants[variantIndex];
    if (!isJsonObject(selectedVariant) || typeof selectedVariant.power !== "string" || !selectedVariant.power.trim()) {
      throw new InventoryUpdateError(`У товара «${item.name}» указан вариант без названия.`);
    }
    const currentVariantStock = isJsonObject(selectedVariant) ? selectedVariant.stockQuantity : undefined;
    if (typeof currentVariantStock !== "number" || !Number.isInteger(currentVariantStock)) {
      throw new InventoryUpdateError(`У варианта «${selectedVariant.power}» товара «${item.name}» некорректный остаток.`);
    }

    const currentStock = Math.max(0, currentVariantStock);
    const nextStock = Math.max(0, currentStock + quantityDelta);
    const nextVariants = variants.map((variant, index) => (
      index === variantIndex && isJsonObject(variant)
        ? { ...variant, stockQuantity: nextStock }
        : variant
    ));
    const totalStock = nextVariants.reduce<number>((total, variant) => {
      if (!isJsonObject(variant) || typeof variant.stockQuantity !== "number" || !Number.isInteger(variant.stockQuantity)) {
        throw new InventoryUpdateError(`У товара «${item.name}» найден вариант с некорректным остатком.`);
      }
      return total + variant.stockQuantity;
    }, 0);

    await transaction.product.update({
      where: { id: product.id },
      data: {
        powerVariants: nextVariants as Prisma.InputJsonValue,
        stock: totalStock,
        stockQuantity: totalStock,
      },
    });
    return {
      deductedQuantity: quantityDelta < 0 ? currentStock - nextStock : 0,
      variant: selectedVariant.power,
    };
  }

  if (item.variant) {
    throw new InventoryUpdateError(`Вариант «${item.variant}» товара «${item.name}» больше не найден.`);
  }
  const currentStock = Math.max(0, product.stockQuantity ?? product.stock);
  const nextStock = Math.max(0, currentStock + quantityDelta);
  await transaction.product.update({
    where: { id: product.id },
    data: { stock: nextStock, stockQuantity: nextStock },
  });
  return {
    deductedQuantity: quantityDelta < 0 ? currentStock - nextStock : 0,
    variant: null,
  };
}

async function adjustOrderInventory(
  transaction: Prisma.TransactionClient,
  items: InventoryOrderItem[],
  operation: "deduct" | "restore",
): Promise<InventoryAdjustment[]> {
  const adjustments: InventoryAdjustment[] = [];
  for (const item of items) {
    if (operation === "deduct") {
      adjustments.push(await adjustProductStock(transaction, item, -item.quantity));
      continue;
    }

    const deducted = item.inventoryDeducted ?? 0;
    if (!Number.isInteger(deducted) || deducted < 0) {
      throw new InventoryUpdateError(`У товара «${item.name}» некорректно указано списанное количество.`);
    }
    if (deducted > 0) await adjustProductStock(transaction, item, deducted);
    adjustments.push({ deductedQuantity: 0, variant: item.variant });
  }
  return adjustments;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const unauthorized = await requireAdminSession(request);
  if (unauthorized) return unauthorized;

  const { id } = await params;
  if (!/^[\da-f]{24}$/i.test(id)) {
    return NextResponse.json({ error: "Заказ не найден." }, { status: 404 });
  }

  try {
    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return NextResponse.json({ error: "Укажите статус заказа." }, { status: 400 });
    }

    const status = (body as Record<string, unknown>).status;
    if (!isOrderStatus(status)) {
      return NextResponse.json({ error: "Недопустимый статус заказа." }, { status: 400 });
    }

    const order = await prisma.$transaction(async (transaction) => {
      const currentOrder = await transaction.order.findUnique({ where: { id } });
      if (!currentOrder) throw new OrderNotFoundError("Заказ не найден.");
      if (currentOrder.status === status) return currentOrder;

      if (status === "COMPLETED") {
        const adjustments = await adjustOrderInventory(transaction, currentOrder.items, "deduct");
        return transaction.order.update({
          where: { id },
          data: {
            status,
            items: currentOrder.items.map((item, index) => ({
              ...item,
              variant: adjustments[index].variant,
              inventoryDeducted: adjustments[index].deductedQuantity,
            })),
          },
        });
      }

      if (currentOrder.status === "COMPLETED") {
        await adjustOrderInventory(transaction, currentOrder.items, "restore");
        return transaction.order.update({
          where: { id },
          data: {
            status,
            items: currentOrder.items.map((item) => ({
              ...item,
              inventoryDeducted: null,
            })),
          },
        });
      }

      return transaction.order.update({
        where: { id },
        data: { status },
      });
    });
    return NextResponse.json({ order });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Тело запроса должно содержать корректный JSON." }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Заказ не найден." }, { status: 404 });
    }
    if (error instanceof OrderNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof InventoryUpdateError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return NextResponse.json(
        { error: "Заказ или остаток товара изменились параллельно. Обновите страницу и повторите действие." },
        { status: 409 },
      );
    }
    console.error("Failed to update order status", error);
    return NextResponse.json({ error: "Не удалось изменить статус заказа." }, { status: 500 });
  }
}
