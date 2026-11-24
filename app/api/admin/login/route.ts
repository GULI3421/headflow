import { randomBytes } from "node:crypto";
import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { adminSessionCookie, hashAdminSessionToken } from "@/src/lib/admin-api-auth";
import { prisma } from "@/src/lib/prisma";

const sessionDurationSeconds = 60 * 60 * 24 * 7;
const failedAttempts = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const forwardedFor = request.headers.get("x-forwarded-for");
    const clientIp = forwardedFor?.split(",")[0]?.trim() || "unknown";
    const now = Date.now();
    const attempt = failedAttempts.get(clientIp);
    if (attempt && attempt.resetAt > now && attempt.count >= 10) {
      return NextResponse.json({ error: "Слишком много попыток. Попробуйте позже." }, { status: 429 });
    }

    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const { email, password } = body as Record<string, unknown>;
    if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const user = await prisma.adminUser.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user || !(await compare(password, user.passwordHash))) {
      const current = failedAttempts.get(clientIp);
      if (!current || current.resetAt <= now) {
        failedAttempts.set(clientIp, { count: 1, resetAt: now + 15 * 60 * 1000 });
      } else {
        current.count += 1;
      }
      return NextResponse.json({ error: "Неверный email или пароль." }, { status: 401 });
    }
    failedAttempts.delete(clientIp);

    const token = randomBytes(32).toString("base64url");
    const tokenHash = hashAdminSessionToken(token);
    const expiresAt = new Date(Date.now() + sessionDurationSeconds * 1000);

    await prisma.adminSession.create({
      data: { tokenHash, userId: user.id, expiresAt },
    });

    const response = NextResponse.json({ user: { email: user.email } });
    response.cookies.set(adminSessionCookie, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });
    return response;
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }
    console.error("Admin login failed", error);
    return NextResponse.json({ error: "Не удалось выполнить вход." }, { status: 500 });
  }
}
