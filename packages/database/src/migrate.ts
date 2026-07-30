import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db } from "./index";
import path from "path";

async function runMigrate() {
  console.log("⏳ Running database migrations...");
  const start = Date.now();

  try {
    await migrate(db, {
      migrationsFolder: path.resolve(__dirname, "../drizzle"),
    });

    console.log(`✅ Migrations completed successfully in ${Date.now() - start}ms`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Migrations failed!");
    console.error(error);
    process.exit(1);
  }
}

runMigrate();
