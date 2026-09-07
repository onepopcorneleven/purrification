import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth/guard";
import { findOwnedCat } from "@/lib/cats/findOwnedCat";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: catId } = await params;
  const cat = await findOwnedCat(catId, user.id);
  if (!cat) {
    return NextResponse.json({ error: "Cat not found." }, { status: 404 });
  }

  const attempts = await prisma.quizAttempt.findMany({
    where: { catId },
    orderBy: { createdAt: "desc" },
    include: { diagnosis: true },
  });
  return NextResponse.json({ attempts });
}
