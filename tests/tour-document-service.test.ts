import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createTestDatabase } from "../src/database/db";
import { TourDocumentService } from "../src/services/tour-document.service";

describe("TourDocumentService", () => {
  let db: Database;
  let service: TourDocumentService;

  // Helper to create a user
  const createUser = (
    email: string,
    role: string = "ADMIN"
  ): { id: number; email: string; role: string } => {
    db.prepare(
      "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)"
    ).run(email, "hash", role);
    return db
      .prepare("SELECT id, email, role FROM users WHERE email = ?")
      .get(email) as { id: number; email: string; role: string };
  };

  // Helper to create a tour
  const createTour = (name: string, ownerId: number): { id: number } => {
    db.prepare(
      "INSERT INTO tours (name, owner_id, enrollment_mode, visibility) VALUES (?, ?, 'closed', 'private')"
    ).run(name, ownerId);
    return db
      .prepare("SELECT id FROM tours WHERE name = ?")
      .get(name) as { id: number };
  };

  beforeEach(async () => {
    db = await createTestDatabase();
    service = new TourDocumentService(db);
  });

  afterEach(() => {
    db.close();
  });

  describe("create", () => {
    test("should create a document with required fields", async () => {
      const admin = createUser("admin@test.com");
      const tour = createTour("Test Tour", admin.id);

      const document = await service.create({
        title: "Tour Rules",
        content: "# Rules\n\nThese are the tour rules.",
        tour_id: tour.id,
      });

      expect(document.id).toBeGreaterThan(0);
      expect(document.title).toBe("Tour Rules");
      expect(document.content).toBe("# Rules\n\nThese are the tour rules.");
      expect(document.type).toBe("general");
      expect(document.tour_id).toBe(tour.id);
    });

    test("should create a document with custom type", async () => {
      const admin = createUser("admin@test.com");
      const tour = createTour("Test Tour", admin.id);

      const document = await service.create({
        title: "Scoring Guide",
        content: "How to score.",
        type: "scoring",
        tour_id: tour.id,
      });

      expect(document.type).toBe("scoring");
    });

    test("should throw if title is empty", async () => {
      const admin = createUser("admin@test.com");
      const tour = createTour("Test Tour", admin.id);

      expect(() =>
        service.create({
          title: "",
          content: "Content",
          tour_id: tour.id,
        })
      ).toThrow("Document title is required");
    });

    test("should throw if content is empty", async () => {
      const admin = createUser("admin@test.com");
      const tour = createTour("Test Tour", admin.id);

      expect(() =>
        service.create({
          title: "Title",
          content: "",
          tour_id: tour.id,
        })
      ).toThrow("Document content is required");
    });

    test("should throw if tour does not exist", async () => {
      expect(() =>
        service.create({
          title: "Title",
          content: "Content",
          tour_id: 999,
        })
      ).toThrow("Tour not found");
    });

    test("should trim title and content", async () => {
      const admin = createUser("admin@test.com");
      const tour = createTour("Test Tour", admin.id);

      const document = await service.create({
        title: "  Trimmed Title  ",
        content: "  Trimmed Content  ",
        tour_id: tour.id,
      });

      expect(document.title).toBe("Trimmed Title");
      expect(document.content).toBe("Trimmed Content");
    });
  });

  describe("findById", () => {
    test("should find document by id", async () => {
      const admin = createUser("admin@test.com");
      const tour = createTour("Test Tour", admin.id);
      const created = await service.create({
        title: "Test Doc",
        content: "Test content",
        tour_id: tour.id,
      });

      const found = await service.findById(created.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.title).toBe("Test Doc");
    });

    test("should return null for non-existent id", async () => {
      const found = await service.findById(999);
      expect(found).toBeNull();
    });
  });

  describe("findByTourId", () => {
    test("should find all documents for a tour", async () => {
      const admin = createUser("admin@test.com");
      const tour = createTour("Test Tour", admin.id);

      await service.create({
        title: "Doc 1",
        content: "Content 1",
        tour_id: tour.id,
      });
      await service.create({
        title: "Doc 2",
        content: "Content 2",
        tour_id: tour.id,
      });

      const documents = await service.findByTourId(tour.id);

      expect(documents.length).toBe(2);
    });

    test("should return empty array for tour with no documents", async () => {
      const admin = createUser("admin@test.com");
      const tour = createTour("Test Tour", admin.id);

      const documents = await service.findByTourId(tour.id);

      expect(documents).toEqual([]);
    });

    test("should throw if tour does not exist", async () => {
      expect(() => service.findByTourId(999)).toThrow("Tour not found");
    });

    test("should order by type and title", async () => {
      const admin = createUser("admin@test.com");
      const tour = createTour("Test Tour", admin.id);

      await service.create({
        title: "Z Document",
        content: "Content",
        type: "rules",
        tour_id: tour.id,
      });
      await service.create({
        title: "A Document",
        content: "Content",
        type: "general",
        tour_id: tour.id,
      });
      await service.create({
        title: "B Document",
        content: "Content",
        type: "general",
        tour_id: tour.id,
      });

      const documents = await service.findByTourId(tour.id);

      expect(documents[0].type).toBe("general");
      expect(documents[0].title).toBe("A Document");
      expect(documents[1].type).toBe("general");
      expect(documents[1].title).toBe("B Document");
      expect(documents[2].type).toBe("rules");
    });
  });

  describe("findByTourIdAndType", () => {
    test("should filter documents by type", async () => {
      const admin = createUser("admin@test.com");
      const tour = createTour("Test Tour", admin.id);

      await service.create({
        title: "General Doc",
        content: "Content",
        type: "general",
        tour_id: tour.id,
      });
      await service.create({
        title: "Rules Doc",
        content: "Content",
        type: "rules",
        tour_id: tour.id,
      });

      const rulesDocuments = await service.findByTourIdAndType(
        tour.id,
        "rules"
      );

      expect(rulesDocuments.length).toBe(1);
      expect(rulesDocuments[0].title).toBe("Rules Doc");
    });

    test("should throw if tour does not exist", async () => {
      expect(() => service.findByTourIdAndType(999, "general")).toThrow(
        "Tour not found"
      );
    });
  });

  describe("update", () => {
    test("should update document title", async () => {
      const admin = createUser("admin@test.com");
      const tour = createTour("Test Tour", admin.id);
      const doc = await service.create({
        title: "Original Title",
        content: "Content",
        tour_id: tour.id,
      });

      const updated = await service.update(doc.id, { title: "Updated Title" });

      expect(updated.title).toBe("Updated Title");
      expect(updated.content).toBe("Content");
    });

    test("should update document content", async () => {
      const admin = createUser("admin@test.com");
      const tour = createTour("Test Tour", admin.id);
      const doc = await service.create({
        title: "Title",
        content: "Original Content",
        tour_id: tour.id,
      });

      const updated = await service.update(doc.id, {
        content: "Updated Content",
      });

      expect(updated.content).toBe("Updated Content");
    });

    test("should update document type", async () => {
      const admin = createUser("admin@test.com");
      const tour = createTour("Test Tour", admin.id);
      const doc = await service.create({
        title: "Title",
        content: "Content",
        type: "general",
        tour_id: tour.id,
      });

      const updated = await service.update(doc.id, { type: "rules" });

      expect(updated.type).toBe("rules");
    });

    test("should throw if document not found", async () => {
      expect(() => service.update(999, { title: "New Title" })).toThrow(
        "Document not found"
      );
    });

    test("should throw if title is empty", async () => {
      const admin = createUser("admin@test.com");
      const tour = createTour("Test Tour", admin.id);
      const doc = await service.create({
        title: "Title",
        content: "Content",
        tour_id: tour.id,
      });

      expect(() => service.update(doc.id, { title: "" })).toThrow(
        "Document title cannot be empty"
      );
    });

    test("should throw if content is empty", async () => {
      const admin = createUser("admin@test.com");
      const tour = createTour("Test Tour", admin.id);
      const doc = await service.create({
        title: "Title",
        content: "Content",
        tour_id: tour.id,
      });

      expect(() => service.update(doc.id, { content: "" })).toThrow(
        "Document content cannot be empty"
      );
    });

    test("should return document unchanged if no updates provided", async () => {
      const admin = createUser("admin@test.com");
      const tour = createTour("Test Tour", admin.id);
      const doc = await service.create({
        title: "Title",
        content: "Content",
        tour_id: tour.id,
      });

      const updated = await service.update(doc.id, {});

      expect(updated.title).toBe("Title");
      expect(updated.content).toBe("Content");
    });
  });

  describe("delete", () => {
    test("should delete a document", async () => {
      const admin = createUser("admin@test.com");
      const tour = createTour("Test Tour", admin.id);
      const doc = await service.create({
        title: "Title",
        content: "Content",
        tour_id: tour.id,
      });

      await service.delete(doc.id);

      const found = await service.findById(doc.id);
      expect(found).toBeNull();
    });

    test("should throw if document not found", async () => {
      expect(() => service.delete(999)).toThrow("Document not found");
    });
  });

  describe("getDocumentTypes", () => {
    test("should return distinct document types for a tour", async () => {
      const admin = createUser("admin@test.com");
      const tour = createTour("Test Tour", admin.id);

      await service.create({
        title: "Doc 1",
        content: "Content",
        type: "general",
        tour_id: tour.id,
      });
      await service.create({
        title: "Doc 2",
        content: "Content",
        type: "rules",
        tour_id: tour.id,
      });
      await service.create({
        title: "Doc 3",
        content: "Content",
        type: "general",
        tour_id: tour.id,
      });

      const types = await service.getDocumentTypes(tour.id);

      expect(types).toEqual(["general", "rules"]);
    });

    test("should return empty array for tour with no documents", async () => {
      const admin = createUser("admin@test.com");
      const tour = createTour("Test Tour", admin.id);

      const types = await service.getDocumentTypes(tour.id);

      expect(types).toEqual([]);
    });

    test("should throw if tour does not exist", async () => {
      expect(() => service.getDocumentTypes(999)).toThrow("Tour not found");
    });
  });

  describe("cascade delete behavior", () => {
    test("should delete documents when tour is deleted", async () => {
      const admin = createUser("admin@test.com");
      const tour = createTour("Test Tour", admin.id);
      const doc = await service.create({
        title: "Title",
        content: "Content",
        tour_id: tour.id,
      });

      // Delete the tour
      db.prepare("DELETE FROM tours WHERE id = ?").run(tour.id);

      // Document should be deleted via cascade
      const found = await service.findById(doc.id);
      expect(found).toBeNull();
    });
  });
});
