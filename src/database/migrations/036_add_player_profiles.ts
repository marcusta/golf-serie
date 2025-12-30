import { Migration } from "./base";

export class AddPlayerProfilesMigration extends Migration {
  version = 36;
  description = "Add player_profiles and handicap_history tables";

  async up(): Promise<void> {
    // Create handicap_history table for tracking handicap changes over time
    await this.execute(`
      CREATE TABLE IF NOT EXISTS handicap_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        handicap_index REAL NOT NULL,
        effective_date TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT 'manual',
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Index for efficient lookups by player, ordered by date
    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_handicap_history_player
      ON handicap_history(player_id, effective_date DESC)
    `);

    // Create player_profiles table for extended profile data
    await this.execute(`
      CREATE TABLE IF NOT EXISTS player_profiles (
        player_id INTEGER PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
        display_name TEXT,
        bio TEXT,
        avatar_url TEXT,
        home_course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
        visibility TEXT NOT NULL DEFAULT 'public',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed initial handicap history from existing player handicaps
    // This preserves the current handicap as the first history entry
    await this.execute(`
      INSERT INTO handicap_history (player_id, handicap_index, effective_date, source, notes)
      SELECT
        id,
        handicap,
        date('now'),
        'import',
        'Initial handicap imported from player record'
      FROM players
      WHERE handicap IS NOT NULL AND handicap != 0
    `);
  }

  async down(): Promise<void> {
    await this.execute("DROP INDEX IF EXISTS idx_handicap_history_player");
    await this.execute("DROP TABLE IF EXISTS handicap_history");
    await this.execute("DROP TABLE IF EXISTS player_profiles");
  }
}
