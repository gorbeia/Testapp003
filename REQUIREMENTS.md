# TicketBAI Gateway — Requirements Document

## 1. Project Overview

A self-hosted **TicketBAI compliance gateway** that simplifies integration with the Basque Country fiscal system for small companies and third-party applications. It must be simple, cheap to operate, and maintainable on a single Ubuntu VPS with PostgreSQL.

The system is structured as a **pnpm monorepo** with clean separation between:
- **Core library** — pure domain logic, no I/O, no crypto, fully testable
- **Infrastructure packages** — signing, storage, submission, all independently replaceable

---

## 2. Regulatory Context

TicketBAI is a mandatory fiscal system in the Basque Country (Spain). Every invoice issued must be:

1. Generated in a province-specific XML format (TBAI schema v1.2)
2. Digitally signed with a recognised certificate (XAdES-BES, enveloped)
3. Submitted in real time to the correct provincial tax authority (Hacienda)
4. Printed/attached to the invoice with a TBAI code and QR
5. Part of a traceable, tamper-evident chain of invoices

### Provinces and endpoints

| Province | Authority | Endpoint type |
|---|---|---|
| Bizkaia | Bizkaiko Foru Aldundia | SOAP / REST |
| Gipuzkoa | Gipuzkoako Foru Aldundia | REST |
| Álava (Araba) | Arabako Foru Aldundia | REST |

Each province has its own XSD schema, namespace, and submission endpoint. All three must be supported.

---

## 3. Software Garante Requirements

The gateway operator must register as a **software garante** (guarantor software developer) with each Diputación Foral. Required documentation includes:

- Developer NIF (fiscal identifier)
- Software product name and version
- Declaration of compliance with TicketBAI technical specification
- Test certificate used during validation
- Test submissions accepted by each province's sandbox environment

The `SistemaInformatico` block (developer NIF, software name, version) is **mandatory** in every XML document.

---

## 4. Functional Requirements

### 4.1 Invoice Generation

| ID | Requirement |
|---|---|
| FR-01 | Generate province-specific TicketBAI XML (Bizkaia, Gipuzkoa, Álava) |
| FR-02 | XML must be deterministic (no random whitespace, fixed field ordering) |
| FR-03 | XML must include `SistemaInformatico` block with developer NIF, software name, version |
| FR-04 | Support standard invoices (`STANDARD`) |
| FR-05 | Support corrective invoices (`CORRECTIVE`) — these are new legal documents, never updates to the original |
| FR-06 | Corrective invoices must reference the original invoice number, correction type, and adjusted amounts |
| FR-07 | Each invoice must include a full VAT breakdown grouped by rate (required by Bizkaia `TipoDesglose`) |
| FR-08 | VAT totals must be validated to match invoice line totals before signing |

### 4.2 Hash Chain (Encadenamiento)

| ID | Requirement |
|---|---|
| FR-09 | Every invoice must carry a `Huella` (SHA-256 hash) that includes: issuer NIF, invoice number, issue date, total amount, VAT amount, previous invoice hash |
| FR-10 | Each invoice's hash must reference the previous invoice's hash (forming a tamper-evident chain) |
| FR-11 | The first invoice in a chain has no previous hash |
| FR-12 | The chain must be reconstructible from storage for audit purposes |
| FR-13 | Chain breaks (missing links, hash mismatches, orphan nodes) must be detectable and reported |

### 4.3 Digital Signature (XAdES-BES)

