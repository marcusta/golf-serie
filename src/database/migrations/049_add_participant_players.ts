import { Migration } from "./base";

export class AddParticipantPlayersMigration extends Migration {
  version = 49;
  description =
    "Add participant_players junction table for linking multiple players to a participant";

  async up(): Promise<void> {
    // Create participant_players junction table
    // Allows a participant (team slot) to have multiple linked player accounts
    await this.execute(`
      CREATE TABLE IF NOT EXISTS participant_players (
        participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
        player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        created_at INTEGER DEFAULT (unixepoch()),
        PRIMARY KEY (participant_id, player_id)
      )
    `);

    // Index for finding all players linked to a participant
    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_participant_players_participant
      ON participant_players(participant_id)
    `);

    // Index for finding all participants a player is linked to
    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_participant_players_player
      ON participant_players(player_id)
    `);
  }

  async down(): Promise<void> {
    await this.execute("DROP TABLE IF EXISTS participant_players");
  }
}
