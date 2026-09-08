import Image from "next/image";
import { PageShell } from "@/components/ui/PageShell";
import { SignupForm } from "./SignupForm";

export default function SignupPage() {
  return (
    <PageShell>
      <div className="flex flex-col gap-8">
        <div className="hero-fog rounded-lg">
          <Image
            src="/images/pages/signup-threshold.png"
            alt="A hooded figure kneels at a candlelit threshold, welcoming a black cat in from the night"
            width={1600}
            height={900}
            className="w-full rounded-lg shadow-glow-purple"
          />
        </div>
        <SignupForm />
      </div>
    </PageShell>
  );
}
