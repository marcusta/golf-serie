import { Database } from "bun:sqlite";
import { readdirSync } from "fs";
import { join } from "path";

const dbPath = process.env.DB_PATH || "golf_series.db";

console.log(`Validating database schema at ${dbPath}...`);

async function validate() {
  try {
    const db = new Database(dbPath);

    // Check database is accessible
    db.query("SELECT 1").get();

    // Check critical tables exist
    const tables = db
      .query("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as { name: string }[];

    const tableNames = tables.map((t) => t.name);
    const requiredTables = [
      "migrations", // Must check this first!
      "users",
      "players",
      "competitions",
      "courses",
      "tee_times",
      "participants",
    ];

    for (const table of requiredTables) {
      if (!tableNames.includes(table)) {
        throw new Error(`Missing required table: ${table}`);
      }
    }

    // CRITICAL: Check all migrations have been applied
    const migrationFiles = readdirSync(
      join(import.meta.dir, "../src/database/migrations")
    )
      .filter((f) => f.match(/^\d{3}_.*\.ts$/))
      .sort();

    const expectedLatestVersion = migrationFiles.length;

    const appliedMigrations = db
      .query("SELECT version FROM migrations ORDER BY version DESC")
      .all() as { version: number }[];

    const latestApplied = appliedMigrations[0]?.version || 0;

    if (latestApplied !== expectedLatestVersion) {
      throw new Error(
        `Migration mismatch: Expected ${expectedLatestVersion} migrations, but only ${latestApplied} applied`
      );
    }

    console.log(`✅ Database validation passed`);
    console.log(`   - ${tableNames.length} tables present`);
    console.log(`   - All ${expectedLatestVersion} migrations applied`);

    db.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Validation failed:", error);
    process.exit(1);
  }
}

validate();
