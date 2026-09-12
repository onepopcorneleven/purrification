-- Phase 16 (docs/workplan.md, board/content-id-integrity-fix.md): add
-- indexes on every foreign-key column that lacked one. Postgres does not
-- automatically index the referencing side of a foreign key (only the
-- referenced side, via its own primary key), and Prisma only emits an
-- index for a field that is part of @id/@@unique/@@index. Checked both
-- prior migrations before writing this one: the only indexes that existed
-- were the Prisma-implied unique ones (User.email, Diagnosis.quizAttemptId,
-- Diagnosis.shareSlug) and DiagnosisDefTreatment's composite
-- @@unique([diagnosisDefId, sortOrder]). Every FK below was a plain,
-- unindexed column — invisible at today's row counts, a real
-- sequential-scan risk once Cat/QuizAttempt/Diagnosis accumulate real
-- usage. Index-only migration: no data is read, written, or moved.
--
-- AnswerOptionTagEffect.answerOptionId and DiagnosisDefTreatment.diagnosisDefId
-- are deliberately NOT given their own index here: each is the leftmost
-- column of an existing composite primary key / unique index
-- (@@id([answerOptionId, tagId]) and @@unique([diagnosisDefId, sortOrder])
-- respectively), and Postgres can already use a multicolumn B-tree index's
-- leading-column prefix to satisfy a lookup on that column alone. Adding a
-- second, redundant single-column index on top would just be wasted
-- write-time overhead and disk space.

-- CreateIndex
CREATE INDEX "Cat_userId_idx" ON "Cat"("userId");

-- CreateIndex
CREATE INDEX "QuizAttempt_catId_idx" ON "QuizAttempt"("catId");

-- CreateIndex
CREATE INDEX "Diagnosis_diagnosisDefId_idx" ON "Diagnosis"("diagnosisDefId");

-- CreateIndex
CREATE INDEX "Diagnosis_treatmentId_idx" ON "Diagnosis"("treatmentId");

-- CreateIndex
CREATE INDEX "Diagnosis_ritualId_idx" ON "Diagnosis"("ritualId");

-- CreateIndex
CREATE INDEX "Question_topicId_idx" ON "Question"("topicId");

-- CreateIndex
CREATE INDEX "AnswerOption_questionId_idx" ON "AnswerOption"("questionId");

-- CreateIndex
CREATE INDEX "AnswerOptionTagEffect_tagId_idx" ON "AnswerOptionTagEffect"("tagId");

-- CreateIndex
CREATE INDEX "DiagnosisDefTreatment_treatmentId_idx" ON "DiagnosisDefTreatment"("treatmentId");

-- CreateIndex
CREATE INDEX "Ritual_parentTreatmentId_idx" ON "Ritual"("parentTreatmentId");
