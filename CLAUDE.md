# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Purrification is a learning project (per README.md: "just learning how claude code works") for practicing the full software development lifecycle with Claude Code. The product itself is a playful, fictional wellness app for cat owners who lean spiritual: an owner takes a quiz about their cat's recent behavior and gets a whimsical "spiritual diagnosis" plus a prescribed "cleansing ritual."

## Current state

Phase 0 (project scaffolding, `docs/workplan.md`) is done. The app is a Next.js 16 (App Router, TypeScript) project at the repo root with Prisma as the data layer. No feature code exists yet — auth, cat management, quiz, and diagnosis (Phases 1–7) are still pending.

**Commands** (run from the repo root):
- `npm run dev` — start the dev server (`localhost:3000`).
- `npm run build` — production build (standalone output, see below); `npm start` runs it.
- `npm run lint` — ESLint (`eslint-config-next`).
- `npm run format` / `npm run format:check` — Prettier, scoped to app code only (`.prettierignore` excludes `docs/`, other `*.md`, and `src/generated/`).
- `npm run db:migrate` — `prisma migrate dev`, applies `prisma/migrations/` against `DATABASE_URL`.
- `npm run db:generate` — `prisma generate` (also runs automatically via `postinstall`).
- No test runner is set up yet — add one when Phase 1+ introduces code worth testing.

**Structure:**
- `src/app/` — Next.js App Router pages and (once added) API routes.
- `src/generated/prisma/` — generated Prisma Client output, gitignored, never edit by hand.
- `prisma/schema.prisma` — the data model, mirroring `docs/architecture.md`'s schema sketch exactly (`User`, `Cat`, `QuizAttempt`, `Diagnosis`, with `shareSlug` and cascade deletes).
- `prisma/migrations/` — committed migration history; the initial migration was generated offline (`prisma migrate diff`) since no local Postgres was reachable in the scaffolding environment — it has never actually been applied to a database yet. Run `npm run db:migrate` against a real dev Postgres to apply it for the first time.
- `prisma7.config.ts` — Prisma's config file (this is its actual generated filename in the installed Prisma 7 version, not a typo); reads `DATABASE_URL` from `.env`.
- `next.config.ts` sets `output: "standalone"` — required by `docs/vps-runbook.md` step 11's systemd unit, which runs the standalone `server.js` directly.

Docs were written in dependency order, each derived from the one before it:

1. `docs/product-brief.md` — the product concept, scope, and proposed tech stack.
2. `docs/requirements.md` — the brief restated as testable requirements (IDs like `R-AUTH-1`, `R-DIAG-2`); functional requirements cover auth, cat management, quiz flow, the diagnosis engine, and result history, plus non-functional requirements for hosting and data persistence.
3. `docs/architecture.md` — how the system will be built to satisfy those requirements: a single Next.js (TypeScript, App Router) app for UI + API routes, PostgreSQL via Prisma/Drizzle, session-based auth, and a deterministic (non-LLM) diagnosis engine. Requirement IDs are cited throughout for traceability.
4. `docs/vps-runbook.md` — one-time provisioning/hardening checklist for the target bare-metal VPS (non-root deploy user, SSH hardening, ufw, fail2ban, TLS via certbot, systemd service, deploy script).
5. `docs/workplan.md` — the sequenced build plan (phases 0–10) tying it all together, from project scaffolding through VPS provisioning and launch.
6. `docs/specs-updates.md` — a cross-doc consistency check that found and resolved contradictions/gaps across the five docs above (e.g. the sharing model, deletion cascades, password reset scope). Treat docs 1–5 as already incorporating these resolutions; check here first if something in them still looks contradictory.

## Key decisions to know before touching this repo

- **Diagnosis/ritual generation is rule-based, not an LLM call** — a deterministic mapping from quiz answers to a curated, in-repo content pool (`R-DIAG-2`). `getDiagnosis` must be a *total* function (hash-bucket into the content pool, not a switch/case with gaps), and `QuizAttempt`+`Diagnosis` creation is one atomic DB transaction (`R-DIAG-5`) — no orphaned quiz attempts without a diagnosis.
- **"Shareable" result page (R-DIAG-3/4) means a public, unauthenticated link keyed on a separate `shareSlug`** (not the row id), showing only diagnosis/ritual/cat-name — distinct from the still-out-of-scope platform share integrations (OAuth, share buttons, share-count tracking).
- **Cat deletion is in scope (R-CAT-5)**: cascades to that cat's `QuizAttempt`/`Diagnosis` history (including share links), and the UI must confirm before deleting.
- **Cat `traits` are display-only this round (R-CAT-3/R-DIAG-2)** — shown on the cat's profile, not fed into `getDiagnosis`. Don't wire them into diagnosis logic without a deliberate scope change.
- **No self-service password reset this round (R-AUTH-4)** — out of scope by decision, not an oversight. Account recovery is a manual ops procedure (`vps-runbook.md` step 14, direct `psql`), not an email flow.
- **Auth rate-limiting is provisioned at the Nginx layer during VPS setup (`R-INFRA-4`, `vps-runbook.md` step 9, Phase 8)**, before the app is ever deployed (Phase 9) — not bolted on later in the Phase 10 hardening pass.
- **The systemd service runs a Next.js standalone build** (`output: "standalone"`), which is what actually produces the `server.js` the unit's `ExecStart` expects — don't assume a hand-rolled custom server.
- **Hosting is a self-managed bare-metal VPS**, not a managed platform like Vercel — the project owns provisioning and hardening (`docs/vps-runbook.md`) as part of the learning goal.
- **Content is edited by committing to seed/config data**, not through an admin CMS — that's explicitly out of scope for this round.
- **Prisma was chosen over Drizzle** (Phase 0) — the default per `docs/architecture.md`, no learning-goal reason came up to prefer Drizzle instead.
- Whether sessions are stateless-signed-cookie or DB-backed is still open per `docs/architecture.md` — starts stateless.

## Accessing the deploy target

The production VPS (`docs/vps-runbook.md`) is reachable over SSH via the alias `purrification-deploy`, configured in the operator's local `~/.ssh/config`. **Always use this alias — never a raw IP address or hardcoded path — in any command, script, or deploy instruction touching the deploy target.** The alias resolves host, user, and key material locally; nothing about that resolution should be duplicated or hardcoded into this repo.

**Provisioning status (`docs/vps-runbook.md` steps 1–10) is done and verified on the live server** — SSH hardening, `ufw`, fail2ban, automatic updates, Node/PostgreSQL/Nginx, TLS via certbot, and Nginx rate-limiting on the auth endpoints are all live at `purrification.com`. Steps 11–12 (systemd service, deploy pipeline) are staged but not started — they're blocked on application code existing (`workplan.md` Phases 0–7). See `docs/vps-runbook.md`'s "Execution log" section for exact details and any deviations from the plan. The `deploy` user's passwordless sudo is scoped to `systemctl restart purrification` only — everything else needs an interactive password, by design.
