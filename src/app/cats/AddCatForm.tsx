"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

export function AddCatForm() {
  const router = useRouter();
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [traits, setTraits] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/cats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          traits: traits
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error ?? "Something went wrong. Try again.", "error");
        return;
      }
      setName("");
      setTraits("");
      showToast(`${name} was added.`, "success");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field
        label="Name"
        name="name"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Field
        label="Traits (comma-separated, optional)"
        name="traits"
        value={traits}
        onChange={(e) => setTraits(e.target.value)}
        placeholder="playful, cuddly, chaos gremlin"
      />
      <Button type="submit" disabled={submitting} className="self-start">
        {submitting ? "Adding…" : "Add cat"}
      </Button>
    </form>
  );
}
