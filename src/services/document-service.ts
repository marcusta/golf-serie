import { Database } from "bun:sqlite";
import type { CreateDocumentDto, Document, UpdateDocumentDto } from "../types";

export class DocumentService {
  constructor(private db: Database) {}

  async create(data: CreateDocumentDto): Promise<Document> {
    if (!data.title?.trim()) {
      throw new Error("Document title is required");
    }
    if (!data.content?.trim()) {
      throw new Error("Document content is required");
    }
    if (!data.type?.trim()) {
      throw new Error("Document type is required");
    }
    if (!data.series_id) {
      throw new Error("Series ID is required");
    }

    // Verify series exists
    const seriesStmt = this.db.prepare("SELECT id FROM series WHERE id = ?");
    const series = seriesStmt.get(data.series_id);
    if (!series) {
      throw new Error("Series not found");
    }

    try {
      const stmt = this.db.prepare(`
        INSERT INTO documents (title, content, type, series_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, strftime('%Y-%m-%d %H:%M:%S.%f', 'now'), strftime('%Y-%m-%d %H:%M:%S.%f', 'now'))
        RETURNING *
      `);

      const result = stmt.get(
        data.title.trim(),
        data.content.trim(),
        data.type.trim(),
        data.series_id
      ) as Document;

      return result;
    } catch (error) {
      throw error;
    }
  }

  async findAll(): Promise<Document[]> {
    const stmt = this.db.prepare(`
      SELECT id, title, content, type, series_id, created_at, updated_at
      FROM documents
      ORDER BY strftime('%s.%f', created_at) DESC
    `);
    return stmt.all() as Document[];
  }

  async findById(id: number): Promise<Document | null> {
    const stmt = this.db.prepare(`
      SELECT id, title, content, type, series_id, created_at, updated_at
      FROM documents
      WHERE id = ?
    `);
    const result = stmt.get(id) as Document | undefined;
    return result || null;
  }

  async findBySeriesId(seriesId: number): Promise<Document[]> {
    // Verify series exists
    const seriesStmt = this.db.prepare("SELECT id FROM series WHERE id = ?");
    const series = seriesStmt.get(seriesId);
    if (!series) {
      throw new Error("Series not found");
    }

    const stmt = this.db.prepare(`
      SELECT id, title, content, type, series_id, created_at, updated_at
      FROM documents
      WHERE series_id = ?
      ORDER BY type, title
    `);
    return stmt.all(seriesId) as Document[];
  }

  async findBySeriesIdAndType(
    seriesId: number,
    type: string
  ): Promise<Document[]> {
    // Verify series exists
    const seriesStmt = this.db.prepare("SELECT id FROM series WHERE id = ?");
    const series = seriesStmt.get(seriesId);
    if (!series) {
      throw new Error("Series not found");
    }

    const stmt = this.db.prepare(`
      SELECT id, title, content, type, series_id, created_at, updated_at
      FROM documents
      WHERE series_id = ? AND type = ?
      ORDER BY title
    `);
    return stmt.all(seriesId, type.trim()) as Document[];
  }

  async update(id: number, data: UpdateDocumentDto): Promise<Document> {
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
    const values: any[] = [];

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

    try {
      const stmt = this.db.prepare(`
        UPDATE documents
        SET ${updates.join(", ")}
        WHERE id = ?
        RETURNING *
      `);

      const result = stmt.get(...values) as Document;
      return result;
    } catch (error) {
      throw error;
    }
  }

  async delete(id: number): Promise<void> {
    const document = await this.findById(id);
    if (!document) {
      throw new Error("Document not found");
    }

    const stmt = this.db.prepare("DELETE FROM documents WHERE id = ?");
    stmt.run(id);
  }

  async getDocumentTypes(seriesId: number): Promise<string[]> {
    // Verify series exists
    const seriesStmt = this.db.prepare("SELECT id FROM series WHERE id = ?");
    const series = seriesStmt.get(seriesId);
    if (!series) {
      throw new Error("Series not found");
    }

    const stmt = this.db.prepare(`
      SELECT DISTINCT type
      FROM documents
      WHERE series_id = ?
      ORDER BY type
    `);
    const results = stmt.all(seriesId) as { type: string }[];
    return results.map((r) => r.type);
  }
}
