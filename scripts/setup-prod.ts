import { $ } from "bun";
import { existsSync, mkdirSync } from "fs";

console.log("🔄 Setting up production database copy...\n");

async function setupProd() {
  try {
    // 1. Ensure deploy-tmp directory exists
    if (!existsSync("deploy-tmp")) {
      mkdirSync("deploy-tmp");
    }

    // 2. Download production database
    console.log("📥 Downloading production database...");
    try {
      // Use shell -c to access shell aliases/functions
      await $`sh -c "db_pull"`;
    } catch (error) {
      throw new Error(
        "Failed to download production database. Is 'db_pull' command available?"
      );
    }
    console.log("✅ Download complete\n");

    // 3. Run migrations
    console.log("⚙️  Running migrations...");
    const migrateResult =
      await $`bun run db:migrate`.env({ DB_PATH: "deploy-tmp/db.sqlite" });
    if (migrateResult.exitCode !== 0) {
      throw new Error("Migration failed");
    }

    // 4. Validate health
    console.log("\n🔍 Validating database...");
    const healthResult =
      await $`bun run db:health`.env({ DB_PATH: "deploy-tmp/db.sqlite" });
    if (healthResult.exitCode !== 0) {
      throw new Error("Validation failed");
    }

    console.log("\n✨ Production database copy ready!");
    console.log("   Location: deploy-tmp/db.sqlite");
    console.log("   To use: bun run dev:prod\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Setup failed:", error);
    process.exit(1);
  }
}

setupProd();
