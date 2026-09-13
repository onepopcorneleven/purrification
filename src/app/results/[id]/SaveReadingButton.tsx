"use client";

import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

/** The overview page's primary CTA (Phase 23). No new persistence — every
 * `QuizAttempt`+`Diagnosis` is already created atomically at quiz-submission
 * time (see CLAUDE.md's "Diagnosis/ritual generation" note), so there is
 * nothing new to actually save; this affirms that already-true state rather
 * than triggering a new write. Carries the retuned (4200ms) `glow-pulse` —
 * see docs/workplan/phase-23-image-experience-redesign.md's "Motion
 * changes". */
export function SaveReadingButton() {
  const { showToast } = useToast();
  return (
    <Button
      type="button"
      onClick={() => showToast("This reading is saved to your account.")}
      className="animate-glow-pulse"
    >
      Save this Reading
    </Button>
  );
}
