# Deployment Options: Next.js 16 Dashboard on a Home LAN

**Project:** UniFi Network Dashboard — v2.0 Local Edition
**Researched:** 2026-04-24
**Question:** Where should this Next.js app run to stay always-on on the family LAN?

---

## Quick Recommendation

**Use Option A (Docker on a home server/NAS/Pi).** It is the standard pattern for this exact use case, works reliably across firmware upgrades (on a separate device), and the STACK.md already has the correct Dockerfile pattern. If you do not have a separate server, a Raspberry Pi 4 (4GB) is the minimum viable hardware and costs ~$55 USD.

Do **not** use Option B (run on the Dream Machine Pro itself) as your primary hosting plan. It is an unofficial, SSH-based workaround that Ubiquiti does not support, requires re-setup after every firmware upgrade on UniFi OS 3.x/4.x, and puts a non-trivial Node.js process on the same device that is routing your network traffic.

---

## Option A: Docker on a Separate Home Server / NAS

### Overview

Run the app as a Docker container on any always-on device that is not the Dream Machine Pro. The STACK.md for v2.0 already documents the exact Dockerfile and `docker run` command needed. This is the dominant pattern for home-lab Next.js self-hosting and is well-documented in the broader community.

### How common is this?

Very common — the top search results for "Next.js home lab self-host" are all Docker-on-Pi or Docker-on-NAS guides from 2024-2026. The pattern is so standard that multiple maintained GitHub templates exist for it.

### Minimal docker-compose.yml

```yaml
version: "3.9"
services:
  unifi-dashboard:
    image: unifi-dashboard:latest
    restart: unless-stopped        # auto-restart on crash or host reboot
    ports:
      - "3000:3000"
    env_file:
      - .env.local
```

Run `docker compose up -d` once. The `restart: unless-stopped` policy handles host reboots and container crashes automatically — no systemd unit or cron needed.

### Minimum hardware

| Hardware | CPU | RAM | Notes |
|----------|-----|-----|-------|
| Raspberry Pi 4 (4GB) | ARM Cortex-A72 quad-core 1.5 GHz | 4 GB | Minimum viable. Can run the dashboard alongside Pi-hole if desired. |
| Raspberry Pi 4 (8GB) | same | 8 GB | Comfortable — handles 10-15 containers. |
| Raspberry Pi 5 | Cortex-A76 quad-core 2.4 GHz | 4/8 GB | Faster builds. Better choice if also running other services. |
| Synology NAS (any DSM 7.2+) | varies | varies | Container Manager (successor to Docker package) supports docker-compose. Works well. |
| Any x86-64 mini PC / old laptop | any modern | 4 GB+ | Easiest. Full Docker support, no ARM edge cases. |

The Next.js standalone image is small (Alpine base, ~150-200 MB). The runtime memory footprint for this app (no database, polling-only) is approximately 100-150 MB RAM. A Pi 4 4GB is genuinely sufficient.

### Pros

- Complete separation from network-routing hardware — app failure cannot affect networking
- Docker `restart: unless-stopped` handles auto-start, crash recovery, and reboots with zero custom scripting
- Standard pattern, massive community support, identical dev-to-prod workflow
- Dockerfile already written in STACK.md
- Firmware upgrades on the Dream Machine Pro are completely irrelevant to app uptime
- Portainer UI available if desired (optional, not required)
- Easy updates: `docker pull && docker compose up -d`

### Cons

- Requires always-on hardware that is not the Dream Machine Pro
- Small upfront cost if no Pi or NAS exists (~$55 for Pi 4 4GB + SD card)
- One more device to power and maintain (low burden — Pis idle at ~3W)

---

## Option B: Running Directly on the Dream Machine Pro

### Overview

The Dream Machine Pro is a managed network appliance running UniFi OS (currently 4.x/5.x in production, 3.x still common). Ubiquiti does not provide an official mechanism for running arbitrary third-party applications. Running a custom app requires unofficial SSH-based methods.

### Official mechanism: Does it exist?

