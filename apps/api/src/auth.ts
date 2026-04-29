import crypto from "crypto";

export async function validateApiKey(db: any, apiKey: string, tenantId: string) {
  const hash = crypto.createHash("sha256").update(apiKey).digest("hex");
  const res = await db.query(
    `SELECT * FROM applications WHERE api_key_hash = $1 AND tenant_id = $2 AND status = 'active'`,
    [hash, tenantId]
  );
  return res.rows[0] || null;
}
