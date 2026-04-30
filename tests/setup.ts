import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.test before any test runs
config({ path: resolve(process.cwd(), '.env.test') });
