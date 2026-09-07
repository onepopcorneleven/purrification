# Purrification — Requirements

Derived from `docs/product-brief.md`. Where the brief describes the *concept*,
this document restates it as concrete, testable requirements to build against.

## Overview
Purrification is a playful, fictional wellness app for cat owners who lean
spiritual. An owner answers a short quiz about their cat's recent behavior and
receives a whimsical "spiritual diagnosis" plus a short "cleansing ritual" to
try.

- **R-TONE-1:** All generated content (diagnoses, rituals, copy) must read as
  whimsical and tongue-in-cheek — never mystical-scammy, never phrased as real
  medical or behavioral advice.
- **R-TONE-2:** The app must display a persistent disclaimer that it's for fun
  and that genuinely concerning symptoms should prompt a vet visit.

## Functional requirements

### Auth
- **R-AUTH-1:** A visitor must be able to sign up for an account.
- **R-AUTH-2:** A registered user must be able to log in.
- **R-AUTH-3:** A logged-in user's session must persist so their cats and
  results are available across visits without re-entering data.
- **R-AUTH-4:** Self-service password reset (i.e. a "forgot password" email
  flow) is not required this round — it needs a transactional email service
  that isn't part of this round's tech stack (see Out of scope). A locked-out
  user can only be recovered manually, at the ops level, per
  `vps-runbook.md`'s account-recovery step. This is a deliberate scope
  decision, not an oversight: don't build a reset-email flow without first
  revisiting this requirement.

### Cat management
- **R-CAT-1:** A logged-in user must be able to add one or more cats.
- **R-CAT-2:** Each cat must have a name.
- **R-CAT-3:** A cat may optionally have a few basic traits for
  personalization/flavor. This round, traits are display-only (e.g. shown
  on the cat's profile/dashboard) — they are not an input to diagnosis
  generation (see R-DIAG-2).
- **R-CAT-4:** A user must be able to manage (view/edit) their existing cats.
- **R-CAT-5:** A user must be able to delete one of their cats. Deleting a
  cat must cascade-delete its `QuizAttempt` and `Diagnosis` history
  (including any public share links created from it, per R-DIAG-4) — that
  history has no meaning without the cat it belongs to. The UI must confirm
  before deleting, since this is destructive and irreversible.

### Quiz flow
- **R-QUIZ-1:** A user must be able to start a quiz for a specific cat.
- **R-QUIZ-2:** The quiz must present a short set of multiple-choice questions
  about the cat's recent behavior and environment.
- **R-QUIZ-3:** Completing the quiz must produce a recorded attempt (answers +
  timestamp) tied to that cat.

### Diagnosis engine
- **R-DIAG-1:** Each completed quiz attempt must produce a diagnosis (a
  "spiritual reading") and a prescribed ritual.
- **R-DIAG-2:** Diagnosis/ritual generation must be rule-based — a
  deterministic mapping from quiz answers (not cat traits — see R-CAT-3) to
  a curated pool of results. It must not call an LLM.
- **R-DIAG-3:** The diagnosis result must be presented as a shareable
  card/result page.
- **R-DIAG-4:** "Shareable" means the result page is reachable via a public,
  unauthenticated link (an unguessable share URL) so an owner can send it to
  someone without an account — a plain read-only page, not an integration
  with any social platform's API (posting, OAuth share flows, share-count
  tracking remain out of scope; see Out of scope). The public page must show
  only the diagnosis, ritual, and cat name — no account info (email, other
  cats, full history) is exposed to an unauthenticated viewer.
- **R-DIAG-5:** QuizAttempt creation and Diagnosis generation/persistence
  must be atomic — the system must never leave a completed `QuizAttempt`
  without its `Diagnosis` (per R-DIAG-1). This requires the mapping in
  R-DIAG-2 to be a *total* function: it must produce a result for every
  valid combination of quiz answers, never throw or fall through
  unhandled, so the atomic write can't fail on valid input.

### Result history
- **R-HIST-1:** Past diagnoses must be saved per cat.
- **R-HIST-2:** A logged-in user must be able to view a dashboard of past
  results per cat (their cat's "spiritual journey").

### Landing/marketing
- **R-LAND-1:** An unauthenticated visitor must be able to view a
  landing/marketing page that introduces the concept before signing up.

## Non-functional requirements

### Hosting & infrastructure
- **R-INFRA-1:** The app must be deployable to a self-managed, bare-metal VPS
  (not a managed platform) — the team owns the full stack from OS up.
- **R-INFRA-2:** Before the app can go live, the VPS must be provisioned and
  hardened: base OS setup, firewall configuration, SSH access hardening, and
  TLS for the public site.
- **R-INFRA-3:** A deploy pipeline must exist to ship app changes to the VPS.
- **R-INFRA-4:** Rate-limiting on the authentication endpoints (login,
  signup) must be enforced *before* the app is exposed publicly — it is
  part of initial VPS provisioning (R-INFRA-2), not a follow-up hardening
  task done after launch.

### Data persistence
- **R-DATA-1:** Application data must be stored in PostgreSQL.
- **R-DATA-2:** Schema changes must go through a migration tool (e.g. Prisma
  or Drizzle) rather than manual/ad hoc changes.

### Content guardrail
- **R-TONE-1** and **R-TONE-2** above are standing content requirements that
  apply to every new diagnosis/ritual added to the content pool, not a
  one-time launch check.

## Data model requirements
The following entities and fields are required to support the functional
requirements above:

- **User**: `id`, `email`, `password hash`
- **Cat**: `id`, `userId`, `name`, optional traits (display-only, per
  R-CAT-3) — deleting a `Cat` cascades to its `QuizAttempt`/`Diagnosis`
  rows (R-CAT-5)
- **QuizAttempt**: `id`, `catId`, `answers`, `createdAt`
- **Diagnosis**: `id`, `quizAttemptId`, `diagnosisText`, `ritualText`,
  `shareSlug` (unguessable public identifier, distinct from `id`, per
  R-DIAG-4)

## Out of scope
Carried forward from the product brief — explicitly not required this round:
- Payments/subscriptions
- Physical products or fulfillment
- Social sharing integrations — meaning platform-specific integrations
  (one-click post-to-X/Facebook buttons, OAuth share flows, share-count
  tracking). This is distinct from R-DIAG-4's public share *link*, which is
  in scope and required: the result page itself is just a plain public URL
  a user can paste anywhere, with no platform API involved.
- Admin CMS for editing content (content lives in seed/config data instead)
- Self-service (email-based) password reset — requires a transactional
  email service not part of this round's tech stack (see R-AUTH-4).
  Deferred to a future round; manual/ops-level recovery covers this round.

## Open questions / assumptions
- Exact quiz length (number of questions) is not yet specified — brief says
  "a short set."
- Size of the diagnosis/ritual content pool is not yet specified.
- Session mechanism is assumed to be session-based auth (per brief's proposed
  tech stack) but the exact implementation (cookies, expiry, etc.) is
  unspecified.
- VPS provider/specs and the exact hardening checklist (R-INFRA-2) are not yet
  defined — to be worked out as a separate ops task, not part of this
  requirements doc.