| ID | Requirement |
|---|---|
| FR-14 | Sign XML using XAdES-BES enveloped signature (ETSI TS 101 903) |
| FR-15 | Signature algorithm: `RSASSA-PKCS1-v1_5` with `SHA-256` digest |
| FR-16 | The signed XML root element must have an `Id` attribute |
| FR-17 | The `ds:Signature` element must include a `ds:Reference` to the root document |
| FR-18 | The `ds:Signature` element must include a `ds:Reference` to `xades:SignedProperties` (Type = `http://uri.etsi.org/01903#SignedProperties`) — this is the most commonly missed requirement |
| FR-19 | `xades:SignedProperties` must include `xades:SigningTime` and `xades:SigningCertificate` with SHA-256 certificate digest |
| FR-20 | Certificates are stored as PKCS#12 (`.p12`) files with password |
| FR-21 | Signed XML must be verifiable (verify step must exist and be tested) |
| FR-22 | Certificate manager must support: store, retrieve active, rotate (expire old, activate new) |
| FR-23 | Each signing operation must be recorded in an audit session (xml hash, signed xml hash, certificate ID, signer version) |

### 4.4 QR Code

| ID | Requirement |
|---|---|
| FR-24 | Generate a TicketBAI QR payload in the format: `NIF\|invoiceNumber\|date\|totalAmount\|vatAmount\|hash\|signatureId` |
| FR-25 | QR URL base: `https://tbai-test.eus/qr` (sandbox) / `https://tbai.eus/qr` (production) |
| FR-26 | Payload must be URL-encoded and appended as `?data=` query parameter |
| FR-27 | QR image must be generated as a base64 PNG (data URL) suitable for embedding in PDF invoices |

### 4.5 XSD Validation

| ID | Requirement |
|---|---|
| FR-28 | Every generated XML must be validated against the official provincial XSD schema before signing |
| FR-29 | Validation errors must be surfaced with clear error messages |
| FR-30 | XSD schemas must be sourced from each province's official Hacienda portal |

### 4.6 Hacienda Submission

| ID | Requirement |
|---|---|
| FR-31 | Submit signed XML to the correct provincial endpoint using mutual TLS (client certificate) |
| FR-32 | In sandbox mode (`TBAI_ENV=sandbox`), simulate submission without hitting the real endpoint |
| FR-33 | Parse Hacienda response: extract `<Resultado>`, `<IdTicketBai>`, and `<Error>` fields |
| FR-34 | Store the returned `ticketId` against the invoice record |
| FR-35 | Submission must be idempotent: duplicate submissions for the same invoice must be detected via `request_hash` (SHA-256 of invoiceId + xml + cert fingerprint + endpoint) |

### 4.7 Retry and Dead-Letter Queue

| ID | Requirement |
|---|---|
| FR-36 | Failed submissions must be retried with exponential backoff (base 1 s, up to 3 retries per attempt cycle) |
| FR-37 | After 5 total attempt cycles, the job must be moved to the Dead-Letter Queue (DLQ) |
| FR-38 | DLQ entries must record: invoice ID, tenant ID, reason, error code, error detail, XML, attempt count |
| FR-39 | DLQ events must optionally notify via Slack webhook |
| FR-40 | A reconciliation worker must detect jobs stuck in `processing` or `sent` state for > 5 minutes and re-verify with Hacienda |

### 4.8 Multi-Tenancy and Application Registration

| ID | Requirement |
|---|---|
| FR-41 | The gateway must support multiple tenants (companies), each with their own NIF, certificates, and invoice chains |
| FR-42 | External applications must authenticate via API key (hashed SHA-256 in database) |
| FR-43 | Each application must be scoped to a tenant |
| FR-44 | API keys must be revocable |

### 4.9 Audit and Compliance Storage

| ID | Requirement |
|---|---|
| FR-45 | The `invoices` table must be **append-only** — `UPDATE` and `DELETE` must be blocked at the database level via trigger |
| FR-46 | Every invoice event (created, signed, submitted, accepted, rejected) must be logged to `audit_events` |
| FR-47 | Raw XML (pre-signature) and signed XML must be stored and their SHA-256 hashes recorded separately in `audit_xml_store` |
| FR-48 | A separate `audit_chain` table must maintain a linked hash chain across all audited entities for tamper detection |
| FR-49 | The chain must be reconstructible and auditable by external auditors |

### 4.10 Dashboard and Observability

