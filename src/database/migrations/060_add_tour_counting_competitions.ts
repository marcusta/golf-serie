import { Migration } from "./base";

export class AddTourCountingCompetitionsMigration extends Migration {
  version = 60;
  description = "Add counting_competitions to tours for best-N standings totals";

  async up(): Promise<void> {
    if (!(await this.columnExists("tours", "counting_competitions"))) {
      await this.execute(`
        ALTER TABLE tours ADD COLUMN counting_competitions INTEGER NULL
      `);
    }
  }

  async down(): Promise<void> {
    console.warn("Down migration for counting_competitions column not supported");
  }
}
