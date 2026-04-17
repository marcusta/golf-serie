import { Migration } from "./base";

export class AddCompetitionResultsEnrollmentIdMigration extends Migration {
  version = 53;
  description =
    "Add enrollment_id to competition_results so name-only enrollments can be stored";

  async up(): Promise<void> {
    if (await this.columnExists("competition_results", "enrollment_id")) {
      return;
    }

    await this.execute(`
      ALTER TABLE competition_results
      ADD COLUMN enrollment_id INTEGER REFERENCES tour_enrollments(id) ON DELETE SET NULL
    `);

    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_competition_results_enrollment
      ON competition_results(enrollment_id)
    `);
  }

  async down(): Promise<void> {
    // No rollback - schema-only addition
  }
}
