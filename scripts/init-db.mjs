// Создаёт схему в Turso: npm run db:init (читает .env.local)
// (схема также создаётся автоматически при первом запросе к API)
import { createClient } from "@libsql/client";
import { SCHEMA } from "../lib/schema.ts";

const url = process.env.TURSO_DATABASE_URL || "file:local.db";
const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN || undefined });
await client.executeMultiple(SCHEMA);
console.log("Схема создана:", url);
