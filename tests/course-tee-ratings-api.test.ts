import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { initializeDatabase } from "../src/database/db";
import { CourseService } from "../src/services/course-service";
import { CourseTeeService, createCourseTeeService } from "../src/services/course-tee.service";
import { createCoursesApi } from "../src/api/courses";

describe("Course Tee Ratings API", () => {
  let db: Database;
  let courseService: CourseService;
  let courseTeeService: CourseTeeService;
  let courseId: number;
  let teeId: number;

  beforeEach(async () => {
    db = new Database(":memory:");
    await initializeDatabase(db);

    courseService = new CourseService(db);
    courseTeeService = createCourseTeeService(db);

    // Create a test course
    const course = await courseService.create({ name: "Test Golf Course" });
    courseId = course.id;
    await courseService.updateHoles(courseId, [4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4]);

    // Create a test tee
    const tee = courseTeeService.create(courseId, {
      name: "Yellow Tees",
      color: "yellow",
      course_rating: 70.5,
      slope_rating: 125,
    });
    teeId = tee.id;
  });

  const api = () => createCoursesApi(courseService, courseTeeService);

  describe("GET /api/courses/:courseId/tees/:teeId/ratings", () => {
    test("should return all ratings for a tee", async () => {
      // Add women's rating
      courseTeeService.upsertRating(teeId, {
        gender: "women",
        course_rating: 72.5,
        slope_rating: 130,
      });

      const response = await api().getTeeRatings(courseId, teeId);
      expect(response.status).toBe(200);

      const ratings = await response.json();
      expect(ratings.length).toBe(2);

      const mensRating = ratings.find((r: any) => r.gender === "men");
      expect(mensRating.course_rating).toBe(70.5);

      const womensRating = ratings.find((r: any) => r.gender === "women");
      expect(womensRating.course_rating).toBe(72.5);
    });

    test("should return 404 for non-existent tee", async () => {
      const response = await api().getTeeRatings(courseId, 9999);
      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.error).toBe("Tee not found");
    });

    test("should return 404 when tee belongs to different course", async () => {
      // Create another course
      const course2 = await courseService.create({ name: "Another Golf Course" });
      await courseService.updateHoles(course2.id, [4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4]);

      const response = await api().getTeeRatings(course2.id, teeId);
      expect(response.status).toBe(404);
    });
  });

  describe("GET /api/courses/:courseId/tees/:teeId/ratings/:gender", () => {
    test("should return rating for specific gender", async () => {
      const response = await api().getTeeRatingByGender(courseId, teeId, "men");
      expect(response.status).toBe(200);

      const rating = await response.json();
      expect(rating.gender).toBe("men");
      expect(rating.course_rating).toBe(70.5);
      expect(rating.slope_rating).toBe(125);
    });

    test("should return 404 for non-existent gender rating", async () => {
      const response = await api().getTeeRatingByGender(courseId, teeId, "women");
      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.error).toBe("Rating not found");
    });

    test("should return 400 for invalid gender", async () => {
      const response = await api().getTeeRatingByGender(courseId, teeId, "invalid");
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("Gender must be 'men' or 'women'");
    });
  });

  describe("POST /api/courses/:courseId/tees/:teeId/ratings", () => {
    test("should create a new rating", async () => {
      const request = new Request("http://localhost/api/courses/1/tees/1/ratings", {
        method: "POST",
        body: JSON.stringify({
          gender: "women",
          course_rating: 72.5,
          slope_rating: 130,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await api().upsertTeeRating(request, courseId, teeId);
      expect(response.status).toBe(200);

      const rating = await response.json();
      expect(rating.gender).toBe("women");
      expect(rating.course_rating).toBe(72.5);
      expect(rating.slope_rating).toBe(130);
    });

    test("should update existing rating (upsert)", async () => {
      const request = new Request("http://localhost/api/courses/1/tees/1/ratings", {
        method: "POST",
        body: JSON.stringify({
          gender: "men",
          course_rating: 71.0,
          slope_rating: 128,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await api().upsertTeeRating(request, courseId, teeId);
      expect(response.status).toBe(200);

      const rating = await response.json();
      expect(rating.gender).toBe("men");
      expect(rating.course_rating).toBe(71.0);
      expect(rating.slope_rating).toBe(128);

      // Should still be only one men's rating
      const ratings = courseTeeService.getRatingsForTee(teeId);
      expect(ratings.filter((r) => r.gender === "men").length).toBe(1);
    });

    test("should return 400 for invalid course rating", async () => {
      const request = new Request("http://localhost/api/courses/1/tees/1/ratings", {
        method: "POST",
        body: JSON.stringify({
          gender: "women",
          course_rating: 45.0,
          slope_rating: 120,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await api().upsertTeeRating(request, courseId, teeId);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("Course rating must be between 50 and 90");
    });

    test("should return 404 for non-existent tee", async () => {
      const request = new Request("http://localhost/api/courses/1/tees/9999/ratings", {
        method: "POST",
        body: JSON.stringify({
          gender: "women",
          course_rating: 72.0,
          slope_rating: 120,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await api().upsertTeeRating(request, courseId, 9999);
      expect(response.status).toBe(404);
    });
  });

  describe("PUT /api/courses/:courseId/tees/:teeId/ratings/:ratingId", () => {
    test("should update rating", async () => {
      const ratings = courseTeeService.getRatingsForTee(teeId);
      const ratingId = ratings[0].id;

      const request = new Request("http://localhost/api/courses/1/tees/1/ratings/1", {
        method: "PUT",
        body: JSON.stringify({
          course_rating: 71.5,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await api().updateTeeRating(request, courseId, teeId, ratingId);
      expect(response.status).toBe(200);

      const rating = await response.json();
      expect(rating.course_rating).toBe(71.5);
      expect(rating.slope_rating).toBe(125); // Unchanged
    });

    test("should return 404 for non-existent rating", async () => {
      const request = new Request("http://localhost/api/courses/1/tees/1/ratings/9999", {
        method: "PUT",
        body: JSON.stringify({
          course_rating: 71.5,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await api().updateTeeRating(request, courseId, teeId, 9999);
      expect(response.status).toBe(404);
    });
  });

  describe("DELETE /api/courses/:courseId/tees/:teeId/ratings/:gender", () => {
    test("should delete rating by gender", async () => {
      // Add women's rating first
      courseTeeService.upsertRating(teeId, {
        gender: "women",
        course_rating: 72.5,
        slope_rating: 130,
      });

      const response = await api().deleteTeeRating(courseId, teeId, "women");
      expect(response.status).toBe(204);

      // Verify deletion
      const womensRating = courseTeeService.getRatingByGender(teeId, "women");
      expect(womensRating).toBeNull();
    });

    test("should return 404 for non-existent gender rating", async () => {
      const response = await api().deleteTeeRating(courseId, teeId, "women");
      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.error).toBe("Rating not found");
    });

    test("should return 400 for invalid gender", async () => {
      const response = await api().deleteTeeRating(courseId, teeId, "invalid");
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("Gender must be 'men' or 'women'");
    });
  });

  describe("Tees with ratings included", () => {
    test("GET /api/courses/:courseId/tees should include ratings", async () => {
      // Add women's rating
      courseTeeService.upsertRating(teeId, {
        gender: "women",
        course_rating: 72.5,
        slope_rating: 130,
      });

      const response = await api().getTees(courseId);
      expect(response.status).toBe(200);

      const tees = await response.json();
      expect(tees[0].ratings).toBeDefined();
      expect(tees[0].ratings.length).toBe(2);
    });

    test("GET /api/courses/:courseId/tees/:teeId should include ratings", async () => {
      const response = await api().getTee(courseId, teeId);
      expect(response.status).toBe(200);

      const tee = await response.json();
      expect(tee.ratings).toBeDefined();
      expect(tee.ratings.length).toBe(1);
      expect(tee.ratings[0].gender).toBe("men");
    });

    test("POST /api/courses/:courseId/tees should create tee with ratings array", async () => {
      const request = new Request("http://localhost/api/courses/1/tees", {
        method: "POST",
        body: JSON.stringify({
          name: "Red Tees",
          color: "red",
          ratings: [
            { gender: "men", course_rating: 68.0, slope_rating: 118 },
            { gender: "women", course_rating: 70.5, slope_rating: 122 },
          ],
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await api().createTee(request, courseId);
      expect(response.status).toBe(201);

      const tee = await response.json();
      expect(tee.ratings).toBeDefined();
      expect(tee.ratings.length).toBe(2);

      const mensRating = tee.ratings.find((r: any) => r.gender === "men");
      expect(mensRating.course_rating).toBe(68.0);

      const womensRating = tee.ratings.find((r: any) => r.gender === "women");
      expect(womensRating.course_rating).toBe(70.5);
    });
  });
});
