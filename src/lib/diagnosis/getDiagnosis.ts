import { diagnosisPool, type DiagnosisEntry } from "@/content/diagnoses";

// R-DIAG-5: getDiagnosis must be total — every possible answer combination
// resolves to some entry, so a QuizAttempt can never fail to produce a
// Diagnosis. Enforced by a startup assertion (not a check on every call)
// per architecture.md's Diagnosis engine section.
if (diagnosisPool.length === 0) {
  throw new Error("diagnosisPool must have at least one entry (R-DIAG-5)");
}

export interface QuizAnswer {
  questionId: string;
  optionId: string;
}

// A plain string hash (djb2) — deterministic and dependency-free, which is
// all a bucket index needs. Not used for anything security-sensitive.
function hashString(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return hash >>> 0;
}

export function getDiagnosis(answers: QuizAnswer[]): DiagnosisEntry {
  const key = [...answers]
    .sort((a, b) => a.questionId.localeCompare(b.questionId))
    .map((a) => `${a.questionId}:${a.optionId}`)
    .join("|");
  const index = hashString(key) % diagnosisPool.length;
  return diagnosisPool[index];
}
