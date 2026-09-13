# Phase 18 — Quiz confirm-and-divine interaction

Extended notes for `docs/workplan.md`'s Phase 18 entry. Requested and
implemented 2026-09-12 ("go ahead, implement phase 18").

## Context

**Prior behavior, for contrast** (`src/app/cats/[id]/quiz/QuizFlow.tsx`): a
single click on an option selects it (highlighted look — gold border,
`animate-glow-pulse`, filled diamond glyph); a separate "Next" button,
disabled until an option is selected, advances `step` immediately with no
transition. The last question showed "Get diagnosis" instead of "Next",
which did the real `POST /api/cats/:id/quiz` submission with a "Consulting
the cards…" status line. `QuizProgress.tsx` renders the step-dot row above
the question. Back is a plain button, disabled only on question 1 or while
submitting.

**Goal:** replace the select-then-click-"Next" flow with a two-click
confirm gesture per question, followed by a short mystical "divining"
transition before the next question appears — and, on the last question, a
longer, more dramatic "spiritual reception" variant of that same moment
before the diagnosis appears, framed as the cat's answers gathering into
one reading rather than a generic "processing" beat. Back is explicitly
untouched by this change.

**New interaction:**
1. First click on an option selects it — the existing highlighted look,
   unchanged.
2. A second click on that *same, already-selected* option confirms it: a
   further, distinct visual change beyond the selection highlight (more
   emphatic — a deeper/solid glow fill, and an animated pulse on the
   existing diamond glyph), signaling the choice is locked in. Clicking a
   *different*, not-yet-selected option while one is already selected (but
   not yet confirmed) just re-selects — the confirm gesture only fires on
   a second click of the *same* option.
