type QuizProgressProps = {
  step: number;
  total: number;
};

/** Quiz-step progress indicator — see docs/design-system.md's component
 * inventory. A row of gold dots, filled up to the current step. */
export function QuizProgress({ step, total }: QuizProgressProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 w-6 rounded-full transition-colors duration-300 ${
              i <= step ? "bg-gold-500" : "bg-border-hairline"
            }`}
          />
        ))}
      </div>
      <p className="font-ui text-sm text-text-muted">
        Question {step + 1} of {total}
      </p>
    </div>
  );
}
