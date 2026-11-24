import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

export const adminSessionCookie = "heatflow_admin_session";

export function getAdminSessionToken(request: Request) {
  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${adminSessionCookie}=`))
    ?.slice(adminSessionCookie.length + 1);

  return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}

export function hashAdminSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function getAdminSession(request: Request) {
  const token = getAdminSessionToken(request);
  if (!token) return null;

  const session = await prisma.adminSession.findUnique({
    where: { tokenHash: hashAdminSessionToken(token) },
    include: { user: { select: { email: true } } },
  });

  if (!session) return null;
  if (session.expiresAt <= new Date()) {
    await prisma.adminSession.delete({ where: { id: session.id } });
    return null;
  }

  return session;
}

export async function requireAdminSession(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!(await getAdminSession(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