3. Confirming immediately starts a short "divining" transition — a themed
   overlay/moment over the question card (candle-flare + drifting fog,
   reusing the `flame-flicker`/`fog-drift` keyframes already in
   `globals.css`, plus a short rotating mystical status line — "Reading
   the signs…", "The cards are turning…", etc.) — then the next question
   appears automatically. No separate "Next" click remains for a confirmed
   answer; the second click on the option *is* the advance action.
4. Back remains exactly as it was before: single click, immediate
   `step - 1`, no confirm gesture, no divining animation.

**The last question gets its own, more dramatic "spiritual reception"
moment**, not just a reuse of the mid-quiz divining transition. Confirming
the final answer plays a longer, more elaborate version of the same
divining language — the mid-quiz moment is a quick beat between questions;
this one is the culmination, framed as summoning/receiving the diagnosis
from everything just answered, not just "processing." Concretely: a
distinct, longer animation/overlay (more layers — multiple candle flames, a
fuller fog bloom, the `seal-of-completion.svg` motif making an early
appearance rather than only on the result page), its own longer duration
token; copy leaning into "gathering/receiving" rather than "processing"
("Your cat's answers are gathering into a single reading…", "The reading is
arriving…"); and it still gates the real `POST /api/cats/:id/quiz` call
underneath it — navigation to `/results/[id]` waits for *both* the
animation's minimum duration and the real fetch to finish (whichever is
longer), and a failed request falls back to the existing error-toast
behavior, letting the user retry from the last question rather than
stranding them mid-animation.

**Durations are tokens, not hardcoded literals**:
`docs/design/design-tokens.json`'s `motion.duration` (topped out at
`slow: "450ms"`) got two new entries: `motion.duration.divination: "3000ms"`
(the mid-quiz, between-questions moment) and
`motion.duration.divinationFinal: "5000ms"` (the longer final "spiritual
reception" moment) — mirrored into `--duration-divination`/
`--duration-divination-final` CSS custom properties in `globals.css`'s
`@theme` block.

## Execution notes

- Added a `confirmed` state to `QuizFlow.tsx`'s per-question selection
  tracking (`idle` -> `selected` -> `confirmed`, keyed per question id the
  same way `answers` is).
- Wired the click handler: first click on an option sets `selected`;
  second click on that same, already-`selected` option sets `confirmed`
  and triggers the appropriate transition (mid-quiz divining, or the final
  reception moment on the last question); a click on a different option
  while in `selected` (not yet `confirmed`) re-selects instead.
- Added the third (`confirmed`) visual state to the option card — building
  on the existing gold/glow language, not introducing new colors, per this
  project's brand-token discipline
  (`docs/design/purrification-brand-guidelines.md`).
- Built the mid-quiz divining transition component/overlay (candle-flare +
  fog drift + a rotating flavor line), driven by `--duration-divination`,
  that then advances `step`.
- Built the separate, more elaborate final reception moment (fuller
  fog/candle treatment, an early appearance of the
  `seal-of-completion.svg` motif, distinct "gathering/receiving" flavor
  copy) driven by `--duration-divination-final`, that calls
  `receiveDiagnosis` underneath itself and only navigates to
  `/results/[id]` once both the animation's minimum duration and the real
  fetch have resolved (whichever is longer); on a failed fetch, falls back
  to the existing `showToast` error handling.
- Added a `prefers-reduced-motion: reduce` treatment for both new
  animations, matching every other animation in `globals.css`.
- Added the two new duration tokens to `docs/design/design-tokens.json`
  and mirrored them into `globals.css`.
- Updated `docs/design-system.md`'s component inventory / `QuizFlow`
  description for the new two-click-confirm interaction and the two
  distinct transition moments.

## Testable deliverables

- A single click on an option shows exactly the existing
  selected/highlighted look; no automatic advance.
- A second click on that same, already-selected option visibly changes its
  appearance again, then (mid-quiz) the divining animation plays and the
  next question appears, or (last question) the longer reception moment
  plays and the diagnosis result appears — with no separate
  "Next"/"Get diagnosis" click remaining in either case.
- The final reception moment is visibly more elaborate and longer than the
  mid-quiz divining moment, not a reuse of the same animation at the same
  length.
- Clicking a different option after the first click re-selects rather than
  confirming.
- Back is unchanged: single click, immediate, no animation, still disabled
  only on question 1 (and during any submission-in-flight state).
- A slow (artificially delayed) `POST /api/cats/:id/quiz` response never
  cuts the final reception moment short; a fast response never skips it
  either — navigation always waits for both.
- A failed submission during the final reception moment surfaces the
  error toast and returns the user to the last question, rather than
  leaving them stuck mid-animation.
- Both animations' durations come from named tokens, not hardcoded
  literals in the component.
- `prefers-reduced-motion: reduce` shortens/removes both new animations
  the same way every other motion in this app does.
- `npm run build` and `npm run lint` both pass.

## Execution log — 2026-09-12

- Implementation landed in `QuizFlow.tsx` mostly as planned, with the
  submit function renamed `receiveDiagnosis` (from the plan's
  `handleSubmit`) since it now always runs inside the final-question
  transition, never triggered independently by a separate button.
- Added `motion.duration.divination`/`divinationFinal` to
  `docs/design/design-tokens.json` and mirrored them into `globals.css`'s
  `--duration-divination`/`--duration-divination-final` (and matching
  `DIVINATION_MS`/`DIVINATION_FINAL_MS` constants in `QuizFlow.tsx`,
  cross-referenced by comment on both sides).
- `.divining-overlay`/`--final` reuse `.toast-flame`'s existing flicker
  animation rather than a new one; the final variant adds a dim,
  early-preview appearance of `seal-of-completion.svg` and a fuller
  two-gradient glow. Both get `prefers-reduced-motion: reduce` overrides
  matching every other animation in `globals.css`.
- `npm run lint` initially caught a real bug: storing the random flavor
  line in a `useRef` and reading `.current` during render violates the
  `react-hooks/refs` rule (a ref read during render isn't guaranteed to
  reflect the latest value and won't trigger a re-render) — switched to
  `useState` instead, which is what the value being displayed actually
  needed.
- `npm run build`/`npm run lint` both pass clean.
- Functional (non-visual) verification only, per `CLAUDE.md`'s standing
  note that no headless browser exists in this sandbox: a real signup →
  cat → fetch of `/cats/:id/quiz` confirmed the rendered page shows the
  new "Tap an answer, then tap it again to confirm." hint and the answer
  options, and confirmed neither a "Next" nor a "Get diagnosis" button
  string appears anywhere in the markup anymore (both fully replaced by
  the click-to-confirm gesture); the `divining-overlay` markup is
  correctly absent from the initial server-rendered page (it only mounts
  client-side once a click confirms an answer). **The actual two-click
  gesture, the timed transitions, and the final request-gating behavior
  are client-side interactive logic that curl cannot exercise** — these
  were verified by code review of the state machine (the `selected`/
  `confirmed`/`transition` transitions in `QuizFlow.tsx`) rather than an
  observed live click-through. A manual check via `npm run dev` (+ the
  SSH tunnel) was recommended before treating this as fully confirmed
  live — see the post-deploy fix below, which is exactly why.
- Shipped via PR, merged to `main`; deployed via the standard step-12
  pipeline (no schema/content changes this time — pure app-code + two doc
  updates — so `prisma migrate deploy`/`db:seed-content` both no-op).

### Post-deploy fix — 2026-09-12 (same day)

Live check by the user found the shipped version genuinely broken: "first
tap on question highlights it (1:1 as before). second tap on same question
changes nothing. stuck, can not activate an answer." This confirmed the
execution log's own caveat above — the interactive click/confirm behavior
had only been reasoned about via code review, never actually exercised.

**Root cause:** the confirm click handler was wired to the
`<input type="radio">`'s `onChange` — but a native radio input only fires
`change` when its `checked` state actually flips. Clicking an
*already-checked* radio a second time never flips `checked` and so never
fires `change`, in any browser — the second (confirm) click was silently
dropped every time.

**First fix attempt found a second, worse bug before shipping:** moving
the handler to `onClick` on the *wrapping `<label>`* seemed like an obvious
fix (a label's click always fires, unlike a radio's change) — but verifying
it with a real jsdom DOM-event reproduction (`label.click()`, not
hand-dispatched synthetic events) showed the label's own click handler
fires **twice** per physical click. A `<label>` wrapping a form control has
a spec'd "activation behavior": clicking the label dispatches the original
click event (which bubbles through the label), *and* forwards a second,
separately-bubbling click event directly at the wrapped control — both
reach a listener attached to the label itself. Applied to this component,
that would have double-scheduled the divining transition (two competing
`setTimeout`s silently skipping an extra question forward) or
double-submitted the final diagnosis request.

**Actual fix:** put the click handler on the `<input>` itself (`onClick`,
alongside the existing `onChange`), not the label. A label's forwarded
click lands directly on the input — exactly once per physical click,
regardless of whether `checked` changes — so the input's own `onClick`
listener never double-fires the way the label's did. `onChange` is kept
alongside as a harmless, idempotent second path (verified: `selectOption`
called twice in the same synchronous event with unchanged closure state is
a no-op-equivalent double call) for any keyboard/assistive-tech flow that
changes `checked` without synthesizing a click.

**Verified with real jsdom DOM-event simulation** (not hand-asserted
custom events) before re-shipping: reproduced the exact reported bug
(`onChange`-only: 2 real clicks on the same radio -> exactly 1 `change`
event, confirming the confirm click is dropped); reproduced the
label-onClick regression (2 real clicks -> 4 handler firings, confirming
the double-fire); confirmed the final `onClick`-on-the-input fix produces
exactly one handler firing for the confirm click and every click after it,
every time. Re-ran `npm run build`/`npm run lint` (clean) and the same
curl-based page-render check as the original deploy (unaffected). The
underlying limitation from the original execution log still applies — this
sandbox has no headless browser, so this was the most rigorous
verification available short of a real click-through; still recommend a
manual check.

- Fix shipped via a follow-up PR, merged to `main`, deployed the same way.

### Tuning — 2026-09-12

User confirmed the fix worked live, then asked to shorten the mid-quiz
divining pause specifically (not the final reception moment). Changed
`motion.duration.divination` from `3000ms` to `2000ms` in
`docs/design/design-tokens.json`, `globals.css`'s `--duration-divination`,
and `QuizFlow.tsx`'s `DIVINATION_MS` — all three kept in sync per the
token's own documented convention. `motion.duration.divinationFinal`
(`5000ms`, the last question's longer moment) is unchanged.
