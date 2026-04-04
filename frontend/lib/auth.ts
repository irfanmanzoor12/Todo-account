// Better Auth server config — simple session auth (no JWT plugin needed)
// [Spec: specs/features/authentication.md]

import { betterAuth } from "better-auth";
import { kyselyAdapter } from "@better-auth/kysely-adapter";
import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const db = new Kysely<Record<string, Record<string, unknown>>>({
  dialect: new PostgresDialect({ pool }),
});

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  database: kyselyAdapter(db, { type: "postgres" }),
  emailAndPassword: { enabled: true },
  session: { expiresIn: 60 * 60 * 24 * 7 },
});
