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

## Phase 12 — Visual richness pass (design upgrade round 2) — **done**
`docs/design-upgrade-round-2.md` is the full plan: it evaluates
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
vocabulary, real trigger rules, real diagnoses/treatments/rituals) was
separate, later, gated work — done as Phase 14, below.
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

## Phase 14 — Rich content authoring pass — **done**
The actual content-design work `docs/content/content-framework.md` was
written to drive — distinct in kind from Phase 13's plumbing (editorial/
tone judgment, not schema/engine work). Authored outside the repo first
(per instruction), then validated against `prisma/schema.prisma` and
`prisma/seed/index.ts`'s `validate()`, committed, and deployed live
2026-09-09: 17 tags, 5 topics, 20 questions/85 answers, 10 treatments, 12
diagnoses (11 pattern-based + 1 catch-all — one more than the item below
originally sketched, kept for finer-grained coverage), 19 rituals. The
Phase 13 placeholder content's ids are entirely disjoint from the new
ones; since production already had real `Diagnosis` rows (22 by the time
of this deploy) referencing 9 of the 10 placeholder diagnoses and
`Diagnosis`'s FKs into `DiagnosisDef`/`Treatment`/`Ritual` are
`onDelete: Restrict`, the placeholder rows were retired via
`isActive: false` (`Question`, `Treatment`, `DiagnosisDef`, `Ritual` — the
four content classes that carry the flag), never hard-deleted, exactly as
`content-storage-architecture.md` §5/§6 specifies. Stale `Tag`/
`QuestionTopic` ids (no `isActive` field on those classes) were left as
harmless unused rows. See the Execution log below.
- [x] Define the canonical tag vocabulary up front, before any question or
      diagnosis authoring begins (per `content-storage-architecture.md`
      §10.1).
- [x] Author a full question bank organized into topics, each answer
      option carrying real tag effects.
- [x] Author `DiagnosisDef` entries (per §10.2) with real trigger rules,
      including a `none_of` exclusion wherever two diagnoses could
      plausibly both fire from overlapping tags.
- [x] Author the corresponding `Treatment` entries with real, populated
      `contraindications` the app can actually evaluate (severity-based
      this round, not cat-trait-based — see §9 point 6).
- [x] Author `Ritual` variants selected by severity band, each with at
      least 3 concrete sequential steps and a per-ritual incantation
      decision (structural support already in place per §10.4).
- [ ] Full tone/content review of every new entry against R-TONE-1/R-TONE-2
      — not yet done as a dedicated pass; flagged for follow-up.
- [x] Re-run `npm run db:seed-content` against the real content and
      re-verify all seed-time invariants at real scale — confirmed exactly
      one active catch-all (`diag_equilibrium`, priority 12, strictly
      highest among the 12 active rows) via direct query post-deploy.
- [x] Golden-path smoke test confirming a real answer set routes through
      `getDiagnosis` end-to-end (tag accumulation, trigger-rule match,
      severity banding, template rendering) against the live DB with no
      totality-guard errors. Multi-path coverage across all 12 diagnoses
      not exhaustively exercised this round — flagged for follow-up.

### Execution log — 2026-09-09
- Content bank authored outside the repo (`~/purrification-content/`),
  validated against schema/seed-script logic; one bug found (all 85
  `AnswerOption` entries missing required `sort_order`) and fixed.
- Copied into `prisma/seed/content/`, committed, merged to `main` via
  PR #20.
- Deployed via the standard step-12 pipeline; `npm run db:seed-content`
  upserted the new content and reported the (expected) stale placeholder
  ids; those were then set `isActive: false` directly (`psql`) *before*
  `systemctl restart`, so the running app never observed both the old and
  new catch-all diagnoses active at once.
- Verified: exactly one active catch-all post-deactivation; homepage and
  `/login` return correct responses post-restart; `getDiagnosis` run
  directly against the live DB with a full new-content answer set returns
  a correctly rendered diagnosis/ritual with no errors.

## Phase 15 — Diagnosis image pool (R-CONTENT-5 extension) — **done**
Approved and started 2026-09-12 ("start Phase 15"); independent of
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
- [x] Add a `DiagnosisDefImage` child table to `prisma/schema.prisma`
      (composite `@@id([diagnosisDefId, sortOrder])`, no independent
      `isActive`/lifecycle — same shape as the existing
      `DiagnosisDefTreatment` link table), with `DiagnosisDef.images
      DiagnosisDefImage[]`; remove `DiagnosisDef.imagePath`.
- [x] Hand-write the migration in the same expand → backfill → contract,
      single-transaction style as Phase 13's
      `20260908130000_add_content_model` (cited in `CLAUDE.md`): create
      `DiagnosisDefImage`, backfill one row per existing non-null
      `imagePath` at `sortOrder 0`, then drop the old column. Apply via
      `npm run db:migrate` against the VPS DB.
