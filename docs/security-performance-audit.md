# Security and performance audit — 1 November 2026

## Scope and result

Reviewed the React client, Express middleware, every registered API route, MongoDB models and Finance calculations, secret handling, configuration, dependencies and production build. Tested hostile requests against an isolated local Express server using temporary Atlas databases. Reviewed the running Finance page at desktop and 390px mobile width. This is a code review and regression audit, not an independent penetration test of a public deployment. No application can be guaranteed impossible to compromise.

The Finance page no longer has a separate page heading. Transactions are the first content section; month and management controls use the shared navigation action area.

## Findings addressed

| Area | Change and reason |
| --- | --- |
| Browser request forgery | Unsafe API requests require JSON and a custom request header. Exact trusted origins and Fetch Metadata are checked; a supplied Host header cannot establish trust. Prevents form-based CSRF and hostile-origin requests. |
| Session lifetime and revocation | Explicit JWT algorithm, issuer, audience, role and session ID checks; seven-day idle expiry and a 30-day absolute lifetime. Renewal is hourly and cannot recreate a revoked session. Production uses a Secure, HttpOnly, SameSite cookie with a `__Host-` prefix. |
| Password guessing | Added durable MongoDB login counters: five failures per IP per 15 minutes and an owner-wide limit of 60. Blocked IP retries cannot continually increase the global counter. Keys hash IPs with a secret; TTL removes expired counters. Availability tradeoff: distributed guessing can temporarily lock out the owner. |
| Password hashing | Enforce bcrypt's 72-byte input limit instead of silently accepting equivalent truncated passwords. Configuration requires a valid bcrypt hash with cost 10–15; the configured hash uses cost 12. Hash generation uses hidden input or stdin, not password arguments in process lists/history. |
| Vault exposure | Account listing and mutation responses contain summaries only. Full fields are fetched only for the selected account, removed from React state on tab hiding, and never cached by the API. Existing reveal and clipboard expiry behavior is retained. |
| Vault ciphertext substitution | Versioned AES-256-GCM ciphertext authenticates its record ID as additional data. Invalid sizes, tampering, wrong keys and substitution are rejected. Existing three legacy records were migrated with round-trip verification and compare-and-set updates; the final dry run found zero legacy records. |
| Injection and invalid inputs | Strict schemas reject unknown fields, malformed money/dates, operator objects, unexpected empty-action bodies and oversized JSON. Existing Finance transaction serialization, overdraft guards and recurring-payment uniqueness are covered by regression tests. |
| Browser protections | Restricted script CSP, framing denial, no-referrer, disabled unused device permissions, no-store private API responses and production HSTS. Hashed built JS/CSS receive immutable caching; HTML is revalidated or not stored. |
| Secrets and transport | Development servers bind loopback. Vite limits its filesystem roots and denies server files, environment files and key files. Actual Vite requests for both server environment files returned 403 while client code returned 200. Production configuration rejects weak keys, non-HTTPS client origins and disabled database TLS/certificate validation. |
| Habit history integrity | Updating an existing entry preserves its original habit name and weight snapshots after later habit edits. |

## Performance

Route-level lazy loading reduced the entry JavaScript from 375.61 KB (114.26 KB gzip) to 277.86 KB (88.20 KB gzip): approximately 26% less initial JavaScript and 23% less compressed entry transfer. Individual screens load their additional chunks when needed; these figures are not total website bytes or a Lighthouse score.

Finance previously fetched the entire ledger into Node for calculations. MongoDB now groups balance and monthly spending values, projects only needed owed fields, and returns overview collections in one snapshot query. In the temporary database benchmark with 5,025 ledger records, the comparison ledger payload fell from 5,207,668 bytes to 280 bytes of grouped values. That comparison is database-to-Node ledger data, not the entire HTTP response. Consolidating overview reads reduced measured local API time from 908–944 ms to 285–295 ms, across three samples each. Network conditions and larger histories will change these numbers.

Transaction pagination gained matching indexes. The benchmark query returned 20 rows while examining 20 documents and 20 index keys. Habit settings now fetch only habits, avoiding the complete entry/sleep history. Session renewal avoids a database write and JWT signing on each ordinary authenticated read.

