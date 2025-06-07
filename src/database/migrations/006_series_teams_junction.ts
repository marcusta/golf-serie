import { Migration } from "./base";

export class SeriesTeamsJunctionMigration extends Migration {
  version = 6;
  description =
    "Create series_teams junction table for many-to-many relationship";

  async up(): Promise<void> {
    // Create series_teams junction table
    await this.execute(`
      CREATE TABLE IF NOT EXISTS series_teams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        series_id INTEGER NOT NULL,
        team_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
        UNIQUE(series_id, team_id)
      )
    `);

    // Migrate existing data from teams.series_id to junction table
    await this.execute(`
      INSERT OR IGNORE INTO series_teams (series_id, team_id)
      SELECT series_id, id
      FROM teams
      WHERE series_id IS NOT NULL
    `);

    // Temporarily disable foreign keys for table restructuring
    await this.execute("PRAGMA foreign_keys = OFF");

    // Remove series_id column from teams table
    await this.execute(`DROP TABLE IF EXISTS teams_new`);
    await this.execute(`
      CREATE TABLE teams_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.execute(`
      INSERT INTO teams_new (id, name, created_at, updated_at)
      SELECT id, name, created_at, updated_at
      FROM teams
    `);

    await this.execute("DROP TABLE teams");
    await this.execute("ALTER TABLE teams_new RENAME TO teams");

    // Re-enable foreign keys
    await this.execute("PRAGMA foreign_keys = ON");
  }

  async down(): Promise<void> {
    // Add series_id back to teams table
    await this.execute(`
      ALTER TABLE teams 
      ADD COLUMN series_id INTEGER REFERENCES series(id) ON DELETE SET NULL
    `);

    // Migrate data back (only first series per team)
    await this.execute(`
      UPDATE teams 
      SET series_id = (
        SELECT series_id 
        FROM series_teams 
        WHERE series_teams.team_id = teams.id 
        LIMIT 1
      )
    `);

    // Drop junction table
    await this.execute("DROP TABLE IF EXISTS series_teams");
  }
}
