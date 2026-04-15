# Pitfalls Research

**Domain:** Unifi Network Dashboard (API Integration)
**Researched:** 2026-04-14
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Site Manager Proxy vs Local API Confusion

**What goes wrong:**
Developers use the wrong API type and discover limitations too late. Site Manager Proxy has ~800ms latency overhead, stricter rate limits, and some write operations are blocked. Cloud APIs (EA/V1) are mostly read-only for firewall operations.

**Why it happens:**
Three different API access methods exist (Local Gateway, Cloud EA, Cloud V1, Site Manager Proxy) with different capabilities. Documentation often conflates them or doesn't clearly distinguish limitations.

**How to avoid:**
- Site Manager Proxy: Required for CGNAT/dynamic IP scenarios, but expect latency
- Local Gateway API: Full CRUD capabilities, no rate limits, best performance
- Cloud V1 API: 10,000 req/min limit, read-only for most operations
- Cloud EA API: 100 req/min limit, severely limited write operations

**Warning signs:**
- HTTP 403 on write operations (using wrong API type)
- HTTP 408 "console offline" errors (firmware < 5.0.3)
- Unexpected latency in monitoring dashboards

**Phase to address:**
Phase 1 (API Foundation) - Document which API type is being used and its constraints before any implementation.

---

### Pitfall 2: Zone-Based Firewall (ZBF) Breaks Legacy Endpoints

**What goes wrong:**
The traditional `/api/s/{site}/rest/firewallrule` endpoint returns empty results on UniFi Network 9.0+ when Zone-Based Firewall is enabled. Firewall rule toggle operations fail silently or return 404.

**Why it happens:**
UniFi Network 9.0 introduced Zone-Based Firewall as a new architecture. The legacy firewall rule endpoints don't work with ZBF-enabled sites. This is a breaking change that affects many existing integrations.

**How to avoid:**
1. Check if ZBF is enabled: `GET /proxy/network/v2/api/site/{site}/site-feature-migration`
2. If ZBF enabled, use new endpoints:
   - Firewall Policies: `/proxy/network/v2/api/site/{site}/firewall-policies`
   - Firewall Zones: `/proxy/network/v2/api/site/{site}/firewall/zone`
   - Zone Matrix: `/proxy/network/v2/api/site/{site}/firewall/zone-matrix`
3. If ZBF disabled, legacy endpoints still work

**Warning signs:**
- Empty results from `list_firewallrules()` on new installations
- HTTP 404 on firewall rule operations
- Home Assistant UniFi integration breaking after upgrade

**Phase to address:**
Phase 1 (API Foundation) - Detect ZBF mode on initial connection and route to appropriate endpoints.

---

### Pitfall 3: Authentication Throttling Lockout

**What goes wrong:**
Applications get locked out with `AUTHENTICATION_FAILED_LIMIT_REACHED` (HTTP 429) after repeated login attempts. This is new behavior in UniFi OS 3.1.9+ that many existing integrations don't handle.

**Why it happens:**
UniFi OS introduced aggressive rate limiting on the `/api/auth/login` endpoint. Applications that create new sessions for each request or don't persist cookies get throttled.

**How to avoid:**
1. Use Site Manager API key authentication (no login throttling)
2. For local admin auth, persist session cookies across requests
3. Implement re-authentication logic with exponential backoff
4. Never login for every API call - reuse sessions
5. Create dedicated local admin accounts for API access (not cloud accounts)

**Warning signs:**
- Intermittent 429 errors after application restarts
- Authentication failures during development/testing
- Lockouts lasting hours

**Phase to address:**
Phase 1 (API Foundation) - Implement session persistence and proper error handling for authentication failures.

---

### Pitfall 4: Traffic Rate vs Cumulative Bytes Confusion

**What goes wrong:**
Applications display incorrect bandwidth statistics, showing cumulative totals instead of current rates, or vice versa. Values are off by orders of magnitude.

**Why it happens:**
Unifi API returns two types of byte fields:
- `rx_bytes` / `tx_bytes` = Cumulative total since device/client started (counter)
- `rx_bytes-r` / `tx_bytes-r` = Live rate in bytes/second (gauge)

The `-r` suffix means "realtime rate" but is often misinterpreted.

**How to avoid:**
1. For real-time bandwidth: Use `rx_bytes-r` and `tx_bytes-r` directly
2. For usage over time: Calculate delta between cumulative readings at intervals
3. Convert bytes to Mbps: `(bytes_per_sec * 8) / 1024 / 1024`
4. For 5-minute averages: Poll cumulative counters, compute deltas

**Warning signs:**
- Bandwidth values in TB instead of Mbps
- Values increasing monotonically instead of fluctuating
- Mismatch between API values and Unifi UI