Raw measurements: [performance-results.json](performance-results.json).

## Validation

- `npm test`: 46 tests passed, zero failed.
- `npm run build`: production build passed.
- `npm run test:security`: passed; all 46 protected method/path pairs rejected requests without a session. HEAD access was also checked for GET routes. Only health and login are public. Inventory: [security-endpoints.json](security-endpoints.json).
- Security tests also passed forged/expired JWTs, wrong roles/algorithms, absolute expiry, CSRF/origin/Host spoofing, body limits, injection-shaped input, vault summary/detail behavior, encryption tampering and substitution, logout and renewal revocation, persistent login throttling and response protections.
- `npm run test:finance:integration -- --benchmark`: covered Finance CRUD, strict validation, concurrent overdraft protection, recurring uniqueness, orphan goal deletion, categories/history, budgets, owed balances, pagination and synthetic performance assertions.
- `npm audit --json`: zero known advisories across 262 installed dependency entries at audit time. This does not establish absence of undisclosed vulnerabilities.
- `npm run vault:migrate`: final read-only check found zero remaining legacy records.
- Desktop and mobile Finance layout checked in the browser. Tests used fake credentials and uniquely named temporary databases; their cleanup guards restrict deletion to those test databases.

## Remaining risks and deployment requirements

1. **Single-factor authentication remains.** Use a long, unique owner password. MFA/passkeys, recovery and step-up authentication require an enrollment/recovery design and are not implemented. A stolen valid browser session remains useful until expiry or logout. Rate limits mitigate guessing; they do not replace a second factor.
2. **The server can decrypt the vault.** This is server-side encryption, not a zero-knowledge vault. Compromise of the running server and its key can expose passwords. Financial fields currently rely on MongoDB storage encryption and transport TLS, not application-level/end-to-end encryption. Keep the vault key separate from database backups and restrict host access. Browser extensions, malware, clipboard managers and a compromised operating system are outside this application's protection.
3. **Cloud settings require verification by the owner.** Atlas network allowlists, database user roles, backup retention/restores, provider access/MFA, patching and public TLS termination were not inspectable here. Restrict Atlas to hosting outbound IPs/private networking, give the runtime user only the application database permissions it needs, enable tested encrypted backups, and protect the hosting and Atlas accounts with MFA.
4. **Production must use HTTPS and one trusted proxy.** Set `NODE_ENV=production`, the exact HTTPS `CLIENT_ORIGIN`, separate high-entropy secrets and a TLS database URI. Block direct public access to the origin server behind the proxy; the app currently trusts one proxy hop. Never expose the Vite development server publicly. Production's new cookie name requires an existing production browser to log in again. Verify Secure cookies, CSP and HSTS at the actual public URL after deployment.
5. **Scale and availability remain bounded by infrastructure.** Finance grouped balance calculation still scans ledger values, arbitrary note search is not full-text indexed, all habit history still feeds the tracking dashboard, and vault summaries still decrypt records on the server. At substantially larger scale, introduce measured history windows, materialized balances with reconciliation and bounded lists. No distributed load test or denial-of-service certification was performed. Global API limits remain process-local; durable login limits work across processes.
6. **Maintain the controls.** Re-run these tests and dependency checks after changes, review access logs without logging secrets, and periodically test backup recovery. Test production TLS/proxy behavior externally before entrusting the app with irreplaceable sensitive information.

## Primary references

- [OWASP CSRF prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html): origin checks and non-simple custom-header requests.
- [OWASP session management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html): cookie attributes, revocation and absolute expiry.
- [OWASP password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html): bcrypt limits and work factors.
- [OWASP MFA](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html): second-factor protections and recovery considerations.
- [Vite server options](https://vite.dev/config/server-options): filesystem restrictions and development server exposure.
- [MongoDB aggregation optimization](https://www.mongodb.com/docs/manual/core/aggregation-pipeline-optimization/): projections, grouping and indexed query planning.
- [Atlas encryption at rest](https://www.mongodb.com/docs/atlas/security-encryption-at-rest-overview/): storage encryption and its scope.
