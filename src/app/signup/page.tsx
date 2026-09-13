import Image from "next/image";
import { PageShell } from "@/components/ui/PageShell";
import { Expandable } from "@/components/ui/Expandable";
import { SignupForm } from "./SignupForm";

export default function SignupPage() {
  return (
    <PageShell>
      <div className="flex flex-col gap-8">
        <div className="hero-fog rounded-lg">
          <Expandable
            label="View larger image of a candlelit threshold welcoming a cat"
            src="/images/pages/signup-threshold.png"
            alt="A hooded figure kneels at a candlelit threshold, welcoming a black cat in from the night"
          >
            <Image
              src="/images/pages/signup-threshold.png"
              alt="A hooded figure kneels at a candlelit threshold, welcoming a black cat in from the night"
              width={1600}
              height={900}
              sizes="(min-width: 768px) 736px, 100vw"
              className="w-full rounded-lg shadow-glow-purple"
            />
          </Expandable>
        </div>
        <SignupForm />
      </div>
    </PageShell>
  );
}
