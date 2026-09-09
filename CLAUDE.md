# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Purrification is a learning project (per README.md: "just learning how claude code works") for practicing the full software development lifecycle with Claude Code. The product itself is a playful, fictional wellness app for cat owners who lean spiritual: an owner takes a quiz about their cat's recent behavior and gets a whimsical "spiritual diagnosis" plus a prescribed "cleansing ritual."

## Current state

`docs/workplan.md` Phases 0–13 are all done and live in production at
`purrification.com`: data layer, auth, cat management, quiz flow, the
diagnosis engine, result history, the landing page, VPS provisioning, the
deploy pipeline, a full brand-driven design system (Tailwind v4, dark-only
jewel-tone/gold identity, shared `PageShell`/`Button`/`Card`/`Field`/`Modal`/
`Toast`/`DiagnosisCard` components), a visual-richness pass (atmosphere, a
full illustration set, theatrical component detail, motion/rhythm), a
hardening pass (rate-limit values reviewed against real traffic and left
unchanged, a nightly `pg_dump` backup job, a content tone review), and — as
of the most recent work — the content storage foundation: quiz/diagnosis
content moved from the static `src/content/*.ts` files (deleted) into
PostgreSQL (`Tag`/`Question`/`DiagnosisDef`/`Treatment`/`Ritual`, seeded via
`npm run db:seed-content`), with `getDiagnosis` rewritten as a DB-backed
rule engine. Phase 13 shipped only *placeholder* content (today's 5
questions/10 diagnoses migrated into the new shape, minimal tag
scaffolding) — see `docs/content/content-storage-architecture.md` for the
full schema/engine spec this implements. Only **Phase 14 (rich content
authoring)** remains, and it's still **proposed, pending approval** — do
not start it without an explicit go-ahead; see `workplan.md` for its exact
checklist.

**No usable headless browser exists in a fresh sandbox environment for
this project** — `playwright install chromium` downloads fine, but the
binary needs system shared libraries (`libnspr4`, `libnss3`, etc.) that
require root to install via `apt-get`, and sandboxes for this project
don't have that. If a task needs real visual/screenshot verification,
either ask the user to look at it themselves (`npm run dev` + the SSH
tunnel below) or say plainly that only functional verification (curl
content checks, computed contrast ratios, server logs) was possible —
don't claim a visual check that didn't happen.

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
- `npm run db:seed-content` — idempotent upsert of `prisma/seed/content/*.json` into the content-model tables (`Tag`/`Question`/`DiagnosisDef`/`Treatment`/`Ritual`, Phase 13). Runs every deploy, right after `db:migrate` — see `vps-runbook.md` step 12.
- No test runner is set up yet — add one when Phase 1+ introduces code worth testing.

