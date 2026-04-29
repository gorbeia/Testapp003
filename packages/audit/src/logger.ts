import crypto from "crypto";
import { Pool } from "pg";

export class AuditLogger {
  constructor(private db: Pool) {}

  async logEvent(input: {
    tenantId: string;
    invoiceId: string;
    type: string;
    payload: any;
  }) {
    await this.db.query(
      `INSERT INTO audit_events (id, tenant_id, invoice_id, event_type, payload)
       VALUES ($1,$2,$3,$4,$5)`,
      [crypto.randomUUID(), input.tenantId, input.invoiceId, input.type, input.payload]
    );
  }
}

export async function storeXmlSnapshot(db: Pool, invoiceId: string, xml: string, signed: boolean) {
  const xmlHash = crypto.createHash("sha256").update(xml).digest("hex");
  await db.query(
    `INSERT INTO audit_xml_store (id, invoice_id, xml, xml_hash, signed) VALUES ($1,$2,$3,$4,$5)`,
    [crypto.randomUUID(), invoiceId, xml, xmlHash, signed]
  );
  return xmlHash;
}

export async function writeAuditChain(db: Pool, entityType: string, entityId: string, payload: any) {
  const last = await db.query(`SELECT current_hash FROM audit_chain ORDER BY created_at DESC LIMIT 1`);
  const previousHash = last.rows[0]?.current_hash || "";
  const currentHash = crypto.createHash("sha256")
    .update(previousHash + entityType + entityId + JSON.stringify(payload))
    .digest("hex");
  await db.query(
    `INSERT INTO audit_chain (id, entity_type, entity_id, previous_hash, current_hash)
     VALUES ($1,$2,$3,$4,$5)`,
    [crypto.randomUUID(), entityType, entityId, previousHash, currentHash]
  );
}
