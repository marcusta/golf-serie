#!/usr/bin/env bun
/**
 * Database Check Script
 *
 * Inspects the database to verify its state and migration status.
 * Useful for verifying after deployment that the database is correct.
 *
 * Usage:
 *   bun run check-db                    # Check local database
 *   DB_PATH=/path/to/db bun run check-db  # Check specific database
 *
 * On production server:
 *   cd /path/to/app && bun run check-db
 */

import { Database } from "bun:sqlite";

const dbPath = process.env.DB_PATH || "./golf_series.db";

console.log("\n🔍 Database Inspection Report");
console.log("=".repeat(70));
console.log(`📁 Database: ${dbPath}\n`);

try {
  // Check if database exists
  const fs = require("fs");
  if (!fs.existsSync(dbPath)) {
    console.error(`❌ Database file not found at: ${dbPath}`);
    console.log("\n⚠️  This could mean:");
    console.log("   1. Database was accidentally deleted");
    console.log("   2. Wrong path specified");
    console.log("   3. Database hasn't been created yet");
    process.exit(1);
  }

  const stats = fs.statSync(dbPath);
  const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
  const modifiedDate = stats.mtime.toISOString();

  console.log("✅ Database file exists");
  console.log(`   Size: ${sizeInMB} MB`);
  console.log(`   Last modified: ${modifiedDate}\n`);

  // Open database
  const db = new Database(dbPath);

  // Test connection
  try {
    db.query("SELECT 1").get();
    console.log("✅ Database connection successful\n");
  } catch (err) {
    console.error("❌ Failed to connect to database:", err);
    process.exit(1);
  }

  // Check migrations table
  console.log("📊 Migration Status:");
  console.log("-".repeat(70));

  try {
    const migrations = db.query(`
      SELECT version, applied_at
      FROM migrations
      ORDER BY version DESC
      LIMIT 10
    `).all() as { version: number; applied_at: string }[];

    if (migrations.length === 0) {
      console.log("⚠️  No migrations found (migrations table is empty)");
    } else {
      console.log(`✅ Found ${migrations.length} recent migrations:\n`);
      migrations.forEach((m, i) => {
        const date = new Date(m.applied_at).toLocaleString();
        console.log(`   ${i === 0 ? '→' : ' '} Migration ${m.version.toString().padStart(3, '0')}: ${date}`);
      });

      const latestMigration = migrations[0];
      console.log(`\n   Latest: Migration ${latestMigration.version} (${latestMigration.applied_at})`);
    }
  } catch (err) {
    console.log("⚠️  Could not read migrations table (might not exist yet)");
  }

  // Check main tables
  console.log("\n📋 Database Tables:");
  console.log("-".repeat(70));

  const tables = db.query(`
    SELECT name
    FROM sqlite_master
    WHERE type='table'
    AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all() as { name: string }[];

  if (tables.length === 0) {
    console.log("⚠️  No tables found!");
  } else {
    console.log(`✅ Found ${tables.length} tables:\n`);

    // Group tables by category
    const tableGroups = {
      core: [] as string[],
      tour: [] as string[],
      competition: [] as string[],
      system: [] as string[],
      other: [] as string[],
    };

    tables.forEach((t) => {
      if (['users', 'players', 'teams', 'courses'].includes(t.name)) {
        tableGroups.core.push(t.name);
      } else if (t.name.startsWith('tour')) {
        tableGroups.tour.push(t.name);
      } else if (t.name.includes('competition') || t.name.includes('participant') || t.name === 'tee_times') {
        tableGroups.competition.push(t.name);
      } else if (['migrations', 'documents'].includes(t.name)) {
        tableGroups.system.push(t.name);
      } else {
        tableGroups.other.push(t.name);
      }
    });

    if (tableGroups.core.length > 0) {
      console.log("   Core: " + tableGroups.core.join(", "));
    }
    if (tableGroups.tour.length > 0) {
      console.log("   Tour: " + tableGroups.tour.join(", "));
    }
    if (tableGroups.competition.length > 0) {
      console.log("   Competition: " + tableGroups.competition.join(", "));
    }
    if (tableGroups.system.length > 0) {
      console.log("   System: " + tableGroups.system.join(", "));
    }
    if (tableGroups.other.length > 0) {
      console.log("   Other: " + tableGroups.other.join(", "));
    }
  }

  // Check row counts for important tables
  console.log("\n📈 Data Summary:");
  console.log("-".repeat(70));

  const criticalTables = [
    'users',
    'players',
    'teams',
    'courses',
    'series',
    'tours',
    'competitions',
    'participants',
  ];

  for (const tableName of criticalTables) {
    try {
      const result = db.query(`SELECT COUNT(*) as count FROM ${tableName}`).get() as { count: number };
      const icon = result.count > 0 ? '✅' : '⚠️ ';
      console.log(`   ${icon} ${tableName.padEnd(20)}: ${result.count.toLocaleString()} rows`);
    } catch (err) {
      // Table doesn't exist
    }
  }

  // Check for recent activity
  console.log("\n⏰ Recent Activity:");
  console.log("-".repeat(70));

  try {
    const recentCompetitions = db.query(`
      SELECT name, date
      FROM competitions
      ORDER BY date DESC
      LIMIT 3
    `).all() as { name: string; date: string }[];

    if (recentCompetitions.length > 0) {
      console.log("   Recent competitions:");
      recentCompetitions.forEach((c) => {
        console.log(`     • ${c.name} (${c.date})`);
      });
    }
  } catch (err) {
    // Competitions table doesn't exist
  }

  try {
    const recentUsers = db.query(`
      SELECT email, role, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 3
    `).all() as { email: string; role: string; created_at: string }[];

    if (recentUsers.length > 0) {
      console.log("\n   Recent users:");
      recentUsers.forEach((u) => {
        const date = new Date(u.created_at).toLocaleDateString();
        console.log(`     • ${u.email} (${u.role}) - ${date}`);
      });
    }
  } catch (err) {
    // Users table doesn't exist
  }

  // Summary
  console.log("\n" + "=".repeat(70));
  console.log("✅ Database check complete!");
  console.log("\n💡 Tips:");
  console.log("   • To run migrations: bun run db:migrate");
  console.log("   • To check health: bun run db:health");
  console.log("   • To create admin: bun run create-admin <email> <password>\n");

  db.close();

} catch (error) {
  console.error("\n❌ Error during database inspection:", error);
  process.exit(1);
}
