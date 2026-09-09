-- Phase 13: content storage foundation (docs/content/content-storage-
-- architecture.md, docs/workplan.md Phase 13). Adds the Question/Tag/
-- DiagnosisDef/Treatment/Ritual content model and wires the existing
-- Diagnosis (runtime result) row to it by stable id instead of free text.
--
-- Safety note: production already has real Diagnosis rows (this app has
-- been live and smoke-tested since Phase 9), so the five new Diagnosis
-- columns can't simply be declared NOT NULL in one step — Postgres would
-- reject the ALTER outright against existing rows. This migration follows
-- the standard expand -> backfill -> contract pattern, all in one
-- transaction (Prisma wraps a single migration.sql in one transaction, so
-- this is atomic — either the whole migration lands, in a fully consistent
-- state, or none of it does):
--   1. create every new content table
--   2. insert this phase's placeholder content (mirrors prisma/seed/
--      content/*.json exactly, so `npm run db:seed-content` is a no-op
--      against it afterward — see that directory's README-equivalent
--      comment in prisma/seed/index.ts)
--   3. add the new Diagnosis columns as NULLABLE
--   4. backfill every existing Diagnosis row by matching its diagnosisText
--      against the placeholder DiagnosisDef.descriptionTemplate it
--      originated from (safe because Phase 13's placeholder content
--      preserves every diagnosisText/ritualText string verbatim from the
--      old src/content/diagnoses.ts — see that step's own comment below for
--      what's deliberately NOT reconstructed)
--   5. tighten the new columns to NOT NULL and add their FK constraints
-- If step 4 ever fails to match a row (it shouldn't — see the verification
-- run in docs/workplan.md Phase 13), step 5's NOT NULL constraint fails
-- loudly and the whole transaction rolls back rather than silently leaving
-- an inconsistent row.

-- CreateEnum
CREATE TYPE "QuestionInputType" AS ENUM ('SINGLE_SELECT', 'MULTI_SELECT', 'SCALE');

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionTopic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "promptMystical" TEXT NOT NULL,
    "promptPlain" TEXT NOT NULL,
    "inputType" "QuestionInputType" NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnswerOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "labelMystical" TEXT NOT NULL,
    "labelPlain" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnswerOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnswerOptionTagEffect" (
    "answerOptionId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "weight" INTEGER NOT NULL,

    CONSTRAINT "AnswerOptionTagEffect_pkey" PRIMARY KEY ("answerOptionId","tagId")
);

-- CreateTable
CREATE TABLE "Treatment" (
    "id" TEXT NOT NULL,
    "nameMystical" TEXT NOT NULL,
    "namePlain" TEXT NOT NULL,
    "philosophy" TEXT NOT NULL,
    "materialCategories" TEXT[],
    "typicalDuration" TEXT NOT NULL,
    "contraindications" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Treatment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosisDef" (
    "id" TEXT NOT NULL,
    "nameMystical" TEXT NOT NULL,
    "namePlain" TEXT NOT NULL,
    "triggerRule" JSONB NOT NULL,
    "priority" INTEGER NOT NULL,
    "severityBands" JSONB NOT NULL,
    "descriptionTemplate" TEXT NOT NULL,
    "descriptionSlots" TEXT[],
    "symptomCallbackPool" TEXT[],
    "isCatchAll" BOOLEAN NOT NULL DEFAULT false,
    "imagePath" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiagnosisDef_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosisDefTreatment" (
    "diagnosisDefId" TEXT NOT NULL,
    "treatmentId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "DiagnosisDefTreatment_pkey" PRIMARY KEY ("diagnosisDefId","treatmentId")
);

-- CreateTable
CREATE TABLE "Ritual" (
    "id" TEXT NOT NULL,
    "parentTreatmentId" TEXT NOT NULL,
    "selectionConditions" JSONB NOT NULL,
    "priority" INTEGER NOT NULL,
    "titleTemplate" TEXT NOT NULL,
    "materials" TEXT[],
    "stepsTemplate" TEXT[],
    "incantationTemplate" TEXT,
    "aftercareNote" TEXT NOT NULL,
    "personalizationSlots" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ritual_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DiagnosisDefTreatment_diagnosisDefId_sortOrder_key" ON "DiagnosisDefTreatment"("diagnosisDefId", "sortOrder");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "QuestionTopic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerOption" ADD CONSTRAINT "AnswerOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerOptionTagEffect" ADD CONSTRAINT "AnswerOptionTagEffect_answerOptionId_fkey" FOREIGN KEY ("answerOptionId") REFERENCES "AnswerOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerOptionTagEffect" ADD CONSTRAINT "AnswerOptionTagEffect_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosisDefTreatment" ADD CONSTRAINT "DiagnosisDefTreatment_diagnosisDefId_fkey" FOREIGN KEY ("diagnosisDefId") REFERENCES "DiagnosisDef"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosisDefTreatment" ADD CONSTRAINT "DiagnosisDefTreatment_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "Treatment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ritual" ADD CONSTRAINT "Ritual_parentTreatmentId_fkey" FOREIGN KEY ("parentTreatmentId") REFERENCES "Treatment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Placeholder content seed data (docs/content/content-storage-architecture.md
-- §7/§8, docs/workplan.md Phase 13). Mirrors prisma/seed/content/*.json exactly
-- — generated once here so the app has working content immediately after this
-- migration, before anyone remembers to run `npm run db:seed-content`. That
-- script is idempotent (upsert-by-stable-id) and a no-op against identical
-- values, so it is safe to run on every subsequent deploy.

-- Tags
INSERT INTO "Tag" ("id", "description") VALUES ('mood_chill', 'Placeholder scaffolding tag for quiz.ts''s mood question, "chill" answer. Real tag vocabulary is Phase 14 work.');
INSERT INTO "Tag" ("id", "description") VALUES ('mood_hyper', 'Placeholder scaffolding tag for quiz.ts''s mood question, "hyper" answer.');
INSERT INTO "Tag" ("id", "description") VALUES ('mood_aloof', 'Placeholder scaffolding tag for quiz.ts''s mood question, "aloof" answer.');
INSERT INTO "Tag" ("id", "description") VALUES ('mood_dramatic', 'Placeholder scaffolding tag for quiz.ts''s mood question, "dramatic" answer.');
INSERT INTO "Tag" ("id", "description") VALUES ('napSpot_sunbeam', 'Placeholder scaffolding tag for quiz.ts''s napSpot question, "sunbeam" answer.');
INSERT INTO "Tag" ("id", "description") VALUES ('napSpot_box', 'Placeholder scaffolding tag for quiz.ts''s napSpot question, "box" answer.');
INSERT INTO "Tag" ("id", "description") VALUES ('napSpot_laptop', 'Placeholder scaffolding tag for quiz.ts''s napSpot question, "laptop" answer.');
INSERT INTO "Tag" ("id", "description") VALUES ('napSpot_weird', 'Placeholder scaffolding tag for quiz.ts''s napSpot question, "weird" answer.');
INSERT INTO "Tag" ("id", "description") VALUES ('homeChanges_furniture', 'Placeholder scaffolding tag for quiz.ts''s homeChanges question, "furniture" answer.');
INSERT INTO "Tag" ("id", "description") VALUES ('homeChanges_vacuum', 'Placeholder scaffolding tag for quiz.ts''s homeChanges question, "vacuum" answer.');
INSERT INTO "Tag" ("id", "description") VALUES ('homeChanges_guest', 'Placeholder scaffolding tag for quiz.ts''s homeChanges question, "guest" answer.');
INSERT INTO "Tag" ("id", "description") VALUES ('homeChanges_nothing', 'Placeholder scaffolding tag for quiz.ts''s homeChanges question, "nothing" answer.');
INSERT INTO "Tag" ("id", "description") VALUES ('mealtime_normal', 'Placeholder scaffolding tag for quiz.ts''s mealtime question, "normal" answer.');
INSERT INTO "Tag" ("id", "description") VALUES ('mealtime_picky', 'Placeholder scaffolding tag for quiz.ts''s mealtime question, "picky" answer.');
INSERT INTO "Tag" ("id", "description") VALUES ('mealtime_begging', 'Placeholder scaffolding tag for quiz.ts''s mealtime question, "begging" answer.');
INSERT INTO "Tag" ("id", "description") VALUES ('mealtime_ignoring', 'Placeholder scaffolding tag for quiz.ts''s mealtime question, "ignoring" answer.');
INSERT INTO "Tag" ("id", "description") VALUES ('vocalizing_silent', 'Placeholder scaffolding tag for quiz.ts''s vocalizing question, "silent" answer.');
INSERT INTO "Tag" ("id", "description") VALUES ('vocalizing_chatty', 'Placeholder scaffolding tag for quiz.ts''s vocalizing question, "chatty" answer.');
INSERT INTO "Tag" ("id", "description") VALUES ('vocalizing_yowling', 'Placeholder scaffolding tag for quiz.ts''s vocalizing question, "yowling" answer.');
INSERT INTO "Tag" ("id", "description") VALUES ('vocalizing_hissing', 'Placeholder scaffolding tag for quiz.ts''s vocalizing question, "hissing" answer.');

-- QuestionTopics
INSERT INTO "QuestionTopic" ("id", "name", "sortOrder") VALUES ('topic_mood', 'Mood & Temperament', 0);
INSERT INTO "QuestionTopic" ("id", "name", "sortOrder") VALUES ('topic_sleep', 'Sleep & Rest', 1);
INSERT INTO "QuestionTopic" ("id", "name", "sortOrder") VALUES ('topic_environment', 'Environment & Changes', 2);
INSERT INTO "QuestionTopic" ("id", "name", "sortOrder") VALUES ('topic_mealtime', 'Mealtime', 3);
INSERT INTO "QuestionTopic" ("id", "name", "sortOrder") VALUES ('topic_vocal', 'Vocal Behavior', 4);

-- Questions + AnswerOptions + AnswerOptionTagEffects
INSERT INTO "Question" ("id", "topicId", "promptMystical", "promptPlain", "inputType", "sortOrder") VALUES ('mood', 'topic_mood', 'How''s your cat''s mood been lately?', 'How''s your cat''s mood been lately?', 'SINGLE_SELECT'::"QuestionInputType", 0);
INSERT INTO "AnswerOption" ("id", "questionId", "labelMystical", "labelPlain", "sortOrder") VALUES ('chill', 'mood', 'Suspiciously chill', 'Suspiciously chill', 0);
INSERT INTO "AnswerOptionTagEffect" ("answerOptionId", "tagId", "weight") VALUES ('chill', 'mood_chill', 3);
INSERT INTO "AnswerOption" ("id", "questionId", "labelMystical", "labelPlain", "sortOrder") VALUES ('hyper', 'mood', 'Zooming around at 3am', 'Zooming around at 3am', 1);
INSERT INTO "AnswerOptionTagEffect" ("answerOptionId", "tagId", "weight") VALUES ('hyper', 'mood_hyper', 3);
INSERT INTO "AnswerOption" ("id", "questionId", "labelMystical", "labelPlain", "sortOrder") VALUES ('aloof', 'mood', 'Ignoring you on principle', 'Ignoring you on principle', 2);
INSERT INTO "AnswerOptionTagEffect" ("answerOptionId", "tagId", "weight") VALUES ('aloof', 'mood_aloof', 3);
INSERT INTO "AnswerOption" ("id", "questionId", "labelMystical", "labelPlain", "sortOrder") VALUES ('dramatic', 'mood', 'Emotionally unavailable', 'Emotionally unavailable', 3);
INSERT INTO "AnswerOptionTagEffect" ("answerOptionId", "tagId", "weight") VALUES ('dramatic', 'mood_dramatic', 3);
INSERT INTO "Question" ("id", "topicId", "promptMystical", "promptPlain", "inputType", "sortOrder") VALUES ('napSpot', 'topic_sleep', 'Where has your cat been napping most?', 'Where has your cat been napping most?', 'SINGLE_SELECT'::"QuestionInputType", 1);
INSERT INTO "AnswerOption" ("id", "questionId", "labelMystical", "labelPlain", "sortOrder") VALUES ('sunbeam', 'napSpot', 'In a sunbeam, like royalty', 'In a sunbeam, like royalty', 0);
INSERT INTO "AnswerOptionTagEffect" ("answerOptionId", "tagId", "weight") VALUES ('sunbeam', 'napSpot_sunbeam', 3);
INSERT INTO "AnswerOption" ("id", "questionId", "labelMystical", "labelPlain", "sortOrder") VALUES ('box', 'napSpot', 'A cardboard box that''s too small', 'A cardboard box that''s too small', 1);
INSERT INTO "AnswerOptionTagEffect" ("answerOptionId", "tagId", "weight") VALUES ('box', 'napSpot_box', 3);
INSERT INTO "AnswerOption" ("id", "questionId", "labelMystical", "labelPlain", "sortOrder") VALUES ('laptop', 'napSpot', 'Directly on your keyboard', 'Directly on your keyboard', 2);
INSERT INTO "AnswerOptionTagEffect" ("answerOptionId", "tagId", "weight") VALUES ('laptop', 'napSpot_laptop', 3);
INSERT INTO "AnswerOption" ("id", "questionId", "labelMystical", "labelPlain", "sortOrder") VALUES ('weird', 'napSpot', 'Somewhere structurally inexplicable', 'Somewhere structurally inexplicable', 3);
INSERT INTO "AnswerOptionTagEffect" ("answerOptionId", "tagId", "weight") VALUES ('weird', 'napSpot_weird', 3);
INSERT INTO "Question" ("id", "topicId", "promptMystical", "promptPlain", "inputType", "sortOrder") VALUES ('homeChanges', 'topic_environment', 'Any new objects or changes in the home recently?', 'Any new objects or changes in the home recently?', 'SINGLE_SELECT'::"QuestionInputType", 2);
INSERT INTO "AnswerOption" ("id", "questionId", "labelMystical", "labelPlain", "sortOrder") VALUES ('furniture', 'homeChanges', 'New furniture', 'New furniture', 0);
INSERT INTO "AnswerOptionTagEffect" ("answerOptionId", "tagId", "weight") VALUES ('furniture', 'homeChanges_furniture', 3);
INSERT INTO "AnswerOption" ("id", "questionId", "labelMystical", "labelPlain", "sortOrder") VALUES ('vacuum', 'homeChanges', 'The vacuum cleaner came out', 'The vacuum cleaner came out', 1);
INSERT INTO "AnswerOptionTagEffect" ("answerOptionId", "tagId", "weight") VALUES ('vacuum', 'homeChanges_vacuum', 3);
INSERT INTO "AnswerOption" ("id", "questionId", "labelMystical", "labelPlain", "sortOrder") VALUES ('guest', 'homeChanges', 'A guest visited', 'A guest visited', 2);
INSERT INTO "AnswerOptionTagEffect" ("answerOptionId", "tagId", "weight") VALUES ('guest', 'homeChanges_guest', 3);
INSERT INTO "AnswerOption" ("id", "questionId", "labelMystical", "labelPlain", "sortOrder") VALUES ('nothing', 'homeChanges', 'Nothing''s changed', 'Nothing''s changed', 3);
INSERT INTO "AnswerOptionTagEffect" ("answerOptionId", "tagId", "weight") VALUES ('nothing', 'homeChanges_nothing', 3);
INSERT INTO "Question" ("id", "topicId", "promptMystical", "promptPlain", "inputType", "sortOrder") VALUES ('mealtime', 'topic_mealtime', 'How''s mealtime going?', 'How''s mealtime going?', 'SINGLE_SELECT'::"QuestionInputType", 3);
INSERT INTO "AnswerOption" ("id", "questionId", "labelMystical", "labelPlain", "sortOrder") VALUES ('normal', 'mealtime', 'Business as usual', 'Business as usual', 0);
INSERT INTO "AnswerOptionTagEffect" ("answerOptionId", "tagId", "weight") VALUES ('normal', 'mealtime_normal', 3);
INSERT INTO "AnswerOption" ("id", "questionId", "labelMystical", "labelPlain", "sortOrder") VALUES ('picky', 'mealtime', 'Suddenly picky', 'Suddenly picky', 1);
INSERT INTO "AnswerOptionTagEffect" ("answerOptionId", "tagId", "weight") VALUES ('picky', 'mealtime_picky', 3);
INSERT INTO "AnswerOption" ("id", "questionId", "labelMystical", "labelPlain", "sortOrder") VALUES ('begging', 'mealtime', 'Begging like it''s never been fed', 'Begging like it''s never been fed', 2);
INSERT INTO "AnswerOptionTagEffect" ("answerOptionId", "tagId", "weight") VALUES ('begging', 'mealtime_begging', 3);
INSERT INTO "AnswerOption" ("id", "questionId", "labelMystical", "labelPlain", "sortOrder") VALUES ('ignoring', 'mealtime', 'Ignoring the bowl entirely', 'Ignoring the bowl entirely', 3);
INSERT INTO "AnswerOptionTagEffect" ("answerOptionId", "tagId", "weight") VALUES ('ignoring', 'mealtime_ignoring', 3);
INSERT INTO "Question" ("id", "topicId", "promptMystical", "promptPlain", "inputType", "sortOrder") VALUES ('vocalizing', 'topic_vocal', 'Any unusual vocalizing?', 'Any unusual vocalizing?', 'SINGLE_SELECT'::"QuestionInputType", 4);
INSERT INTO "AnswerOption" ("id", "questionId", "labelMystical", "labelPlain", "sortOrder") VALUES ('silent', 'vocalizing', 'Total silence', 'Total silence', 0);
INSERT INTO "AnswerOptionTagEffect" ("answerOptionId", "tagId", "weight") VALUES ('silent', 'vocalizing_silent', 3);
INSERT INTO "AnswerOption" ("id", "questionId", "labelMystical", "labelPlain", "sortOrder") VALUES ('chatty', 'vocalizing', 'Extra chatty', 'Extra chatty', 1);
INSERT INTO "AnswerOptionTagEffect" ("answerOptionId", "tagId", "weight") VALUES ('chatty', 'vocalizing_chatty', 3);
INSERT INTO "AnswerOption" ("id", "questionId", "labelMystical", "labelPlain", "sortOrder") VALUES ('yowling', 'vocalizing', 'Yowling at 3am for no reason', 'Yowling at 3am for no reason', 2);
INSERT INTO "AnswerOptionTagEffect" ("answerOptionId", "tagId", "weight") VALUES ('yowling', 'vocalizing_yowling', 3);
INSERT INTO "AnswerOption" ("id", "questionId", "labelMystical", "labelPlain", "sortOrder") VALUES ('hissing', 'vocalizing', 'Hissing at an empty corner', 'Hissing at an empty corner', 3);
INSERT INTO "AnswerOptionTagEffect" ("answerOptionId", "tagId", "weight") VALUES ('hissing', 'vocalizing_hissing', 3);

-- Treatments
INSERT INTO "Treatment" ("id", "nameMystical", "namePlain", "philosophy", "materialCategories", "typicalDuration", "contraindications") VALUES ('treat_mercury_retrograde', 'Mercury Retrograde Care', 'Mercury Retrograde Care', 'Give your cat space to recalibrate without pressure or fuss — the goal is patience, not intervention.', ARRAY['a quiet resting spot near natural light']::TEXT[], 'one sunbeam cycle', ARRAY['Skip prompting or coaxing them toward the spot — let them find it unassisted.']::TEXT[]);
INSERT INTO "Treatment" ("id", "nameMystical", "namePlain", "philosophy", "materialCategories", "typicalDuration", "contraindications") VALUES ('treat_vacuum_residue', 'The Lint-Roller Smudge', 'Vacuum Residue Clearing', 'Clear the lingering hum with a calm, deliberate pass rather than more noise or activity.', ARRAY['a lint roller or soft brush']::TEXT[], '24 hours', ARRAY['Skip if your cat is still startled by the vacuum — wait until they''ve fully settled first.']::TEXT[]);
INSERT INTO "Treatment" ("id", "nameMystical", "namePlain", "philosophy", "materialCategories", "typicalDuration", "contraindications") VALUES ('treat_chaos_spirit_box', 'The Catnip Blessing', 'Cardboard Box Threshold Care', 'Acknowledge the box as guarded territory and let your cat finish the ritual on their own terms.', ARRAY['a pinch of catnip', 'the cardboard box in question']::TEXT[], 'one sitting', ARRAY['Skip if your cat doesn''t respond to catnip — offer a treat at the threshold instead.']::TEXT[]);
INSERT INTO "Treatment" ("id", "nameMystical", "namePlain", "philosophy", "materialCategories", "typicalDuration", "contraindications") VALUES ('treat_moon_phase_whiskers', 'The Bowl Shift', 'Minor Environmental Realignment', 'A small, announced change gives your cat something concrete to reorient around.', ARRAY['the food bowl already in use']::TEXT[], 'one evening', ARRAY['Skip moving anything else in the room at the same time — one change at a time.']::TEXT[]);
INSERT INTO "Treatment" ("id", "nameMystical", "namePlain", "philosophy", "materialCategories", "typicalDuration", "contraindications") VALUES ('treat_three_am_zoomies', 'The Hallway Light Vigil', 'Nighttime Zoomies Accommodation', 'Let the burst of energy run its course in a safe, lit space instead of trying to suppress it.', ARRAY['a hallway or open path', 'a light source']::TEXT[], 'one night', ARRAY['Skip if the zoomies routinely end in destructive behavior — that''s a vet or behaviorist question, not a ritual one.']::TEXT[]);
INSERT INTO "Treatment" ("id", "nameMystical", "namePlain", "philosophy", "materialCategories", "typicalDuration", "contraindications") VALUES ('treat_sunbeam_schedule', 'The Sunbeam Repositioning', 'Sunbeam Access Restoration', 'Restore easy access to direct light — the disruption is about access, not the cat''s mood.', ARRAY['a cushion or soft surface']::TEXT[], 'the rest of the day', ARRAY['Skip placing the cushion somewhere that blocks a walkway or door.']::TEXT[]);
INSERT INTO "Treatment" ("id", "nameMystical", "namePlain", "philosophy", "materialCategories", "typicalDuration", "contraindications") VALUES ('treat_houseguest_aura', 'The Counter-Clockwise Fluffing', 'Post-Guest Resettling', 'A visible, repeated action signals the space is fully back under your cat''s ownership.', ARRAY['the room''s soft furnishings']::TEXT[], 'one pass, once', ARRAY['Skip if guests are still present — this works best once the room is empty again.']::TEXT[]);
INSERT INTO "Treatment" ("id", "nameMystical", "namePlain", "philosophy", "materialCategories", "typicalDuration", "contraindications") VALUES ('treat_static_corner', 'The Corner Acknowledgment', 'Empty-Corner Reassurance', 'A visible gesture of acknowledgment resolves the standoff faster than ignoring it does.', ARRAY['the corner in question']::TEXT[], 'one gesture', ARRAY['Skip if the corner hissing is new and persistent across many days — that''s worth a vet visit, not just a ritual.']::TEXT[]);
INSERT INTO "Treatment" ("id", "nameMystical", "namePlain", "philosophy", "materialCategories", "typicalDuration", "contraindications") VALUES ('treat_ceremonial_fast', 'The Warmed Offering', 'Mealtime Reassurance', 'A small, deliberate gesture at mealtime reframes the food as an offering rather than a routine chore.', ARRAY['their usual food']::TEXT[], 'one meal', ARRAY['Skip if the pickiness lasts more than a couple of days — sustained appetite changes are a vet question.']::TEXT[]);
INSERT INTO "Treatment" ("id", "nameMystical", "namePlain", "philosophy", "materialCategories", "typicalDuration", "contraindications") VALUES ('treat_meditative_aloofness', 'The Patient Sit', 'Aloofness Accommodation', 'Respect the distance your cat is choosing rather than closing it for them.', ARRAY['a low seat or floor cushion']::TEXT[], 'five minutes, repeatable', ARRAY['Skip making eye contact or reaching toward them — the point is that they approach, not you.']::TEXT[]);

-- DiagnosisDefs + DiagnosisDefTreatments
INSERT INTO "DiagnosisDef" ("id", "nameMystical", "namePlain", "triggerRule", "priority", "severityBands", "descriptionTemplate", "descriptionSlots", "symptomCallbackPool", "isCatchAll", "imagePath") VALUES ('diag_mercury_retrograde', 'Mercury Retrograde Third Eye', 'Mercury Retrograde Third Eye', '{"any_of":[{"tag":"mood_aloof","gte":1}]}'::jsonb, 1, '[{"min":0,"max":null,"label":"present"}]'::jsonb, 'Mercury retrograde has clogged your cat''s third eye. They''re not ignoring you — they''re recalibrating.', ARRAY[]::TEXT[], ARRAY[]::TEXT[], false, 'mercury-retrograde.png');
INSERT INTO "DiagnosisDefTreatment" ("diagnosisDefId", "treatmentId", "sortOrder") VALUES ('diag_mercury_retrograde', 'treat_mercury_retrograde', 0);
INSERT INTO "DiagnosisDef" ("id", "nameMystical", "namePlain", "triggerRule", "priority", "severityBands", "descriptionTemplate", "descriptionSlots", "symptomCallbackPool", "isCatchAll", "imagePath") VALUES ('diag_vacuum_residue', 'Vacuum Residue', 'Vacuum Residue', '{"any_of":[{"tag":"homeChanges_vacuum","gte":1}]}'::jsonb, 2, '[{"min":0,"max":null,"label":"present"}]'::jsonb, 'Your cat has absorbed residual negative energy from the vacuum cleaner. It''s still in there, humming quietly.', ARRAY[]::TEXT[], ARRAY[]::TEXT[], false, 'vacuum-residue.png');
INSERT INTO "DiagnosisDefTreatment" ("diagnosisDefId", "treatmentId", "sortOrder") VALUES ('diag_vacuum_residue', 'treat_vacuum_residue', 0);
INSERT INTO "DiagnosisDef" ("id", "nameMystical", "namePlain", "triggerRule", "priority", "severityBands", "descriptionTemplate", "descriptionSlots", "symptomCallbackPool", "isCatchAll", "imagePath") VALUES ('diag_chaos_spirit_box', 'Chaos Spirit in the Box', 'Chaos Spirit in the Box', '{"any_of":[{"tag":"napSpot_box","gte":1}]}'::jsonb, 3, '[{"min":0,"max":null,"label":"present"}]'::jsonb, 'A minor chaos spirit has taken up residence in the cardboard box. Your cat is guarding the threshold.', ARRAY[]::TEXT[], ARRAY[]::TEXT[], false, 'chaos-spirit-box.png');
INSERT INTO "DiagnosisDefTreatment" ("diagnosisDefId", "treatmentId", "sortOrder") VALUES ('diag_chaos_spirit_box', 'treat_chaos_spirit_box', 0);
INSERT INTO "DiagnosisDef" ("id", "nameMystical", "namePlain", "triggerRule", "priority", "severityBands", "descriptionTemplate", "descriptionSlots", "symptomCallbackPool", "isCatchAll", "imagePath") VALUES ('diag_moon_phase_whiskers', 'Moon-Phase Whiskers', 'Moon-Phase Whiskers', '{"any_of":[{"tag":"homeChanges_nothing","gte":1}]}'::jsonb, 4, '[{"min":0,"max":null,"label":"present"}]'::jsonb, 'Your cat''s whiskers have picked up on a shift in the household''s moon-phase alignment.', ARRAY[]::TEXT[], ARRAY[]::TEXT[], false, 'moon-phase-whiskers.png');
INSERT INTO "DiagnosisDefTreatment" ("diagnosisDefId", "treatmentId", "sortOrder") VALUES ('diag_moon_phase_whiskers', 'treat_moon_phase_whiskers', 0);
INSERT INTO "DiagnosisDef" ("id", "nameMystical", "namePlain", "triggerRule", "priority", "severityBands", "descriptionTemplate", "descriptionSlots", "symptomCallbackPool", "isCatchAll", "imagePath") VALUES ('diag_three_am_zoomies', 'The 3am Purification', 'The 3am Purification', '{"any_of":[{"tag":"mood_hyper","gte":1}]}'::jsonb, 5, '[{"min":0,"max":null,"label":"present"}]'::jsonb, 'The 3am zoomies are a purification ritual your cat invented and has not yet explained to you.', ARRAY[]::TEXT[], ARRAY[]::TEXT[], false, 'three-am-zoomies.png');
INSERT INTO "DiagnosisDefTreatment" ("diagnosisDefId", "treatmentId", "sortOrder") VALUES ('diag_three_am_zoomies', 'treat_three_am_zoomies', 0);
INSERT INTO "DiagnosisDef" ("id", "nameMystical", "namePlain", "triggerRule", "priority", "severityBands", "descriptionTemplate", "descriptionSlots", "symptomCallbackPool", "isCatchAll", "imagePath") VALUES ('diag_sunbeam_schedule', 'Sunbeam Schedule Disturbance', 'Sunbeam Schedule Disturbance', '{"any_of":[{"tag":"napSpot_sunbeam","gte":1}]}'::jsonb, 6, '[{"min":0,"max":null,"label":"present"}]'::jsonb, 'Your cat has detected a disturbance in the sunbeam schedule and is quietly displeased about it.', ARRAY[]::TEXT[], ARRAY[]::TEXT[], false, 'sunbeam-schedule.png');
INSERT INTO "DiagnosisDefTreatment" ("diagnosisDefId", "treatmentId", "sortOrder") VALUES ('diag_sunbeam_schedule', 'treat_sunbeam_schedule', 0);
INSERT INTO "DiagnosisDef" ("id", "nameMystical", "namePlain", "triggerRule", "priority", "severityBands", "descriptionTemplate", "descriptionSlots", "symptomCallbackPool", "isCatchAll", "imagePath") VALUES ('diag_houseguest_aura', 'Houseguest Aura', 'Houseguest Aura', '{"any_of":[{"tag":"homeChanges_guest","gte":1}]}'::jsonb, 7, '[{"min":0,"max":null,"label":"present"}]'::jsonb, 'An old houseguest left behind a lingering aura, and your cat has appointed themselves its sole critic.', ARRAY[]::TEXT[], ARRAY[]::TEXT[], false, 'houseguest-aura.png');
INSERT INTO "DiagnosisDefTreatment" ("diagnosisDefId", "treatmentId", "sortOrder") VALUES ('diag_houseguest_aura', 'treat_houseguest_aura', 0);
INSERT INTO "DiagnosisDef" ("id", "nameMystical", "namePlain", "triggerRule", "priority", "severityBands", "descriptionTemplate", "descriptionSlots", "symptomCallbackPool", "isCatchAll", "imagePath") VALUES ('diag_static_corner', 'Static Corner Charge', 'Static Corner Charge', '{"any_of":[{"tag":"vocalizing_hissing","gte":1}]}'::jsonb, 8, '[{"min":0,"max":null,"label":"present"}]'::jsonb, 'The empty corner your cat keeps hissing at holds a very minor, very confused static charge.', ARRAY[]::TEXT[], ARRAY[]::TEXT[], false, 'static-corner.png');
INSERT INTO "DiagnosisDefTreatment" ("diagnosisDefId", "treatmentId", "sortOrder") VALUES ('diag_static_corner', 'treat_static_corner', 0);
INSERT INTO "DiagnosisDef" ("id", "nameMystical", "namePlain", "triggerRule", "priority", "severityBands", "descriptionTemplate", "descriptionSlots", "symptomCallbackPool", "isCatchAll", "imagePath") VALUES ('diag_ceremonial_fast', 'Ceremonial Fast', 'Ceremonial Fast', '{"any_of":[{"tag":"mealtime_picky","gte":1}]}'::jsonb, 9, '[{"min":0,"max":null,"label":"present"}]'::jsonb, 'Your cat''s sudden pickiness at mealtime is a ceremonial fast, not a comment on the food.', ARRAY[]::TEXT[], ARRAY[]::TEXT[], false, 'ceremonial-fast.png');
INSERT INTO "DiagnosisDefTreatment" ("diagnosisDefId", "treatmentId", "sortOrder") VALUES ('diag_ceremonial_fast', 'treat_ceremonial_fast', 0);
INSERT INTO "DiagnosisDef" ("id", "nameMystical", "namePlain", "triggerRule", "priority", "severityBands", "descriptionTemplate", "descriptionSlots", "symptomCallbackPool", "isCatchAll", "imagePath") VALUES ('diag_meditative_aloofness', 'Meditative Aloofness', 'Meditative Aloofness', '{"all_of":[]}'::jsonb, 10, '[{"min":0,"max":null,"label":"present"}]'::jsonb, 'Your cat''s aloofness is a form of advanced meditation, not a personal rejection of you specifically.', ARRAY[]::TEXT[], ARRAY[]::TEXT[], true, 'meditative-aloofness.png');
INSERT INTO "DiagnosisDefTreatment" ("diagnosisDefId", "treatmentId", "sortOrder") VALUES ('diag_meditative_aloofness', 'treat_meditative_aloofness', 0);

-- Rituals
INSERT INTO "Ritual" ("id", "parentTreatmentId", "selectionConditions", "priority", "titleTemplate", "materials", "stepsTemplate", "incantationTemplate", "aftercareNote", "personalizationSlots") VALUES ('ritual_mercury_retrograde_std', 'treat_mercury_retrograde', '{"severity_band":["present"]}'::jsonb, 1, 'The Cardboard Box Vigil', ARRAY['a cardboard box', 'a sunny window']::TEXT[], ARRAY['Set out a fresh cardboard box facing the nearest window.', 'Don''t point it out or nudge them toward it — let them find it on their own.', 'Let them sit in it, unbothered, for one full sunbeam cycle.']::TEXT[], NULL, 'If Mercury''s still retrograde next week, repeat as needed — there''s no rush.', ARRAY[]::TEXT[]);
INSERT INTO "Ritual" ("id", "parentTreatmentId", "selectionConditions", "priority", "titleTemplate", "materials", "stepsTemplate", "incantationTemplate", "aftercareNote", "personalizationSlots") VALUES ('ritual_vacuum_residue_std', 'treat_vacuum_residue', '{"severity_band":["present"]}'::jsonb, 1, 'The Lint-Roller Smudge', ARRAY['a lint roller']::TEXT[], ARRAY['Perform a lint-roller smudge stick pass along their favorite perch.', 'Speak softly the whole time.', 'Do not vacuum again for at least 24 hours.']::TEXT[], NULL, 'The hum fades on its own; you don''t need to do anything else.', ARRAY[]::TEXT[]);
INSERT INTO "Ritual" ("id", "parentTreatmentId", "selectionConditions", "priority", "titleTemplate", "materials", "stepsTemplate", "incantationTemplate", "aftercareNote", "personalizationSlots") VALUES ('ritual_chaos_spirit_box_std', 'treat_chaos_spirit_box', '{"severity_band":["present"]}'::jsonb, 1, 'The Catnip Blessing', ARRAY['a pinch of catnip', 'the cardboard box']::TEXT[], ARRAY['Offer a small catnip blessing at the mouth of the box.', 'Back away slowly.', 'Let them finish the ritual alone, without an audience.']::TEXT[], NULL, 'The chaos spirit moves on once it''s acknowledged — no further action needed.', ARRAY[]::TEXT[]);
INSERT INTO "Ritual" ("id", "parentTreatmentId", "selectionConditions", "priority", "titleTemplate", "materials", "stepsTemplate", "incantationTemplate", "aftercareNote", "personalizationSlots") VALUES ('ritual_moon_phase_whiskers_std', 'treat_moon_phase_whiskers', '{"severity_band":["present"]}'::jsonb, 1, 'The Bowl Shift', ARRAY['the food bowl']::TEXT[], ARRAY['Move their food bowl six inches to the left, just for tonight.', 'Announce the change out loud before doing it.', 'Let them inspect the new spot before eating from it.']::TEXT[], NULL, 'One realignment is usually enough; repeat only if the whiskers seem unsettled again.', ARRAY[]::TEXT[]);
INSERT INTO "Ritual" ("id", "parentTreatmentId", "selectionConditions", "priority", "titleTemplate", "materials", "stepsTemplate", "incantationTemplate", "aftercareNote", "personalizationSlots") VALUES ('ritual_three_am_zoomies_std', 'treat_three_am_zoomies', '{"severity_band":["present"]}'::jsonb, 1, 'The Hallway Light Vigil', ARRAY['a hallway light']::TEXT[], ARRAY['Leave one hallway light on before bed.', 'Do not intervene once the zoomies begin.', 'Let the ritual complete itself, however long it takes.']::TEXT[], NULL, 'Zoomies that continue past a week are just personality, not a lingering issue.', ARRAY[]::TEXT[]);
INSERT INTO "Ritual" ("id", "parentTreatmentId", "selectionConditions", "priority", "titleTemplate", "materials", "stepsTemplate", "incantationTemplate", "aftercareNote", "personalizationSlots") VALUES ('ritual_sunbeam_schedule_std', 'treat_sunbeam_schedule', '{"severity_band":["present"]}'::jsonb, 1, 'The Sunbeam Repositioning', ARRAY['a cushion']::TEXT[], ARRAY['Reposition a cushion directly in today''s strongest patch of sunlight.', 'Apologize out loud for the inconvenience.', 'Leave the cushion in place for the rest of the day.']::TEXT[], NULL, 'Sunbeams shift daily — you may need to repeat this through the week.', ARRAY[]::TEXT[]);
INSERT INTO "Ritual" ("id", "parentTreatmentId", "selectionConditions", "priority", "titleTemplate", "materials", "stepsTemplate", "incantationTemplate", "aftercareNote", "personalizationSlots") VALUES ('ritual_houseguest_aura_std', 'treat_houseguest_aura', '{"severity_band":["present"]}'::jsonb, 1, 'The Counter-Clockwise Fluffing', ARRAY['the room''s cushions']::TEXT[], ARRAY['Fluff every cushion in the room once, counter-clockwise.', 'Do this while they supervise from a safe distance.', 'Thank them for their vigilance when you''re done.']::TEXT[], NULL, 'The aura fades within a day or two on its own.', ARRAY[]::TEXT[]);
INSERT INTO "Ritual" ("id", "parentTreatmentId", "selectionConditions", "priority", "titleTemplate", "materials", "stepsTemplate", "incantationTemplate", "aftercareNote", "personalizationSlots") VALUES ('ritual_static_corner_std', 'treat_static_corner', '{"severity_band":["present"]}'::jsonb, 1, 'The Corner Acknowledgment', ARRAY['the corner in question']::TEXT[], ARRAY['Pet the corner once, gently, where they can see you do it.', 'Say out loud that it''s been handled.', 'Resume your evening as normal.']::TEXT[], NULL, 'One acknowledgment is usually enough to settle the charge.', ARRAY[]::TEXT[]);
INSERT INTO "Ritual" ("id", "parentTreatmentId", "selectionConditions", "priority", "titleTemplate", "materials", "stepsTemplate", "incantationTemplate", "aftercareNote", "personalizationSlots") VALUES ('ritual_ceremonial_fast_std', 'treat_ceremonial_fast', '{"severity_band":["present"]}'::jsonb, 1, 'The Warmed Offering', ARRAY['their usual food']::TEXT[], ARRAY['Warm their usual food for ten extra seconds.', 'Present it with both hands, like an offering.', 'Wait a moment before stepping back, rather than walking away immediately.']::TEXT[], NULL, 'Appetite should return to normal within a day; if not, that''s a vet question, not a ritual one.', ARRAY[]::TEXT[]);
INSERT INTO "Ritual" ("id", "parentTreatmentId", "selectionConditions", "priority", "titleTemplate", "materials", "stepsTemplate", "incantationTemplate", "aftercareNote", "personalizationSlots") VALUES ('ritual_meditative_aloofness_std', 'treat_meditative_aloofness', '{"severity_band":["present"]}'::jsonb, 1, 'The Patient Sit', ARRAY['a low seat or floor cushion']::TEXT[], ARRAY['Sit near them without making eye contact for five minutes.', 'Let them approach first, on their own timeline.', 'If they don''t approach today, try again tomorrow — there''s no deadline.']::TEXT[], NULL, 'Aloofness on its own timeline is normal — this isn''t something to fix quickly.', ARRAY[]::TEXT[]);

-- Expand: add the new Diagnosis columns as nullable first — production
-- already has real rows (see this file's header comment).
ALTER TABLE "Diagnosis" ADD COLUMN "diagnosisDefId" TEXT;
ALTER TABLE "Diagnosis" ADD COLUMN "treatmentId" TEXT;
ALTER TABLE "Diagnosis" ADD COLUMN "ritualId" TEXT;
ALTER TABLE "Diagnosis" ADD COLUMN "tagTotalsSnapshot" JSONB;
ALTER TABLE "Diagnosis" ADD COLUMN "severityLabel" TEXT;

-- Backfill: match each existing row's diagnosisText back to the placeholder
-- DiagnosisDef it originated from (exact string match — Phase 13's
-- placeholder content preserves every diagnosisText verbatim from the old
-- src/content/diagnoses.ts, verified programmatically while authoring this
-- migration). tagTotalsSnapshot is set to '{}' rather than reconstructed:
-- these rows were generated by the old hash-bucket algorithm, which never
-- computed tag totals in the first place, so there is no real historical
-- value to recover — inventing one would misrepresent what actually
-- produced these results. severityLabel is 'present', the only label this
-- phase's placeholder content ever produces (a single universal severity
-- band), so it is not a special case for these rows.
UPDATE "Diagnosis" d
SET
  "diagnosisDefId" = dd.id,
  "treatmentId" = dt."treatmentId",
  "ritualId" = r.id,
  "tagTotalsSnapshot" = '{}'::jsonb,
  "severityLabel" = 'present'
FROM "DiagnosisDef" dd
JOIN "DiagnosisDefTreatment" dt ON dt."diagnosisDefId" = dd.id AND dt."sortOrder" = 0
JOIN "Ritual" r ON r."parentTreatmentId" = dt."treatmentId"
WHERE d."diagnosisText" = dd."descriptionTemplate";

-- Contract: tighten to NOT NULL now that every row is backfilled. If any
-- row's diagnosisText didn't match (it shouldn't), this fails loudly and
-- rolls back the whole transaction rather than leaving a silent gap.
ALTER TABLE "Diagnosis" ALTER COLUMN "diagnosisDefId" SET NOT NULL;
ALTER TABLE "Diagnosis" ALTER COLUMN "treatmentId" SET NOT NULL;
ALTER TABLE "Diagnosis" ALTER COLUMN "ritualId" SET NOT NULL;
ALTER TABLE "Diagnosis" ALTER COLUMN "tagTotalsSnapshot" SET NOT NULL;
ALTER TABLE "Diagnosis" ALTER COLUMN "severityLabel" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Diagnosis" ADD CONSTRAINT "Diagnosis_diagnosisDefId_fkey" FOREIGN KEY ("diagnosisDefId") REFERENCES "DiagnosisDef"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diagnosis" ADD CONSTRAINT "Diagnosis_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "Treatment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diagnosis" ADD CONSTRAINT "Diagnosis_ritualId_fkey" FOREIGN KEY ("ritualId") REFERENCES "Ritual"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
