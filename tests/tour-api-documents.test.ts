import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  cleanupTestDatabase,
  expectErrorResponse,
  expectJsonResponse,
  type MakeRequestFunction,
  setupTestDatabase,
} from "./test-helpers";

describe("Tours API - Document Endpoints", () => {
  let db: Database;
  let makeRequest: MakeRequestFunction;

  beforeEach(async () => {
    const setup = await setupTestDatabase();
    db = setup.db;
    makeRequest = setup.makeRequest;
  });

  afterEach(async () => {
    await cleanupTestDatabase(db);
  });

  // Helper to create an organizer user and tour (ORGANIZER can create tours)
  async function createOrganizerAndTour(
    email = "owner@test.com",
    tourName = "Test Tour",
    options: { visibility?: string } = {}
  ) {
    await makeRequest("/api/auth/register", "POST", {
      email,
      password: "password123",
    });
    db.prepare("UPDATE users SET role = 'ORGANIZER' WHERE email = ?").run(email);
    await makeRequest("/api/auth/login", "POST", {
      email,
      password: "password123",
    });

    const { visibility = "private" } = options;
    if (visibility === "public") {
      db.prepare(
        "INSERT INTO tours (name, owner_id, enrollment_mode, visibility) VALUES (?, (SELECT id FROM users WHERE email = ?), 'closed', 'public')"
      ).run(tourName, email);
      const tour = db
        .prepare("SELECT * FROM tours WHERE name = ?")
        .get(tourName);
      const user = db
        .prepare("SELECT id FROM users WHERE email = ?")
        .get(email) as { id: number };
      return { tour, userId: user.id };
    }

    const tourResponse = await makeRequest("/api/tours", "POST", {
      name: tourName,
    });
    const tour = await tourResponse.json();
    const user = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(email) as { id: number };
    return { tour, userId: user.id };
  }

  // Helper to create a document directly in db
  function createDocument(tourId: number, title: string, content: string, type = "general") {
    db.prepare(
      "INSERT INTO tour_documents (title, content, type, tour_id) VALUES (?, ?, ?, ?)"
    ).run(title, content, type, tourId);
    return db
      .prepare("SELECT * FROM tour_documents WHERE title = ?")
      .get(title) as { id: number; title: string; tour_id: number };
  }

  // Helper to login as different user
  async function loginAs(email: string, role: "ADMIN" | "PLAYER" = "PLAYER") {
    await makeRequest("/api/auth/register", "POST", {
      email,
      password: "password123",
    });
    if (role === "ADMIN") {
      db.prepare("UPDATE users SET role = 'ADMIN' WHERE email = ?").run(email);
    }
    await makeRequest("/api/auth/login", "POST", {
      email,
      password: "password123",
    });
    const user = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(email) as { id: number };
    return { userId: user.id };
  }

  describe("GET /api/tours/:id/documents - List documents", () => {
    test("should list documents for a public tour", async () => {
      const { tour } = await createOrganizerAndTour("admin@test.com", "Public Tour", { visibility: "public" });
      createDocument(tour.id, "Test Doc", "Content");

      const response = await makeRequest(`/api/tours/${tour.id}/documents`);

      expect(response.status).toBe(200);
      const documents = await expectJsonResponse(response);
      expect(documents.length).toBe(1);
      expect(documents[0].title).toBe("Test Doc");
    });

    test("should list documents for private tour if user is owner", async () => {
      const { tour } = await createOrganizerAndTour();
      createDocument(tour.id, "Private Doc", "Content");

      const response = await makeRequest(`/api/tours/${tour.id}/documents`);

      expect(response.status).toBe(200);
      const documents = await expectJsonResponse(response);
      expect(documents.length).toBe(1);
    });

    test("should return 404 for private tour if user cannot view", async () => {
      const { tour } = await createOrganizerAndTour();
      await loginAs("other@test.com", "PLAYER");

      const response = await makeRequest(`/api/tours/${tour.id}/documents`);

      expect(response.status).toBe(404);
    });
  });

  describe("GET /api/tours/:id/documents/:documentId - Get document", () => {
    test("should get a single document", async () => {
      const { tour } = await createOrganizerAndTour("admin@test.com", "Tour", { visibility: "public" });
      const doc = createDocument(tour.id, "Doc Title", "Doc Content");

      const response = await makeRequest(`/api/tours/${tour.id}/documents/${doc.id}`);

      expect(response.status).toBe(200);
      const document = await expectJsonResponse(response);
      expect(document.title).toBe("Doc Title");
      expect(document.content).toBe("Doc Content");
    });

    test("should return 404 if document not found", async () => {
      const { tour } = await createOrganizerAndTour("admin@test.com", "Tour", { visibility: "public" });

      const response = await makeRequest(`/api/tours/${tour.id}/documents/999`);

      expect(response.status).toBe(404);
    });

    test("should return 404 if document belongs to different tour", async () => {
      const { tour: tour1 } = await createOrganizerAndTour("admin@test.com", "Tour 1", { visibility: "public" });

      // Create tour2 directly
      db.prepare(
        "INSERT INTO tours (name, owner_id, enrollment_mode, visibility) VALUES (?, (SELECT id FROM users WHERE email = ?), 'closed', 'public')"
      ).run("Tour 2", "admin@test.com");
      const tour2 = db.prepare("SELECT * FROM tours WHERE name = ?").get("Tour 2") as { id: number };

      const doc = createDocument(tour2.id, "Doc in Tour 2", "Content");

      const response = await makeRequest(`/api/tours/${tour1.id}/documents/${doc.id}`);

      expect(response.status).toBe(404);
    });
  });

  describe("POST /api/tours/:id/documents - Create document", () => {
    test("should create a document", async () => {
      const { tour } = await createOrganizerAndTour();

      const response = await makeRequest(`/api/tours/${tour.id}/documents`, "POST", {
        title: "New Document",
        content: "Document content",
        type: "rules",
      });

      expect(response.status).toBe(201);
      const document = await expectJsonResponse(response);
      expect(document.title).toBe("New Document");
      expect(document.type).toBe("rules");
      expect(document.tour_id).toBe(tour.id);
    });

    test("should default type to general", async () => {
      const { tour } = await createOrganizerAndTour();

      const response = await makeRequest(`/api/tours/${tour.id}/documents`, "POST", {
        title: "New Document",
        content: "Document content",
      });

      expect(response.status).toBe(201);
      const document = await expectJsonResponse(response);
      expect(document.type).toBe("general");
    });

    test("should return 403 if user cannot manage tour", async () => {
      const { tour } = await createOrganizerAndTour();
      await loginAs("other@test.com", "PLAYER");

      const response = await makeRequest(`/api/tours/${tour.id}/documents`, "POST", {
        title: "New Document",
        content: "Content",
      });

      expect(response.status).toBe(403);
    });

    test("should return 400 if title is missing", async () => {
      const { tour } = await createOrganizerAndTour();

      const response = await makeRequest(`/api/tours/${tour.id}/documents`, "POST", {
        content: "Content only",
      });

      expect(response.status).toBe(400);
    });
  });

  describe("PUT /api/tours/:id/documents/:documentId - Update document", () => {
    test("should update a document", async () => {
      const { tour } = await createOrganizerAndTour();
      const doc = createDocument(tour.id, "Original", "Original content");

      const response = await makeRequest(`/api/tours/${tour.id}/documents/${doc.id}`, "PUT", {
        title: "Updated Title",
        content: "Updated content",
      });

      expect(response.status).toBe(200);
      const document = await expectJsonResponse(response);
      expect(document.title).toBe("Updated Title");
      expect(document.content).toBe("Updated content");
    });

    test("should return 403 if user cannot manage tour", async () => {
      const { tour } = await createOrganizerAndTour();
      const doc = createDocument(tour.id, "Doc", "Content");
      await loginAs("other@test.com", "PLAYER");

      const response = await makeRequest(`/api/tours/${tour.id}/documents/${doc.id}`, "PUT", {
        title: "New Title",
      });

      expect(response.status).toBe(403);
    });

    test("should return 404 if document not found", async () => {
      const { tour } = await createOrganizerAndTour();

      const response = await makeRequest(`/api/tours/${tour.id}/documents/999`, "PUT", {
        title: "New Title",
      });

      expect(response.status).toBe(404);
    });
  });

  describe("DELETE /api/tours/:id/documents/:documentId - Delete document", () => {
    test("should delete a document", async () => {
      const { tour } = await createOrganizerAndTour();
      const doc = createDocument(tour.id, "To Delete", "Content");

      const response = await makeRequest(`/api/tours/${tour.id}/documents/${doc.id}`, "DELETE");

      expect(response.status).toBe(200);

      // Verify deletion
      const deleted = db
        .prepare("SELECT id FROM tour_documents WHERE id = ?")
        .get(doc.id);
      expect(deleted).toBeFalsy();
    });

    test("should return 403 if user cannot manage tour", async () => {
      const { tour } = await createOrganizerAndTour();
      const doc = createDocument(tour.id, "Doc", "Content");
      await loginAs("other@test.com", "PLAYER");

      const response = await makeRequest(`/api/tours/${tour.id}/documents/${doc.id}`, "DELETE");

      expect(response.status).toBe(403);
    });

    test("should return 404 if document not found", async () => {
      const { tour } = await createOrganizerAndTour();

      const response = await makeRequest(`/api/tours/${tour.id}/documents/999`, "DELETE");

      expect(response.status).toBe(404);
    });
  });

  describe("GET /api/tours/:id/documents/types - List document types", () => {
    test("should list document types for a tour", async () => {
      const { tour } = await createOrganizerAndTour("admin@test.com", "Tour", { visibility: "public" });
      createDocument(tour.id, "Doc 1", "Content", "general");
      createDocument(tour.id, "Doc 2", "Content", "rules");

      const response = await makeRequest(`/api/tours/${tour.id}/documents/types`);

      expect(response.status).toBe(200);
      const types = await expectJsonResponse(response);
      expect(types).toContain("general");
      expect(types).toContain("rules");
    });

    test("should return empty array for tour with no documents", async () => {
      const { tour } = await createOrganizerAndTour("admin@test.com", "Tour", { visibility: "public" });

      const response = await makeRequest(`/api/tours/${tour.id}/documents/types`);

      expect(response.status).toBe(200);
      const types = await expectJsonResponse(response);
      expect(types).toEqual([]);
    });
  });

  describe("Landing document integration", () => {
    test("should set landing_document_id on tour update", async () => {
      const { tour } = await createOrganizerAndTour();
      const doc = createDocument(tour.id, "Landing Doc", "Welcome content");

      const response = await makeRequest(`/api/tours/${tour.id}`, "PUT", {
        landing_document_id: doc.id,
      });

      expect(response.status).toBe(200);
      const updated = await expectJsonResponse(response);
      expect(updated.landing_document_id).toBe(doc.id);
    });

    test("should reject landing_document_id from different tour", async () => {
      const { tour: tour1 } = await createOrganizerAndTour();

      // Create tour2 directly
      db.prepare(
        "INSERT INTO tours (name, owner_id, enrollment_mode, visibility) VALUES (?, (SELECT id FROM users WHERE email = ?), 'closed', 'private')"
      ).run("Tour 2", "owner@test.com");
      const tour2 = db.prepare("SELECT * FROM tours WHERE name = ?").get("Tour 2") as { id: number };

      const doc = createDocument(tour2.id, "Doc in Tour 2", "Content");

      const response = await makeRequest(`/api/tours/${tour1.id}`, "PUT", {
        landing_document_id: doc.id,
      });

      expect(response.status).toBe(400);
      const error = await expectJsonResponse(response);
      expect(error.error).toContain("same tour");
    });

    test("should clear landing_document_id with null", async () => {
      const { tour } = await createOrganizerAndTour();
      const doc = createDocument(tour.id, "Landing Doc", "Content");

      // Set landing document
      db.prepare("UPDATE tours SET landing_document_id = ? WHERE id = ?").run(doc.id, tour.id);

      // Clear it
      const response = await makeRequest(`/api/tours/${tour.id}`, "PUT", {
        landing_document_id: null,
      });

      expect(response.status).toBe(200);
      const updated = await expectJsonResponse(response);
      expect(updated.landing_document_id).toBeNull();
    });
  });

  describe("Banner image integration", () => {
    test("should set banner_image_url on tour create", async () => {
      await makeRequest("/api/auth/register", "POST", {
        email: "organizer@test.com",
        password: "password123",
      });
      db.prepare("UPDATE users SET role = 'ORGANIZER' WHERE email = ?").run("organizer@test.com");
      await makeRequest("/api/auth/login", "POST", {
        email: "organizer@test.com",
        password: "password123",
      });

      const response = await makeRequest("/api/tours", "POST", {
        name: "Tour with Banner",
        banner_image_url: "https://example.com/banner.jpg",
      });

      expect(response.status).toBe(201);
      const tour = await expectJsonResponse(response);
      expect(tour.banner_image_url).toBe("https://example.com/banner.jpg");
    });

    test("should update banner_image_url", async () => {
      const { tour } = await createOrganizerAndTour();

      const response = await makeRequest(`/api/tours/${tour.id}`, "PUT", {
        banner_image_url: "https://example.com/new-banner.jpg",
      });

      expect(response.status).toBe(200);
      const updated = await expectJsonResponse(response);
      expect(updated.banner_image_url).toBe("https://example.com/new-banner.jpg");
    });
  });
});