**Structure:**
- `src/app/` — Next.js App Router pages and API routes.
- `src/components/ui/` — shared design primitives (`PageShell`, `Button`, `Card`, `Field`, `Modal`, `Toast`, `EmptyState`, `QuizProgress`, `TextLink`, `LogoutButton`, `Mark`) — see `docs/design-system.md`. Plain React components wrapping Tailwind utility classes, not a component-library dependency.
- `src/components/diagnosis/` — `DiagnosisCard`, the one bespoke component (CSS Modules, not Tailwind utilities), shared by the results and share pages.
- `src/generated/prisma/` — generated Prisma Client output, gitignored, never edit by hand.
- `src/lib/db/client.ts` — the typed data-access entry point: a singleton `PrismaClient` (via the `@prisma/adapter-pg` driver adapter — Prisma 7's engine-less client requires an explicit driver adapter, not just a `DATABASE_URL`) cached on `globalThis` so Next.js dev-mode hot reload doesn't leak connections. Import `prisma` from here in API routes rather than instantiating `PrismaClient` directly.
- `prisma/schema.prisma` — the data model, mirroring `docs/architecture.md`'s schema sketch: `User`, `Cat`, `QuizAttempt`, `Diagnosis` (with `shareSlug` and cascade deletes), plus the Phase 13 content model (`Tag`, `QuestionTopic`, `Question`, `AnswerOption`, `AnswerOptionTagEffect`, `Treatment`, `DiagnosisDef`, `DiagnosisDefTreatment`, `Ritual`) that `Diagnosis` now has FKs into — see `docs/content/content-storage-architecture.md` §7.
- `prisma/migrations/` — committed migration history; every migration is applied to the real (VPS) database — see above. The Phase 13 migration (`20260908130000_add_content_model`) is a real example of the expand→backfill→contract pattern this project uses for a NOT-NULL column added to a table with existing rows — read its header comment before writing another migration that touches a populated table.
- `prisma/seed/` — the content authoring pipeline (Phase 13, `docs/content/content-storage-architecture.md` §8): `content/*.json` (one file per content class, edited by hand for Phase 14) and `index.ts` (validates then idempotently upserts them by stable id — run via `npm run db:seed-content`, using `tsx` since it runs outside Next.js).
- `src/lib/diagnosis/engine.ts` — the DB-access-free derivation logic (tag accumulation, trigger-rule evaluation, severity banding, template rendering), imported by both `getDiagnosis.ts` (the runtime engine) and `prisma/seed/index.ts` (its `extractTemplateSlots` powers seed-time slot validation) — kept dependency-free of Prisma/DB access so both call sites can load their own content and reuse identical rule evaluation. `tsx` resolves the `@/*` path alias outside Next.js the same way `tsconfig.json` defines it, which is what makes this cross-context import work.
- `prisma7.config.ts` — Prisma's config file (this is its actual generated filename in the installed Prisma 7 version, not a typo); reads `DATABASE_URL` from `.env`.
- `next.config.ts` sets `output: "standalone"` — required by `docs/vps-runbook.md` step 11's systemd unit, which runs the standalone `server.js` directly.
- `src/app/globals.css` — Tailwind v4 entry point; its `@theme` block is where the brand's design tokens actually live (ported from `docs/design/design-tokens.json`). Dark-only — no light-mode variant exists or is planned.
- `public/icons/` — branded favicon/icon assets (SVG). `public/images/` — photographic/illustration assets (the landing page's header image).
- `docs/design/` — the brand's source material (guidelines doc, token JSON, logo source) — see its own `README.md`.

Docs were written in dependency order, each derived from the one before it:

1. `docs/product-brief.md` — the product concept, scope, and proposed tech stack.
2. `docs/requirements.md` — the brief restated as testable requirements (IDs like `R-AUTH-1`, `R-DIAG-2`); functional requirements cover auth, cat management, quiz flow, the diagnosis engine, and result history, plus non-functional requirements for hosting and data persistence.
3. `docs/architecture.md` — how the system will be built to satisfy those requirements: a single Next.js (TypeScript, App Router) app for UI + API routes, PostgreSQL via Prisma/Drizzle, session-based auth, and a deterministic (non-LLM) diagnosis engine. Requirement IDs are cited throughout for traceability.
4. `docs/vps-runbook.md` — one-time provisioning/hardening checklist for the target bare-metal VPS (non-root deploy user, SSH hardening, ufw, fail2ban, TLS via certbot, systemd service, deploy script).
5. `docs/design-system.md` — how the UI will look and behave: visual language, design tokens, and component conventions for retrofitting a real design onto the functional layer built in Phases 2–7. Plays the same role for the frontend that `architecture.md` plays for the backend.
6. `docs/workplan.md` — the sequenced build plan (phases 0–11) tying it all together, from project scaffolding through VPS provisioning, launch, and UI design.
7. `docs/specs-updates.md` — a cross-doc consistency check that found and resolved contradictions/gaps across the docs above (e.g. the sharing model, deletion cascades, password reset scope). Treat the docs above as already incorporating these resolutions; check here first if something in them still looks contradictory.
8. `docs/content/content-framework.md` — the content *shape and rules* spec (Question/Topic → Tag → Diagnosis → Treatment → Ritual derivation pipeline), written to drive the Phase 14 content-authoring pass; Phase 13 (below) implements the storage/engine shape it describes, but only with placeholder content — this doc still describes what Phase 14's real authoring pass should produce, not what's live today.
9. `docs/content/content-storage-architecture.md` — how that content model is stored in PostgreSQL and served (schema, seed workflow, engine behavior), derived from `content-framework.md` and `architecture.md`. Specifies `docs/workplan.md` Phase 13 (storage/engine plumbing, **shipped**) and Phase 14 (real content authoring, still proposed/pending approval).

## Key decisions to know before touching this repo

- **Diagnosis/ritual generation is rule-based, not an LLM call** — a deterministic mapping from quiz answers to DB-backed content (`R-DIAG-2`). As of Phase 13, `getDiagnosis` (`src/lib/diagnosis/getDiagnosis.ts`) accumulates weighted tags from the submitted answers and evaluates active `DiagnosisDef` trigger rules in priority order, first match wins; totality (`R-DIAG-5`, every possible answer combination must resolve to *some* result) is now guaranteed by a validated invariant — exactly one active catch-all `DiagnosisDef` with an always-true rule and the strictly-highest priority — rather than the earlier hash-bucket-into-a-static-pool approach, which was total by construction. `QuizAttempt`+`Diagnosis` creation is still one atomic DB transaction — no orphaned quiz attempts without a diagnosis.
- **"Shareable" result page (R-DIAG-3/4) means a public, unauthenticated link keyed on a separate `shareSlug`** (not the row id), showing only diagnosis/ritual/cat-name — distinct from the still-out-of-scope platform share integrations (OAuth, share buttons, share-count tracking).
- **Cat deletion is in scope (R-CAT-5)**: cascades to that cat's `QuizAttempt`/`Diagnosis` history (including share links), and the UI must confirm before deleting.
- **Cat `traits` are display-only this round (R-CAT-3/R-DIAG-2)** — shown on the cat's profile, not fed into `getDiagnosis`. Don't wire them into diagnosis logic without a deliberate scope change.
- **No self-service password reset this round (R-AUTH-4)** — out of scope by decision, not an oversight. Account recovery is a manual ops procedure (`vps-runbook.md` step 14, direct `psql`), not an email flow.
- **Auth rate-limiting is provisioned at the Nginx layer during VPS setup (`R-INFRA-4`, `vps-runbook.md` step 9, Phase 8)**, before the app is ever deployed (Phase 9) — not bolted on later in the Phase 11 hardening pass.
- **The systemd service runs a Next.js standalone build** (`output: "standalone"`), which is what actually produces the `server.js` the unit's `ExecStart` expects — don't assume a hand-rolled custom server.
- **Hosting is a self-managed bare-metal VPS**, not a managed platform like Vercel — the project owns provisioning and hardening (`docs/vps-runbook.md`) as part of the learning goal.
- **Content is edited by committing to seed/config data**, not through an admin CMS — that's explicitly out of scope for this round. As of Phase 13, that means `prisma/seed/content/*.json` (versioned JSON, one file per content class) applied via the idempotent `npm run db:seed-content` script — the storage engine is PostgreSQL, but the authoring workflow is still commit-to-repo, never an admin CMS. The old static `src/content/{quiz,diagnoses}.ts` files are deleted. Phase 13 shipped only placeholder content (today's 5 questions/10 diagnoses migrated into the new shape) — a real, rich content bank is Phase 14, separately gated.
- **Prisma was chosen over Drizzle** (Phase 0) — the default per `docs/architecture.md`, no learning-goal reason came up to prefer Drizzle instead.
- Whether sessions are stateless-signed-cookie or DB-backed is still open per `docs/architecture.md` — starts stateless.
- **The visual identity is fixed, not a Claude Code judgment call**: `docs/design/purrification-brand-guidelines.md` (dark-only, jewel-tone-and-gold "antique fortune-teller machine meets tarot deck") and its `design-tokens.json` are authoritative for palette/type/imagery/motion, ahead of `docs/design-system.md`. Don't introduce new colors/fonts without updating that chain — the one sanctioned exception is `--color-error-text`/`--color-error-hover` in `globals.css`, added because the brand's own `error` swatch fails WCAG AA for small text (documented in `design-system.md`'s accessibility rules).
- **Styling is Tailwind CSS v4**, config-in-CSS via the `@theme` block in `src/app/globals.css` (not a `tailwind.config.ts` — v4 doesn't use one here). CSS Modules only for the one genuinely bespoke component (`DiagnosisCard`); everything else is Tailwind utility classes on shared primitives in `src/components/ui/`.
- **`PageShell` (`src/components/ui/PageShell.tsx`) is an async Server Component** (it calls `getCurrentUser()`) — it cannot be imported into a `"use client"` file. Pages needing local state stay Server Components that render a separate client child component as `children`, the same pattern `cats/page.tsx` → `AddCatForm`/`CatList` and `login/page.tsx` → `LoginForm` already use. This bit a real build in-session; don't repeat it.

## Accessing the deploy target

The production VPS (`docs/vps-runbook.md`) is reachable over SSH via the alias `purrification-deploy`, configured in the operator's local `~/.ssh/config`. **Always use this alias — never a raw IP address or hardcoded path — in any command, script, or deploy instruction touching the deploy target.** The alias resolves host, user, and key material locally; nothing about that resolution should be duplicated or hardcoded into this repo.

**All of `docs/vps-runbook.md` (steps 1–13) is done, live, and exercised repeatedly** — SSH hardening, `ufw`, fail2ban, automatic updates, Node/PostgreSQL/Nginx, TLS via certbot, Nginx rate-limiting on the auth endpoints, the systemd service, and the deploy pipeline are all live at `purrification.com`. See `docs/vps-runbook.md`'s "Execution log" section for exact details and any deviations from the plan. The `deploy` user's passwordless sudo is scoped to `systemctl restart purrification` only — everything else needs an interactive password, by design.

**To deploy a change**, run step 12's repeat-deploy script over SSH via the `purrification-deploy` alias: `git pull origin main && npm ci && npm run build`, re-copy `public/` and `.next/static` into `.next/standalone/`, run `prisma migrate deploy` (with the `.env.production` sourcing workaround documented in step 12 — `prisma7.config.ts`'s `dotenv/config` only auto-loads `.env`), then `sudo systemctl restart purrification`. Verify with `curl -s -o /dev/null -w "%{http_code}" https://purrification.com/` and check `journalctl -u purrification` (needs `sudo`, which requires an interactive password — the passwordless rule only covers the restart itself) for errors after real traffic. This is a **production deploy to a live, public site** — treat it with the same care as any other production push, even though this project's standing instruction is not to pause for approval on routine git commits/pushes.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
