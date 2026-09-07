import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/guard";
import { findOwnedCat } from "@/lib/cats/findOwnedCat";
import { prisma } from "@/lib/db/client";

export default async function CatHistoryPage({
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

  const attempts = await prisma.quizAttempt.findMany({
    where: { catId: id },
    orderBy: { createdAt: "desc" },
    include: { diagnosis: true },
  });

  return (
    <main style={{ maxWidth: 480, margin: "4rem auto", padding: "0 1rem" }}>
      <h1>{cat.name}&apos;s spiritual journey</h1>
      {attempts.length === 0 ? (
        <p>
          No readings yet.{" "}
          <Link href={`/cats/${cat.id}/quiz`}>Take the quiz</Link> to get the
          first one.
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {attempts.map((attempt) => (
            <li
              key={attempt.id}
              style={{ padding: "0.75rem 0", borderBottom: "1px solid #eee" }}
            >
              <p style={{ color: "#666", fontSize: "0.875rem", margin: 0 }}>
                {attempt.createdAt.toLocaleDateString()}
              </p>
              {attempt.diagnosis && (
                <>
                  <p style={{ margin: "0.25rem 0" }}>
                    {attempt.diagnosis.diagnosisText}
                  </p>
                  <Link href={`/results/${attempt.diagnosis.id}`}>
                    View full reading
                  </Link>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      <p>
        <Link href="/cats">Back to your cats</Link>
      </p>
    </main>
  );
}
