import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

export async function GET() {
  try {
    const priceList = await prisma.priceList.findFirst({ orderBy: { updatedAt: "desc" } });
    return NextResponse.json({ priceList });
  } catch (error) {
    console.error("Failed to load current price list", error);
    return NextResponse.json({ error: "Не удалось загрузить актуальный прайс-лист." }, { status: 500 });
  }
}
