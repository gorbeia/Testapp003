import { Pool } from "pg";
import crypto from "crypto";

export class CertificateManager {
  constructor(private db: Pool) {}

  async getActiveCertificate(tenantId: string) {
    const res = await this.db.query(
      `SELECT * FROM certificates
       WHERE tenant_id = $1
         AND status = 'active'
         AND now() BETWEEN valid_from AND valid_to
       ORDER BY valid_to DESC LIMIT 1`,
      [tenantId]
    );
    return res.rows[0];
  }
}

export async function storeCertificate(db: Pool, input: any) {
  const fingerprint = crypto.createHash("sha256").update(input.certPem).digest("hex");
  await db.query(
    `INSERT INTO certificates (id, tenant_id, cert_fingerprint, cert_pem, issuer, subject, valid_from, valid_to, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active')`,
    [crypto.randomUUID(), input.tenantId, fingerprint, input.certPem, input.issuer, input.subject, input.validFrom, input.validTo]
  );
}

export async function rotateCertificate(db: Pool, tenantId: string, newCertId: string) {
  await db.query(
    `UPDATE certificates SET status = 'expired' WHERE tenant_id = $1 AND status = 'active'`,
    [tenantId]
  );
  await db.query(`UPDATE certificates SET status = 'active' WHERE id = $1`, [newCertId]);
}

export async function signAndBind({ db, tenantId, invoiceId, xml, certificate, signFn }: any) {
  const xmlHash = crypto.createHash("sha256").update(xml).digest("hex");
  const signedXml = await signFn(xml, certificate.cert_pem);
  const signedXmlHash = crypto.createHash("sha256").update(signedXml).digest("hex");

  await db.query(
    `INSERT INTO signing_sessions (id, tenant_id, certificate_id, invoice_id, xml_hash, signed_xml_hash, signer_version)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [crypto.randomUUID(), tenantId, certificate.id, invoiceId, xmlHash, signedXmlHash, "xades-bes-v1"]
  );
  return signedXml;
}
