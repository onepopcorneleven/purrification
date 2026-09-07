import { prisma } from "@/lib/db/client";

// Both "cat doesn't exist" and "cat belongs to someone else" should be
// treated as the same 404 by callers — don't leak which cat ids exist to a
// user who doesn't own them.
export async function findOwnedCat(catId: string, userId: string) {
  const cat = await prisma.cat.findUnique({ where: { id: catId } });
  if (!cat || cat.userId !== userId) return null;
  return cat;
}
