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
Built together with Phase 5 in one pass, not sequentially as originally
listed: `POST /api/cats/:id/quiz` only exists once per R-DIAG-5, and
shipping a version of it that persists a `QuizAttempt` without its
`Diagnosis` — even temporarily, between "Phase 4 done" and "Phase 5
done" — would violate that invariant for real, not just on paper (see
`CLAUDE.md`'s "Diagnosis/ritual generation is rule-based" key decision).
So the route was built complete from the start.
- [x] Author the quiz question bank as seed/config data (`content/quiz.ts`),
      per the "no admin CMS" out-of-scope decision. `src/content/quiz.ts`
      — 5 multiple-choice questions on the cat's recent
      behavior/environment (R-QUIZ-2).
- [x] Quiz UI: multi-step multiple-choice flow for a selected cat.
      `src/app/cats/[id]/quiz/page.tsx` (guard + ownership check) +
      `QuizFlow.tsx` (client, one question per step, Back/Next/Submit).
- [x] `POST /api/cats/:id/quiz` to record a `QuizAttempt` (answers + timestamp).
      `src/app/api/cats/[id]/quiz/route.ts` — see Phase 5 for the atomic
      Diagnosis creation this route also does.

## Phase 5 — Diagnosis engine & content pool (R-DIAG-1..5, R-TONE-1, R-TONE-2)
- [x] Author the diagnosis/ritual content pool (`content/diagnoses.ts`) —
      apply the tone guardrail during content writing/review, not at runtime.
      Seed it with at least one entry so the pool is never empty (required
      for R-DIAG-5's totality guarantee). `src/content/diagnoses.ts` — 10
      whimsical entries.
- [x] Implement `getDiagnosis(answers)` as a total function: hash the sorted
      answers and index into the content pool (`hash % pool.length`) rather
      than a switch/case with possible gaps, per `architecture.md`'s
      Diagnosis engine section. `src/lib/diagnosis/getDiagnosis.ts` — djb2
      hash of the sorted `questionId:optionId` pairs; a startup assertion
      throws if the pool is ever empty.
- [x] Wire `POST /api/cats/:id/quiz` to create the `QuizAttempt` and its
      `Diagnosis` (with a generated `shareSlug`) inside a single DB
      transaction — never commit one without the other (R-DIAG-5).
      `prisma.$transaction` in the route above; `shareSlug` uses the
      schema's `@default(cuid())`, no extra code needed.
- [x] Build the logged-in result/card page, including the persistent
      "for fun, see a vet if concerned" disclaimer. `src/app/results/[id]/page.tsx`
      (guard + ownership check).
- [x] Build the public, unauthenticated share page (`app/share/[shareSlug]`)
      per `architecture.md`'s Sharing section — diagnosis + ritual + cat name
      only, no account data (R-DIAG-4). `src/app/share/[shareSlug]/page.tsx`
      — `select`s only those three fields, nothing user-identifying.

## Phase 6 — History & dashboard (R-HIST-1, R-HIST-2)
- [x] `GET /api/cats/:id/history` route. `src/app/api/cats/[id]/history/route.ts`
      — guarded + ownership-checked, returns `QuizAttempt`s (each with its
      `Diagnosis`) newest-first.
- [x] Per-cat history view listing past diagnoses chronologically.
      `src/app/cats/[id]/history/page.tsx`, linked from the cat dashboard
      list. R-HIST-1 (past diagnoses saved) was already satisfied by the
      `Diagnosis` model + Phase 5's atomic write — this phase is the read
      side.

## Phase 7 — Landing page (R-LAND-1)
- [x] Marketing/landing page introducing the concept for signed-out visitors,
      linking into signup. `src/app/page.tsx` replaces the default
      create-next-app boilerplate; redirects signed-in visitors to `/cats`
      instead (nothing in R-LAND-1 requires this, but there's no reason to
      show the pitch to someone already using the app). Also updated
      `layout.tsx`'s metadata title/description off the scaffold defaults.

## Phase 8 — VPS provisioning (R-INFRA-1, R-INFRA-2, R-INFRA-4)
- [x] Execute `docs/vps-runbook.md` steps 1–10 on the target VPS (user/SSH
      hardening, firewall, fail2ban, automatic updates, Node/Postgres/Nginx
      install, TLS). Done and verified live on `purrification.com` as of
      2026-09-07 — see `vps-runbook.md`'s Execution log. Steps 11 (systemd)
      and 12 (deploy pipeline) are staged, not executed — they were blocked
      on application code existing; that blocker is now cleared by Phases
      0–7, so they're tracked in Phase 9 below rather than here.
- [x] Confirm step 9's Nginx `limit_req` rate limiting on `/api/login` and
      `/api/signup` is configured — the `limit_req_zone` and per-location
      directives are deployed and `nginx -t` passes, done before any app
      code existed (R-INFRA-4). End-to-end verification against a live,
      running endpoint needs Phase 9's first deploy — tracked there, not
      as a Phase 8 gap.
- [x] Run through the runbook's verification checklist and confirm every
      item. All items in `vps-runbook.md` step 13 are now checked except
      one: the step-12 *repeat*-deploy (`git pull`) path hasn't been
      exercised for real yet (only the first-deploy `git clone` path has) —
      tracked as a Phase 9 follow-up, not a Phase 8 gap.
- [x] Provision the production Postgres database and store its connection
      string in `.env.production` on the server (never in the repo). The
      database was provisioned in step 8 (`purrification` DB + role
      created); its `DATABASE_URL` was moved into
      `/home/deploy/purrification/.env.production` during Phase 9's first
      deploy (2026-09-07) — see `vps-runbook.md`'s Execution log.

## Phase 9 — Deploy pipeline & launch (R-INFRA-3)
- [x] Stand up the systemd service on the VPS per the runbook. Done
      2026-09-07 — see `vps-runbook.md`'s Execution log. It came up on its
      own: the unit had been crash-looping (`Restart=on-failure`) waiting
      for `server.js` to exist, and its next automatic retry succeeded the
      moment the first build produced one, before the planned manual
      `enable --now` step was reached. **One manual follow-up remains**:
      `sudo systemctl enable purrification` (boot persistence) still needs
      to be run by hand with `deploy`'s interactive sudo password — the
      passwordless sudoers rule only covers `restart`, not `enable`.
- [x] Wire the deploy script (or CI job) from `vps-runbook.md` step 12. Both
      paths are written and have been run for real: the first-deploy
      (`git clone`) path on 2026-09-07, and the repeat-deploy (`git pull`)
      path on 2026-09-08 (shipping the landing-page header image) — see
      `vps-runbook.md` step 13.
- [x] Do a full first deploy: build, migrate, restart, verify the live site
      over HTTPS. Done 2026-09-07 (repo is public, so no GitHub deploy key
      was needed — a plain HTTPS clone worked). Hit and documented one
      real gotcha: `prisma7.config.ts`'s `dotenv/config` only loads `.env`,
      not `.env.production`, so `prisma migrate deploy` needs those vars
      exported explicitly first — see `vps-runbook.md` step 12. Migration
      state was already current from Phase 1 ("No pending migrations to
      apply").
- [x] Run the runbook's rate-limiting check against the now-live
      `/api/login` to confirm it's actually enforced, not just configured.
      Confirmed live: 8 rapid requests returned six `401`s then `503`s once
      the `authlimit` zone's burst allowance was exceeded.
- [x] Smoke-test the golden path end-to-end in production: signup → add cat →
      take quiz → get diagnosis → view history. Exercised via `curl` against
      the live site (no browser available in this environment) — also
      verified the public `/share/[shareSlug]` page and cat-deletion cascade
      as a side effect. Test data cleaned up afterward via the API.

## Phase 10 — Design system & UI implementation (R-LAND-1, R-TONE-1, R-TONE-2)
Retrofits a real, flexible visual design onto the functional layer built in
Phases 2–7, which shipped with only inline styles and no shared layout. No
functional/behavior changes — UI only.

**Supersedes the open palette/type decision.** `docs/design-system.md` (the
plan this phase originally executed) left the palette, typography, and
light/dark scope deliberately open, pending a "style tile" exploration
step. `docs/design/purrification-brand-guidelines.md` — plus its companion
`design-tokens.json` and `tailwind.config.snippet.ts` — now answers all of
that directly: a dark-only, jewel-tone-and-gold "antique fortune-teller
machine meets tarot deck" identity, Cinzel Decorative/Cinzel/EB Garamond
typography, and concrete token values. The style-tile step is dropped; the
brand doc is now the authoritative source for anything it covers, ahead of
`design-system.md`.
- [x] Reconcile `design-system.md`'s placeholder token/typography/dark-mode
      sections against `purrification-brand-guidelines.md` (dark-only —
      drop the `prefers-color-scheme` light variant it assumed; the actual
      color roles, font roles, radius, and shadow/glow values from
      `design-tokens.json`; its "Open items" section no longer applies).
      Keep `design-system.md`'s parts that the brand doc doesn't cover
      (component-to-route inventory, the UI gaps survey, responsive rules).
- [x] Set up Tailwind CSS v4 (`@tailwindcss/postcss`, this Next.js
      version's own recommended default) and port `design-tokens.json`'s
      values into a Tailwind v4 `@theme` block in `globals.css`.
      `tailwind.config.snippet.ts` is written for classic JS-config
      Tailwind (`theme.extend` in `tailwind.config.ts`) — that shape needs
      translating to v4's CSS-native `@theme` syntax, not dropped in as-is.
- [x] Load the three brand fonts (Cinzel Decorative, Cinzel, EB Garamond)
      via `next/font/google` per the three-tier system in
      `purrification-brand-guidelines.md` §5 (display/heading/body).
- [x] Logo design pass — none exists yet (`purrification-brand-guidelines.md`
      §3/§11): a cat-silhouette-plus-otherworldly-sight mark (third eye /
      crescent moon / constellation), engraved-seal quality, gold-on-dark.
      Needed variants: full lockup, a simplified icon-only mark that stays
      legible at 16px (for the favicon), a single-color gold-on-dark
      version, and a "seal of completion" variant for a finished ritual.
      Store source/exports in `docs/design/`; ship the icon-only mark as
      the site favicon in `public/icons/` (replacing the default Next.js
      favicon) and confirm `layout.tsx`'s metadata reflects the identity.
      Hand-authored SVG, not AI-generated — this sandbox's `codex` CLI
      doesn't expose the image-generation subcommand the `openai-imagegen`
      skill documents (bug filed); a vector mark suits the 16px-legibility
      requirement better than a rasterized illustration anyway. Full lockup
      deferred to the `PageShell` primitive as a live component rather than
      a flattened export, so it stays crisp/responsive in the header.
- [x] Build the shared primitives (`src/components/ui/`) per
      `design-system.md`'s route-mapped inventory (`PageShell`, `Button`,
      `Card`, `Field`, `EmptyState`), styled per the brand doc's §7/§9
      guidance (rounded-full/rounded-lg buttons with gold border or fill
      and glow-on-hover, spacious/airy density, soft gold/purple glow
      instead of hard drop shadows, mobile-first).
- [x] Add a `Modal`/`Dialog` primitive per the brand doc's v1 component
      scope (§9) and use it for the cat-deletion confirmation (R-CAT-5),
      replacing the current bare `window.confirm`.
- [x] Add a toast/notification primitive per the brand doc's v1 component
      scope (§9) — its suggested "glowing candle" motif — for signup/login/
      quiz-submission errors and successes, replacing ad hoc inline error
      text.
- [x] Build `DiagnosisCard`, the bespoke shareable result component
      (`src/components/diagnosis/`), and wire it into both `results/[id]`
      and `share/[shareSlug]` (same component, two contexts —
      R-DIAG-3/R-DIAG-4). Apply the brand doc's motion guidance (§8):
      slow/dreamy fade-and-drift entrance, glow-pulse reserved for this
      kind of single focal moment, not ambient decoration.
- [ ] Per §6's AI-imagery rules, either confirm the existing landing-page
      header image (`public/images/header-fortune-cat.png`, duplicated for
      reference at `docs/design/header-fortune-cat.png`) matches the
      reusable prompt template, or regenerate it so it does (via the
      `openai-imagegen` skill); use the same template for any new imagery
      this phase adds.
- [ ] Retrofit every existing page onto the new primitives/tokens, removing
      inline styles: landing (`page.tsx`), signup/login, cats dashboard
      (`cats/page.tsx`, `AddCatForm`, `CatList`, `LogoutButton`), quiz flow
      (`QuizFlow.tsx` + a new progress indicator, using the brand doc's
      restrained-clarity guidance for anything table-like), history
      (`cats/[id]/history/page.tsx`). Add the `PageShell` nav/footer these
      pages currently lack (see `design-system.md`'s "Gaps found").
- [ ] Responsive pass (375px / 768px / 1280px, mobile-first per §7) and an
      accessibility pass: `:focus-visible` states, plus the color-on-color
      contrast check `purrification-brand-guidelines.md` §11.3 explicitly
      flags as unverified (e.g. a burgundy button on an emerald background)
      now that real screens exist, alongside the already-verified
      parchment-on-near-black text contrast.
- [ ] Visual QA via the `run` skill against the dev server (mobile +
      desktop — dark-only, so no light-mode pass needed) for every route
      before considering this phase done.
- [ ] `npm run lint` / `format:check` clean; deploy via the established
      Phase 9 pipeline once verified.

## Phase 11 — Hardening pass / polish
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

## Resolved decisions
- Prisma vs. Drizzle: Prisma (Phase 0) — see `CLAUDE.md`'s "Key decisions to
  know" for why.
- Stateless vs. DB-backed sessions: stateless signed cookie, no session
  table (Phase 2) — `src/lib/auth/session.ts`.
- Exact quiz length and content-pool size: 5 questions
  (`src/content/quiz.ts`) and 10 diagnosis/ritual entries
  (`src/content/diagnoses.ts`) (Phase 4/5).
