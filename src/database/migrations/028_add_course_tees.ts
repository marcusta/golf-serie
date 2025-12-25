import { Migration } from "./base";

export class AddCourseTeesMigration extends Migration {
  version = 28;
  description = "Add course_tees table for tee box ratings and stroke index";

  async up(): Promise<void> {
    // Create course_tees table
    // Each course can have multiple tee sets (Championship, Men, Ladies, etc.)
    // with different course ratings, slope ratings, and stroke indices
    await this.execute(`
      CREATE TABLE IF NOT EXISTS course_tees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        color TEXT,
        course_rating REAL NOT NULL,
        slope_rating INTEGER NOT NULL DEFAULT 113,
        stroke_index TEXT,
        pars TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(course_id, name)
      )
    `);

    // Create index on course_id for faster lookups
    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_course_tees_course_id ON course_tees(course_id)
    `);
  }

  async down(): Promise<void> {
    await this.execute("DROP TABLE IF EXISTS course_tees");
  }
}
