import { Migration } from "./base";

export class ReplaceHomeCourseWithClubMigration extends Migration {
  version = 48;
  description = "Replace home_course_id with home_club_id in player_profiles";

  async up(): Promise<void> {
    // Check if we already have home_club_id (migration already ran)
    if (await this.columnExists("player_profiles", "home_club_id")) {
      return;
    }

    // Step 1: Add home_club_id column
    await this.execute(`
      ALTER TABLE player_profiles ADD COLUMN home_club_id INTEGER REFERENCES clubs(id) ON DELETE SET NULL
    `);

    // Step 2: Migrate existing data - look up club_id from courses
    await this.execute(`
      UPDATE player_profiles
      SET home_club_id = (
        SELECT c.club_id FROM courses c WHERE c.id = player_profiles.home_course_id
      )
      WHERE home_course_id IS NOT NULL
    `);

    // Step 3: Recreate table without home_course_id (SQLite doesn't support DROP COLUMN)
    await this.execute(`
      CREATE TABLE player_profiles_new (
        player_id INTEGER PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
        display_name TEXT,
        bio TEXT,
        avatar_url TEXT,
        home_club_id INTEGER REFERENCES clubs(id) ON DELETE SET NULL,
        visibility TEXT NOT NULL DEFAULT 'public',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.execute(`
      INSERT INTO player_profiles_new (player_id, display_name, bio, avatar_url, home_club_id, visibility, created_at, updated_at)
      SELECT player_id, display_name, bio, avatar_url, home_club_id, visibility, created_at, updated_at
      FROM player_profiles
    `);

    await this.execute(`DROP TABLE player_profiles`);
    await this.execute(`ALTER TABLE player_profiles_new RENAME TO player_profiles`);
  }

  async down(): Promise<void> {
    // Would require recreating table with home_course_id
    // and reverse lookup from clubs to courses (ambiguous - one club can have multiple courses)
  }
}
