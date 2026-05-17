---
status: complete
---
Added -H 0.0.0.0 to next dev and next start in package.json. Next.js binds to localhost by default; this makes the app reachable from any machine on the LAN. Docker was already correct (ENV HOSTNAME="0.0.0.0"). No cookie/auth changes needed.
