# Purrification — Workplan

Sequenced build plan derived from `docs/product-brief.md`, `docs/requirements.md`,
`docs/architecture.md`, and `docs/vps-runbook.md`. Phases are ordered by
dependency (each assumes the previous phases are done); within a phase, tasks
can generally happen in any order. Requirement IDs are referenced for
traceability back to `requirements.md`.

## Phase 0 — Project scaffolding
- [x] Init Next.js (TypeScript, App Router) project per `architecture.md`'s
      app-layer plan.
- [x] Set up Prisma (or Drizzle — decide per architecture.md's open question)
      and point it at a local Postgres instance for dev. Prisma chosen (the
      default); `DATABASE_URL` in `.env` points at a local dev Postgres, but
      no such instance was reachable in the scaffolding environment itself —
      see Phase 1 below.
- [x] Add basic project tooling: linter, formatter, `.env.example`.
- [x] Update root `CLAUDE.md`'s "Current state" section once real build/lint/
      test commands exist (per its own instruction).

## Phase 1 — Data layer (R-DATA-1, R-DATA-2)
- [x] Write the Prisma schema from `architecture.md`'s model sketch: `User`,
      `Cat`, `QuizAttempt`, `Diagnosis`.
- [x] Generate and run the first migration. Applied via `npm run db:migrate`
      (now `prisma migrate deploy`) against the VPS's Postgres instance
      (`purrification-deploy`, provisioned in `vps-runbook.md` step 8) over
      an SSH tunnel — see `CLAUDE.md`'s "Current state" for why this project
      uses that instance instead of a separate local dev Postgres. Confirmed
      clean with `prisma migrate status`.
- [x] Add typed data-access helpers (`lib/db/*`) used by later API routes.
      `src/lib/db/client.ts` exports a singleton `PrismaClient` (via the
      `@prisma/adapter-pg` driver adapter, required by Prisma 7's
      engine-less client) cached on `globalThis` to survive Next.js dev-mode
      hot reload. Verified end-to-end against the migrated schema.

## Phase 2 — Auth (R-AUTH-1, R-AUTH-2, R-AUTH-3, R-AUTH-4)
- [x] Password hashing/verification helper (bcrypt or argon2) — keep this
      importable standalone (not buried in a route handler), since
      `vps-runbook.md`'s manual account-recovery step (R-AUTH-4) calls it
      directly from the server. `src/lib/auth/password.ts`, `bcryptjs`
      (pure-JS bcrypt — avoids needing native build tools on the VPS at
      deploy time, unlike `bcrypt`/`argon2`'s compiled bindings).
- [x] `POST /api/signup`, `POST /api/login`, `POST /api/logout` routes.
      `src/app/api/{signup,login,logout}/route.ts`.
- [x] Session issuance (start stateless signed cookie per architecture.md).
      `src/lib/auth/session.ts` — HMAC-SHA256-signed cookie payload
      (`SESSION_SECRET`), no session table.
- [x] Signup and login pages/forms. `src/app/{signup,login}/page.tsx`.
- [x] Auth middleware/guard for protected routes and pages.
      `src/lib/auth/guard.ts`'s `getCurrentUser()` — usable from both
      Server Components (redirect on null) and Route Handlers (401 on
      null); no protected pages exist yet to wire it into (Phase 3+).
- [x] No "forgot password" UI this round — confirm the login page doesn't
      imply one (e.g. no dead "forgot password?" link) per R-AUTH-4.
      Verified — no such link exists.

## Phase 3 — Cat management (R-CAT-1..5)
- [x] `POST /api/cats`, `GET /api/cats`, `PATCH /api/cats/:id`,
      `DELETE /api/cats/:id` routes — delete cascades to that cat's
      `QuizAttempt`/`Diagnosis` history per the schema's `onDelete: Cascade`
      (R-CAT-5). All routes guarded by `getCurrentUser()`; ownership is
      checked per-cat (404, not 403, on someone else's cat — avoids leaking
      which ids exist).
- [x] "Add a cat" form (name + optional traits — traits are display-only
      flavor, not wired into diagnosis generation; see R-CAT-3).
      `src/app/cats/AddCatForm.tsx` — traits entered as a comma-separated
      field, stored as a `string[]`.
- [x] Cat list/dashboard view for a logged-in user, including a delete
      action with a confirmation step (R-CAT-5). `src/app/cats/page.tsx`
      (guards + redirects to `/login` if signed out) with
      `CatList.tsx`/`AddCatForm.tsx`/`LogoutButton.tsx`. Delete confirms via
      `window.confirm` before calling the API.

## Phase 4 — Quiz content & flow (R-QUIZ-1..3)
- [ ] Author the quiz question bank as seed/config data (`content/quiz.ts`),
      per the "no admin CMS" out-of-scope decision.
- [ ] Quiz UI: multi-step multiple-choice flow for a selected cat.
- [ ] `POST /api/cats/:id/quiz` to record a `QuizAttempt` (answers + timestamp).

## Phase 5 — Diagnosis engine & content pool (R-DIAG-1..5, R-TONE-1, R-TONE-2)
- [ ] Author the diagnosis/ritual content pool (`content/diagnoses.ts`) —
      apply the tone guardrail during content writing/review, not at runtime.
      Seed it with at least one entry so the pool is never empty (required
      for R-DIAG-5's totality guarantee).
- [ ] Implement `getDiagnosis(answers)` as a total function: hash the sorted
      answers and index into the content pool (`hash % pool.length`) rather
      than a switch/case with possible gaps, per `architecture.md`'s
      Diagnosis engine section.
- [ ] Wire `POST /api/cats/:id/quiz` to create the `QuizAttempt` and its
      `Diagnosis` (with a generated `shareSlug`) inside a single DB
      transaction — never commit one without the other (R-DIAG-5).
- [ ] Build the logged-in result/card page, including the persistent
      "for fun, see a vet if concerned" disclaimer.
- [ ] Build the public, unauthenticated share page (`app/share/[shareSlug]`)
      per `architecture.md`'s Sharing section — diagnosis + ritual + cat name
      only, no account data (R-DIAG-4).

## Phase 6 — History & dashboard (R-HIST-1, R-HIST-2)
- [ ] `GET /api/cats/:id/history` route.
- [ ] Per-cat history view listing past diagnoses chronologically.

## Phase 7 — Landing page (R-LAND-1)
- [ ] Marketing/landing page introducing the concept for signed-out visitors,
      linking into signup.

## Phase 8 — VPS provisioning (R-INFRA-1, R-INFRA-2, R-INFRA-4)
- [ ] Execute `docs/vps-runbook.md` end to end on the target VPS (user/SSH
      hardening, firewall, fail2ban, Node/Postgres/Nginx install, TLS).
- [ ] Confirm step 9's Nginx `limit_req` rate limiting on `/api/login` and
      `/api/signup` is configured — this must be in place *before* Phase 9
      deploys the app, not added afterward (R-INFRA-4).
- [ ] Run through the runbook's verification checklist and confirm every item.
- [ ] Provision the production Postgres database and store its connection
      string in `.env.production` on the server (never in the repo).

## Phase 9 — Deploy pipeline & launch (R-INFRA-3)
- [ ] Stand up the systemd service on the VPS per the runbook.
- [ ] Wire the deploy script (or CI job) from `vps-runbook.md` step 12.
- [ ] Do a full first deploy: build, migrate, restart, verify the live site
      over HTTPS.
- [ ] Run the runbook's rate-limiting check against the now-live
      `/api/login` to confirm it's actually enforced, not just configured.
- [ ] Smoke-test the golden path end-to-end in production: signup → add cat →
      take quiz → get diagnosis → view history.

## Phase 10 — Hardening pass / polish
- [ ] Tune the `rate=5r/m` / `burst=5` rate-limit values from `vps-runbook.md`
      step 9 based on real traffic (the Phase 8 values are a starting point,
      not a final answer — see `vps-runbook.md` Notes).
- [ ] Add a nightly `pg_dump` backup job (flagged as a follow-up in
      `vps-runbook.md`).
- [ ] Review all shipped diagnosis/ritual content once more against
      R-TONE-1/R-TONE-2 before considering this round "done."

## Explicitly not planned this round
Carried from `requirements.md`'s Out of scope: payments/subscriptions,
physical fulfillment, social sharing integrations, admin CMS.

## Open decisions to resolve before/at the relevant phase
- Prisma vs. Drizzle (Phase 0).
- Stateless vs. DB-backed sessions (Phase 2) — start stateless.
- Exact quiz length and content-pool size (Phase 4/5) — no fixed number yet.
