import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/src/lib/admin-api-auth";
import { prisma } from "@/src/lib/prisma";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

type OrderStatus = "NEW" | "IN_PROGRESS" | "COMPLETED";

function isOrderStatus(value: unknown): value is OrderStatus {
  return value === "NEW" || value === "IN_PROGRESS" || value === "COMPLETED";
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

    const order = await prisma.order.update({
      where: { id },
      data: { status },
    });
    return NextResponse.json({ order });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Тело запроса должно содержать корректный JSON." }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Заказ не найден." }, { status: 404 });
    }
    console.error("Failed to update order status", error);
    return NextResponse.json({ error: "Не удалось изменить статус заказа." }, { status: 500 });
  }
}
