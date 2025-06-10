import { Migration } from "./base";

export class AddParticipantLockStatusMigration extends Migration {
  version = 9;
  description = "Add lock status fields to participants table";

  async up(): Promise<void> {
    // Add is_locked column
    const isLockedExists = await this.columnExists("participants", "is_locked");
    if (!isLockedExists) {
      await this.execute(`
        ALTER TABLE participants 
        ADD COLUMN is_locked INTEGER NOT NULL DEFAULT 0
      `);
    }

    // Add locked_at column
    const lockedAtExists = await this.columnExists("participants", "locked_at");
    if (!lockedAtExists) {
      await this.execute(`
        ALTER TABLE participants 
        ADD COLUMN locked_at DATETIME NULL
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES teams(id),
        FOREIGN KEY (tee_time_id) REFERENCES tee_times(id)
      )
    `);

    await this.execute(`
      INSERT INTO participants_temp 
      SELECT id, tee_order, team_id, tee_time_id, position_name, player_names, score, created_at, updated_at 
      FROM participants
    `);

    await this.execute("DROP TABLE participants");
    await this.execute("ALTER TABLE participants_temp RENAME TO participants");
  }
}
