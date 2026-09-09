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
      `enable --now` step was reached. **Manual follow-up resolved**:
      `sudo systemctl enable purrification` (boot persistence) needed to be
      run by hand with `deploy`'s interactive sudo password — the
      passwordless sudoers rule only covers `restart`, not `enable`. No
      Claude Code session ever had that password; confirmed during the
      Phase 11 hardening pass (2026-09-08) that `systemctl is-enabled
      purrification` now reports `enabled`, so an operator must have run it
      by hand between sessions.
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
- [x] Per §6's AI-imagery rules, either confirm the existing landing-page
      header image (`public/images/header-fortune-cat.png`, duplicated for
      reference at `docs/design/header-fortune-cat.png`) matches the
      reusable prompt template, or regenerate it so it does (via the
      `openai-imagegen` skill); use the same template for any new imagery
      this phase adds.
- [x] Retrofit every existing page onto the new primitives/tokens, removing
      inline styles: landing (`page.tsx`), signup/login, cats dashboard
      (`cats/page.tsx`, `AddCatForm`, `CatList`, `LogoutButton`), quiz flow
      (`QuizFlow.tsx` + a new progress indicator, using the brand doc's
      restrained-clarity guidance for anything table-like), history
      (`cats/[id]/history/page.tsx`). Add the `PageShell` nav/footer these
      pages currently lack (see `design-system.md`'s "Gaps found").
- [x] Responsive pass (375px / 768px / 1280px, mobile-first per §7) and an
      accessibility pass: `:focus-visible` states, plus the color-on-color
      contrast check `purrification-brand-guidelines.md` §11.3 explicitly
      flags as unverified (e.g. a burgundy button on an emerald background)
      now that real screens exist, alongside the already-verified
      parchment-on-near-black text contrast. Found and fixed a real
      failure (`--color-error` text) — see `design-system.md`'s
      accessibility rules. Verified via computed contrast ratios and a
      mobile-first, no-fixed-widths code audit, not literal screenshots —
      this sandbox has no usable headless browser (see Phase 9/earlier
      notes); a from-scratch responsive/visual check is worth a real pass
      once someone can view it in an actual browser.
- [x] Visual QA via the `run` skill against the dev server (mobile +
      desktop — dark-only, so no light-mode pass needed) for every route
      before considering this phase done. No literal screenshot was
      possible (no usable headless browser in this sandbox — missing
      system libs, no root to install them, confirmed via the `run`
      skill's own fallback path). Substituted the strongest verification
      available without one: full authenticated end-to-end runs (signup →
      add cat → quiz → results → share → history → delete-with-cascade)
      against the real tunneled database, checking every expected string
      renders and the server log has zero errors, plus confirming every
      new Tailwind utility actually compiled into the served CSS rather
      than silently no-oping on a typo.
- [x] `npm run lint` / `format:check` clean; deploy via the established
      Phase 9 pipeline once verified. Deployed 2026-09-08 via the
      repeat-deploy (`git pull`) script from `vps-runbook.md` step 12 —
      build succeeded clean on the server, no pending migrations, service
      restarted, and a full production smoke test (same golden path as
      above) run directly against `https://purrification.com` confirmed
      no errors in the systemd journal and the cascade-delete/share-404
      behavior still correct in the live standalone build.

## Phase 11 — Hardening pass / polish
- [x] Tune the `rate=5r/m` / `burst=5` rate-limit values from `vps-runbook.md`
      step 9 based on real traffic (the Phase 8 values are a starting point,
      not a final answer — see `vps-runbook.md` Notes). Investigated
      2026-09-08 — see `vps-runbook.md`'s Phase 11 Execution log entry for
      the full account. Couldn't read Nginx's access log directly (`deploy`
      isn't in the `adm` group, and no session has `deploy`'s interactive
      sudo password); `journalctl -u purrification` (readable without
      `sudo`) showed no evidence of real login/signup volume, let alone
      volume that's ever tripped `authlimit`'s burst allowance outside the
      deliberate Phase 9 test. **Conclusion: left unchanged** — there isn't
      yet enough real traffic to tune the starting values against, and
      changing them without evidence would just be a different guess.
      Revisit once the app has real users.
- [x] Add a nightly `pg_dump` backup job (flagged as a follow-up in
      `vps-runbook.md`). Done 2026-09-08 — `scripts/backup-db.sh` (new,
      committed) dumps via the app's own DB role (no `postgres`-OS access
      needed), scheduled through `deploy`'s crontab (03:30 UTC nightly,
      since a system-level systemd timer would need root `deploy` doesn't
      have passwordless sudo for) with 14-day local retention. Verified
      live: ran by hand, produced a valid gzip'd dump, `gzip -t` clean. See
      `vps-runbook.md` step 15 — includes a documented known gap
      (same-server-only storage; off-server shipping needs infra/credentials
      this project doesn't have yet).
- [x] Review all shipped diagnosis/ritual content once more against
      R-TONE-1/R-TONE-2 before considering this round "done." Reviewed
      2026-09-08: all 10 `diagnosisPool` entries and all 5 quiz questions
      read as whimsical/tongue-in-cheek, none phrase anything as real
      medical/behavioral advice, none use scammy/urgency language (R-TONE-1);
      `PageShell`'s persistent disclaimer (R-TONE-2) confirmed rendering on
      every route, including both places a diagnosis is actually shown
      (`results/[id]` and the public `share/[shareSlug]` page). No content
      changes needed.

## Phase 12 — Visual richness pass (design upgrade round 2) — **proposed, pending approval**
Not yet approved — do not start any item below without an explicit
go-ahead. `docs/design-upgrade-round-2.md` is the full plan: it evaluates
the current live UI (only one AI-generated image exists anywhere in the
product, `DiagnosisCard` shipped purely typographic, the already-designed
`seal-of-completion.svg` is unused, every route is an identical flat
column, the background has no atmosphere beyond a flat fill) and proposes
four work packages to close that gap. No change to brand palette/type/
tokens — this uses the existing identity more fully, it doesn't change it.
- [x] WP1 — Atmosphere: background vignette/texture/fog treatment and an
      engraved-frame language for `PageShell` and shared surfaces (see
      `design-upgrade-round-2.md`'s WP1). Shipped as a single fixed
      `.app-atmosphere` layer (globals.css) rendered once in `layout.tsx` —
      a soft jewel-tone corner glow plus a static SVG feTurbulence grain
      texture, no binary asset — behind every page; a `.hero-fog` utility
      (slow-drifting blurred gradient, `prefers-reduced-motion`-gated) on
      the landing hero and both `DiagnosisCard` contexts; and a new
      `OrnamentalRule` primitive (hairline + centered gold diamond)
      replacing `PageShell`'s plain header/footer borders. No token changes.
      Verified: `npm run lint`/`build` clean, dev-server curl checks confirm
      the new classes render on `/`, `/login`, `/signup`; contrast reasoning
      documented inline in `globals.css` (glow opacity low enough, and
      concentrated away from the centered text column, that the ~14:1
      text-on-`bg-base` contrast Phase 10 verified isn't meaningfully
      affected). No visual/screenshot check possible — see `CLAUDE.md`'s
      "Current state" on this sandbox's lack of a headless browser.
- [x] WP2 — Imagery: a full image set through the brand doc's reusable
      prompt template — one illustration per diagnosis archetype, the
      unused seal wired into a completion moment, and imagery for signup/
      login/dashboard/empty states (see WP2). Shipped 14 images, all via
      `codex exec` per this project's memory on image generation (the
      documented save-to-path step failed with a sandbox error every time;
      worked around by locating each PNG under
      `~/.codex/generated_images/` and copying it into the repo directly —
      worth updating that memory) — one per `diagnosisPool` entry
      (`public/images/diagnoses/`, 4:5, "card thumbnail" per the brand
      doc's aspect-ratio table) wired into `DiagnosisCard` via a new
      `getDiagnosisImage()` helper that matches a stored `diagnosisText`
      back to its content-pool entry (no schema change — the pool is
      static and `diagnosisText` is always written verbatim); the
      already-designed `seal-of-completion.svg` wired in as an animated
      stamp on the same card; and four `public/images/pages/` illustrations
      (16:9 hero/banner) for signup, login, the cats dashboard, and a
      shared 1:1 `EmptyState` illustration (zero-cats, zero-history).
      Verified: `npm run lint`/`build` clean; a full authenticated curl
      run (signup → add cat → quiz → results → share → history → delete)
      confirmed every new image URL and the seal actually render on each
      page, with zero errors in the dev server log.
- [x] WP3 — Theatrical component detail: tarot-card-style quiz options, a
      literal glowing-candle `Toast`, `DiagnosisCard`'s double-border
      treatment extended to `Card`, a history "reading log" timeline (see
      WP3). Also finally implemented `--animate-glow-pulse` (named in
      `design-tokens.json` since Phase 10 but never actually built until
      now) for the selected-quiz-option state and a one-time
      `wordmark-glow` on `PageShell`'s mark; nav links/logout got a
      `.nav-link` engraved-underline hover treatment. Verified:
      `npm run lint`/`build` clean; an authenticated curl run confirmed the
      new option-card markup, `nav-link`/`wordmark-glow`/`Card`'s inset
      border, and the history timeline's connecting `border-l` thread all
      render, with zero errors in the dev server log.
- [x] WP4 — Motion & rhythm: break the uniform column for hero moments,
      staggered entrances, a themed quiz-submit loading state, hover/press
      micro-interactions, a full `prefers-reduced-motion` audit (see WP4).
      Scope note: only the landing page got the wider treatment (a new
      `PageShell` `wide` prop, `max-w-4xl` with an inner `max-w-2xl` text
      column so prose doesn't over-stretch) — on review, widening
      `DiagnosisCard` itself would have fought its portrait "tarot card"
      identity rather than added breathing room, so that one stays at the
      standard width, and its "hero moment" quality comes from WP2's
      illustration/seal instead. The "ink-stamp press" bullet was already
      delivered by WP2's `seal-stamp` keyframe (a real impact animation,
      not just a fade), so nothing new was added there. Also closed a
      pre-existing gap while auditing reduced-motion: `.animate-fade-in`
      itself (used since Phase 10) had never been gated — now is, since
      WP4 puts it to much wider use (staggered list/card entrances).
      Verified: `npm run lint`/`build` clean; curl checks confirm the wide
      layout, staggered list markup, and dashboard hover classes render;
      a full authenticated run (2 cats, quiz, delete-with-cascade) again
      showed zero dev-server errors.

## Phase 13 — Content storage foundation (R-CONTENT-1..6, R-DATA-1, R-DATA-2)
Full spec: `docs/content/content-storage-architecture.md`. Pure
storage/engine plumbing, no editorial judgment: moved quiz/diagnosis
content from the static `src/content/{quiz,diagnoses}.ts` files into
PostgreSQL, structured to fully support `docs/content/content-framework.md`'s
Question→Tag→Diagnosis→Treatment→Ritual pipeline. Migrated *today's*
existing 5 questions and 10 diagnosis/ritual entries into the new shape as
placeholder content (minimal tag scaffolding — one dedicated tag per answer
option; 9 of the 10 `DiagnosisDef` rows trigger on a single signature tag,
the 10th is the catch-all; no personalization slots used, preserving the
old un-personalized copy verbatim) so live app behavior is unchanged.
Deployed and verified live 2026-09-09 — see the notes under each item and
Execution log below. Authoring a real, rich content bank (real tag
vocabulary, real trigger rules, 10 real diagnoses/treatments/rituals) is
separate, later, gated work — see Phase 14.
- [x] Add the new content-model tables to `prisma/schema.prisma` per
      `content-storage-architecture.md` §7: `Tag`, `QuestionTopic`,
      `Question`, `AnswerOption`, `AnswerOptionTagEffect`, `Treatment`,
      `DiagnosisDef`, `DiagnosisDefTreatment`, `Ritual` — stable authored
      string ids, `Json` for `triggerRule`/`severityBands`/
      `selectionConditions`, native Postgres arrays for list fields,
      `isActive` flags (content is retired, never hard-deleted).
- [x] Amend the existing `Diagnosis` model: add `diagnosisDefId`/
      `treatmentId`/`ritualId` FKs (`onDelete: Restrict`),
      `tagTotalsSnapshot`, `severityLabel`; keep `diagnosisText`/
      `ritualText` as frozen rendered output (R-CONTENT-6).
- [x] Generate and run the migration against the VPS Postgres instance per
      the existing `db:migrate` workflow; confirm `prisma migrate status`
      clean. No shadow-database privileges on this role, so the migration
      was hand-written rather than generated via `migrate diff
      --from-migrations` (which needs one) — cross-checked against a
      `migrate diff --from-empty` dump of the target schema for exact
      column/constraint syntax. Production already had 16 real `Diagnosis`
      rows, so the new FK/JSON columns couldn't just be declared `NOT
      NULL` in one step; the migration follows expand → backfill →
      contract in a single atomic transaction (create the content tables,
      insert this phase's placeholder content, add the new columns
      nullable, backfill every existing row by matching its `diagnosisText`
      to the `DiagnosisDef` it originated from, then tighten to `NOT
      NULL` and add the FK constraints) — see the migration file's own
      header comment for the full reasoning. Applied cleanly 2026-09-09:
      `prisma migrate deploy` succeeded on the first try, and a follow-up
      query confirmed 0 of the (by then) 20 `Diagnosis` rows were left
      with a null `diagnosisDefId` — every row matched.
- [x] Build the seed pipeline (`prisma/seed/content/*.json`,
      `prisma/seed/index.ts`) per §8: idempotent upsert-by-stable-id, with
      the authoring-rule validations the spec describes (tag references
      resolve, exactly one active catch-all `DiagnosisDef`, personalization
      slots match templates, non-empty `contraindications`/`stepsTemplate`,
      non-overlapping severity bands, mutually-exclusive or
      priority-ordered sibling ritual variants). Added `npm run
      db:seed-content` (via `tsx`, a new dev dependency, since this script
      runs outside Next.js). Deliberately does *not* itself contain the
      legacy-row backfill logic above — that's a one-time data migration,
      correctly scoped to the migration.sql that needed it, not the
      ongoing content-authoring script. Run for real against production
      immediately after the migration: upserted cleanly with zero
      validation errors and zero stale-content warnings (expected — its
      input mirrors exactly what the migration had already inserted).
- [x] Migrate today's 5 questions and 10 diagnosis/ritual entries into the
      new seed JSON as placeholder content (see intro above). Verified
      programmatically before writing the migration that every placeholder
      `description_template` matches the original `diagnosisText` strings
      byte-for-byte (the backfill migration's JOIN depends on exact
      equality) — all 10 matched on the first check.
- [x] Rewrite `getDiagnosis` to the DB-backed engine per §9: cached active-
      content load, tag accumulation, priority-ordered trigger-rule
      evaluation with first-match-wins, severity banding, default-treatment
      + severity-matched-ritual selection, fail-loud slot-validated
      template rendering — called from within the existing
      `POST /api/cats/:id/quiz` transaction (R-DIAG-5 unchanged). Shared
      DB-access-free rule logic factored into `src/lib/diagnosis/engine.ts`,
      imported by both this and the seed script's slot validation.
- [x] Replace `getDiagnosisImage`'s text-equality lookup with a direct
      `diagnosis.diagnosisDef.imagePath` FK read (R-CONTENT-5).
      `getDiagnosisImage.ts` deleted entirely — `results/[id]` and
      `share/[shareSlug]` now `include`/`select` `diagnosisDef.imagePath`
      directly and pass it straight to `DiagnosisCard`.
- [x] Update `POST /api/cats/:id/quiz`'s answer validation and the quiz UI
      to read active `Question`/`AnswerOption` rows from the DB instead of
      the static `content/quiz.ts` import.
- [x] Add the boot-time totality guard (an active catch-all `DiagnosisDef`
      exists) as defense-in-depth alongside seed-time validation
      (R-CONTENT-4). Necessarily a first-use check now (`loadContent`'s
      first call), not a true module-load-time one, since it needs a DB
      round-trip — see `getDiagnosis.ts`'s comment on why this is a
      deliberately weaker guarantee than the old hash-bucket approach.
- [x] Delete `src/content/quiz.ts` and `src/content/diagnoses.ts` once the
      DB-backed path is fully wired and verified.
- [x] Update `CLAUDE.md` and `docs/architecture.md`'s Data model/Content
      storage sections to describe the shipped (not just planned) schema
      and engine. Added `npm run db:seed-content` as a deploy step in
      `vps-runbook.md` step 12.
- [x] Full golden-path smoke test (signup → add cat → quiz → diagnosis →
      share → history → delete-cascade), confirming identical observable
      behavior to the pre-migration app. Run for real against
      `https://purrification.com` 2026-09-09 via `curl` — see the
      Execution log below for the full account, including two separate
      quiz submissions to exercise both a specific rule match and the
      catch-all fallback.

### Execution log — 2026-09-09
- Deployed from `main` after merging PR #16 (not from the feature branch
  directly — an earlier attempt to build/deploy the unmerged branch on the
  live server was blocked by this session's own safety tooling, which
  reads as a deliberate signal to keep to this project's documented
  `git pull origin main`-based deploy convention rather than deviate from
  it, even temporarily, for validation). Took a fresh manual `pg_dump`
  backup (`scripts/backup-db.sh`, Phase 11) immediately before running the
  migration, on top of that night's already-successful cron backup.
- `npm ci && npm run build` succeeded clean on the server. `prisma migrate
  deploy` applied the new migration in one shot — the fact that it
  succeeded at all confirms the backfill JOIN matched every existing row
  (a failed match would have surfaced as a `NOT NULL` constraint violation
  and rolled back the whole transaction). `npm run db:seed-content` then
  confirmed idempotency: zero validation errors, zero stale-content
  warnings. `sudo systemctl restart purrification` came back
  `active (running)` immediately.
- Full smoke test via `curl` against the live site: signup → add cat →
  submit quiz with answers chosen to trigger `diag_mercury_retrograde`
  (`mood: aloof`) — confirmed the returned `diagnosisDefId`/`treatmentId`/
  `ritualId`, a `tagTotalsSnapshot` with all 5 submitted tags at weight 3
  each, `severityLabel: "present"`, and correctly slot-rendered
  `diagnosisText`/`ritualText` (no leftover `{slot}` literals) — then a
  second submission with answers chosen to match *no* diagnosis's
  signature tag, confirming it fell through to the `diag_meditative_aloofness`
  catch-all exactly as designed. Confirmed the results page and the public
  share page both render the correct `diagnosisDef.imagePath`-sourced
  image (R-CONTENT-5's direct FK read, not the old text-equality lookup).
  Confirmed the history API returns both attempts. Deleted the test cat —
  cascade-deleted both `QuizAttempt`/`Diagnosis` rows, confirmed by the
  second attempt's share link 404ing immediately after. `journalctl -u
  purrification` showed zero errors/warnings across the whole test window
  (excluding the pre-existing, unrelated bot-scanner noise on Next.js
  server actions documented in `vps-runbook.md`'s Phase 11 Execution log).
  Test data cleanup: the test cat and its history were deleted via the API
  (cascade delete verified as a side effect, as above); the throwaway test
  `User` row was left in place, consistent with every prior phase's smoke
  test (no delete-account endpoint exists).

## Phase 14 — Rich content authoring pass — **proposed, pending approval**
Not yet approved — do not start any item below without an explicit
go-ahead, and depends on Phase 13 being live first. The actual content-
design work `docs/content/content-framework.md` was written to drive —
distinct in kind from Phase 13's plumbing (editorial/tone judgment, not
schema/engine work).
- [ ] Define the canonical tag vocabulary up front, before any question or
      diagnosis authoring begins (per `content-storage-architecture.md`
      §10.1).
- [ ] Author a full question bank organized into topics, each answer
      option carrying real tag effects.
- [ ] Author 10 `DiagnosisDef` entries (per §10.2) with real trigger rules,
      including a `none_of` exclusion wherever two diagnoses could
      plausibly both fire from overlapping tags.
- [ ] Author the corresponding `Treatment` entries with real, populated
      `contraindications` the app can actually evaluate (severity-based
      this round, not cat-trait-based — see §9 point 6).
- [ ] Author `Ritual` variants selected by severity band, each with at
      least 3 concrete sequential steps and a per-ritual incantation
      decision (structural support already in place per §10.4).
- [ ] Full tone/content review of every new entry against R-TONE-1/R-TONE-2.
- [ ] Re-run `npm run db:seed-content` against the real content and
      re-verify all seed-time invariants at real scale.
- [ ] Golden-path + multi-path smoke test confirming distinct tag-total
      combinations route to distinct, correct diagnosis/treatment/ritual
      results.

## Phase 15 — Diagnosis image pool (R-CONTENT-5 extension) — **proposed, pending approval**
Not yet approved — do not start without an explicit go-ahead; independent of
Phase 14 (doesn't need real content authored first). **Goal:** change Phase
13's one-image-per-`DiagnosisDef` model (`imagePath String?`) to a
one-to-many pool of candidate images, so future content authoring can attach
multiple illustrations to a single diagnosis for visual variety, while
keeping today's "one illustration shown per result" UX. The image shown for
a given result is picked randomly from its `DiagnosisDef`'s pool, but
**stable per `Diagnosis` row** — the same result shows the same image on
every repeat view and every viewing of its public share link — computed
deterministically from that row's id rather than stored on it (consistent
with `imagePath` already being live-joined content today, not R-CONTENT-6
frozen output like `diagnosisText`/`ritualText`; the one accepted tradeoff
is that a result's picked image can shift if its `DiagnosisDef`'s image pool
is edited later, the same live-content behavior `imagePath` already has).

**Execution steps:**
- [ ] Add a `DiagnosisDefImage` child table to `prisma/schema.prisma`
      (composite `@@id([diagnosisDefId, sortOrder])`, no independent
      `isActive`/lifecycle — same shape as the existing
      `DiagnosisDefTreatment` link table), with `DiagnosisDef.images
      DiagnosisDefImage[]`; remove `DiagnosisDef.imagePath`.
- [ ] Hand-write the migration in the same expand → backfill → contract,
      single-transaction style as Phase 13's
      `20260908130000_add_content_model` (cited in `CLAUDE.md`): create
      `DiagnosisDefImage`, backfill one row per existing non-null
      `imagePath` at `sortOrder 0`, then drop the old column. Apply via
      `npm run db:migrate` against the VPS DB.
- [ ] Update the seed pipeline: `prisma/seed/content/diagnoses.json`'s
      `image_path: string|null` becomes `image_paths: string[]` (all 10
      existing entries become a one-element array); `prisma/seed/index.ts`'s
      `RawDiagnosisDef` and `upsertContent()` sync each diagnosis's image
      rows by delete-then-recreate per `diagnosisDefId` — these child rows
      have no identity of their own outside the array, unlike top-level
      content types, so this is a deliberate, documented exception to the
      seed pipeline's usual "upsert, never delete" rule.
- [ ] Add a `pickStableImage(images, seed)` helper to
      `src/lib/diagnosis/engine.ts` (alongside the existing
      `pickSymptomCallbacks`): a pure deterministic hash of a seed string
      (the `Diagnosis.id`) into an index into the ordered image list.
- [ ] Update `src/app/results/[id]/page.tsx` and
      `src/app/share/[shareSlug]/page.tsx` to `include`/`select`
      `diagnosisDef.images` (ordered by `sortOrder`) instead of
      `diagnosisDef.imagePath`, and call `pickStableImage(...)` with the
      diagnosis's own id as the seed before passing the result into
      `DiagnosisCard` (unchanged — it still just takes one filename).
- [ ] Update `docs/content/content-storage-architecture.md`'s schema mirror
      and R-CONTENT-5 description to describe the one-to-many table and the
      deterministic-per-result pick, replacing the single-FK description.

**Testable deliverables:**
- [ ] After migration + reseed, each of the 10 `DiagnosisDef` rows has
      exactly one `DiagnosisDefImage` row (`sortOrder 0`) and
      `DiagnosisDef.imagePath` no longer exists in the schema.
- [ ] Taking the quiz shows a result image; reloading `/results/[id]` and
      then opening that same result's `/share/[shareSlug]` both show the
      *identical* image; a second, different quiz result shows an
      appropriately different image (still deterministic on its own
      reloads).
- [ ] Temporarily seeding a two-element `image_paths` array for one
      diagnosis and re-running `npm run db:seed-content` produces two
      `DiagnosisDefImage` rows (`sortOrder` 0 and 1) for it; reverting the
      JSON and reseeding again collapses it back to one.
- [ ] `npm run build` and `npm run lint` both pass.

## Phase 16 — Content-model id integrity fix — **proposed, pending approval**
Not yet approved — do not start without an explicit go-ahead. Full plan:
`board/content-id-integrity-fix.md` (gitignored, local planning board per
`board/README.md` — this section is a self-contained summary since that
file doesn't travel with the repo).

**Bug found post-Phase-14-deploy:** 18 of the 20 live quiz questions render
with zero selectable answers — a user starting the quiz gets stuck on
question 1. Root cause: `AnswerOption.id` is a *global* Prisma primary key,
but `prisma/seed/content/questions.json` authors every question's answers
with the same 5 short, question-local-looking ids (`a1`–`a5`) reused across
all 20 questions. `prisma/seed/index.ts`'s upsert-by-id logic silently
overwrites the same 5 physical rows as the seed loop walks each question,
so only the *last* question to touch each id ends up owning it — the other
18 questions end up with zero related `AnswerOption` rows. Worse, the
surviving 5 rows' `AnswerOptionTagEffect` data is also corrupted: because
that join table is only ever upserted, never pruned, each surviving id has
accumulated a jumbled union of tag effects from every question that touched
it (confirmed live: id `a1` alone carries 17 tag-effect rows spanning
nearly the entire tag vocabulary). The same investigation also found two
independent, adjacent issues: `prisma/seed/index.ts`'s `validate()` never
checks id uniqueness for any content class (so this shipped through
validation cleanly), and **no foreign-key column anywhere in the schema has
a database index** (Postgres doesn't auto-index the referencing side of an
FK) — invisible today at this row count, a real query-performance risk once
`Cat`/`QuizAttempt`/`Diagnosis` accumulate real usage.

**Proposed solution (see the board file for full reasoning):** derive
`AnswerOption`'s DB id from `` `${questionId}::${localId}` `` inside the
seed script (structural fix — global uniqueness by construction, not author
discipline), change the `AnswerOptionTagEffect` sync from blind upsert to
delete-then-recreate per answer (closing the staleness risk for good, not
just this one incident — mirrors the same pattern Phase 15's
`DiagnosisDefImage` plan independently proposes), add a global
id-uniqueness check to `validate()` for every content class as
defense-in-depth, repair the live data (delete the 5 corrupted
`AnswerOption` rows and reseed — safe, since `Diagnosis` has no FK into
`AnswerOption`, unlike its `Restrict`-protected FKs into
`DiagnosisDef`/`Treatment`/`Ritual`), and add the missing `@@index`
declarations via one new migration.
- [ ] Confirm the proposed solution with the user before starting — the
      board file's implementation instructions cover the exact sequence.
- [ ] `prisma/seed/index.ts`: derive `AnswerOption.id` as
      `${questionId}::${localId}`.
- [ ] `prisma/seed/index.ts`: sync `AnswerOptionTagEffect` by
      delete-then-recreate, not blind upsert.
- [ ] `prisma/seed/index.ts`: add per-content-class id-uniqueness checks to
      `validate()`.
- [ ] Repair live data: delete the 5 corrupted `AnswerOption` rows, reseed.
- [ ] Add `@@index` for every unindexed FK column (see board file for the
      full list); hand-write and apply the migration.
- [ ] Update `docs/content/content-storage-architecture.md` and
      `CLAUDE.md` with the id-uniqueness-by-construction and
      delete-then-recreate rules as standing decisions.
- [ ] Full 20-question quiz walk confirms every question has selectable
      answers; multi-path `getDiagnosis` smoke test (distinct answer
      combinations, not the single-path shortcut that missed this the
      first time) confirms correct tag totals and results.

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
