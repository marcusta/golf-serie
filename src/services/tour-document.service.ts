import { Database } from "bun:sqlite";
import type {
  CreateTourDocumentDto,
  TourDocument,
  UpdateTourDocumentDto,
} from "../types";

// ============================================================================
// Internal Types
// ============================================================================

interface DocumentTypeRow {
  type: string;
}

// ============================================================================
// Service Class
// ============================================================================

export class TourDocumentService {
  constructor(private db: Database) {}

  // ==========================================================================
  // Query Methods (private, single SQL statement)
  // ==========================================================================

  private findTourExists(tourId: number): boolean {
    const result = this.db
      .prepare("SELECT 1 FROM tours WHERE id = ?")
      .get(tourId);
    return !!result;
  }

  private insertDocumentRow(
    title: string,
    content: string,
    type: string,
    tourId: number
  ): TourDocument {
    return this.db
      .prepare(
        `
        INSERT INTO tour_documents (title, content, type, tour_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, strftime('%Y-%m-%d %H:%M:%S.%f', 'now'), strftime('%Y-%m-%d %H:%M:%S.%f', 'now'))
        RETURNING *
      `
      )
      .get(title, content, type, tourId) as TourDocument;
  }

  private findAllDocuments(): TourDocument[] {
    return this.db
      .prepare(
        `
        SELECT id, title, content, type, tour_id, created_at, updated_at
        FROM tour_documents
        ORDER BY strftime('%s.%f', created_at) DESC
      `
      )
      .all() as TourDocument[];
  }

  private findDocumentById(id: number): TourDocument | null {
    return this.db
      .prepare(
        `
        SELECT id, title, content, type, tour_id, created_at, updated_at
        FROM tour_documents
        WHERE id = ?
      `
      )
      .get(id) as TourDocument | null;
  }

  private findDocumentsByTour(tourId: number): TourDocument[] {
    return this.db
      .prepare(
        `
        SELECT id, title, content, type, tour_id, created_at, updated_at
        FROM tour_documents
        WHERE tour_id = ?
        ORDER BY type, title
      `
      )
      .all(tourId) as TourDocument[];
  }

  private findDocumentsByTourAndType(
    tourId: number,
    type: string
  ): TourDocument[] {
    return this.db
      .prepare(
        `
        SELECT id, title, content, type, tour_id, created_at, updated_at
        FROM tour_documents
        WHERE tour_id = ? AND type = ?
        ORDER BY title
      `
      )
      .all(tourId, type) as TourDocument[];
  }

  private updateDocumentRow(
    id: number,
    updates: string[],
    values: (string | number | null)[]
  ): TourDocument {
    return this.db
      .prepare(
        `
        UPDATE tour_documents
        SET ${updates.join(", ")}
        WHERE id = ?
        RETURNING *
      `
      )
      .get(...values) as TourDocument;
  }

  private deleteDocumentRow(id: number): void {
    this.db.prepare("DELETE FROM tour_documents WHERE id = ?").run(id);
  }

  private findDistinctTypesByTour(tourId: number): DocumentTypeRow[] {
    return this.db
      .prepare(
        `
        SELECT DISTINCT type
        FROM tour_documents
        WHERE tour_id = ?
        ORDER BY type
      `
      )
      .all(tourId) as DocumentTypeRow[];
  }

  // ==========================================================================
  // Logic Methods (private, no SQL)
  // ==========================================================================

  private validateCreateData(data: CreateTourDocumentDto): void {
    if (!data.title?.trim()) {
      throw new Error("Document title is required");
    }
    if (!data.content?.trim()) {
      throw new Error("Document content is required");
    }
    if (!data.tour_id) {
      throw new Error("Tour ID is required");
    }
  }

  private validateUpdateData(data: UpdateTourDocumentDto): void {
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

  private buildUpdateQuery(
    data: UpdateTourDocumentDto,
    id: number
  ): { updates: string[]; values: (string | number | null)[] } {
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

    updates.push("updated_at = strftime('%Y-%m-%d %H:%M:%S.%f', 'now')");
    values.push(id);

    return { updates, values };
  }

  private extractTypes(rows: DocumentTypeRow[]): string[] {
    return rows.map((r) => r.type);
  }

  // ==========================================================================
  // Public API Methods (orchestration)
  // ==========================================================================

  create(data: CreateTourDocumentDto): TourDocument {
    this.validateCreateData(data);

    if (!this.findTourExists(data.tour_id)) {
      throw new Error("Tour not found");
    }

    const type = data.type?.trim() || "general";

    return this.insertDocumentRow(
      data.title!.trim(),
      data.content!.trim(),
      type,
      data.tour_id
    );
  }

  findAll(): TourDocument[] {
    return this.findAllDocuments();
  }

  findById(id: number): TourDocument | null {
    return this.findDocumentById(id);
  }

  findByTourId(tourId: number): TourDocument[] {
    if (!this.findTourExists(tourId)) {
      throw new Error("Tour not found");
    }

    return this.findDocumentsByTour(tourId);
  }

  findByTourIdAndType(tourId: number, type: string): TourDocument[] {
    if (!this.findTourExists(tourId)) {
      throw new Error("Tour not found");
    }

    return this.findDocumentsByTourAndType(tourId, type.trim());
  }

  update(id: number, data: UpdateTourDocumentDto): TourDocument {
    const document = this.findById(id);
    if (!document) {
      throw new Error("Document not found");
    }

    this.validateUpdateData(data);

    const { updates, values } = this.buildUpdateQuery(data, id);

    if (updates.length === 1) {
      // Only updated_at was added, no actual changes
      return document;
    }

    return this.updateDocumentRow(id, updates, values);
  }

  delete(id: number): void {
    const document = this.findById(id);
    if (!document) {
      throw new Error("Document not found");
    }

    this.deleteDocumentRow(id);
  }

  getDocumentTypes(tourId: number): string[] {
    if (!this.findTourExists(tourId)) {
      throw new Error("Tour not found");
    }

    const rows = this.findDistinctTypesByTour(tourId);
    return this.extractTypes(rows);
  }
}
