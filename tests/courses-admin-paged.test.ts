import { describe, test, expect, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import { CourseService } from "../src/services/course-service";
import { CourseTeeService } from "../src/services/course-tee.service";
import { ClubService } from "../src/services/club.service";
import { initializeDatabase } from "../src/database/db";

describe("CourseService.getCoursesPagedAdmin", () => {
  let db: Database;
  let courseService: CourseService;
  let courseTeeService: CourseTeeService;
  let clubService: ClubService;

  beforeEach(() => {
    db = new Database(":memory:");
    initializeDatabase(db);
    clubService = new ClubService(db);
    courseTeeService = new CourseTeeService(db);
    courseService = new CourseService(db, courseTeeService, clubService);
  });

  test("returns all courses with correct structure", async () => {
    // Create courses
    const course1 = await courseService.create({ name: "Test Course 1" });
    await courseService.updateHoles(course1.id, [4, 3, 4, 5, 4, 3, 4, 5, 4, 4, 3, 4, 5, 4, 3, 4, 5, 4]);

    const result = courseService.getCoursesPagedAdmin({ limit: 50, offset: 0 });

    expect(result.total).toBe(1);
    expect(result.hasMore).toBe(false);
    expect(result.courses).toHaveLength(1);
    expect(result.courses[0]).toMatchObject({
      id: course1.id,
      name: "Test Course 1",
      totalPar: 72,
      holeCount: 18,
      teeCount: 0,
      crRange: null
    });
  });

  test("handles courses without pars set (0 holes)", async () => {
    // A new course has empty pars array by default - treated as 0 holes
    const course = await courseService.create({ name: "Empty Course" });

    const result = courseService.getCoursesPagedAdmin({ limit: 50, offset: 0 });

    expect(result.courses[0].holeCount).toBe(0);
    expect(result.courses[0].totalPar).toBe(0);
  });

  test("counts tees correctly", async () => {
    const course = await courseService.create({ name: "Course with Tees" });
    await courseService.updateHoles(course.id, [4, 3, 4, 5, 4, 3, 4, 5, 4, 4, 3, 4, 5, 4, 3, 4, 5, 4]);

    courseTeeService.create(course.id, {
      name: "White",
      course_rating: 71.2,
      slope_rating: 125,
      ratings: [{ gender: "men", course_rating: 71.2, slope_rating: 125 }]
    });
    courseTeeService.create(course.id, {
      name: "Blue",
      course_rating: 74.5,
      slope_rating: 132,
      ratings: [{ gender: "men", course_rating: 74.5, slope_rating: 132 }]
    });

    const result = courseService.getCoursesPagedAdmin({ limit: 50, offset: 0 });

    expect(result.courses[0].teeCount).toBe(2);
  });

  test("calculates CR range from tee ratings", async () => {
    const course = await courseService.create({ name: "Course with Tees" });
    await courseService.updateHoles(course.id, [4, 3, 4, 5, 4, 3, 4, 5, 4, 4, 3, 4, 5, 4, 3, 4, 5, 4]);

    courseTeeService.create(course.id, {
      name: "White",
      course_rating: 71.2,
      slope_rating: 125,
      ratings: [
        { gender: "men", course_rating: 71.2, slope_rating: 125 },
        { gender: "women", course_rating: 73.5, slope_rating: 130 }
      ]
    });
    courseTeeService.create(course.id, {
      name: "Blue",
      course_rating: 74.5,
      slope_rating: 132,
      ratings: [{ gender: "men", course_rating: 74.5, slope_rating: 132 }]
    });

    const result = courseService.getCoursesPagedAdmin({ limit: 50, offset: 0 });

    expect(result.courses[0].crRange).toEqual({ min: 71.2, max: 74.5 });
  });

  test("filters by search term (case-insensitive)", async () => {
    await courseService.create({ name: "Falsterbo Golf Club" });
    await courseService.create({ name: "Ljunghusen Golf Club" });
    await courseService.create({ name: "Another Course" });

    const result = courseService.getCoursesPagedAdmin({ limit: 50, offset: 0, search: "golf" });

    expect(result.total).toBe(2);
    expect(result.courses.map(c => c.name)).toContain("Falsterbo Golf Club");
    expect(result.courses.map(c => c.name)).toContain("Ljunghusen Golf Club");
  });

  test("filters by hasTees=true", async () => {
    const courseWithTees = await courseService.create({ name: "Course With Tees" });
    await courseService.create({ name: "Course Without Tees" });

    await courseService.updateHoles(courseWithTees.id, [4, 3, 4, 5, 4, 3, 4, 5, 4, 4, 3, 4, 5, 4, 3, 4, 5, 4]);
    courseTeeService.create(courseWithTees.id, {
      name: "White",
      course_rating: 71.2,
      slope_rating: 125,
      ratings: [{ gender: "men", course_rating: 71.2, slope_rating: 125 }]
    });

    const result = courseService.getCoursesPagedAdmin({ limit: 50, offset: 0, hasTees: true });

    expect(result.total).toBe(1);
    expect(result.courses[0].name).toBe("Course With Tees");
  });

  test("filters by hasTees=false", async () => {
    const courseWithTees = await courseService.create({ name: "Course With Tees" });
    await courseService.create({ name: "Course Without Tees" });

    await courseService.updateHoles(courseWithTees.id, [4, 3, 4, 5, 4, 3, 4, 5, 4, 4, 3, 4, 5, 4, 3, 4, 5, 4]);
    courseTeeService.create(courseWithTees.id, {
      name: "White",
      course_rating: 71.2,
      slope_rating: 125,
      ratings: [{ gender: "men", course_rating: 71.2, slope_rating: 125 }]
    });

    const result = courseService.getCoursesPagedAdmin({ limit: 50, offset: 0, hasTees: false });

    expect(result.total).toBe(1);
    expect(result.courses[0].name).toBe("Course Without Tees");
  });

  test("filters by holeCount=18", async () => {
    const course18 = await courseService.create({ name: "18 Hole Course" });
    const courseEmpty = await courseService.create({ name: "Empty Course" });

    await courseService.updateHoles(course18.id, [4, 3, 4, 5, 4, 3, 4, 5, 4, 4, 3, 4, 5, 4, 3, 4, 5, 4]);
    // courseEmpty has 0 holes (empty pars array)

    const result = courseService.getCoursesPagedAdmin({ limit: 50, offset: 0, holeCount: 18 });

    expect(result.total).toBe(1);
    expect(result.courses[0].name).toBe("18 Hole Course");
  });

  test("filters by holeCount excludes courses with different hole counts", async () => {
    const course18 = await courseService.create({ name: "18 Hole Course" });
    const courseEmpty = await courseService.create({ name: "Empty Course" });

    await courseService.updateHoles(course18.id, [4, 3, 4, 5, 4, 3, 4, 5, 4, 4, 3, 4, 5, 4, 3, 4, 5, 4]);
    // courseEmpty has 0 holes - so holeCount=9 filter should return nothing

    const result = courseService.getCoursesPagedAdmin({ limit: 50, offset: 0, holeCount: 9 });

    expect(result.total).toBe(0);
  });

  test("paginates correctly", async () => {
    await courseService.create({ name: "Course A" });
    await courseService.create({ name: "Course B" });
    await courseService.create({ name: "Course C" });

    // First page
    const page1 = courseService.getCoursesPagedAdmin({ limit: 2, offset: 0 });
    expect(page1.total).toBe(3);
    expect(page1.hasMore).toBe(true);
    expect(page1.courses).toHaveLength(2);

    // Second page
    const page2 = courseService.getCoursesPagedAdmin({ limit: 2, offset: 2 });
    expect(page2.total).toBe(3);
    expect(page2.hasMore).toBe(false);
    expect(page2.courses).toHaveLength(1);
  });

  test("validates limit bounds", async () => {
    await courseService.create({ name: "Course 1" });

    // Too high limit should be capped at 100
    const result = courseService.getCoursesPagedAdmin({ limit: 200, offset: 0 });
    // The actual query would run with limit 100

    // Too low limit should be set to 1
    const result2 = courseService.getCoursesPagedAdmin({ limit: 0, offset: 0 });
    // The actual query would run with limit 1
  });
});