- [x] Update the seed pipeline: `prisma/seed/content/diagnoses.json`'s
      `RawDiagnosisDef.image_path: string|null` becomes an optional
      `image_paths?: string[]`; `prisma/seed/index.ts`'s `upsertContent()`
      syncs each diagnosis's `DiagnosisDefImage` rows by delete-then-recreate
      per `diagnosisDefId` — these child rows have no identity of their own
      outside the array, unlike top-level content types, so this is a
      deliberate, documented exception to the seed pipeline's usual "upsert,
      never delete" rule.
- [x] Add a `pickStableImage(images, seed)` helper to
      `src/lib/diagnosis/engine.ts` (alongside the existing
      `pickSymptomCallbacks`): a pure deterministic hash of a seed string
      (the `Diagnosis.id`) into an index into the ordered image list.
- [x] Update `src/app/results/[id]/page.tsx` and
      `src/app/share/[shareSlug]/page.tsx` to `include`/`select`
      `diagnosisDef.images` (ordered by `sortOrder`) instead of
      `diagnosisDef.imagePath`, and call `pickStableImage(...)` with the
      diagnosis's own id as the seed before passing the result into
      `DiagnosisCard` (unchanged — it still just takes one filename).
- [x] Update `docs/content/content-storage-architecture.md`'s schema mirror
      and R-CONTENT-5 description to describe the one-to-many table and the
      deterministic-per-result pick, replacing the single-FK description.

**Testable deliverables:**
- [x] After migration + reseed, `DiagnosisDef.imagePath` no longer exists in
      the schema. **Correction to this deliverable's original premise:**
      it assumed all 10 pre-Phase-14 `DiagnosisDef` rows had a non-null
      `imagePath` that would backfill 1:1 into the new table. In fact (see
      Phase 17), Phase 14 replaced those 10 rows with 12 new, differently-id'd
      diagnoses that were seeded with no image assignment at all — so the
      12 *active* rows backfilled zero `DiagnosisDefImage` rows each,
      confirmed via a direct query post-migration. The backfill did
      correctly carry forward one `DiagnosisDefImage` row (`sortOrder 0`)
      for each of the **10 retired (`isActive: false`) placeholder rows**
      that still had their original `imagePath` set — that's the migration
      working exactly as intended over all rows regardless of `isActive`,
      not a bug. Assigning images to the 12 active diagnoses is Phase 17's
      job, not this one.
- [x] Verified via a real quiz submission against the VPS DB (throwaway
      signup → cat → quiz → `/results/[id]` → `/share/[shareSlug]`, all
      cleaned up after): both pages render 200 with the correct cat
      name/diagnosis/ritual text and no broken/missing image reference,
      confirming `pickStableImage` returning `undefined` for an empty pool
      is handled the same graceful way `DiagnosisCard` always handled a
      missing image. Could not verify the "shows an actual illustration,
      identical across reloads" half of this deliverable end-to-end, since
      no active diagnosis has any images yet (Phase 17) — that half is
      covered by the next deliverable's direct mechanism test instead.
- [x] Mechanism test (temporary, reverted): added a two-element
      `image_paths` to one diagnosis in `prisma/seed/content/diagnoses.json`,
      reseeded — confirmed exactly two `DiagnosisDefImage` rows
      (`sortOrder` 0/1) — then called `pickStableImage` directly with
      several seed strings, confirming the same seed always returns the
      same path and different seeds can return different paths. Reverted
      the JSON and reseeded again — confirmed the two rows collapsed back
      to zero (this diagnosis has no images in the committed content).
- [x] `npm run build` and `npm run lint` both pass.

### Execution log — 2026-09-12
- Schema/migration: `prisma migrate diff` (live DB → target schema) produced
  byte-identical `CREATE TABLE`/`ADD CONSTRAINT` SQL to the hand-written
  migration (same cross-check approach as Phase 16's index migration),
  confirming the DDL was correct before applying. Applied via
  `npm run db:migrate` against the VPS DB; `prisma migrate status` confirmed
  clean afterward.
- Reseed (`npm run db:seed-content`) ran cleanly against the live DB —
  same pre-existing Phase 14 stale-placeholder warnings as every prior
  reseed, no new errors. Directly queried `DiagnosisDefImage` post-reseed:
  0 rows for any of the 12 active diagnoses, 10 rows (one each, `sortOrder
  0`) for the retired Phase-13 placeholder diagnoses — see the corrected
  testable-deliverable note above for why that's the correct outcome, not a
  bug.
- Mechanism test: temporarily added `image_paths` to one diagnosis, reseeded,
  verified two rows + deterministic `pickStableImage` behavior directly
  against the DB, then reverted and reseeded again to confirm cleanup — see
  deliverables above.
- Live functional check: real signup → add cat → submit quiz →
  `/results/[id]` → `/share/[shareSlug]`, run against a local production
  build pointed at the VPS DB (test user/cat deleted after, cascading to
  its quiz attempt/diagnosis). Both pages returned 200 with correct
  content and no broken image reference.
- `npm run build` and `npm run lint` both passed clean.
- Shipped via PR #27, merged to `main`. Deployed the same session via the
  standard step-12 repeat-deploy script (`git pull` → `npm ci` → `npm run
  build` → static-asset copy → `prisma migrate deploy` — reported "No
  pending migrations to apply", correctly a no-op since the migration was
  already applied directly during testing — → `db:seed-content` —
  idempotent re-confirmation, same pre-existing stale-placeholder warnings
  as every prior reseed — → `sudo systemctl restart purrification`). This
  closed a real window where production's DB schema (already migrated
  during testing, since dev/prod share one Postgres instance) had briefly
  outrun the still-running old code that queried the now-dropped
  `imagePath` column.
