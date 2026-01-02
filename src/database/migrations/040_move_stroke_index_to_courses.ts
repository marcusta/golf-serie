import { Migration } from "./base";

export class MoveStrokeIndexToCoursesMigration extends Migration {
  version = 40;
  description = "Move stroke_index from course_tees to courses table (stroke index is a course property, not tee-specific)";

  async up(): Promise<void> {
    // Add stroke_index column to courses table
    if (!(await this.columnExists("courses", "stroke_index"))) {
      await this.execute(
        "ALTER TABLE courses ADD COLUMN stroke_index TEXT"
      );
    }

    // Copy stroke_index from first tee of each course (they should all be the same)
    // Uses subquery to get stroke_index from the first tee that has one
    await this.execute(`
      UPDATE courses
      SET stroke_index = (
        SELECT ct.stroke_index
        FROM course_tees ct
        WHERE ct.course_id = courses.id
          AND ct.stroke_index IS NOT NULL
        LIMIT 1
      )
      WHERE EXISTS (
        SELECT 1 FROM course_tees ct
        WHERE ct.course_id = courses.id
          AND ct.stroke_index IS NOT NULL
      )
    `);

    // Note: We don't drop stroke_index from course_tees as SQLite doesn't support
    // DROP COLUMN easily. The column will be ignored by updated services.
    // Future cleanup can recreate the table without this column if needed.
  }

  async down(): Promise<void> {
    // Copy stroke_index back to course_tees (for rollback safety)
    await this.execute(`
      UPDATE course_tees
      SET stroke_index = (
        SELECT c.stroke_index
        FROM courses c
        WHERE c.id = course_tees.course_id
      )
      WHERE stroke_index IS NULL
    `);

    // Note: Can't drop column in SQLite easily, leaving it in place
    // The column will just be NULL/unused after rollback
  }
}
