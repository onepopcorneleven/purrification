"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Cat {
  id: string;
  name: string;
  traits: string[];
}

export function CatList({ cats }: { cats: Cat[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(cat: Cat) {
    const confirmed = window.confirm(
      `Delete ${cat.name}? This also deletes all of their quiz history and diagnoses, including any share links. This can't be undone.`,
    );
    if (!confirmed) return;

    setDeletingId(cat.id);
    try {
      await fetch(`/api/cats/${cat.id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  if (cats.length === 0) {
    return <p>No cats yet — add your first one below.</p>;
  }

  return (
    <ul style={{ listStyle: "none", padding: 0 }}>
      {cats.map((cat) => (
        <li
          key={cat.id}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0.5rem 0",
            borderBottom: "1px solid #eee",
          }}
        >
          <span>
            <strong>{cat.name}</strong>
            {cat.traits.length > 0 && (
              <span style={{ color: "#666" }}> — {cat.traits.join(", ")}</span>
            )}
          </span>
          <span style={{ display: "flex", gap: "0.5rem" }}>
            <Link href={`/cats/${cat.id}/quiz`}>Take the quiz</Link>
            <Link href={`/cats/${cat.id}/history`}>History</Link>
            <button
              type="button"
              onClick={() => handleDelete(cat)}
              disabled={deletingId === cat.id}
            >
              {deletingId === cat.id ? "Deleting…" : "Delete"}
            </button>
          </span>
        </li>
      ))}
    </ul>
  );
}
