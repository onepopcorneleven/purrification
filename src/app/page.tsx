import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/guard";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/cats");
  }

  return (
    <main style={{ maxWidth: 560, margin: "4rem auto", padding: "0 1rem" }}>
      <h1>Purrification</h1>
      <p style={{ fontSize: "1.125rem" }}>
        Your cat is acting weird again — hiding, hissing, knocking things off
        the counter for the third time today. Take a short quiz about
        what&apos;s been going on, and get a whimsical spiritual diagnosis plus
        a cleansing ritual to try.
      </p>

      <ol>
        <li>Sign up and add your cat.</li>
        <li>
          Answer a few questions about their recent mood, sleep spots, and
          general chaos level.
        </li>
        <li>
          Get a diagnosis (say, residual energy from the vacuum cleaner) and a
          prescribed ritual (a catnip blessing, a moonlight nap spot).
        </li>
        <li>Save it, share it, and look back at your cat&apos;s journey.</li>
      </ol>

      <p style={{ color: "#666", fontSize: "0.875rem" }}>
        It&apos;s just for fun — not real medical or behavioral advice. If your
        cat is genuinely unwell, please see a vet.
      </p>

      <p style={{ display: "flex", gap: "1rem" }}>
        <Link href="/signup">Sign up</Link>
        <Link href="/login">Log in</Link>
      </p>
    </main>
  );
}
