"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { QuizProgress } from "@/components/ui/QuizProgress";
import { FramedImage } from "@/components/ui/FramedImage";
import { useToast } from "@/components/ui/Toast";

// R-CONTENT-1: question content is DB-backed (see prisma/schema.prisma's
// Question/AnswerOption models) — this is the shape the quiz page maps
// those rows into, not a re-export of a static content file anymore.
interface QuizQuestion {
  id: string;
  prompt: string;
  // Phase 22: the question's topic illustration (QuestionTopic.imagePath),
  // shown above the prompt — purely decorative, never touches the
  // select/confirm/divine state machine below.
  topicImage?: string;
  options: { id: string; label: string }[];
}

// Phase 18 (workplan.md): mirrors globals.css's --duration-divination/
// --duration-divination-final — these drive the JS timers below, the CSS
// custom properties drive the matching visual pacing; keep both in sync if
// either changes.
const DIVINATION_MS = 2000;
const DIVINATION_FINAL_MS = 5000;

const DIVINING_LINES = [
  "Reading the signs…",
  "The cards are turning…",
  "Consulting the pattern…",
  "The threads are aligning…",
];

const RECEPTION_LINES = [
  "Your cat's answers are gathering into a single reading…",
  "The reading is arriving…",
];

function randomOf(pool: string[]): string {
  return pool[Math.floor(Math.random() * pool.length)];
}

type Transition = "none" | "divining" | "reception";

