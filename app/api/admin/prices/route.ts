import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/src/lib/admin-api-auth";
import { prisma } from "@/src/lib/prisma";

export const runtime = "nodejs";
const allowedTypes: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
};

export async function POST(request: Request) {
  const unauthorized = await requireAdminSession(request);
  if (unauthorized) return unauthorized;
  try {
    const form = await request.formData();
    const file = form.get("file");
    const title = String(form.get("title") ?? "").trim();
    if (!(file instanceof File) || !title) return NextResponse.json({ error: "Укажите название и выберите файл." }, { status: 400 });
    const extension = allowedTypes[file.type];
    if (!extension || !file.name.toLowerCase().endsWith(extension)) return NextResponse.json({ error: "Разрешены файлы PDF, XLSX и XLS." }, { status: 400 });
    if (file.size === 0 || file.size > 25 * 1024 * 1024) return NextResponse.json({ error: "Размер файла должен быть до 25 МБ." }, { status: 400 });

    const directory = path.join(process.cwd(), "public", "prices");
    await mkdir(directory, { recursive: true });
    const filename = `${randomUUID()}${extension}`;
    await writeFile(path.join(directory, filename), Buffer.from(await file.arrayBuffer()), { flag: "wx" });
    const priceList = await prisma.priceList.create({ data: { title, fileUrl: `/prices/${filename}` } });
    return NextResponse.json({ priceList }, { status: 201 });
  } catch (error) {
    console.error("Failed to save price list", error);
    return NextResponse.json({ error: "Не удалось сохранить прайс-лист." }, { status: 500 });
  }
}
