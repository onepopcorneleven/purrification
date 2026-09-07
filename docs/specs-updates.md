# Purrification — Spec Inconsistencies & Blind Spots

A cross-check of `docs/product-brief.md`, `docs/requirements.md`,
`docs/architecture.md`, `docs/vps-runbook.md`, and `docs/workplan.md` against
each other, looking for contradictions, gaps, and anything likely to trip up
implementation. Grouped by impact; each item names the docs involved so it's
traceable back to source.

## High impact

1. **~~Custom server assumed but never planned.~~ — Resolved.**
   `vps-runbook.md` step 11's systemd unit ran `ExecStart=node server.js`,
   but no doc ever specified a custom Node server — a standard Next.js
   App Router deploy has no `server.js` by default. Fixed by adopting
   Next.js's `output: "standalone"` build mode, which actually produces a
   `server.js`, and updating the systemd unit/deploy steps to match.

2. **First deploy had no bootstrap step.** `vps-runbook.md` step 12's deploy
   script did `git pull origin main`, which assumes
   `/home/deploy/purrification` is already a cloned repo with working git
   remote access — but nothing set up the initial `git clone`, a deploy
   key/token for pulling, or how `.env.production` gets onto the server
   before the first `systemctl start`. Fixed alongside item 1 (a first-deploy
   clone + deploy-key + `.env.production` transfer sequence was added).

3. **~~"Shareable" result page contradicts "no social sharing" scope.~~ —
   Resolved.** `requirements.md` (R-DIAG-3) required the diagnosis to be
   presented as a "shareable card/result page," but social sharing
   integrations were explicitly out of scope, and every route in
   `architecture.md` sat behind auth — there was no public/unauthenticated
   view of a result. Fixed by adding R-DIAG-4: "shareable" now means a
   public, unauthenticated link keyed on a separate `shareSlug` (not the
   row id), rendering only diagnosis/ritual/cat-name with no account data —
   explicitly distinct from the still-out-of-scope platform share
   integrations (OAuth flows, one-click post buttons, share-count
   tracking). `architecture.md` gained a Sharing section, a public-routes
   layer, and a `shareSlug` field on `Diagnosis`; `workplan.md` Phase 5
   gained the corresponding build task.

4. **~~Diagnosis is optional in the schema but required by the
   requirement.~~ — Resolved.** `architecture.md`'s Prisma sketch makes
   `QuizAttempt.diagnosis` optional (`Diagnosis?`), but R-DIAG-1 says "each
   completed quiz attempt **must** produce a diagnosis," and no doc said
   whether an orphaned `QuizAttempt` with no `Diagnosis` was expected or a
   bug. Fixed by adding R-DIAG-5: `QuizAttempt` + `Diagnosis` creation must
   be atomic (one DB transaction in `POST /cats/:id/quiz`), and
   `getDiagnosis` must be a *total* function (a hash-bucket into the
   content pool, not a switch/case with gaps) so the transaction can't fail
   on valid input. `architecture.md` documents the transaction, explains
   the `Diagnosis?` optionality as a Prisma FK-placement artifact rather
   than a valid state, and annotates the schema; `workplan.md` Phase 5
   reflects both changes.

5. **~~Auth endpoints go live before rate-limiting is added.~~ —
   Resolved.** `architecture.md` called out rate-limiting `/login`/`/signup`
   as a security consideration, but `workplan.md` scheduled it in Phase 10
   ("hardening pass / polish") — *after* Phase 9's "full first deploy...
   verify the live site over HTTPS," leaving signup/login exposed with no
   brute-force protection for at least one phase. Fixed by adding
   R-INFRA-4 and deciding the "Nginx or app layer" question definitively in
   favor of Nginx: `vps-runbook.md` step 9 now configures `limit_req` on
   `/api/login`/`/api/signup` as part of VPS provisioning (Phase 8), which
   happens before the app is ever deployed (Phase 9) — no app code or
   phase reordering needed. Phase 10 now only tunes the starting
   `rate=5r/m` threshold rather than adding limiting from scratch.

## Medium impact

6. **Cat deletion is undefined.** `architecture.md`'s API table lists "CRUD
   /cats," implying delete, but `requirements.md` R-CAT-4 only requires
   "view/edit" — no delete requirement, and no cascade behavior is defined
   for a cat's `QuizAttempt`/`Diagnosis` history if it's ever deleted.

7. **No password reset / account recovery** appears anywhere — not
   required, not explicitly out of scope. Given auth is otherwise treated
   fairly seriously (hashing, sessions, rate-limiting), this is a
   conspicuous silent gap.

8. **Cat "traits" are collected but never used.** The data model carries
   `Cat.traits` (optional JSON) for "personalization/flavor," but
   `architecture.md`'s diagnosis engine signature is
   `getDiagnosis(answers: QuizAnswer[])` — traits never enter the diagnosis
   logic anywhere. Either the personalization claim in the brief is
   aspirational-only, or the engine signature/content pool needs to account
   for traits later.

## Minor / polish

9. `vps-runbook.md` prerequisites mention picking a domain but never
   sequences pointing its DNS A-record at the server IP before step 10's
   certbot run — certbot will fail if DNS hasn't propagated yet.

10. Node.js version is never pinned to a specific LTS number anywhere (the
    runbook just says "pin an LTS version") — dev/prod version drift risk.

11. `architecture.md`'s Pages/UI requirement-mapping row lists R-CAT-4
    (view/edit) but omits R-CAT-1/2/3 (add-cat form), even though that page
    is clearly part of the UI layer — a minor traceability-table gap.
