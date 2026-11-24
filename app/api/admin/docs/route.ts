import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/src/lib/admin-api-auth";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function safeFileName(fileName: string) {
  const basename = path.basename(fileName);
  const sanitized = basename
    .replace(/[^\p{L}\p{N}._ -]/gu, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
  return sanitized.toLowerCase().endsWith(".pdf") ? sanitized : `${sanitized || "document"}.pdf`;
}

export async function POST(request: Request) {
  const unauthorized = await requireAdminSession(request);
  if (unauthorized) return unauthorized;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "PDF file is required." }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files are allowed." }, { status: 400 });
    }
    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "PDF must be smaller than 10 MB." }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.subarray(0, 5).toString() !== "%PDF-") {
      return NextResponse.json({ error: "File contents do not match PDF format." }, { status: 400 });
    }

    const uploadDirectory = path.join(process.cwd(), "public", "uploads", "docs");
    await mkdir(uploadDirectory, { recursive: true });
    const filename = `${randomUUID()}.pdf`;
    await writeFile(path.join(uploadDirectory, filename), bytes, { flag: "wx" });

    return NextResponse.json({
      url: `/uploads/docs/${filename}`,
      fileName: safeFileName(file.name),
    }, { status: 201 });
  } catch (error) {
    console.error("Failed to save product PDF document", error);
    return NextResponse.json({ error: "Unable to save PDF document." }, { status: 500 });
  }
}