export function QuizFlow({
  catId,
  questions,
}: {
  catId: string;
  questions: QuizQuestion[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  // Phase 18: a selected answer only becomes "confirmed" (and advances) on
  // a *second* click of the same, already-selected option — see
  // docs/workplan.md's Phase 18 for the full interaction spec.
  const [confirmed, setConfirmed] = useState(false);
  const [transition, setTransition] = useState<Transition>("none");
  const [transitionLine, setTransitionLine] = useState(DIVINING_LINES[0]);

  const question = questions[step];
  const isLastStep = step === questions.length - 1;
  const selected = answers[question.id];
  const busy = transition !== "none";

  function selectOption(optionId: string) {
    if (busy) return;
    if (selected !== optionId) {
      // First click on a new option (or switching away from the current
      // one before confirming it) — select only, never auto-confirms.
      setAnswers((prev) => ({ ...prev, [question.id]: optionId }));
      setConfirmed(false);
      return;
    }
    if (!confirmed) {
      // Second click on the same, already-selected option — confirms it
      // and is the advance action itself; there is no separate "Next".
      setConfirmed(true);
      beginTransition();
    }
  }

  function beginTransition() {
    if (isLastStep) {
      setTransitionLine(randomOf(RECEPTION_LINES));
      setTransition("reception");
      void receiveDiagnosis();
      return;
    }
    setTransitionLine(randomOf(DIVINING_LINES));
    setTransition("divining");
    window.setTimeout(() => {
      setStep((s) => s + 1);
      setConfirmed(false);
      setTransition("none");
    }, DIVINATION_MS);
  }

  // The last question's confirm gates the real diagnosis request behind
  // the same dramatic pause the mid-quiz questions get, just longer and
  // more elaborate (Phase 18) — navigation waits for whichever finishes
  // last, the animation's minimum duration or the real fetch, so a slow
  // request never cuts the moment short and a fast one never feels rushed.
  async function receiveDiagnosis() {
    const minWait = new Promise<void>((resolve) =>
      window.setTimeout(resolve, DIVINATION_FINAL_MS),
    );
    try {
      const [res] = await Promise.all([
        fetch(`/api/cats/${catId}/quiz`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answers: questions.map((q) => ({
              questionId: q.id,
              optionId: answers[q.id],
            })),
          }),
        }),
        minWait,
      ]);
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error ?? "Something went wrong. Try again.", "error");
        setTransition("none");
        setConfirmed(false);
        return;
      }
      router.push(`/results/${data.diagnosis.id}`);
    } catch {
      showToast("Something went wrong. Try again.", "error");
      setTransition("none");
      setConfirmed(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <QuizProgress step={step} total={questions.length} />
      {transition === "none" ? (
        <div key={question.id} className="flex flex-col gap-3">
          {question.topicImage && (
            <FramedImage
              variant="portal"
              src={`/images/topics/${question.topicImage}`}
              alt=""
              label="View larger illustration for this topic"
              width={480}
              height={600}
              sizes="(min-width: 640px) 480px, 100vw"
              className="mx-auto w-full max-w-md"
            />
          )}
          <h2 className="font-heading text-xl">{question.prompt}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {question.options.map((option) => {
              const isSelected = selected === option.id;
              const isConfirmed = isSelected && confirmed;
              return (
                <label
                  key={option.id}
                  className={`relative flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border px-4 py-5 text-center font-ui transition-all duration-300 ease-dreamy has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gold-500 has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-bg-base ${
                    isConfirmed
                      ? "animate-glow-pulse border-gold-500 bg-gold-500 text-text-on-gold"
                      : isSelected
                        ? "animate-glow-pulse border-gold-500 bg-bg-elevated"
                        : "border-border-hairline bg-bg-raised hover:-translate-y-0.5 hover:border-border-hairline-strong hover:shadow-glow-gold-sm"
                  }`}
                >
                  <input
                    type="radio"
                    name={question.id}
                    checked={isSelected}
                    // Phase 18: a native radio only fires onChange when its
                    // checked state actually flips — clicking an
                    // already-checked radio again fires no change event at
                    // all, in any browser, so the confirm gesture's second
                    // click can never reach selectOption through onChange
                    // alone (the bug this shipped with). onClick, on the
                    // *input itself*, fires exactly once per real click
                    // regardless of whether checked changed — verified
                    // against jsdom's real click/label-activation event
                    // model, not just reasoned about, since a first attempt
                    // at this fix (onClick on the wrapping <label>) turned
                    // out to double-fire per click: a label's default
                    // click-activation behavior forwards a second, bubbling
                    // click event to its associated control, so a listener
                    // on the label itself catches both the original click
                    // and that forwarded one. onChange is kept alongside as
                    // a harmless, idempotent second path (see selectOption)
                    // for any keyboard/assistive-tech flow that changes
                    // `checked` without synthesizing a click.
                    onClick={() => selectOption(option.id)}
                    onChange={() => selectOption(option.id)}
                    className="sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className={`h-2 w-2 rotate-45 border transition-colors duration-300 ${
                      isConfirmed
                        ? "border-text-on-gold bg-text-on-gold"
                        : isSelected
                          ? "border-gold-500 bg-gold-500"
                          : "border-gold-500 bg-transparent opacity-50"
                    }`}
                  />
                  <span>{option.label}</span>
                </label>
              );
            })}
          </div>
          <p className="font-ui text-xs text-text-muted">
            Tap an answer, then tap it again to confirm.
          </p>
        </div>
      ) : (
        <div
          role="status"
          aria-live="polite"
          className={`divining-overlay animate-fade-in flex min-h-56 flex-col items-center justify-center gap-4 rounded-lg border border-border-hairline bg-bg-raised px-6 py-10 text-center ${
            transition === "reception" ? "divining-overlay--final" : ""
          }`}
        >
          <span
            className={`toast-flame ${transition === "reception" ? "divining-flame--final" : ""}`}
          >
            <svg
              width={transition === "reception" ? 22 : 14}
              height={transition === "reception" ? 30 : 18}
              viewBox="0 0 12 16"
              fill="none"
            >
              <path
                d="M6 0C6 0 1.5 5.5 1.5 9.2C1.5 11.9 3.5 14 6 14C8.5 14 10.5 11.9 10.5 9.2C10.5 5.5 6 0 6 0Z"
                fill="currentColor"
              />
            </svg>
          </span>
          {transition === "reception" && (
            /* eslint-disable-next-line @next/next/no-img-element -- a tiny
                decorative SVG preview; next/image's optimizer doesn't apply
                to it (same reasoning as ReadingOverview's seal stamp). */
            <img
              src="/icons/seal-of-completion.svg"
              alt=""
              aria-hidden="true"
              className="divining-seal-preview h-10 w-10"
            />
          )}
          <p className="font-heading text-lg text-gold-300">{transitionLine}</p>
        </div>
      )}
      <div className="flex justify-between">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0 || busy}
        >
          Back
        </Button>
      </div>
    </div>
  );
}
