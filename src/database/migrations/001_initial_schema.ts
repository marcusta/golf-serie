import { Migration } from "./base";

export class InitialSchemaMigration extends Migration {
  version = 1;
  description = "Initial database schema";

  async up(): Promise<void> {
    // Create courses table
    await this.execute(`
      CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        pars TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create teams table
    await this.execute(`
      CREATE TABLE IF NOT EXISTS teams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create competitions table
    await this.execute(`
      CREATE TABLE IF NOT EXISTS competitions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        date TEXT NOT NULL,
        course_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id)
      )
    `);

    // Create tee_times table
    await this.execute(`
      CREATE TABLE IF NOT EXISTS tee_times (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        teetime TEXT NOT NULL,
        competition_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (competition_id) REFERENCES competitions(id)
      )
    `);

    // Create participants table
    await this.execute(`
      CREATE TABLE IF NOT EXISTS participants (
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
  }

  async down(): Promise<void> {
    await this.execute("DROP TABLE IF EXISTS participants");
    await this.execute("DROP TABLE IF EXISTS tee_times");
    await this.execute("DROP TABLE IF EXISTS competitions");
    await this.execute("DROP TABLE IF EXISTS teams");
    await this.execute("DROP TABLE IF EXISTS courses");
  }
}
