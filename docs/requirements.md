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

### Cat management
- **R-CAT-1:** A logged-in user must be able to add one or more cats.
- **R-CAT-2:** Each cat must have a name.
- **R-CAT-3:** A cat may optionally have a few basic traits for
  personalization/flavor.
- **R-CAT-4:** A user must be able to manage (view/edit) their existing cats.

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
  deterministic mapping from quiz answers to a curated pool of results. It
  must not call an LLM.
- **R-DIAG-3:** The diagnosis result must be presented as a shareable
  card/result page.

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

### Data persistence
- **R-DATA-1:** Application data must be stored in PostgreSQL.
- **R-DATA-2:** Schema changes must go through a migration tool (Prisma)
  rather than manual/ad hoc changes.

### Content guardrail
- **R-TONE-1** and **R-TONE-2** above are standing content requirements that
  apply to every new diagnosis/ritual added to the content pool, not a
  one-time launch check.

## Data model requirements
The following entities and fields are required to support the functional
requirements above:

- **User**: `id`, `email`, `password hash`
- **Cat**: `id`, `userId`, `name`, optional traits
- **QuizAttempt**: `id`, `catId`, `answers`, `createdAt`
- **Diagnosis**: `id`, `quizAttemptId`, `diagnosisText`, `ritualText`

## Out of scope
Carried forward from the product brief — explicitly not required this round:
- Payments/subscriptions
- Physical products or fulfillment
- Social sharing integrations
- Admin CMS for editing content (content lives in seed/config data instead)

## Open questions / assumptions
- Quiz length is set at 8-10 questions.
- The diagnosis/ritual content pool will contain 8-12 entries at launch.
- Session mechanism is session-based auth via a stateless, signed HTTP-only
  cookie (per brief's proposed tech stack); no DB-backed session table for
  this round.
- VPS provider/specs and the exact hardening checklist (R-INFRA-2) are not yet
  defined — to be worked out as a separate ops task, not part of this
  requirements doc.
