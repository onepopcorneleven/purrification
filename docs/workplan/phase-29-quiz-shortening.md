# Phase 29 — Quiz shortening (20 → 10 questions)

Extended notes for `docs/workplan.md`'s Phase 29 entry. Requested
2026-09-21: shorten the quiz from 20 questions to 10, two per topic, while
keeping the diagnosis concept intact and the diagnosis/treatment/ritual
counts as close to the current 12/10/19 as possible. Content and seed
pipeline only — no schema, migration, or UI change.

## Why the change is content-only

Nothing in `src/` hardcodes the quiz length. `QuizFlow` takes
`questions.length` from props, `QuizProgress` takes a `total`, and both
the quiz page and `POST /api/cats/[id]/quiz` load every `isActive: true`
`Question` from the DB and validate the submitted answers against that
set. So "10 questions" is purely a question of which rows are active and
what tag effects they carry.

## Design

Every diagnosis is fed by tags; the quiz's only job is to emit the right
tags. With half the questions, the old quiz's thresholds (calibrated for
20 questions of evidence) were unreachable, so the work was re-deriving
which tags each surviving question emits and re-tuning each diagnosis's
rule and severity bands to match.

**Kept unchanged (8 questions, same ids, same answer sets):** `q_001`,
`q_005`, `q_007`, `q_009`, `q_010`, `q_013`, `q_014`, `q_017`. Three
had tag weights adjusted: `q_010` (departure) now also carries
`human_bond_seeking` weight on its top answers (it absorbed the dropped
"follows you room to room" question's job), `q_014` (food guarding)
graded weights retuned, and `q_013` (favorite object) gives its top two
answers a small `resource_guarding` weight — both Objects questions are
about possessiveness, and this is what lets Resource Vigilance's mild
variant be reachable (see "Trade-offs").

**Two new merged questions** (new ids, because their meaning is not that of
any old question — reusing an old id would silently re-point historical
`QuizAttempt.answers` at different text):
- `q_021` (Territory) merges the old patrol (`q_003`), window-watching
  (`q_004`) and furniture-change (`q_002`) questions into one "how does
  your cat keep watch" question with four distinct patterns.
- `q_022` (Vocal, matching where the old play/novelty questions lived)
  merges grooming (`q_015`), play deficit (`q_018`), novelty seeking
  (`q_019`) and room-to-room following (`q_012`) into one "where does
  the restless energy go when you're not playing" question. This is what
  keeps Quiet Static (needs grooming), Understimulation Drift (needs
  play deficit + novelty) and Separation Static (needs bond-seeking)
  reachable without a question apiece.

**Retired (12 questions):** `q_002`, `q_003`, `q_004`, `q_006`, `q_008`,
`q_011`, `q_012`, `q_015`, `q_016`, `q_018`, `q_019`, `q_020`. Their text
is removed from `questions.json` (git history keeps it); their DB rows
are deactivated, never deleted — see below.

**Result: 10 questions / 42 answers, exactly 2 per topic**
(territory, sleep, social, objects, vocal), 12 diagnoses, 10 treatments,
19 rituals — all counts other than questions/answers unchanged.

### Diagnosis rules

`diagnoses.json`'s only changes are `trigger_rule`, `severity_bands`, and
`priority` — every description, callback pool, image and treatment link is
untouched. Two design rules drove the new thresholds:

1. **Two-signal diagnoses match before single-question ones.** Separation
   Static, Social Flooding, Boundary Erosion, Threshold Vigil, Quiet
   Static and Rhythm Slip each need evidence from two different
   questions, so they get the earliest priorities; the diagnoses driven
   mostly by one question (Nocturnal Unrest, Vocal Overflow, Resource
   Vigilance, Object Tethering, Understimulation Drift) come after, so
   they don't swallow the rarer, more specific readings.
2. **Each diagnosis's lowest severity band starts at the sum of its own
   rule thresholds.** `resolveSeverityLabel` throws when no band contains
   the sum, and a real quiz submission would 500. The first draft of this
   design had exactly that hole (2.8% of answer combinations fell outside
   every band); it was found by exhaustive enumeration, not by reading
   the rules. `validate()` now rejects it (below).

### Trade-offs

- **Nocturnal Unrest is moderate-only.** Its evidence comes from one
  answer of one question. Making a mild variant reachable meant a second
  trigger answer, which roughly doubled its frequency and starved the
  catch-all. It keeps its ritual variants — the `gentle` one is shared
  with Rhythm Slip via `treat_rhythm_anchoring`, so all 19 rituals are
  still reachable through the quiz.
- **The catch-all is rarer than before under uniform-random answers**
  (6.3% vs 18.3% at 20 questions), because fewer questions means fewer
  chances to *not* trip any rule. Under a "calm-skewed" sample that
  favors low-intensity answers (closer to how owners of ordinary cats
  answer) it is 44.7% vs 70.4% before. Real answer distributions are
  unknown; if "The Ordinary Day" turns out too rare in production, tighten
  the single-question diagnoses first.
- **In the old 20-question quiz, moderate/acute severity was rarely
  reachable**: in a 400k-sample uniform simulation only 4 of 11 pattern
  diagnoses ever produced a moderate-or-higher result. The new content
  reaches both bands for 10 of 11 (Nocturnal Unrest excepted). That's a
  side benefit of re-deriving thresholds, not a goal of this phase.

Final distribution over all 1,638,400 answer combinations:

| Diagnosis | Share | mild | moderate |
|---|---|---|---|
| Separation Static | 8.75% | 4.38% | 4.38% |
| Social Flooding | 9.38% | 4.69% | 4.69% |
| Boundary Erosion | 7.03% | 5.63% | 1.41% |
| Threshold Vigil | 9.22% | 3.59% | 5.63% |
| Quiet Static | 5.81% | 2.91% | 2.91% |
| Rhythm Slip | 7.48% | 3.74% | 3.74% |
| Nocturnal Unrest | 6.20% | — | 6.20% |
| Vocal Overflow | 12.30% | 2.46% | 9.84% |
| Resource Vigilance | 12.69% | 4.23% | 8.46% |
| Object Tethering | 8.46% | 4.23% | 4.23% |
| Understimulation Drift | 6.36% | 3.18% | 3.18% |
| The Ordinary Day (catch-all) | 6.32% | steady | |

## Retiring the dropped questions

The seed script only upserts; it never sets `isActive`, and `reportStale()`
only warns. Left alone, the 12 dropped questions would stay live in the
DB, the quiz would keep showing them, and — because the old and new
questions would both be active — the submit route would demand 22
answers. Rather than asking someone to hand-edit 12 rows on production
after every reseed, this phase adds:

- `prisma/seed/content/retired.json` — an explicit, hand-authored list of
  retired question ids (currently `{"questions": [...]}`; extend the shape
  when another class needs it).
- `retireContent()` in `prisma/seed/index.ts` — after the upserts, sets
  `isActive: false` on exactly those ids. Idempotent, never deletes, and a
  no-op on a database that never had them. `reportStale()` no longer
  warns about ids listed there.
- `validate()` rejects an id that is in both `retired.json` and
  `questions.json`.

This preserves the standing rule — content is retired, never deleted, and
retirement is a deliberate human decision — while making it a committed,
repeatable part of the deploy instead of a manual production step.
Historical `Diagnosis` rows are unaffected: they store a frozen
`tagTotalsSnapshot`, not a live reference to `Question`/`AnswerOption`.

## Verification

**Before deploy** (nothing touched the production database):

- `validate()` in `prisma/seed/index.ts` passes (run with `DATABASE_URL`
  pointed at a dead port, so the validator runs and the first DB write
  fails to connect). Two new checks were added — lowest severity band
  must cover the rule's smallest reachable tag sum, highest band must be
  open-ended — and a deliberately broken band was confirmed to be
  rejected.
- New `scripts/verify-quiz-content.ts` (`npm run verify-quiz-content`) —
  DB-free. Enumerates all 1,638,400 answer combinations through the real
  `engine.ts` functions and mirrors `getDiagnosis`'s ritual selection.
  Result: 0 unmatched, 0 out-of-band, 0 without a ritual; all 12
  diagnoses and all 19 rituals reachable; 2 questions per topic.
- `npm run lint`, `npx tsc --noEmit`, and `npm run build` clean;
  `prettier --check` clean on every changed file (a pre-existing warning
  on `src/components/ui/PageShell.tsx` is unrelated to this phase).

**After deploy** (2026-09-21, against production):

- The deploy log showed `Retired 12 question(s) (12 listed in
  retired.json)` and `Upserted 17 tags, 5 topics, 10 questions, 20
  treatments, 12 diagnosis defs, 19 rituals`. Read-only DB queries then
  showed 10 active / 17 inactive `Question` rows (the 17 are these 12
  plus the 5 Phase 13 placeholders) and exactly 2 active per topic.
- Service: `active` since the deploy restart, 0 restarts; `/login` and
  `/signup` 200, `/` 307 to `/cats` as before.
- `npm run smoke-test-diagnoses` against the live DB (script confirmed
  read-only — only two `findMany` calls): loaded 10 active questions / 42
  answers / 12 `DiagnosisDef`s; 12/12 reachable as the real first match
  with no missing template slots; a second severity path found for 10 of
  the 11 pattern diagnoses (Nocturnal Unrest is moderate-only by design).
- `GET /cats/<id>/quiz` on the live site returned 200 and shipped all 10
  new question ids and none of the 12 retired ones.

**Not done, owner-only:** a visual click-through of the shorter quiz in a
real browser. There is no usable headless browser in the sandbox (see
`CLAUDE.md`), and nothing in the UI is length-specific (`QuizFlow` and
`QuizProgress` take their length from props), so this is a confidence
check rather than a known risk. Also not done, deliberately: no test
submission through the live quiz, since that would write a real
`QuizAttempt`/`Diagnosis` into production data.

## Deploy

Done 2026-09-21 with the runbook's repeat-deploy (`vps-runbook.md` step
12), after the owner merged PR #42. It also shipped Phase 28, whose app
deploy had been pending — its 10 new treatment PNGs now serve 200. Notes
that still apply to any future content-only deploy like this one:

1. `db:seed-content` runs after `db:migrate` in the normal script and now
   also retires whatever `retired.json` lists.
2. **Keep the seed → restart gap short.** The running server caches its
   content graph at first use, and the quiz page/submit route read
   active questions live. Between the seed finishing and
   `systemctl restart purrification`, a quiz submission would be scored
   with the old cached rules against the new question ids. The deploy
   script restarts immediately after; don't insert steps between.
3. Follow with `npm run smoke-test-diagnoses` (needs the SSH tunnel) as a
   live cross-check.

## Known follow-ups (not done, not requested)

- `q_022` lives in the "Vocal Behavior" topic because the old
  play/novelty questions did; its content is closer to "solo time." A
  topic rename or move is a presentation decision for the owner.
- `symptom_callback_pool` lines are still picked at random, not tied to
  the user's answers (unchanged from Phase 13); a few callbacks now
  describe behaviors no remaining question asks about (e.g. Resource
  Vigilance's litter-box line). They read as flavor, as they always did.
- The quiz-shortening left `topics.json` untouched (5 topics, images
  intact).
