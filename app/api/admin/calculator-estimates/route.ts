import { NextResponse } from "next/server";
import { requireAdminSession } from "@/src/lib/admin-api-auth";
import { prisma } from "@/src/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const unauthorized = await requireAdminSession(request);
  if (unauthorized) return unauthorized;

  const cursor = new URL(request.url).searchParams.get("cursor");
  if (cursor && !/^[\da-f]{24}$/i.test(cursor)) {
    return NextResponse.json({ error: "Некорректный курсор списка смет." }, { status: 400 });
  }

  try {
    const estimates = await prisma.calculatorEstimate.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: 101,
    });
    const hasMore = estimates.length > 100;
    const page = hasMore ? estimates.slice(0, 100) : estimates;
    return NextResponse.json({
      estimates: page,
      nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
    });
  } catch (error) {
    console.error("Failed to load admin calculator estimates", error);
    return NextResponse.json({ error: "Не удалось загрузить сметы." }, { status: 500 });
  }
}
