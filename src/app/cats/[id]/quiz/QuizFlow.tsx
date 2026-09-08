"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { QuizQuestion } from "@/content/quiz";
import { Button } from "@/components/ui/Button";
import { QuizProgress } from "@/components/ui/QuizProgress";
import { useToast } from "@/components/ui/Toast";

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
      <div className="flex flex-col gap-2">
        {question.options.map((option) => {
          const isSelected = selected === option.id;
          return (
            <label
              key={option.id}
              className={`flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 font-ui transition-colors duration-150 ${
                isSelected
                  ? "border-gold-500 bg-bg-elevated shadow-glow-gold-sm"
                  : "border-border-hairline hover:border-border-hairline-strong"
              }`}
            >
              <input
                type="radio"
                name={question.id}
                checked={isSelected}
                onChange={() => selectOption(option.id)}
                className="accent-gold-500"
              />
              {option.label}
            </label>
          );
        })}
      </div>
      <div className="flex justify-between">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0}
        >
          Back
        </Button>
        {isLastStep ? (
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!selected || submitting}
          >
            {submitting ? "Submitting…" : "Get diagnosis"}
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
