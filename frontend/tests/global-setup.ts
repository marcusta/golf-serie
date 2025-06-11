import { execSync } from "child_process";
import fs from "fs";
import path from "path";

async function globalSetup() {
  console.log("--- E2E Global Setup ---");

  // Navigate to the project root from the frontend/tests directory
  const projectRoot = path.resolve(__dirname, "../../");
  const dbPath = path.join(projectRoot, "golf_series.db");

  // 1. Delete the existing database file to ensure a clean state
  if (fs.existsSync(dbPath)) {
    console.log(`Deleting existing database at ${dbPath}...`);
    fs.unlinkSync(dbPath);
  } else {
    console.log("No existing database found, skipping deletion.");
  }

  // 2. Run the database migration script using Bun from the project root
  console.log("Running database migrations...");
  execSync("bun run migrate", { cwd: projectRoot, stdio: "inherit" });

  console.log("--- Global Setup Complete ---");
}

export default globalSetup;
