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

3. **"Shareable" result page contradicts "no social sharing" scope.**
   `product-brief.md` / `requirements.md` (R-DIAG-3) require the diagnosis
   to be presented as a "shareable card/result page," but social sharing
   integrations are explicitly out of scope, and every route in
   `architecture.md` sits behind auth — there's no public/unauthenticated
   view of a result. No doc resolves what "shareable" means in practice (a
   public link? an image export? just visually shareable while logged in?).
   Not yet fixed.

4. **Diagnosis is optional in the schema but required by the requirement.**
   `architecture.md`'s Prisma sketch makes `QuizAttempt.diagnosis` optional
   (`Diagnosis?`), but R-DIAG-1 says "each completed quiz attempt **must**
   produce a diagnosis." No doc says whether an orphaned `QuizAttempt` with
   no `Diagnosis` is an expected state or a bug to guard against. Not yet
   fixed.

5. **Auth endpoints go live before rate-limiting is added.**
   `architecture.md` calls out rate-limiting `/login`/`/signup` as a
   security consideration, but `workplan.md` schedules it in Phase 10
   ("hardening pass / polish") — *after* Phase 9's "full first deploy...
   verify the live site over HTTPS." As sequenced, signup/login go live with
   no brute-force protection for at least one phase. Not yet fixed.

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
