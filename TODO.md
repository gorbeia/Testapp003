# TODO — TicketBAI Gateway

Generated from compliance audit against the mandatory checklist.
Ordered by legal and operational risk.

---

## 🔴 Critical (blocks production use)

### 1. Wire authentication into API routes
**File:** `apps/api/src/index.ts`
- `validateApiKey()` exists in `auth.ts` but is never called
- Every route must validate the `Authorization` header and `X-Tenant-Id`
- Unauthenticated requests must return 401
- Tenant from the API key must be used for all DB queries — never trust `req.body.tenantId`

### 2. Add invoice series support
**Files:** `packages/core/src/types.ts`, `packages/core/src/hash.ts`, `packages/core/src/validation.ts`, `db/migrations/001_init.sql`
- Add `series` field to `Invoice` type (e.g. `"A"`, `"R"` for rectificativas)
- Hash chain must be maintained **per series per tenant** — not globally
- `getLast()` in storage must filter by `(tenantId, series)`, not just `tenantId`
- Add `series` column to `invoices` table
- Update unique constraint to `(tenant_id, series, number)`
- Update `validateInvoice()` to require series

### 3. Complete Gipuzkoa XML builder
**File:** `packages/xml-builders/src/gipuzkoa.ts`
- Current builder is a stub — produces invalid XML
- Must add: VAT breakdown (grouped by rate), `Encadenamiento` (hash chain), `SistemaInformatico` block, correct namespace and schema version per official Gipuzkoa XSD
- Must be deterministic

### 4. Complete Álava XML builder
**File:** `packages/xml-builders/src/alava.ts`
- Same issue as Gipuzkoa
- Must add: VAT breakdown, `Encadenamiento`, `SistemaInformatico`, correct namespace per official Álava XSD
- Must be deterministic

---

## 🟠 High (required for compliance)

### 5. Add per-line invoice validation
**File:** `packages/core/src/validation.ts`
- `validateInvoice()` checks that lines exist but not individual line fields
- Each line must be validated for: non-empty `description`, positive `quantity`, positive `unitPrice`, non-negative `total`, valid `vatRate` (0, 4, 10, or 21)
- Add corresponding unit tests in `packages/core/src/__tests__/validation.test.ts`

### 6. Add input validation middleware to API
**File:** `apps/api/src/index.ts`
- `POST /invoice` currently passes `req.body` directly to domain logic
- Add schema validation (e.g. zod) before processing
- Reject malformed payloads with 400 before they reach the core
- Sanitize all string inputs to prevent injection

### 7. Provide XSD schemas (or document fetch procedure)
**Directory:** `packages/xsd-validator/schemas/`
- `XsdValidator` is functional but schemas are missing — validation always fails
- Download official XSD files from:
  - Bizkaia: https://www.batuz.eus/fitxategiak/batuz/ticketbai/sinadura_elektronikoaren_zehaztapenak
  - Gipuzkoa: https://www.gipuzkoa.eus/ticketbai
  - Álava: https://www.araba.eus/ticketbai
- Place at `packages/xsd-validator/schemas/{bizkaia,gipuzkoa,alava}/ticketbai.xsd`
- Add a `scripts/fetch-schemas.sh` to automate download in CI

### 8. Add sandbox rejection and timeout simulation
**File:** `apps/worker/src/submit.ts`
- `simulateHaciendaResponse()` always returns accepted
- Add `TBAI_SANDBOX_MODE` env var with values: `accepted` | `rejected` | `timeout`
- Rejection should return a valid rejected XML response with `<Error>` elements
- Timeout should throw after a configurable delay

---

## 🟡 Medium (operational requirements)

### 9. Add structured logging
**Files:** `apps/api/src/index.ts`, `apps/worker/src/worker.ts`, `apps/dashboard/src/index.ts`
- Replace `console.log` with a structured logger (pino recommended — fast, JSON output)
- Log fields: `tenantId`, `invoiceId`, `jobId`, `status`, `duration`, `error`
- Log every: invoice received, sign attempt, submission attempt, retry, DLQ entry, status change
- Add `LOG_LEVEL` env var

### 10. Add DLQ manual retry endpoint
**Files:** `apps/dashboard/src/index.ts`, `apps/worker/src/dlq.ts`
- Dead-lettered jobs have no recovery path in current code
- Add `POST /dlq/:id/retry` to dashboard API that moves a DLQ entry back to `tbai_jobs` with `status='pending'` and resets `attempt_count`
- Add `DELETE /dlq/:id` to discard a permanently invalid entry

### 11. Synchronise OpenAPI spec with implementation
**File:** `openapi.yaml`
- Add `GET /health` endpoint
- Add `GET /invoices/{id}` response schema (currently empty)
- Add `POST /dlq/{id}/retry`
- Add error response schemas (400, 401, 500) to all endpoints
- Add request/response examples

### 12. Province-specific submission endpoints
**Files:** `apps/worker/src/submit.ts`, `apps/worker/src/worker.ts`
- `submitToHacienda()` accepts a generic `endpoint` string but there is no routing logic
- Add a `getEndpoint(province, environment)` helper that returns the correct URL per province and env
- Store `province` on the `tbai_jobs` table
- Worker must read province from the job and resolve the endpoint automatically

---

## 🟢 Low (hardening and polish)

### 13. Add rate limiting to API
**File:** `apps/api/src/index.ts`
- Add per-API-key rate limiting (e.g. `express-rate-limit`)
- Default: 100 requests/minute per key
- Return 429 with `Retry-After` header when exceeded

### 14. Add HTTPS enforcement
**File:** `apps/api/src/index.ts`
- Add middleware that redirects HTTP → HTTPS in production
- Or enforce via Nginx config (document in deployment guide)

### 15. Add CORS policy
**File:** `apps/api/src/index.ts`
- Define allowed origins (restrict to known client domains in production)
- Use `cors` middleware with explicit `origin` whitelist

### 16. Add explicit DB transaction wrapping for invoice creation
**File:** `apps/api/src/index.ts`, `packages/storage-postgres/src/storage.ts`
- Invoice creation, job enqueue, and audit log write should be in a single `BEGIN...COMMIT` block
- A crash between steps currently leaves orphaned records

### 17. Add certificate expiry alerting
**File:** `apps/dashboard/src/index.ts`, `packages/crypto/src/cert-manager.ts`
- `certificate_health_view` already exposes `next_expiry`
- Add a scheduled check (cron or worker) that alerts (Slack/email) when any certificate expires within 30 days
- Add `GET /certificates/expiring` endpoint to dashboard

### 18. Test coverage gaps
**Missing tests:**
- Per-line validation (once implemented — item 5)
- Series-scoped hash chain (once implemented — item 2)
- Gipuzkoa and Álava XML completeness after builders are fixed (items 3, 4)
- Auth middleware (wired in item 1)
- DLQ retry endpoint (item 10)
- End-to-end: `Invoice JSON → validate → XML → sign → submit → audit`
- Province endpoint routing (item 12)

---

## 📋 Summary

| Priority | Count | Items |
|---|---|---|
| 🔴 Critical | 4 | Auth wiring, series support, Gipuzkoa XML, Álava XML |
| 🟠 High | 4 | Per-line validation, input validation, XSD schemas, sandbox scenarios |
| 🟡 Medium | 4 | Structured logging, DLQ retry, OpenAPI sync, province endpoints |
| 🟢 Low | 5 | Rate limiting, HTTPS, CORS, transactions, cert alerting |
| 🧪 Tests | 1 | Coverage for all above once implemented |

**Total: 18 items**
