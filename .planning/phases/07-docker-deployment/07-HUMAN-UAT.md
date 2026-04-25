# Phase 7: Docker Deployment — Human UAT

**Status:** Pending human execution
**Covers:** DEPLOY-02, DEPLOY-03, DEPLOY-04, DEPLOY-05

These steps require Docker installed on the deployment host. They cannot be automated from the development environment.

---

## Prerequisites

- [ ] Docker Desktop (or Docker Engine + Compose plugin) installed and running on the host machine
- [ ] `.env.prod` created and all variables filled in (see README Self-Hosted / Docker section)
- [ ] Repository cloned on the host machine
- [ ] Plans 07-01 and 07-02 have been executed (next.config.ts, Dockerfile, docker-compose.yml, .env.prod.example all present)

---

## UAT-01: Docker image builds and starts (DEPLOY-02)

```bash
docker compose up -d --build
docker compose ps
```

- [ ] Build completes without errors
- [ ] `docker compose ps` shows the `app` service with status `Up` (not `Exiting` or `Restarting`)
- [ ] `docker compose logs app` shows Next.js startup output (e.g., `▲ Next.js ... ready`)
- [ ] Opening `http://localhost:3000` in a browser on the host machine shows the login page

---

## UAT-02: App is reachable from another LAN device (DEPLOY-02)

On a different device on the same network (phone, tablet, other computer):

- [ ] Open `http://<host-machine-ip>:3000` in a browser
- [ ] Login page loads
- [ ] Logging in with the credentials from `.env.prod` succeeds
- [ ] Dashboard shows real device data from the UniFi console

> If this step fails but UAT-01 passes, `ENV HOSTNAME="0.0.0.0"` may be missing from the Dockerfile runner stage — verify with `grep HOSTNAME Dockerfile`.

---

## UAT-03: Container recovers after restart (DEPLOY-03)

```bash
docker compose stop
docker compose start
docker compose ps
```

- [ ] Container restarts cleanly
- [ ] App is reachable at `http://localhost:3000` after restart

Simulate host reboot (optional but recommended):
- [ ] Reboot the host machine
- [ ] After boot, `docker compose ps` shows `app` as `Up` without any manual intervention

---

## UAT-04: No secrets in the Docker image (DEPLOY-04)

```bash
docker compose build
docker history $(docker compose images -q app) | head -30
```

- [ ] Output does NOT contain `UNIFI_HOST`, `UNIFI_API_KEY`, or `SESSION_SECRET`
- [ ] Confirm `.env.prod` values are NOT baked into the image — only `NODE_ENV`, `PORT`, `HOSTNAME` appear as ENV directives

---

## UAT-05: Healthcheck passes (DEPLOY-02, DEPLOY-03)

Wait 30 seconds after container start, then:

```bash
docker inspect $(docker compose ps -q app) --format '{{.State.Health.Status}}'
```

- [ ] Output is `healthy` (not `unhealthy` or `starting`)

Manual endpoint check:
```bash
curl http://localhost:3000/api/health
```

- [ ] Response is `{"ok":true}` with HTTP 200

---

## UAT-06: README instructions are followable end-to-end (DEPLOY-05)

Ask a household member (or simulate fresh context) to follow only the README "Self-Hosted / Docker" section:

- [ ] They can reach a running login page without any help beyond the README
- [ ] All 8 env variables in the README table have clear enough explanations to fill in without asking
- [ ] The bcrypt hash and SESSION_SECRET generation commands work on their machine

---

## Sign-off

| Item | Status | Notes |
|------|--------|-------|
| UAT-01: image builds, container starts | | |
| UAT-02: reachable from LAN device | | |
| UAT-03: container recovers after restart | | |
| UAT-04: no secrets in image | | |
| UAT-05: healthcheck passes | | |
| UAT-06: README followable | | |

**Phase 7 complete when:** All items above are checked and the sign-off table has no open items.
