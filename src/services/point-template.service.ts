import { Database } from "bun:sqlite";
import { safeParseJson } from "../utils/parsing";

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

  // ─────────────────────────────────────────────────────────────────
  // Logic Methods (no SQL)
  // ─────────────────────────────────────────────────────────────────

  private getPointsForPosition(structure: PointsStructure, position: number): number {
    // Try exact position match
    if (structure[position.toString()]) {
      return structure[position.toString()];
    }
    // Fall back to default
    return structure["default"] || 0;
  }

  // ─────────────────────────────────────────────────────────────────
  // Query Methods (single SQL statement each)
  // ─────────────────────────────────────────────────────────────────

  private insertPointTemplate(
    name: string,
    pointsStructureJson: string,
    createdBy: number
  ): PointTemplate {
    return this.db
      .prepare(
        `INSERT INTO point_templates (name, points_structure, created_by)
         VALUES (?, ?, ?)
         RETURNING *`
      )
      .get(name, pointsStructureJson, createdBy) as PointTemplate;
  }

  private updatePointTemplateRow(
    id: number,
    name: string,
    pointsStructureJson: string
  ): PointTemplate {
    return this.db
      .prepare(
        `UPDATE point_templates
         SET name = ?, points_structure = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?
         RETURNING *`
      )
      .get(name, pointsStructureJson, id) as PointTemplate;
  }

  // ─────────────────────────────────────────────────────────────────
  // Public API Methods (orchestration only)
  // ─────────────────────────────────────────────────────────────────

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
    return this.insertPointTemplate(data.name, pointsStructureJson, createdBy);
  }

  update(id: number, data: UpdatePointTemplateInput): PointTemplate {
    const template = this.findById(id);
    if (!template) {
      throw new Error("Point template not found");
    }

    // No changes requested - return existing template
    if (data.name === undefined && data.points_structure === undefined) {
      return template;
    }

    // Merge with existing values for unchanged fields
    const name = data.name !== undefined ? data.name : template.name;
    const pointsStructureJson =
      data.points_structure !== undefined
        ? JSON.stringify(data.points_structure)
        : template.points_structure;

    return this.updatePointTemplateRow(id, name, pointsStructureJson);
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

    const structure = safeParseJson<PointsStructure>(
      template.points_structure,
      "points_structure"
    );

    return this.getPointsForPosition(structure, position);
  }
}

export function createPointTemplateService(db: Database) {
  return new PointTemplateService(db);
}
