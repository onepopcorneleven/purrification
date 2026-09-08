"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

interface Cat {
  id: string;
  name: string;
  traits: string[];
}

export function CatList({ cats }: { cats: Cat[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [catPendingDelete, setCatPendingDelete] = useState<Cat | null>(null);

  async function confirmDelete() {
    const cat = catPendingDelete;
    if (!cat) return;
    setCatPendingDelete(null);

    setDeletingId(cat.id);
    try {
      const res = await fetch(`/api/cats/${cat.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      showToast(`${cat.name} was removed.`, "success");
      router.refresh();
    } catch {
      showToast(`Couldn't delete ${cat.name} — please try again.`, "error");
    } finally {
      setDeletingId(null);
    }
  }

  if (cats.length === 0) {
    return <p>No cats yet — add your first one below.</p>;
  }

  return (
    <>
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
                <span style={{ color: "#666" }}>
                  {" "}
                  — {cat.traits.join(", ")}
                </span>
              )}
            </span>
            <span style={{ display: "flex", gap: "0.5rem" }}>
              <Link href={`/cats/${cat.id}/quiz`}>Take the quiz</Link>
              <Link href={`/cats/${cat.id}/history`}>History</Link>
              <button
                type="button"
                onClick={() => setCatPendingDelete(cat)}
                disabled={deletingId === cat.id}
              >
                {deletingId === cat.id ? "Deleting…" : "Delete"}
              </button>
            </span>
          </li>
        ))}
      </ul>

      <Modal
        open={catPendingDelete !== null}
        onClose={() => setCatPendingDelete(null)}
        title={`Delete ${catPendingDelete?.name ?? ""}?`}
      >
        <p className="text-sm text-text-secondary">
          This also deletes all of their quiz history and diagnoses, including
          any share links. This can&apos;t be undone.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setCatPendingDelete(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            Delete
          </Button>
        </div>
      </Modal>
    </>
  );
}
