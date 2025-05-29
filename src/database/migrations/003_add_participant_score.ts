import { Migration } from "./base";

export class AddParticipantScoreMigration extends Migration {
  version = 3;
  description = "Add score field to participants table";

  async up(): Promise<void> {
    const columnExists = await this.columnExists("participants", "score");
    if (!columnExists) {
      await this.execute(`
        ALTER TABLE participants 
        ADD COLUMN score TEXT DEFAULT '[]'
      `);
    }
  }

  async down(): Promise<void> {
    // SQLite doesn't support dropping columns, so we need to recreate the table
    await this.execute(`
      CREATE TABLE participants_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tee_order INTEGER NOT NULL,
        team_id INTEGER NOT NULL,
        tee_time_id INTEGER NOT NULL,
        position_name TEXT NOT NULL,
        player_names TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES teams(id),
        FOREIGN KEY (tee_time_id) REFERENCES tee_times(id)
      )
    `);

    await this.execute(`
      INSERT INTO participants_new 
      SELECT id, tee_order, team_id, tee_time_id, position_name, player_names, created_at, updated_at 
      FROM participants
    `);

    await this.execute("DROP TABLE participants");
    await this.execute("ALTER TABLE participants_new RENAME TO participants");
  }
}
