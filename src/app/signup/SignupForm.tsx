"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { TextLink } from "@/components/ui/TextLink";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ConstellationMark } from "@/components/ui/ConstellationMark";
import { useToast } from "@/components/ui/Toast";

export function SignupForm() {
  const router = useRouter();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error ?? "Something went wrong. Try again.", "error");
        return;
      }
      router.push("/cats");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <ConstellationMark className="text-gold-500" />
      <h1 className="font-heading text-2xl">Sign up</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field
          label="Email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label="Password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" disabled={submitting} className="self-start">
          {submitting ? "Signing up…" : "Sign up"}
        </Button>
      </form>
      <p className="text-sm text-text-secondary">
        Already have an account?{" "}
        <TextLink href="/login" className="text-gold-300 hover:underline">
          Log in
        </TextLink>
      </p>
    </div>
  );
}