| ID | Requirement |
|---|---|
| FR-50 | A read-only dashboard API must expose: invoice submission status, DLQ contents, certificate health |
| FR-51 | A `system_health_view` must report counts of failed, processing, pending jobs and DLQ items |
| FR-52 | A `certificate_health_view` must show active/expired certs and next expiry date per tenant |

### 4.11 Client SDK

| ID | Requirement |
|---|---|
| FR-53 | A TypeScript client SDK must be provided for external applications |
| FR-54 | SDK must expose `submitInvoice(invoice)` and `getInvoice(id)` |
| FR-55 | SDK must include an `InvoiceBuilder` fluent API for constructing invoices |

---

## 5. Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-01 | **Immutability**: Invoice records must never be modified or deleted; enforced at DB level |
| NFR-02 | **Determinism**: XML output must be byte-for-byte identical for the same input (no random whitespace, consistent field ordering) |
| NFR-03 | **Auditability**: Every action traceable from invoice creation to Hacienda acceptance |
| NFR-04 | **Idempotency**: Re-submitting the same invoice must not create duplicate records or submissions |
| NFR-05 | **Recoverability**: The hash chain must be reconstructible from the database without external state |
| NFR-06 | **Correctness**: VAT calculations must match invoice line totals exactly (rounding to 2 decimal places) |
| NFR-07 | **Security**: Certificates stored securely; API keys stored as SHA-256 hashes only; never logged in plaintext |
| NFR-08 | **Compliance**: Must pass XSD validation for all three provinces before any submission |
| NFR-09 | **Portability**: Core library has zero I/O dependencies (no DB, no crypto runtime) — fully unit-testable |
| NFR-10 | **Operability**: Must run on a single Ubuntu VPS with PostgreSQL; no container orchestration required |

---

## 6. Architecture

### 6.1 Package Structure (pnpm Monorepo)

```
ticketbai-gateway/
├── apps/
│   ├── api/              # Express HTTP API — invoice ingestion (port 3000)
│   ├── dashboard/        # Read-only compliance dashboard API (port 3001)
│   └── worker/           # Background job worker — submission, retry, DLQ
├── packages/
│   ├── core/             # Pure domain: types, hash chain, VAT, QR, retry util
│   ├── xml-builders/     # Province XML generators (Bizkaia, Gipuzkoa, Álava)
│   ├── signer/           # XAdES-BES signing + verification
│   ├── crypto/           # Certificate manager (store, retrieve, rotate)
│   ├── audit/            # Chain reconstruction, event logger, XML snapshots
│   ├── xsd-validator/    # Per-province XSD validation via xmllint
│   ├── storage-postgres/ # PostgreSQL implementation of Storage interface
│   └── sdk/              # TypeScript client SDK
├── db/
│   └── migrations/       # SQL migration files (001–005)
├── .github/workflows/    # CI pipeline
├── openapi.yaml
├── ecosystem.config.js   # PM2 process manager config
└── .env.example
```

### 6.2 Invoice Processing Pipeline

```
Invoice Input
  → Validate (required fields, NIF, lines)
  → VAT Breakdown (group by rate, compute base + tax, validate totals)
  → Hash Chain (SHA-256: issuerNif|number|date|total|vat|previousHash)
  → XML Build (province-specific, deterministic)
  → XSD Validate (against official provincial schema)
  → XAdES-BES Sign (enveloped, with SignedProperties reference)
  → Verify Signature
  → Store Record (append-only)
  → Enqueue Job
  → Worker: Submit to Hacienda
  → Parse Response
  → Update Job Status
  → Audit Log
```

### 6.3 Job State Machine

```
pending → processing → sent → accepted
                    ↘ failed → retry (up to 5 attempts)
                                 ↘ dead_letter (DLQ)
                    ↘ unknown → reconciliation worker → re-verify
```

---

## 7. Database Schema

### Core tables

| Table | Purpose |
|---|---|
| `tenants` | Company registrations (NIF, name) |
| `certificates` | PKCS#12 certificates per tenant (active/expired/revoked) |
| `applications` | API key registrations per tenant |
| `invoices` | Append-only invoice records (XML, signed XML, hash chain) |

