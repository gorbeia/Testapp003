import express from "express";
import { Pool } from "pg";
import { processInvoice } from "@tbai/core";
import { PostgresStorage } from "@tbai/storage-postgres";
import { NodeXadesSigner } from "@tbai/signing-node";

const app = express();
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const storage = new PostgresStorage(pool);
const signer = new NodeXadesSigner();

app.post("/invoice", async (req, res) => {
  try {
    const { invoice, certificate } = req.body;
    const last = await storage.getLast(invoice.tenantId);
    const result = await processInvoice({ invoice, previous: last, signer });
    await storage.append(result.record);
    res.json(result.record);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/health", (_, res) => res.json({ status: "ok" }));

app.listen(3000, () => console.log("Server running on port 3000"));
