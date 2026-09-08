import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/guard";
import { PageShell } from "@/components/ui/PageShell";
import { Button } from "@/components/ui/Button";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/cats");
  }

  return (
    <PageShell user={user}>
      <div className="flex flex-col gap-6">
        <Image
          src="/images/header-fortune-cat.png"
          alt="A regal black cat, dressed as a fortune teller, seated at a mystical crystal ball and tarot card reading beneath a striped circus tent"
          width={2048}
          height={768}
          priority
          className="w-full rounded-lg shadow-glow-purple"
        />
        <h1 className="font-display text-4xl text-gold-50">Purrification</h1>
        <p className="text-lg text-text-secondary">
          Your cat is acting weird again — hiding, hissing, knocking things off
          the counter for the third time today. Take a short quiz about
          what&apos;s been going on, and get a whimsical spiritual diagnosis
          plus a cleansing ritual to try.
        </p>

        <ol className="flex flex-col gap-2 pl-5 text-text-secondary marker:text-gold-500">
          <li className="list-decimal">Sign up and add your cat.</li>
          <li className="list-decimal">
            Answer a few questions about their recent mood, sleep spots, and
            general chaos level.
          </li>
          <li className="list-decimal">
            Get a diagnosis (say, residual energy from the vacuum cleaner) and a
            prescribed ritual (a catnip blessing, a moonlight nap spot).
          </li>
          <li className="list-decimal">
            Save it, share it, and look back at your cat&apos;s journey.
          </li>
        </ol>

        <div className="flex gap-3">
          <Button href="/signup">Sign up</Button>
          <Button variant="secondary" href="/login">
            Log in
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
