import { Pool } from "pg";
import { TicketBaiWorker } from "./worker.js";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const endpoint = process.env.HACIENDA_ENDPOINT ?? "";
const worker = new TicketBaiWorker(pool, endpoint, null);

worker.runForever().catch(err => {
  console.error("Worker failed:", err);
  process.exit(1);
});
