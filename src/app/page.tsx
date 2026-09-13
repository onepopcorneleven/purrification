import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/guard";
import { PageShell } from "@/components/ui/PageShell";
import { Button } from "@/components/ui/Button";
import { Expandable } from "@/components/ui/Expandable";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/cats");
  }

  const steps = [
    "Sign up and add your cat.",
    "Answer a few questions about their recent mood, sleep spots, and general chaos level.",
    "Get a diagnosis (say, residual energy from the vacuum cleaner) and a prescribed ritual (a catnip blessing, a moonlight nap spot).",
    "Save it, share it, and look back at your cat's journey.",
  ];

  return (
    <PageShell user={user} wide>
      <div className="hero-fog rounded-lg">
        <Expandable
          label="View larger image of the fortune-teller cat"
          src="/images/header-fortune-cat.png"
          alt="A regal black cat, dressed as a fortune teller, seated at a mystical crystal ball and tarot card reading beneath a striped circus tent"
        >
          <Image
            src="/images/header-fortune-cat.png"
            alt="A regal black cat, dressed as a fortune teller, seated at a mystical crystal ball and tarot card reading beneath a striped circus tent"
            width={2048}
            height={768}
            preload
            sizes="(min-width: 896px) 896px, 100vw"
            className="w-full rounded-lg shadow-glow-purple"
          />
        </Expandable>
      </div>
      {/* A comfortable reading measure inside the wider hero well — the
          image gets the extra breathing room, the prose doesn't have to
          (see PageShell's `wide` doc comment). */}
      <div className="mx-auto flex max-w-2xl flex-col gap-6 pt-8">
        <h1 className="font-display text-4xl text-gold-50">Purrification</h1>
        <p className="text-lg text-text-secondary">
          Your cat is acting weird again — hiding, hissing, knocking things off
          the counter for the third time today. Take a short quiz about
          what&apos;s been going on, and get a whimsical spiritual diagnosis
          plus a cleansing ritual to try.
        </p>

        <ol className="flex flex-col gap-2 pl-5 text-text-secondary marker:text-gold-500">
          {steps.map((step, i) => (
            <li
              key={step}
              className="animate-fade-in list-decimal"
              style={{ animationDelay: `${150 + i * 120}ms` }}
            >
              {step}
            </li>
          ))}
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
