import { Migration } from "./base";

export class AddCompetitionGuestsMigration extends Migration {
  version = 58;
  description =
    "Add competition_guests pool (guests are organised into groups, never earn tour points)";

  async up(): Promise<void> {
    await this.execute(`
      CREATE TABLE IF NOT EXISTS competition_guests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        competition_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        handicap_index REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE
      )
    `);
  }

  async down(): Promise<void> {
    await this.execute("DROP TABLE IF EXISTS competition_guests");
  }
}
