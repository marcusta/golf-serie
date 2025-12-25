import { Migration } from "./base";

export class AddTourCompetitionRegistrationsMigration extends Migration {
  version = 34;
  description =
    "Add tour_competition_registrations table for player self-registration in open competitions";

  async up(): Promise<void> {
    // Create tour_competition_registrations table
    // Tracks player registration for open-start tour competitions
    // Players in the same tee_time are in the same playing group
    await this.execute(`
      CREATE TABLE IF NOT EXISTS tour_competition_registrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
        player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        enrollment_id INTEGER NOT NULL REFERENCES tour_enrollments(id) ON DELETE CASCADE,

        -- Group membership (players sharing same tee_time are in same group)
        tee_time_id INTEGER REFERENCES tee_times(id) ON DELETE SET NULL,
        participant_id INTEGER REFERENCES participants(id) ON DELETE SET NULL,

        -- Status tracking
        -- 'looking_for_group' - Wants to be added by others
        -- 'registered'        - Solo or in a group, ready to play
        -- 'playing'           - Currently on course (started entering scores)
        -- 'finished'          - Scorecard locked
        -- 'withdrawn'         - Left the competition
        status TEXT NOT NULL DEFAULT 'registered'
          CHECK(status IN ('looking_for_group', 'registered', 'playing', 'finished', 'withdrawn')),

        -- Group info (who created the group this player is in)
        group_created_by INTEGER REFERENCES players(id) ON DELETE SET NULL,

        -- Timestamps
        registered_at TEXT DEFAULT CURRENT_TIMESTAMP,
        started_at TEXT,
        finished_at TEXT,

        -- Each player can only register once per competition
        UNIQUE(competition_id, player_id)
      )
    `);

    // Index for finding registrations by competition and status
    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_tcr_competition_status
      ON tour_competition_registrations(competition_id, status)
    `);

    // Index for finding registrations by tee_time (group lookups)
    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_tcr_tee_time
      ON tour_competition_registrations(tee_time_id)
    `);

    // Index for finding all registrations for a player
    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_tcr_player
      ON tour_competition_registrations(player_id)
    `);
  }

  async down(): Promise<void> {
    await this.execute("DROP TABLE IF EXISTS tour_competition_registrations");
  }
}
