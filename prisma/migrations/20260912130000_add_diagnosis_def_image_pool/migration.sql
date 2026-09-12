-- Phase 15: diagnosis image pool (docs/workplan.md Phase 15,
-- docs/content/content-storage-architecture.md). Changes DiagnosisDef's
-- single-image model (`imagePath String?`) to a one-to-many pool
-- (`DiagnosisDefImage`), so a result's illustration can be picked
-- deterministically from several candidates instead of always being the one
-- image on the DiagnosisDef row. Same expand -> backfill -> contract,
-- single-transaction pattern as Phase 13's 20260908130000_add_content_model
-- (cited in CLAUDE.md) — this project's standard for a schema change that
-- must not break existing rows:
--   1. create DiagnosisDefImage (expand)
--   2. backfill one row per existing non-null DiagnosisDef.imagePath, at
--      sortOrder 0 (backfill)
--   3. drop DiagnosisDef.imagePath (contract)
-- As of this migration, every active DiagnosisDef.imagePath in production is
-- already NULL (see docs/workplan.md Phase 17 — Phase 14's content rewrite
-- shipped without image assignments), so step 2 is expected to backfill 0
-- rows; this migration only changes shape, it does not itself populate any
-- images — that's Phase 17's job.

-- CreateTable
CREATE TABLE "DiagnosisDefImage" (
    "diagnosisDefId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "DiagnosisDefImage_pkey" PRIMARY KEY ("diagnosisDefId","sortOrder")
);

-- AddForeignKey
ALTER TABLE "DiagnosisDefImage" ADD CONSTRAINT "DiagnosisDefImage_diagnosisDefId_fkey" FOREIGN KEY ("diagnosisDefId") REFERENCES "DiagnosisDef"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: one row per existing non-null imagePath, preserved at sortOrder 0.
INSERT INTO "DiagnosisDefImage" ("diagnosisDefId", "path", "sortOrder")
SELECT "id", "imagePath", 0 FROM "DiagnosisDef" WHERE "imagePath" IS NOT NULL;

-- DropColumn
ALTER TABLE "DiagnosisDef" DROP COLUMN "imagePath";
