#!/usr/bin/env bun
/**
 * Create Admin Script
 * 
 * Usage:
 *   bun run scripts/create-admin.ts <email> <password>
 *   bun run scripts/create-admin.ts  (prompts for input)
 */

import { Database } from "bun:sqlite";
import { createInterface } from "readline";

const DB_PATH = process.env.DB_PATH || "./golf_series.db";

async function prompt(question: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function hashPassword(password: string): Promise<string> {
  return await Bun.password.hash(password);
}

async function main() {
  let email = process.argv[2];
  let password = process.argv[3];

  // If no args, prompt for input
  if (!email || !password) {
    console.log("\n🏌️ Create Super Admin Account\n");
    console.log("Usage: bun run scripts/create-admin.ts <email> <password>\n");
    
    if (!email) {
      email = await prompt("Email: ");
    }
    if (!password) {
      password = await prompt("Password: ");
    }
  }

  if (!email || !password) {
    console.error("❌ Email and password are required");
    process.exit(1);
  }

  if (password.length < 6) {
    console.error("❌ Password must be at least 6 characters");
    process.exit(1);
  }

  // Open database
  const db = new Database(DB_PATH);

  // Check if user already exists
  const existing = db.query("SELECT id, role FROM users WHERE email = ?").get(email) as any;

  if (existing) {
    // Update existing user to SUPER_ADMIN
    db.run("UPDATE users SET role = 'SUPER_ADMIN' WHERE email = ?", [email]);
    console.log(`\n✅ Updated existing user to SUPER_ADMIN: ${email}`);
  } else {
    // Create new user
    const hashedPassword = await hashPassword(password);
    db.run(
      "INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'SUPER_ADMIN')",
      [email, hashedPassword]
    );
    console.log(`\n✅ Created SUPER_ADMIN account: ${email}`);
  }

  db.close();
  console.log("\n🎉 You can now log in at /login\n");
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
