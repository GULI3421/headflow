import { NextResponse } from "next/server";
import { getAdminSession } from "@/src/lib/admin-api-auth";

export async function GET(request: Request) {
  try {
    const session = await getAdminSession(request);
    if (!session) {
      const response = NextResponse.json({ user: null }, { status: 200 });
      response.cookies.delete("heatflow_admin_session");
      return response;
    }

    return NextResponse.json({ user: session.user });
  } catch (error) {
    console.error("Failed to load admin session", error);
    return NextResponse.json({ error: "Unable to verify admin session." }, { status: 500 });
  }
}
