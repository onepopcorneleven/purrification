-- Phase 21: image plumbing for Treatment and QuestionTopic (docs/workplan.md
-- Phase 21, docs/workplan/phase-21-image-enrichment.md). Unlike Phase 13 and
-- Phase 15's migrations, this is purely additive — a new table and a new
-- nullable column, nothing existing to backfill or contract, since no prior
-- column is being replaced:
--   - TreatmentImage: an ordered pool of candidate images for a Treatment,
--     mirroring DiagnosisDefImage (Phase 15) exactly.
--   - QuestionTopic.imagePath: a single nullable scalar column, one
--     illustration per topic.
-- Zero images are seeded by this phase (see that doc's Decisions #6) — both
-- ship empty/null everywhere, populated by a later follow-up phase.

-- CreateTable
CREATE TABLE "TreatmentImage" (
    "treatmentId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "TreatmentImage_pkey" PRIMARY KEY ("treatmentId","sortOrder")
);

-- AddForeignKey
ALTER TABLE "TreatmentImage" ADD CONSTRAINT "TreatmentImage_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "Treatment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "QuestionTopic" ADD COLUMN "imagePath" TEXT;
