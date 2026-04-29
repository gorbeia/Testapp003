import express from "express";
import { Pool } from "pg";

const app = express();
const db = new Pool({ connectionString: process.env.DATABASE_URL });

app.get("/health", async (_, res) => {
  const result = await db.query("SELECT * FROM system_health_view");
  res.json(result.rows[0]);
});

app.get("/invoices", async (_, res) => {
  const result = await db.query("SELECT * FROM invoice_status_view LIMIT 100");
  res.json(result.rows);
});

app.get("/dlq", async (_, res) => {
  const result = await db.query("SELECT * FROM tbai_dead_letter_queue ORDER BY created_at DESC LIMIT 100");
  res.json(result.rows);
});

app.get("/certificates", async (_, res) => {
  const result = await db.query("SELECT * FROM certificate_health_view");
  res.json(result.rows);
});

app.listen(3001, () => console.log("Dashboard API running on port 3001"));
