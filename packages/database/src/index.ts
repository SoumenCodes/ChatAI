import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import dotenv from "dotenv";
import path from "path";

// In monorepos, env variables are typically stored in the root
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  // We do not throw immediately during build-time checks if DB is not needed, 
  // but we warn if someone tries to instantiate the DB connection without it.
  console.warn("⚠️ Warning: DATABASE_URL environment variable is missing.");
}

// Disable prepared statement caching (prepare: false) for serverless environments and Supabase pooling compatibility
const client = postgres(connectionString || "", { prepare: false });

export const db = drizzle(client, { schema });

export * from "./schema";
