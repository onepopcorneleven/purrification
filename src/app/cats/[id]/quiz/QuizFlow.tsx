"use client";

import { useEffect, useState } from "react";
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
  // select/confirm/advance state machine below.
  topicImage?: string;
  options: { id: string; label: string }[];
}

// Phase 24 (workplan.md) mirrors globals.css's --duration-question-shift/
// --duration-divination-final — these drive the JS timers below, the CSS
// durations drive the matching visual pacing; keep both in sync if either
// changes. QUESTION_SHIFT_MS replaces Phase 18's DIVINATION_MS (2000ms,
// a full-screen held overlay) with the lighter in-place slide-crossfade's
// duration; RECEPTION_MS (the last question's longer, more elaborate
// pause gating the real diagnosis request) is unchanged from Phase 18.
//
// Refinement (same day): the picture/prompt/answers blocks below each
// carry their own slightly different transition-duration and a small
// staggered start (`.quiz-block--picture/--prompt/--answers` in
// globals.css), rather than one shared duration on a single wrapper, so
// the quiz reads as three independent blocks shifting rather than one
// full-page swap. QUESTION_SHIFT_MS is the worst case across all three
// (the answers block's 80ms delay + 360ms duration) — the step only
// advances once every block has actually finished leaving.
//
// DEBUG (temporary): 2800ms instead of the real 440ms, matching
// globals.css's exaggerated per-block durations/delays (1000ms delay +
// 1800ms duration for the answers block) so the cascade is visible to the
// eye. Revert to 440ms once confirmed — see the phase doc's "Debug
// visibility pass" note.
const QUESTION_SHIFT_MS = 2800;
const RECEPTION_MS = 5000;

