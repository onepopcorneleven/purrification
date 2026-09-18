# Phase 26 — Quiz transition timing boost

Extended notes for `docs/workplan.md`'s Phase 26 entry. Requested and
implemented 2026-09-18, a same-family follow-up to Phase 24's per-block
quiz transition.

## Context

With Phase 24's three-block cascade (picture → prompt → answers) working
correctly on every tested browser/device (see
`docs/workplan/phase-24-quiz-transition-crossfade.md`'s bugfix/debug
history) and Phase 25's unrelated click-target bug fixed, the owner
asked for one more pacing tweak: increase the fade duration and widen
the gap between when each block starts moving, to make the per-block
cascade read more strongly — the original Phase 24 tuning was correct
mechanically but subtle enough that the stagger was easy to miss at a
glance once fully working.

**Goal:** scale the base duration up by 1.5x and widen the stagger delay
between blocks proportionally, keeping the same relative shape (picture
leads, then prompt, then answers, same order both directions) — a
pacing change only, no change to the three-block mechanism, the
`--leaving`/`--pending` transition approach, or anything Phase 25 fixed.

## Execution notes

- `src/app/globals.css`: `--duration-question-shift` (the picture
  block's base, shared with `.mark-confirm-spin`) 300ms → 450ms.
  `.quiz-block--prompt`: 330ms/40ms delay → 500ms/60ms delay.
  `.quiz-block--answers`: 360ms/80ms delay → 550ms/120ms delay.
- `src/app/cats/[id]/quiz/QuizFlow.tsx`: `QUESTION_SHIFT_MS` (the JS
  timer gating when the step actually advances, mirroring the answers
  block's worst case) 440ms → 670ms (120ms delay + 550ms duration).
- `docs/design/design-tokens.json`: `motion.duration.questionShift`
  300ms → 450ms; the `questionShift`/`markConfirmSpin` pattern
  descriptions' embedded numbers updated to match.
- `CLAUDE.md`: the Phase 24 paragraph's literal timing numbers updated,
  with a note that Phase 26 is what changed them.
- `docs/design-system.md` needed no change — its Motion bullet and
  `QuizFlow` interaction-model paragraph describe the mechanism
  qualitatively, without hardcoding specific millisecond values.

## Testable deliverables

- [x] The per-block cascade (picture → prompt → answers) is
  noticeably slower and more spread out than before, while the
  mechanism itself (symmetric fade in both directions, correct
  `prefers-reduced-motion` handling) is unchanged.
- [x] `QUESTION_SHIFT_MS` matches the answers block's new worst case
  exactly (120ms + 550ms = 670ms) so the step never advances before
  every block has finished leaving.
- [x] `npm run build`, `eslint`, and `prettier --check` all clean.

## Execution log — 2026-09-18

Implemented as described above. `npm run build` compiled and
typechecked clean; `eslint` on the changed `.tsx` file was clean;
`prettier --check` was clean on every changed file. No headless browser
available in this sandbox (per `CLAUDE.md`'s standing note) — this is a
pure timing/pacing change to an already-verified mechanism (Phase 24's
bugfix confirmed the underlying transition approach works correctly
across desktop Firefox and Android), so it was verified functionally
(build/typecheck, a read of the exact new CSS/JS values against the
intended 1.5x scaling) rather than visually; the owner should confirm
the feel once deployed.
