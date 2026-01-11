import { createDatabase, initializeDatabase } from "../src/database/db";

// Read database path from environment variable
// Falls back to development database if not set
const dbPath = process.env.DB_PATH || "golf_series.db";

console.log(`Running migrations on ${dbPath}...`);

async function migrate() {
  try {
    // Create database connection with specified path
    const db = createDatabase(dbPath);

    // Run all pending migrations
    await initializeDatabase(db);

    // Get final migration count
    const migrations = db
      .query("SELECT COUNT(*) as count FROM migrations")
      .get() as { count: number };

    console.log(`✅ Migrations completed successfully (${migrations.count} migrations applied)`);

    db.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

migrate();
