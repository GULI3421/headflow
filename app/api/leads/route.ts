import { NextResponse } from "next/server";
import { LeadType } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return NextResponse.json({ error: "Lead data must be an object." }, { status: 400 });
    }

    const data = body as Record<string, unknown>;
    const name = String(data.name ?? data.customer_name ?? "").trim();
    const phone = String(data.phone ?? "").trim();
    if (!name || !phone) {
      return NextResponse.json({ error: "Name and phone are required." }, { status: 400 });
    }

    if (data.type !== undefined && data.type !== "callback" && data.type !== "calculator") {
      return NextResponse.json({ error: "Lead type must be callback or calculator." }, { status: 400 });
    }

    const type = data.type === "calculator" ? LeadType.calculator : LeadType.callback;
    const lead = await prisma.lead.create({
      data: {
        name,
        phone,
        message: typeof data.message === "string" && data.message.trim() ? data.message.trim() : null,
        type,
      },
      select: { id: true },
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }
    console.error("Failed to save MongoDB lead", error);
    return NextResponse.json({ error: "Unable to submit the request." }, { status: 500 });
  }
}
