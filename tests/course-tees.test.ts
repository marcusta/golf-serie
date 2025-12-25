import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { createTestDatabase } from "../src/database/db";
import { CourseTeeService } from "../src/services/course-tee.service";
import { CourseService } from "../src/services/course-service";
import { Database } from "bun:sqlite";

describe("CourseTeeService", () => {
  let db: Database;
  let courseTeeService: CourseTeeService;
  let courseService: CourseService;
  let courseId: number;

  beforeEach(async () => {
    db = await createTestDatabase();
    courseTeeService = new CourseTeeService(db);
    courseService = new CourseService(db);

    // Create a test course
    const course = await courseService.create({ name: "Test Course" });
    courseId = course.id;

    // Add pars to the course
    await courseService.updateHoles(
      courseId,
      [4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4]
    );
  });

  afterEach(() => {
    db.close();
  });

  describe("create", () => {
    test("should create a tee with minimal data", () => {
      const tee = courseTeeService.create(courseId, {
        name: "Men",
        course_rating: 72.3,
      });

      expect(tee.id).toBeDefined();
      expect(tee.course_id).toBe(courseId);
      expect(tee.name).toBe("Men");
      expect(tee.course_rating).toBe(72.3);
      expect(tee.slope_rating).toBe(113); // Default
    });

    test("should create a tee with full data", () => {
      const strokeIndex = [5, 13, 1, 9, 17, 3, 15, 7, 11, 6, 14, 2, 10, 18, 4, 16, 8, 12];
      const pars = [4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4];

      const tee = courseTeeService.create(courseId, {
        name: "Championship",
        color: "white",
        course_rating: 74.2,
        slope_rating: 138,
        stroke_index: strokeIndex,
        pars: pars,
      });

      expect(tee.name).toBe("Championship");
      expect(tee.color).toBe("white");
      expect(tee.course_rating).toBe(74.2);
      expect(tee.slope_rating).toBe(138);
      expect(tee.stroke_index).toEqual(strokeIndex);
      expect(tee.pars).toEqual(pars);
    });

    test("should throw error for non-existent course", () => {
      expect(() =>
        courseTeeService.create(9999, {
          name: "Men",
          course_rating: 72.3,
        })
      ).toThrow("Course not found");
    });

    test("should throw error for empty name", () => {
      expect(() =>
        courseTeeService.create(courseId, {
          name: "",
          course_rating: 72.3,
        })
      ).toThrow("Tee name is required");
    });

    test("should throw error for duplicate name", () => {
      courseTeeService.create(courseId, {
        name: "Men",
        course_rating: 72.3,
      });

      expect(() =>
        courseTeeService.create(courseId, {
          name: "Men",
          course_rating: 71.5,
        })
      ).toThrow("Tee with this name already exists for this course");
    });

    test("should throw error for invalid course rating", () => {
      expect(() =>
        courseTeeService.create(courseId, {
          name: "Men",
          course_rating: 45, // Too low
        })
      ).toThrow("Course rating must be between 50 and 90");
    });

    test("should throw error for invalid slope rating", () => {
      expect(() =>
        courseTeeService.create(courseId, {
          name: "Men",
          course_rating: 72.3,
          slope_rating: 160, // Too high
        })
      ).toThrow("Slope rating must be between 55 and 155");
    });

    test("should throw error for invalid stroke index", () => {
      expect(() =>
        courseTeeService.create(courseId, {
          name: "Men",
          course_rating: 72.3,
          stroke_index: [1, 2, 3, 4, 5], // Not 18 values
        })
      ).toThrow("Stroke index must contain each number from 1-18 exactly once");
    });

    test("should throw error for invalid pars", () => {
      expect(() =>
        courseTeeService.create(courseId, {
          name: "Men",
          course_rating: 72.3,
          pars: [4, 3, 5, 7], // Par 7 is invalid
        })
      ).toThrow("Pars must have exactly 18 values");
    });
  });

  describe("findByCourse", () => {
    test("should return empty array for course with no tees", () => {
      const tees = courseTeeService.findByCourse(courseId);
      expect(tees).toEqual([]);
    });

    test("should return all tees for course", () => {
      courseTeeService.create(courseId, { name: "Men", course_rating: 72.3 });
      courseTeeService.create(courseId, { name: "Ladies", course_rating: 71.8 });
      courseTeeService.create(courseId, { name: "Championship", course_rating: 74.2 });

      const tees = courseTeeService.findByCourse(courseId);
      expect(tees.length).toBe(3);
      // Should be sorted by name
      expect(tees[0].name).toBe("Championship");
      expect(tees[1].name).toBe("Ladies");
      expect(tees[2].name).toBe("Men");
    });
  });

  describe("findById", () => {
    test("should return tee by id", () => {
      const created = courseTeeService.create(courseId, {
        name: "Men",
        course_rating: 72.3,
      });

      const found = courseTeeService.findById(created.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(created.id);
      expect(found!.name).toBe("Men");
    });

    test("should return null for non-existent tee", () => {
      const found = courseTeeService.findById(9999);
      expect(found).toBeNull();
    });
  });

  describe("update", () => {
    test("should update tee name", () => {
      const tee = courseTeeService.create(courseId, {
        name: "Men",
        course_rating: 72.3,
      });

      const updated = courseTeeService.update(tee.id, { name: "Men Yellow" });
      expect(updated.name).toBe("Men Yellow");
    });

    test("should update course rating", () => {
      const tee = courseTeeService.create(courseId, {
        name: "Men",
        course_rating: 72.3,
      });

      const updated = courseTeeService.update(tee.id, { course_rating: 72.5 });
      expect(updated.course_rating).toBe(72.5);
    });

    test("should update slope rating", () => {
      const tee = courseTeeService.create(courseId, {
        name: "Men",
        course_rating: 72.3,
      });

      const updated = courseTeeService.update(tee.id, { slope_rating: 128 });
      expect(updated.slope_rating).toBe(128);
    });

    test("should update stroke index", () => {
      const tee = courseTeeService.create(courseId, {
        name: "Men",
        course_rating: 72.3,
      });

      const newStrokeIndex = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
      const updated = courseTeeService.update(tee.id, { stroke_index: newStrokeIndex });
      expect(updated.stroke_index).toEqual(newStrokeIndex);
    });

    test("should throw error for non-existent tee", () => {
      expect(() =>
        courseTeeService.update(9999, { name: "Updated" })
      ).toThrow("Tee not found");
    });

    test("should throw error for duplicate name", () => {
      courseTeeService.create(courseId, { name: "Men", course_rating: 72.3 });
      const ladies = courseTeeService.create(courseId, { name: "Ladies", course_rating: 71.8 });

      expect(() =>
        courseTeeService.update(ladies.id, { name: "Men" })
      ).toThrow("Tee with this name already exists for this course");
    });
  });

  describe("delete", () => {
    test("should delete tee", () => {
      const tee = courseTeeService.create(courseId, {
        name: "Men",
        course_rating: 72.3,
      });

      courseTeeService.delete(tee.id);

      const found = courseTeeService.findById(tee.id);
      expect(found).toBeNull();
    });

    test("should throw error for non-existent tee", () => {
      expect(() => courseTeeService.delete(9999)).toThrow("Tee not found");
    });
  });
});

describe("Course Tee API", () => {
  let db: Database;
  let courseTeeService: CourseTeeService;
  let courseService: CourseService;
  let courseId: number;
  let server: any;
  let baseUrl: string;

  beforeEach(async () => {
    db = await createTestDatabase();
    courseTeeService = new CourseTeeService(db);
    courseService = new CourseService(db);

    // Create a test course
    const course = await courseService.create({ name: "Test Course" });
    courseId = course.id;
    await courseService.updateHoles(
      courseId,
      [4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4]
    );

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

  describe("GET /api/courses/:courseId/tees", () => {
    test("should return empty array for course with no tees", async () => {
      const res = await fetch(`${baseUrl}/api/courses/${courseId}/tees`);
      expect(res.status).toBe(200);
      const tees = await res.json();
      expect(tees).toEqual([]);
    });

    test("should return all tees for course", async () => {
      courseTeeService.create(courseId, { name: "Men", course_rating: 72.3 });
      courseTeeService.create(courseId, { name: "Ladies", course_rating: 71.8 });

      const res = await fetch(`${baseUrl}/api/courses/${courseId}/tees`);
      expect(res.status).toBe(200);
      const tees = await res.json();
      expect(tees.length).toBe(2);
    });
  });

  describe("POST /api/courses/:courseId/tees", () => {
    test("should create a tee", async () => {
      const res = await fetch(`${baseUrl}/api/courses/${courseId}/tees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Men",
          course_rating: 72.3,
          slope_rating: 128,
        }),
      });

      expect(res.status).toBe(201);
      const tee = await res.json();
      expect(tee.name).toBe("Men");
      expect(tee.course_rating).toBe(72.3);
      expect(tee.slope_rating).toBe(128);
    });

    test("should return 404 for non-existent course", async () => {
      const res = await fetch(`${baseUrl}/api/courses/9999/tees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Men",
          course_rating: 72.3,
        }),
      });

      expect(res.status).toBe(404);
    });

    test("should return 400 for invalid data", async () => {
      const res = await fetch(`${baseUrl}/api/courses/${courseId}/tees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "",
          course_rating: 72.3,
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe("PUT /api/courses/:courseId/tees/:teeId", () => {
    test("should update a tee", async () => {
      const tee = courseTeeService.create(courseId, { name: "Men", course_rating: 72.3 });

      const res = await fetch(`${baseUrl}/api/courses/${courseId}/tees/${tee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Men Yellow",
          course_rating: 72.5,
        }),
      });

      expect(res.status).toBe(200);
      const updated = await res.json();
      expect(updated.name).toBe("Men Yellow");
      expect(updated.course_rating).toBe(72.5);
    });

    test("should return 404 for non-existent tee", async () => {
      const res = await fetch(`${baseUrl}/api/courses/${courseId}/tees/9999`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated" }),
      });

      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/courses/:courseId/tees/:teeId", () => {
    test("should delete a tee", async () => {
      const tee = courseTeeService.create(courseId, { name: "Men", course_rating: 72.3 });

      const res = await fetch(`${baseUrl}/api/courses/${courseId}/tees/${tee.id}`, {
        method: "DELETE",
      });

      expect(res.status).toBe(204);

      const found = courseTeeService.findById(tee.id);
      expect(found).toBeNull();
    });

    test("should return 404 for non-existent tee", async () => {
      const res = await fetch(`${baseUrl}/api/courses/${courseId}/tees/9999`, {
        method: "DELETE",
      });

      expect(res.status).toBe(404);
    });
  });
});
