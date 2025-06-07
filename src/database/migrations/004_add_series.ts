import { Migration } from "./base";

export class AddSeriesMigration extends Migration {
  version = 4;
  description = "Add series table and optional series relationships";

  async up(): Promise<void> {
    // Create series table
    await this.execute(`
      CREATE TABLE IF NOT EXISTS series (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        banner_image_url TEXT,
        is_public INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add optional series_id column to competitions table
    await this.execute(`
      ALTER TABLE competitions 
      ADD COLUMN series_id INTEGER REFERENCES series(id) ON DELETE SET NULL
    `);

    // Add optional series_id column to teams table
    await this.execute(`
      ALTER TABLE teams 
      ADD COLUMN series_id INTEGER REFERENCES series(id) ON DELETE SET NULL
    `);
  }

  async down(): Promise<void> {
    // Remove series_id from teams table
    await this.execute(`
      CREATE TABLE teams_temp (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await this.execute(
      `INSERT INTO teams_temp SELECT id, name, created_at, updated_at FROM teams`
    );
    await this.execute(`DROP TABLE teams`);
    await this.execute(`ALTER TABLE teams_temp RENAME TO teams`);

    // Remove series_id from competitions table
    await this.execute(`
      CREATE TABLE competitions_temp (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        date TEXT NOT NULL,
        course_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id)
      )
    `);
    await this.execute(
      `INSERT INTO competitions_temp SELECT id, name, date, course_id, created_at, updated_at FROM competitions`
    );
    await this.execute(`DROP TABLE competitions`);
    await this.execute(`ALTER TABLE competitions_temp RENAME TO competitions`);

    // Drop series table
    await this.execute("DROP TABLE IF EXISTS series");
  }
}
