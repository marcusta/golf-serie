import { createDatabase, initializeDatabase } from "./db";

const db = createDatabase();
initializeDatabase(db);

console.log("Database initialized successfully!");
db.close();