**Phase to address:**
Phase 2 (Traffic Monitoring) - Define clear data field mapping and unit conversions.

---

### Pitfall 5: Missing CSRF Token on Write Operations

**What goes wrong:**
PUT/POST operations to toggle firewall rules return HTTP 404 or 403 errors even with valid authentication.

**Why it happens:**
UniFi OS requires a CSRF token header (`x-csrf-token`) for all write operations. The token is returned in the response headers during login and must be included in subsequent write requests.

**How to avoid:**
1. Capture CSRF token from login response headers: `grep x-csrf-token`
2. Include token in all PUT/POST/DELETE requests
3. For Site Manager API key auth, CSRF token is not required (stateless)

```bash
# Example: Capture and use CSRF token
csrftoken="$(curl -s -k -X POST --data '{"username":"user","password":"pass"}' \
  --header 'Content-Type: application/json' -c cookie.txt \
  "https://${ADDRESS}/api/auth/login" -o /dev/null -D - | grep x-csrf-token)"

# Use in write request
curl -X PUT -H "${csrftoken}" -b cookie.txt \
  --data '{"enabled": false}' \
  "https://${ADDRESS}/proxy/network/api/s/default/rest/firewallrule/${RULEID}"
```

**Warning signs:**
- HTTP 404 on valid endpoints with valid authentication
- Read operations work but writes fail
- Works in some clients but not others (different CSRF handling)

**Phase to address:**
Phase 1 (API Foundation) - Implement CSRF token handling for write operations.

---

### Pitfall 6: Cloud API Dependency on UI.com Availability

**What goes wrong:**
Dashboard becomes completely unavailable when `unifi.ui.com` or `api.ui.com` experiences downtime. No local fallback is available.

**Why it happens:**
Site Manager Proxy routes all requests through Ubiquiti's cloud infrastructure. When that infrastructure is down, the console is unreachable via API even if the local network is fine.

**How to avoid:**
1. Implement graceful degradation in the dashboard UI
2. Cache last-known-good data locally
3. Show clear "Cloud Service Unavailable" message instead of generic errors
4. Consider hybrid architecture: prefer local API when available, fall back to proxy
5. Monitor both API response times and cloud service status

**Warning signs:**
- Sporadic 503 errors
- Latency spikes > 2 seconds
- Complete outages during Ubiquiti maintenance windows

**Phase to address:**
Phase 1 (API Foundation) - Design error handling for cloud dependency failures.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip CSRF token handling | Faster initial development | Write operations fail in production | Never - required for firewall toggling |
| Use cloud account credentials | No setup required | Authentication throttling lockouts | Never - use local admin or API keys |
| Poll every second | Real-time-ish data | Rate limit exhaustion (Cloud EA: 100/min) | Never - use 30-60 second intervals minimum |
| Hard-code site name "default" | Simpler code | Breaks on multi-site setups | MVP only if single-site guaranteed |
| Store API key in code | Quick setup | Security breach on commit | Never - use environment variables |
| Assume ZBF disabled | Simpler firewall API | Breaks on newer installations | Never - detect ZBF mode |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Site Manager Proxy | Using local API key instead of Site Manager API key | Generate separate Site Manager API key from unifi.ui.com |
| Site Manager Proxy | Calling login() for every request | Stateless auth - just include X-API-KEY header |
| Local Admin Auth | Creating new session per request | Persist cookies, re-use session |
| Firewall Rules | Using legacy endpoints on ZBF-enabled sites | Check ZBF status, use v2 endpoints when enabled |
| Client Groups | Confusing User Groups (rate limits) with Client Groups (firewall objects) | Use `/v2/api/site/{site}/network-members-groups` for client groups |
| Traffic Stats | Using cumulative bytes as current rate | Use `-r` suffix fields for rates, delta cumulative for usage |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Rapid polling without backoff | HTTP 429 errors, lockouts | Implement exponential backoff, use 30+ second intervals | Cloud EA: >100 req/min; Cloud V1: >10,000 req/min |
| Missing session persistence | Authentication lockouts, slow performance | Reuse session objects, store cookies | Multiple concurrent connections |
| No caching layer | Unnecessary API calls, stale data | Cache device/client lists with TTL | Repeated dashboard refreshes |
| Processing all clients sequentially | Slow page loads, timeouts | Batch requests, parallel processing where possible | Networks with 50+ clients |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Using cloud admin account for API | Account lockout affects all access; MFA complications | Create dedicated local admin account for API |
| Storing API key in environment files committed to git | Credential exposure in version history | Use `.env` in `.gitignore`, secrets management service |
| Skipping SSL verification in production | Man-in-the-middle attacks | Install controller certificate or use valid cert |
| Overly permissive API account | Unintended configuration changes | Use read-only accounts for monitoring-only apps |
| Logging API responses with sensitive data | Credential/PII exposure in logs | Sanitize logs, redact sensitive fields |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Generic "API Error" messages | Users can't troubleshoot or report issues | Specific error: "Cloud service unavailable" vs "Authentication failed" |
| No offline indication | Users think app is broken when cloud is down | Clear status: "Unifi Cloud Service Unavailable - Try Again" |
| Infinite loading on API timeout | Users stuck, no feedback | Show progress with timeout: "Loading..." (max 30s) |
| Bandwidth units confusion (Mbps vs MB/s) | Users misinterpret network performance | Standardize on Mbps with clear labels |
| Traffic status without timestamp | Users don't know if data is current | Show "Last updated: X seconds ago" |

