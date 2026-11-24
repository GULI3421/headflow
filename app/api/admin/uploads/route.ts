import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/src/lib/admin-api-auth";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const extensions: Record<string, string> = {
  "image/avif": ".avif",
  "image/gif": ".gif",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export async function POST(request: Request) {
  const unauthorized = await requireAdminSession(request);
  if (unauthorized) return unauthorized;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Image file is required." }, { status: 400 });
    }

    const extension = extensions[file.type];
    if (!extension) {
      return NextResponse.json({ error: "Use a JPEG, PNG, WebP, GIF, or AVIF image." }, { status: 400 });
    }
    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Image must be smaller than 10 MB." }, { status: 400 });
    }

    const uploadDirectory = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDirectory, { recursive: true });
    const filename = `${randomUUID()}${extension}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    const signatureIsValid = file.type === "image/jpeg"
      ? bytes[0] === 0xff && bytes[1] === 0xd8
      : file.type === "image/png"
        ? bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
        : file.type === "image/gif"
          ? bytes.subarray(0, 3).toString() === "GIF"
          : file.type === "image/webp"
            ? bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP"
            : file.type === "image/avif"
              ? bytes.subarray(4, 12).toString().includes("ftypavif") || bytes.subarray(4, 12).toString().includes("ftypavis")
              : false;
    if (!signatureIsValid) {
      return NextResponse.json({ error: "Image file contents do not match its type." }, { status: 400 });
    }

    await writeFile(path.join(uploadDirectory, filename), bytes, { flag: "wx" });

    return NextResponse.json({ url: `/uploads/${filename}` }, { status: 201 });
  } catch (error) {
    console.error("Failed to save product image", error);
    return NextResponse.json({ error: "Unable to save image." }, { status: 500 });
  }
}
