import { Pool } from "pg";
import { randomUUID } from "crypto";
import { computeRequestHash } from "@tbai/core";

export async function createJob(db: Pool, input: {
  invoiceId: string;
  tenantId: string;
  xml: string;
  certFingerprint: string;
  endpoint: string;
}) {
  const id = randomUUID();
  const requestHash = computeRequestHash({
    invoiceId: input.invoiceId,
    xml: input.xml,
    certificateFingerprint: input.certFingerprint,
    endpoint: input.endpoint,
  });

  await db.query(
    `INSERT INTO tbai_jobs (id, invoice_id, tenant_id, xml, request_hash)
     VALUES ($1,$2,$3,$4,$5) ON CONFLICT (invoice_id) DO NOTHING`,
    [id, input.invoiceId, input.tenantId, input.xml, requestHash]
  );
  return id;
}
