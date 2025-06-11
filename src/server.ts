import { createApp } from "./app";
import { createDatabase, initializeDatabase } from "./database/db";

const db = createDatabase();
initializeDatabase(db);
const app = createApp(db);

const server = Bun.serve({
  port: process.env.PORT || 3010,
  fetch: app.fetch,
});

console.log(`Server running on port ${server.port}`);
