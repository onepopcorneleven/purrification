import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/guard";
import { findOwnedCat } from "@/lib/cats/findOwnedCat";
import { quizQuestions } from "@/content/quiz";
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
    <main style={{ maxWidth: 480, margin: "4rem auto", padding: "0 1rem" }}>
      <h1>How&apos;s {cat.name} doing?</h1>
      <QuizFlow catId={cat.id} questions={quizQuestions} />
    </main>
  );
}