**There is no official supported way to run custom Node.js applications on the Dream Machine Pro.** Ubiquiti's "UniFi Native Application" (UNA) format exists conceptually and is referenced in firmware release notes, but there is no public developer documentation, SDK, or submission path for building UNA-format apps as of April 2026. UNA is used exclusively for Ubiquiti's own first-party apps (Access, Talk, Protect, etc.).

Ubiquiti explicitly states that SSH access is not recommended unless directed by support. Custom modifications are not covered by warranty.

### Unofficial SSH approach (current community method)

The `unifi-utilities/unifios-utilities` repository is the primary community resource. Here is how the unofficial approach works and what it costs:

**UniFi OS version breakdown:**
| Firmware | Container technology | Status |
|----------|---------------------|--------|
| 1.x / 2.x | Podman (Docker-compatible) | End of life |
| 3.x | systemd-nspawn (NOT Docker) | No longer actively sold |
| 4.x | systemd-nspawn (NOT Docker) | Current on older hardware |
| 5.x | systemd-nspawn (see note) | Current on newer hardware |

**The Dream Machine Pro ships with UniFi OS 3.x/4.x.** As of UniFi OS 3.0, Ubiquiti removed Podman/Docker support from the kernel. The only container method available is `systemd-nspawn` — a Linux container tool that is not compatible with Docker images without conversion.

