import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const latest = await prisma.priceList.findFirst({ orderBy: { updatedAt: "desc" } });
    if (!latest) return NextResponse.redirect(new URL("/price.pdf", request.url));

    const filename = path.basename(latest.fileUrl);
    const extension = path.extname(filename).toLowerCase();
    const mime = extension === ".pdf" ? "application/pdf" : extension === ".xls" ? "application/vnd.ms-excel" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    const bytes = await readFile(path.join(process.cwd(), "public", "prices", filename));
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(latest.title + extension)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Failed to redirect to current price list", error);
    return NextResponse.redirect(new URL("/price.pdf", request.url));
  }
}
