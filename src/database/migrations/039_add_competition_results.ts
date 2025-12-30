import { Migration } from "./base";

export class AddCompetitionResultsMigration extends Migration {
  version = 39;
  description = "Add competition_results table for storing finalized competition results";

  async up(): Promise<void> {
    // Create competition_results table
    // Stores calculated results when a competition is closed/finalized
    await this.execute(`
      CREATE TABLE IF NOT EXISTS competition_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
        participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
        player_id INTEGER REFERENCES players(id) ON DELETE SET NULL,

        -- Position and points
        position INTEGER NOT NULL,
        points INTEGER NOT NULL DEFAULT 0,

        -- Score data
        gross_score INTEGER,
        net_score INTEGER,
        relative_to_par INTEGER,

        -- Scoring type (for tours with both gross and net)
        scoring_type TEXT NOT NULL DEFAULT 'gross' CHECK(scoring_type IN ('gross', 'net')),

        -- Metadata
        calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        -- Unique constraint: one result per participant per scoring type
        UNIQUE(participant_id, scoring_type)
      )
    `);

    // Index for fast lookups
    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_competition_results_competition
      ON competition_results(competition_id)
    `);

    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_competition_results_player
      ON competition_results(player_id)
    `);

    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_competition_results_player_scoring
      ON competition_results(player_id, scoring_type)
    `);

    // Add is_results_final column to competitions table
    // Indicates whether results have been calculated and stored
    if (!(await this.columnExists("competitions", "is_results_final"))) {
      await this.execute(
        "ALTER TABLE competitions ADD COLUMN is_results_final INTEGER DEFAULT 0"
      );
    }

    // Add results_finalized_at column to competitions table
    if (!(await this.columnExists("competitions", "results_finalized_at"))) {
      await this.execute(
        "ALTER TABLE competitions ADD COLUMN results_finalized_at DATETIME"
      );
    }
  }

  async down(): Promise<void> {
    await this.execute("DROP TABLE IF EXISTS competition_results");

    // Note: SQLite doesn't support DROP COLUMN in older versions
    // These will fail silently if not supported
    try {
      await this.execute("ALTER TABLE competitions DROP COLUMN is_results_final");
    } catch (e) {
      console.warn("Could not drop is_results_final column:", e);
    }
    try {
      await this.execute("ALTER TABLE competitions DROP COLUMN results_finalized_at");
    } catch (e) {
      console.warn("Could not drop results_finalized_at column:", e);
    }
  }
}
