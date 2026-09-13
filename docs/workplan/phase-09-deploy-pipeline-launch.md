# Phase 9 — Deploy pipeline & launch (R-INFRA-3)

Extended notes for `docs/workplan.md`'s Phase 9 entry.

## Execution notes

- Stood up the systemd service on the VPS per the runbook. Done 2026-09-07
  — see `vps-runbook.md`'s Execution log. It came up on its own: the unit
  had been crash-looping (`Restart=on-failure`) waiting for `server.js` to
  exist, and its next automatic retry succeeded the moment the first build
  produced one, before the planned manual `enable --now` step was reached.
  **Manual follow-up resolved**: `sudo systemctl enable purrification`
  (boot persistence) needed to be run by hand with `deploy`'s interactive
  sudo password — the passwordless sudoers rule only covers `restart`, not
  `enable`. No Claude Code session ever had that password; confirmed during
  the Phase 11 hardening pass (2026-09-08) that `systemctl is-enabled
  purrification` now reports `enabled`, so an operator must have run it by
  hand between sessions.
- Wired the deploy script (or CI job) from `vps-runbook.md` step 12. Both
  paths were written and have been run for real: the first-deploy
  (`git clone`) path on 2026-09-07, and the repeat-deploy (`git pull`) path
  on 2026-09-08 (shipping the landing-page header image) — see
  `vps-runbook.md` step 13.
- Did a full first deploy: build, migrate, restart, verify the live site
  over HTTPS. Done 2026-09-07 (repo is public, so no GitHub deploy key was
  needed — a plain HTTPS clone worked). Hit and documented one real
  gotcha: `prisma7.config.ts`'s `dotenv/config` only loads `.env`, not
  `.env.production`, so `prisma migrate deploy` needs those vars exported
  explicitly first — see `vps-runbook.md` step 12. Migration state was
  already current from Phase 1 ("No pending migrations to apply").
- Ran the runbook's rate-limiting check against the now-live `/api/login`
  to confirm it's actually enforced, not just configured. Confirmed live:
  8 rapid requests returned six `401`s then `503`s once the `authlimit`
  zone's burst allowance was exceeded.
- Smoke-tested the golden path end-to-end in production: signup → add cat
  → take quiz → get diagnosis → view history. Exercised via `curl` against
  the live site (no browser available in this environment) — also verified
  the public `/share/[shareSlug]` page and cat-deletion cascade as a side
  effect. Test data cleaned up afterward via the API.
