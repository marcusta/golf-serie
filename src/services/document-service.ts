import { Database } from "bun:sqlite";
import type { CreateDocumentDto, Document, UpdateDocumentDto } from "../types";

export class DocumentService {
  constructor(private db: Database) {}

  // ─────────────────────────────────────────────────────────────────
  // Logic Methods (no SQL)
  // ─────────────────────────────────────────────────────────────────

  private validateCreateDocumentData(data: CreateDocumentDto): void {
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
  }

  private validateUpdateDocumentData(data: UpdateDocumentDto): void {
    if (data.title !== undefined && !data.title.trim()) {
      throw new Error("Document title cannot be empty");
    }
    if (data.content !== undefined && !data.content.trim()) {
      throw new Error("Document content cannot be empty");
    }
    if (data.type !== undefined && !data.type.trim()) {
      throw new Error("Document type cannot be empty");
    }
  }

  private extractTypes(rows: { type: string }[]): string[] {
    return rows.map((r) => r.type);
  }

  // ─────────────────────────────────────────────────────────────────
  // Query Methods (single SQL statement each)
  // ─────────────────────────────────────────────────────────────────

  private findSeriesExists(id: number): boolean {
    const stmt = this.db.prepare("SELECT id FROM series WHERE id = ?");
    return stmt.get(id) !== null;
  }

  private insertDocument(data: CreateDocumentDto): Document {
    const stmt = this.db.prepare(`
      INSERT INTO documents (title, content, type, series_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, strftime('%Y-%m-%d %H:%M:%S.%f', 'now'), strftime('%Y-%m-%d %H:%M:%S.%f', 'now'))
      RETURNING *
    `);
    return stmt.get(
      data.title.trim(),
      data.content.trim(),
      data.type.trim(),
      data.series_id
    ) as Document;
  }

  private findDocumentsBySeries(seriesId: number): Document[] {
    const stmt = this.db.prepare(`
      SELECT id, title, content, type, series_id, created_at, updated_at
      FROM documents
      WHERE series_id = ?
      ORDER BY type, title
    `);
    return stmt.all(seriesId) as Document[];
  }

  private findDocumentsBySeriesAndType(seriesId: number, type: string): Document[] {
    const stmt = this.db.prepare(`
      SELECT id, title, content, type, series_id, created_at, updated_at
      FROM documents
      WHERE series_id = ? AND type = ?
      ORDER BY title
    `);
    return stmt.all(seriesId, type.trim()) as Document[];
  }

  private findDistinctTypesBySeries(seriesId: number): { type: string }[] {
    const stmt = this.db.prepare(`
      SELECT DISTINCT type
      FROM documents
      WHERE series_id = ?
      ORDER BY type
    `);
    return stmt.all(seriesId) as { type: string }[];
  }

  private updateDocumentRow(
    id: number,
    title: string,
    content: string,
    type: string
  ): Document {
    const stmt = this.db.prepare(`
      UPDATE documents
      SET title = ?, content = ?, type = ?, updated_at = strftime('%Y-%m-%d %H:%M:%S.%f', 'now')
      WHERE id = ?
      RETURNING *
    `);
    return stmt.get(title, content, type, id) as Document;
  }

  private deleteDocumentRow(id: number): void {
    const stmt = this.db.prepare("DELETE FROM documents WHERE id = ?");
    stmt.run(id);
  }

  // ─────────────────────────────────────────────────────────────────
  // Public API Methods (orchestration only)
  // ─────────────────────────────────────────────────────────────────

  async create(data: CreateDocumentDto): Promise<Document> {
    this.validateCreateDocumentData(data);

    if (!this.findSeriesExists(data.series_id)) {
      throw new Error("Series not found");
    }

    return this.insertDocument(data);
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
    if (!this.findSeriesExists(seriesId)) {
      throw new Error("Series not found");
    }
    return this.findDocumentsBySeries(seriesId);
  }

  async findBySeriesIdAndType(seriesId: number, type: string): Promise<Document[]> {
    if (!this.findSeriesExists(seriesId)) {
      throw new Error("Series not found");
    }
    return this.findDocumentsBySeriesAndType(seriesId, type);
  }

  async update(id: number, data: UpdateDocumentDto): Promise<Document> {
    const document = await this.findById(id);
    if (!document) {
      throw new Error("Document not found");
    }

    this.validateUpdateDocumentData(data);

    // No changes requested - return existing document
    if (
      data.title === undefined &&
      data.content === undefined &&
      data.type === undefined
    ) {
      return document;
    }

    // Merge with existing values for unchanged fields
    const title = data.title !== undefined ? data.title.trim() : document.title;
    const content = data.content !== undefined ? data.content.trim() : document.content;
    const type = data.type !== undefined ? data.type.trim() : document.type;

    return this.updateDocumentRow(id, title, content, type);
  }

  async delete(id: number): Promise<void> {
    const document = await this.findById(id);
    if (!document) {
      throw new Error("Document not found");
    }
    this.deleteDocumentRow(id);
  }

  async getDocumentTypes(seriesId: number): Promise<string[]> {
    if (!this.findSeriesExists(seriesId)) {
      throw new Error("Series not found");
    }
    const rows = this.findDistinctTypesBySeries(seriesId);
    return this.extractTypes(rows);
  }
}
