import { Database } from "bun:sqlite";
import { Migration } from "./base";

export class AddManualEntryFormatToCompetitions extends Migration {
  version = 11;
  description = "Add manual_entry_format column to competitions table";

  constructor(db: Database) {
    super(db);
  }

  async up(): Promise<void> {
    console.log("Adding manual_entry_format column to competitions table...");

    // Add the new column with default value
    this.db.exec(`
      ALTER TABLE competitions 
      ADD COLUMN manual_entry_format TEXT NOT NULL DEFAULT 'out_in_total'
    `);

    console.log("manual_entry_format column added successfully");
  }

  async down(): Promise<void> {
    console.log(
      "Removing manual_entry_format column from competitions table..."
    );

    // Create a new table without the manual_entry_format column
    this.db.exec(`
      CREATE TABLE competitions_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        date TEXT NOT NULL,
        course_id INTEGER NOT NULL,
        series_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id),
        FOREIGN KEY (series_id) REFERENCES series(id)
      )
    `);

    // Copy data from old table to new table (excluding manual_entry_format)
    this.db.exec(`
      INSERT INTO competitions_new 
      (id, name, date, course_id, series_id, created_at, updated_at)
      SELECT id, name, date, course_id, series_id, created_at, updated_at
      FROM competitions
    `);

    // Drop the old table and rename the new one
    this.db.exec(`DROP TABLE competitions`);
    this.db.exec(`ALTER TABLE competitions_new RENAME TO competitions`);

    console.log("manual_entry_format column removed successfully");
  }
}
