#!/usr/bin/env bun
/**
 * Initialize missing game scores for existing game group members
 *
 * This script finds all game_group_members that don't have corresponding
 * game_scores records and creates them with empty score arrays.
 */

import { Database } from "bun:sqlite";

const dbPath = process.env.DATABASE_PATH || "./golf_series.db";
const db = new Database(dbPath);

console.log(`📁 Using database: ${dbPath}`);

try {
  // Find all group members without scores
  const membersWithoutScores = db.prepare(`
    SELECT ggm.id as member_id
    FROM game_group_members ggm
    LEFT JOIN game_scores gs ON gs.game_group_member_id = ggm.id
    WHERE gs.id IS NULL
  `).all() as Array<{ member_id: number }>;

  console.log(`Found ${membersWithoutScores.length} group members without scores`);

  if (membersWithoutScores.length === 0) {
    console.log("✅ All group members already have scores initialized");
    process.exit(0);
  }

  // Initialize scores for each member
  const insertStmt = db.prepare(`
    INSERT INTO game_scores (game_group_member_id, score)
    VALUES (?, '[]')
  `);

  db.transaction(() => {
    for (const { member_id } of membersWithoutScores) {
      insertStmt.run(member_id);
    }
  })();

  console.log(`✅ Initialized ${membersWithoutScores.length} missing game scores`);

  // Show summary by game
  const summary = db.prepare(`
    SELECT
      g.id,
      g.name,
      COUNT(DISTINCT ggm.id) as total_members,
      COUNT(DISTINCT gs.id) as initialized_scores
    FROM games g
    LEFT JOIN game_players gp ON gp.game_id = g.id
    LEFT JOIN game_group_members ggm ON ggm.game_player_id = gp.id
    LEFT JOIN game_scores gs ON gs.game_group_member_id = ggm.id
    GROUP BY g.id
    ORDER BY g.created_at DESC
    LIMIT 10
  `).all() as Array<{ id: number; name: string | null; total_members: number; initialized_scores: number }>;

  console.log("\nGame Summary:");
  console.log("ID | Name | Members | Scores");
  console.log("---|------|---------|-------");
  for (const row of summary) {
    const status = row.total_members === row.initialized_scores ? "✅" : "⚠️";
    console.log(`${row.id} | ${row.name || "(unnamed)"} | ${row.total_members} | ${row.initialized_scores} ${status}`);
  }

} catch (error) {
  console.error("❌ Error:", error);
  process.exit(1);
} finally {
  db.close();
}
