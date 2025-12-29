import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { createTestDatabase } from "../src/database/db";
import { CompetitionCategoryTeeService } from "../src/services/competition-category-tee.service";
import { CourseService } from "../src/services/course-service";
import { CourseTeeService } from "../src/services/course-tee.service";
import { Database } from "bun:sqlite";

describe("CompetitionCategoryTeeService", () => {
  let db: Database;
  let categoryTeeService: CompetitionCategoryTeeService;
  let courseService: CourseService;
  let courseTeeService: CourseTeeService;
  let tourId: number;
  let courseId: number;
  let competitionId: number;
  let category1Id: number;
  let category2Id: number;
  let tee1Id: number;
  let tee2Id: number;

  beforeEach(async () => {
    db = await createTestDatabase();
    categoryTeeService = new CompetitionCategoryTeeService(db);
    courseService = new CourseService(db);
    courseTeeService = new CourseTeeService(db);

    // Create a test course
    const course = await courseService.create({ name: "Test Course" });
    courseId = course.id;
    await courseService.updateHoles(
      courseId,
      [4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4]
    );

    // Create tees for the course
    const tee1 = courseTeeService.create(courseId, {
      name: "Men",
      color: "white",
      course_rating: 72.3,
      slope_rating: 128,
    });
    tee1Id = tee1.id;

    const tee2 = courseTeeService.create(courseId, {
      name: "Ladies",
      color: "red",
      course_rating: 70.5,
      slope_rating: 120,
    });
    tee2Id = tee2.id;

    // Create a test user
    db.run(
      "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)",
      ["owner@test.com", "hash", "user"]
    );
    const userId = db
      .query<{ id: number }, []>("SELECT last_insert_rowid() as id")
      .get()!.id;

    // Create a test tour
    db.run(
      "INSERT INTO tours (name, owner_id, enrollment_mode, visibility, scoring_mode) VALUES (?, ?, ?, ?, ?)",
      ["Test Tour", userId, "closed", "private", "gross"]
    );
    tourId = db
      .query<{ id: number }, []>("SELECT last_insert_rowid() as id")
      .get()!.id;

    // Create categories for the tour
    db.run(
      "INSERT INTO tour_categories (tour_id, name, sort_order) VALUES (?, ?, ?)",
      [tourId, "Category A", 1]
    );
    category1Id = db
      .query<{ id: number }, []>("SELECT last_insert_rowid() as id")
      .get()!.id;

    db.run(
      "INSERT INTO tour_categories (tour_id, name, sort_order) VALUES (?, ?, ?)",
      [tourId, "Category B", 2]
    );
    category2Id = db
      .query<{ id: number }, []>("SELECT last_insert_rowid() as id")
      .get()!.id;

    // Create a test competition linked to the tour
    db.run(
      "INSERT INTO competitions (name, date, course_id, tour_id, points_multiplier, venue_type, start_mode) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ["Test Competition", "2024-06-15", courseId, tourId, 1, "outdoor", "scheduled"]
    );
    competitionId = db
      .query<{ id: number }, []>("SELECT last_insert_rowid() as id")
      .get()!.id;
  });

  afterEach(() => {
    db.close();
  });

  describe("getByCompetition", () => {
    test("should return empty array when no mappings exist", () => {
      const mappings = categoryTeeService.getByCompetition(competitionId);
      expect(mappings).toEqual([]);
    });

    test("should return all mappings with joined category and tee names", () => {
      // Insert mappings directly for testing
      db.run(
        "INSERT INTO competition_category_tees (competition_id, category_id, tee_id) VALUES (?, ?, ?)",
        [competitionId, category1Id, tee1Id]
      );
      db.run(
        "INSERT INTO competition_category_tees (competition_id, category_id, tee_id) VALUES (?, ?, ?)",
        [competitionId, category2Id, tee2Id]
      );

      const mappings = categoryTeeService.getByCompetition(competitionId);

      expect(mappings.length).toBe(2);
      expect(mappings[0].category_name).toBe("Category A");
      expect(mappings[0].tee_name).toBe("Men");
      expect(mappings[0].tee_color).toBe("white");
      expect(mappings[1].category_name).toBe("Category B");
      expect(mappings[1].tee_name).toBe("Ladies");
      expect(mappings[1].tee_color).toBe("red");
    });

    test("should return mappings sorted by category sort_order", () => {
      // Create category with lower sort order
      db.run(
        "INSERT INTO tour_categories (tour_id, name, sort_order) VALUES (?, ?, ?)",
        [tourId, "Category Z First", 0]
      );
      const categoryZId = db
        .query<{ id: number }, []>("SELECT last_insert_rowid() as id")
        .get()!.id;

      db.run(
        "INSERT INTO competition_category_tees (competition_id, category_id, tee_id) VALUES (?, ?, ?)",
        [competitionId, category2Id, tee2Id]
      );
      db.run(
        "INSERT INTO competition_category_tees (competition_id, category_id, tee_id) VALUES (?, ?, ?)",
        [competitionId, categoryZId, tee1Id]
      );
      db.run(
        "INSERT INTO competition_category_tees (competition_id, category_id, tee_id) VALUES (?, ?, ?)",
        [competitionId, category1Id, tee1Id]
      );

      const mappings = categoryTeeService.getByCompetition(competitionId);

      expect(mappings.length).toBe(3);
      expect(mappings[0].category_name).toBe("Category Z First");
      expect(mappings[1].category_name).toBe("Category A");
      expect(mappings[2].category_name).toBe("Category B");
    });
  });

  describe("setForCompetition", () => {
    test("should create new mappings", () => {
      const mappings = categoryTeeService.setForCompetition(competitionId, [
        { categoryId: category1Id, teeId: tee1Id },
        { categoryId: category2Id, teeId: tee2Id },
      ]);

      expect(mappings.length).toBe(2);
      expect(mappings[0].category_id).toBe(category1Id);
      expect(mappings[0].tee_id).toBe(tee1Id);
      expect(mappings[1].category_id).toBe(category2Id);
      expect(mappings[1].tee_id).toBe(tee2Id);
    });

    test("should replace existing mappings", () => {
      // Create initial mappings
      categoryTeeService.setForCompetition(competitionId, [
        { categoryId: category1Id, teeId: tee1Id },
      ]);

      // Replace with new mappings
      const mappings = categoryTeeService.setForCompetition(competitionId, [
        { categoryId: category1Id, teeId: tee2Id }, // Changed tee
        { categoryId: category2Id, teeId: tee1Id }, // Added new
      ]);

      expect(mappings.length).toBe(2);
      expect(mappings[0].category_id).toBe(category1Id);
      expect(mappings[0].tee_id).toBe(tee2Id); // Changed
      expect(mappings[1].category_id).toBe(category2Id);
    });

    test("should clear all mappings when empty array provided", () => {
      // Create initial mappings
      categoryTeeService.setForCompetition(competitionId, [
        { categoryId: category1Id, teeId: tee1Id },
      ]);

      // Clear mappings
      const mappings = categoryTeeService.setForCompetition(competitionId, []);

      expect(mappings).toEqual([]);

      // Verify cleared
      const remaining = categoryTeeService.getByCompetition(competitionId);
      expect(remaining).toEqual([]);
    });

    test("should throw error for non-existent competition", () => {
      expect(() =>
        categoryTeeService.setForCompetition(9999, [
          { categoryId: category1Id, teeId: tee1Id },
        ])
      ).toThrow("Competition not found");
    });

    test("should throw error for non-tour competition", () => {
      // Create a competition without tour_id
      db.run(
        "INSERT INTO competitions (name, date, course_id, points_multiplier, venue_type, start_mode) VALUES (?, ?, ?, ?, ?, ?)",
        ["Non-Tour Comp", "2024-06-20", courseId, 1, "outdoor", "scheduled"]
      );
      const nonTourCompId = db
        .query<{ id: number }, []>("SELECT last_insert_rowid() as id")
        .get()!.id;

      expect(() =>
        categoryTeeService.setForCompetition(nonTourCompId, [
          { categoryId: category1Id, teeId: tee1Id },
        ])
      ).toThrow("Category-tee mappings are only valid for tour competitions");
    });

    test("should throw error for category not belonging to tour", () => {
      // Create another tour with its own category
      db.run(
        "INSERT INTO tours (name, owner_id, enrollment_mode, visibility, scoring_mode) VALUES (?, ?, ?, ?, ?)",
        ["Other Tour", 1, "closed", "private", "gross"]
      );
      const otherTourId = db
        .query<{ id: number }, []>("SELECT last_insert_rowid() as id")
        .get()!.id;

      db.run(
        "INSERT INTO tour_categories (tour_id, name, sort_order) VALUES (?, ?, ?)",
        [otherTourId, "Other Category", 1]
      );
      const otherCategoryId = db
        .query<{ id: number }, []>("SELECT last_insert_rowid() as id")
        .get()!.id;

      expect(() =>
        categoryTeeService.setForCompetition(competitionId, [
          { categoryId: otherCategoryId, teeId: tee1Id },
        ])
      ).toThrow(`Category ${otherCategoryId} does not belong to this tour`);
    });

    test("should throw error for tee not belonging to competition course", async () => {
      // Create another course with a tee
      const otherCourse = await courseService.create({ name: "Other Course" });
      await courseService.updateHoles(
        otherCourse.id,
        [4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4]
      );
      const otherTee = courseTeeService.create(otherCourse.id, {
        name: "Other Tee",
        course_rating: 71.0,
      });

      expect(() =>
        categoryTeeService.setForCompetition(competitionId, [
          { categoryId: category1Id, teeId: otherTee.id },
        ])
      ).toThrow(
        `Tee ${otherTee.id} does not belong to the competition's course`
      );
    });
  });

  describe("deleteForCompetition", () => {
    test("should delete all mappings for a competition", () => {
      // Create mappings
      categoryTeeService.setForCompetition(competitionId, [
        { categoryId: category1Id, teeId: tee1Id },
        { categoryId: category2Id, teeId: tee2Id },
      ]);

      // Delete
      categoryTeeService.deleteForCompetition(competitionId);

      const mappings = categoryTeeService.getByCompetition(competitionId);
      expect(mappings).toEqual([]);
    });

    test("should not throw for competition with no mappings", () => {
      expect(() =>
        categoryTeeService.deleteForCompetition(competitionId)
      ).not.toThrow();
    });
  });

  describe("getTeeForCategory", () => {
    test("should return tee_id for mapped category", () => {
      categoryTeeService.setForCompetition(competitionId, [
        { categoryId: category1Id, teeId: tee1Id },
        { categoryId: category2Id, teeId: tee2Id },
      ]);

      const result1 = categoryTeeService.getTeeForCategory(
        competitionId,
        category1Id
      );
      const result2 = categoryTeeService.getTeeForCategory(
        competitionId,
        category2Id
      );

      expect(result1).toBe(tee1Id);
      expect(result2).toBe(tee2Id);
    });

    test("should return null for unmapped category", () => {
      const result = categoryTeeService.getTeeForCategory(
        competitionId,
        category1Id
      );
      expect(result).toBeNull();
    });
  });

  describe("cascade delete", () => {
    test("should delete mappings when competition is deleted", () => {
      // Create mappings
      categoryTeeService.setForCompetition(competitionId, [
        { categoryId: category1Id, teeId: tee1Id },
      ]);

      // Verify mapping exists
      let mappings = categoryTeeService.getByCompetition(competitionId);
      expect(mappings.length).toBe(1);

      // Delete competition
      db.run("DELETE FROM competitions WHERE id = ?", [competitionId]);

      // Verify mapping is deleted
      const count = db
        .query<{ count: number }, [number]>(
          "SELECT COUNT(*) as count FROM competition_category_tees WHERE competition_id = ?"
        )
        .get(competitionId);
      expect(count!.count).toBe(0);
    });

    test("should delete mappings when category is deleted", () => {
      // Create mappings
      categoryTeeService.setForCompetition(competitionId, [
        { categoryId: category1Id, teeId: tee1Id },
        { categoryId: category2Id, teeId: tee2Id },
      ]);

      // Delete one category
      db.run("DELETE FROM tour_categories WHERE id = ?", [category1Id]);

      // Verify only one mapping remains
      const mappings = categoryTeeService.getByCompetition(competitionId);
      expect(mappings.length).toBe(1);
      expect(mappings[0].category_id).toBe(category2Id);
    });
  });
});

