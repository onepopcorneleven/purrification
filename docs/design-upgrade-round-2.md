# Purrification — Design Upgrade Round 2 (Visual Richness Pass)

**Status: proposed, not yet approved.** This is a pitch document, written at
the user's request to evaluate the current live UI and propose a second
design round in four work packages. No implementation has started. See
`docs/workplan.md`'s Phase 12 (added alongside this doc, also unchecked) for
how this would be sequenced if approved.

This plays the same role for this round that `docs/design-system.md` played
for Phase 10: the substantive plan. It does not touch
`docs/design/purrification-brand-guidelines.md` or `design-tokens.json` —
same palette, same type, same tokens. This is about *using* that identity
more fully, not changing it.

---

## Why a second round

Phase 10 shipped a *correct* design system: real tokens, three brand fonts,
a component library, a favicon and a "seal of completion" mark, a
responsive/accessible retrofit of every page. It's live, it works, and
nothing about it is wrong. But surveying the actual shipped UI end to end
(every page, every component source file) turns up a product that landed
noticeably more conservative than the brand it's built on:

- **Exactly one AI-generated image exists anywhere in the product** — the
  landing-page hero. Signup, login, the cats dashboard, the quiz, results,
  share, and history are pure typography and flat `bg-raised` rectangles.
  The brand doc's entire §6 (a reusable prompt template, standardized
  aspect ratios, "every image should feel like it belongs to the same tarot
  deck") describes an image *library* that doesn't exist yet — it describes
  a system for one image.
- **`DiagnosisCard`** — the single moment the product exists to deliver, the
  "spiritual reading" payoff — shipped "purely typographic," in
  `design-system.md`'s own words, an acknowledged open item never revisited.
- **The already-designed `seal-of-completion.svg`** (built in Phase 10
  specifically for "a 'seal of completion' moment in-product," per the brand
  doc §3) is not referenced anywhere in `src/` — a finished asset sitting
  unused.
- **Every route uses the identical centered `max-w-3xl` single column** —
  landing, dashboard, quiz, results, history all read as the same page with
  different words in it. No asymmetry, no varied rhythm, nothing that
  differentiates a hero moment (landing, a finished reading) from a utility
  screen (the cats list).
- **The background is one flat, unbroken near-black rectangle** everywhere.
  The brand concept is explicitly "a candlelit room, a night ritual" — the
  dark background is supposed to *be* that room, not just a color value.
  There's currently no fog, vignette, glow-falloff, or texture — anything
  that would make the dark feel inhabited rather than empty.
- **The Toast's "glowing candle" motif** (brand doc §9's specific suggestion)
  shipped as a 6px gold dot next to the message text — a reasonable literal
  read of "glow," but not a candle, and one of several places where a named
  theatrical idea got the safest possible interpretation.
- **Quiz options, cat cards, and empty states are all the same flat
  bordered rectangle** with a hover-border-brighten treatment — functional,
  accessible, and visually identical to a generic SaaS form.

