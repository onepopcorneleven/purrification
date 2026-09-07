"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { QuizQuestion } from "@/content/quiz";

export function QuizFlow({
  catId,
  questions,
}: {
  catId: string;
  questions: QuizQuestion[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const question = questions[step];
  const isLastStep = step === questions.length - 1;
  const selected = answers[question.id];

  function selectOption(optionId: string) {
    setAnswers((prev) => ({ ...prev, [question.id]: optionId }));
  }

  async function handleSubmit() {
    setError(null);
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
        setError(data.error ?? "Something went wrong. Try again.");
        return;
      }
      router.push(`/results/${data.diagnosis.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <p style={{ color: "#666" }}>
        Question {step + 1} of {questions.length}
      </p>
      <h2>{question.prompt}</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {question.options.map((option) => (
          <label key={option.id} style={{ display: "flex", gap: "0.5rem" }}>
            <input
              type="radio"
              name={question.id}
              checked={selected === option.id}
              onChange={() => selectOption(option.id)}
            />
            {option.label}
          </label>
        ))}
      </div>
      {error && (
        <p role="alert" style={{ color: "crimson" }}>
          {error}
        </p>
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "1rem",
        }}
      >
        <button
          type="button"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0}
        >
          Back
        </button>
        {isLastStep ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!selected || submitting}
          >
            {submitting ? "Submitting…" : "Get diagnosis"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={!selected}
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
