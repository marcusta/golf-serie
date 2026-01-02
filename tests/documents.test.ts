import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type {
  CreateDocumentDto,
  Document,
  UpdateDocumentDto,
} from "../src/types";
import {
  cleanupTestDatabase,
  expectErrorResponse,
  expectJsonResponse,
  setupTestDatabase,
  type MakeRequestFunction,
} from "./test-helpers";

describe("Documents API", () => {
  let db: Database;
  let makeRequest: MakeRequestFunction;
  let seriesId: number;

  // Helper to create an admin user and authenticate
  async function loginAsAdmin(email = "admin@test.com") {
    await makeRequest("/api/auth/register", "POST", {
      email,
      password: "password123",
    });
    db.prepare("UPDATE users SET role = 'ADMIN' WHERE email = ?").run(email);
    await makeRequest("/api/auth/login", "POST", {
      email,
      password: "password123",
    });
  }

  beforeEach(async () => {
    const setup = await setupTestDatabase();
    db = setup.db;
    makeRequest = setup.makeRequest;

    // Authenticate before creating series
    await loginAsAdmin();

    // Create a test series for document tests
    const seriesResponse = await makeRequest("/api/series", "POST", {
      name: "Test Series",
      description: "A test series for document testing",
    });
    const series = await expectJsonResponse(seriesResponse);
    seriesId = series.id;
  });

  afterEach(async () => {
    await cleanupTestDatabase(db);
  });

  describe("POST /api/documents", () => {
    test("should create a new document", async () => {
      const documentData: CreateDocumentDto = {
        title: "About the Series",
        content: "This is information about the series",
        type: "about",
        series_id: seriesId,
      };

      const response = await makeRequest(
        "/api/documents",
        "POST",
        documentData
      );
      expect(response.status).toBe(201);

      const document = await expectJsonResponse(response);
      expect(document.title).toBe(documentData.title);
      expect(document.content).toBe(documentData.content);
      expect(document.type).toBe(documentData.type);
      expect(document.series_id).toBe(documentData.series_id);
      expect(document.id).toBeNumber();
      expect(document.created_at).toBeString();
      expect(document.updated_at).toBeString();
    });

    test("should fail when title is missing", async () => {
      const documentData = {
        content: "Some content",
        type: "about",
        series_id: seriesId,
      };

      const response = await makeRequest(
        "/api/documents",
        "POST",
        documentData
      );
      expectErrorResponse(response, 400);

      const error = await expectJsonResponse(response);
      expect(error.error).toBe("Document title is required");
    });

    test("should fail when series does not exist", async () => {
      const documentData: CreateDocumentDto = {
        title: "Test Document",
        content: "Some content",
        type: "about",
        series_id: 99999,
      };

      const response = await makeRequest(
        "/api/documents",
        "POST",
        documentData
      );
      expectErrorResponse(response, 400);

      const error = await expectJsonResponse(response);
      expect(error.error).toBe("Series not found");
    });
  });

  describe("GET /api/documents/:id", () => {
    test("should return a document by id", async () => {
      const createResponse = await makeRequest("/api/documents", "POST", {
        title: "Test Document",
        content: "Test content",
        type: "about",
        series_id: seriesId,
      });
      const createdDocument = await expectJsonResponse(createResponse);

      const response = await makeRequest(
        `/api/documents/${createdDocument.id}`
      );
      expect(response.status).toBe(200);

      const document = await expectJsonResponse(response);
      expect(document.id).toBe(createdDocument.id);
      expect(document.title).toBe("Test Document");
    });

    test("should return 404 when document does not exist", async () => {
      const response = await makeRequest("/api/documents/99999");
      expectErrorResponse(response, 404);

      const error = await expectJsonResponse(response);
      expect(error.error).toBe("Document not found");
    });
  });

  describe("PUT /api/documents/:id", () => {
    let documentId: number;

    beforeEach(async () => {
      const createResponse = await makeRequest("/api/documents", "POST", {
        title: "Original Title",
        content: "Original content",
        type: "about",
        series_id: seriesId,
      });
      const document = await expectJsonResponse(createResponse);
      documentId = document.id;
    });

    test("should update document title", async () => {
      const updateData: UpdateDocumentDto = {
        title: "Updated Title",
      };

      const response = await makeRequest(
        `/api/documents/${documentId}`,
        "PUT",
        updateData
      );
      expect(response.status).toBe(200);

      const document = await expectJsonResponse(response);
      expect(document.title).toBe("Updated Title");
      expect(document.content).toBe("Original content");
    });

    test("should return 404 when document does not exist", async () => {
      const updateData: UpdateDocumentDto = {
        title: "New Title",
      };

      const response = await makeRequest(
        "/api/documents/99999",
        "PUT",
        updateData
      );
      expectErrorResponse(response, 400);

      const error = await expectJsonResponse(response);
      expect(error.error).toBe("Document not found");
    });
  });

  describe("DELETE /api/documents/:id", () => {
    test("should delete a document", async () => {
      const createResponse = await makeRequest("/api/documents", "POST", {
        title: "Test Document",
        content: "Test content",
        type: "about",
        series_id: seriesId,
      });
      const document = await expectJsonResponse(createResponse);

      const response = await makeRequest(
        `/api/documents/${document.id}`,
        "DELETE"
      );
      expect(response.status).toBe(204);

      // Verify document is deleted
      const getResponse = await makeRequest(`/api/documents/${document.id}`);
      expectErrorResponse(getResponse, 404);
    });
  });

  describe("GET /api/series/:seriesId/documents", () => {
    test("should return documents for a series", async () => {
      await makeRequest("/api/documents", "POST", {
        title: "About Document",
        content: "About content",
        type: "about",
        series_id: seriesId,
      });

      await makeRequest("/api/documents", "POST", {
        title: "Rules Document",
        content: "Rules content",
        type: "rules",
        series_id: seriesId,
      });

      const response = await makeRequest(`/api/series/${seriesId}/documents`);
      expect(response.status).toBe(200);

      const documents = await expectJsonResponse(response);
      expect(documents).toHaveLength(2);
      documents.forEach((doc: Document) =>
        expect(doc.series_id).toBe(seriesId)
      );
    });

    test("should return 400 when series does not exist", async () => {
      const response = await makeRequest("/api/series/99999/documents");
      expectErrorResponse(response, 400);

      const error = await expectJsonResponse(response);
      expect(error.error).toBe("Series not found");
    });
  });

  describe("GET /api/series/:seriesId/documents/type/:type", () => {
    beforeEach(async () => {
      // Create documents of different types
      await makeRequest("/api/documents", "POST", {
        title: "About Document",
        content: "About content",
        type: "about",
        series_id: seriesId,
      });

      await makeRequest("/api/documents", "POST", {
        title: "Rules Document",
        content: "Rules content",
        type: "rules",
        series_id: seriesId,
      });

      await makeRequest("/api/documents", "POST", {
        title: "Another About Document",
        content: "More about content",
        type: "about",
        series_id: seriesId,
      });
    });

    test("should return documents of specific type for series", async () => {
      const response = await makeRequest(
        `/api/series/${seriesId}/documents/type/about`
      );
      expect(response.status).toBe(200);

      const documents = await expectJsonResponse(response);
      expect(documents).toHaveLength(2);
      documents.forEach((doc: Document) => {
        expect(doc.type).toBe("about");
        expect(doc.series_id).toBe(seriesId);
      });
    });

    test("should return empty array when no documents of type exist", async () => {
      const response = await makeRequest(
        `/api/series/${seriesId}/documents/type/history`
      );
      expect(response.status).toBe(200);

      const documents = await expectJsonResponse(response);
      expect(documents).toHaveLength(0);
    });
  });

  describe("GET /api/series/:seriesId/documents/types", () => {
    test("should return available document types for series", async () => {
      // Create documents of different types
      await makeRequest("/api/documents", "POST", {
        title: "About Document",
        content: "About content",
        type: "about",
        series_id: seriesId,
      });

      await makeRequest("/api/documents", "POST", {
        title: "Rules Document",
        content: "Rules content",
        type: "rules",
        series_id: seriesId,
      });

      await makeRequest("/api/documents", "POST", {
        title: "History Document",
        content: "History content",
        type: "history",
        series_id: seriesId,
      });

      const response = await makeRequest(
        `/api/series/${seriesId}/documents/types`
      );
      expect(response.status).toBe(200);

      const types = await expectJsonResponse(response);
      expect(types).toHaveLength(3);
      expect(types).toEqual(["about", "history", "rules"]); // Should be ordered alphabetically
    });

    test("should return empty array when series has no documents", async () => {
      const response = await makeRequest(
        `/api/series/${seriesId}/documents/types`
      );
      expect(response.status).toBe(200);

      const types = await expectJsonResponse(response);
      expect(types).toHaveLength(0);
    });
  });

  describe("POST /api/series/:seriesId/documents", () => {
    test("should create a new document for series", async () => {
      const documentData = {
        title: "Series Document",
        content: "This is a series-specific document",
      };

      const response = await makeRequest(
        `/api/series/${seriesId}/documents`,
        "POST",
        documentData
      );
      expect(response.status).toBe(201);

      const document = await expectJsonResponse(response);
      expect(document.title).toBe(documentData.title);
      expect(document.content).toBe(documentData.content);
      expect(document.series_id).toBe(seriesId);
      expect(document.type).toBe("general"); // Default type
      expect(document.id).toBeNumber();
      expect(document.created_at).toBeString();
      expect(document.updated_at).toBeString();
    });

    test("should fail when series does not exist", async () => {
      const documentData = {
        title: "Test Document",
        content: "Some content",
      };

      const response = await makeRequest(
        "/api/series/99999/documents",
        "POST",
        documentData
      );
      expectErrorResponse(response, 400);

      const error = await expectJsonResponse(response);
      expect(error.error).toBe("Series not found");
    });
  });

  describe("PUT /api/series/:seriesId/documents/:documentId", () => {
    let documentId: number;

    beforeEach(async () => {
      const createResponse = await makeRequest(
        `/api/series/${seriesId}/documents`,
        "POST",
        {
          title: "Original Title",
          content: "Original content",
        }
      );
      const document = await expectJsonResponse(createResponse);
      documentId = document.id;
    });

    test("should update document title", async () => {
      const updateData = {
        title: "Updated Title",
      };

      const response = await makeRequest(
        `/api/series/${seriesId}/documents/${documentId}`,
        "PUT",
        updateData
      );
      expect(response.status).toBe(200);

      const document = await expectJsonResponse(response);
      expect(document.title).toBe("Updated Title");
      expect(document.content).toBe("Original content");
    });

    test("should return 404 when document does not exist", async () => {
      const updateData = {
        title: "New Title",
      };

      const response = await makeRequest(
        `/api/series/${seriesId}/documents/99999`,
        "PUT",
        updateData
      );
      expectErrorResponse(response, 404);

      const error = await expectJsonResponse(response);
      expect(error.error).toBe("Document not found");
    });

    test("should return 400 when document does not belong to series", async () => {
      // Create another series
      const otherSeriesResponse = await makeRequest("/api/series", "POST", {
        name: "Other Series",
      });
      const otherSeries = await expectJsonResponse(otherSeriesResponse);

      const updateData = {
        title: "New Title",
      };

      const response = await makeRequest(
        `/api/series/${otherSeries.id}/documents/${documentId}`,
        "PUT",
        updateData
      );
      expectErrorResponse(response, 400);

      const error = await expectJsonResponse(response);
      expect(error.error).toBe("Document does not belong to this series");
    });
  });

  describe("DELETE /api/series/:seriesId/documents/:documentId", () => {
    test("should delete a document", async () => {
      const createResponse = await makeRequest(
        `/api/series/${seriesId}/documents`,
        "POST",
        {
          title: "Test Document",
          content: "Test content",
        }
      );
      const document = await expectJsonResponse(createResponse);

      const response = await makeRequest(
        `/api/series/${seriesId}/documents/${document.id}`,
        "DELETE"
      );
      expect(response.status).toBe(204);

      // Verify document is deleted
      const getResponse = await makeRequest(`/api/documents/${document.id}`);
      expectErrorResponse(getResponse, 404);
    });

    test("should return 404 when document does not exist", async () => {
      const response = await makeRequest(
        `/api/series/${seriesId}/documents/99999`,
        "DELETE"
      );
      expectErrorResponse(response, 404);

      const error = await expectJsonResponse(response);
      expect(error.error).toBe("Document not found");
    });

    test("should return 400 when document does not belong to series", async () => {
      // Create another series
      const otherSeriesResponse = await makeRequest("/api/series", "POST", {
        name: "Other Series",
      });
      const otherSeries = await expectJsonResponse(otherSeriesResponse);

      // Create document for first series
      const createResponse = await makeRequest(
        `/api/series/${seriesId}/documents`,
        "POST",
        {
          title: "Test Document",
          content: "Test content",
        }
      );
      const document = await expectJsonResponse(createResponse);

      // Try to delete from different series
      const response = await makeRequest(
        `/api/series/${otherSeries.id}/documents/${document.id}`,
        "DELETE"
      );
      expectErrorResponse(response, 400);

      const error = await expectJsonResponse(response);
      expect(error.error).toBe("Document does not belong to this series");
    });
  });
});
