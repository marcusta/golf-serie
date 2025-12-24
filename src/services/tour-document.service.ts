import { Database } from "bun:sqlite";
import type {
  CreateTourDocumentDto,
  TourDocument,
  UpdateTourDocumentDto,
} from "../types";

export class TourDocumentService {
  constructor(private db: Database) {}

  async create(data: CreateTourDocumentDto): Promise<TourDocument> {
    if (!data.title?.trim()) {
      throw new Error("Document title is required");
    }
    if (!data.content?.trim()) {
      throw new Error("Document content is required");
    }
    if (!data.tour_id) {
      throw new Error("Tour ID is required");
    }

    // Verify tour exists
    const tourStmt = this.db.prepare("SELECT id FROM tours WHERE id = ?");
    const tour = tourStmt.get(data.tour_id);
    if (!tour) {
      throw new Error("Tour not found");
    }

    const type = data.type?.trim() || "general";

    const stmt = this.db.prepare(`
      INSERT INTO tour_documents (title, content, type, tour_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, strftime('%Y-%m-%d %H:%M:%S.%f', 'now'), strftime('%Y-%m-%d %H:%M:%S.%f', 'now'))
      RETURNING *
    `);

    const result = stmt.get(
      data.title.trim(),
      data.content.trim(),
      type,
      data.tour_id
    ) as TourDocument;

    return result;
  }

  async findAll(): Promise<TourDocument[]> {
    const stmt = this.db.prepare(`
      SELECT id, title, content, type, tour_id, created_at, updated_at
      FROM tour_documents
      ORDER BY strftime('%s.%f', created_at) DESC
    `);
    return stmt.all() as TourDocument[];
  }

  async findById(id: number): Promise<TourDocument | null> {
    const stmt = this.db.prepare(`
      SELECT id, title, content, type, tour_id, created_at, updated_at
      FROM tour_documents
      WHERE id = ?
    `);
    const result = stmt.get(id) as TourDocument | undefined;
    return result || null;
  }

  async findByTourId(tourId: number): Promise<TourDocument[]> {
    // Verify tour exists
    const tourStmt = this.db.prepare("SELECT id FROM tours WHERE id = ?");
    const tour = tourStmt.get(tourId);
    if (!tour) {
      throw new Error("Tour not found");
    }

    const stmt = this.db.prepare(`
      SELECT id, title, content, type, tour_id, created_at, updated_at
      FROM tour_documents
      WHERE tour_id = ?
      ORDER BY type, title
    `);
    return stmt.all(tourId) as TourDocument[];
  }

  async findByTourIdAndType(
    tourId: number,
    type: string
  ): Promise<TourDocument[]> {
    // Verify tour exists
    const tourStmt = this.db.prepare("SELECT id FROM tours WHERE id = ?");
    const tour = tourStmt.get(tourId);
    if (!tour) {
      throw new Error("Tour not found");
    }

    const stmt = this.db.prepare(`
      SELECT id, title, content, type, tour_id, created_at, updated_at
      FROM tour_documents
      WHERE tour_id = ? AND type = ?
      ORDER BY title
    `);
    return stmt.all(tourId, type.trim()) as TourDocument[];
  }

  async update(id: number, data: UpdateTourDocumentDto): Promise<TourDocument> {
    const document = await this.findById(id);
    if (!document) {
      throw new Error("Document not found");
    }

    if (data.title !== undefined && !data.title.trim()) {
      throw new Error("Document title cannot be empty");
    }
    if (data.content !== undefined && !data.content.trim()) {
      throw new Error("Document content cannot be empty");
    }
    if (data.type !== undefined && !data.type.trim()) {
      throw new Error("Document type cannot be empty");
    }

    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (data.title !== undefined) {
      updates.push("title = ?");
      values.push(data.title.trim());
    }

    if (data.content !== undefined) {
      updates.push("content = ?");
      values.push(data.content.trim());
    }

    if (data.type !== undefined) {
      updates.push("type = ?");
      values.push(data.type.trim());
    }

    if (updates.length === 0) {
      return document;
    }

    updates.push("updated_at = strftime('%Y-%m-%d %H:%M:%S.%f', 'now')");
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE tour_documents
      SET ${updates.join(", ")}
      WHERE id = ?
      RETURNING *
    `);

    const result = stmt.get(...values) as TourDocument;
    return result;
  }

  async delete(id: number): Promise<void> {
    const document = await this.findById(id);
    if (!document) {
      throw new Error("Document not found");
    }

    const stmt = this.db.prepare("DELETE FROM tour_documents WHERE id = ?");
    stmt.run(id);
  }

  async getDocumentTypes(tourId: number): Promise<string[]> {
    // Verify tour exists
    const tourStmt = this.db.prepare("SELECT id FROM tours WHERE id = ?");
    const tour = tourStmt.get(tourId);
    if (!tour) {
      throw new Error("Tour not found");
    }

    const stmt = this.db.prepare(`
      SELECT DISTINCT type
      FROM tour_documents
      WHERE tour_id = ?
      ORDER BY type
    `);
    const results = stmt.all(tourId) as { type: string }[];
    return results.map((r) => r.type);
  }
}
