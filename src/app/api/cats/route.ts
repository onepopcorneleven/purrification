import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth/guard";

function parseTraits(body: unknown): string[] | undefined {
  const traits = (body as { traits?: unknown })?.traits;
  if (traits === undefined) return undefined;
  if (!Array.isArray(traits) || !traits.every((t) => typeof t === "string")) {
    return undefined;
  }
  return traits;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cats = await prisma.cat.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ cats });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "A cat needs a name." }, { status: 400 });
  }
  const traits = parseTraits(body);

  const cat = await prisma.cat.create({
    data: { userId: user.id, name, traits: traits ?? undefined },
  });
  return NextResponse.json({ cat }, { status: 201 });
}
