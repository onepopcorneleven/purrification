"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function AddCatForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [traits, setTraits] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
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
        setError(data.error ?? "Something went wrong. Try again.");
        return;
      }
      setName("");
      setTraits("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
    >
      <label>
        Name
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ display: "block", width: "100%" }}
        />
      </label>
      <label>
        Traits (comma-separated, optional)
        <input
          value={traits}
          onChange={(e) => setTraits(e.target.value)}
          placeholder="playful, cuddly, chaos gremlin"
          style={{ display: "block", width: "100%" }}
        />
      </label>
      {error && (
        <p role="alert" style={{ color: "crimson" }}>
          {error}
        </p>
      )}
      <button type="submit" disabled={submitting}>
        {submitting ? "Adding…" : "Add cat"}
      </button>
    </form>
  );
}
