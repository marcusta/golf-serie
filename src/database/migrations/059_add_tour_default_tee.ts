import { Migration } from "./base";

export class AddTourDefaultTeeMigration extends Migration {
  version = 59;
  description =
    "Add default_course_id and default_tee_id to tours for competition create defaults";

  async up(): Promise<void> {
    if (!(await this.columnExists("tours", "default_course_id"))) {
      await this.execute(`
        ALTER TABLE tours ADD COLUMN default_course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL
      `);
    }

    if (!(await this.columnExists("tours", "default_tee_id"))) {
      await this.execute(`
        ALTER TABLE tours ADD COLUMN default_tee_id INTEGER REFERENCES course_tees(id) ON DELETE SET NULL
      `);
    }
  }

  async down(): Promise<void> {
    console.warn("Down migration for tour default tee columns not supported");
  }
}
