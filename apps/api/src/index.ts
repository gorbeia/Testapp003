import express, { Request, Response, NextFunction } from "express";
import { Pool } from "pg";
import { z } from "zod";
import cors from "cors";
import rateLimit from "express-rate-limit";
import pino from "pino";
import { processInvoice } from "@tbai/core";
import { PostgresStorage, withTransaction } from "@tbai/storage-postgres";
import { NodeXadesSigner } from "@tbai/signing-node";
import { validateApiKey } from "./auth.js";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });

const app = express();

// HTTPS enforcement in production
app.use((req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === "production" && req.headers["x-forwarded-proto"] !== "https") {
    return res.redirect(301, `https://${req.hostname}${req.url}`);
  }
  next();
});

// CORS
app.use(cors({
  origin: (process.env.CORS_ORIGINS ?? "").split(",").filter(Boolean),
}));

app.use(express.json());

// Rate limiting per API key
app.use(rateLimit({
  windowMs: 60_000,
  max: 100,
  keyGenerator: (req: any) => req.tenant?.id ?? req.ip,
  message: { error: "Too Many Requests" },
  standardHeaders: true,
  legacyHeaders: false,
}));

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const storage = new PostgresStorage(pool);
const signer = new NodeXadesSigner();

// Auth middleware — validates Bearer token + X-Tenant-Id, sets req.tenant
declare global {
  namespace Express {
    interface Request {
      tenant: { id: string };
    }
  }
}

async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const tenantId = req.headers["x-tenant-id"] as string | undefined;

  if (!authHeader?.startsWith("Bearer ") || !tenantId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const apiKey = authHeader.slice(7);
  const app = await validateApiKey(pool, apiKey, tenantId);
  if (!app) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  req.tenant = { id: tenantId };
  next();
}

// Zod schema for invoice submission
const partySchema = z.object({
  name: z.string().min(1),
  nif: z.string().min(1),
  address: z.string().optional(),
});

const lineSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().positive(),
  total: z.number().nonnegative(),
  vatRate: z.number().refine(v => [0, 4, 10, 21].includes(v), {
    message: "vatRate must be 0, 4, 10, or 21",
  }),
});

const invoiceSchema = z.object({
  id: z.string().min(1),
  series: z.string().min(1),
  number: z.string().min(1),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  issuer: partySchema,
  recipient: partySchema.optional(),
  lines: z.array(lineSchema).min(1),
  totals: z.object({
    totalAmount: z.number(),
    taxAmount: z.number().optional(),
    baseAmount: z.number().optional(),
    vatAmount: z.number().optional(),
  }),
  type: z.enum(["STANDARD", "CORRECTIVE"]).optional(),
  corrective: z.object({
    originalInvoiceId: z.string().min(1),
    correctionType: z.string().min(1),
  }).optional(),
});

const submitBodySchema = z.object({
  invoice: invoiceSchema,
  certificate: z.object({
    p12: z.string().min(1),
    password: z.string(),
  }),
});

app.post("/invoice", authMiddleware, async (req: Request, res: Response) => {
  const parsed = submitBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
  }

  const { invoice: rawInvoice, certificate } = parsed.data;
  // Always use tenant from authenticated token, never from body
  const invoice = { ...rawInvoice, tenantId: req.tenant.id };

  const start = Date.now();
  try {
    await withTransaction(pool, async (client) => {
      const last = await storage.getLast(invoice.tenantId, invoice.series);
      const cert = {
        p12: Buffer.from(certificate.p12, "base64"),
        password: certificate.password,
      };
      const result = await processInvoice({ invoice, previous: last, signer: { sign: (xml, c) => signer.sign(xml, c) } as any });
      await storage.append(result.record);
      await client.query(
        `INSERT INTO tbai_jobs (id, invoice_id, tenant_id, xml, status, province)
         VALUES (gen_random_uuid(), $1, $2, $3, 'pending', 'bizkaia')`,
        [result.record.id, invoice.tenantId, result.record.signedXml]
      );
      logger.info({ tenantId: invoice.tenantId, invoiceId: invoice.id, duration: Date.now() - start }, "invoice received");
      res.json(result.record);
    });
  } catch (err: any) {
    logger.error({ tenantId: invoice.tenantId, invoiceId: invoice.id, error: err.message }, "invoice processing failed");
    res.status(500).json({ error: err.message });
  }
});

app.get("/health", (_, res) => res.json({ status: "ok" }));

app.listen(3000, () => logger.info("Server running on port 3000"));
