"use client";

import { TextLink } from "@/components/ui/TextLink";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
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
    return (
      <EmptyState
        illustrated
        title="No cats yet"
        description="Add your first one below to take their spiritual reading."
      />
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {cats.map((cat, i) => (
          <Card
            key={cat.id}
            className="animate-fade-in flex flex-wrap items-center justify-between gap-3 transition-transform duration-300 ease-dreamy hover:-translate-y-0.5 hover:shadow-glow-gold-sm"
            style={{ animationDelay: `${i * 90}ms` }}
          >
            <div>
              <p className="font-heading text-lg text-text-primary">
                {cat.name}
              </p>
              {cat.traits.length > 0 && (
                <p className="text-sm text-text-muted">
                  {cat.traits.join(", ")}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <TextLink
                href={`/cats/${cat.id}/quiz`}
                className="font-ui text-sm text-gold-300 hover:underline"
              >
                Take the quiz
              </TextLink>
              <TextLink
                href={`/cats/${cat.id}/history`}
                className="font-ui text-sm text-gold-300 hover:underline"
              >
                History
              </TextLink>
              <Button
                variant="danger"
                onClick={() => setCatPendingDelete(cat)}
                disabled={deletingId === cat.id}
              >
                {deletingId === cat.id ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </Card>
        ))}
      </div>

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
