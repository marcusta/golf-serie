import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createTestDatabase } from "../src/database/db";
import { CourseService } from "../src/services/course-service";
import { CourseTeeService } from "../src/services/course-tee.service";
import { TourService } from "../src/services/tour.service";

describe("TourService play defaults", () => {
  let db: Database;
  let tourService: TourService;
  let courseService: CourseService;
  let courseTeeService: CourseTeeService;
  let ownerId: number;
  let tourId: number;
  let homeCourseId: number;
  let awayCourseId: number;
  let yellowHomeTeeId: number;
  let whiteHomeTeeId: number;
  let yellowAwayTeeId: number;

  beforeEach(async () => {
    db = await createTestDatabase();
    tourService = new TourService(db);
    courseService = new CourseService(db);
    courseTeeService = new CourseTeeService(db);

    db.prepare(
      "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)"
    ).run("owner@test.com", "hash", "ORGANIZER");
    ownerId = (
      db.prepare("SELECT id FROM users WHERE email = ?").get("owner@test.com") as {
        id: number;
      }
    ).id;

    const tour = tourService.create({ name: "Club Tour" }, ownerId);
    tourId = tour.id;

    const homeCourse = await courseService.create({ name: "Home Club" });
    homeCourseId = homeCourse.id;
    const awayCourse = await courseService.create({ name: "Away Club" });
    awayCourseId = awayCourse.id;

    yellowHomeTeeId = courseTeeService.create(homeCourseId, {
      name: "Yellow",
      color: "yellow",
      course_rating: 72.1,
      slope_rating: 125,
    }).id;
    whiteHomeTeeId = courseTeeService.create(homeCourseId, {
      name: "White",
      color: "white",
      course_rating: 74.0,
      slope_rating: 132,
    }).id;
    yellowAwayTeeId = courseTeeService.create(awayCourseId, {
      name: "Gul",
      color: "yellow",
      course_rating: 71.4,
      slope_rating: 120,
    }).id;
  });

  afterEach(() => {
    db.close();
  });

  test("sets default course and tee and returns tee color", () => {
    const updated = tourService.update(tourId, {
      default_course_id: homeCourseId,
      default_tee_id: yellowHomeTeeId,
    });

    expect(updated.default_course_id).toBe(homeCourseId);
    expect(updated.default_tee_id).toBe(yellowHomeTeeId);
    expect(updated.default_tee_color).toBe("yellow");

    const fetched = tourService.findById(tourId);
    expect(fetched?.default_tee_color).toBe("yellow");
  });

  test("rejects a tee that does not belong to the default course", () => {
    expect(() =>
      tourService.update(tourId, {
        default_course_id: homeCourseId,
        default_tee_id: yellowAwayTeeId,
      })
    ).toThrow("Tee must belong to the tour's default course");
  });

  test("rejects a default tee without a default course", () => {
    expect(() =>
      tourService.update(tourId, {
        default_tee_id: yellowHomeTeeId,
      })
    ).toThrow("Default tee requires a default course");
  });

  test("rejects an unknown course", () => {
    expect(() =>
      tourService.update(tourId, {
        default_course_id: 9999,
      })
    ).toThrow("Course not found");
  });

  test("rejects an unknown tee", () => {
    expect(() =>
      tourService.update(tourId, {
        default_course_id: homeCourseId,
        default_tee_id: 9999,
      })
    ).toThrow("Tee not found");
  });

  test("clears the tee when the default course is cleared", () => {
    tourService.update(tourId, {
      default_course_id: homeCourseId,
      default_tee_id: yellowHomeTeeId,
    });

    const updated = tourService.update(tourId, {
      default_course_id: null,
    });

    expect(updated.default_course_id).toBeNull();
    expect(updated.default_tee_id).toBeNull();
    expect(updated.default_tee_color).toBeNull();
  });

  test("drops a stale tee when the default course changes without a new tee", () => {
    tourService.update(tourId, {
      default_course_id: homeCourseId,
      default_tee_id: yellowHomeTeeId,
    });

    const updated = tourService.update(tourId, {
      default_course_id: awayCourseId,
    });

    expect(updated.default_course_id).toBe(awayCourseId);
    expect(updated.default_tee_id).toBeNull();
  });

  test("keeps an explicit tee when changing course to one that owns it", () => {
    tourService.update(tourId, {
      default_course_id: homeCourseId,
      default_tee_id: whiteHomeTeeId,
    });

    const updated = tourService.update(tourId, {
      default_course_id: awayCourseId,
      default_tee_id: yellowAwayTeeId,
    });

    expect(updated.default_course_id).toBe(awayCourseId);
    expect(updated.default_tee_id).toBe(yellowAwayTeeId);
    expect(updated.default_tee_color).toBe("yellow");
  });

  test("includes default tee color on findAll", () => {
    tourService.update(tourId, {
      default_course_id: homeCourseId,
      default_tee_id: yellowHomeTeeId,
    });

    const tours = tourService.findAll();
    const tour = tours.find((item) => item.id === tourId);
    expect(tour?.default_tee_color).toBe("yellow");
  });
});
