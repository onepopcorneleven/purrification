# Phase 24 — Quiz question-shift transition

Extended notes for `docs/workplan.md`'s Phase 24 entry. Requested and
implemented 2026-09-15: a from-scratch look at the quiz's
question-to-question pacing, replacing Phase 18's full-screen mid-quiz
"divining" overlay with a lighter in-place slide-crossfade.

## Context

**Prior behavior, for contrast:** since Phase 18, confirming an answer on
any non-final question swapped the entire question block out for
`.divining-overlay` — a full-height card with a pulsing gold glow, a
flickering flame, and a randomized flavor line ("Reading the signs…") —
held for a fixed 2000ms before the next question faded in from scratch.
Across a 20-question quiz that's ~38 seconds of held, content-free
pauses, and the hard swap gave question N no visual continuity with
question N+1.

**Goal:** keep the mystical flavor text and gold theming, but make the
mid-quiz beat lighter and faster: the current question's prompt and
options slide out to the left while the next question's fresh mount
slides in from the right (~380ms, `--ease-dreamy`), with the flavor line
appearing briefly in the existing hint line instead of behind a blocking
overlay. The confirmed option's diamond mark also plays one quick
spin+glow at the moment of confirmation — a small nod to a tarot card
"turning" — since the full-screen overlay is no longer there to carry
that beat. The final question's "spiritual reception" moment (the
longer, 5000ms `.divining-overlay--final` pause gating the real diagnosis
request) is unchanged; it now earns its dramatic weight by being the only
place this held-pause treatment still happens, rather than one of twenty
near-identical pauses.

Two directions were designed and compared as an interactive Artifact
mockup before this phase was written: a slide-crossfade vs. a full 3D
tarot card-flip. The crossfade was chosen for:
- **Pacing.** The transition fires ~19 times per quiz; a flip's novelty
  (great on question 1) doesn't survive that many repeats, while every
  millisecond of held pause compounds across the quiz.
- **Brand discipline, applied consistently.**
  `docs/design/design-tokens.json`'s own motion notes reserve
  `glowPulse` for "one focal/active element at a time... never ambient."
  The same logic argues for saving theatrical, held-pause treatment for
  the one genuinely one-off moment the quiz already has — the final
  reception beat — rather than giving every question that same weight.
- **Lower implementation/perf risk.** A CSS crossfade is a couple of
  transition classes; a 3D flip needs a front/back pre-render swap trick
  to avoid a visible snap, is more prone to jank on older mobile GPUs,
  and needs its own reduced-motion handling and reversed-direction logic
  for the "Back" button.

## Execution notes

- `src/app/cats/[id]/quiz/QuizFlow.tsx`: replaced the
  `Transition = "none" | "divining" | "reception"` state machine with
  `Phase = "answering" | "leaving" | "reception"`. The mid-quiz overlay
  branch is gone entirely; the question block itself now carries
  `quiz-question`/`quiz-question--leaving`/`quiz-question--enter`
  classes. `QUESTION_SHIFT_MS` (380) replaces `DIVINATION_MS` (2000);
  `RECEPTION_MS` (5000, unchanged) replaces `DIVINATION_FINAL_MS`.
  `DIVINING_LINES` is renamed `WHISPER_LINES` and is now surfaced inline
  in the hint paragraph (swapping "Tap an answer, then tap it again to
  confirm.") rather than inside an overlay. A single `line` state serves
  both the inline whisper and the reception overlay's text, since the two
  phases are mutually exclusive.
- `src/app/globals.css`: added `.quiz-question`/`--leaving`/`--enter` (a
  CSS transition plus a `question-shift-in` keyframe) and
  `.mark-confirm-spin` (a rotate+glow keyframe on the confirmed option's
  diamond mark), both durations tied to the new
  `--duration-question-shift` token and both gated under
  `prefers-reduced-motion: reduce`. `--duration-divination` (2000ms) is
  retired; `--duration-question-shift` (380ms) replaces it.
  `--duration-divination-final` (5000ms) is untouched.
  `.divining-overlay`/`--final`, `.divining-flame--final`, and
  `.divining-seal-preview` are untouched but are now reached only via the
  "reception" phase — the JSX no longer conditionally sizes the flame or
  applies `--final`, since that branch renders only for the last question.
- `docs/design/design-tokens.json`: `motion.duration.divination` →
  `questionShift` (380ms); `motion.patterns.divination` split into
  `questionShift` (the new mid-quiz pattern), `markConfirmSpin` (the new
  confirm flourish), and `spiritualReception` (documents what's left of
  the old combined entry — the unchanged final-question pause).
- `docs/design-system.md`: updated the Motion bullet's named-pattern list
  and the `QuizFlow.tsx` interaction-model paragraph to describe the new
  mid-quiz transition; the final "spiritual reception" description is
  unchanged in substance, just re-homed to its own sentence.
- `CLAUDE.md`: revised the Phase 18 sentence in Current State in place to
  describe today's actual mid-quiz mechanism, noting Phase 24 as the
  phase that replaced it (rather than only appending a new sentence at
  the very end, since this is the same subsystem Phase 18 introduced).

## Testable deliverables

- [x] Confirming a non-final answer slides the question out and the next
      one in, with no full-screen overlay and no content gap.
- [x] The hint line briefly shows a themed flavor line during the
      outgoing half, reverting to "Tap an answer, then tap it again to
      confirm." once the next question mounts.
- [x] The confirmed option's diamond mark plays a one-shot spin+glow.
- [x] The final question's "spiritual reception" overlay, pacing, and
      diagnosis-request gating are unchanged.
- [x] `prefers-reduced-motion: reduce` disables all three new animations
      without changing timing/state logic.
- [x] Back navigation is unaffected — still a single, immediate click,
      disabled only while `phase !== "answering"`.
- [x] `docs/design/design-tokens.json` and `docs/design-system.md`
      updated to match.
- [x] `npm run build` and `npm run format:check` clean; `eslint` scoped
      to the changed `.tsx` file clean (bare `npm run lint` is already
      noisy repo-wide for unrelated reasons — see execution log).

## Execution log — 2026-09-15

Implemented as described above. `npm run build` (Next.js production
build, Turbopack) compiled and typechecked clean. A bare `npm run lint`
is already known to be noisy repo-wide (this sandbox has several stale
`.claude/worktrees/*` checkouts and generated Prisma output on disk that
it also scans, per Phase 21's note) — `npx eslint` scoped directly to
`QuizFlow.tsx` ran clean instead. `npm run format:check` showed no
issues in any file this phase touched (its repo-wide warnings are all in
those same pre-existing, unrelated worktree/generated files). No headless
browser is available in this sandbox (see `CLAUDE.md`'s standing note),
so this was verified functionally (build/typecheck passing, a read of the
rendered JSX/CSS logic against all three phases) rather than visually in
a real browser — the owner should confirm the feel in `npm run dev`
before/after merging.
