import { NextResponse } from "next/server";
import { getAdminSessionToken, hashAdminSessionToken } from "@/src/lib/admin-api-auth";
import { prisma } from "@/src/lib/prisma";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const token = getAdminSessionToken(request);

  try {
    if (token) {
      await prisma.adminSession.deleteMany({
        where: { tokenHash: hashAdminSessionToken(token) },
      });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.delete("heatflow_admin_session");
    return response;
  } catch (error) {
    console.error("Failed to end admin session", error);
    return NextResponse.json({ error: "Unable to log out." }, { status: 500 });
  }
}
