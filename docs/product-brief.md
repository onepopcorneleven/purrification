# Purrification — Product Brief

## What it is
Purrification is a playful, fictional wellness app for cat owners who lean spiritual. When a cat is "acting off" (hiding, hissing, knocking things over, ignoring you), the owner takes an interactive quiz about the cat's recent behavior and environment. The app returns a whimsical "spiritual diagnosis" (e.g. "Mercury retrograde has clogged your cat's third eye" or "residual negative energy from the vacuum cleaner") and prescribes a short, fun "cleansing ritual" (moonlight nap spot, catnip blessing, a lint-roller smudge stick, etc.).

It's not meant to be taken literally — the tone is cozy, funny, and a little tongue-in-cheek, not mystical-scammy or medical.

## Core experience
1. **Sign up / log in** — lightweight account so results persist.
2. **Add a cat** — name, and a few basic traits (optional, for personalization/flavor).
3. **Take the quiz** — a short set of multiple-choice questions about the cat's recent behavior/environment.
4. **Get a diagnosis** — a generated "spiritual reading" + a prescribed ritual, presented as a shareable card/result page.
5. **History** — past diagnoses per cat are saved and viewable on a dashboard, so an owner can look back at their cat's "spiritual journey."

## Scope for this round
In scope:
- Landing/marketing page introducing the concept
- Account creation and login
- Add/manage one or more cats
- Interactive quiz flow
- Diagnosis + ritual generation (rule-based mapping from quiz answers to a curated pool of results — not an LLM call, to keep it simple and deterministic for a first build)
- Per-cat result history, viewable after login
- Initial VPS provisioning and securing (OS setup, firewall, SSH hardening, TLS, deploy pipeline) since the server arrives bare metal

Out of scope for this round:
- Payments/subscriptions
- Physical products or fulfillment
- Social sharing integrations
- Admin CMS for editing content (content lives in seed/config data instead)

## Tech stack (proposed)
- **Framework:** Next.js (TypeScript, App Router) — single codebase for landing page, quiz UI, and API routes, well-documented for learning the full stack.
- **Database:** PostgreSQL, accessed via Prisma (or Drizzle) — good for practicing schema design/migrations.
- **Auth:** simple email/password auth (session-based) — enough to practice auth without pulling in heavy third-party infra.
- **Hosting:** self-managed VPS (bare metal, no pre-installed OS-level extras) — we own provisioning and hardening (OS setup, firewall, SSH access, TLS, deploy pipeline) rather than using a managed platform like Vercel.

## Data model (rough sketch)
- `User` (id, email, password hash)
- `Cat` (id, userId, name, optional traits)
- `QuizAttempt` (id, catId, answers, createdAt)
- `Diagnosis` (id, quizAttemptId, diagnosisText, ritualText)

## Tone/voice guardrails
Whimsical, warm, cat-owner-humor — think horoscope app, not real spiritual practice. Never implies real medical/behavioral advice; a persistent note should clarify the app is for fun, and genuinely concerning symptoms should still prompt a vet visit.

## Next steps
1. Turn this into a concrete implementation plan (schema, routes, quiz content, page-by-page build order).
2. Start building.