const WHISPER_LINES = [
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

// Phase 24: replaces Phase 18's "none" | "divining" | "reception" — the
// mid-quiz "divining" overlay is gone, so there are only two moments left
// that ever block interaction: sliding out of a confirmed non-final
// answer ("leaving"), and the last question's unchanged "reception" pause.
type Phase = "answering" | "leaving" | "reception";

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
  const [phase, setPhase] = useState<Phase>("answering");
  // Shown in the hint line while phase === "leaving", or in the reception
  // overlay while phase === "reception" — the two are mutually exclusive,
  // so one piece of state can serve both.
  const [line, setLine] = useState(WHISPER_LINES[0]);
  // Bugfix (same day): the entering blocks start in their pre-entrance
  // offset position (`.quiz-block--pending`) and this flips to false a
  // double-`requestAnimationFrame` after each question mounts, so the
  // browser commits the offset as a real paint before the change back to
  // resting — otherwise the two states can collapse into one frame and
  // skip the transition entirely. See globals.css's `.quiz-block` comment
  // for why this uses a transition (two states + a JS-driven flip) rather
  // than the `@keyframes` animation this originally shipped with.
  const [pending, setPending] = useState(true);
  // Resets `pending` to true whenever `step` changes, using React's
  // documented "adjust state during render" pattern (not an effect) —
  // https://react.dev/reference/react/useState#storing-information-from-previous-renders
  // — since the effect below must only ever *read* `pending`, not also
  // set it synchronously, to avoid the extra cascading render that'd
  // trigger (and the react-hooks/set-state-in-effect lint rule flags).
  const [prevStep, setPrevStep] = useState(step);
  if (step !== prevStep) {
    setPrevStep(step);
    setPending(true);
  }

  useEffect(() => {
    if (!pending) return;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setPending(false));
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [pending]);

  // DEBUG (temporary): a visible on-page readout of prefers-reduced-motion,
  // added specifically because the mobile device reporting the still-broken
  // transition has no devtools console available to run
  // `matchMedia(...).matches` directly. Remove once diagnosed — see
  // docs/workplan/phase-24-quiz-transition-crossfade.md's "Mobile debug
  // readout" note.
  const [reducedMotionDebug, setReducedMotionDebug] = useState<string | null>(
    null,
  );
  useEffect(() => {
    // A one-time read of a browser-only API (matchMedia) on mount, the
    // standard SSR-safe way to bridge external browser state into React
    // state; this whole debug readout is deleted once diagnosed, not
    // worth a useSyncExternalStore rewrite for something this temporary.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReducedMotionDebug(
      String(window.matchMedia("(prefers-reduced-motion: reduce)").matches),
    );
  }, []);

  const question = questions[step];
  const isLastStep = step === questions.length - 1;
  const selected = answers[question.id];
  const busy = phase !== "answering";
  const blockModifier =
    phase === "leaving"
      ? "quiz-block--leaving"
      : pending
        ? "quiz-block--pending"
        : "";

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
      setLine(randomOf(RECEPTION_LINES));
      setPhase("reception");
      void receiveDiagnosis();
      return;
    }
    setLine(randomOf(WHISPER_LINES));
    setPhase("leaving");
    window.setTimeout(() => {
      setStep((s) => s + 1);
      setConfirmed(false);
      setPhase("answering");
    }, QUESTION_SHIFT_MS);
  }

  // The last question's confirm gates the real diagnosis request behind
  // the same themed pause it always has (Phase 18), unchanged by Phase
  // 24's lighter mid-quiz transition — navigation waits for whichever
  // finishes last, the animation's minimum duration or the real fetch, so
  // a slow request never cuts the moment short and a fast one never feels
  // rushed.
  async function receiveDiagnosis() {
    const minWait = new Promise<void>((resolve) =>
      window.setTimeout(resolve, RECEPTION_MS),
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
        setPhase("answering");
        setConfirmed(false);
        return;
      }
      router.push(`/results/${data.diagnosis.id}`);
    } catch {
      showToast("Something went wrong. Try again.", "error");
      setPhase("answering");
      setConfirmed(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {reducedMotionDebug !== null && (
        <p className="rounded bg-yellow-300 px-3 py-2 text-center font-mono text-sm font-bold text-black">
          DEBUG: prefers-reduced-motion = {reducedMotionDebug}
        </p>
      )}
      <QuizProgress step={step} total={questions.length} />
      {phase === "reception" ? (
        <div
          role="status"
          aria-live="polite"
          className="divining-overlay divining-overlay--final animate-fade-in flex min-h-56 flex-col items-center justify-center gap-4 rounded-lg border border-border-hairline bg-bg-raised px-6 py-10 text-center"
        >
          <span className="toast-flame divining-flame--final">
            <svg width={22} height={30} viewBox="0 0 12 16" fill="none">
              <path
                d="M6 0C6 0 1.5 5.5 1.5 9.2C1.5 11.9 3.5 14 6 14C8.5 14 10.5 11.9 10.5 9.2C10.5 5.5 6 0 6 0Z"
                fill="currentColor"
              />
            </svg>
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element -- a tiny
              decorative SVG preview; next/image's optimizer doesn't apply
              to it (same reasoning as DiagnosisCard's seal stamp). */}
          <img
            src="/icons/seal-of-completion.svg"
            alt=""
            aria-hidden="true"
            className="divining-seal-preview h-10 w-10"
          />
          <p className="font-heading text-lg text-gold-300">{line}</p>
        </div>
      ) : (
        <div key={question.id} className="flex flex-col gap-3">
          {question.topicImage && (
            <div className={`quiz-block quiz-block--picture ${blockModifier}`}>
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
            </div>
          )}
          <h2
            className={`quiz-block quiz-block--prompt font-heading text-xl ${blockModifier}`}
          >
            {question.prompt}
          </h2>
          <div
            className={`quiz-block quiz-block--answers flex flex-col gap-3 ${blockModifier}`}
          >
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
                          ? "mark-confirm-spin border-text-on-gold bg-text-on-gold"
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
            <p className="flex items-center justify-center gap-1.5 font-ui text-xs text-text-muted">
              {phase === "leaving" ? (
                <>
                  <span className="toast-flame" aria-hidden="true">
                    <svg width={10} height={13} viewBox="0 0 12 16" fill="none">
                      <path
                        d="M6 0C6 0 1.5 5.5 1.5 9.2C1.5 11.9 3.5 14 6 14C8.5 14 10.5 11.9 10.5 9.2C10.5 5.5 6 0 6 0Z"
                        fill="currentColor"
                      />
                    </svg>
                  </span>
                  <span className="italic text-gold-300">{line}</span>
                </>
              ) : (
                "Tap an answer, then tap it again to confirm."
              )}
            </p>
          </div>
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
