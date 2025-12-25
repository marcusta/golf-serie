import { describe, test, expect, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import { initializeDatabase } from "../src/database/db";
import { CourseTeeService, createCourseTeeService } from "../src/services/course-tee.service";
import { CourseService } from "../src/services/course-service";
import {
  getRatingForGender,
  calculateFullHandicapWithGender,
  getDefaultStrokeIndex,
  type RatingData,
} from "../src/utils/handicap";

describe("Course Tee Ratings", () => {
  let db: Database;
  let courseTeeService: CourseTeeService;
  let courseService: CourseService;
  let courseId: number;
  let teeId: number;

  beforeEach(async () => {
    // Create in-memory database and initialize schema
    db = new Database(":memory:");
    await initializeDatabase(db);

    courseTeeService = createCourseTeeService(db);
    courseService = new CourseService(db);

    // Create a test course
    const course = await courseService.create({
      name: "Test Golf Course",
      holes: [4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4],
    });
    courseId = course.id;

    // Create a test tee
    const tee = courseTeeService.create(courseId, {
      name: "Yellow Tees",
      color: "yellow",
      course_rating: 70.5,
      slope_rating: 125,
    });
    teeId = tee.id;
  });

  describe("CourseTeeService rating methods", () => {
    test("should create tee with men's rating by default", () => {
      const tee = courseTeeService.findById(teeId);
      expect(tee).toBeDefined();
      expect(tee!.ratings).toBeDefined();
      expect(tee!.ratings!.length).toBe(1);
      expect(tee!.ratings![0].gender).toBe("men");
      expect(tee!.ratings![0].course_rating).toBe(70.5);
      expect(tee!.ratings![0].slope_rating).toBe(125);
    });

    test("should create tee with ratings array", () => {
      const tee = courseTeeService.create(courseId, {
        name: "Red Tees",
        color: "red",
        ratings: [
          { gender: "men", course_rating: 68.0, slope_rating: 118 },
          { gender: "women", course_rating: 70.5, slope_rating: 122 },
        ],
      });

      expect(tee.ratings).toBeDefined();
      expect(tee.ratings!.length).toBe(2);

      const mensRating = tee.ratings!.find((r) => r.gender === "men");
      expect(mensRating!.course_rating).toBe(68.0);
      expect(mensRating!.slope_rating).toBe(118);

      const womensRating = tee.ratings!.find((r) => r.gender === "women");
      expect(womensRating!.course_rating).toBe(70.5);
      expect(womensRating!.slope_rating).toBe(122);
    });

    test("should use men's rating for legacy course_rating/slope_rating when creating with ratings", () => {
      const tee = courseTeeService.create(courseId, {
        name: "Blue Tees",
        color: "blue",
        ratings: [
          { gender: "men", course_rating: 72.3, slope_rating: 130 },
          { gender: "women", course_rating: 74.5, slope_rating: 135 },
        ],
      });

      // Legacy fields should use men's values
      expect(tee.course_rating).toBe(72.3);
      expect(tee.slope_rating).toBe(130);
    });

    test("should use first rating for legacy fields when only women's rating provided", () => {
      const tee = courseTeeService.create(courseId, {
        name: "Ladies Tees",
        color: "red",
        ratings: [{ gender: "women", course_rating: 68.0, slope_rating: 115 }],
      });

      // Legacy fields should use the only available rating
      expect(tee.course_rating).toBe(68.0);
      expect(tee.slope_rating).toBe(115);
    });

    test("should upsert rating for existing gender", () => {
      const rating = courseTeeService.upsertRating(teeId, {
        gender: "men",
        course_rating: 71.0,
        slope_rating: 128,
      });

      expect(rating.course_rating).toBe(71.0);
      expect(rating.slope_rating).toBe(128);

      // Should still be only one rating
      const ratings = courseTeeService.getRatingsForTee(teeId);
      expect(ratings.length).toBe(1);
    });

    test("should add rating for new gender", () => {
      const rating = courseTeeService.upsertRating(teeId, {
        gender: "women",
        course_rating: 72.5,
        slope_rating: 130,
      });

      expect(rating.gender).toBe("women");
      expect(rating.course_rating).toBe(72.5);
      expect(rating.slope_rating).toBe(130);

      // Should now have two ratings
      const ratings = courseTeeService.getRatingsForTee(teeId);
      expect(ratings.length).toBe(2);
    });

    test("should get rating by gender", () => {
      // Add women's rating
      courseTeeService.upsertRating(teeId, {
        gender: "women",
        course_rating: 72.5,
        slope_rating: 130,
      });

      const mensRating = courseTeeService.getRatingByGender(teeId, "men");
      expect(mensRating).toBeDefined();
      expect(mensRating!.course_rating).toBe(70.5);

      const womensRating = courseTeeService.getRatingByGender(teeId, "women");
      expect(womensRating).toBeDefined();
      expect(womensRating!.course_rating).toBe(72.5);
    });

    test("should return null for non-existent gender rating", () => {
      const womensRating = courseTeeService.getRatingByGender(teeId, "women");
      expect(womensRating).toBeNull();
    });

    test("should update rating", () => {
      const ratings = courseTeeService.getRatingsForTee(teeId);
      const ratingId = ratings[0].id;

      const updated = courseTeeService.updateRating(ratingId, {
        course_rating: 71.5,
      });

      expect(updated.course_rating).toBe(71.5);
      expect(updated.slope_rating).toBe(125); // Unchanged
    });

    test("should delete rating by gender", () => {
      // Add women's rating first
      courseTeeService.upsertRating(teeId, {
        gender: "women",
        course_rating: 72.5,
        slope_rating: 130,
      });

      expect(courseTeeService.getRatingsForTee(teeId).length).toBe(2);

      // Delete women's rating
      courseTeeService.deleteRatingByGender(teeId, "women");

      expect(courseTeeService.getRatingsForTee(teeId).length).toBe(1);
      expect(courseTeeService.getRatingByGender(teeId, "women")).toBeNull();
    });

    test("should validate course rating range for ratings", () => {
      expect(() =>
        courseTeeService.upsertRating(teeId, {
          gender: "women",
          course_rating: 45.0, // Too low
          slope_rating: 120,
        })
      ).toThrow("Course rating must be between 50 and 90");

      expect(() =>
        courseTeeService.upsertRating(teeId, {
          gender: "women",
          course_rating: 95.0, // Too high
          slope_rating: 120,
        })
      ).toThrow("Course rating must be between 50 and 90");
    });

    test("should validate slope rating range for ratings", () => {
      expect(() =>
        courseTeeService.upsertRating(teeId, {
          gender: "women",
          course_rating: 72.0,
          slope_rating: 50, // Too low
        })
      ).toThrow("Slope rating must be between 55 and 155");

      expect(() =>
        courseTeeService.upsertRating(teeId, {
          gender: "women",
          course_rating: 72.0,
          slope_rating: 160, // Too high
        })
      ).toThrow("Slope rating must be between 55 and 155");
    });

    test("should throw error for invalid gender", () => {
      expect(() =>
        courseTeeService.upsertRating(teeId, {
          gender: "invalid" as any,
          course_rating: 72.0,
          slope_rating: 120,
        })
      ).toThrow("Gender must be 'men' or 'women'");
    });

    test("should cascade delete ratings when tee is deleted", () => {
      // Add women's rating
      courseTeeService.upsertRating(teeId, {
        gender: "women",
        course_rating: 72.5,
        slope_rating: 130,
      });

      // Create another tee (so we can delete the first)
      const anotherTee = courseTeeService.create(courseId, {
        name: "White Tees",
        course_rating: 68.0,
        slope_rating: 115,
      });

      // Delete original tee
      courseTeeService.delete(teeId);

      // Ratings should be gone (cascade delete)
      expect(courseTeeService.getRatingsForTee(teeId).length).toBe(0);
    });
  });

  describe("getRatingForGender utility", () => {
    test("should return matching gender rating", () => {
      const ratings: RatingData[] = [
        { gender: "men", course_rating: 70.5, slope_rating: 125 },
        { gender: "women", course_rating: 72.5, slope_rating: 130 },
      ];

      const mensRating = getRatingForGender(ratings, "men");
      expect(mensRating.course_rating).toBe(70.5);
      expect(mensRating.slope_rating).toBe(125);

      const womensRating = getRatingForGender(ratings, "women");
      expect(womensRating.course_rating).toBe(72.5);
      expect(womensRating.slope_rating).toBe(130);
    });

    test("should fall back to first rating if gender not found", () => {
      const ratings: RatingData[] = [
        { gender: "men", course_rating: 70.5, slope_rating: 125 },
      ];

      const womensRating = getRatingForGender(ratings, "women");
      expect(womensRating.course_rating).toBe(70.5);
      expect(womensRating.slope_rating).toBe(125);
    });

    test("should use fallback values if no ratings exist", () => {
      const rating = getRatingForGender(undefined, "men", 72.0, 120);
      expect(rating.course_rating).toBe(72.0);
      expect(rating.slope_rating).toBe(120);
    });

    test("should use fallback values for empty ratings array", () => {
      const rating = getRatingForGender([], "men", 72.0, 120);
      expect(rating.course_rating).toBe(72.0);
      expect(rating.slope_rating).toBe(120);
    });

    test("should use default values if no ratings and no fallback", () => {
      const rating = getRatingForGender(undefined, "men");
      expect(rating.course_rating).toBe(72);
      expect(rating.slope_rating).toBe(113);
    });
  });

  describe("calculateFullHandicapWithGender utility", () => {
    const strokeIndex = getDefaultStrokeIndex();
    const par = 72;

    test("should calculate handicap for men's rating", () => {
      const ratings: RatingData[] = [
        { gender: "men", course_rating: 70.5, slope_rating: 125 },
        { gender: "women", course_rating: 72.5, slope_rating: 130 },
      ];

      const result = calculateFullHandicapWithGender(15.4, ratings, "men", par, strokeIndex);

      // Course Handicap = (15.4 × 125 / 113) + (70.5 - 72) = 17.04 - 1.5 = 15.5 → 16
      expect(result.courseHandicap).toBe(16);
    });

    test("should calculate handicap for women's rating", () => {
      const ratings: RatingData[] = [
        { gender: "men", course_rating: 70.5, slope_rating: 125 },
        { gender: "women", course_rating: 72.5, slope_rating: 130 },
      ];

      const result = calculateFullHandicapWithGender(15.4, ratings, "women", par, strokeIndex);

      // Course Handicap = (15.4 × 130 / 113) + (72.5 - 72) = 17.72 + 0.5 = 18.22 → 18
      expect(result.courseHandicap).toBe(18);
    });

    test("should calculate different handicaps for same index with different genders", () => {
      const ratings: RatingData[] = [
        { gender: "men", course_rating: 67.2, slope_rating: 118 },
        { gender: "women", course_rating: 69.5, slope_rating: 122 },
      ];

      const mensResult = calculateFullHandicapWithGender(15.4, ratings, "men", par, strokeIndex);
      const womensResult = calculateFullHandicapWithGender(15.4, ratings, "women", par, strokeIndex);

      // Men: (15.4 × 118 / 113) + (67.2 - 72) = 16.08 - 4.8 = 11.28 → 11
      expect(mensResult.courseHandicap).toBe(11);

      // Women: (15.4 × 122 / 113) + (69.5 - 72) = 16.63 - 2.5 = 14.13 → 14
      expect(womensResult.courseHandicap).toBe(14);
    });

    test("should use fallback ratings when none provided", () => {
      const result = calculateFullHandicapWithGender(
        15.4,
        undefined,
        "men",
        par,
        strokeIndex,
        undefined,
        72.0, // fallback CR
        120 // fallback SR
      );

      // Course Handicap = (15.4 × 120 / 113) + (72 - 72) = 16.35 → 16
      expect(result.courseHandicap).toBe(16);
    });
  });

  describe("Real-world example: Landeryd Classic", () => {
    test("should calculate correct handicaps for Yellow tees", () => {
      // Landeryd Classic Yellow Tees have different ratings for men and women
      const ratings: RatingData[] = [
        { gender: "men", course_rating: 67.2, slope_rating: 118 },
        { gender: "women", course_rating: 69.5, slope_rating: 122 },
      ];

      const par = 72;
      const strokeIndex = getDefaultStrokeIndex();

      // Player with handicap index 18.0
      const mensResult = calculateFullHandicapWithGender(18.0, ratings, "men", par, strokeIndex);
      const womensResult = calculateFullHandicapWithGender(18.0, ratings, "women", par, strokeIndex);

      // Men: (18.0 × 118 / 113) + (67.2 - 72) = 18.80 - 4.8 = 14.0 → 14
      expect(mensResult.courseHandicap).toBe(14);

      // Women: (18.0 × 122 / 113) + (69.5 - 72) = 19.43 - 2.5 = 16.93 → 17
      expect(womensResult.courseHandicap).toBe(17);

      // The same player gets 3 more strokes playing from women's rating
      expect(womensResult.courseHandicap - mensResult.courseHandicap).toBe(3);
    });
  });
});