None of this is a defect — everything shipped is correct, accessible, and
on-brand at the token level. It's a *completeness* gap: the system was
built, but only one page (`page.tsx`'s hero image) and one component
(`DiagnosisCard`'s double-border treatment) actually reach for the
"theatrical" half of "antique fortune-teller machine meets tarot deck." The
brand doc treats that half as core, not garnish — brand personality §2 says
the aesthetic should feel "ancient and confident, never cheap or jokey" and
that a user should feel like they "stumbled into a real tradition." A
single hero photo and otherwise-flat UI reads more like a well-organized
form than a tradition.

---

## WP1 — Atmosphere: give the dark a room to sit in

Right now `--color-bg-base` is a flat fill behind every page. This package
makes the *background itself* part of the mystical set-dressing, sitewide,
without touching layout or content.

- A subtle radial-vignette layer behind `PageShell`'s `<main>` — content
  sits in a soft pool of light, edges recede toward black. Pure CSS
  (`radial-gradient` using the existing `bg-base`/`bg-raised` tokens), no
  new asset.
- A faint, seeded noise/grain texture over the background (the brand doc's
  imagery rules explicitly want "painterly," not "flat vector" — a flat
  `#0D0A12` fill is the flattest possible reading of that). A single small
  tileable PNG/SVG noise texture at very low opacity, applied once via
  `globals.css`, costs nothing per-page.
- A slow-drifting fog/smoke layer (CSS-animated gradient blobs, or one
  looping AI-generated seamless texture) behind hero moments specifically
  — landing page, the finished-reading moment on `results/[id]` — reserved
  for those two per the brand doc's "glow-pulse ... one focal element at a
  time" discipline, not applied ambiently everywhere.
- Extend the existing gold hairline-border language into a genuine
  "engraved frame" for `PageShell`'s header/footer: thin corner flourishes
  or a repeating hairline sigil pattern rather than a plain single border
  line, echoed from `DiagnosisCard`'s existing double-border treatment so
  that treatment stops being the one place in the app that looks designed.
- All of this must respect `prefers-reduced-motion` (drifting fog off,
  static gradient instead) and get a fresh contrast check — a vignette or
  grain layer sitting under `--color-text-primary` copy must not touch the
  ~14:1 contrast the brand doc verified for plain `bg-base`.

## WP2 — Imagery: build out the actual tarot deck

The brand doc designed an image *system* (§6: shared prompt template,
standardized aspect ratios, "every image belongs to the same deck") for a
product that has shipped exactly one image against it. Image generation is
confirmed working in this sandbox now (`codex exec "<prompt>. Save it as
<path>."`, per this project's own memory), so this is buildable, not
blocked like it was for the Phase 10 logo pass.

- **One illustration per diagnosis archetype.** `src/content/diagnoses.ts`
  already defines 10 curated diagnosis/ritual entries — the actual "cards"
  of this tarot deck. Generate one card-thumbnail-aspect (4:5, per the
  brand doc's own standardized ratios) painterly illustration per entry,
  through the shared prompt template, and show it on `DiagnosisCard` keyed
  to which archetype a reading landed on. This is the single highest-impact
  item in this whole round — it turns the product's actual payoff moment
  into a real illustrated tarot card instead of a text block, and reuses
  content that's already deterministic and finite (10 images, one time,
  not per-user generation).
- **Wire in the unused seal**: an animated "stamp" moment using the
  existing `seal-of-completion.svg` when a reading finishes — it already
  exists, was designed for exactly this, and currently does nothing.
- A companion image each for signup and login (a robed/veiled figure by
  candlelight, per the brand doc's example subject matter) — currently the
  two most-visited unauthenticated pages besides the landing page have zero
  imagery.
- A small illustrated header/banner for the cats dashboard and the
  "add a cat" panel — distinguishing "this is the ritual chamber" from "this
  is a settings form."
- Illustrated `EmptyState` art (an unlit candle / an empty crystal ball) for
  the zero-cats and zero-history cases, replacing the current dashed-border
  placeholder box.
- A **written addendum to the prompt template's aspect-ratio table**
  recording exactly which ratio each new use case above uses, so this
  doesn't become ad hoc the way the single existing image was — keeps
  `purrification-brand-guidelines.md` §6 the actual source of truth for
  every image the product ships, present and future.

## WP3 — Theatrical component detail: make primitives look designed, not styled

Several brand-doc-named ideas ("engraved seal quality," "glowing candle,"
tarot-card framing) exist as tokens but shipped as their safest possible
literal reading. This package spends design effort on the *shapes* of the
existing primitives, not new ones.

- **Quiz options as literal tarot-card picks.** `QuizFlow.tsx`'s options are
  currently flat bordered rectangles with a radio input. Restyle as
  small vertical cards with the same double-border/corner-flourish
  language as `DiagnosisCard`, a selected-state glow-pulse (the token
  already exists, barely used), and a subtle flip/reveal transition on
  selection — makes "answering the quiz" feel like drawing cards rather
  than filling out a form.
- **`Toast` as an actual glowing candle**, not a dot: a small flame-shaped
  glyph (SVG, cheap) with a flicker animation (brief, randomized
  scale/opacity jitter — new, small addition to the motion token set)
  replacing the current 6px circle.
- **`Card` gets the `DiagnosisCard` treatment**, at a lighter weight: the
  inset double-border currently unique to `DiagnosisCard` extends to cat
  cards and history entries, so the one component that currently looks
  "finished" stops being the exception.
- **History as a reading log, not a list.** `cats/[id]/history` currently
  renders as a plain stacked list (per `design-system.md`'s inventory,
  reusing `Card`); restyle it as a vertical timeline with a connecting
  gold thread and a small per-entry seal/sigil mark, closer to "a record of
  rituals performed" than a table of rows.
- A pass on `PageShell`'s nav: the wordmark currently sits inert; give it a
  slow ambient glow-pulse on load (once, not looping — the brand doc
  reserves glow-pulse for one focal thing, and on every page load the
  wordmark *is* that one thing for a beat) and treat the auth-aware nav
  links with more of the engraved-metal linework language than plain
  text-with-hover-color.

## WP4 — Motion & rhythm: make the app feel alive and varied

Ties WP1–3 together and fixes the "every page is the same column" problem.
Lowest asset cost of the four, highest craft cost (interaction/motion
detail, not new assets).

- **Break the uniform `max-w-3xl` column** for hero moments specifically:
  the landing page and a finished `DiagnosisCard` moment get more breathing
  room / a wider or asymmetric layout (the brand doc's own "spacious/airy,
  give content room to breathe" guidance is currently satisfied only via
  padding, never via layout variation); utility screens (cats dashboard,
  history) can keep the current tight column, since that's the right call
  for scanability there.
- **Staggered entrance choreography** on multi-element pages (landing's
  list of four steps, the cats dashboard grid) — each item fades in via the
  existing `--animate-fade-in` token with a small incremental delay, rather
  than the whole page appearing at once. Small CSS-only change (`animation-
  delay` per index), noticeable effect.
- **A themed loading state for quiz submission** — replace the current
  disabled-button/text-swap on submit with something that reads as
  "consulting the cards" (a slow glow-pulse on the submit button plus a
  short themed status line), instead of a generic spinner.
- **Hover/press micro-interactions**: a slight lift + glow on card hover
  (cats dashboard, quiz-option cards from WP3), an ink-stamp-style
  press-down on the seal-of-completion moment from WP2.
- Full `prefers-reduced-motion` audit across everything this round adds —
  every new animation (fog drift, candle flicker, wordmark glow-pulse,
  staggered entrances, hover lift) needs a static fallback, not just the
  ones carried over from Phase 10.
- A final cross-page consistency pass once WP1–3 land: confirm the new
  atmosphere/imagery/component treatments read as one coherent upgrade
  rather than a pile of independent effects — the same kind of check
  Phase 10's responsive/accessibility pass did, but for visual rhythm
  instead of breakpoints.

---

## Suggested sequencing

WP2 (imagery) is the highest-impact, most self-contained package — it can
start immediately and doesn't depend on the others. WP1 (atmosphere) and
WP3 (component detail) touch the same files (`globals.css`, the shared
primitives) and are naturally done together. WP4 (motion/rhythm) is the
finishing pass and reads best once real imagery and component treatments
exist to choreograph around it — recommended last regardless of which
order WP1–3 happen in.

## Explicitly out of scope for this round

- Any change to palette, typography, spacing, or radius tokens — this is a
  richness pass on the existing identity, not a rebrand.
- New functional primitives (`Table` remains speculative per
  `design-system.md`'s Open items — still nothing in the app needs one).
- Per-user or on-demand image generation (e.g. a portrait of *your*
  specific cat) — everything in WP2 is a fixed, curated, one-time asset set
  (10 diagnosis archetypes + a handful of page illustrations), same
  cost/consistency model as the existing single hero image, not a new
  runtime dependency on image generation.
