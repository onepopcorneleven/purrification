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
  npx prisma migrate deploy &&
  sudo systemctl restart purrification
'
```
Requires `deploy` to have passwordless `sudo` scoped to
`systemctl restart purrification` only (edit via `sudo visudo`):
```
deploy ALL=(ALL) NOPASSWD: /bin/systemctl restart purrification
```

## 13. Verification checklist
- [ ] `ssh root@<server-ip>` is refused; `ssh deploy@<server-ip>` works with key only.
- [ ] `ufw status` shows only 22, 80, 443 allowed.
- [ ] `https://<your-domain>` loads with a valid certificate (no browser warning).
- [ ] `http://<your-domain>` redirects to `https://`.
- [ ] `systemctl status purrification` shows `active (running)`.
- [ ] Killing the Node process causes systemd to restart it automatically.
- [ ] `fail2ban-client status sshd` shows the jail is active.
- [ ] `curl -I http://127.0.0.1:3000` on the server returns a successful
      response (confirms the standalone build actually runs, not just that
      the systemd unit is "active").
- [ ] The step-12 first-deploy sequence (fresh `git clone`, not `git pull`)
      succeeds on a clean checkout.
- [ ] A subsequent test deploy via the step-12 repeat-deploy script succeeds
      end-to-end, including the static-asset copy.
- [ ] Rate limiting is active before the site is announced/used publicly:
      `for i in $(seq 1 10); do curl -s -o /dev/null -w "%{http_code}\n"
      -X POST https://<your-domain>/api/login; done` shows `503` responses
      after the first several requests (once `/api/login` exists — this
      check can only run after the app itself is deployed).

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

## Notes / follow-ups
- This is a single-server setup (app + DB colocated) per `architecture.md`;
  revisit if scale ever requires splitting the database out.
- The `rate=5r/m` / `burst=5` values in step 9 are a starting point, not a
  tuned final answer — revisit based on real traffic/false-positive reports
  once the app has real users.
- Secrets (`DATABASE_URL`, session secret) live only in `.env.production` on
  the server — rotate them if this file is ever exposed.
- Consider adding automated backups for PostgreSQL (e.g. nightly `pg_dump` to
  off-server storage) as a near-term follow-up; not covered by this runbook.
