# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Purrification is a learning project (per README.md: "just learning how claude code works") for practicing the full software development lifecycle with Claude Code. The product itself is a playful, fictional wellness app for cat owners who lean spiritual: an owner takes a quiz about their cat's recent behavior and gets a whimsical "spiritual diagnosis" plus a prescribed "cleansing ritual."

## Current state

Phase 0 (project scaffolding) is done; Phase 1 (data layer, `docs/workplan.md`) is done. The app is a Next.js 16 (App Router, TypeScript) project at the repo root with Prisma as the data layer, migrated and reachable. No feature code exists yet — auth, cat management, quiz, and diagnosis (Phases 2–7) are still pending.

**Database: there is no separate local dev Postgres — this project uses the VPS's Postgres instance for both dev and prod.** `docs/architecture.md` and `docs/vps-runbook.md` describe a single-server setup with no staging/dev environment planned, and `vps-runbook.md` step 8 had already provisioned a real, empty `purrification` database on the VPS before any app code existed. Rather than standing up a throwaway local Postgres, Phase 1 applied the first migration directly to that instance:
- Postgres isn't exposed publicly (`ufw` only allows 22/80/443, correctly) — reach it from a dev machine via an SSH tunnel through the `purrification-deploy` alias: `ssh -f -N -L 5432:localhost:5432 purrification-deploy`. `DATABASE_URL` in `.env` points at `localhost:5432` assuming that tunnel is open.
- The real `DATABASE_URL` (with its generated password) lives root-only on the server at `/root/purrification-secrets/db-credentials.env` — fetch it with `sudo cat` over SSH as the `deploy` user (needs deploy's sudo password, not stored in the repo).
- `npm run db:migrate` runs `prisma migrate deploy` (not `migrate dev` — no shadow-database privileges on this role, and `migrate dev`'s reset/prompt behavior isn't appropriate against the one real shared DB). Generate new migrations locally with `npx prisma migrate dev --create-only` against a scratch DB (or hand-write them) and commit the SQL, then `db:migrate` applies it here.
- This means local `npm run dev` also needs that tunnel open to reach the database.

**Commands** (run from the repo root):
- `npm run dev` — start the dev server (`localhost:3000`); needs the SSH tunnel above open first.
- `npm run build` — production build (standalone output, see below); `npm start` runs it.
- `npm run lint` — ESLint (`eslint-config-next`).
- `npm run format` / `npm run format:check` — Prettier, scoped to app code only (`.prettierignore` excludes `docs/`, other `*.md`, and `src/generated/`).
- `npm run db:migrate` — `prisma migrate deploy`, applies `prisma/migrations/` against `DATABASE_URL` (see above — points at the VPS DB via tunnel).
- `npm run db:generate` — `prisma generate` (also runs automatically via `postinstall`).
- No test runner is set up yet — add one when Phase 1+ introduces code worth testing.

**Structure:**
- `src/app/` — Next.js App Router pages and (once added) API routes.
- `src/generated/prisma/` — generated Prisma Client output, gitignored, never edit by hand.
- `src/lib/db/client.ts` — the typed data-access entry point: a singleton `PrismaClient` (via the `@prisma/adapter-pg` driver adapter — Prisma 7's engine-less client requires an explicit driver adapter, not just a `DATABASE_URL`) cached on `globalThis` so Next.js dev-mode hot reload doesn't leak connections. Import `prisma` from here in API routes rather than instantiating `PrismaClient` directly.
- `prisma/schema.prisma` — the data model, mirroring `docs/architecture.md`'s schema sketch exactly (`User`, `Cat`, `QuizAttempt`, `Diagnosis`, with `shareSlug` and cascade deletes).
- `prisma/migrations/` — committed migration history; the initial migration is applied to the real (VPS) database — see above.
- `prisma7.config.ts` — Prisma's config file (this is its actual generated filename in the installed Prisma 7 version, not a typo); reads `DATABASE_URL` from `.env`.
- `next.config.ts` sets `output: "standalone"` — required by `docs/vps-runbook.md` step 11's systemd unit, which runs the standalone `server.js` directly.

Docs were written in dependency order, each derived from the one before it:

1. `docs/product-brief.md` — the product concept, scope, and proposed tech stack.
2. `docs/requirements.md` — the brief restated as testable requirements (IDs like `R-AUTH-1`, `R-DIAG-2`); functional requirements cover auth, cat management, quiz flow, the diagnosis engine, and result history, plus non-functional requirements for hosting and data persistence.
3. `docs/architecture.md` — how the system will be built to satisfy those requirements: a single Next.js (TypeScript, App Router) app for UI + API routes, PostgreSQL via Prisma/Drizzle, session-based auth, and a deterministic (non-LLM) diagnosis engine. Requirement IDs are cited throughout for traceability.
4. `docs/vps-runbook.md` — one-time provisioning/hardening checklist for the target bare-metal VPS (non-root deploy user, SSH hardening, ufw, fail2ban, TLS via certbot, systemd service, deploy script).
5. `docs/design-system.md` — how the UI will look and behave: visual language, design tokens, and component conventions for retrofitting a real design onto the functional layer built in Phases 2–7. Plays the same role for the frontend that `architecture.md` plays for the backend.
6. `docs/workplan.md` — the sequenced build plan (phases 0–11) tying it all together, from project scaffolding through VPS provisioning, launch, and UI design.
7. `docs/specs-updates.md` — a cross-doc consistency check that found and resolved contradictions/gaps across the docs above (e.g. the sharing model, deletion cascades, password reset scope). Treat the docs above as already incorporating these resolutions; check here first if something in them still looks contradictory.

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

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
