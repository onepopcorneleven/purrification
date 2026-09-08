import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db/client";
import { AddCatForm } from "./AddCatForm";
import { CatList } from "./CatList";
import { LogoutButton } from "@/components/ui/LogoutButton";

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
    <main style={{ maxWidth: 480, margin: "4rem auto", padding: "0 1rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <h1>Your cats</h1>
        <LogoutButton />
      </div>
      <CatList
        cats={cats.map((cat) => ({
          id: cat.id,
          name: cat.name,
          traits: Array.isArray(cat.traits) ? (cat.traits as string[]) : [],
        }))}
      />
      <h2>Add a cat</h2>
      <AddCatForm />
    </main>
  );
}
