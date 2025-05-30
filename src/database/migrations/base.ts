import { Database } from "bun:sqlite";

export abstract class Migration {
  abstract version: number;
  abstract description: string;

  constructor(protected db: Database) {}

  abstract up(): Promise<void>;
  abstract down(): Promise<void>;

  protected async execute(sql: string): Promise<void> {
    this.db.run(sql);
  }

  protected async columnExists(
    table: string,
    column: string
  ): Promise<boolean> {
    const stmt = this.db.prepare(
      `SELECT name FROM pragma_table_info(?) WHERE name = ?`
    );
    const result = stmt.get(table, column);
    return result !== null;
  }
}
