import { Migration } from "./base";

export class AddTeeTimeIdMigration extends Migration {
  version = 2;
  description = "Add tee_time_id to participants table";

  async up(): Promise<void> {
    const columnExists = await this.columnExists("participants", "tee_time_id");
    if (!columnExists) {
      await this.execute(`
        ALTER TABLE participants 
        ADD COLUMN tee_time_id INTEGER REFERENCES tee_times(id)
      `);
    }
  }

  async down(): Promise<void> {
    // SQLite doesn't support dropping columns, so we need to recreate the table
    // This is a simplified version that would need to be more robust in production
    await this.execute(`
      CREATE TABLE participants_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tee_order INTEGER NOT NULL,
        team_id INTEGER NOT NULL,
        position_name TEXT NOT NULL,
        player_names TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES teams(id)
      )
    `);

    await this.execute(`
      INSERT INTO participants_new 
      SELECT id, tee_order, team_id, position_name, player_names, created_at, updated_at 
      FROM participants
    `);

    await this.execute("DROP TABLE participants");
    await this.execute("ALTER TABLE participants_new RENAME TO participants");
  }
}