## "Looks Done But Isn't" Checklist

- [ ] **Authentication:** Works with both local admin and API key methods - test both
- [ ] **Firewall Toggle:** Toggles actually persist (check in Unifi UI, not just API response)
- [ ] **Traffic Data:** Values match Unifi Network UI (not off by 8x or 1000x)
- [ ] **ZBF Detection:** Legacy endpoints gracefully handle ZBF-enabled sites
- [ ] **Error Recovery:** Dashboard shows meaningful error, doesn't crash, has retry option
- [ ] **Session Persistence:** Doesn't re-authenticate every request (check logs)
- [ ] **Rate Limit Handling:** Respects `Retry-After` header on 429 errors
- [ ] **CSRF Token:** Included in all write operations for local API auth
- [ ] **Group Assignment:** Clients assigned to groups persist after app restart
- [ ] **Cloud Outage:** Dashboard handles `api.ui.com` unavailability gracefully

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Authentication Lockout | LOW | Wait 15-30 minutes, implement session persistence |
| ZBF Legacy Endpoint Failure | MEDIUM | Add ZBF detection, implement v2 endpoint fallback |
| CSRF Token Missing | LOW | Add token capture logic to all write operations |
| Rate Limit Exhausted | LOW | Implement backoff, wait for limit reset (1 minute) |
| Wrong API Key Type | LOW | Generate correct key type from appropriate UI |
| Cloud Service Down | N/A (external) | Implement cached fallback data, show offline status |
| Data Unit Confusion | MEDIUM | Refactor data layer with proper conversions, add tests |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| API Type Confusion | Phase 1 | Document chosen API type and its constraints |
| ZBF Breaking Changes | Phase 1 | Unit test with ZBF enabled/disabled modes |
| Auth Throttling | Phase 1 | Test rapid reconnects don't trigger lockout |
| CSRF Token Missing | Phase 1 | Verify write operations work after login |
| Traffic Data Confusion | Phase 2 | Compare API values to Unifi UI, add unit tests |
| Cloud Dependency | Phase 1 | Test with simulated cloud outage, verify graceful degradation |
| Rate Limiting | Phase 1 | Load test with realistic polling intervals |
| Session Persistence | Phase 1 | Verify single auth per session via logs |
| Error Handling | Phase 2 | Unit test all error codes, verify user messages |

## Sources

- [Art-of-WiFi UniFi-API-client Issues](https://github.com/Art-of-WiFi/UniFi-API-client/issues) - Authentication failures, rate limiting, ZBF issues
- [UniFi API Authentication Methods](https://artofwifi.net/blog/unifi-api-authentication-local-admin-vs-api-key-vs-site-manager) - Authentication comparison and pitfalls
- [API Limitations and Workarounds](https://deepwiki.com/enuno/unifi-mcp-server/4.5-api-limitations-and-workarounds) - Missing endpoints, ZBF matrix issues
- [UniFi Network 9.0 Release Notes](https://blog.ui.com/article/unifi-network-9-0-built-to-scale) - Zone-Based Firewall changes
- [Traffic Stats Discussion](https://github.com/Art-of-WiFi/UniFi-API-client/issues/249) - Data usage endpoint confusion
- [Rate Limiting Discussion](https://github.com/Art-of-WiFi/UniFi-API-client/issues/194) - Rate limits by API type
- [Firewall Rule Toggle Discussion](https://github.com/Art-of-WiFi/UniFi-API-client/discussions/175) - CSRF token requirements
- [Client Groups vs User Groups](https://github.com/Art-of-WiFi/UniFi-API-client/issues/278) - Group management confusion
- [UniFi Best Practices](https://github.com/uchkunrakhimow/unifi-best-practices) - General best practices

---
*Pitfalls research for: Unifi Network Dashboard API Integration*
*Researched: 2026-04-14*