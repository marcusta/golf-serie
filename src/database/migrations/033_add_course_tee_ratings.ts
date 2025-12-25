import { Migration } from "./base";

export class AddCourseTeeRatingsMigration extends Migration {
  version = 33;
  description =
    "Add course_tee_ratings table for gender-specific course/slope ratings";

  async up(): Promise<void> {
    // Create course_tee_ratings table
    // Each tee box can have different ratings for men and women (WHS requirement)
    // Example: Yellow tees at Landeryd Classic:
    //   - Men: CR 67.2, SR 118
    //   - Women: CR 69.5, SR 122
    await this.execute(`
      CREATE TABLE IF NOT EXISTS course_tee_ratings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tee_id INTEGER NOT NULL REFERENCES course_tees(id) ON DELETE CASCADE,
        gender TEXT NOT NULL CHECK(gender IN ('men', 'women')),
        course_rating REAL NOT NULL,
        slope_rating INTEGER NOT NULL DEFAULT 113,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tee_id, gender)
      )
    `);

    // Create index on tee_id for faster lookups
    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_course_tee_ratings_tee_id ON course_tee_ratings(tee_id)
    `);

    // Migrate existing data from course_tees to course_tee_ratings
    // Assume existing ratings are for men (most common default in legacy data)
    await this.execute(`
      INSERT INTO course_tee_ratings (tee_id, gender, course_rating, slope_rating)
      SELECT id, 'men', course_rating, slope_rating
      FROM course_tees
      WHERE course_rating IS NOT NULL
    `);
  }

  async down(): Promise<void> {
    await this.execute("DROP TABLE IF EXISTS course_tee_ratings");
  }
}
