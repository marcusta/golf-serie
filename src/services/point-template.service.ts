import { Database } from "bun:sqlite";

export type PointTemplate = {
  id: number;
  name: string;
  points_structure: string; // JSON string
  created_by: number | null;
  created_at: string;
  updated_at: string;
};

export type PointsStructure = {
  [position: string]: number; // e.g., {"1": 100, "2": 80, "default": 10}
};

export type CreatePointTemplateInput = {
  name: string;
  points_structure: PointsStructure;
};

export type UpdatePointTemplateInput = {
  name?: string;
  points_structure?: PointsStructure;
};

export class PointTemplateService {
  constructor(private db: Database) {}

  findAll(): PointTemplate[] {
    return this.db
      .prepare("SELECT * FROM point_templates ORDER BY name ASC")
      .all() as PointTemplate[];
  }

  findById(id: number): PointTemplate | null {
    return this.db
      .prepare("SELECT * FROM point_templates WHERE id = ?")
      .get(id) as PointTemplate | null;
  }

  create(data: CreatePointTemplateInput, createdBy: number): PointTemplate {
    const pointsStructureJson = JSON.stringify(data.points_structure);

    const result = this.db
      .prepare(
        `
      INSERT INTO point_templates (name, points_structure, created_by)
      VALUES (?, ?, ?)
      RETURNING *
    `
      )
      .get(data.name, pointsStructureJson, createdBy) as PointTemplate;

    return result;
  }

  update(id: number, data: UpdatePointTemplateInput): PointTemplate {
    const template = this.findById(id);
    if (!template) {
      throw new Error("Point template not found");
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push("name = ?");
      values.push(data.name);
    }

    if (data.points_structure !== undefined) {
      updates.push("points_structure = ?");
      values.push(JSON.stringify(data.points_structure));
    }

    if (updates.length === 0) {
      return template;
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    const result = this.db
      .prepare(
        `
      UPDATE point_templates 
      SET ${updates.join(", ")}
      WHERE id = ?
      RETURNING *
    `
      )
      .get(...values) as PointTemplate;

    return result;
  }

  delete(id: number): void {
    const result = this.db
      .prepare("DELETE FROM point_templates WHERE id = ?")
      .run(id);
    if (result.changes === 0) {
      throw new Error("Point template not found");
    }
  }

  calculatePoints(templateId: number, position: number): number {
    const template = this.findById(templateId);
    if (!template) {
      throw new Error("Point template not found");
    }

    const structure: PointsStructure = JSON.parse(template.points_structure);

    // Try exact position match
    if (structure[position.toString()]) {
      return structure[position.toString()];
    }

    // Fall back to default
    return structure["default"] || 0;
  }
}

export function createPointTemplateService(db: Database) {
  return new PointTemplateService(db);
}
