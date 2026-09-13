import Image from "next/image";
import { PageShell } from "@/components/ui/PageShell";
import { Expandable } from "@/components/ui/Expandable";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <PageShell>
      <div className="flex flex-col gap-8">
        <div className="hero-fog rounded-lg">
          <Expandable
            label="View larger image of a candlelit tarot reading"
            src="/images/pages/login-reading.png"
            alt="A hooded figure reads tarot cards by candlelight, a cat curled beside them"
          >
            <Image
              src="/images/pages/login-reading.png"
              alt="A hooded figure reads tarot cards by candlelight, a cat curled beside them"
              width={1600}
              height={900}
              sizes="(min-width: 768px) 736px, 100vw"
              className="w-full rounded-lg shadow-glow-purple"
            />
          </Expandable>
        </div>
        <LoginForm />
      </div>
    </PageShell>
  );
}
