import { Migration } from "./base";

export class AddManualScoresToParticipantsMigration extends Migration {
  version = 10;
  description = "Add manual score fields to participants table";

  async up(): Promise<void> {
    // Add manual_score_out column
    const outExists = await this.columnExists(
      "participants",
      "manual_score_out"
    );
    if (!outExists) {
      await this.execute(`
        ALTER TABLE participants 
        ADD COLUMN manual_score_out INTEGER NULL
      `);
    }

    // Add manual_score_in column
    const inExists = await this.columnExists("participants", "manual_score_in");
    if (!inExists) {
      await this.execute(`
        ALTER TABLE participants 
        ADD COLUMN manual_score_in INTEGER NULL
      `);
    }

    // Add manual_score_total column
    const totalExists = await this.columnExists(
      "participants",
      "manual_score_total"
    );
    if (!totalExists) {
      await this.execute(`
        ALTER TABLE participants 
        ADD COLUMN manual_score_total INTEGER NULL
      `);
    }
  }

  async down(): Promise<void> {
    // SQLite doesn't support dropping columns, so we need to recreate the table
    await this.execute(`
      CREATE TABLE participants_temp (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tee_order INTEGER NOT NULL,
        team_id INTEGER NOT NULL,
        tee_time_id INTEGER NOT NULL,
        position_name TEXT NOT NULL,
        player_names TEXT,
        score TEXT DEFAULT '[]',
        is_locked INTEGER NOT NULL DEFAULT 0,
        locked_at DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES teams(id),
        FOREIGN KEY (tee_time_id) REFERENCES tee_times(id)
      )
    `);

    await this.execute(`
      INSERT INTO participants_temp 
      SELECT id, tee_order, team_id, tee_time_id, position_name, player_names, score, is_locked, locked_at, created_at, updated_at 
      FROM participants
    `);

    await this.execute("DROP TABLE participants");
    await this.execute("ALTER TABLE participants_temp RENAME TO participants");
  }
}