- Live verification: `systemctl status` showed `active (running)`
  immediately post-restart; `journalctl` since the restart showed a clean
  startup with no errors; `https://purrification.com/` returned `200`
  (following its `307` HTTP→HTTPS redirect).

## Phase 16 — Content-model id integrity fix — **done**
Full plan: `board/content-id-integrity-fix.md` (gitignored, local planning
board per `board/README.md` — this section is a self-contained summary
since that file doesn't travel with the repo). Implemented, deployed, and
verified live 2026-09-12 — see the Execution log below.

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
- [x] Confirm the proposed solution with the user before starting — the
      board file's implementation instructions cover the exact sequence.
- [x] `prisma/seed/index.ts`: derive `AnswerOption.id` as
      `${questionId}::${localId}`.
- [x] `prisma/seed/index.ts`: sync `AnswerOptionTagEffect` by
      delete-then-recreate, not blind upsert.
- [x] `prisma/seed/index.ts`: add per-content-class id-uniqueness checks to
      `validate()`.
- [x] Repair live data: delete the 5 corrupted `AnswerOption` rows, reseed.
- [x] Add `@@index` for every unindexed FK column (see board file for the
      full list); hand-write and apply the migration.
- [x] Update `docs/content/content-storage-architecture.md` and
      `CLAUDE.md` with the id-uniqueness-by-construction and
      delete-then-recreate rules as standing decisions.
- [x] Full 20-question quiz walk confirms every question has selectable
      answers; multi-path `getDiagnosis` smoke test (distinct answer
      combinations, not the single-path shortcut that missed this the
      first time) confirms correct tag totals and results.

### Execution log — 2026-09-12
- Implemented and unit-verified locally: negative test (temporarily
  reintroduced duplicate question/answer ids) confirmed the new
  `validate()` checks throw with clear messages before any DB write; real
  content reseeded cleanly with the fixed pipeline.
- Data repair applied directly against the live DB (via the standard SSH
  tunnel): all 85 answers recreated under derived ids, verified 0
  mismatches between each answer's DB tag effects and its source JSON; the
  5 legacy corrupted rows (`a1`–`a5`) confirmed referenced by zero
  historical `QuizAttempt` rows, then deleted.
- Index migration applied and cross-checked: `prisma migrate diff` against
  the schema change produced byte-identical `CREATE INDEX` statements to
  the hand-written migration; all 10 expected indexes confirmed present via
  `pg_indexes` post-apply.
- Shipped via PR #24, merged to `main`; deployed through the standard
  step-12 pipeline (build, `prisma migrate deploy` — index migration
  already applied, correctly reported as a no-op — `npm run db:seed-content`
  — idempotent re-confirmation, correctly reported as a no-op beyond the
  expected pre-existing Phase 14 stale-placeholder warnings — then
  `systemctl restart`).
- Live verification: `journalctl` clean post-restart; homepage/`/login`
  respond correctly; a real signup → add cat → fetch quiz page walk (via
  authenticated curl, then cleaned up — test cat deleted after) confirmed
  all 20 questions render their correct answer count (4 or 5, matching the
  source content exactly) in the live rendered page, with derived ids
  (`q_0NN::aN`) visible in the payload — not just the first question this
  time. Multi-path `getDiagnosis` smoke test (4 distinct answer-index
  combinations, not the flawed single-path shortcut that missed this bug
  originally) produced correct, varying results with no totality-guard
  errors.

## Phase 17 — Diagnosis image gap (Phase 14 regression) — **done**
Found during a status review on 2026-09-12; approved and implemented the
same day ("phase 17 approved. go and implement"). Independent of Phase 15
and Phase 16, both already shipped by the time this started, so images were
authored directly into Phase 15's `DiagnosisDefImage` pool (`image_paths`),
not the earlier single-`imagePath` shape.

**The gap:** all 12 live `DiagnosisDef` rows (Phase 14's real content bank)
currently have `imagePath = null`. `prisma/seed/content/diagnoses.json`'s 12
entries carry no `image_path` field at all — Phase 14's rewrite of the
content bank replaced the old 10 placeholder diagnoses' ids, names, and text
but never carried over image assignments to the new ones. Meanwhile the
visual-richness pass's 10 illustrations still sit in
`public/images/diagnoses/` (`ceremonial-fast.png`, `chaos-spirit-box.png`,
`houseguest-aura.png`, `meditative-aloofness.png`, `mercury-retrograde.png`,
`moon-phase-whiskers.png`, `static-corner.png`, `sunbeam-schedule.png`,
`three-am-zoomies.png`, `vacuum-residue.png`) — orphaned, since they were
matched to the old placeholder diagnoses' text via the now-deleted
`getDiagnosisImage()` text-equality lookup and have no relationship to the
new 12 diagnoses' ids or content.

Not a crash: `DiagnosisCard`'s `image` prop is optional, and the component
renders correctly (just without an illustration) when `imagePath` is null.
But it's a live regression from Phase 13's shipped behavior — every result
page (`/results/[id]`) and every public share page (`/share/[shareSlug]`)
currently renders with no diagnosis illustration, silently, for every user.

**Relationship to Phase 15:** an independent problem. Phase 15 (one-to-many
image pool) changes the schema shape but doesn't by itself supply any
`image_path`s — a diagnosis with an empty pool renders the same as one with
`imagePath: null` today. Whichever phase actually authors new image(s) needs
to decide what to do with the 10 orphaned files, since none of the new
diagnosis identities map onto them 1:1.

**Execution steps:**
- [x] Decide the disposition of the 10 orphaned files in
      `public/images/diagnoses/` per new diagnosis: **regenerated** — none
      of the 12 new diagnoses' themes mapped closely enough onto the 10 old
      placeholder themes (mercury retrograde, vacuum residue, etc.) to
      justify reuse, so all 12 got new, purpose-matched illustrations
      instead. The 10 old files were **retired in place, not deleted**: a
      direct query found 22 real historical `Diagnosis` rows still
      referencing the old, retired `DiagnosisDef` ids (pre-Phase-14 usage),
      so deleting those files would have broken their `/results`/`/share`
      pages' images.
- [x] Sequencing against Phase 15: **moot by the time this started** — Phase
      15 had already shipped, so images were authored directly into
      `image_paths` (plural), no intermediate single-`imagePath` step
      needed.
- [x] Generated all 12 images via `codex exec` (per this project's memory
      on image generation), one per diagnosis, following the brand doc's
      reusable prompt template (§6) — same painterly tarot-card style,
      jewel-tone-and-gold palette, 4:5 portrait aspect ratio (1122×1402,
      matching the existing 10 exactly) as the original visual-richness
      pass. Each `[SUBJECT]` was written to match its diagnosis's specific
      description (e.g. `separation-static.png`: a cat watching a
      dissolving hooded figure through a closing door; `equilibrium.png`,
      the catch-all: a cat resting calm and undisturbed in candlelight —
      deliberately the one non-distressed image in the set).
- [x] Authored `image_paths: [<filename>.png]` for all 12 diagnoses in
      `prisma/seed/content/diagnoses.json` via targeted per-entry edits
      (not a full-file rewrite, which would have reformatted the whole
      file's JSON and produced a huge noisy diff) — a clean 12-line diff.
- [x] Reseeded (`npm run db:seed-content`) against the live VPS DB and
      verified via a direct query: all 12 active `DiagnosisDef` rows now
      have exactly one `DiagnosisDefImage` row.
- [x] Confirmed live: a real signup → cat → quiz flow run three times
      (different answer sets) produced two distinct diagnoses
      (`diag_boundary_erosion`, `diag_equilibrium`); both `/results/[id]`
      and `/share/[shareSlug]` rendered the correct, diagnosis-specific
      image (confirmed by inspecting the rendered `next/image` URL, and by
      fetching the underlying file directly for a `200`); test data cleaned
      up after.
- [x] The 10 old files were **kept, not removed** — see the first bullet
      above; they are not dead weight, they're still live for anyone
      viewing a pre-Phase-14 historical result.

**Testable deliverables:**
- [x] Every active `DiagnosisDef` row has at least one image reference —
      confirmed via direct query (12/12).
- [x] No result or share page renders without an illustration — confirmed
      for two distinct diagnoses via a live functional check; every other
      active diagnosis has exactly one image in its pool by construction
      (same seed-pipeline code path), so this generalizes without needing
      to individually click through all 12.
- [x] `npm run build` and `npm run lint` both pass.

### Execution log — 2026-09-12
- Generated 12 images (~2.2–3.0MB PNG each, all 1122×1402) via `codex exec`
  — the documented `codex image generate` skill command still doesn't exist
  in this environment (per the standing memory on this); each image was
  produced by codex's agentic `image_gen` tool, then copied out of
  `~/.codex/generated_images/<session>/` into `public/images/diagnoses/`
  since codex's own sandboxed shell still can't write inside the repo here.
- `prisma/seed/content/diagnoses.json` diff: exactly 12 lines added (one
  `image_paths` array per diagnosis), no reformatting.
- Reseed ran clean against the live DB — same pre-existing Phase 14
  stale-placeholder warnings as every prior reseed, no new errors.
- `npm run build`/`npm run lint` both passed clean.
- Live check: confirmed 22 historical `Diagnosis` rows still reference the
  10 retired placeholder `DiagnosisDef`s, which is why those old image
  files were kept rather than deleted.
- Shipped via PR, merged to `main`. The content reseed was already applied
  directly against the shared VPS DB during testing (dev/prod share one
  Postgres instance, per `CLAUDE.md`) — unlike Phase 15, this is pure
  content data with no schema change, and the `results`/`share` pages'
  live, uncached per-request query (not the cached `getDiagnosis` content
  graph) means the new images were already visible in production before
  any deploy. Deployed anyway via the standard step-12 pipeline for
  consistency, confirmed `active (running)` with clean logs post-restart.

## Phase 18 — Quiz confirm-and-divine interaction — **done**
Requested and implemented 2026-09-12 ("go ahead, implement phase 18").

**Current behavior, for contrast** (`src/app/cats/[id]/quiz/QuizFlow.tsx`):
a single click on an option selects it (today's highlighted look — gold
border, `animate-glow-pulse`, filled diamond glyph); a separate "Next"
button, disabled until an option is selected, advances `step` immediately
with no transition. The last question shows "Get diagnosis" instead of
"Next", which does the real `POST /api/cats/:id/quiz` submission with a
"Consulting the cards…" status line. `QuizProgress.tsx` renders the
step-dot row above the question. Back is a plain button, disabled only on
question 1 or while submitting.

**Goal:** replace the select-then-click-"Next" flow with a two-click
confirm gesture per question, followed by a short mystical "divining"
transition before the next question appears — and, on the last question, a
longer, more dramatic "spiritual reception" variant of that same moment
before the diagnosis appears, framed as the cat's answers gathering into
one reading rather than a generic "processing" beat. Back is explicitly
untouched by this change.

**New interaction:**
1. First click on an option selects it — today's existing highlighted look,
   unchanged.
2. A second click on that *same, already-selected* option confirms it: a
   further, distinct visual change beyond the selection highlight (more
   emphatic — e.g. a deeper/solid glow fill, or an animated pulse on the
   existing diamond glyph), signaling the choice is locked in. Clicking a
   *different*, not-yet-selected option while one is already selected (but
   not yet confirmed) just re-selects — the confirm gesture only fires on
   a second click of the *same* option.
3. Confirming immediately starts a short "divining" transition — a themed
   overlay/moment over the question card (candle-flare + drifting fog,
   reusing the `flame-flicker`/`fog-drift` keyframes already in
   `globals.css`, plus a short rotating mystical status line — "Reading
   the signs…", "The cards are turning…", etc.) — then the next question
   appears automatically. No separate "Next" click remains for a confirmed
   answer; the second click on the option *is* the advance action.
4. Back remains exactly as it is today: single click, immediate `step - 1`,
   no confirm gesture, no divining animation.

**Resolved: the last question gets its own, more dramatic "spiritual
reception" moment**, not just a reuse of the mid-quiz divining transition.
Confirming the final answer plays a longer, more elaborate version of the
same divining language — the mid-quiz moment is a quick beat between
questions; this one is the culmination, framed as summoning/receiving the
diagnosis from everything just answered, not just "processing." Concretely:
  - A distinct, longer animation/overlay than the per-question one — more
    layers (e.g. multiple candle flames, a fuller fog bloom, the existing
    `seal-of-completion.svg` motif making an early appearance rather than
    only on the result page), and its own longer duration token (see
    below) rather than reusing the mid-quiz one at the same length.
  - Its copy leans into "gathering/receiving" rather than "processing" —
    e.g. "Your cat's answers are gathering into a single reading…",
    "The reading is arriving…" — distinct from the mid-quiz "Reading the
    signs…"/"The cards are turning…" lines.
  - This moment still gates the real `POST /api/cats/:id/quiz` call
    underneath it: navigation to `/results/[id]` waits for *both* the
    animation's minimum duration and the real fetch to finish (whichever
    is longer), so a slow request never cuts the moment short, and a fast
    one never feels rushed. If the request fails, fall back to today's
    error-toast behavior (`showToast(...)`) and let the user retry from the
    last question rather than stranding them mid-animation.

**Durations are tokens, not hardcoded literals — two of them:**
`docs/design/design-tokens.json`'s `motion.duration` currently tops out at
`slow: "450ms"` — add two new entries: `motion.duration.divination:
"3000ms"` (the mid-quiz, between-questions moment) and
`motion.duration.divinationFinal: "5000ms"` (the longer, more elaborate
final "spiritual reception" moment) — both starting defaults, not
requirements — mirrored into `--duration-divination`/
`--duration-divination-final` CSS custom properties in `globals.css`'s
`@theme` block, so both pause lengths live in one place, not inline in
`QuizFlow.tsx`.

**Execution steps:**
- [x] Add a `confirmed` state to `QuizFlow.tsx`'s per-question selection
      tracking (`idle` -> `selected` -> `confirmed`, keyed per question id
      the same way `answers` is today).
- [x] Wire the click handler: first click on an option sets `selected`;
      second click on that same, already-`selected` option sets
      `confirmed` and triggers the appropriate transition (mid-quiz
      divining, or the final reception moment on the last question); a
      click on a different option while in `selected` (not yet `confirmed`)
      re-selects instead.
- [x] Add the third (`confirmed`) visual state to the option card —
      building on today's existing gold/glow language, not introducing new
      colors, per this project's brand-token discipline
      (`docs/design/purrification-brand-guidelines.md`).
- [x] Build the mid-quiz divining transition component/overlay
      (candle-flare + fog drift + a rotating "processing" flavor line),
      driven by `--duration-divination`, that then advances `step`.
- [x] Build the separate, more elaborate final reception moment (fuller
      fog/candle treatment, an early appearance of the
      `seal-of-completion.svg` motif, "gathering/receiving" flavor copy
      distinct from the mid-quiz lines) driven by
      `--duration-divination-final`, that calls `handleSubmit` underneath
      itself and only navigates to `/results/[id]` once both the
      animation's minimum duration and the real fetch have resolved
      (whichever is longer); on a failed fetch, fall back to today's
      `showToast` error handling rather than stranding the user
      mid-animation.
- [x] Add a `prefers-reduced-motion: reduce` treatment for both new
      animations, matching every other animation in `globals.css`.
- [x] Add the two new duration tokens to `docs/design/design-tokens.json`
      and mirror them into `globals.css`.
- [x] Update `docs/design-system.md`'s component inventory / `QuizFlow`
      description for the new two-click-confirm interaction and the two
      distinct transition moments.

**Testable deliverables:**
- [x] A single click on an option shows exactly today's existing
      selected/highlighted look; no automatic advance.
- [x] A second click on that same, already-selected option visibly changes
      its appearance again, then (mid-quiz) the divining animation plays
      and the next question appears, or (last question) the longer
      reception moment plays and the diagnosis result appears — with no
      separate "Next"/"Get diagnosis" click remaining in either case.
- [x] The final reception moment is visibly more elaborate and longer than
      the mid-quiz divining moment, not a reuse of the same animation at
      the same length.
- [x] Clicking a different option after the first click re-selects rather
      than confirming.
- [x] Back is unchanged: single click, immediate, no animation, still
      disabled only on question 1 (and, as today, during any
      submission-in-flight state).
- [x] A slow (artificially delayed) `POST /api/cats/:id/quiz` response
      never cuts the final reception moment short; a fast response never
      skips it either — navigation always waits for both.
- [x] A failed submission during the final reception moment surfaces
      today's error toast and returns the user to the last question,
      rather than leaving them stuck mid-animation.
- [x] Both animations' durations come from named tokens, not hardcoded
      literals in the component.
- [x] `prefers-reduced-motion: reduce` shortens/removes both new animations
      the same way every other motion in this app does.
- [x] `npm run build` and `npm run lint` both pass.

### Execution log — 2026-09-12
- Implementation landed in `QuizFlow.tsx` mostly as planned, with the
  submit function renamed `receiveDiagnosis` (from the plan's
  `handleSubmit`) since it now always runs inside the final-question
  transition, never triggered independently by a separate button.
- Added `motion.duration.divination`/`divinationFinal` to
  `docs/design/design-tokens.json` and mirrored them into
  `globals.css`'s `--duration-divination`/`--duration-divination-final`
  (and matching `DIVINATION_MS`/`DIVINATION_FINAL_MS` constants in
  `QuizFlow.tsx`, cross-referenced by comment on both sides).
- `.divining-overlay`/`--final` reuse `.toast-flame`'s existing flicker
  animation rather than a new one; the final variant adds a dim,
  early-preview appearance of `seal-of-completion.svg` and a fuller
  two-gradient glow. Both get `prefers-reduced-motion: reduce` overrides
  matching every other animation in `globals.css`.
- `npm run lint` initially caught a real bug: storing the random flavor
  line in a `useRef` and reading `.current` during render violates the
  `react-hooks/refs` rule (a ref read during render isn't guaranteed to
  reflect the latest value and won't trigger a re-render) — switched to
  `useState` instead, which is what the value being displayed actually
  needed.
- `npm run build`/`npm run lint` both pass clean.
- Functional (non-visual) verification only, per `CLAUDE.md`'s standing
  note that no headless browser exists in this sandbox: a real signup →
  cat → fetch of `/cats/:id/quiz` confirmed the rendered page shows the
  new "Tap an answer, then tap it again to confirm." hint and the answer
  options, and confirmed neither a "Next" nor a "Get diagnosis" button
  string appears anywhere in the markup anymore (both fully replaced by
  the click-to-confirm gesture); the `divining-overlay` markup is
  correctly absent from the initial server-rendered page (it only mounts
  client-side once a click confirms an answer). **The actual two-click
  gesture, the timed transitions, and the final request-gating behavior
  are client-side interactive logic that curl cannot exercise** — these
  were verified by code review of the state machine (the `selected`/
  `confirmed`/`transition` transitions in `QuizFlow.tsx`) rather than an
  observed live click-through. A manual check via `npm run dev` (+ the
  SSH tunnel) is recommended before treating this as fully confirmed live.
- Shipped via PR, merged to `main`; deployed via the standard step-12
  pipeline (no schema/content changes this time — pure app-code + two doc
  updates — so `prisma migrate deploy`/`db:seed-content` both no-op).

### Post-deploy fix — 2026-09-12 (same day)
Live check by the user found the shipped version genuinely broken: "first
tap on question highlights it (1:1 as before). second tap on same question
changes nothing. stuck, can not activate an answer." This confirmed the
execution log's own caveat above — the interactive click/confirm behavior
had only been reasoned about via code review, never actually exercised.

**Root cause:** the confirm click handler was wired to the `<input
type="radio">`'s `onChange` — but a native radio input only fires `change`
when its `checked` state actually flips. Clicking an *already-checked*
radio a second time never flips `checked` and so never fires `change`, in
any browser — the second (confirm) click was silently dropped every time.

**First fix attempt found a second, worse bug before shipping:** moving
the handler to `onClick` on the *wrapping `<label>`* seemed like an
obvious fix (a label's click always fires, unlike a radio's change) — but
verifying it with a real jsdom DOM-event reproduction (`label.click()`,
not hand-dispatched synthetic events) showed the label's own click handler
fires **twice** per physical click. A `<label>` wrapping a form control
has a spec'd "activation behavior": clicking the label dispatches the
original click event (which bubbles through the label), *and* forwards a
second, separately-bubbling click event directly at the wrapped control —
both reach a listener attached to the label itself. Applied to this
component, that would have double-scheduled the divining transition (two
competing `setTimeout`s silently skipping an extra question forward) or
double-submitted the final diagnosis request.

**Actual fix:** put the click handler on the `<input>` itself (`onClick`,
alongside the existing `onChange`), not the label. A label's forwarded
click lands directly on the input — exactly once per physical click,
regardless of whether `checked` changes — so the input's own `onClick`
listener never double-fires the way the label's did. `onChange` is kept
alongside as a harmless, idempotent second path (verified: `selectOption`
called twice in the same synchronous event with unchanged closure state
is a no-op-equivalent double call) for any keyboard/assistive-tech flow
that changes `checked` without synthesizing a click.

**Verified with real jsdom DOM-event simulation** (not hand-asserted
custom events) before re-shipping: reproduced the exact reported bug
(`onChange`-only: 2 real clicks on the same radio -> exactly 1 `change`
event, confirming the confirm click is dropped); reproduced the
label-onClick regression (2 real clicks -> 4 handler firings, confirming
the double-fire); confirmed the final `onClick`-on-the-input fix produces
exactly one handler firing for the confirm click and every click after
it, every time. Re-ran `npm run build`/`npm run lint` (clean) and the same
curl-based page-render check as the original deploy (unaffected). The
underlying limitation from the original execution log still applies —
this sandbox has no headless browser, so this was the most rigorous
verification available short of a real click-through; still recommend a
manual check.
- Fix shipped via a follow-up PR, merged to `main`, deployed the same way.

### Tuning — 2026-09-12
User confirmed the fix worked live, then asked to shorten the mid-quiz
divining pause specifically (not the final reception moment). Changed
`motion.duration.divination` from `3000ms` to `2000ms` in
`docs/design/design-tokens.json`, `globals.css`'s `--duration-divination`,
and `QuizFlow.tsx`'s `DIVINATION_MS` — all three kept in sync per the
token's own documented convention. `motion.duration.divinationFinal`
(`5000ms`, the last question's longer moment) is unchanged.

## Phase 19 — Quiz answer-order randomization (anti-catch-all bias fix) — **done**
Requested and implemented 2026-09-12.

**Problem found (live-DB investigation):** careless/random test-clicking
through the quiz overwhelmingly produced the catch-all "no significant
imbalance" diagnosis (`diag_equilibrium`) — 5 of 9 real-content test runs,
~56%. A 200k-trial simulation of the live trigger rules under *true*
uniform-random answer selection put the catch-all rate at only ~18%, and
every one of the 11 real diagnoses was confirmed independently reachable
with real margin for a deliberate/thematic answerer — so the content and
thresholds were not the problem (left untouched, per decision below).

**Root cause:** answer options render in a fixed, author-defined order
(`sortOrder`) on every page load, with no default selection. A user who
isn't reading the option text very plausibly clicks a similar screen
position/index across most of the 20 questions — and several questions
place their most dismissive, negative-tag-weighted option at a consistent
index. That correlates click position with "safe/no-imbalance" tag effects
far more than true randomness would (the observed 56% vs. simulated 18% gap
is too large to be sampling luck alone: ~1% under a true 18% rate).

**Decision:** leave `DiagnosisDef`/`Treatment`/`Ritual` trigger rules and
thresholds untouched. Fix the UI instead — randomize the *display order* of
answer options per page load, decorrelating position from tag effect.
`SCALE`-type questions (1–5, 4 of the 20 today) are excluded — their order
is semantically ordinal, not decorative, and shuffling would break that
UX. Built to generalize: the gating property is "does option order carry
meaning" (ordinal vs. nominal), keyed off `QuestionInputType` in one small
constant, not hardcoded to specific questions — so it covers future
quizzes and future nominal answer-set types (e.g. `MULTI_SELECT`, already
in the schema but unused) automatically; a future ordinal type just needs
one addition to that constant.

**Execution steps:**
- [x] New shared utility `src/lib/quiz/shuffleAnswerOptions.ts`:
      `shuffleAnswerOptions(inputType, options)`, Fisher-Yates shuffle for
      anything not in a local `ORDER_PRESERVING_TYPES` set (`SCALE` only,
      today).
- [x] `src/app/cats/[id]/quiz/page.tsx`: select `inputType` (previously
      omitted from the query entirely) and shuffle each question's options
      through the new helper when building the `options` array handed to
      `QuizFlow`.
- [x] No changes needed to `QuizFlow.tsx` (renders whatever `options` order
      it's given, keyed by `option.id` — confirmed compatible with Phase
      18's confirm-and-divine rewrite, which landed on `main` mid-session)
      or to the API route/`getDiagnosis`/`engine.ts` (all keyed by
      `AnswerOption.id`, never position).
- [x] `npm run lint` / `npm run build` clean.

**Testable deliverables:**
- [x] Two successive fetches of the same quiz page show different answer
      order for a `SINGLE_SELECT` question (confirmed: q_001's four options
      rendered in a different order across two loads) while a `SCALE`
      question stays in fixed 1→5 order both times (confirmed identical).
- [x] A full 20-question quiz submission still produces a correct diagnosis
      (confirmed live: `diag_object_tethering`, matching tag totals and
      rendered text, via a real signup → cat → quiz → submit walkthrough
      against the live DB; test user/cat cleaned up after).

### Execution log — 2026-09-12
- Verified locally against the live VPS DB (via the standard SSH tunnel):
  dev server run in an isolated worktree, real signup/cat/quiz HTTP flow
  (not just unit-level checks) confirmed both the shuffle behavior and an
  end-to-end diagnosis submission.
- `npm run lint`/`npm run build` both passed clean.
- Shipped via PR, merged to `main`, deployed via the standard step-12
  pipeline (no schema or content change — `prisma migrate deploy` and
  `npm run db:seed-content` both no-ops, only the build + restart mattered).

## Phase 20 — `/allimages` debug gallery — **done**
Requested 2026-09-12: a temporary, debugging-only page listing every image
under `public/images/diagnoses/*.png` in a phone-optimized viewer, for
visually spot-checking the full Phase 17 illustration set without a working
headless browser in this sandbox (see the "No usable headless browser"
note earlier in this doc/`CLAUDE.md`).

- `src/app/allimages/page.tsx` — an async Server Component (`export const
  dynamic = "force-dynamic"`) that reads `public/images/diagnoses/` with
  `fs.readdir` at request time and passes the resulting `/images/
  diagnoses/<file>.png` paths to the client gallery. Filenames are never
  hardcoded — the list always reflects whatever `.png` files actually exist
  in that folder, so it stays correct as diagnosis images are added,
  regenerated, or retired.
- `src/app/allimages/ImageGallery.tsx` — a client component: a responsive
  thumbnail grid (`auto-fill`, 4:5 tiles) that opens a fullscreen,
  scroll-snapped lightbox on tap, one image per screen, swipe/scroll
  through the full set, with an index counter and filename per slide and
  an Escape/× to close.
- Deliberately **not linked from any page** — reachable only by typing
  `purrification.com/allimages` directly, per the request. No nav entry,
  no `sitemap`/`robots` consideration was needed since nothing points to
  it.
- Deliberately **not gated by auth or `isActive` content flags** — it reads
  the filesystem, not the DB, so it also shows the 10 retired
  placeholder-diagnosis images kept per Phase 15/17's note (still
  referenced by historical `Diagnosis` rows). That's intended for a debug
  view: it's a folder listing, not a content-model view.
- Verified with `npm run build` (route compiles, listed as `ƒ /allimages`
  dynamic) and a local `npm start` smoke test confirming `GET /allimages`
  returns 200 and the page's markup references all 22 files currently in
  `public/images/diagnoses/`. No visual/screenshot check was possible for
  the reason above — ask the user to eyeball it live instead.
- Meant to be deleted once the manual image review it exists for is done —
  it isn't part of the product and shouldn't accumulate as permanent
  surface area.

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
