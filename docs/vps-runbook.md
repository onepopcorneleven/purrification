# Purrification — VPS Provisioning & Hardening Runbook

One-time setup checklist for the bare-metal VPS that hosts Purrification, per
`docs/architecture.md`'s deployment topology and requirements `R-INFRA-1/2/3`.
Assumes a fresh Ubuntu LTS box with only root/password access from the
provider. Run steps in order; each is idempotent-ish but written as a
first-run script.

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

## 9. Nginx reverse proxy
Create `/etc/nginx/sites-available/purrification`:
```nginx
server {
    listen 80;
    server_name <your-domain>;

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
Deploy the app code to `/home/deploy/purrification` (see deploy pipeline,
step 12), then create `/etc/systemd/system/purrification.service`:
```ini
[Unit]
Description=Purrification app
After=network.target postgresql.service

[Service]
Type=simple
User=deploy
WorkingDirectory=/home/deploy/purrification
EnvironmentFile=/home/deploy/purrification/.env.production
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```
`.env.production` (not committed) holds `DATABASE_URL`, session secret, etc.,
readable only by `deploy`:
```bash
chmod 600 /home/deploy/purrification/.env.production
```
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now purrification
sudo systemctl status purrification
```

## 12. Deploy pipeline (first version)
Minimal script run from CI or manually over SSH — satisfies `R-INFRA-3`
without an orchestration platform:
```bash
ssh deploy@<server-ip> '
  cd ~/purrification &&
  git pull origin main &&
  npm ci &&
  npm run build &&
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
- [ ] A test deploy via the step-12 script succeeds end-to-end.

## Notes / follow-ups
- This is a single-server setup (app + DB colocated) per `architecture.md`;
  revisit if scale ever requires splitting the database out.
- Secrets (`DATABASE_URL`, session secret) live only in `.env.production` on
  the server — rotate them if this file is ever exposed.
- Consider adding automated backups for PostgreSQL (e.g. nightly `pg_dump` to
  off-server storage) as a near-term follow-up; not covered by this runbook.
