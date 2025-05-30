import { createDatabase, initializeDatabase } from "./db";

async function migrate() {
  const db = createDatabase();
  await initializeDatabase(db);
  console.log("Database initialized successfully!");
  db.close();
}

migrate().catch(console.error);
