import { diagnosisPool } from "@/content/diagnoses";

/** Maps a stored Diagnosis row's text back to its content-pool entry's
 * illustration. Matching on the text itself (rather than storing an index/
 * id in the DB) is safe because diagnosisText is always written verbatim
 * from diagnosisPool (see getDiagnosis.ts) — no schema change needed for a
 * purely visual addition. Returns undefined for content that predates
 * WP2's image field or doesn't match (never happens in practice, but keeps
 * callers honest about the optional case). */
export function getDiagnosisImage(diagnosisText: string): string | undefined {
  return diagnosisPool.find((entry) => entry.diagnosisText === diagnosisText)
    ?.image;
}