**What this means for this project:**
- You cannot run `docker run unifi-dashboard` directly on the Dream Machine Pro
- You would need to create a Debian-based nspawn container, then install Node.js inside it, then copy the Next.js standalone build, then configure it to start
- The nspawn-container setup requires `debootstrap` to bootstrap a full Debian filesystem (several hundred MB on the DMP's 16 GB eMMC)
- On-boot persistence scripts (`on_boot.d`) survive reboots but **require manual re-setup after major firmware upgrades** (confirmed in multiple GitHub issues — e.g., issue #581: upgrade from 3.1.16 to 3.2.6 broke Pi-hole install)
- nspawn on 4.x works (confirmed by community: containers survived 4.0.6 upgrade) but with non-fatal scripting errors in the network setup

**DMP hardware constraints:**
- CPU: 1.7 GHz ARM Cortex-A57 quad-core
- RAM: 4 GB total (shared between UniFi OS, Network Application, IDS/IPS, all routing functions)
- Storage: 16 GB eMMC (not SSD, limited write endurance for heavy workloads)

The UniFi Network Application alone consumes approximately 1-1.5 GB RAM at idle. Running a Node.js process alongside it is technically possible but leaves limited headroom, especially if IDS/IPS or Deep Packet Inspection is enabled.

### Is it realistic for a non-DevOps home user?

**No.** The setup requires:
1. Enabling SSH on the DMP
2. Installing `systemd-container` and `debootstrap` via SSH
3. Bootstrapping a Debian root filesystem
4. Installing Node.js manually inside the nspawn container
5. Configuring on_boot.d scripts for persistence
6. Re-doing steps 3-5 after any major UniFi OS firmware upgrade

This is 30-60 minutes of SSH work initially and represents ongoing maintenance risk. Community guides exist, but they are written for technically comfortable users and require debugging when things break.

### Pros

- No additional hardware cost
- App runs on the LAN with zero additional power draw
- Single device to manage

### Cons

- No official support — completely unofficial workaround
- Docker is NOT available; requires systemd-nspawn which is not Docker-compatible
- Must reinstall after major firmware upgrades (confirmed behavior)
- Uses RAM and eMMC on the device that is also routing all network traffic
- If the custom container crashes or causes OOM, it could destabilize network routing
- 16 GB eMMC is not designed for container workloads (write endurance concern)
- Non-trivial setup — not appropriate for a non-DevOps operator
- UniFi OS 5.x compatibility unknown (community tools are behind)

---

## Option C: Node.js Directly on a Home Server (No Docker)

### Overview

Install Node.js on the host OS of a home server and run the Next.js standalone build directly, managed by pm2 or a systemd service. No containerization.

### Is this simpler than Docker for a Next.js app?

**No, not in 2025.** Docker with `restart: unless-stopped` is operationally simpler for this use case because:
- No Node.js version management on the host (no nvm headaches)
- No dependency bleed between projects
- Restart/auto-start is one docker-compose line vs. writing a systemd unit file
- Upgrades are `docker pull` instead of `npm install && pm2 reload`

pm2 adds a separate process manager layer on top of Node.js. The common advice in 2025 is: if you are in Docker, skip pm2 and use Docker's restart policy instead. pm2 inside Docker exists but adds complexity for no meaningful benefit in a single-container home app.

### What a systemd approach looks like (for reference)

```ini
# /etc/systemd/system/unifi-dashboard.service
[Unit]
Description=UniFi Dashboard
After=network.target

[Service]
Type=simple
User=nextjs
WorkingDirectory=/opt/unifi-dashboard
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/opt/unifi-dashboard/.env.local

[Install]
WantedBy=multi-user.target
```

Enable with `systemctl enable --now unifi-dashboard`. This works, but it requires Node.js installed at the right version on the host, the right user permissions, and manual management of the `.env.local` file.

### Pros

- No Docker overhead (negligible in practice for this workload)
- Fewer moving parts if you are already managing a bare-metal Linux server
- systemd is extremely stable and zero-overhead

### Cons

- More manual setup than Docker compose
- Node.js version tied to host OS — upgrading Node.js risks breaking the app
- No portability — moving to new hardware requires re-setup instead of `docker save/load`
- pm2 adds a layer of indirection that is unnecessary in Docker environments
- Harder to replicate dev environment locally (dev uses Docker, prod does not)

---

## Comparison Table

| Criterion | Option A: Docker on home server | Option B: On Dream Machine Pro | Option C: No-Docker Node.js |
|-----------|--------------------------------|-------------------------------|------------------------------|
| **Setup complexity** | Low — Dockerfile already written | Very high — SSH, nspawn, debootstrap | Medium — systemd unit file |
| **Requires extra hardware** | Yes (Pi 4 ~$55 if none exists) | No | Yes (same as A) |
| **Firmware upgrade risk** | None — separate device | High — must reinstall after major upgrades | None |
| **Official support** | N/A (Docker is standard) | None — fully unsupported | N/A |
| **Auto-start on host reboot** | `restart: unless-stopped` — automatic | Requires on_boot.d scripting | `systemctl enable` |
| **Network isolation** | Container-isolated | Shares DMP RAM/eMMC | Process-isolated only |
| **DMP stability risk** | None | Low-medium (OOM possible) | None |
| **Maintenance burden** | Pull new image, `compose up -d` | Re-setup after firmware upgrades | Node.js version management |
| **Docker image compatibility** | Full | Not applicable — nspawn only | Not applicable |
| **Appropriate for non-DevOps user** | Yes | No | Marginal |
| **Community adoption for this use case** | Very high | Low (hobbyist only) | Medium |
| **Recommended** | YES | No | Fallback if no Docker available |

---

## Other Options Worth Considering

### VM on a home server (Proxmox, etc.)

If someone already runs Proxmox or another hypervisor, running Docker inside an LXC container or a lightweight VM is equivalent to Option A with an extra abstraction layer. Not necessary for this app — adds complexity without benefit. Skip unless the homelab already uses Proxmox.

### NAS-native Node.js (Synology, QNAP)

Synology DSM 7.2+ ships Container Manager (Docker under the hood). Running this app on a Synology NAS is identical to Option A — same Dockerfile, same compose file, just run through the NAS GUI or SSH. Excellent option if a Synology is already present and always-on.

### Vercel (keep current)

Eliminated by the v2.0 requirement: the app must call the local UniFi console at `https://192.168.x.x`. Vercel runs in Vercel's data centers, not on the LAN. The local UniFi console is not reachable from Vercel without a VPN or tunnel, which is why v2.0 moves off Vercel.

---

## Recommendation for v2.0

**Deploy via Docker (Option A) on whatever always-on device the household has or is willing to add.**

Priority order for hardware selection:

1. **Already have a Synology / QNAP NAS?** Use Container Manager (DSM 7.2+). Zero extra hardware cost, zero extra power consumption.
2. **Already have a home server / Proxmox box?** Add a Docker container alongside existing services.
3. **No existing always-on server?** A Raspberry Pi 4 4GB ($55 USD with SD card) is the recommended minimal setup. The app will run comfortably at idle on <150 MB RAM.

**Do not plan for Option B as the primary deployment target.** If the only device available is the Dream Machine Pro, raise that as a constraint before starting v2.0 so the deployment target can be reconsidered — not discovered mid-implementation.

---

## Confidence Assessment

| Area | Confidence | Source |
|------|------------|--------|
| Docker on Pi / NAS (Option A) | HIGH | Multiple 2025 community guides, official Next.js self-hosting docs |
| DMP hardware specs (CPU/RAM) | HIGH | Official Ubiquiti tech specs page |
| Podman removed in UniFi OS 3.x | HIGH | Multiple GitHub issues, confirmed in community searches |
| nspawn works on 4.x (with caveats) | MEDIUM | GitHub discussion with single confirmed report (UDM-Pro 4.0.6) |
| UNA format not publicly available | MEDIUM | No SDK or docs found; absence of evidence across multiple searches |
| Firmware upgrade breaks nspawn setup | MEDIUM | Confirmed in GitHub issue #581 for 3.x minor version upgrade; extrapolated to major upgrades |
| UniFi OS 5.x nspawn status | LOW | No community data found for 5.x specifically |

---

## Sources

- **Next.js Self-Hosting (Official)** — [nextjs.org/docs/app/guides/self-hosting](https://nextjs.org/docs/app/guides/self-hosting) — HIGH confidence
- **UniFi Dream Machine Pro Tech Specs** — [techspecs.ui.com/unifi/cloud-gateways/udm-pro](https://techspecs.ui.com/unifi/cloud-gateways/udm-pro) — HIGH confidence (official)
- **unifi-utilities/unifios-utilities** — [github.com/unifi-utilities/unifios-utilities](https://github.com/unifi-utilities/unifios-utilities) — HIGH confidence (primary community resource)
- **nspawn on UniFi OS 4.x discussion** — [github.com/orgs/unifi-utilities/discussions/604](https://github.com/orgs/unifi-utilities/discussions/604) — MEDIUM confidence (single community report)
- **Podman removed in UniFi OS 3.x** — [github.com/unifi-utilities/unifios-utilities/issues/560](https://github.com/unifi-utilities/unifios-utilities/issues/560) — HIGH confidence (confirmed in issue thread)
- **Firmware upgrade breaks nspawn install** — [github.com/unifi-utilities/unifios-utilities/issues/581](https://github.com/unifi-utilities/unifios-utilities/issues/581) — MEDIUM confidence
- **unifios-utilities DeepWiki** — [deepwiki.com/unifi-utilities/unifios-utilities](https://deepwiki.com/unifi-utilities/unifios-utilities) — MEDIUM confidence (community wiki)
- **Self-hosting Next.js on Raspberry Pi** — [medium.com/@thizaradeshan/self-hosting-full-stack-nextjs-nodejs-app-on-a-raspberry-pi-step-by-step](https://medium.com/@thizaradeshan/self-hosting-full-stack-nextjs-nodejs-app-on-a-raspberry-pi-step-by-step-540cb682ffd5) — MEDIUM confidence (community)
- **Docker on Synology NAS** — [volkanpaksoy.com/archive/2025/03/08/How-To-Run-Docker-Containers-On-Synology-NAS](https://www.volkanpaksoy.com/archive/2025/03/08/How-To-Run-Docker-Containers-On-Synology-NAS/) — MEDIUM confidence (community, March 2025)
- **PM2 vs Docker for Node.js** — [leapcell.io/blog/pm2-and-docker-choosing-the-right-process-manager](https://leapcell.io/blog/pm2-and-docker-choosing-the-right-process-manager-for-node-js-in-production) — MEDIUM confidence (community)

---

*Researched: 2026-04-24 | Scope: deployment target decision for v2.0 Local Edition*
