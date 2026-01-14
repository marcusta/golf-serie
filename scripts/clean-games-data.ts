#!/usr/bin/env bun
/**
 * Script to clean all casual games data from the database
 * Removes all records from games-related tables
 */

import Database from "bun:sqlite";

const DB_PATH = process.env.DATABASE_PATH || "./golf_series.db";

console.log("🗑️  Cleaning all casual games data...");
console.log(`📁 Database: ${DB_PATH}\n`);

const db = new Database(DB_PATH);

try {
  // Start transaction
  db.run("BEGIN TRANSACTION");

  // Delete in order respecting foreign key constraints

  // 1. Delete game_scores (references game_group_members)
  const scoresResult = db.run("DELETE FROM game_scores");
  console.log(`✓ Deleted ${scoresResult.changes} game scores`);

  // 2. Delete game_group_members (references game_groups and game_players)
  const membersResult = db.run("DELETE FROM game_group_members");
  console.log(`✓ Deleted ${membersResult.changes} game group members`);

  // 3. Delete game_groups (references games)
  const groupsResult = db.run("DELETE FROM game_groups");
  console.log(`✓ Deleted ${groupsResult.changes} game groups`);

  // 4. Delete game_players (references games)
  const playersResult = db.run("DELETE FROM game_players");
  console.log(`✓ Deleted ${playersResult.changes} game players`);

  // 5. Delete games
  const gamesResult = db.run("DELETE FROM games");
  console.log(`✓ Deleted ${gamesResult.changes} games`);

  // Commit transaction
  db.run("COMMIT");

  console.log("\n✅ Successfully cleaned all casual games data!");
  console.log("💡 All games, players, groups, and scores have been removed.");

} catch (error) {
  // Rollback on error
  db.run("ROLLBACK");
  console.error("\n❌ Error cleaning games data:", error);
  process.exit(1);
} finally {
  db.close();
}
