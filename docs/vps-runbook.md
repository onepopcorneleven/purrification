# Purrification — VPS Provisioning & Hardening Runbook

One-time setup checklist for the bare-metal VPS that hosts Purrification, per
`docs/architecture.md`'s deployment topology and requirements `R-INFRA-1/2/3`.
Assumes a fresh Ubuntu LTS box with only root/password access from the
provider. Run steps in order; each is idempotent-ish but written as a
first-run script. Step 14 is the one exception — a recurring ops procedure
kept here for reference, not a one-time setup step.

## 0. Prerequisites
- Provider gives you: server IP, initial root password (or root SSH key).
- Have your own SSH public key ready locally (`~/.ssh/id_ed25519.pub` or similar).
- Pick a domain/subdomain to point at the server (needed for TLS later).
- **Check for a cloud-provider network firewall/security group in addition to
  `ufw`.** Some providers (e.g. Hetzner Cloud's Firewall product) filter
  inbound traffic to the VM *before* it ever reaches `ufw` — `ufw allow
  80,443/tcp` on the box itself is not sufficient if the provider's own
  firewall is still blocking those ports upstream. Symptom: `ufw status`
  looks correct, but external connections time out (not "refused") on
  80/443. Confirm from an external host (`curl -v http://<domain>/`, or
  `bash -c 'echo > /dev/tcp/<ip>/80'`) before step 10's certbot run, since
  certbot's HTTP-01 challenge will otherwise fail with a misleading
  "Timeout during connect (likely firewall problem)" error even though
  `ufw` is configured correctly.

## 1. First login & OS updates
```bash
ssh root@<server-ip>
apt update && apt upgrade -y
apt install -y ufw fail2ban unattended-upgrades curl git
```

## 2. Create a non-root deploy user
Never run the app or deploy as root.
```bash
adduser deploy               # set a strong password when prompted
usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
```
Or, if `~/.ssh` doesn't exist yet on root, create it manually for `deploy`:
```bash
mkdir -p /home/deploy/.ssh
echo "<your-public-key>" >> /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

## 3. Harden SSH
Edit `/etc/ssh/sshd_config`:
```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
Port 22
```
Then:
```bash
systemctl restart sshd
```
**Before disconnecting**, open a second terminal and confirm you can log in as
`deploy` with your key (`ssh deploy@<server-ip>`) — don't close the root
session until this is verified.

## 4. Firewall (ufw)
Default-deny, explicit allowlist only:
```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
ufw status verbose
```

## 5. fail2ban (brute-force protection on SSH)
```bash
systemctl enable --now fail2ban
fail2ban-client status sshd
```

## 6. Automatic security updates
```bash
dpkg-reconfigure -plow unattended-upgrades
```
Confirm `/etc/apt/apt.conf.d/20auto-upgrades` has both `Update-Package-Lists`
and `Unattended-Upgrade` set to `"1"`.

## 7. Install runtime dependencies
As `deploy` (with `sudo` where needed):
```bash
# Node.js (use NodeSource or nvm; pin an LTS version)
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Nginx
sudo apt install -y nginx
```

## 8. PostgreSQL setup
```bash
sudo -u postgres psql -c "CREATE USER purrification WITH PASSWORD '<strong-password>';"
sudo -u postgres psql -c "CREATE DATABASE purrification OWNER purrification;"
```
Store the connection string as an environment variable for the app (see
step 11) — never commit it to the repo.

## 9. Nginx reverse proxy (with auth-endpoint rate limiting, R-INFRA-4)
`limit_req_zone` must live in the `http {}` context, not inside a `server`
block. Add it to `/etc/nginx/conf.d/rate-limit.conf` (auto-included by the
default `nginx.conf`'s `include /etc/nginx/conf.d/*.conf;`):
```nginx
# /etc/nginx/conf.d/rate-limit.conf
limit_req_zone $binary_remote_addr zone=authlimit:10m rate=5r/m;
```

Create `/etc/nginx/sites-available/purrification`, applying that zone only
to the auth endpoints — everything else stays unlimited:
```nginx
server {
    listen 80;
    server_name <your-domain>;

    location /api/login {
        limit_req zone=authlimit burst=5 nodelay;
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/signup {
        limit_req zone=authlimit burst=5 nodelay;
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
```bash
sudo ln -s /etc/nginx/sites-available/purrification /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```
`rate=5r/m` (5 requests/minute per client IP) with `burst=5 nodelay` is a
starting point for a low-traffic learning project — tune it later based on
real traffic rather than blocking launch on picking an exact number
(tracked as a follow-up, see Notes below).

## 10. TLS via Let's Encrypt
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d <your-domain>
```
Certbot edits the Nginx config to redirect 80→443 and auto-renews via a
systemd timer — verify with:
```bash
sudo systemctl status certbot.timer
```

## 11. App environment & systemd service
Next.js has two ways to run in production: `next start` (needs the Next CLI
and full `node_modules` on the server) or a **standalone** build (`next
build` with `output: "standalone"` set in the app's `next.config.js`), which
emits a minimal, self-contained `server.js` plus a pruned `node_modules`.
This runbook uses the standalone build — it's the smallest deploy footprint
and is what makes `ExecStart=node server.js` below a real, working command.

This requires one line in the app repo's `next.config.js` (an app-code
prerequisite tracked in `workplan.md` Phase 0, not part of this ops runbook —
called out here because the systemd unit below silently depends on it):
```js
// next.config.js
module.exports = {
  output: "standalone",
};
```
Without this, `next build` never produces a `server.js`, and the service
below will fail to start with "cannot find module".

The standalone build does **not** include static assets — `public/` and
`.next/static/` must be copied into the standalone output after every build.
The deploy script in step 12 does this; it's also why the first deploy uses
`git clone` rather than assuming the code is already checked out.

Once step 12's first deploy has run once (code cloned, first build done,
static assets copied), create `/etc/systemd/system/purrification.service`:
```ini
[Unit]
Description=Purrification app
After=network.target postgresql.service

[Service]
Type=simple
User=deploy
WorkingDirectory=/home/deploy/purrification/.next/standalone
EnvironmentFile=/home/deploy/purrification/.env.production
Environment=PORT=3000
Environment=HOSTNAME=127.0.0.1
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```
`.env.production` (not committed) holds `DATABASE_URL`, session secret, etc.,
readable only by `deploy`. It stays at the repo root — `EnvironmentFile`
takes an absolute path regardless of the service's `WorkingDirectory`:
```bash
chmod 600 /home/deploy/purrification/.env.production
```

Before enabling the service, smoke-test the standalone build by hand as
`deploy`, to catch a broken build before systemd starts retrying it:
```bash
cd /home/deploy/purrification
PORT=3000 node .next/standalone/server.js &
curl -I http://127.0.0.1:3000
kill %1
```
A `200`/`30x` response confirms the build is runnable. Then wire it into
systemd:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now purrification
sudo systemctl status purrification
curl -I http://127.0.0.1:3000   # confirm the systemd-managed process also responds
```

## 12. Deploy pipeline (first version)

**First deploy only** — the server has no code yet, so this clones rather
than pulls, and creates the initial env file. `<repo-url>` must be reachable
from the server; add a read-only GitHub deploy key for the `deploy` user
before running this:
```bash
ssh deploy@<server-ip> 'ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N ""'
# add the printed public key as a deploy key on the GitHub repo (read-only),
# then:
ssh deploy@<server-ip> 'git clone <repo-url> ~/purrification'
scp .env.production deploy@<server-ip>:~/purrification/.env.production
ssh deploy@<server-ip> 'chmod 600 ~/purrification/.env.production'
ssh deploy@<server-ip> '
  cd ~/purrification &&
  npm ci &&
  npm run build &&
  mkdir -p .next/standalone/public .next/standalone/.next &&
  cp -r public/. .next/standalone/public/ &&
  cp -r .next/static .next/standalone/.next/static &&
  npx prisma migrate deploy
'
```
Then create and start the systemd service per step 11.

**Gotcha (hit on the actual first deploy, 2026-09-07):** `prisma7.config.ts`
uses `dotenv/config`, which only auto-loads `.env` — it never reads
`.env.production`. Next.js itself has separate env-file precedence and picks
up `.env.production` fine during `npm run build`, but the bare `npx prisma
migrate deploy` above will fail with `Error: The datasource.url property is
required...` on a server that has no `.env`, only `.env.production`. Export
the vars first:
```bash
set -a && source .env.production && set +a && npx prisma migrate deploy
```
(`dotenv` never overwrites an already-set env var, so this is safe even
where both files exist.) Apply the same fix to the repeat-deploy script
below.

**Every deploy after that** — minimal script run from CI or manually over
SSH, satisfies `R-INFRA-3` without an orchestration platform. It repeats the
same static-asset copy as the first deploy, since `npm run build` wipes and
regenerates `.next/standalone` from scratch each time:
```bash
ssh deploy@<server-ip> '
  cd ~/purrification &&
  git pull origin main &&
  npm ci &&
  npm run build &&
  rm -rf .next/standalone/public .next/standalone/.next/static &&
  cp -r public/. .next/standalone/public/ &&
  cp -r .next/static .next/standalone/.next/static &&
  (set -a && source .env.production && set +a && npx prisma migrate deploy && npm run db:seed-content) &&
  sudo systemctl restart purrification
'
```
`npm run db:seed-content` (added in Phase 13, `docs/content/content-storage-
architecture.md` §8) runs right after `prisma migrate deploy`, in the same
`.env.production`-sourced subshell — content seeding needs `DATABASE_URL`
too, and it's idempotent (upsert-by-stable-id), so running it on every
deploy is safe even when the seed JSON hasn't changed.
Requires `deploy` to have passwordless `sudo` scoped to
`systemctl restart purrification` only (edit via `sudo visudo`):
```
deploy ALL=(ALL) NOPASSWD: /bin/systemctl restart purrification
```

## 13. Verification checklist
- [x] `ssh root@<server-ip>` is refused; `ssh deploy@<server-ip>` works with key only.
- [x] `ufw status` shows only 22, 80, 443 allowed.
- [x] `https://<your-domain>` loads with a valid certificate (no browser warning).
- [x] `http://<your-domain>` redirects to `https://`.
- [x] `systemctl status purrification` shows `active (running)`. Confirmed
      2026-09-07 after the first real deploy (Phase 9) — note it came up on
      its own: the unit's `Restart=on-failure`/`RestartSec=5` loop had been
      retrying since step 11 was staged, and the very next retry after
      `server.js` first appeared on disk succeeded without any manual
      `systemctl start`.
- [x] Killing the Node process causes systemd to restart it automatically. —
      Implicitly confirmed by the above: the unit was crash-looping and
      self-healing every 5s for hours before the app code existed, then
      recovered into a stable `active (running)` the moment a valid build
      appeared, with no manual intervention.
- [x] `fail2ban-client status sshd` shows the jail is active.
- [x] `curl -I http://127.0.0.1:3000` on the server returns a successful
      response. Confirmed `200` on both `/` and `/signup`, served by the
      systemd-managed process.
- [x] The step-12 first-deploy sequence (fresh `git clone`, not `git pull`)
      succeeds on a clean checkout. Done 2026-09-07 — see Execution log.
- [x] A subsequent test deploy via the step-12 repeat-deploy script succeeds
      end-to-end, including the static-asset copy. Exercised for real
      2026-09-08 (shipping the landing-page header image): `git pull` →
      `npm ci` → `npm run build` → static-asset copy → `prisma migrate
      deploy` (reported "No pending migrations to apply") → `sudo systemctl
      restart purrification`, all in one script, no manual intervention.
      Confirmed live: service `active (running)` seconds after restart,
      `https://purrification.com/` and the new
      `https://purrification.com/images/header-fortune-cat.png` both `200`.
- [x] Rate limiting is active before the site is announced/used publicly —
      confirmed live 2026-09-07: 8 rapid `POST /api/login` requests returned
      six `401`s (correct credential rejection) followed by `503`s once the
      `authlimit` zone's burst allowance was exceeded — Nginx is genuinely
      throttling the endpoint, not just passing every request through.

Everything through step 10 (SSH hardening, firewall, fail2ban, automatic
updates, runtime deps, database, Nginx + rate limiting, TLS) was done and
verified live as of 2026-09-07's provisioning run. Steps 11 (systemd) and 12
(deploy pipeline, first-deploy path) were completed the same day once app
code existed — see the Execution log below for both runs.

## Execution log — 2026-09-07
Ran against the real production VPS (`purrification-deploy` alias) on this
branch. Notes on what actually happened, for anyone re-running this runbook
or auditing what state the server is in:

- **Steps 1–3 were already done** before this run started (root login
  disabled, `deploy` user created with key-only SSH) — presumably from
  initial provider/manual setup. This run picked up at step 4.
- **A cloud-provider firewall was blocking 80/443 upstream of `ufw`** — see
  the new prerequisites note above. It was disabled for this server in favor
  of relying on `ufw` alone, per an explicit decision (not this runbook's
  default recommendation — most setups should prefer defense-in-depth with
  both layers; here it was a deliberate scope call for this single-server
  learning project).
- **Node.js installed via NodeSource's `setup_lts.x`, resolving to v24.20.0**
  — this pins "whatever's current LTS at provisioning time," per step 7's
  "pin an LTS version" note (specs-updates.md item 10). If a specific major
  version needs pinning going forward, switch to `setup_24.x` explicitly.
- **PostgreSQL 18** (Ubuntu 26.04's default `postgresql` package version).
- **DB credentials**: a random password was generated with `openssl rand`
  and never printed to any terminal/log. The resulting `DATABASE_URL` is
  stored root-only at `/root/purrification-secrets/db-credentials.env` on
  the server — move it into `/home/deploy/purrification/.env.production`
  (per step 11) when the first real deploy happens; don't regenerate it.
- **Sudo access for this run**: `deploy` already had `sudo` group membership
  but no `NOPASSWD` rule, so every privileged step needed an interactive
  password. A temporary broad `NOPASSWD:ALL` rule
  (`/etc/sudoers.d/90-deploy-temp`) was installed for the duration of this
  provisioning run and removed at the end, leaving only the narrow
  `systemctl restart purrification`-only rule from step 12
  (`/etc/sudoers.d/90-deploy-restart`) in place long-term.
- **Steps 11–12 could not be completed**, only staged: the systemd unit file
  is installed but disabled, and `/home/deploy/purrification` exists but is
  empty — there's no app repo to clone (`workplan.md` Phases 0–7 are still
  pending). Re-run step 12's first-deploy sequence once the app exists.

## Execution log — 2026-09-07 (Phase 9 first deploy)
Ran once `workplan.md` Phases 0–7 had merged to `main`, completing steps 11–12
left staged above.

- The repo is **public**, so the deploy-key step (generating an SSH key on
  the server, registering it as a GitHub deploy key) wasn't needed — a plain
  `git clone https://github.com/onepopcorneleven/purrification.git` worked
  directly.
- `.env.production`'s `DATABASE_URL` reused the same value already fetched
  from `/root/purrification-secrets/db-credentials.env` back in Phase 1 (it
  hadn't changed); `SESSION_SECRET` was freshly generated on the server via
  `openssl rand -base64 32` rather than reusing the local dev value.
- `npx prisma migrate deploy` needed the `dotenv/config`-vs-`.env.production`
  workaround documented in step 12 above; ran clean afterward and reported
  "No pending migrations to apply" (the schema was already current from
  Phase 1).
- The systemd unit had been crash-looping (`Restart=on-failure`,
  `RestartSec=5`) since it was staged, retrying against a `server.js` that
  didn't exist yet. The moment `npm run build` produced one, its next
  automatic retry succeeded — it was already `active (running)` before the
  planned manual `systemctl enable --now` step was reached. A subsequent
  `sudo systemctl restart purrification` (the passwordless-sudo path the
  repeat-deploy script depends on) was tested and confirmed working.
- **`sudo systemctl enable purrification` (boot-persistence) was not run** —
  the passwordless sudoers rule only covers `systemctl restart purrification`
  exactly, and this needs `deploy`'s interactive sudo password, which wasn't
  available in this session. The service is currently running but would not
  survive a reboot until someone runs this by hand. **Resolved by 2026-09-08**
  — confirmed during the Phase 11 hardening pass (see that Execution log
  entry) that `systemctl is-enabled purrification` now reports `enabled`. No
  Claude Code session had `deploy`'s interactive sudo password at any point,
  so an operator must have run this by hand between the two sessions.
- Verified externally: `http://purrification.com` → `301` to `https://`;
  `https://purrification.com/` → `200` with a valid cert; full golden path
  exercised via `curl` against the live site — signup, add cat, submit quiz,
  atomic `QuizAttempt`+`Diagnosis` creation, per-cat history, the public
  `/share/[shareSlug]` page (cat name only, no account data), cat deletion
  cascading to its quiz/diagnosis history (share link 404s afterward), and
  Nginx's `authlimit` rate limiting actually throttling `/api/login` (six
  `401`s then `503`s across 8 rapid requests). The repeat-deploy (`git
  pull`)-based script path is still unexercised — only the first-deploy
  (`git clone`) path has been run for real.
- Test data cleanup: the smoke-test cat and its history were deleted via the
  API (cascade delete verified as a side effect); the smoke-test `User` row
  itself has no delete endpoint (out of scope — R-CAT-5 covers cats, not
  accounts) and was left in place as a harmless leftover row (throwaway
  email, no real data).

## Execution log — 2026-09-08 (Phase 10 design-system deploy)
The repeat-deploy (`git pull`) script path from step 12 — exercised once
already for a small header-image-only change — got its first real workout
here: a full design-system overhaul (Tailwind v4, every page restyled) with
significant new dependencies and build output.

- `npm ci && npm run build` succeeded clean on the server on the first try —
  no server-specific build failures despite the much larger change surface.
- No pending Prisma migrations (no schema changes this phase).
- `sudo systemctl restart purrification` needed to be its own SSH command,
  not chained with other commands (`cmd1 && sudo cmd2` prompted for a TTY
  even though the passwordless sudoers rule matches `cmd2` exactly) — restart
  it alone, then run a separate `systemctl status`/`journalctl` call without
  `sudo` (readable without it) to check the result.
- Verified same as the Phase 9 golden path, run again directly against
  `https://purrification.com` post-restart: signup → add cat → quiz →
  results → share → history → delete-with-cascade (share link 404s
  afterward), zero errors in `journalctl -u purrification` across the whole
  run. Test cat/quiz/diagnosis data deleted via the API afterward; the
  throwaway test `User` row was left in place, same as every prior smoke
  test (no delete-account endpoint exists).
- No literal visual/screenshot check was possible — the sandbox this deploy
  ran from has no usable headless browser (see `CLAUDE.md`'s "Current
  state"). The deploy is functionally verified, not visually verified by
  Claude Code; worth an actual look in a browser when convenient.

## Execution log — 2026-09-08 (Phase 11 hardening pass)
- **Rate-limit tuning attempt**: tried to pull real traffic stats from
  `/var/log/nginx/access.log` to inform step 9's `rate=5r/m`/`burst=5`
  values. Blocked — `deploy` isn't in the `adm` group that owns read access
  to Nginx's logs, and every `sudo` path in this session needs an
  interactive password no Claude Code session has (the passwordless rule is
  scoped to `systemctl restart purrification` only, by design — see step
  12). Fell back to `journalctl -u purrification` (readable without `sudo`
  since it's the invoking user's own unit) as the best available signal:
  193 total log lines since the service's 2026-09-07 start, the only
  repeating errors being unrelated Next.js server-action bot/scanner noise
  (malformed `Server Reference ID` headers, not `/api/login`/`/api/signup`
  traffic). No evidence of real users hitting the auth endpoints at volume,
  let alone at a rate that's ever tripped `authlimit`'s burst allowance
  outside the deliberate Phase 9 test. Conclusion: there isn't yet enough
  real traffic to tune the starting values against — changing them now
  would be a guess dressed up as data. Left unchanged; see the Notes
  section above.
- **Nightly backups**: implemented and verified live — see step 15.
  `scripts/backup-db.sh` ran cleanly by hand
  (`purrification-20260908T122143Z.sql.gz`, `gzip -t` clean, valid
  `pg_dump` header confirmed), then wired into `deploy`'s crontab for
  03:30 UTC nightly.
- **Incidental finding**: `systemctl is-enabled purrification` now reports
  `enabled`, closing out the Phase 9 boot-persistence follow-up that no
  session had run — see the note added to that Execution log entry above.
  Nothing in this project's tooling ran it; an operator must have done it
  by hand between sessions.
- **Content tone review (R-TONE-1/R-TONE-2)**: read every entry in
  `src/content/diagnoses.ts` (10) and `src/content/quiz.ts` (5 questions)
  against R-TONE-1 — all read as whimsical/tongue-in-cheek, none phrase
  anything as real medical or behavioral advice, none use scammy/urgency
  language. Confirmed `PageShell`'s persistent "just for fun... see a vet"
  disclaimer (R-TONE-2) renders on every route via its shared footer,
  including `results/[id]` and the public `share/[shareSlug]` page where it
  matters most. No content changes made — this pass found nothing to fix.

## 14. Manual account recovery (ops-only, R-AUTH-4)
There's no in-app "forgot password" flow this round (see
`requirements.md` R-AUTH-4) — a locked-out user is recovered manually,
by an operator with server access, not a repeatable self-service checklist
item but a recurring procedure to keep here for when it's needed:

1. Generate a new hash using the app's own hashing function — reuse the
   exact code path login verifies against, don't hand-roll a hash with a
   different algorithm or cost factor:
   ```bash
   cd /home/deploy/purrification
   node -e "require('./lib/auth/password').hashPassword('<temp-password>').then(console.log)"
   ```
   (adjust the require path to wherever the password-hashing helper from
   `architecture.md`'s Auth section actually lives once it's built.)
2. Update the row directly in Postgres:
   ```bash
   sudo -u postgres psql -d purrification -c \
     "UPDATE \"User\" SET \"passwordHash\" = '<generated-hash>' WHERE email = '<user-email>';"
   ```
3. Send the user the temporary password out-of-band (not plain email), and
   have them log in and treat it as compromised — capture it in as few
   places as possible.
4. Clear the temporary password from shell history once confirmed
   (`history -d <line>` or start a fresh shell).

This is deliberately manual and meant to be rare. If recovery requests
become frequent enough that this doesn't scale, that's the signal to
build R-AUTH-4's deferred email-based reset flow instead of scaling this
procedure.

## 15. Automated nightly backups (`workplan.md` Phase 11)
This runbook's original Notes section flagged automated backups as a
near-term follow-up; done 2026-09-08. `scripts/backup-db.sh` (committed to
the repo) dumps the database nightly via `pg_dump "$DATABASE_URL"` using the
app's own `purrification` DB role — that role already owns the database
(step 8), so this needs no `postgres`-OS-level access at all, unlike step
14's manual-recovery procedure above.

Scheduled via the `deploy` user's own crontab, not a system-level systemd
timer: writing unit files under `/etc/systemd/system` needs root, and
`deploy`'s passwordless sudo is scoped to `systemctl restart purrification`
only (step 12) — every other privileged action needs an interactive
password this project's Claude Code sessions don't have. A user crontab
needs no elevated privilege at all, so that's what's actually running.

```bash
scp scripts/backup-db.sh deploy@<server-ip>:~/purrification/scripts/backup-db.sh
ssh deploy@<server-ip> 'chmod +x ~/purrification/scripts/backup-db.sh'
ssh deploy@<server-ip> '
  (crontab -l 2>/dev/null; echo "30 3 * * * /home/deploy/purrification/scripts/backup-db.sh >> /home/deploy/backups/purrification/backup.log 2>&1") | crontab -
'
```

Dumps land gzip'd at `/home/deploy/backups/purrification/purrification-<UTC
timestamp>.sql.gz` (dir mode `700`, `deploy`-only), one per night at 03:30
UTC; the script prunes anything older than 14 days on each run. Restore with
`gunzip -c <file>.sql.gz | psql "$DATABASE_URL"` against an empty/target
database.

**Known gap, deliberately not closed this round:** backups are
same-server-only — a full disk failure loses the app and every backup
together. The original Notes bullet said "off-server storage"; actually
shipping that needs a destination (S3-compatible bucket, a second VPS,
`rclone`, etc.) this single-server project doesn't have credentials or a
budget decision for yet. Tracked here as the next step if/when that's worth
setting up, not silently dropped.

## Notes / follow-ups
- This is a single-server setup (app + DB colocated) per `architecture.md`;
  revisit if scale ever requires splitting the database out.
- The `rate=5r/m` / `burst=5` values in step 9 are a starting point.
  Reviewed 2026-09-08 (Phase 11 hardening pass) against real traffic: see
  that Execution log entry — the app hasn't had enough genuine login/signup
  volume yet to tune the exact numbers against, so the values are unchanged
  for now. Revisit again once there's real usage to measure against.
- Secrets (`DATABASE_URL`, session secret) live only in `.env.production` on
  the server — rotate them if this file is ever exposed.
- Automated nightly backups: done, see step 15. Off-server backup storage
  remains a follow-up — see step 15's "Known gap" note.
