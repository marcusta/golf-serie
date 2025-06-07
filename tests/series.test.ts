import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  cleanupTestDatabase,
  expectErrorResponse,
  expectJsonResponse,
  type MakeRequestFunction,
  setupTestDatabase,
} from "./test-helpers";

describe("Series API", () => {
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

  describe("POST /api/series", () => {
    test("should create a new series with name and description", async () => {
      const seriesData = {
        name: "Summer Golf Series",
        description: "A competitive summer golf series",
      };

      const response = await makeRequest("/api/series", "POST", seriesData);
      expect(response.status).toBe(201);

      const series = await expectJsonResponse(response);
      expect(series.id).toBeTypeOf("number");
      expect(series.name).toBe(seriesData.name);
      expect(series.description).toBe(seriesData.description);
      expect(series.banner_image_url).toBeNull();
      expect(series.is_public).toBe(true); // Default value
      expect(series.created_at).toBeTypeOf("string");
      expect(series.updated_at).toBeTypeOf("string");
    });

    test("should create a series with all fields including banner and privacy", async () => {
      const seriesData = {
        name: "Private Championship",
        description: "An exclusive golf series",
        banner_image_url: "https://example.com/banner.jpg",
        is_public: false,
      };

      const response = await makeRequest("/api/series", "POST", seriesData);
      expect(response.status).toBe(201);

      const series = await expectJsonResponse(response);
      expect(series.name).toBe(seriesData.name);
      expect(series.description).toBe(seriesData.description);
      expect(series.banner_image_url).toBe(seriesData.banner_image_url);
      expect(series.is_public).toBe(false);
    });

    test("should create a series with only name (description optional)", async () => {
      const seriesData = {
        name: "Winter Championship",
      };

      const response = await makeRequest("/api/series", "POST", seriesData);
      expect(response.status).toBe(201);

      const series = await expectJsonResponse(response);
      expect(series.name).toBe(seriesData.name);
      expect(series.description).toBeNull();
      expect(series.banner_image_url).toBeNull();
      expect(series.is_public).toBe(true); // Default value
    });

    test("should return 400 when name is missing", async () => {
      const response = await makeRequest("/api/series", "POST", {});
      expectErrorResponse(response, 400);

      const error = await expectJsonResponse(response);
      expect(error.error).toBe("Series name is required");
    });

    test("should return 400 when name is empty", async () => {
      const response = await makeRequest("/api/series", "POST", {
        name: "   ",
      });
      expectErrorResponse(response, 400);

      const error = await expectJsonResponse(response);
      expect(error.error).toBe("Series name is required");
    });

    test("should return 400 when series name already exists", async () => {
      const seriesData = { name: "Duplicate Series" };

      // Create first series
      await makeRequest("/api/series", "POST", seriesData);

      // Try to create duplicate
      const response = await makeRequest("/api/series", "POST", seriesData);
      expectErrorResponse(response, 400);

      const error = await expectJsonResponse(response);
      expect(error.error).toBe("Series name must be unique");
    });
  });

  describe("GET /api/series", () => {
    test("should return empty array when no series exist", async () => {
      const response = await makeRequest("/api/series");
      expect(response.status).toBe(200);

      const series = await expectJsonResponse(response);
      expect(series).toEqual([]);
    });

    test("should return all series created", async () => {
      // Create multiple series with small delays
      await makeRequest("/api/series", "POST", {
        name: "Series A",
        description: "First series",
      });
      await new Promise((resolve) => setTimeout(resolve, 100));
      await makeRequest("/api/series", "POST", {
        name: "Series B",
        description: "Second series",
      });
      await new Promise((resolve) => setTimeout(resolve, 100));
      await makeRequest("/api/series", "POST", { name: "Series C" });

      const response = await makeRequest("/api/series");
      expect(response.status).toBe(200);

      const series = await expectJsonResponse(response);
      expect(series).toHaveLength(3);
    });
  });

  describe("GET /api/series/:id", () => {
    test("should return series by id", async () => {
      const seriesData = {
        name: "Test Series",
        description: "Test description",
      };
      const createResponse = await makeRequest(
        "/api/series",
        "POST",
        seriesData
      );
      const createdSeries = await expectJsonResponse(createResponse);

      const response = await makeRequest(`/api/series/${createdSeries.id}`);
      expect(response.status).toBe(200);

      const series = await expectJsonResponse(response);
      expect(series.id).toBe(createdSeries.id);
      expect(series.name).toBe(seriesData.name);
      expect(series.description).toBe(seriesData.description);
    });

    test("should return 404 when series not found", async () => {
      const response = await makeRequest("/api/series/999");
      expectErrorResponse(response, 404);

      const error = await expectJsonResponse(response);
      expect(error.error).toBe("Series not found");
    });
  });

  describe("PUT /api/series/:id", () => {
    test("should update series name and description", async () => {
      const createResponse = await makeRequest("/api/series", "POST", {
        name: "Original Series",
        description: "Original description",
      });
      const createdSeries = await expectJsonResponse(createResponse);

      const updateData = {
        name: "Updated Series",
        description: "Updated description",
      };

      const response = await makeRequest(
        `/api/series/${createdSeries.id}`,
        "PUT",
        updateData
      );
      expect(response.status).toBe(200);

      // Add a small delay to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 100));

      const series = await expectJsonResponse(response);
      expect(series.name).toBe(updateData.name);
      expect(series.description).toBe(updateData.description);
      expect(series.updated_at).not.toBe(createdSeries.updated_at);
    });

    test("should update only name", async () => {
      const createResponse = await makeRequest("/api/series", "POST", {
        name: "Original Series",
        description: "Original description",
      });
      const createdSeries = await expectJsonResponse(createResponse);

      const response = await makeRequest(
        `/api/series/${createdSeries.id}`,
        "PUT",
        {
          name: "Updated Name Only",
        }
      );
      expect(response.status).toBe(200);

      const series = await expectJsonResponse(response);
      expect(series.name).toBe("Updated Name Only");
      expect(series.description).toBe("Original description");
    });

    test("should update description to null", async () => {
      const createResponse = await makeRequest("/api/series", "POST", {
        name: "Test Series",
        description: "Original description",
      });
      const createdSeries = await expectJsonResponse(createResponse);

      const response = await makeRequest(
        `/api/series/${createdSeries.id}`,
        "PUT",
        {
          description: null,
        }
      );
      expect(response.status).toBe(200);

      const series = await expectJsonResponse(response);
      expect(series.description).toBeNull();
    });

    test("should return 400 when name is empty", async () => {
      const createResponse = await makeRequest("/api/series", "POST", {
        name: "Test Series",
      });
      const createdSeries = await expectJsonResponse(createResponse);

      const response = await makeRequest(
        `/api/series/${createdSeries.id}`,
        "PUT",
        { name: "   " }
      );
      expectErrorResponse(response, 400);

      const error = await expectJsonResponse(response);
      expect(error.error).toBe("Series name cannot be empty");
    });

    test("should return 400 when updating to duplicate name", async () => {
      await makeRequest("/api/series", "POST", { name: "Existing Series" });
      const createResponse = await makeRequest("/api/series", "POST", {
        name: "Test Series",
      });
      const createdSeries = await expectJsonResponse(createResponse);

      const response = await makeRequest(
        `/api/series/${createdSeries.id}`,
        "PUT",
        {
          name: "Existing Series",
        }
      );
      expectErrorResponse(response, 400);

      const error = await expectJsonResponse(response);
      expect(error.error).toBe("Series name must be unique");
    });

    test("should return 400 when series not found", async () => {
      const response = await makeRequest("/api/series/999", "PUT", {
        name: "Updated",
      });
      expectErrorResponse(response, 400);

      const error = await expectJsonResponse(response);
      expect(error.error).toBe("Series not found");
    });
  });

  describe("DELETE /api/series/:id", () => {
    test("should delete series", async () => {
      const createResponse = await makeRequest("/api/series", "POST", {
        name: "To Delete",
      });
      const createdSeries = await expectJsonResponse(createResponse);

      const response = await makeRequest(
        `/api/series/${createdSeries.id}`,
        "DELETE"
      );
      expect(response.status).toBe(204);

      // Verify it's deleted
      const getResponse = await makeRequest(`/api/series/${createdSeries.id}`);
      expectErrorResponse(getResponse, 404);
    });

    test("should return 404 when series not found", async () => {
      const response = await makeRequest("/api/series/999", "DELETE");
      expectErrorResponse(response, 404);

      const error = await expectJsonResponse(response);
      expect(error.error).toBe("Series not found");
    });
  });

  describe("GET /api/series/:id/competitions", () => {
    test("should return empty array when series has no competitions", async () => {
      const createResponse = await makeRequest("/api/series", "POST", {
        name: "Test Series",
      });
      const series = await expectJsonResponse(createResponse);

      const response = await makeRequest(
        `/api/series/${series.id}/competitions`
      );
      expect(response.status).toBe(200);

      const competitions = await expectJsonResponse(response);
      expect(competitions).toEqual([]);
    });

    test("should return 400 when series not found", async () => {
      const response = await makeRequest("/api/series/999/competitions");
      expectErrorResponse(response, 400);

      const error = await expectJsonResponse(response);
      expect(error.error).toBe("Series not found");
    });
  });

  describe("GET /api/series/:id/teams", () => {
    test("should return empty array when series has no teams", async () => {
      const createResponse = await makeRequest("/api/series", "POST", {
        name: "Test Series",
      });
      const series = await expectJsonResponse(createResponse);

      const response = await makeRequest(`/api/series/${series.id}/teams`);
      expect(response.status).toBe(200);

      const teams = await expectJsonResponse(response);
      expect(teams).toEqual([]);
    });

    test("should return 400 when series not found", async () => {
      const response = await makeRequest("/api/series/999/teams");
      expectErrorResponse(response, 400);

      const error = await expectJsonResponse(response);
      expect(error.error).toBe("Series not found");
    });
  });

  describe("GET /api/series/public", () => {
    test("should return only public series", async () => {
      // Create public series
      await makeRequest("/api/series", "POST", {
        name: "Public Series 1",
        is_public: true,
      });
      await makeRequest("/api/series", "POST", {
        name: "Public Series 2",
        is_public: true,
      });

      // Create private series
      await makeRequest("/api/series", "POST", {
        name: "Private Series",
        is_public: false,
      });

      const response = await makeRequest("/api/series/public");
      expect(response.status).toBe(200);

      const series = await expectJsonResponse(response);
      expect(series).toHaveLength(2);
      expect(series.every((s: any) => s.is_public === true)).toBe(true);
      expect(series.map((s: any) => s.name)).toContain("Public Series 1");
      expect(series.map((s: any) => s.name)).toContain("Public Series 2");
      expect(series.map((s: any) => s.name)).not.toContain("Private Series");
    });

    test("should return empty array when no public series exist", async () => {
      // Create only private series
      await makeRequest("/api/series", "POST", {
        name: "Private Only",
        is_public: false,
      });

      const response = await makeRequest("/api/series/public");
      expect(response.status).toBe(200);

      const series = await expectJsonResponse(response);
      expect(series).toEqual([]);
    });
  });

  describe("GET /api/series/:id/standings", () => {
    test("should return empty standings when series has no competitions", async () => {
      const createResponse = await makeRequest("/api/series", "POST", {
        name: "Test Series",
      });
      const series = await expectJsonResponse(createResponse);

      const response = await makeRequest(`/api/series/${series.id}/standings`);
      expect(response.status).toBe(200);

      const standings = await expectJsonResponse(response);
      expect(standings.series.id).toBe(series.id);
      expect(standings.series.name).toBe("Test Series");
      expect(standings.team_standings).toEqual([]);
      expect(standings.total_competitions).toBe(0);
    });

    test("should return 400 when series not found", async () => {
      const response = await makeRequest("/api/series/999/standings");
      expectErrorResponse(response, 400);

      const error = await expectJsonResponse(response);
      expect(error.error).toBe("Series not found");
    });
  });

  describe("PUT /api/series/:id - New Fields", () => {
    test("should update banner_image_url and is_public", async () => {
      const createResponse = await makeRequest("/api/series", "POST", {
        name: "Test Series",
        is_public: true,
      });
      const createdSeries = await expectJsonResponse(createResponse);

      const updateData = {
        banner_image_url: "https://example.com/new-banner.jpg",
        is_public: false,
      };

      const response = await makeRequest(
        `/api/series/${createdSeries.id}`,
        "PUT",
        updateData
      );
      expect(response.status).toBe(200);

      const series = await expectJsonResponse(response);
      expect(series.banner_image_url).toBe(updateData.banner_image_url);
      expect(series.is_public).toBe(false);
    });

    test("should update banner_image_url to null", async () => {
      const createResponse = await makeRequest("/api/series", "POST", {
        name: "Test Series",
        banner_image_url: "https://example.com/banner.jpg",
      });
      const createdSeries = await expectJsonResponse(createResponse);

      const response = await makeRequest(
        `/api/series/${createdSeries.id}`,
        "PUT",
        {
          banner_image_url: null,
        }
      );
      expect(response.status).toBe(200);

      const series = await expectJsonResponse(response);
      expect(series.banner_image_url).toBeNull();
    });
  });
});
