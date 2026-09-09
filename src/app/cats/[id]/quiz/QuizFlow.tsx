"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { QuizProgress } from "@/components/ui/QuizProgress";
import { useToast } from "@/components/ui/Toast";

// R-CONTENT-1: question content is DB-backed (see prisma/schema.prisma's
// Question/AnswerOption models) — this is the shape the quiz page maps
// those rows into, not a re-export of a static content file anymore.
interface QuizQuestion {
  id: string;
  prompt: string;
  options: { id: string; label: string }[];
}

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
  const [submitting, setSubmitting] = useState(false);

  const question = questions[step];
  const isLastStep = step === questions.length - 1;
  const selected = answers[question.id];

  function selectOption(optionId: string) {
    setAnswers((prev) => ({ ...prev, [question.id]: optionId }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/cats/${catId}/quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: questions.map((q) => ({
            questionId: q.id,
            optionId: answers[q.id],
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error ?? "Something went wrong. Try again.", "error");
        return;
      }
      router.push(`/results/${data.diagnosis.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <QuizProgress step={step} total={questions.length} />
      <h2 className="font-heading text-xl">{question.prompt}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {question.options.map((option) => {
          const isSelected = selected === option.id;
          return (
            <label
              key={option.id}
              className={`relative flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border px-4 py-5 text-center font-ui transition-all duration-300 ease-dreamy has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gold-500 has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-bg-base ${
                isSelected
                  ? "animate-glow-pulse border-gold-500 bg-bg-elevated"
                  : "border-border-hairline bg-bg-raised hover:-translate-y-0.5 hover:border-border-hairline-strong hover:shadow-glow-gold-sm"
              }`}
            >
              <input
                type="radio"
                name={question.id}
                checked={isSelected}
                onChange={() => selectOption(option.id)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={`h-2 w-2 rotate-45 border border-gold-500 transition-colors duration-300 ${
                  isSelected ? "bg-gold-500" : "bg-transparent opacity-50"
                }`}
              />
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>
      {submitting && (
        <p
          role="status"
          className="animate-fade-in font-ui text-sm text-gold-300"
        >
          The cards are turning over your answers…
        </p>
      )}
      <div className="flex justify-between">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0 || submitting}
        >
          Back
        </Button>
        {isLastStep ? (
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!selected || submitting}
            className={submitting ? "animate-glow-pulse" : ""}
          >
            {submitting ? "Consulting the cards…" : "Get diagnosis"}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={!selected}
          >
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