### Submission tables

| Table | Purpose |
|---|---|
| `tbai_jobs` | Submission job queue (status, attempt count, ticket ID) |
| `tbai_submission_log` | Per-invoice submission log |
| `audit_submissions` | Full request/response log per submission attempt |
| `tbai_dead_letter_queue` | Failed jobs after max retries |

### Audit tables

| Table | Purpose |
|---|---|
| `audit_events` | All invoice lifecycle events |
| `audit_xml_store` | Raw and signed XML with SHA-256 hashes |
| `audit_chain` | Linked hash chain across all audited entities |
| `signing_sessions` | Certificate + XML hash binding per signing operation |

### Views

| View | Purpose |
|---|---|
| `invoice_status_view` | Invoice + submission status joined |
| `system_health_view` | Counts of failed/processing/pending/DLQ |
| `certificate_health_view` | Cert status and next expiry per tenant |

---

## 8. Technology Stack

| Layer | Choice | Rationale |
|---|---|---|
| Language | TypeScript (strict) | Type safety for fiscal data |
| Package manager | pnpm (workspaces) | Monorepo with internal packages |
| Runtime | Node.js 20+ | LTS, compatible with all deps |
| HTTP framework | Express | Simple, well-understood |
| Database | PostgreSQL | Relational, auditor-friendly, proven immutability via triggers |
| Signing | xadesjs + @peculiar/webcrypto + node-forge | XAdES-BES, no vendor lock-in |
| XML building | xmlbuilder2 | Deterministic serialisation |
| XSD validation | xmllint (shell) | Official tool, no native Node addon issues |
| QR generation | qrcode | Pure JS, no native deps |
| Process manager | PM2 | Simple VPS process supervision |
| CI | GitHub Actions | Automated compliance checks |

---

## 9. CI/CD Pipeline

The GitHub Actions workflow must run on every push to every branch and include:

1. pnpm install
2. Build all packages
3. Unit tests
4. Install xmllint
5. XSD validation for all three provinces
6. Hash chain tests
7. XAdES signature validation
8. End-to-end invoice generation test
9. Fail if `validation-errors.log` is present

---

## 10. Deployment

- **Platform**: Ubuntu VPS + PostgreSQL (no container orchestration)
- **Process management**: PM2 (api, worker, dashboard as separate processes)
- **Reverse proxy**: Nginx (api → port 3000, dashboard → port 3001)
- **TLS**: Let's Encrypt via Certbot
- **Firewall**: UFW (ports 22, 80, 443 only)
- **Backups**: Daily `pg_dump` via cron, gzipped
- **Environment**: `.env` file with `DATABASE_URL`, `PORT`, `TBAI_ENV` (sandbox/production)

### Cost estimate

| Stage | Monthly cost |
|---|---|
| MVP | €0–25 |
| Production | €25–100 |
| Scaled / compliance-hardened | €100–600+ |

---

## 11. Compliance Violation Consequences

Violations of TicketBAI requirements carry escalating consequences:

- **Minor** (e.g. missing optional fields): Warning from Hacienda; must correct within prescribed period
- **Moderate** (e.g. incorrect VAT breakdown, missing QR): Fine per invoice; potential audit of all issued invoices
- **Serious** (e.g. broken hash chain, unsigned invoices, falsified data): Criminal liability; loss of software garante status; retroactive invalidation of all invoices issued through the software

---

## 12. Open Items / Caveats

- **XSD schemas** must be downloaded manually from each Diputación Foral's developer portal; they are not redistributable in this repository.
- **Merkle tree batching** (daily integrity proofs) was discussed but confirmed as **not mandatory** for compliance.
- **Submission endpoints** for production use require approved garante registration with each province; sandbox endpoints are available for development.
- **Certificate renewal** process must be defined operationally; the `rotateCertificate` function provides the mechanism but the operational workflow is out of scope.
- **Corrective invoice** workflows require specific correction type codes per province — verify against the latest provincial specification before production use.
