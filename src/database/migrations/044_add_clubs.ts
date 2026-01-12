import { Migration } from "./base";

export class AddClubsMigration extends Migration {
  version = 44;
  description = "Add clubs table and club_id to courses";

  async up(): Promise<void> {
    // Create clubs table
    await this.execute(`
      CREATE TABLE IF NOT EXISTS clubs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add club_id column to courses if it doesn't exist
    if (!(await this.columnExists("courses", "club_id"))) {
      // First, create a default club for existing courses
      await this.execute(`
        INSERT INTO clubs (name)
        SELECT DISTINCT 'Default Club'
        WHERE EXISTS (SELECT 1 FROM courses)
      `);

      // Add the column (nullable initially)
      await this.execute(`
        ALTER TABLE courses ADD COLUMN club_id INTEGER REFERENCES clubs(id)
      `);

      // Update all existing courses to use the default club
      await this.execute(`
        UPDATE courses
        SET club_id = (SELECT id FROM clubs WHERE name = 'Default Club')
        WHERE club_id IS NULL
      `);
    }
  }

  async down(): Promise<void> {
    // Remove club_id from courses
    if (await this.columnExists("courses", "club_id")) {
      // SQLite doesn't support DROP COLUMN easily, so we'd need to recreate the table
      // For now, just leave it as optional
      await this.execute(`
        ALTER TABLE courses DROP COLUMN club_id
      `);
    }

    // Drop clubs table
    await this.execute("DROP TABLE IF EXISTS clubs");
  }
}