describe("Competition Category Tees API", () => {
  let db: Database;
  let categoryTeeService: CompetitionCategoryTeeService;
  let courseService: CourseService;
  let courseTeeService: CourseTeeService;
  let tourId: number;
  let courseId: number;
  let competitionId: number;
  let category1Id: number;
  let category2Id: number;
  let tee1Id: number;
  let tee2Id: number;
  let server: ReturnType<typeof Bun.serve>;
  let baseUrl: string;

  beforeEach(async () => {
    db = await createTestDatabase();
    categoryTeeService = new CompetitionCategoryTeeService(db);
    courseService = new CourseService(db);
    courseTeeService = new CourseTeeService(db);

    // Create a test course
    const course = await courseService.create({ name: "Test Course" });
    courseId = course.id;
    await courseService.updateHoles(
      courseId,
      [4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4]
    );

    // Create tees
    const tee1 = courseTeeService.create(courseId, {
      name: "Men",
      color: "white",
      course_rating: 72.3,
    });
    tee1Id = tee1.id;

    const tee2 = courseTeeService.create(courseId, {
      name: "Ladies",
      color: "red",
      course_rating: 70.5,
    });
    tee2Id = tee2.id;

    // Create user
    db.run(
      "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)",
      ["owner@test.com", "hash", "user"]
    );
    const userId = db
      .query<{ id: number }, []>("SELECT last_insert_rowid() as id")
      .get()!.id;

    // Create tour
    db.run(
      "INSERT INTO tours (name, owner_id, enrollment_mode, visibility, scoring_mode) VALUES (?, ?, ?, ?, ?)",
      ["Test Tour", userId, "closed", "private", "gross"]
    );
    tourId = db
      .query<{ id: number }, []>("SELECT last_insert_rowid() as id")
      .get()!.id;

    // Create categories
    db.run(
      "INSERT INTO tour_categories (tour_id, name, sort_order) VALUES (?, ?, ?)",
      [tourId, "Category A", 1]
    );
    category1Id = db
      .query<{ id: number }, []>("SELECT last_insert_rowid() as id")
      .get()!.id;

    db.run(
      "INSERT INTO tour_categories (tour_id, name, sort_order) VALUES (?, ?, ?)",
      [tourId, "Category B", 2]
    );
    category2Id = db
      .query<{ id: number }, []>("SELECT last_insert_rowid() as id")
      .get()!.id;

    // Create competition
    db.run(
      "INSERT INTO competitions (name, date, course_id, tour_id, points_multiplier, venue_type, start_mode) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ["Test Competition", "2024-06-15", courseId, tourId, 1, "outdoor", "scheduled"]
    );
    competitionId = db
      .query<{ id: number }, []>("SELECT last_insert_rowid() as id")
      .get()!.id;

    // Start server
    const { createApp } = await import("../src/app");
    const app = createApp(db);
    const port = 50000 + Math.floor(Math.random() * 10000);
    server = Bun.serve({
      port,
      fetch: app.fetch,
    });
    baseUrl = `http://localhost:${port}`;
  });

  afterEach(() => {
    server.stop();
    db.close();
  });

  describe("GET /api/competitions/:competitionId/category-tees", () => {
    test("should return empty array when no mappings exist", async () => {
      const res = await fetch(
        `${baseUrl}/api/competitions/${competitionId}/category-tees`
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.categoryTees).toEqual([]);
    });

    test("should return all mappings with names", async () => {
      categoryTeeService.setForCompetition(competitionId, [
        { categoryId: category1Id, teeId: tee1Id },
        { categoryId: category2Id, teeId: tee2Id },
      ]);

      const res = await fetch(
        `${baseUrl}/api/competitions/${competitionId}/category-tees`
      );
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.categoryTees.length).toBe(2);
      expect(data.categoryTees[0].category_name).toBe("Category A");
      expect(data.categoryTees[0].tee_name).toBe("Men");
    });
  });

  describe("PUT /api/competitions/:competitionId/category-tees", () => {
    test("should set category-tee mappings", async () => {
      const res = await fetch(
        `${baseUrl}/api/competitions/${competitionId}/category-tees`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mappings: [
              { categoryId: category1Id, teeId: tee1Id },
              { categoryId: category2Id, teeId: tee2Id },
            ],
          }),
        }
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.categoryTees.length).toBe(2);
    });

    test("should clear mappings with empty array", async () => {
      // First create some mappings
      categoryTeeService.setForCompetition(competitionId, [
        { categoryId: category1Id, teeId: tee1Id },
      ]);

      const res = await fetch(
        `${baseUrl}/api/competitions/${competitionId}/category-tees`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mappings: [] }),
        }
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.categoryTees).toEqual([]);
    });

    test("should return 400 for invalid request format", async () => {
      const res = await fetch(
        `${baseUrl}/api/competitions/${competitionId}/category-tees`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invalid: "data" }),
        }
      );

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid request format");
    });

    test("should return 400 for category not in tour", async () => {
      // Create category in another tour
      db.run(
        "INSERT INTO tours (name, owner_id, enrollment_mode, visibility, scoring_mode) VALUES (?, ?, ?, ?, ?)",
        ["Other Tour", 1, "closed", "private", "gross"]
      );
      const otherTourId = db
        .query<{ id: number }, []>("SELECT last_insert_rowid() as id")
        .get()!.id;

      db.run(
        "INSERT INTO tour_categories (tour_id, name, sort_order) VALUES (?, ?, ?)",
        [otherTourId, "Other Category", 1]
      );
      const otherCategoryId = db
        .query<{ id: number }, []>("SELECT last_insert_rowid() as id")
        .get()!.id;

      const res = await fetch(
        `${baseUrl}/api/competitions/${competitionId}/category-tees`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mappings: [{ categoryId: otherCategoryId, teeId: tee1Id }],
          }),
        }
      );

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("does not belong");
    });

    test("should return 400 for tee not in course", async () => {
      // Create tee on another course
      const otherCourse = await courseService.create({ name: "Other Course" });
      await courseService.updateHoles(
        otherCourse.id,
        [4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4]
      );
      const otherTee = courseTeeService.create(otherCourse.id, {
        name: "Other Tee",
        course_rating: 71.0,
      });

      const res = await fetch(
        `${baseUrl}/api/competitions/${competitionId}/category-tees`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mappings: [{ categoryId: category1Id, teeId: otherTee.id }],
          }),
        }
      );

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("does not belong to the competition's course");
    });
  });
});
