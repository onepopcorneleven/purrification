# Phase 8 — VPS provisioning (R-INFRA-1, R-INFRA-2, R-INFRA-4)

Extended notes for `docs/workplan.md`'s Phase 8 entry. See `docs/vps-runbook.md`'s
own Execution log section for the authoritative blow-by-blow of the runbook
steps themselves; this file is just the workplan-side commentary on status
and what was deferred to Phase 9.

## Execution notes

- Executed `docs/vps-runbook.md` steps 1–10 on the target VPS (user/SSH
  hardening, firewall, fail2ban, automatic updates, Node/Postgres/Nginx
  install, TLS). Done and verified live on `purrification.com` as of
  2026-09-07 — see `vps-runbook.md`'s Execution log. Steps 11 (systemd) and
  12 (deploy pipeline) were staged, not executed, in this phase — they were
  blocked on application code existing; that blocker was cleared by Phases
  0–7, so they were tracked in Phase 9 instead of here.
- Confirmed step 9's Nginx `limit_req` rate limiting on `/api/login` and
  `/api/signup` is configured — the `limit_req_zone` and per-location
  directives were deployed and `nginx -t` passed, done before any app code
  existed (R-INFRA-4). End-to-end verification against a live, running
  endpoint needed Phase 9's first deploy — tracked there, not as a Phase 8
  gap.
- Ran through the runbook's verification checklist and confirmed every
  item. All items in `vps-runbook.md` step 13 were checked except one: the
  step-12 *repeat*-deploy (`git pull`) path hadn't been exercised for real
  yet (only the first-deploy `git clone` path had) — tracked as a Phase 9
  follow-up, not a Phase 8 gap.
- Provisioned the production Postgres database and stored its connection
  string in `.env.production` on the server (never in the repo). The
  database was provisioned in step 8 (`purrification` DB + role created);
  its `DATABASE_URL` was moved into
  `/home/deploy/purrification/.env.production` during Phase 9's first
  deploy (2026-09-07) — see `vps-runbook.md`'s Execution log.
