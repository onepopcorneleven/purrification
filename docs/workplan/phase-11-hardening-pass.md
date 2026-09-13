# Phase 11 — Hardening pass / polish

Extended notes for `docs/workplan.md`'s Phase 11 entry.

## Execution notes

- Tuned (investigated) the `rate=5r/m` / `burst=5` rate-limit values from
  `vps-runbook.md` step 9 based on real traffic (the Phase 8 values are a
  starting point, not a final answer — see `vps-runbook.md` Notes).
  Investigated 2026-09-08 — see `vps-runbook.md`'s Phase 11 Execution log
  entry for the full account. Couldn't read Nginx's access log directly
  (`deploy` isn't in the `adm` group, and no session has `deploy`'s
  interactive sudo password); `journalctl -u purrification` (readable
  without `sudo`) showed no evidence of real login/signup volume, let alone
  volume that's ever tripped `authlimit`'s burst allowance outside the
  deliberate Phase 9 test. **Conclusion: left unchanged** — there isn't yet
  enough real traffic to tune the starting values against, and changing
  them without evidence would just be a different guess. Revisit once the
  app has real users.
- Added a nightly `pg_dump` backup job (flagged as a follow-up in
  `vps-runbook.md`). Done 2026-09-08 — `scripts/backup-db.sh` (new,
  committed) dumps via the app's own DB role (no `postgres`-OS access
  needed), scheduled through `deploy`'s crontab (03:30 UTC nightly, since a
  system-level systemd timer would need root `deploy` doesn't have
  passwordless sudo for) with 14-day local retention. Verified live: ran by
  hand, produced a valid gzip'd dump, `gzip -t` clean. See
  `vps-runbook.md` step 15 — includes a documented known gap
  (same-server-only storage; off-server shipping needs infra/credentials
  this project doesn't have yet).
- Reviewed all shipped diagnosis/ritual content once more against
  R-TONE-1/R-TONE-2 before considering this round "done." Reviewed
  2026-09-08: all 10 `diagnosisPool` entries and all 5 quiz questions read
  as whimsical/tongue-in-cheek, none phrase anything as real
  medical/behavioral advice, none use scammy/urgency language (R-TONE-1);
  `PageShell`'s persistent disclaimer (R-TONE-2) confirmed rendering on
  every route, including both places a diagnosis is actually shown
  (`results/[id]` and the public `share/[shareSlug]` page). No content
  changes needed.
