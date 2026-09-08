import Image from "next/image";
import { PageShell } from "@/components/ui/PageShell";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <PageShell>
      <div className="flex flex-col gap-8">
        <div className="hero-fog rounded-lg">
          <Image
            src="/images/pages/login-reading.png"
            alt="A hooded figure reads tarot cards by candlelight, a cat curled beside them"
            width={1600}
            height={900}
            className="w-full rounded-lg shadow-glow-purple"
          />
        </div>
        <LoginForm />
      </div>
    </PageShell>
  );
}
