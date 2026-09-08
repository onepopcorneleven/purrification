import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/guard";
import { findOwnedCat } from "@/lib/cats/findOwnedCat";
import { quizQuestions } from "@/content/quiz";
import { PageShell } from "@/components/ui/PageShell";
import { QuizFlow } from "./QuizFlow";

export default async function QuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const cat = await findOwnedCat(id, user.id);
  if (!cat) {
    notFound();
  }

  return (
    <PageShell user={user}>
      <h1 className="mb-6 font-heading text-2xl">
        How&apos;s {cat.name} doing?
      </h1>
      <QuizFlow catId={cat.id} questions={quizQuestions} />
    </PageShell>
  );
}
