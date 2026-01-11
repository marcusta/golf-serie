#!/usr/bin/env bun
/**
 * Prepare for Deployment
 *
 * This script prepares the application for production deployment by:
 * 1. Type-checking the backend
 * 2. Running backend tests
 * 3. Building and deploying the frontend
 * 4. Verifying the build
 *
 * Usage:
 *   bun run prepare-deploy
 *   bun run prepare-deploy --skip-tests  (skip tests for faster builds)
 */

const skipTests = process.argv.includes("--skip-tests");

console.log("\n🚀 Preparing for Deployment\n");
console.log("=" .repeat(60));

// Helper function to run commands
async function run(command: string, description: string): Promise<boolean> {
  console.log(`\n📦 ${description}...`);
  const proc = Bun.spawn(command.split(" "), {
    stdout: "inherit",
    stderr: "inherit",
  });

  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    console.error(`\n❌ ${description} failed with exit code ${exitCode}`);
    return false;
  }

  console.log(`✅ ${description} completed`);
  return true;
}

async function main() {
  const startTime = Date.now();

  // Step 1: Type check backend
  if (!await run("bun run type-check", "Type-checking backend")) {
    process.exit(1);
  }

  // Step 2: Run backend tests (optional)
  if (!skipTests) {
    console.log("\n📝 Running backend tests (use --skip-tests to skip)...");
    if (!await run("bun run test:server", "Backend tests")) {
      console.error("\n⚠️  Tests failed. Fix tests or use --skip-tests to continue.");
      process.exit(1);
    }
  } else {
    console.log("\n⏭️  Skipping tests (--skip-tests flag provided)");
  }

  // Step 3: Build frontend
  console.log("\n🎨 Building frontend...");
  const frontendProc = Bun.spawn(["npm", "run", "deploy"], {
    cwd: "./frontend",
    stdout: "inherit",
    stderr: "inherit",
  });

  const frontendExit = await frontendProc.exited;
  if (frontendExit !== 0) {
    console.error("\n❌ Frontend build failed");
    process.exit(1);
  }
  console.log("✅ Frontend built and deployed to frontend_dist/");

  // Step 4: Verify build
  console.log("\n🔍 Verifying build...");
  const fs = require("fs");
  const path = require("path");

  const frontendDistPath = path.join(process.cwd(), "frontend_dist");
  const indexPath = path.join(frontendDistPath, "index.html");

  if (!fs.existsSync(frontendDistPath)) {
    console.error("❌ frontend_dist/ directory not found");
    process.exit(1);
  }

  if (!fs.existsSync(indexPath)) {
    console.error("❌ frontend_dist/index.html not found");
    process.exit(1);
  }

  const files = fs.readdirSync(frontendDistPath);
  console.log(`✅ Found ${files.length} files in frontend_dist/`);

  // Summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n" + "=".repeat(60));
  console.log("\n✅ Deployment preparation complete!");
  console.log(`\n⏱️  Total time: ${duration}s`);
  console.log("\n📋 Next steps:");
  console.log("   1. Review changes: git status");
  console.log("   2. Commit if needed: git add . && git commit");
  console.log("   3. Deploy to production: git push && deploy");
  console.log("\n🎉 Ready to deploy!\n");
}

main().catch((err) => {
  console.error("\n❌ Error:", err.message);
  process.exit(1);
});
