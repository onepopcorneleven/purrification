import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db/client";
import { PageShell } from "@/components/ui/PageShell";
import { AddCatForm } from "./AddCatForm";
import { CatList } from "./CatList";

export default async function CatsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const cats = await prisma.cat.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

  return (
    <PageShell user={user}>
      <div className="flex flex-col gap-10">
        <div>
          <h1 className="mb-4 font-heading text-2xl">Your cats</h1>
          <CatList
            cats={cats.map((cat) => ({
              id: cat.id,
              name: cat.name,
              traits: Array.isArray(cat.traits) ? (cat.traits as string[]) : [],
            }))}
          />
        </div>
        <div>
          <h2 className="mb-4 font-heading text-xl">Add a cat</h2>
          <AddCatForm />
        </div>
      </div>
    </PageShell>
  );
}
