import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/guard";
import { getOwnedDiagnosis } from "@/lib/diagnosis/loadOwnedDiagnosis";
import { pickStableImage } from "@/lib/diagnosis/engine";

// Phase 23: backs ReadingQuickView, opened per row of the per-cat history
// list. Fetched on demand (when a row's modal opens), not eagerly joined
// onto the history list's own query — see
// docs/workplan/phase-23-image-experience-redesign.md's "Data loading and
// ownership checks" for why that over-fetching was worth avoiding.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const diagnosis = await getOwnedDiagnosis(id, user.id);
  if (!diagnosis) {
    return NextResponse.json({ error: "Reading not found." }, { status: 404 });
  }

  return NextResponse.json({
    catName: diagnosis.quizAttempt.cat.name,
    diagnosis: {
      nameMystical: diagnosis.diagnosisDef.nameMystical,
      teaser: diagnosis.diagnosisText,
      image: pickStableImage(
        diagnosis.diagnosisDef.images.map((img) => img.path),
        diagnosis.id,
      ),
    },
    treatment: {
      nameMystical: diagnosis.treatment.nameMystical,
      teaser: diagnosis.ritualText,
      image: pickStableImage(
        diagnosis.treatment.images.map((img) => img.path),
        diagnosis.id,
      ),
    },
  });
}
