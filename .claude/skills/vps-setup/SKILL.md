---
name: vps-setup
description: One-time VPS bootstrap. Installs Docker + nginx + gh CLI, authenticates gh, writes systemd unit for Claude Code agent, writes nginx reverse-proxy config, prompts for .env secrets. Run ONCE on the VPS per project. Not for local dev machines.
user_invocable: true
---

# /vps-setup

One-time bootstrap on the VPS. Converts a bare Ubuntu/Debian host into a
working autonomous-dev VPS with the project's app and CC agent both running
under systemd.

**Not idempotent for destructive ops** — always reviews before `apt install`
or overwriting `/etc/nginx/*`. But fully safe to re-run: re-detects what's
already installed and skips.

## Prerequisites

- Ubuntu 22+ or Debian 12+
- User with sudo
- Current directory is the cloned project repo at `/opt/<slug>/`
- `.claude/project.json` already filled by `/init-autonomous` Phase 2 (at
  least `project.slug`, `project.name`, `deploy.*`, `host.serviceName`)

## Phases

### 1. Detect + confirm

Run:
```bash
lsb_release -a                       # Ubuntu/Debian?
whoami                                # current user
groups | grep -E "sudo|docker"        # sudo + docker groups
which docker nginx gh node            # which tools already installed
systemctl --version                   # systemd?
```

Print findings, ask user to confirm before any install.

### 2. Install missing dependencies

For each missing tool, prompt before installing:

```bash
# Docker (official)
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# (logout + login required to pick up group; tell user)

# nginx
sudo apt update && sudo apt install -y nginx

# gh CLI
# Follow https://github.com/cli/cli/blob/trunk/docs/install_linux.md

# Node 20 (for roadmap scripts + CC agent)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 3. gh auth

```bash
gh auth login
```

Prompt user to follow the interactive flow; verify with `gh auth status`.

### 4. Environment variables (.env)

If `.env` doesn't exist, copy from `.env.example` and prompt the user for
each required secret one at a time. Never log the values. Write to `.env`
with mode 0600.

Required at minimum:
- `ANTHROPIC_API_KEY` — for the autonomous agent
- Any DB credentials, app secrets the user has from `.env.example`

### 5. Systemd unit for Claude Code

Write `/etc/systemd/system/claude-{{slug}}.service`:

```ini
[Unit]
Description=Claude Code autonomous agent for {{project_name}}
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User={{os_user}}
WorkingDirectory=/opt/{{slug}}
EnvironmentFile=/opt/{{slug}}/.env
# The actual CC CLI command; adjust for your CC install location:
ExecStart=/usr/local/bin/claude-code --scheduled
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable claude-{{slug}}.service
# Don't start yet — user should flip schedule.enabled in project.json first
```

### 6. nginx reverse proxy

Copy `docker/nginx.conf` to `/etc/nginx/sites-available/{{slug}}.conf` and
link:

```bash
sudo cp docker/nginx.conf /etc/nginx/sites-available/{{slug}}.conf
sudo ln -sf /etc/nginx/sites-available/{{slug}}.conf \
           /etc/nginx/sites-enabled/{{slug}}.conf
sudo nginx -t && sudo systemctl reload nginx
```

### 7. TLS (optional)

Prompt: "Enable HTTPS via Let's Encrypt now? [Y/n]"

If yes:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d {{app_domain}}
```

### 8. First deploy verification

```bash
bash scripts/deploy.sh          # build + up + health check
bash scripts/healthcheck.sh     # independent verification
```

If health check passes: done. Print next steps:

```
VPS setup complete.

Next:
  1. Flip schedule.enabled to true in .claude/project.json
     (or via: mcp__scheduled-tasks__update_scheduled_task)
  2. sudo systemctl start claude-{{slug}}
  3. Watch: sudo journalctl -u claude-{{slug}} -f

Troubleshooting:
  - App logs:     docker compose -f docker/docker-compose.yml logs -f app
  - nginx logs:   sudo tail -f /var/log/nginx/error.log
  - CC agent:     sudo journalctl -u claude-{{slug}} -n 100
```

## Failure modes

- **User not in `docker` group:** installer adds them, but group membership
  only takes effect on new login. Tell the user to `exit` and SSH back in.
- **systemd not available:** e.g. Alpine, some container hosts. Fall back
  to writing a `/root/claude-{{slug}}.sh` loop script and suggest running
  it in `tmux` — but warn about lack of auto-restart.
- **SELinux enforcing on RHEL-family:** not covered; refer to
  `docs/VPS-SETUP.md` troubleshooting.
- **nginx conflict with existing site:** detect if `/etc/nginx/sites-enabled/default`
  exists; offer to disable it.
- **Firewall blocking:** check `ufw status`; offer `sudo ufw allow 80,443/tcp`.
