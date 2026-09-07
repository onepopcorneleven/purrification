import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth/guard";
import { findOwnedCat } from "@/lib/cats/findOwnedCat";

function parseTraits(body: unknown): string[] | undefined {
  const traits = (body as { traits?: unknown })?.traits;
  if (traits === undefined) return undefined;
  if (!Array.isArray(traits) || !traits.every((t) => typeof t === "string")) {
    return undefined;
  }
  return traits;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await findOwnedCat(id, user.id);
  if (!existing) {
    return NextResponse.json({ error: "Cat not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const data: { name?: string; traits?: string[] } = {};
  if (typeof body?.name === "string") {
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json(
        { error: "A cat needs a name." },
        { status: 400 },
      );
    }
    data.name = name;
  }
  const traits = parseTraits(body);
  if (traits !== undefined) data.traits = traits;

  const cat = await prisma.cat.update({ where: { id }, data });
  return NextResponse.json({ cat });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await findOwnedCat(id, user.id);
  if (!existing) {
    return NextResponse.json({ error: "Cat not found." }, { status: 404 });
  }

  // Cascades to this cat's QuizAttempt/Diagnosis history via the schema's
  // onDelete: Cascade (R-CAT-5) — no separate cleanup needed here.
  await prisma.cat.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
