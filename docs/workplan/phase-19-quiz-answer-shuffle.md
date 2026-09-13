# Phase 19 — Quiz answer-order randomization (anti-catch-all bias fix)

Extended notes for `docs/workplan.md`'s Phase 19 entry. Requested and
implemented 2026-09-12.

## Context

**Problem found (live-DB investigation):** careless/random test-clicking
through the quiz overwhelmingly produced the catch-all "no significant
imbalance" diagnosis (`diag_equilibrium`) — 5 of 9 real-content test runs,
~56%. A 200k-trial simulation of the live trigger rules under *true*
uniform-random answer selection put the catch-all rate at only ~18%, and
every one of the 11 real diagnoses was confirmed independently reachable
with real margin for a deliberate/thematic answerer — so the content and
thresholds were not the problem (left untouched, per the decision below).

**Root cause:** answer options render in a fixed, author-defined order
(`sortOrder`) on every page load, with no default selection. A user who
isn't reading the option text very plausibly clicks a similar screen
position/index across most of the 20 questions — and several questions
place their most dismissive, negative-tag-weighted option at a consistent
index. That correlates click position with "safe/no-imbalance" tag effects
far more than true randomness would (the observed 56% vs. simulated 18% gap
is too large to be sampling luck alone: ~1% under a true 18% rate).

**Decision:** leave `DiagnosisDef`/`Treatment`/`Ritual` trigger rules and
thresholds untouched. Fix the UI instead — randomize the *display order* of
answer options per page load, decorrelating position from tag effect.
`SCALE`-type questions (1–5, 4 of the 20 today) are excluded — their order
is semantically ordinal, not decorative, and shuffling would break that
UX. Built to generalize: the gating property is "does option order carry
meaning" (ordinal vs. nominal), keyed off `QuestionInputType` in one small
constant, not hardcoded to specific questions — so it covers future
quizzes and future nominal answer-set types (e.g. `MULTI_SELECT`, already
in the schema but unused) automatically; a future ordinal type just needs
one addition to that constant.

## Execution notes

- New shared utility `src/lib/quiz/shuffleAnswerOptions.ts`:
  `shuffleAnswerOptions(inputType, options)`, Fisher-Yates shuffle for
  anything not in a local `ORDER_PRESERVING_TYPES` set (`SCALE` only,
  today).
- `src/app/cats/[id]/quiz/page.tsx`: selects `inputType` (previously
  omitted from the query entirely) and shuffles each question's options
  through the new helper when building the `options` array handed to
  `QuizFlow`.
- No changes needed to `QuizFlow.tsx` (renders whatever `options` order
  it's given, keyed by `option.id` — confirmed compatible with Phase 18's
  confirm-and-divine rewrite, which landed on `main` mid-session) or to
  the API route/`getDiagnosis`/`engine.ts` (all keyed by `AnswerOption.id`,
  never position).
- `npm run lint` / `npm run build` clean.

## Testable deliverables

- Two successive fetches of the same quiz page show different answer
  order for a `SINGLE_SELECT` question (confirmed: q_001's four options
  rendered in a different order across two loads) while a `SCALE` question
  stays in fixed 1→5 order both times (confirmed identical).
- A full 20-question quiz submission still produces a correct diagnosis
  (confirmed live: `diag_object_tethering`, matching tag totals and
  rendered text, via a real signup → cat → quiz → submit walkthrough
  against the live DB; test user/cat cleaned up after).

## Execution log — 2026-09-12

- Verified locally against the live VPS DB (via the standard SSH tunnel):
  dev server run in an isolated worktree, real signup/cat/quiz HTTP flow
  (not just unit-level checks) confirmed both the shuffle behavior and an
  end-to-end diagnosis submission.
- `npm run lint`/`npm run build` both passed clean.
- Shipped via PR, merged to `main`, deployed via the standard step-12
  pipeline (no schema or content change — `prisma migrate deploy` and
  `npm run db:seed-content` both no-ops, only the build + restart mattered).
