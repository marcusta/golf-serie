import { Migration } from "./base";

export class AddCompetitionTeeIdMigration extends Migration {
  version = 29;
  description = "Add tee_id to competitions for linking to specific tee box";

  async up(): Promise<void> {
    // Add tee_id column to competitions
    // Links to a specific tee box (course_tees) for handicap calculations
    // NULL means use course defaults (backward compatible)
    if (!(await this.columnExists("competitions", "tee_id"))) {
      await this.execute(`
        ALTER TABLE competitions ADD COLUMN tee_id INTEGER REFERENCES course_tees(id) ON DELETE SET NULL
      `);
    }
  }

  async down(): Promise<void> {
    console.warn("Down migration for tee_id column not supported");
  }
}
